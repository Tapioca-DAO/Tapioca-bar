import { BigNumberish } from 'ethers';
import hre, { ethers } from 'hardhat';

export async function setBalance(addr: string, ether: number) {
    await ethers.provider.send('hardhat_setBalance', [addr, ethers.utils.hexStripZeros(ethers.utils.parseEther(String(ether))._hex)]);
}

async function registerUniswapV2() {
    const __uniFactoryFee = ethers.Wallet.createRandom();
    const __uniFactory = await (await ethers.getContractFactory('UniswapV2Factory')).deploy(__uniFactoryFee.address);
    await __uniFactory.deployed();
    const __uniRouter = await (
        await ethers.getContractFactory('UniswapV2Router02')
    ).deploy(__uniFactory.address, ethers.constants.AddressZero);
    await __uniRouter.deployed();

    return { __uniFactory, __uniFactoryFee, __uniRouter };
}

export async function register() {
    /**
     * INITIAL SETUP
     */
    const deployer = (await ethers.getSigners())[0];

    const __wethUsdcPrice = BN(2980).mul((1e18).toString());

    // Deploy USDC and WETH
    const usdc = await (await ethers.getContractFactory('ERC20Mock')).deploy(ethers.BigNumber.from((1e18).toString()).mul(1e9));
    await usdc.deployed();
    const weth = await (await ethers.getContractFactory('WETH9Mock')).deploy();
    await weth.deployed();

    // Deploy WethUSDC mock oracle
    const wethUsdcOracle = await (await ethers.getContractFactory('OracleMock')).deploy();
    await wethUsdcOracle.deployed();
    await (await wethUsdcOracle.set(__wethUsdcPrice)).wait();

    // Deploy Bar
    const bar = await (await ethers.getContractFactory('TapiocaBar')).deploy(weth.address);
    await bar.deployed();

    await (await bar.registerAsset(0, weth.address, ethers.constants.AddressZero, 0)).wait();
    const wethAssetId = await bar.ids(0, weth.address, ethers.constants.AddressZero, 0);

    await (await bar.registerAsset(0, usdc.address, ethers.constants.AddressZero, 0)).wait();
    const usdcAssetId = await bar.ids(0, usdc.address, ethers.constants.AddressZero, 0);

    // Deploy Uni factory, create pair and add liquidity
    const { __uniFactory, __uniRouter } = await registerUniswapV2();
    await __uniFactory.createPair(weth.address, usdc.address);
    const __wethUsdcMockPair = await __uniFactory.getPair(weth.address, usdc.address);

    const wethPairAmount = ethers.BigNumber.from(1e6).mul((1e18).toString());
    const usdcPairAmount = wethPairAmount.mul(__wethUsdcPrice.div((1e18).toString()));
    await weth.freeMint(wethPairAmount);
    await usdc.freeMint(usdcPairAmount);

    await weth.approve(__uniRouter.address, wethPairAmount);
    await usdc.approve(__uniRouter.address, usdcPairAmount);
    await __uniRouter.addLiquidity(
        weth.address,
        usdc.address,
        wethPairAmount,
        usdcPairAmount,
        wethPairAmount,
        usdcPairAmount,
        deployer.address,
        Math.floor(Date.now() / 1000) + 1000 * 60, // 1min margin
    );

    // Deploy MultiSwapper
    const multiSwapper = await (
        await ethers.getContractFactory('MultiSwapper')
    ).deploy(__uniFactory.address, bar.address, await __uniFactory.pairCodeHash());
    await multiSwapper.deployed();

    // Deploy WethUSDC isolated Mixologist pair
    const mixologistFeeTo = ethers.Wallet.createRandom();
    const wethUsdcMixologist = await (
        await ethers.getContractFactory('Mixologist')
    ).deploy(bar.address, weth.address, wethAssetId, usdc.address, usdcAssetId, wethUsdcOracle.address, multiSwapper.address, [
        usdc.address,
        weth.address,
    ]);
    await wethUsdcMixologist.deployed();

    // Set feeTo
    await (await wethUsdcMixologist.setFeeTo(mixologistFeeTo.address)).wait();

    // Deploy an EOA
    const eoa1 = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);
    await setBalance(eoa1.address, 100000);

    // Helper
    const mixologistHelper = await (await ethers.getContractFactory('MixologistHelper')).deploy();
    await mixologistHelper.deployed();

    const initialSetup = {
        __wethUsdcPrice,
        deployer,
        usdc,
        weth,
        wethUsdcOracle,
        bar,
        wethUsdcMixologist,
        mixologistHelper,
        eoa1,
        multiSwapper,
        __uniFactory,
        __wethUsdcMockPair,
    };

    /**
     * UTIL FUNCS
     */
    function BN(n: number | string) {
        return ethers.BigNumber.from(n);
    }

    const mine = async (blocks: number) => {
        for (let i = 0; i < blocks; i++) {
            await ethers.provider.send('evm_mine', []);
        }
    };

    const jumpTime = async (ms: number) => {
        await ethers.provider.send('evm_increaseTime', [ms]);
        await ethers.provider.send('evm_mine', []);
    };

    const approveTokensAndSetBarApproval = async (account?: typeof eoa1) => {
        const _usdc = account ? usdc.connect(account) : usdc;
        const _weth = account ? weth.connect(account) : weth;
        const _bar = account ? bar.connect(account) : bar;
        await (await _usdc.approve(bar.address, ethers.constants.MaxUint256)).wait();
        await (await _weth.approve(bar.address, ethers.constants.MaxUint256)).wait();
        await (await _bar.setApprovalForAll(wethUsdcMixologist.address, true)).wait();
    };

    const wethDepositAndAddAsset = async (amount: BigNumberish, account?: typeof eoa1) => {
        const _account = account ?? deployer;
        const _bar = account ? bar.connect(account) : bar;
        const _wethUsdcMixologist = account ? wethUsdcMixologist.connect(account) : wethUsdcMixologist;

        const id = await _wethUsdcMixologist.assetId();
        const _valShare = await _bar.toShare(id, amount, false);
        await (await _bar.deposit(id, _account.address, _account.address, 0, _valShare)).wait();
        await (await _wethUsdcMixologist.addAsset(_account.address, false, _valShare)).wait();
    };

    const usdcDepositAndAddCollateral = async (amount: BigNumberish, account?: typeof eoa1) => {
        const _account = account ?? deployer;
        const _bar = account ? bar.connect(account) : bar;
        const _wethUsdcMixologist = account ? wethUsdcMixologist.connect(account) : wethUsdcMixologist;

        const id = await _wethUsdcMixologist.collateralId();
        await (await _bar.deposit(id, _account.address, _account.address, amount, 0)).wait();
        const _valShare = await _bar.balanceOf(_account.address, id);
        await (await _wethUsdcMixologist.addCollateral(_account.address, false, _valShare)).wait();
    };

    const initContracts = async () => {
        await (await usdc.freeMint(1000)).wait();
        const mintValShare = await bar.toShare(await wethUsdcMixologist.assetId(), 1000, false);
        await (await usdc.approve(bar.address, 1000)).wait();
        await (await bar.deposit(await wethUsdcMixologist.assetId(), deployer.address, deployer.address, 0, mintValShare)).wait();
        await (await bar.setApprovalForAll(wethUsdcMixologist.address, true)).wait();
        await (await wethUsdcMixologist.addAsset(deployer.address, false, mintValShare)).wait();
    };

    const utilFuncs = { BN, jumpTime, approveTokensAndSetBarApproval, wethDepositAndAddAsset, usdcDepositAndAddCollateral };

    return { ...initialSetup, ...utilFuncs };
}

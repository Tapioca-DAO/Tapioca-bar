import { BigNumberish } from 'ethers';
import { ethers } from 'hardhat';
import { BeachBar, ERC20Mock, OracleMock, WETH9Mock } from '../typechain';

function BN(n: number | string) {
    return ethers.BigNumber.from(n);
}

const __wethUsdcPrice = BN(2980).mul((1e18).toString());

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

async function registerERC20Tokens() {
    // Deploy USDC and WETH
    const usdc = await (await ethers.getContractFactory('ERC20Mock')).deploy(ethers.BigNumber.from((1e18).toString()).mul(1e9));
    await usdc.deployed();
    const weth = await (await ethers.getContractFactory('WETH9Mock')).deploy();
    await weth.deployed();

    // Deploy TAP
    const tap = await (await ethers.getContractFactory('ERC20Mock')).deploy(ethers.BigNumber.from((1e18).toString()).mul(1e9));
    await tap.deployed();

    return { usdc, weth, tap };
}

async function registerBeachBar(wethAddress: string, tapAddress: string) {
    // Deploy URIBuilder
    const uriBuilder = await (await ethers.getContractFactory('YieldBoxURIBuilder')).deploy();
    await uriBuilder.deployed();

    // Deploy Bar
    const bar = await (await ethers.getContractFactory('BeachBar')).deploy(wethAddress, uriBuilder.address, tapAddress);
    await bar.deployed();

    return { uriBuilder, bar };
}

async function setBeachBarAssets(bar: BeachBar, wethAddress: string, usdcAddress: string) {
    await (await bar.registerAsset(1, wethAddress, ethers.constants.AddressZero, 0)).wait();
    const wethAssetId = await bar.ids(1, wethAddress, ethers.constants.AddressZero, 0);

    await (await bar.registerAsset(1, usdcAddress, ethers.constants.AddressZero, 0)).wait();
    const usdcAssetId = await bar.ids(1, usdcAddress, ethers.constants.AddressZero, 0);

    return { wethAssetId, usdcAssetId };
}

async function uniV2EnvironnementSetup(deployerAddress: string, weth: WETH9Mock, usdc: ERC20Mock) {
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
        deployerAddress,
        Math.floor(Date.now() / 1000) + 1000 * 60, // 1min margin
    );

    return { __wethUsdcMockPair, __uniFactory, __uniRouter };
}

async function registerMultiSwapper(__uniFactoryAddress: string, barAddress: string, __uniFactoryPairCodeHash: string) {
    const multiSwapper = await (
        await ethers.getContractFactory('MultiSwapper')
    ).deploy(__uniFactoryAddress, barAddress, __uniFactoryPairCodeHash);
    await multiSwapper.deployed();

    return { multiSwapper };
}

async function deployMediumRiskMC(bar: BeachBar) {
    const mediumRiskMC = await (await ethers.getContractFactory('Mixologist')).deploy();
    await mediumRiskMC.deployed();

    await bar.registerMasterContract(mediumRiskMC.address, 1);

    return { mediumRiskMC };
}

async function registerMixologist(
    mediumRiskMC: string,
    bar: BeachBar,
    weth: WETH9Mock,
    wethAssetId: BigNumberish,
    usdc: ERC20Mock,
    usdcAssetId: BigNumberish,
    wethUsdcOracle: OracleMock,
    collateralSwapPath: string[],
    tapSwapPath: string[],
) {
    const data = new ethers.utils.AbiCoder().encode(
        ['address', 'address', 'uint256', 'address', 'uint256', 'address', 'address[]', 'address[]'],
        [bar.address, weth.address, wethAssetId, usdc.address, usdcAssetId, wethUsdcOracle.address, collateralSwapPath, tapSwapPath],
    );
    await bar.registerMixologist(mediumRiskMC, data, true);
    const wethUsdcMixologist = await ethers.getContractAt(
        'Mixologist',
        await bar.clonesOf(mediumRiskMC, (await bar.clonesOfCount(mediumRiskMC)).sub(1)),
    );
    return { wethUsdcMixologist };
}

export async function register() {
    /**
     * INITIAL SETUP
     */
    const deployer = (await ethers.getSigners())[0];

    // Deploy WethUSDC mock oracle
    const wethUsdcOracle = await (await ethers.getContractFactory('OracleMock')).deploy();
    await wethUsdcOracle.deployed();
    await (await wethUsdcOracle.set(__wethUsdcPrice)).wait();

    // 1 Deploy tokens
    const { tap, usdc, weth } = await registerERC20Tokens();
    // 2 Deploy BeachBar
    const { bar, uriBuilder } = await registerBeachBar(weth.address, tap.address);
    // 3 Add asset types to BeachBar
    const { usdcAssetId, wethAssetId } = await setBeachBarAssets(bar, weth.address, usdc.address);
    // 4 Deploy UNIV2 env
    const { __wethUsdcMockPair, __uniFactory, __uniRouter } = await uniV2EnvironnementSetup(deployer.address, weth, usdc);
    // 5 Deploy MultiSwapper
    const { multiSwapper } = await registerMultiSwapper(__uniFactory.address, bar.address, await __uniFactory.pairCodeHash());
    // 6  Deploy MediumRisk master contract
    const { mediumRiskMC } = await deployMediumRiskMC(bar);
    // 7 Deploy WethUSDC medium risk MC clone
    const collateralSwapPath = [usdc.address, weth.address];
    const tapSwapPath = [weth.address, tap.address];
    const { wethUsdcMixologist } = await registerMixologist(
        mediumRiskMC.address,
        bar,
        weth,
        wethAssetId,
        usdc,
        usdcAssetId,
        wethUsdcOracle,
        collateralSwapPath,
        tapSwapPath,
    );

    // 8 Set feeTo
    const mixologistFeeTo = ethers.Wallet.createRandom();
    await bar.setFeeTo(mixologistFeeTo.address);

    /**
     * OTHERS
     */

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
        await (await _bar['deposit(uint256,address,address,uint256,uint256)'](id, _account.address, _account.address, 0, _valShare)).wait();
        await (await _wethUsdcMixologist.addAsset(_account.address, false, _valShare)).wait();
    };

    const usdcDepositAndAddCollateral = async (amount: BigNumberish, account?: typeof eoa1) => {
        const _account = account ?? deployer;
        const _bar = account ? bar.connect(account) : bar;
        const _wethUsdcMixologist = account ? wethUsdcMixologist.connect(account) : wethUsdcMixologist;

        const id = await _wethUsdcMixologist.collateralId();
        await (await _bar['deposit(uint256,address,address,uint256,uint256)'](id, _account.address, _account.address, amount, 0)).wait();
        const _valShare = await _bar.balanceOf(_account.address, id);
        await (await _wethUsdcMixologist.addCollateral(_account.address, false, _valShare)).wait();
    };

    const initContracts = async () => {
        await (await weth.freeMint(1000)).wait();
        const mintValShare = await bar.toShare(await wethUsdcMixologist.assetId(), 1000, false);
        await (await weth.approve(bar.address, 1000)).wait();
        await (
            await bar['deposit(uint256,address,address,uint256,uint256)'](
                await wethUsdcMixologist.assetId(),
                deployer.address,
                deployer.address,
                0,
                mintValShare,
            )
        ).wait();
        await (await bar.setApprovalForAll(wethUsdcMixologist.address, true)).wait();
        await (await wethUsdcMixologist.addAsset(deployer.address, false, mintValShare)).wait();
    };

    const utilFuncs = { BN, jumpTime, approveTokensAndSetBarApproval, wethDepositAndAddAsset, usdcDepositAndAddCollateral, initContracts };

    return { ...initialSetup, ...utilFuncs };
}

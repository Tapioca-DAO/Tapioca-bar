import { BigNumberish } from 'ethers';
import hre, { ethers } from 'hardhat';

export async function setBalance(addr: string, ether: number) {
    await ethers.provider.send('hardhat_setBalance', [addr, ethers.utils.hexStripZeros(ethers.utils.parseEther(String(ether))._hex)]);
}

export async function register() {
    /**
     * INITIAL SETUP
     */
    const deployer = (await ethers.getSigners())[0];

    // Deploy USDC and WETH
    const usdc = await (await ethers.getContractFactory('ERC20Mock')).deploy(ethers.BigNumber.from((1e18).toString()).mul(1e9));
    await usdc.deployed();
    const weth = await (await ethers.getContractFactory('WETH9Mock')).deploy();
    await weth.deployed();

    // Deploy WethUSDC mock oracle
    const wethUsdcOracle = await (await ethers.getContractFactory('OracleMock')).deploy();
    await wethUsdcOracle.deployed();
    await (await wethUsdcOracle.set(ethers.BigNumber.from(2980).mul((1e18).toString()))).wait();

    // Deploy Bar
    const bar = await (await ethers.getContractFactory('TapiocaBar')).deploy(weth.address);
    await bar.deployed();

    await (await bar.registerAsset(0, weth.address, ethers.constants.AddressZero, 0)).wait();
    const wethAssetId = await bar.ids(0, weth.address, ethers.constants.AddressZero, 0);

    await (await bar.registerAsset(0, usdc.address, ethers.constants.AddressZero, 0)).wait();
    const usdcAssetId = await bar.ids(0, usdc.address, ethers.constants.AddressZero, 0);

    // Deploy WethUSDC isolated Mixologist pair
    const wethUsdcMixologist = await (
        await ethers.getContractFactory('Mixologist')
    ).deploy(bar.address, weth.address, wethAssetId, usdc.address, usdcAssetId, wethUsdcOracle.address);
    await wethUsdcMixologist.deployed();

    // Deploy an EOA
    const eoa1 = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);
    await setBalance(eoa1.address, 100000);

    // Helper
    const mixologistHelper = await (await ethers.getContractFactory('MixologistHelper')).deploy();
    await mixologistHelper.deployed();

    const initialSetup = {
        deployer,
        usdc,
        weth,
        wethUsdcOracle,
        bar,
        wethUsdcMixologist,
        mixologistHelper,
        eoa1,
    };

    /**
     * UTIL FUNCS
     */
    const BN = (n: number | string) => ethers.BigNumber.from(n);

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

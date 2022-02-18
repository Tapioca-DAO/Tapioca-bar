import { BigNumberish } from 'ethers';
import hre, { ethers } from 'hardhat';

export async function setBalance(addr: string, ether: number) {
    await ethers.provider.send('hardhat_setBalance', [
        addr,
        ethers.utils.hexStripZeros(ethers.utils.parseEther(String(ether))._hex),
    ]);
}

export async function register() {
    /**
     * INITIAL SETUP
     */
    const deployer = (await ethers.getSigners())[0];

    // Deploy USDC and WETH
    const usdc = await (await ethers.getContractFactory('ERC20Mock')).deploy(ethers.BigNumber.from(1e18.toString()).mul(1e9));
    await usdc.deployed();
    const weth = await (await ethers.getContractFactory('WETH9Mock')).deploy();
    await weth.deployed();

    // Deploy WethUSDC mock oracle
    const wethUsdcOracle = await (await ethers.getContractFactory('OracleMock')).deploy();
    await wethUsdcOracle.deployed();
    await (await wethUsdcOracle.set(ethers.BigNumber.from(2980).mul(1e18.toString()))).wait();

    // Deploy Bar
    const bar = await (await ethers.getContractFactory('TapiocaBar')).deploy(weth.address);
    await bar.deployed();

    await (await bar.registerAsset(0, weth.address, ethers.constants.AddressZero, 0)).wait();
    const wethAssetId = await bar.ids(0, weth.address, ethers.constants.AddressZero, 0);

    await (await bar.registerAsset(0, usdc.address, ethers.constants.AddressZero, 0)).wait();
    const usdcAssetId = await bar.ids(0, usdc.address, ethers.constants.AddressZero, 0);

    // Deploy WethUSDC isolated Mixologist pair
    const wethUsdcMixologist = await (await ethers.getContractFactory('Mixologist')).deploy(
        bar.address,
        weth.address,
        wethAssetId,
        usdc.address,
        usdcAssetId,
        wethUsdcOracle.address,
    );
    await wethUsdcMixologist.deployed();

    // Deploy an EOA
    const eoa1 = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);
    await setBalance(eoa1.address, 100000);

    // Mixologist base minimum
    await (await usdc.freeMint(1000)).wait();
    const mintValShare = await bar.toShare(await wethUsdcMixologist.assetId(), 1000, false);
    await (await usdc.approve(bar.address, 1000)).wait();
    await (await bar.deposit(await wethUsdcMixologist.assetId(), deployer.address, deployer.address, 0, mintValShare)).wait();
    await (await bar.setApprovalForAll(wethUsdcMixologist.address, true)).wait();
    await (await wethUsdcMixologist.addAsset(deployer.address, false, mintValShare)).wait();

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
    const approveTokenAndSetBarApproval = async (account: typeof eoa1, nUsdc:BigNumberish, nWeth:BigNumberish)=>{
        await (await bar.batch([
            (await usdc.connect(account).populateTransaction.approve(bar.address, nUsdc)).data || '',
            (await weth.connect(account).populateTransaction.approve(bar.address, nWeth)).data || '',
            (await bar.connect(account).populateTransaction.setApprovalForAll(wethUsdcMixologist.address, true)).data || '',
        ], true)).wait();
    };

    const wethDepositAndAddAsset = async (account: typeof eoa1, nWeth:BigNumberish) =>{
        const _valShare = await bar.toShare(await wethUsdcMixologist.assetId(), nWeth, false);
        await (await bar.connect(account).deposit(await wethUsdcMixologist.assetId(), account.address, account.address, 0, _valShare)).wait();
        await (await wethUsdcMixologist.connect(account).addAsset(account.address, false, _valShare)).wait();
    };

    const usdcDepositAndAddAsset = async (account: typeof eoa1, nWeth:BigNumberish) =>{
        const _valShare = await bar.toShare(await wethUsdcMixologist.collateralId(), nWeth, false);
        await (await bar.connect(account).deposit(await wethUsdcMixologist.collateralId(), account.address, account.address, 0, _valShare)).wait();
        await (await wethUsdcMixologist.connect(account).addAsset(account.address, false, _valShare)).wait();
    };

    const utilFuncs = {approveTokenAndSetBarApproval, wethDepositAndAddAsset, usdcDepositAndAddAsset};

    return {...initialSetup, ...utilFuncs};
}

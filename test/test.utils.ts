import hre, { ethers } from 'hardhat';

export async function setBalance(addr: string, ether: number) {
    await ethers.provider.send('hardhat_setBalance', [
        addr,
        ethers.utils.hexStripZeros(ethers.utils.parseEther(String(ether))._hex),
    ]);
}

export async function register() {
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
        usdc.address,
        usdcAssetId,
        weth.address,
        wethAssetId,
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

    return {
        deployer,
        usdc,
        weth,
        wethUsdcOracle,
        bar,
        wethUsdcMixologist,
        eoa1,
    };
}

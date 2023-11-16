import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';
import {
    ERC20Mock__factory,
    GmxMarketMock__factory,
    MockSwapper__factory,
    TOFTMock__factory,
} from '../gitsub_tapioca-sdk/src/typechain/tapioca-mocks';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ERC20 } from '../typechain';

describe('AssetToGmxEthUsdcLpLeverageExecutor test', () => {
    async function setUp() {
        const {
            yieldBox,
            cluster,
            deployer,
            usdc,
            usdcAssetId,
            createTokenEmptyStrategy,
            weth,
            wethAssetId,
        } = await loadFixture(register);
        await cluster.updateContract(0, deployer.address, true);

        const MockSwapper = new MockSwapper__factory(deployer);
        const swapper = await MockSwapper.deploy(yieldBox.address);

        const ERC20Mock = new ERC20Mock__factory(deployer);
        const lp = await ERC20Mock.deploy(
            'GMX-ETH-USDC LP Token',
            'GMX-ETH-USDC LP',
            0,
            18,
            deployer.address,
        );

        const TOFTMock = new TOFTMock__factory(deployer);
        const toft = await TOFTMock.deploy(lp.address);

        const toftStrategy = await createTokenEmptyStrategy(
            yieldBox.address,
            toft.address,
        );
        await yieldBox.registerAsset(1, toft.address, toftStrategy.address, 0);
        const toftAssetId = await yieldBox.ids(
            1,
            toft.address,
            toftStrategy.address,
            0,
        );

        const GmxMarketMock = new GmxMarketMock__factory(deployer);
        const gmxMarket = await GmxMarketMock.deploy(
            weth.address,
            usdc.address,
            lp.address,
        );

        const AssetToGmxEthUsdcLpLeverageExecutorFactory =
            await ethers.getContractFactory(
                'AssetToGmxEthUsdcLpLeverageExecutor',
            );
        const assetToGmxEthUsdcLpLeverageExecutor =
            await AssetToGmxEthUsdcLpLeverageExecutorFactory.deploy(
                yieldBox.address,
                swapper.address,
                cluster.address,
                usdc.address,
                weth.address,
                gmxMarket.address,
                gmxMarket.address,
                gmxMarket.address,
                gmxMarket.address,
                gmxMarket.address,
            );
        await assetToGmxEthUsdcLpLeverageExecutor.deployed();

        await cluster.updateContract(0, swapper.address, true);

        return {
            gmxMarket,
            usdc,
            usdcAssetId,
            weth,
            wethAssetId,
            swapper,
            toft,
            toftStrategy,
            yieldBox,
            toftAssetId,
            assetToGmxEthUsdcLpLeverageExecutor,
            deployer,
            lp,
        };
    }

    it.skip('should get collateral - fork test', async () => {
        const {
            yieldBox,
            cluster,
            deployer,
            createTokenEmptyStrategy,
            wethAssetId,
            weth,
        } = await loadFixture(register);

        // const testFactory = await ethers.getContractFactory('Test');
        // const test = await testFactory.deploy();
        // await test.deployed();

        // const result = await test.getRevert('0x5dac504d');
        // console.log(`result ${result}`);
        // return;

        const impersonateAccount = async (address: string) => {
            await hre.network.provider.request({
                method: 'hardhat_impersonateAccount',
                params: [address],
            });
        };

        const MockSwapper = new MockSwapper__factory(deployer);
        const swapper = await MockSwapper.deploy(yieldBox.address);
        await cluster.updateContract(0, swapper.address, true);

        const amountIn = await ethers.utils.parseEther('1'); //1
        await weth.toggleRestrictions();
        await weth.freeMint(amountIn);
        await weth.transfer(swapper.address, amountIn);

        const binanceWallet = '0xb38e8c17e38363af6ebdcb3dae12e0243582891d';
        const gmMarket = '0x70d95587d40a2caf56bd97485ab3eec10bee6336';
        const router = '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6';
        const exchangeRouter = '0x7c68c7866a64fa2160f78eeae12217ffbf871fa8';
        const withdrawalVault = '0x0628d46b5d145f183adb6ef1f2c97ed1c4701c55';
        const depositVault = '0xF89e77e8Dc11691C9e8757e84aaFbCD8A67d7A55';
        const usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
        const wethAddress = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';

        const realUsdcContract = (await ethers.getContractAt(
            '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
            usdcAddress,
        )) as ERC20;
        const realWethContract = await ethers.getContractAt(
            '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
            wethAddress,
        );
        await impersonateAccount(binanceWallet);
        const binanceAccount = await ethers.getSigner(binanceWallet);

        const TOFTMock = new TOFTMock__factory(deployer);
        const toft = await TOFTMock.deploy(gmMarket);

        const toftStrategy = await createTokenEmptyStrategy(
            yieldBox.address,
            toft.address,
        );
        await yieldBox.registerAsset(1, toft.address, toftStrategy.address, 0);
        const toftAssetId = await yieldBox.ids(
            1,
            toft.address,
            toftStrategy.address,
            0,
        );

        const AssetToGmxEthUsdcLpLeverageExecutorFactory =
            await ethers.getContractFactory(
                'AssetToGmxEthUsdcLpLeverageExecutor',
            );
        const assetToGmxEthUsdcLpLeverageExecutor =
            await AssetToGmxEthUsdcLpLeverageExecutorFactory.deploy(
                yieldBox.address,
                swapper.address,
                cluster.address,
                realUsdcContract.address,
                realWethContract.address,
                router,
                exchangeRouter,
                gmMarket,
                withdrawalVault,
                depositVault,
            );
        await assetToGmxEthUsdcLpLeverageExecutor.deployed();

        const amountUsdc = '1000000'; //1
        //assure swapper with USDC
        await realUsdcContract
            .connect(binanceAccount)
            .transfer(swapper.address, amountUsdc);
        const swapperBalance = await realUsdcContract.balanceOf(
            swapper.address,
        );
        expect(swapperBalance.eq(amountUsdc)).to.be.true;

        //prepare getCollateral call
        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes', 'uint256'],
            [amountUsdc, '0x', (1e16).toString()],
        );
        await assetToGmxEthUsdcLpLeverageExecutor.getCollateral(
            toftAssetId,
            weth.address,
            toft.address,
            0,
            deployer.address,
            data,
            {
                value: ethers.utils.parseEther('2'),
            },
        );

        const toftYieldBoxBalance = await yieldBox.balanceOf(
            deployer.address,
            toftAssetId,
        );
        console.log(`toftYieldBoxBalance ${toftYieldBoxBalance}`);

        await yieldBox.withdraw(
            toftAssetId,
            deployer.address,
            deployer.address,
            amountIn,
            0,
        );
        const balanceAfter = await toft.balanceOf(deployer.address);
        expect(balanceAfter.eq(amountIn)).to.be.true;
    });

    it('should get collateral', async () => {
        const {
            weth,
            swapper,
            toft,
            yieldBox,
            toftAssetId,
            assetToGmxEthUsdcLpLeverageExecutor,
            deployer,
            usdc,
            lp,
            gmxMarket,
        } = await loadFixture(setUp);

        const balanceBefore = await toft.balanceOf(deployer.address);
        expect(balanceBefore.eq(0)).to.be.true;

        const amountIn = ethers.utils.parseEther('10');

        await usdc.toggleRestrictions();
        await usdc.freeMint(amountIn);

        await usdc.transfer(swapper.address, amountIn);

        await lp.toggleRestrictions();
        await lp.freeMint(amountIn);
        await lp.transfer(gmxMarket.address, amountIn);

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes', 'uint256'],
            [amountIn, '0x', amountIn],
        );
        await assetToGmxEthUsdcLpLeverageExecutor.getCollateral(
            toftAssetId,
            weth.address,
            toft.address,
            0,
            deployer.address,
            data,
        );

        await yieldBox.withdraw(
            toftAssetId,
            deployer.address,
            deployer.address,
            amountIn,
            0,
        );
        const balanceAfter = await toft.balanceOf(deployer.address);
        expect(balanceAfter.eq(amountIn)).to.be.true;
    });

    it('should get asset', async () => {
        const {
            usdc,
            weth,
            lp,
            swapper,
            toft,
            yieldBox,
            assetToGmxEthUsdcLpLeverageExecutor,
            deployer,
            wethAssetId,
            gmxMarket,
        } = await loadFixture(setUp);

        const balanceBefore = await toft.balanceOf(deployer.address);
        expect(balanceBefore.eq(0)).to.be.true;

        const amountIn = ethers.utils.parseEther('1');

        await weth.toggleRestrictions();
        await weth.freeMint(amountIn);
        await weth.transfer(swapper.address, amountIn);

        await weth.freeMint(amountIn);
        await weth.transfer(gmxMarket.address, amountIn);

        await usdc.toggleRestrictions();
        await usdc.freeMint(amountIn);
        await usdc.transfer(gmxMarket.address, amountIn);

        await usdc.freeMint(amountIn);
        await usdc.transfer(swapper.address, amountIn);

        await lp.toggleRestrictions();
        await lp.freeMint(amountIn);
        await lp.transfer(
            assetToGmxEthUsdcLpLeverageExecutor.address,
            amountIn,
        );

        await lp.freeMint(amountIn);
        await lp.transfer(deployer.address, amountIn);
        await lp.approve(toft.address, amountIn);
        await toft.wrap(deployer.address, deployer.address, amountIn);
        expect((await toft.balanceOf(deployer.address)).eq(amountIn)).to.be
            .true;

        await toft.transfer(
            assetToGmxEthUsdcLpLeverageExecutor.address,
            amountIn,
        );

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes', 'uint256', 'uint256', 'uint256', 'bytes'],
            [amountIn, '0x', amountIn, amountIn, amountIn, '0x'],
        );
        await assetToGmxEthUsdcLpLeverageExecutor.getAsset(
            wethAssetId,
            toft.address,
            weth.address,
            amountIn,
            deployer.address,
            data,
        );

        await yieldBox.withdraw(
            wethAssetId,
            deployer.address,
            deployer.address,
            amountIn,
            0,
        );
        const balanceAfter = await weth.balanceOf(deployer.address);
        expect(balanceAfter.eq(amountIn)).to.be.true;
    });
});

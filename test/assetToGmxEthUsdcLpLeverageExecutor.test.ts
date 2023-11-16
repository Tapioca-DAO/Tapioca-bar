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

import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register, impersonateAccount } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';
import {
    ERC20Mock__factory,
    MockSwapper__factory,
    TOFTMock__factory,
} from '../gitsub_tapioca-sdk/src/typechain/tapioca-mocks';
import { ERC20 } from '../typechain';
import { UniswapV3Swapper__factory } from '../gitsub_tapioca-sdk/src/typechain/tapioca-periphery';

describe('AssetToEthLeverageExecutor test', () => {
    before(function () {
        if (process.env.NODE_ENV !== undefined) {
            this.skip();
        }
    });

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

        const TOFTMock = new TOFTMock__factory(deployer);
        const toft = await TOFTMock.deploy(ethers.constants.AddressZero);

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

        const AssetToEthLeverageExecutorFactory =
            await ethers.getContractFactory('AssetToEthLeverageExecutor');
        const assetToEthLeverageExecutor =
            await AssetToEthLeverageExecutorFactory.deploy(
                yieldBox.address,
                swapper.address,
                cluster.address,
            );
        await assetToEthLeverageExecutor.deployed();

        await cluster.updateContract(0, swapper.address, true);

        return {
            usdc,
            usdcAssetId,
            weth,
            wethAssetId,
            swapper,
            toft,
            toftStrategy,
            yieldBox,
            toftAssetId,
            assetToEthLeverageExecutor,
            deployer,
        };
    }
    it('should build default data', async () => {
        const { assetToEthLeverageExecutor, usdc } = await loadFixture(setUp);

        const defaultData =
            await assetToEthLeverageExecutor.buildSwapDefaultData(
                usdc.address,
                ethers.constants.AddressZero,
                ethers.utils.parseEther('10'),
            );
        expect(defaultData.length).to.be.gt(0);
    });

    it('should get collateral', async () => {
        const {
            usdc,
            swapper,
            toft,
            yieldBox,
            toftAssetId,
            assetToEthLeverageExecutor,
            deployer,
        } = await loadFixture(setUp);

        const balanceBefore = await toft.balanceOf(deployer.address);
        expect(balanceBefore.eq(0)).to.be.true;

        const amountIn = ethers.utils.parseEther('1');

        await usdc.toggleRestrictions();
        await usdc.freeMint(amountIn);

        await deployer.sendTransaction({
            to: swapper.address,
            value: amountIn,
        });

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes'],
            [amountIn, '0x'],
        );
        await assetToEthLeverageExecutor.getCollateral(
            toftAssetId,
            usdc.address,
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
            usdcAssetId,
            weth,
            wethAssetId,
            swapper,
            toft,
            toftStrategy,
            yieldBox,
            toftAssetId,
            assetToEthLeverageExecutor,
            deployer,
        } = await loadFixture(setUp);

        const balanceBefore = await usdc.balanceOf(deployer.address);
        expect(balanceBefore.eq(0)).to.be.true;

        const amountIn = ethers.utils.parseEther('10');

        await usdc.toggleRestrictions();
        await usdc.freeMint(amountIn);
        await usdc.transfer(swapper.address, amountIn);

        await toft.wrap(deployer.address, deployer.address, amountIn, {
            value: amountIn,
        });
        expect((await toft.balanceOf(deployer.address)).eq(amountIn)).to.be
            .true;

        await toft.transfer(assetToEthLeverageExecutor.address, amountIn);

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes'],
            [amountIn, '0x'],
        );
        await assetToEthLeverageExecutor.getAsset(
            usdcAssetId,
            toft.address,
            usdc.address,
            amountIn,
            deployer.address,
            data,
            {
                value: 0,
            },
        );

        await yieldBox.withdraw(
            usdcAssetId,
            deployer.address,
            deployer.address,
            amountIn,
            0,
        );
        const balanceAfter = await usdc.balanceOf(deployer.address);
        expect(balanceAfter.eq(amountIn)).to.be.true;
    });
});

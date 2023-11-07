import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';
import {
    ERC20Mock__factory,
    MockSwapper__factory,
    TOFTMock__factory,
} from '../gitsub_tapioca-sdk/src/typechain/tapioca-mocks';

describe('usdoToGlpLeverageExecutors.test test', () => {
    async function setUp() {
        const {
            usdc,
            usdcAssetId,
            weth,
            yieldBox,
            cluster,
            deployer,
            createTokenEmptyStrategy,
            wethAssetId,
        } = await loadFixture(register);

        const ERC20Mock = new ERC20Mock__factory(deployer);
        const glp = await ERC20Mock.deploy(
            'GLP Token',
            'GLP',
            0,
            18,
            deployer.address,
        );

        const MockSwapper = new MockSwapper__factory(deployer);
        const swapper = await MockSwapper.deploy(yieldBox.address);

        const TOFTMock = new TOFTMock__factory(deployer);
        const toft = await TOFTMock.deploy(glp.address);

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

        const AssetToGLPLeverageExecutorFactory =
            await ethers.getContractFactory('AssetToGLPLeverageExecutor');
        const assetToGLPLeverageExecutor =
            await AssetToGLPLeverageExecutorFactory.deploy(
                yieldBox.address,
                swapper.address,
                cluster.address,
                usdc.address,
            );
        await assetToGLPLeverageExecutor.deployed();

        await cluster.updateContract(0, swapper.address, true);

        return {
            usdc,
            usdcAssetId,
            weth,
            glp,
            yieldBox,
            cluster,
            deployer,
            assetToGLPLeverageExecutor,
            toft,
            toftAssetId,
            toftStrategy,
            swapper,
            wethAssetId,
        };
    }

    it('should build default data', async () => {
        const { assetToGLPLeverageExecutor, usdc, weth, cluster, deployer } =
            await loadFixture(setUp);
        await cluster.updateContract(0, deployer.address, true);

        const defaultData =
            await assetToGLPLeverageExecutor.buildSwapDefaultData(
                usdc.address,
                weth.address,
                ethers.utils.parseEther('10'),
            );
        expect(defaultData.length).to.be.gt(0);
    });

    it('should get collateral', async () => {
        const {
            usdc,
            weth,
            glp,
            yieldBox,
            deployer,
            assetToGLPLeverageExecutor,
            toft,
            toftAssetId,
            swapper,
            cluster,
        } = await loadFixture(setUp);
        await cluster.updateContract(0, deployer.address, true);

        const balanceBefore = await toft.balanceOf(deployer.address);
        expect(balanceBefore.eq(0)).to.be.true;

        const amountIn = ethers.utils.parseEther('10');

        await weth.toggleRestrictions();
        await weth.freeMint(amountIn);

        await glp.toggleRestrictions();
        await glp.freeMint(amountIn);

        await usdc.toggleRestrictions();
        await usdc.freeMint(amountIn);

        await usdc.transfer(swapper.address, amountIn);
        await glp.transfer(swapper.address, amountIn);

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes', 'uint256', 'bytes'],
            [amountIn, '0x', amountIn, '0x'],
        );

        await assetToGLPLeverageExecutor.getCollateral(
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
            glp,
            yieldBox,
            deployer,
            assetToGLPLeverageExecutor,
            toft,
            swapper,
            wethAssetId,
            cluster,
        } = await loadFixture(setUp);
        await cluster.updateContract(0, deployer.address, true);

        const amountIn = ethers.utils.parseEther('10');

        const balanceBefore = await weth.balanceOf(deployer.address);
        expect(balanceBefore.eq(0)).to.be.true;

        await weth.toggleRestrictions();
        await weth.freeMint(amountIn);

        await glp.toggleRestrictions();
        await glp.freeMint(amountIn);

        await usdc.toggleRestrictions();
        await usdc.freeMint(amountIn);

        await glp.approve(toft.address, amountIn);
        await toft.wrap(deployer.address, deployer.address, amountIn);

        await usdc.transfer(swapper.address, amountIn);
        await weth.transfer(swapper.address, amountIn);
        await toft.transfer(assetToGLPLeverageExecutor.address, amountIn);

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes', 'uint256', 'bytes'],
            [amountIn, '0x', amountIn, '0x'],
        );

        await assetToGLPLeverageExecutor.getAsset(
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

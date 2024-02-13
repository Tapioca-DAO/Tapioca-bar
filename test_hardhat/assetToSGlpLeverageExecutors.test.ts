import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';
import {
    ERC20Mock__factory,
    MockSwapper__factory,
    TOFTMock__factory,
    GmxMarketMock__factory,
} from '@tapioca-sdk/typechain/tapioca-mocks';

describe.skip('assetToSGlpLeverageExecutors.test test', () => {
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

        const GmxMarketMock = new GmxMarketMock__factory(deployer);
        const glpRouter = await GmxMarketMock.deploy(
            ethers.constants.AddressZero,
            ethers.constants.AddressZero,
            ethers.constants.AddressZero,
        );
        await glpRouter.setGlp(glp.address);

        const MockSwapper = new MockSwapper__factory(deployer);
        const swapper = await MockSwapper.deploy(yieldBox.address);

        const glpStrategy = await createTokenEmptyStrategy(
            yieldBox.address,
            glp.address,
        );
        await yieldBox.registerAsset(1, glp.address, glpStrategy.address, 0);
        const glpAssetId = await yieldBox.ids(
            1,
            glp.address,
            glpStrategy.address,
            0,
        );

        const AssetToGLPLeverageExecutorFactory =
            await ethers.getContractFactory('AssetToSGLPLeverageExecutor');
        const assetToGLPLeverageExecutor =
            await AssetToGLPLeverageExecutorFactory.deploy(
                yieldBox.address,
                swapper.address,
                cluster.address,
                usdc.address,
                glpRouter.address,
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
            glpAssetId,
            glpStrategy,
            swapper,
            wethAssetId,
            glpRouter,
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
            glpAssetId,
            swapper,
            cluster,
            glpRouter,
        } = await loadFixture(setUp);
        await cluster.updateContract(0, deployer.address, true);

        const balanceBefore = await glp.balanceOf(deployer.address);
        expect(balanceBefore.eq(0)).to.be.true;

        const amountIn = ethers.utils.parseEther('10');

        await weth.toggleRestrictions();
        await weth.freeMint(amountIn);

        await glp.toggleRestrictions();
        await glp.freeMint(amountIn);

        await usdc.toggleRestrictions();
        await usdc.freeMint(amountIn);

        await usdc.transfer(swapper.address, amountIn);
        await glp.transfer(glpRouter.address, amountIn);

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes', 'uint256'],
            [amountIn, '0x', amountIn],
        );

        await assetToGLPLeverageExecutor.getCollateral(
            glpAssetId,
            weth.address,
            glp.address,
            0,
            deployer.address,
            data,
        );

        await yieldBox.withdraw(
            glpAssetId,
            deployer.address,
            deployer.address,
            amountIn,
            0,
        );
        const balanceAfter = await glp.balanceOf(deployer.address);
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
            swapper,
            wethAssetId,
            cluster,
            glpRouter,
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

        await usdc.transfer(glpRouter.address, amountIn);
        await weth.transfer(swapper.address, amountIn);
        await glp.transfer(assetToGLPLeverageExecutor.address, amountIn);

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'uint256', 'bytes'],
            [amountIn, amountIn, '0x'],
        );

        await assetToGLPLeverageExecutor.getAsset(
            wethAssetId,
            glp.address,
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

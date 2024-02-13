import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register, impersonateAccount } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';
import { TOFTMock__factory } from '@tapioca-sdk/typechain/tapioca-mocks';
import { UniswapV3Swapper__factory } from '@tapioca-sdk/typechain/tapioca-periphery';

describe.skip('assetToSGlpLeverageExecutors.test test', () => {
    before(function () {
        if (process.env.NODE_ENV != 'arbitrum') {
            this.skip();
        }
    });
    async function setUpFork() {
        const { usdc, yieldBox, cluster, deployer, createTokenEmptyStrategy } =
            await loadFixture(register);

        await cluster.updateContract(0, deployer.address, true);

        // const glpAddress = '0x4277f8F2c384827B5273592FF7CeBd9f2C1ac258';
        const sGlpAddress = '0x5402B5F40310bDED796c7D0F3FF6683f5C0cFfdf'; //staked Glp - it's transferable because cooldownPeriod is 0
        const usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
        const wethAddress = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
        const glpRouterAddress = '0xB95DB5B167D75e6d04227CfFFA61069348d271F5';

        const realsGlpContract = await ethers.getContractAt(
            '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
            sGlpAddress,
        );
        const realWethContract = await ethers.getContractAt(
            '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
            wethAddress,
        );
        const realUsdcContract = await ethers.getContractAt(
            '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
            usdcAddress,
        );
        const realUsdcStrategy = await createTokenEmptyStrategy(
            yieldBox.address,
            realUsdcContract.address,
        );
        await yieldBox.registerAsset(
            1,
            realUsdcContract.address,
            realUsdcStrategy.address,
            0,
        );
        const realUsdcAssetId = await yieldBox.ids(
            1,
            realUsdcContract.address,
            realUsdcStrategy.address,
            0,
        );

        const realWethStrategy = await createTokenEmptyStrategy(
            yieldBox.address,
            realWethContract.address,
        );
        await yieldBox.registerAsset(
            1,
            realWethContract.address,
            realWethStrategy.address,
            0,
        );
        const realWethAssetId = await yieldBox.ids(
            1,
            realWethContract.address,
            realWethStrategy.address,
            0,
        );

        const glpRouter = await ethers.getContractAt(
            'IGmxRewardRouterV2',
            glpRouterAddress,
        );

        const routerV3 = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; //todo: update
        const factoryV3 = '0x1F98431c8aD98523631AE4a59f267346ea31F984'; //todo: update
        const SwapperFactory = new UniswapV3Swapper__factory(deployer);
        const swapper = await SwapperFactory.deploy(
            yieldBox.address,
            routerV3,
            factoryV3,
            deployer.address,
        );
        const glpStrategy = await createTokenEmptyStrategy(
            yieldBox.address,
            sGlpAddress,
        );
        await yieldBox.registerAsset(1, sGlpAddress, glpStrategy.address, 0);
        const glpAssetId = await yieldBox.ids(
            1,
            sGlpAddress,
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
                realUsdcContract.address,
                glpRouter.address,
            );
        await assetToGLPLeverageExecutor.deployed();

        await cluster.updateContract(0, swapper.address, true);

        const binanceWallet = '0xb38e8c17e38363af6ebdcb3dae12e0243582891d';
        await impersonateAccount(binanceWallet);
        const binanceAccount = await ethers.getSigner(binanceWallet);

        return {
            usdc,
            // realGlpContract,
            realUsdcContract,
            realUsdcAssetId,
            realWethAssetId,
            realWethContract,
            realWethStrategy,
            yieldBox,
            cluster,
            deployer,
            assetToGLPLeverageExecutor,
            glpAssetId,
            glpStrategy,
            swapper,
            glpRouter,
            binanceAccount,
            realsGlpContract,
        };
    }

    it('should get collateral - fork test', async () => {
        const {
            realWethContract,
            yieldBox,
            deployer,
            assetToGLPLeverageExecutor,
            realsGlpContract,
            glpAssetId,
            cluster,
        } = await loadFixture(setUpFork);
        await cluster.updateContract(0, deployer.address, true);

        const balanceBefore = await yieldBox.balanceOf(
            deployer.address,
            glpAssetId,
        );
        expect(balanceBefore.eq(0)).to.be.true;

        const amountIn = ethers.utils.parseEther('10');

        //assure executor with asset (WETH)
        const wethAbi =
            '[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"guy","type":"address"},{"name":"wad","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"src","type":"address"},{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"wad","type":"uint256"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"deposit","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"guy","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Withdrawal","type":"event"}]';
        const weth9 = new ethers.Contract(
            realWethContract.address,
            wethAbi,
            deployer,
        );
        await weth9.deposit({ value: amountIn });

        await realWethContract
            .connect(deployer)
            .transfer(assetToGLPLeverageExecutor.address, amountIn);

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes', 'uint256'],
            ['0', '0x', '0'],
        );
        await assetToGLPLeverageExecutor.getCollateral(
            glpAssetId,
            realWethContract.address,
            realsGlpContract.address,
            amountIn,
            deployer.address,
            data,
        );

        const balanceAfter = await yieldBox.balanceOf(
            deployer.address,
            glpAssetId,
        );
        expect(balanceAfter.gt(0)).to.be.true;
    });

    it('should get asset - fork test', async () => {
        const {
            realWethContract,
            yieldBox,
            deployer,
            assetToGLPLeverageExecutor,
            glpAssetId,
            realUsdcContract,
            binanceAccount,
            realWethAssetId,
            cluster,
            glpRouter,
            realsGlpContract,
        } = await loadFixture(setUpFork);
        await cluster.updateContract(0, deployer.address, true);

        const amountUsdc = 10000000; //10

        const balanceBefore = await yieldBox.balanceOf(
            deployer.address,
            realWethAssetId,
        );
        expect(balanceBefore.eq(0)).to.be.true;

        //get glp and wrap it
        await realUsdcContract
            .connect(binanceAccount)
            .transfer(deployer.address, amountUsdc);
        await realUsdcContract.approve(
            await glpRouter.glpManager(),
            amountUsdc,
        );
        await glpRouter.mintAndStakeGlp(
            realUsdcContract.address,
            amountUsdc,
            0,
            0,
        );
        const balance = await realsGlpContract.balanceOf(deployer.address);
        await realsGlpContract.transfer(
            assetToGLPLeverageExecutor.address,
            balance,
        );

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'uint256', 'bytes'],
            ['0', '0', '0x'],
        );

        await assetToGLPLeverageExecutor.getAsset(
            realWethAssetId,
            realsGlpContract.address,
            realWethContract.address,
            balance,
            deployer.address,
            data,
        );

        const balanceAfter = await yieldBox.balanceOf(
            deployer.address,
            realWethAssetId,
        );
        expect(balanceAfter.gt(0)).to.be.true;
    });
});

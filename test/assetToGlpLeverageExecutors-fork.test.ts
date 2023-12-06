import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register, impersonateAccount } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';
import { TOFTMock__factory } from '../gitsub_tapioca-sdk/src/typechain/tapioca-mocks';
import { UniswapV3Swapper__factory } from '../gitsub_tapioca-sdk/src/typechain/tapioca-periphery';

describe.only('assetToGlpLeverageExecutors.test test', () => {
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
        const fsGlpAddress = '0x1aDDD80E6039594eE970E5872D247bf0414C8903'; //fees + staked
        const usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
        const wethAddress = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
        const glpRouterAddress = '0xB95DB5B167D75e6d04227CfFFA61069348d271F5';

        const realWethContract = await ethers.getContractAt(
            '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
            wethAddress,
        );
        const realUsdcContract = await ethers.getContractAt(
            '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
            usdcAddress,
        );
        // const realGlpContract = await ethers.getContractAt(
        //     '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
        //     glpAddress,
        // );
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
        );

        const TOFTMock = new TOFTMock__factory(deployer);
        const toft = await TOFTMock.deploy(fsGlpAddress);

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
            toft,
            toftAssetId,
            toftStrategy,
            swapper,
            glpRouter,
            binanceAccount,
        };
    }

    it.only('should get collateral - fork test', async () => {
        const {
            realWethContract,
            yieldBox,
            deployer,
            assetToGLPLeverageExecutor,
            toft,
            toftAssetId,
            cluster,
        } = await loadFixture(setUpFork);
        await cluster.updateContract(0, deployer.address, true);

        const balanceBefore = await yieldBox.balanceOf(
            deployer.address,
            toftAssetId,
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
            toftAssetId,
            realWethContract.address,
            toft.address,
            amountIn,
            deployer.address,
            data,
        );

        const balanceAfter = await yieldBox.balanceOf(
            deployer.address,
            toftAssetId,
        );
        expect(balanceAfter.gt(0)).to.be.true;
    });

    // it('should get asset', async () => {
    //     const {
    //         usdc,
    //         weth,
    //         glp,
    //         yieldBox,
    //         deployer,
    //         assetToGLPLeverageExecutor,
    //         toft,
    //         swapper,
    //         wethAssetId,
    //         cluster,
    //         glpRouter,
    //     } = await loadFixture(setUp);
    //     await cluster.updateContract(0, deployer.address, true);

    //     const amountIn = ethers.utils.parseEther('10');

    //     const balanceBefore = await weth.balanceOf(deployer.address);
    //     expect(balanceBefore.eq(0)).to.be.true;

    //     await weth.toggleRestrictions();
    //     await weth.freeMint(amountIn);

    //     await glp.toggleRestrictions();
    //     await glp.freeMint(amountIn);

    //     await usdc.toggleRestrictions();
    //     await usdc.freeMint(amountIn);

    //     await glp.approve(toft.address, amountIn);
    //     await toft.wrap(deployer.address, deployer.address, amountIn);

    //     await usdc.transfer(glpRouter.address, amountIn);
    //     await weth.transfer(swapper.address, amountIn);
    //     await toft.transfer(assetToGLPLeverageExecutor.address, amountIn);

    //     const data = new ethers.utils.AbiCoder().encode(
    //         ['uint256', 'uint256', 'bytes'],
    //         [amountIn, amountIn, '0x'],
    //     );

    //     await assetToGLPLeverageExecutor.getAsset(
    //         wethAssetId,
    //         toft.address,
    //         weth.address,
    //         amountIn,
    //         deployer.address,
    //         data,
    //     );

    //     await yieldBox.withdraw(
    //         wethAssetId,
    //         deployer.address,
    //         deployer.address,
    //         amountIn,
    //         0,
    //     );
    //     const balanceAfter = await weth.balanceOf(deployer.address);
    //     expect(balanceAfter.eq(amountIn)).to.be.true;
    // });
});

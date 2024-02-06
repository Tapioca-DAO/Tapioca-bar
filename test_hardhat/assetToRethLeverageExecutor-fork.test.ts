import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register, impersonateAccount } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';
import {
    BalancerVaultMock__factory,
    ERC20Mock__factory,
    MockSwapper__factory,
    TOFTMock__factory,
} from '@tapioca-sdk/typechain/tapioca-mocks';
import { UniswapV3Swapper__factory } from '@tapioca-sdk/typechain/tapioca-periphery';

describe('AssetToREthLeverageExecutor-fork test', () => {
    before(function () {
        if (process.env.NODE_ENV != 'arbitrum') {
            this.skip();
        }
    });
    async function setUpFork() {
        const { yieldBox, cluster, deployer, createTokenEmptyStrategy } =
            await loadFixture(register);
        await cluster.updateContract(0, deployer.address, true);

        const usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
        const rEthAddress = '0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8';
        const wethAddress = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
        const balancerVaultAddress =
            '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
        const balancerPoolId =
            '0xade4a71bb62bec25154cfc7e6ff49a513b491e81000000000000000000000497';

        const balancerVaultContract = await ethers.getContractAt(
            'IBalancerVault',
            balancerVaultAddress,
        );
        const realUsdcContract = await ethers.getContractAt(
            '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
            usdcAddress,
        );
        const realWethContract = await ethers.getContractAt(
            '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
            wethAddress,
        );
        const realrEthContract = await ethers.getContractAt(
            '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
            rEthAddress,
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

        const TOFTMock = await ethers.getContractFactory("TOFTMock");
        const toft = await TOFTMock.deploy(rEthAddress);

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
        const routerV3 = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; //todo: update
        const factoryV3 = '0x1F98431c8aD98523631AE4a59f267346ea31F984'; //todo: update
        const SwapperFactory = new UniswapV3Swapper__factory(deployer);
        const swapper = await SwapperFactory.deploy(
            yieldBox.address,
            routerV3,
            factoryV3,
            deployer.address,
        );

        const AssetToRethLeverageExecutorFactory =
            await ethers.getContractFactory('AssetToRethLeverageExecutor');
        const assetToRethLeverageExecutor =
            await AssetToRethLeverageExecutorFactory.deploy(
                yieldBox.address,
                swapper.address,
                cluster.address,
                realWethContract.address,
                balancerVaultAddress, //IBalancerVault
                balancerPoolId, //pool id
            );
        await assetToRethLeverageExecutor.deployed();

        await cluster.updateContract(0, swapper.address, true);

        const binanceWallet = '0xb38e8c17e38363af6ebdcb3dae12e0243582891d';
        await impersonateAccount(binanceWallet);
        const binanceAccount = await ethers.getSigner(binanceWallet);

        return {
            realUsdcContract,
            realUsdcAssetId,
            swapper,
            toft,
            toftStrategy,
            yieldBox,
            toftAssetId,
            assetToRethLeverageExecutor,
            deployer,
            binanceAccount,
            realWethContract,
            balancerPoolId,
            balancerVaultContract,
            realrEthContract,
        };
    }

    it('should get collateral - fork', async () => {
        const {
            realUsdcContract,
            toft,
            yieldBox,
            toftAssetId,
            assetToRethLeverageExecutor,
            deployer,
            binanceAccount,
        } = await loadFixture(setUpFork);

        const balanceBefore = await yieldBox.balanceOf(
            deployer.address,
            toftAssetId,
        );
        expect(balanceBefore.eq(0)).to.be.true;

        const amountUsdc = '1000000000'; //1000
        const amountIn = ethers.utils.parseEther('1');

        //assure executor with USDC
        await realUsdcContract
            .connect(binanceAccount)
            .transfer(assetToRethLeverageExecutor.address, amountUsdc);

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes', 'uint256'],
            ['0', '0x', '0'],
        );
        await assetToRethLeverageExecutor.getCollateral(
            toftAssetId,
            realUsdcContract.address,
            toft.address,
            amountUsdc,
            deployer.address,
            data,
        );

        const balanceAfter = await yieldBox.balanceOf(
            deployer.address,
            toftAssetId,
        );
        expect(balanceAfter.gt(0)).to.be.true;
    });

    it('should get asset - fork', async () => {
        const {
            realUsdcAssetId,
            realUsdcContract,
            realWethContract,
            realrEthContract,
            balancerVaultContract,
            swapper,
            toft,
            yieldBox,
            toftAssetId,
            assetToRethLeverageExecutor,
            deployer,
            binanceAccount,
            balancerPoolId,
        } = await loadFixture(setUpFork);

        const balanceBefore = await yieldBox.balanceOf(
            deployer.address,
            realUsdcAssetId,
        );
        expect(balanceBefore.eq(0)).to.be.true;

        const wethAbi =
            '[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"guy","type":"address"},{"name":"wad","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"src","type":"address"},{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"wad","type":"uint256"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"deposit","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"guy","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Withdrawal","type":"event"}]';
        const weth9 = new ethers.Contract(
            realWethContract.address,
            wethAbi,
            deployer,
        );
        const amountWeth = ethers.utils.parseEther('1');
        await weth9.deposit({ value: amountWeth });

        await realWethContract
            .connect(deployer)
            .approve(balancerVaultContract.address, amountWeth);
        await balancerVaultContract.connect(deployer).swap(
            {
                poolId: balancerPoolId,
                kind: 0,
                assetIn: realWethContract.address,
                assetOut: realrEthContract.address,
                amount: amountWeth,
                userData: '0x',
            },
            {
                sender: deployer.address,
                fromInternalBalance: false,
                recipient: deployer.address,
                toInternalBalance: false,
            },
            0,
            '99999999999999999',
        );
        const rEthBalance = await realrEthContract.balanceOf(deployer.address);
        expect(rEthBalance.gt(0)).to.be.true;

        await realrEthContract.approve(toft.address, rEthBalance);
        await toft.wrap(deployer.address, deployer.address, rEthBalance);
        expect((await toft.balanceOf(deployer.address)).eq(rEthBalance)).to.be
            .true;

        await toft.transfer(assetToRethLeverageExecutor.address, rEthBalance);

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'uint256', 'bytes'],
            ['0', '0', '0x'],
        );
        await assetToRethLeverageExecutor.getAsset(
            realUsdcAssetId,
            toft.address,
            realUsdcContract.address,
            rEthBalance,
            deployer.address,
            data,
        );

        const balanceAfter = await yieldBox.balanceOf(
            deployer.address,
            realUsdcAssetId,
        );
        expect(balanceAfter.gt(0)).to.be.true;
    });
});

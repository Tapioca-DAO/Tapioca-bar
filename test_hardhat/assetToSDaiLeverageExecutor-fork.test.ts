import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register, impersonateAccount } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';
import {
    ERC20Mock__factory,
    MockSwapper__factory,
    TOFTMock__factory,
} from '@tapioca-sdk/typechain/tapioca-mocks';
import { ERC20 } from '../typechain';
import { UniswapV3Swapper__factory } from '@tapioca-sdk/typechain/tapioca-periphery';

describe.skip('AssetToSDaiLeverageExecutor-fork test', () => {
    before(function () {
        if (process.env.NODE_ENV != 'mainnet') {
            this.skip();
        }
    });
    async function setUpFork() {
        const { yieldBox, cluster, deployer, createTokenEmptyStrategy } =
            await loadFixture(register);
        await cluster.updateContract(0, deployer.address, true);

        const usdcAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
        const sDaiAddress = '0x83f20f44975d03b1b09e64809b757c47f942beea';
        const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';

        const realUsdcContract = await ethers.getContractAt(
            '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
            usdcAddress,
        );
        const realsDaiContract = await ethers.getContractAt(
            '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
            sDaiAddress,
        );
        const realDaiContract = await ethers.getContractAt(
            '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
            daiAddress,
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

        const TOFTMock = await ethers.getContractFactory('TOFTMock');
        const toft = await TOFTMock.deploy(realsDaiContract.address);

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
        const routerV3 = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
        const factoryV3 = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
        const SwapperFactory = new UniswapV3Swapper__factory(deployer);
        const swapper = await SwapperFactory.deploy(
            yieldBox.address,
            routerV3,
            factoryV3,
            deployer.address,
        );

        const AssetTotsDaiLeverageExecutorFactory =
            await ethers.getContractFactory('AssetTotsDaiLeverageExecutor');
        const assetTotsDaiLeverageExecutor =
            await AssetTotsDaiLeverageExecutorFactory.deploy(
                yieldBox.address,
                swapper.address,
                cluster.address,
            );
        await assetTotsDaiLeverageExecutor.deployed();

        await cluster.updateContract(0, swapper.address, true);

        const binanceWallet = '0x28C6c06298d514Db089934071355E5743bf21d60';
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
            assetTotsDaiLeverageExecutor,
            deployer,
            binanceAccount,
            realsDaiContract,
            realDaiContract,
        };
    }
    it('should get collateral - fork test', async () => {
        const {
            realUsdcContract,
            swapper,
            toft,
            yieldBox,
            toftAssetId,
            assetTotsDaiLeverageExecutor,
            deployer,
            binanceAccount,
        } = await loadFixture(setUpFork);

        const balanceBefore = await yieldBox.balanceOf(
            deployer.address,
            toftAssetId,
        );
        expect(balanceBefore.eq(0)).to.be.true;

        const amountIn = ethers.utils.parseEther('1');

        const amountUsdc = '1000000'; //1

        //assure executor with USDC
        await realUsdcContract
            .connect(binanceAccount)
            .transfer(assetTotsDaiLeverageExecutor.address, amountUsdc);

        await deployer.sendTransaction({
            to: swapper.address,
            value: amountIn,
        });

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes'],
            ['0', '0x'],
        );
        await assetTotsDaiLeverageExecutor.getCollateral(
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

    it('should get asset - fork test', async () => {
        const {
            realUsdcContract,
            realUsdcAssetId,
            swapper,
            toft,
            yieldBox,
            toftAssetId,
            assetTotsDaiLeverageExecutor,
            deployer,
            binanceAccount,
            realDaiContract,
            realsDaiContract,
        } = await loadFixture(setUpFork);

        const balanceBefore = await yieldBox.balanceOf(
            deployer.address,
            realUsdcAssetId,
        );
        expect(balanceBefore.eq(0)).to.be.true;

        const amountIn = ethers.utils.parseEther('1');
        const amountUsdc = '1000000'; //1

        await realDaiContract
            .connect(binanceAccount)
            .transfer(deployer.address, amountIn);

        const sDaiContract = await ethers.getContractAt(
            'ISavingsDai',
            realsDaiContract.address,
        );
        await realDaiContract.approve(sDaiContract.address, amountIn);
        await sDaiContract.deposit(amountIn, deployer.address);
        const sDaiBalance = await realsDaiContract.balanceOf(deployer.address);
        await realsDaiContract.approve(toft.address, sDaiBalance);
        await toft.wrap(deployer.address, deployer.address, sDaiBalance, {
            value: amountIn,
        });

        expect((await toft.balanceOf(deployer.address)).eq(sDaiBalance)).to.be
            .true;

        await toft.transfer(assetTotsDaiLeverageExecutor.address, sDaiBalance);

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes'],
            ['0', '0x'],
        );
        await assetTotsDaiLeverageExecutor.getAsset(
            realUsdcAssetId,
            toft.address,
            realUsdcContract.address,
            sDaiBalance,
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

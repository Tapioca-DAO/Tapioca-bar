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

describe('AssetToEthLeverageExecutor-fork test', () => {
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

        const TOFTMock = await ethers.getContractFactory("TOFTMock");
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
        const routerV3 = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
        const factoryV3 = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
        const SwapperFactory = new UniswapV3Swapper__factory(deployer);
        const swapper = await SwapperFactory.deploy(
            yieldBox.address,
            routerV3,
            factoryV3,
            deployer.address,
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
            assetToEthLeverageExecutor,
            deployer,
            binanceAccount,
        };
    }
    it('should get collateral - fork test', async () => {
        const {
            realUsdcContract,
            swapper,
            toft,
            yieldBox,
            toftAssetId,
            assetToEthLeverageExecutor,
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
            .transfer(assetToEthLeverageExecutor.address, amountUsdc);

        await deployer.sendTransaction({
            to: swapper.address,
            value: amountIn,
        });

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes'],
            ['0', '0x'],
        );
        await assetToEthLeverageExecutor.getCollateral(
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
            assetToEthLeverageExecutor,
            deployer,
            binanceAccount,
        } = await loadFixture(setUpFork);

        const balanceBefore = await yieldBox.balanceOf(
            deployer.address,
            realUsdcAssetId,
        );
        expect(balanceBefore.eq(0)).to.be.true;

        const amountIn = ethers.utils.parseEther('1');
        const amountUsdc = '1000000'; //1

        await toft.wrap(deployer.address, deployer.address, amountIn, {
            value: amountIn,
        });

        expect((await toft.balanceOf(deployer.address)).eq(amountIn)).to.be
            .true;

        await toft.transfer(assetToEthLeverageExecutor.address, amountIn);

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes'],
            ['0', '0x'],
        );
        await assetToEthLeverageExecutor.getAsset(
            realUsdcAssetId,
            toft.address,
            realUsdcContract.address,
            amountIn,
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

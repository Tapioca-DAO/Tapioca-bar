import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';
import {
    BalancerVaultMock__factory,
    ERC20Mock__factory,
    MockSwapper__factory,
    TOFTMock__factory,
} from '@tapioca-sdk/typechain/tapioca-mocks';

describe('AssetToWstEthLeverageExecutor test', () => {
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

        const ERC20Mock = new ERC20Mock__factory(deployer);
        const wstEth = await ERC20Mock.deploy(
            'wstETH Token',
            'wstETH',
            0,
            18,
            deployer.address,
        );

        const TOFTMock = await ethers.getContractFactory("TOFTMock");
        const toft = await TOFTMock.deploy(wstEth.address);

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

        const BalancerVaultMock = new BalancerVaultMock__factory(deployer);
        const balancerVault = await BalancerVaultMock.deploy();

        const AssetToWstethLeverageExecutorFactory =
            await ethers.getContractFactory('AssetToWstethLeverageExecutor');
        const assetToWstethLeverageExecutor =
            await AssetToWstethLeverageExecutorFactory.deploy(
                yieldBox.address,
                swapper.address,
                cluster.address,
                weth.address,
                balancerVault.address, //IBalancerVault
                '0x9791d590788598535278552eecd4b211bfc790cb000000000000000000000498', //pool id
            );
        await assetToWstethLeverageExecutor.deployed();

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
            assetToWstethLeverageExecutor,
            deployer,
            wstEth,
            balancerVault,
        };
    }

    it('should build default data', async () => {
        const { usdc, assetToWstethLeverageExecutor } = await loadFixture(
            setUp,
        );

        const defaultData =
            await assetToWstethLeverageExecutor.buildSwapDefaultData(
                usdc.address,
                ethers.constants.AddressZero,
                ethers.utils.parseEther('10'),
            );
        expect(defaultData.length).to.be.gt(0);
    });

    it('should get collateral', async () => {
        const {
            usdc,
            weth,
            swapper,
            toft,
            yieldBox,
            toftAssetId,
            assetToWstethLeverageExecutor,
            deployer,
            wstEth,
            balancerVault,
        } = await loadFixture(setUp);

        const balanceBefore = await toft.balanceOf(deployer.address);
        expect(balanceBefore.eq(0)).to.be.true;

        const amountIn = ethers.utils.parseEther('1');

        await usdc.toggleRestrictions();
        await usdc.freeMint(amountIn);

        await weth.toggleRestrictions();
        await weth.freeMint(amountIn);

        await wstEth.toggleRestrictions();
        await wstEth.freeMint(amountIn);

        await weth.transfer(swapper.address, amountIn);
        await wstEth.transfer(balancerVault.address, amountIn);

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes', 'uint256'],
            [amountIn, '0x', amountIn],
        );
        await assetToWstethLeverageExecutor.getCollateral(
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
            swapper,
            toft,
            yieldBox,
            assetToWstethLeverageExecutor,
            deployer,
            wstEth,
            balancerVault,
        } = await loadFixture(setUp);

        const balanceBefore = await usdc.balanceOf(deployer.address);
        expect(balanceBefore.eq(0)).to.be.true;

        const amountIn = ethers.utils.parseEther('1');

        await usdc.toggleRestrictions();
        await usdc.freeMint(amountIn);

        await weth.toggleRestrictions();
        await weth.freeMint(amountIn);

        await wstEth.toggleRestrictions();
        await wstEth.freeMint(amountIn);

        await usdc.transfer(swapper.address, amountIn);
        await weth.transfer(balancerVault.address, amountIn);

        await wstEth.approve(toft.address, amountIn);
        await toft.wrap(deployer.address, deployer.address, amountIn);
        expect((await toft.balanceOf(deployer.address)).eq(amountIn)).to.be
            .true;

        await toft.transfer(assetToWstethLeverageExecutor.address, amountIn);

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'uint256', 'bytes'],
            [amountIn, amountIn, '0x'],
        );
        await assetToWstethLeverageExecutor.getAsset(
            usdcAssetId,
            toft.address,
            usdc.address,
            amountIn,
            deployer.address,
            data,
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

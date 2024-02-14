import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';
import {
    ERC20Mock__factory,
    MockSwapper__factory,
    TOFTMock__factory,
} from '@tapioca-sdk/typechain/tapioca-mocks';

describe.skip('USDOsDaiLeverageExecutor test', () => {
    async function setUp() {
        const {
            registerSDaiMock,
            yieldBox,
            cluster,
            deployer,
            usdc,
            createTokenEmptyStrategy,
            usd0,
            usdcAssetId,
        } = await loadFixture(register);

        const ERC20Mock = new ERC20Mock__factory(deployer);
        const dai = await ERC20Mock.deploy(
            'DAI Token',
            'DAI',
            0,
            18,
            deployer.address,
        );

        const { sDai } = await registerSDaiMock(dai.address, deployer);

        const MockSwapper = new MockSwapper__factory(deployer);
        const swapper = await MockSwapper.deploy(yieldBox.address);

        const TOFTMock = await ethers.getContractFactory('TOFTMock');
        const toft = await TOFTMock.deploy(sDai.address);

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

        return {
            usdc,
            dai,
            sDai,
            swapper,
            toft,
            toftStrategy,
            yieldBox,
            toftAssetId,
            assetTotsDaiLeverageExecutor,
            deployer,
            usd0,
            usdcAssetId,
            cluster,
        };
    }

    it('should build default data', async () => {
        const { dai, assetTotsDaiLeverageExecutor, usdc, cluster, deployer } =
            await loadFixture(setUp);
        await cluster.updateContract(0, deployer.address, true);

        const defaultData =
            await assetTotsDaiLeverageExecutor.buildSwapDefaultData(
                usdc.address,
                dai.address,
                ethers.utils.parseEther('10'),
            );
        expect(defaultData.length).to.be.gt(0);

        // const decoded = new ethers.utils.AbiCoder().decode(
        //     ['uint256', 'bytes'],
        //     defaultData,
        // );
    });

    it('should get collateral', async () => {
        const {
            dai,
            swapper,
            toft,
            yieldBox,
            toftAssetId,
            assetTotsDaiLeverageExecutor,
            deployer,
            usdc,
            cluster,
        } = await loadFixture(setUp);
        await cluster.updateContract(0, deployer.address, true);

        const balanceBefore = await toft.balanceOf(deployer.address);
        expect(balanceBefore.eq(0)).to.be.true;

        const amountIn = ethers.utils.parseEther('10');

        await dai.toggleRestrictions();
        await dai.freeMint(amountIn);

        await dai.transfer(swapper.address, amountIn);

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes'],
            [amountIn, '0x'],
        );
        await assetTotsDaiLeverageExecutor.getCollateral(
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
            dai,
            sDai,
            swapper,
            toft,
            yieldBox,
            assetTotsDaiLeverageExecutor,
            deployer,
            usdcAssetId,
            cluster,
        } = await loadFixture(setUp);
        await cluster.updateContract(0, deployer.address, true);

        const balanceBefore = await toft.balanceOf(deployer.address);
        expect(balanceBefore.eq(0)).to.be.true;

        const amountIn = ethers.utils.parseEther('10');

        await usdc.toggleRestrictions();
        await usdc.freeMint(amountIn);
        await usdc.transfer(swapper.address, amountIn);

        await dai.toggleRestrictions();
        await dai.freeMint(amountIn);
        await dai.approve(sDai.address, amountIn);
        await sDai.deposit(amountIn, deployer.address);
        expect((await sDai.balanceOf(deployer.address)).eq(amountIn)).to.be
            .true;

        await sDai.approve(toft.address, amountIn);
        await toft.wrap(deployer.address, deployer.address, amountIn);
        expect((await toft.balanceOf(deployer.address)).eq(amountIn)).to.be
            .true;

        await toft.transfer(assetTotsDaiLeverageExecutor.address, amountIn);

        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'bytes'],
            [amountIn, '0x'],
        );
        await assetTotsDaiLeverageExecutor.getAsset(
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

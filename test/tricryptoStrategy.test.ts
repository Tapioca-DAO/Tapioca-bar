import { expect } from 'chai';
import { ethers } from 'hardhat';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('TricryptoStrategy test', () => {
    it('should test initial strategy values', async () => {
        const { tricryptoStrategy, tricryptoLPGtter, weth, yieldBox } =
            await loadFixture(register);

        const name = await tricryptoStrategy.name();
        const description = await tricryptoStrategy.description();

        expect(name).eq('Curve-Tricrypto');
        expect(description).eq(
            'Curve-Tricrypto strategy for wrapped native assets',
        );

        const contractAddress = await tricryptoStrategy.contractAddress();
        expect(contractAddress.toLowerCase()).eq(weth.address.toLowerCase());

        const lpGaugeAddress = await tricryptoStrategy.lpGauge();
        expect(lpGaugeAddress).to.not.eq(ethers.constants.AddressZero);

        const lpGetterAddress = await tricryptoStrategy.lpGetter();
        expect(lpGetterAddress).to.not.eq(ethers.constants.AddressZero);

        const yieldBoxAddress = await tricryptoStrategy.yieldBox();
        expect(yieldBoxAddress.toLowerCase()).to.eq(
            yieldBox.address.toLowerCase(),
        );

        const currentBalance = await tricryptoStrategy.currentBalance();
        expect(currentBalance.eq(0)).to.be.true;

        const queued = await weth.balanceOf(tricryptoStrategy.address);
        expect(queued.eq(0)).to.be.true;
    });

    it('should allow setting the deposit threshold', async () => {
        const { tricryptoStrategy, weth, yieldBox } = await loadFixture(
            register,
        );

        const currentThreshold = await tricryptoStrategy.depositThreshold();

        const newThreshold = ethers.BigNumber.from((1e18).toString()).mul(10);
        await tricryptoStrategy.setDepositThreshold(newThreshold);

        const finalThreshold = await tricryptoStrategy.depositThreshold();

        expect(currentThreshold).to.not.eq(finalThreshold);
    });
    it('should allow setting lp getter', async () => {
        const {
            tricryptoStrategy,
            tricryptoLPGtter,
            deployTricryptoLPGetter,
            weth,
            yieldBox,
        } = await loadFixture(register);

        const currentLpGetter = await tricryptoStrategy.lpGetter();
        expect(currentLpGetter.toLowerCase()).to.eq(
            tricryptoLPGtter.address.toLowerCase(),
        );

        const liquidityPoolMock = await (
            await ethers.getContractFactory('TricryptoLiquidityPoolMock')
        ).deploy(weth.address);
        await liquidityPoolMock.deployed();
        const newTricryptoLpGetterDeployment = await deployTricryptoLPGetter(
            liquidityPoolMock.address,
            weth.address,
            weth.address,
            weth.address,
        );
        await tricryptoStrategy.setTricryptoLPGetter(
            newTricryptoLpGetterDeployment.tricryptoLPGtter.address,
        );

        const finalLpGetter = await tricryptoStrategy.lpGetter();
        expect(finalLpGetter.toLowerCase()).to.eq(
            newTricryptoLpGetterDeployment.tricryptoLPGtter.address.toLowerCase(),
        );
    });

    it('should queue and deposit when threshold is met', async () => {
        const { tricryptoStrategy, weth, wethAssetId, yieldBox, deployer } =
            await loadFixture(register);

        const lpGaugeAddress = await tricryptoStrategy.lpGauge();
        const lpGaugeContract = await ethers.getContractAt(
            'ITricryptoLPGauge',
            lpGaugeAddress,
        );

        await yieldBox.registerAsset(
            1,
            weth.address,
            tricryptoStrategy.address,
            0,
        );

        const wethStrategyAssetId = await yieldBox.ids(
            1,
            weth.address,
            tricryptoStrategy.address,
            0,
        );
        const amount = ethers.BigNumber.from((1e18).toString()).mul(10);
        await tricryptoStrategy.setDepositThreshold(amount.mul(3));

        await weth.freeMint(amount.mul(10));
        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);

        let share = await yieldBox.toShare(wethStrategyAssetId, amount, false);
        await yieldBox.depositAsset(
            wethStrategyAssetId,
            deployer.address,
            deployer.address,
            0,
            share,
        );

        let strategyWethBalance = await weth.balanceOf(
            tricryptoStrategy.address,
        );
        let lpGaugeBalance = await lpGaugeContract.balanceOf(
            tricryptoStrategy.address,
        );
        expect(strategyWethBalance.gt(0)).to.be.true;
        expect(lpGaugeBalance.eq(0)).to.be.true;
        share = await yieldBox.toShare(
            wethStrategyAssetId,
            amount.mul(3),
            false,
        );
        await yieldBox.depositAsset(
            wethStrategyAssetId,
            deployer.address,
            deployer.address,
            0,
            share.mul(3),
        );
        strategyWethBalance = await weth.balanceOf(tricryptoStrategy.address);
        lpGaugeBalance = await lpGaugeContract.balanceOf(
            tricryptoStrategy.address,
        );
        expect(strategyWethBalance.eq(0)).to.be.true;
        expect(lpGaugeBalance.gt(0)).to.be.true;
    });

    it('should allow deposits and withdrawals', async () => {
        const { tricryptoStrategy, weth, wethAssetId, yieldBox, deployer } =
            await loadFixture(register);

        const lpGaugeAddress = await tricryptoStrategy.lpGauge();
        const lpGaugeContract = await ethers.getContractAt(
            'ITricryptoLPGauge',
            lpGaugeAddress,
        );

        await yieldBox.registerAsset(
            1,
            weth.address,
            tricryptoStrategy.address,
            0,
        );

        const wethStrategyAssetId = await yieldBox.ids(
            1,
            weth.address,
            tricryptoStrategy.address,
            0,
        );
        expect(wethStrategyAssetId).to.not.eq(wethAssetId);
        const assetsCount = await yieldBox.assetCount();
        const assetInfo = await yieldBox.assets(assetsCount.sub(1));
        expect(assetInfo.tokenType).to.eq(1);
        expect(assetInfo.contractAddress.toLowerCase()).to.eq(
            weth.address.toLowerCase(),
        );
        expect(assetInfo.strategy.toLowerCase()).to.eq(
            tricryptoStrategy.address.toLowerCase(),
        );
        expect(assetInfo.tokenId).to.eq(0);

        const amount = ethers.BigNumber.from((1e18).toString()).mul(10);

        await weth.freeMint(amount);
        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);

        let share = await yieldBox.toShare(wethStrategyAssetId, amount, false);
        await yieldBox.depositAsset(
            wethStrategyAssetId,
            deployer.address,
            deployer.address,
            0,
            share,
        );

        let strategyWethBalance = await weth.balanceOf(
            tricryptoStrategy.address,
        );

        let lpStakingBalance = await lpGaugeContract.balanceOf(
            await tricryptoStrategy.address,
        );
        expect(strategyWethBalance.eq(0)).to.be.true;
        expect(lpStakingBalance.gt(0)).to.be.true;

        share = await yieldBox.toShare(wethStrategyAssetId, amount, false);
        await yieldBox.withdraw(
            wethStrategyAssetId,
            deployer.address,
            deployer.address,
            0,
            share,
        );
        strategyWethBalance = await weth.balanceOf(tricryptoStrategy.address);
        expect(strategyWethBalance.eq(0)).to.be.true;
    });

    it('should withdraw from queue', async () => {
        const { tricryptoStrategy, weth, wethAssetId, yieldBox, deployer } =
            await loadFixture(register);

        const lpGaugeAddress = await tricryptoStrategy.lpGauge();
        const lpGaugeContract = await ethers.getContractAt(
            'ITricryptoLPGauge',
            lpGaugeAddress,
        );

        await yieldBox.registerAsset(
            1,
            weth.address,
            tricryptoStrategy.address,
            0,
        );

        const wethStrategyAssetId = await yieldBox.ids(
            1,
            weth.address,
            tricryptoStrategy.address,
            0,
        );
        const amount = ethers.BigNumber.from((1e18).toString()).mul(10);

        await tricryptoStrategy.setDepositThreshold(amount.mul(3));

        await weth.freeMint(amount.mul(10));

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);

        let share = await yieldBox.toShare(wethStrategyAssetId, amount, false);
        await yieldBox.depositAsset(
            wethStrategyAssetId,
            deployer.address,
            deployer.address,
            0,
            share,
        );

        let strategyWethBalance = await weth.balanceOf(
            tricryptoStrategy.address,
        );

        let lpStakingBalance = await lpGaugeContract.balanceOf(
            await tricryptoStrategy.address,
        );
        expect(strategyWethBalance.gt(0)).to.be.true;
        expect(lpStakingBalance.eq(0)).to.be.true;

        await yieldBox.withdraw(
            wethStrategyAssetId,
            deployer.address,
            deployer.address,
            0,
            share,
        );

        strategyWethBalance = await weth.balanceOf(tricryptoStrategy.address);
        lpStakingBalance = await lpGaugeContract.balanceOf(
            await tricryptoStrategy.address,
        );
        expect(strategyWethBalance.eq(0)).to.be.true;
        expect(lpStakingBalance.eq(0)).to.be.true;
    });
});

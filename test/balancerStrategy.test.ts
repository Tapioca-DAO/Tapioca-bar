import { expect } from 'chai';
import { ethers } from 'hardhat';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';

describe('BalancerStrategy test', () => {
    it('should test initial strategy values', async () => {
        const { balancerStrategy, weth, yieldBox } = await loadFixture(
            register,
        );

        const name = await balancerStrategy.name();
        const description = await balancerStrategy.description();

        expect(name).eq('Balancer');
        expect(description).eq('Balancer strategy for wrapped native assets');

        const contractAddress = await balancerStrategy.contractAddress();
        expect(contractAddress.toLowerCase()).eq(weth.address.toLowerCase());

        const yieldBoxAddress = await balancerStrategy.yieldBox();
        expect(yieldBoxAddress.toLowerCase()).to.eq(
            yieldBox.address.toLowerCase(),
        );

        const currentBalance = await balancerStrategy.currentBalance();
        expect(currentBalance.eq(0)).to.be.true;

        const queued = await weth.balanceOf(balancerStrategy.address);
        expect(queued.eq(0)).to.be.true;
    });

    it('should allow setting the deposit threshold', async () => {
        const { balancerStrategy, weth, yieldBox } = await loadFixture(
            register,
        );

        const currentThreshold = await balancerStrategy.depositThreshold();

        const newThreshold = ethers.BigNumber.from((1e18).toString()).mul(10);
        await balancerStrategy.setDepositThreshold(newThreshold);

        const finalThreshold = await balancerStrategy.depositThreshold();

        expect(currentThreshold).to.not.eq(finalThreshold);
    });

    it('should queue and deposit when threshold is met', async () => {
        const { balancerStrategy, weth, wethAssetId, yieldBox, deployer } =
            await loadFixture(register);

        const gaugeAddress = await balancerStrategy.gauge();
        const gaugeContract = await ethers.getContractAt(
            'IBalancerGauge',
            gaugeAddress,
        );
        const lpTokenAddress = await gaugeContract.lp_token();
        const lpTokenContract = await ethers.getContractAt(
            'IComposableStablePool',
            lpTokenAddress,
        );

        await yieldBox.registerAsset(
            1,
            weth.address,
            balancerStrategy.address,
            0,
        );

        const wethStrategyAssetId = await yieldBox.ids(
            1,
            weth.address,
            balancerStrategy.address,
            0,
        );
        const amount = ethers.BigNumber.from((1e18).toString()).mul(10);
        await balancerStrategy.setDepositThreshold(amount.mul(3));

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
            balancerStrategy.address,
        );
        let gaugeBalance = await lpTokenContract.balanceOf(gaugeAddress);
        expect(strategyWethBalance.gt(0)).to.be.true;
        expect(gaugeBalance.eq(0)).to.be.true;

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
        strategyWethBalance = await weth.balanceOf(balancerStrategy.address);
        gaugeBalance = await lpTokenContract.balanceOf(gaugeAddress);
        expect(strategyWethBalance.eq(0)).to.be.true;
        expect(gaugeBalance.gt(0)).to.be.true;
    });

    it('should allow deposits and withdrawals', async () => {
        const { balancerStrategy, weth, wethAssetId, yieldBox, deployer } =
            await loadFixture(register);

        const gaugeAddress = await balancerStrategy.gauge();
        const gaugeContract = await ethers.getContractAt(
            'IBalancerGauge',
            gaugeAddress,
        );
        const lpTokenAddress = await gaugeContract.lp_token();
        const lpTokenContract = await ethers.getContractAt(
            'IComposableStablePool',
            lpTokenAddress,
        );

        await yieldBox.registerAsset(
            1,
            weth.address,
            balancerStrategy.address,
            0,
        );

        const wethStrategyAssetId = await yieldBox.ids(
            1,
            weth.address,
            balancerStrategy.address,
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
            balancerStrategy.address.toLowerCase(),
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

        const strategyWethBalance = await weth.balanceOf(
            balancerStrategy.address,
        );
        let gaugeBalance = await lpTokenContract.balanceOf(gaugeAddress);
        expect(strategyWethBalance.eq(0)).to.be.true;
        expect(gaugeBalance.lte(amount)).to.be.true;
        expect(gaugeBalance.gt(0)).to.be.true;

        share = await yieldBox.toShare(wethStrategyAssetId, amount, false);
        await yieldBox.withdraw(
            wethStrategyAssetId,
            deployer.address,
            deployer.address,
            0,
            share,
        );
        const vaultFinalPoolBalance = await lpTokenContract.balanceOf(
            gaugeAddress,
        );
        expect(vaultFinalPoolBalance.eq(0)).to.be.true;
    });

    it('should withdraw from queue', async () => {
        const { balancerStrategy, weth, wethAssetId, yieldBox, deployer } =
            await loadFixture(register);

        const gaugeAddress = await balancerStrategy.gauge();
        const gaugeContract = await ethers.getContractAt(
            'IBalancerGauge',
            gaugeAddress,
        );
        const lpTokenAddress = await gaugeContract.lp_token();
        const lpTokenContract = await ethers.getContractAt(
            'IComposableStablePool',
            lpTokenAddress,
        );

        await yieldBox.registerAsset(
            1,
            weth.address,
            balancerStrategy.address,
            0,
        );

        const wethStrategyAssetId = await yieldBox.ids(
            1,
            weth.address,
            balancerStrategy.address,
            0,
        );
        const amount = ethers.BigNumber.from((1e18).toString()).mul(10);
        await balancerStrategy.setDepositThreshold(amount.mul(3));

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
            balancerStrategy.address,
        );
        let gaugeBalance = await lpTokenContract.balanceOf(gaugeAddress);
        expect(strategyWethBalance.gt(0)).to.be.true;
        expect(gaugeBalance.eq(0)).to.be.true;

        share = await yieldBox.toShare(wethStrategyAssetId, amount, false);
        await yieldBox.withdraw(
            wethStrategyAssetId,
            deployer.address,
            deployer.address,
            0,
            share,
        );

        strategyWethBalance = await weth.balanceOf(balancerStrategy.address);
        gaugeBalance = await lpTokenContract.balanceOf(gaugeAddress);
        expect(strategyWethBalance.eq(0)).to.be.true;
        expect(gaugeBalance.eq(0)).to.be.true;
    });

    it('should compound rewards', async () => {
        const {
            balancerStrategy,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            timeTravel,
        } = await loadFixture(register);

        const gaugeAddress = await balancerStrategy.gauge();
        const gaugeContract = await ethers.getContractAt(
            'IBalancerGauge',
            gaugeAddress,
        );
        const lpTokenAddress = await gaugeContract.lp_token();
        const lpTokenContract = await ethers.getContractAt(
            'IComposableStablePool',
            lpTokenAddress,
        );

        await yieldBox.registerAsset(
            1,
            weth.address,
            balancerStrategy.address,
            0,
        );

        const wethStrategyAssetId = await yieldBox.ids(
            1,
            weth.address,
            balancerStrategy.address,
            0,
        );
        const amount = ethers.BigNumber.from((1e18).toString()).mul(10);
        await balancerStrategy.setDepositThreshold(amount.div(10000));

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
            balancerStrategy.address,
        );
        let gaugeBalance = await lpTokenContract.balanceOf(gaugeAddress);
        expect(strategyWethBalance.eq(0)).to.be.true;
        expect(gaugeBalance.gt(0)).to.be.true;

        await timeTravel(100 * 86400);

        await balancerStrategy.compound(false);

        const midGaugeBalance = gaugeBalance;
        strategyWethBalance = await weth.balanceOf(balancerStrategy.address);
        gaugeBalance = await lpTokenContract.balanceOf(gaugeAddress);
        expect(strategyWethBalance.gt(0)).to.be.true;
        expect(gaugeBalance.eq(midGaugeBalance)).to.be.true;

        await timeTravel(100 * 86400);

        await balancerStrategy.compound(true);

        const prevGaugeBalance = gaugeBalance;
        strategyWethBalance = await weth.balanceOf(balancerStrategy.address);
        gaugeBalance = await lpTokenContract.balanceOf(gaugeAddress);
        expect(strategyWethBalance.eq(0)).to.be.true;
        expect(gaugeBalance.gt(prevGaugeBalance)).to.be.true;
    });
});

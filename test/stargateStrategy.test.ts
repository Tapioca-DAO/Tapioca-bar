import { expect } from 'chai';
import { ethers } from 'hardhat';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('StargateStrategy test', () => {
    it('should test initial strategy values', async () => {
        const { stargateStrategy, weth, yieldBox } = await loadFixture(
            register,
        );

        const name = await stargateStrategy.name();
        const description = await stargateStrategy.description();

        expect(name).eq('Stargate');
        expect(description).eq('Stargate strategy for wrapped native assets');

        const contractAddress = await stargateStrategy.contractAddress();
        expect(contractAddress.toLowerCase()).eq(weth.address.toLowerCase());

        const routerEth = await stargateStrategy.addLiquidityRouter();
        expect(routerEth).to.not.eq(ethers.constants.AddressZero);

        const router = await stargateStrategy.router();
        expect(router).to.not.eq(ethers.constants.AddressZero);

        const lpStaking = await stargateStrategy.lpStaking();
        expect(lpStaking).to.not.eq(ethers.constants.AddressZero);

        const yieldBoxAddress = await stargateStrategy.yieldBox();
        expect(yieldBoxAddress.toLowerCase()).to.eq(
            yieldBox.address.toLowerCase(),
        );

        const currentBalance = await stargateStrategy.currentBalance();
        expect(currentBalance.eq(0)).to.be.true;

        const queued = await weth.balanceOf(stargateStrategy.address);
        expect(queued.eq(0)).to.be.true;
    });

    it('should allow setting the deposit threshold', async () => {
        const { stargateStrategy, weth, yieldBox } = await loadFixture(
            register,
        );

        const currentThreshold = await stargateStrategy.depositThreshold();

        const newThreshold = ethers.BigNumber.from((1e18).toString()).mul(10);
        await stargateStrategy.setDepositThreshold(newThreshold);

        const finalThreshold = await stargateStrategy.depositThreshold();

        expect(currentThreshold).to.not.eq(finalThreshold);
    });

    it('should queue and deposit when threshold is met', async () => {
        const { stargateStrategy, weth, wethAssetId, yieldBox, deployer } =
            await loadFixture(register);

        const routerEth = await stargateStrategy.addLiquidityRouter();
        const lpStakingContract = await ethers.getContractAt(
            'ILPStaking',
            await stargateStrategy.lpStaking(),
        );

        const poolInfo = await lpStakingContract.poolInfo(
            await stargateStrategy.lpStakingPid(),
        );
        const lpToken = await ethers.getContractAt('IOFT', poolInfo[0]);

        await yieldBox.registerAsset(
            1,
            weth.address,
            stargateStrategy.address,
            0,
        );

        const wethStrategyAssetId = await yieldBox.ids(
            1,
            weth.address,
            stargateStrategy.address,
            0,
        );

        const amount = ethers.BigNumber.from((1e18).toString()).mul(1);
        await stargateStrategy.setDepositThreshold(amount.mul(3));

        await deployer.sendTransaction({
            to: weth.address,
            value: amount.mul(5),
        });
        await deployer.sendTransaction({
            to: routerEth,
            value: amount.mul(5),
        });

        await weth.freeMint(amount.mul(4));
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
            stargateStrategy.address,
        );

        let lpStakingBalance = await lpToken.balanceOf(
            await stargateStrategy.lpStaking(),
        );
        expect(strategyWethBalance.gt(0)).to.be.true;
        expect(lpStakingBalance.eq(0)).to.be.true;
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
            share,
        );
        strategyWethBalance = await weth.balanceOf(stargateStrategy.address);

        lpStakingBalance = await lpToken.balanceOf(
            await stargateStrategy.lpStaking(),
        );
        expect(strategyWethBalance.eq(0)).to.be.true;
        expect(lpStakingBalance.gt(0)).to.be.true;
    });

    it('should allow deposits and withdrawals', async () => {
        const { stargateStrategy, weth, wethAssetId, yieldBox, deployer } =
            await loadFixture(register);
        const routerEth = await stargateStrategy.addLiquidityRouter();
        const router = await stargateStrategy.router();
        const lpStakingContract = await ethers.getContractAt(
            'ILPStaking',
            await stargateStrategy.lpStaking(),
        );

        const poolInfo = await lpStakingContract.poolInfo(
            await stargateStrategy.lpStakingPid(),
        );
        const lpToken = await ethers.getContractAt('IOFT', poolInfo[0]);

        await yieldBox.registerAsset(
            1,
            weth.address,
            stargateStrategy.address,
            0,
        );

        const wethStrategyAssetId = await yieldBox.ids(
            1,
            weth.address,
            stargateStrategy.address,
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
            stargateStrategy.address.toLowerCase(),
        );
        expect(assetInfo.tokenId).to.eq(0);

        const amount = ethers.BigNumber.from((1e18).toString()).mul(10);

        await deployer.sendTransaction({
            to: weth.address,
            value: amount,
        });
        await deployer.sendTransaction({
            to: router,
            value: amount,
        });

        await weth.freeMint(amount);
        await weth.freeMint(amount);
        await weth.transfer(routerEth, amount);

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
            stargateStrategy.address,
        );

        let lpStakingBalance = await lpToken.balanceOf(
            await stargateStrategy.lpStaking(),
        );
        expect(strategyWethBalance.eq(0)).to.be.true;
        expect(lpStakingBalance.gt(0)).to.be.true;

        const stakedAmount = await weth.balanceOf(lpStakingContract.address);
        share = await yieldBox.toShare(wethStrategyAssetId, stakedAmount, false);
        await yieldBox.withdraw(
            wethStrategyAssetId,
            deployer.address,
            deployer.address,
            0,
            share,
        );
        strategyWethBalance = await weth.balanceOf(stargateStrategy.address);
        expect(strategyWethBalance.eq(0)).to.be.true;
    });

    it('should withdraw from queue', async () => {
        const { stargateStrategy, weth, wethAssetId, yieldBox, deployer } =
            await loadFixture(register);

        const routerEth = await stargateStrategy.addLiquidityRouter();
        const router = await stargateStrategy.router();
        const lpStakingContract = await ethers.getContractAt(
            'ILPStaking',
            await stargateStrategy.lpStaking(),
        );

        const poolInfo = await lpStakingContract.poolInfo(
            await stargateStrategy.lpStakingPid(),
        );
        const lpToken = await ethers.getContractAt('IOFT', poolInfo[0]);

        await yieldBox.registerAsset(
            1,
            weth.address,
            stargateStrategy.address,
            0,
        );

        const wethStrategyAssetId = await yieldBox.ids(
            1,
            weth.address,
            stargateStrategy.address,
            0,
        );
        const amount = ethers.BigNumber.from((1e18).toString()).mul(10);
        await deployer.sendTransaction({
            to: weth.address,
            value: amount,
        });
        await deployer.sendTransaction({
            to: router,
            value: amount,
        });

        await stargateStrategy.setDepositThreshold(amount.mul(3));

        await weth.freeMint(amount.mul(10));
        await weth.freeMint(amount.mul(10));
        await weth.transfer(routerEth, amount.mul(10));

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
            stargateStrategy.address,
        );

        let lpStakingBalance = await lpToken.balanceOf(
            await stargateStrategy.lpStaking(),
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

        strategyWethBalance = await weth.balanceOf(stargateStrategy.address);
        lpStakingBalance = await lpToken.balanceOf(
            await stargateStrategy.lpStaking(),
        );
        expect(strategyWethBalance.eq(0)).to.be.true;
        expect(lpStakingBalance.eq(0)).to.be.true;
    });
});

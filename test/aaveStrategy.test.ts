import { expect } from 'chai';
import { ethers } from 'hardhat';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('AaveStrategy test', () => {
    it("should test initial strategy values", async () => {
        const { aaveStrategy, weth, yieldBox } = await loadFixture(register);

        const name = await aaveStrategy.name();
        const description = await aaveStrategy.description();

        expect(name).eq("AAVE");
        expect(description).eq('AAVE strategy for wrapped native assets');

        const contractAddress = await aaveStrategy.contractAddress();
        expect(contractAddress.toLowerCase()).eq(weth.address.toLowerCase());

        const lendingPoolAddress = await aaveStrategy.lendingPool();
        expect(lendingPoolAddress).to.not.eq(ethers.constants.AddressZero);

        const yieldBoxAddress = await aaveStrategy.yieldBox();
        expect(yieldBoxAddress.toLowerCase()).to.eq(yieldBox.address.toLowerCase());

        const currentBalance = await aaveStrategy.currentBalance();
        expect(currentBalance.eq(0)).to.be.true;

        const queued = await weth.balanceOf(aaveStrategy.address);
        expect(queued.eq(0)).to.be.true;
    });

    it("should allow setting the deposit threshold", async () => {
        const { aaveStrategy, weth, yieldBox } = await loadFixture(register);

        const currentThreshold = await aaveStrategy.depositThreshold();

        const newThreshold = ethers.BigNumber.from((1e18).toString()).mul(10);
        await aaveStrategy.setDepositThreshold(newThreshold)

        const finalThreshold = await aaveStrategy.depositThreshold();

        expect(currentThreshold).to.not.eq(finalThreshold);
    });

    it("should queue and deposit when threshold is met", async () => {
        const { aaveStrategy, weth, wethAssetId, yieldBox, deployer } = await loadFixture(register);
        await yieldBox.registerAsset(1, weth.address, aaveStrategy.address, 0);

        const wethAaveStrategyAssetId = await yieldBox.ids(
            1,
            weth.address,
            aaveStrategy.address,
            0,
        );
        const amount = ethers.BigNumber.from((1e18).toString()).mul(10);
        await aaveStrategy.setDepositThreshold(amount.mul(3));

        await weth.freeMint(amount.mul(10));
        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);

        let share = await yieldBox.toShare(
            wethAaveStrategyAssetId,
            amount,
            false,
        );
        await yieldBox.depositAsset(
            wethAaveStrategyAssetId,
            deployer.address,
            deployer.address,
            0,
            share,
        );

        let aaveStrategyWethBalance = await weth.balanceOf(aaveStrategy.address);
        let aaveLendingPoolBalance = await weth.balanceOf(await aaveStrategy.lendingPool());
        expect(aaveStrategyWethBalance.gt(0)).to.be.true;
        expect(aaveLendingPoolBalance.eq(0)).to.be.true;
        share = await yieldBox.toShare(
            wethAaveStrategyAssetId,
            amount.mul(3),
            false,
        );
        await yieldBox.depositAsset(
            wethAaveStrategyAssetId,
            deployer.address,
            deployer.address,
            0,
            share.mul(3),
        );
        aaveStrategyWethBalance = await weth.balanceOf(aaveStrategy.address);
        aaveLendingPoolBalance = await weth.balanceOf(await aaveStrategy.lendingPool());
        expect(aaveStrategyWethBalance.eq(0)).to.be.true;
        expect(aaveLendingPoolBalance.gt(0)).to.be.true;
    })
    it("should allow deposits and withdrawals", async () => {
        const { aaveStrategy, weth, wethAssetId, yieldBox, deployer } = await loadFixture(register);

        await yieldBox.registerAsset(1, weth.address, aaveStrategy.address, 0);

        const wethAaveStrategyAssetId = await yieldBox.ids(
            1,
            weth.address,
            aaveStrategy.address,
            0,
        );
        expect(wethAaveStrategyAssetId).to.not.eq(wethAssetId);
        const assetsCount = await yieldBox.assetCount();
        const assetInfo = await yieldBox.assets(assetsCount.sub(1));
        expect(assetInfo.tokenType).to.eq(1);
        expect(assetInfo.contractAddress.toLowerCase()).to.eq(weth.address.toLowerCase());
        expect(assetInfo.strategy.toLowerCase()).to.eq(aaveStrategy.address.toLowerCase());
        expect(assetInfo.tokenId).to.eq(0);

        const amount = ethers.BigNumber.from((1e18).toString()).mul(10);
        await weth.freeMint(amount);

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);

        const share = await yieldBox.toShare(
            wethAaveStrategyAssetId,
            amount,
            false,
        );
        await yieldBox.depositAsset(
            wethAaveStrategyAssetId,
            deployer.address,
            deployer.address,
            0,
            share,
        );

        const aaveStrategyWethBalance = await weth.balanceOf(aaveStrategy.address);
        const aaveLendingPoolBalance = await weth.balanceOf(await aaveStrategy.lendingPool());
        expect(aaveStrategyWethBalance.eq(0)).to.be.true;
        expect(aaveLendingPoolBalance.eq(amount)).to.be.true;

        await yieldBox.withdraw(wethAaveStrategyAssetId, deployer.address, deployer.address, 0, share);
        const aaveLendingFinalPoolBalance = await weth.balanceOf(await aaveStrategy.lendingPool());
        expect(aaveLendingFinalPoolBalance.eq(0)).to.be.true;
    });

    it("should withdraw from queue", async () => {
        const { aaveStrategy, weth, wethAssetId, yieldBox, deployer } = await loadFixture(register);
        await yieldBox.registerAsset(1, weth.address, aaveStrategy.address, 0);

        const wethAaveStrategyAssetId = await yieldBox.ids(
            1,
            weth.address,
            aaveStrategy.address,
            0,
        );
        const amount = ethers.BigNumber.from((1e18).toString()).mul(10);
        await aaveStrategy.setDepositThreshold(amount.mul(3));

        await weth.freeMint(amount.mul(10));
        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);

        let share = await yieldBox.toShare(
            wethAaveStrategyAssetId,
            amount,
            false,
        );
        await yieldBox.depositAsset(
            wethAaveStrategyAssetId,
            deployer.address,
            deployer.address,
            0,
            share,
        );

        let aaveStrategyWethBalance = await weth.balanceOf(aaveStrategy.address);
        let aaveLendingPoolBalance = await weth.balanceOf(await aaveStrategy.lendingPool());
        expect(aaveStrategyWethBalance.gt(0)).to.be.true;
        expect(aaveLendingPoolBalance.eq(0)).to.be.true;

        await yieldBox.withdraw(wethAaveStrategyAssetId, deployer.address, deployer.address, 0, share);

        aaveStrategyWethBalance = await weth.balanceOf(aaveStrategy.address);
        aaveLendingPoolBalance = await weth.balanceOf(await aaveStrategy.lendingPool());
        expect(aaveStrategyWethBalance.eq(0)).to.be.true;
        expect(aaveLendingPoolBalance.eq(0)).to.be.true;

    })
});
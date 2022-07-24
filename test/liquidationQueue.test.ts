import hh, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';

describe('LiquidationQueue test', () => {
    it('should throw if premium too high or amount too low', async () => {
        const { liquidationQueue, deployer } = await register();

        await expect(
            liquidationQueue.bid(deployer.address, 40, 1),
        ).to.be.revertedWith('LQ: premium too high');

        await expect(
            liquidationQueue.bid(deployer.address, 10, 1),
        ).to.be.revertedWith('LQ: bid too low');
    });

    it('Should make a bid', async () => {
        const { liquidationQueue, deployer, weth, LQ_META, bar, yieldBox } =
            await register();

        const POOL = 10;

        await (await weth.freeMint(LQ_META.minBidAmount)).wait();
        await (
            await weth.approve(yieldBox.address, LQ_META.minBidAmount)
        ).wait();
        await yieldBox.depositAsset(
            await liquidationQueue.lqAssetId(),
            deployer.address,
            deployer.address,
            LQ_META.minBidAmount,
            0,
        );

        await yieldBox.setApprovalForAll(liquidationQueue.address, true);
        await expect(
            liquidationQueue.bid(deployer.address, POOL, LQ_META.minBidAmount),
        ).to.emit(liquidationQueue, 'Bid');

        expect(
            (await liquidationQueue.bidPools(POOL, deployer.address)).amount,
        ).to.equal(LQ_META.minBidAmount);
    });

    it('Should make a bid, wait 10min and activate it', async () => {
        const { liquidationQueue, deployer, weth, LQ_META, bar, yieldBox } =
            await register();

        const POOL = 10;

        // Bid
        await (await weth.freeMint(LQ_META.minBidAmount)).wait();
        await (
            await weth.approve(yieldBox.address, LQ_META.minBidAmount)
        ).wait();
        await yieldBox.depositAsset(
            await liquidationQueue.lqAssetId(),
            deployer.address,
            deployer.address,
            LQ_META.minBidAmount,
            0,
        );
        await yieldBox.setApprovalForAll(liquidationQueue.address, true);
        await liquidationQueue.bid(
            deployer.address,
            POOL,
            LQ_META.minBidAmount,
        );

        // Require bid activation after 10min
        await expect(
            liquidationQueue.activateBid(deployer.address, POOL),
        ).to.be.revertedWith('LQ: too soon');

        // Wait 10min
        await hh.network.provider.send('evm_increaseTime', [10_000]);
        await hh.network.provider.send('evm_mine');

        // Activate bid
        await expect(
            liquidationQueue.activateBid(deployer.address, POOL),
        ).to.emit(liquidationQueue, 'ActivateBid');

        // Check for deleted bid pool entry queue
        expect(
            (await liquidationQueue.bidPools(POOL, deployer.address)).amount,
        ).to.be.eq(0);

        // Check for order book entry addition record
        const lastAdditionIdx = await liquidationQueue.orderBookInfos(POOL);
        const entry = await liquidationQueue.orderBookEntries(
            POOL,
            lastAdditionIdx.nextBidPush - 1,
        );

        expect(
            entry.bidder.toLowerCase() === deployer.address.toLowerCase() &&
                entry.bidInfo.amount.eq(LQ_META.minBidAmount),
        ).to.be.true;

        // Check order pool info update
        const poolInfo = await liquidationQueue.orderBookInfos(POOL);
        expect(poolInfo.nextBidPush).to.be.eq(1);
    });

    it('Should remove an inactivated bid', async () => {
        const { liquidationQueue, deployer, weth, LQ_META, bar, yieldBox } =
            await register();

        const POOL = 10;
        const lqAssetId = await liquidationQueue.lqAssetId();

        // Bid
        await (await weth.freeMint(LQ_META.minBidAmount)).wait();
        await (
            await weth.approve(yieldBox.address, LQ_META.minBidAmount)
        ).wait();
        await yieldBox.depositAsset(
            lqAssetId,
            deployer.address,
            deployer.address,
            LQ_META.minBidAmount,
            0,
        );
        await yieldBox.setApprovalForAll(liquidationQueue.address, true);
        await liquidationQueue.bid(
            deployer.address,
            POOL,
            LQ_META.minBidAmount,
        );

        await expect(
            liquidationQueue.removeInactivatedBid(deployer.address, POOL),
        ).to.emit(liquidationQueue, 'RemoveBid');

        // Check for deleted bid pool entry queue
        expect(
            (await liquidationQueue.bidPools(POOL, deployer.address)).amount,
        ).to.be.eq(0);

        // Check for fund return
        expect(
            await yieldBox.toAmount(
                lqAssetId,
                await yieldBox.balanceOf(deployer.address, lqAssetId),
                false,
            ),
        ).to.be.eq(LQ_META.minBidAmount);
    });

    it('Should remove an activated bid', async () => {
        const { liquidationQueue, deployer, weth, LQ_META, bar, yieldBox } =
            await register();

        const POOL = 10;
        const lqAssetId = await liquidationQueue.lqAssetId();

        // Bid and activate
        await (await weth.freeMint(LQ_META.minBidAmount)).wait();
        await (
            await weth.approve(yieldBox.address, LQ_META.minBidAmount)
        ).wait();

        await yieldBox.depositAsset(
            lqAssetId,
            deployer.address,
            deployer.address,
            LQ_META.minBidAmount,
            0,
        );
        await yieldBox.setApprovalForAll(liquidationQueue.address, true);
        await liquidationQueue.bid(
            deployer.address,
            POOL,
            LQ_META.minBidAmount,
        );
        await hh.network.provider.send('evm_increaseTime', [10_000]);
        await hh.network.provider.send('evm_mine');
        await liquidationQueue.activateBid(deployer.address, POOL);

        const bidIndexLen = await liquidationQueue.userBidIndexLength(
            deployer.address,
            POOL,
        );

        await expect(
            liquidationQueue.removeBid(
                deployer.address,
                POOL,
                bidIndexLen.sub(1),
            ),
        ).to.emit(liquidationQueue, 'RemoveBid');

        // Check for deleted bid pool entry queue
        expect(
            (await liquidationQueue.bidPools(POOL, deployer.address)).amount,
        ).to.be.eq(0);

        // Check for fund return
        expect(
            await yieldBox.toAmount(
                lqAssetId,
                await yieldBox.balanceOf(deployer.address, lqAssetId),
                false,
            ),
        ).to.be.eq(LQ_META.minBidAmount);
    });

    it.only('Should execute bids', async () => {
        const {
            deployer,
            eoa1,
            feeCollector,
            __wethUsdcPrice,
            liquidationQueue,
            LQ_META,
            weth,
            usdc,
            bar,
            yieldBox,
            wethUsdcMixologist,
            wethUsdcOracle,
            multiSwapper,
            BN,
        } = await register();

        const POOL = 5;
        const marketAssetId = await wethUsdcMixologist.assetId();
        const marketColId = await wethUsdcMixologist.collateralId();
        const lqAssetId = await liquidationQueue.lqAssetId();

        // Bid and activate
        await (await weth.freeMint(LQ_META.minBidAmount.mul(100))).wait();
        await (
            await weth.approve(yieldBox.address, LQ_META.minBidAmount.mul(100))
        ).wait();
        await yieldBox.depositAsset(
            lqAssetId,
            deployer.address,
            deployer.address,
            LQ_META.minBidAmount.mul(100),
            0,
        );
        await yieldBox.setApprovalForAll(liquidationQueue.address, true);
        await liquidationQueue.bid(
            deployer.address,
            POOL,
            LQ_META.minBidAmount.mul(100),
        );
        await hh.network.provider.send('evm_increaseTime', [10_000]);
        await hh.network.provider.send('evm_mine');
        await liquidationQueue.activateBid(deployer.address, POOL);

        // Mint some weth to deposit as asset with EOA1
        const wethAmount = BN(1e18).mul(100);
        await weth.connect(eoa1).freeMint(wethAmount);
        await weth.connect(eoa1).approve(yieldBox.address, wethAmount);

        await yieldBox
            .connect(eoa1)
            .depositAsset(
                marketAssetId,
                eoa1.address,
                eoa1.address,
                wethAmount,
                0,
            );

        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethUsdcMixologist.address, true);
        await wethUsdcMixologist
            .connect(eoa1)
            .addAsset(
                eoa1.address,
                false,
                await yieldBox.toShare(marketAssetId, wethAmount, false),
            );

        // Mint some usdc to deposit as collateral and borrow with deployer
        const usdcAmount = wethAmount.mul(__wethUsdcPrice.div(BN(1e18)));
        const borrowAmount = usdcAmount
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div(BN(1e18)));

        await usdc.freeMint(usdcAmount);
        await usdc.approve(yieldBox.address, usdcAmount);
        await yieldBox.depositAsset(
            marketColId,
            deployer.address,
            deployer.address,
            usdcAmount,
            0,
        );
        await yieldBox.setApprovalForAll(wethUsdcMixologist.address, true);
        await wethUsdcMixologist.addCollateral(
            deployer.address,
            false,
            await yieldBox.toShare(marketColId, usdcAmount, false),
        );
        await wethUsdcMixologist.borrow(deployer.address, borrowAmount);

        // Try to liquidate but with failure since price hasn't changed
        await expect(
            wethUsdcMixologist.liquidate(
                [deployer.address],
                [await wethUsdcMixologist.userBorrowPart(deployer.address)],
                ethers.constants.AddressZero,
            ),
        ).to.be.revertedWith('Mx: all are solvent');

        // Make some price movement and liquidate
        const priceDrop = __wethUsdcPrice.mul(5).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
        await wethUsdcMixologist.updateExchangeRate();

        await expect(
            wethUsdcMixologist.liquidate(
                [deployer.address],
                [await wethUsdcMixologist.userBorrowPart(deployer.address)],
                multiSwapper.address,
            ),
        ).to.not.be.reverted;

        await expect(
            wethUsdcMixologist.liquidate(
                [deployer.address],
                [await wethUsdcMixologist.userBorrowPart(deployer.address)],
                multiSwapper.address,
            ),
        ).to.be.revertedWith('Mx: all are solvent');

        // Check that LQ balances has been added
        expect(await liquidationQueue.balancesDue(deployer.address)).to.not.eq(
            0,
        );
        await liquidationQueue.redeem(feeCollector.address);
        // Check LQ fees has been added after withdrawal
        expect(
            await liquidationQueue.balancesDue(feeCollector.address),
        ).to.not.eq(0);
    });
});

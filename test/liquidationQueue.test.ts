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
        const { liquidationQueue, deployer, weth, LQ_META, bar } =
            await register();

        const POOL = 10;

        await (await weth.freeMint(LQ_META.minBidAmount)).wait();
        await (await weth.approve(bar.address, LQ_META.minBidAmount)).wait();
        await bar['deposit(uint256,address,address,uint256,uint256)'](
            await liquidationQueue.lqAssetId(),
            deployer.address,
            deployer.address,
            LQ_META.minBidAmount,
            0,
        );

        await bar.setApprovalForAll(liquidationQueue.address, true);
        await expect(
            liquidationQueue.bid(deployer.address, POOL, LQ_META.minBidAmount),
        ).to.emit(liquidationQueue, 'Bid');

        expect(
            (await liquidationQueue.bidPools(POOL, deployer.address)).amount,
        ).to.equal(LQ_META.minBidAmount);
    });

    it('Should make a bid, wait 10min and activate it', async () => {
        const { liquidationQueue, deployer, weth, LQ_META, bar } =
            await register();

        const POOL = 10;

        // Bid
        await (await weth.freeMint(LQ_META.minBidAmount)).wait();
        await (await weth.approve(bar.address, LQ_META.minBidAmount)).wait();
        await bar['deposit(uint256,address,address,uint256,uint256)'](
            await liquidationQueue.lqAssetId(),
            deployer.address,
            deployer.address,
            LQ_META.minBidAmount,
            0,
        );
        await bar.setApprovalForAll(liquidationQueue.address, true);
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
        const { liquidationQueue, deployer, weth, LQ_META, bar } =
            await register();

        const POOL = 10;
        const lqAssetId = await liquidationQueue.lqAssetId();

        // Bid
        await (await weth.freeMint(LQ_META.minBidAmount)).wait();
        await (await weth.approve(bar.address, LQ_META.minBidAmount)).wait();
        await bar['deposit(uint256,address,address,uint256,uint256)'](
            lqAssetId,
            deployer.address,
            deployer.address,
            LQ_META.minBidAmount,
            0,
        );
        await bar.setApprovalForAll(liquidationQueue.address, true);
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
            await bar.toAmount(
                lqAssetId,
                await bar.balanceOf(deployer.address, lqAssetId),
                false,
            ),
        ).to.be.eq(LQ_META.minBidAmount);
    });

    it('Should remove an activated bid', async () => {
        const { liquidationQueue, deployer, weth, LQ_META, bar } =
            await register();

        const POOL = 10;
        const lqAssetId = await liquidationQueue.lqAssetId();

        // Bid and activate
        await (await weth.freeMint(LQ_META.minBidAmount)).wait();
        await (await weth.approve(bar.address, LQ_META.minBidAmount)).wait();
        await bar['deposit(uint256,address,address,uint256,uint256)'](
            lqAssetId,
            deployer.address,
            deployer.address,
            LQ_META.minBidAmount,
            0,
        );
        await bar.setApprovalForAll(liquidationQueue.address, true);
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
            await bar.toAmount(
                lqAssetId,
                await bar.balanceOf(deployer.address, lqAssetId),
                false,
            ),
        ).to.be.eq(LQ_META.minBidAmount);
    });

    it('Should execute bids', async () => {
        const {
            deployer,
            eoa1,
            __wethUsdcPrice,
            liquidationQueue,
            LQ_META,
            weth,
            usdc,
            bar,
            wethUsdcMixologist,
            wethUsdcOracle,
            multiSwapper,
            BN,
        } = await register();

        const POOL = 10;
        const marketAssetId = await wethUsdcMixologist.assetId();
        const marketColId = await wethUsdcMixologist.collateralId();
        const lqAssetId = await liquidationQueue.lqAssetId();

        // Bid and activate
        await (await weth.freeMint(LQ_META.minBidAmount.mul(100))).wait();
        await (
            await weth.approve(bar.address, LQ_META.minBidAmount.mul(100))
        ).wait();
        await bar['deposit(uint256,address,address,uint256,uint256)'](
            lqAssetId,
            deployer.address,
            deployer.address,
            LQ_META.minBidAmount.mul(100),
            0,
        );
        await bar.setApprovalForAll(liquidationQueue.address, true);
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
        await weth.connect(eoa1).approve(bar.address, wethAmount);
        await bar
            .connect(eoa1)
            ['deposit(uint256,address,address,uint256,uint256)'](
                marketAssetId,
                eoa1.address,
                eoa1.address,
                wethAmount,
                0,
            );
        await bar
            .connect(eoa1)
            .setApprovalForAll(wethUsdcMixologist.address, true);
        await wethUsdcMixologist
            .connect(eoa1)
            .addAsset(
                eoa1.address,
                false,
                await bar.toShare(marketAssetId, wethAmount, false),
            );

        // Mint some usdc to deposit as collateral and borrow with deployer
        const usdcAmount = wethAmount.mul(__wethUsdcPrice.div(BN(1e18)));
        const borrowAmount = usdcAmount
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div(BN(1e18)));

        await usdc.freeMint(usdcAmount);
        await usdc.approve(bar.address, usdcAmount);
        await bar['deposit(uint256,address,address,uint256,uint256)'](
            marketColId,
            deployer.address,
            deployer.address,
            usdcAmount,
            0,
        );
        await bar.setApprovalForAll(wethUsdcMixologist.address, true);
        await wethUsdcMixologist.addCollateral(
            deployer.address,
            false,
            await bar.toShare(marketColId, usdcAmount, false),
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
        const priceDrop = __wethUsdcPrice.mul(10).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
        await wethUsdcMixologist.updateExchangeRate();

        await wethUsdcMixologist.liquidate(
            [deployer.address],
            [await wethUsdcMixologist.userBorrowPart(deployer.address)],
            multiSwapper.address,
        );

        await expect(
            wethUsdcMixologist.liquidate(
                [deployer.address],
                [await wethUsdcMixologist.userBorrowPart(deployer.address)],
                multiSwapper.address,
            ),
        ).to.not.be.reverted;

        // Check that LQ balances has been added
        expect(await liquidationQueue.balancesDue(deployer.address)).to.not.eq(
            0,
        );
    });
});

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
});

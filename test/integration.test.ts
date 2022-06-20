import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { LiquidationQueue } from '../typechain';

describe('LiquidationQueue integration test', () => {
    it('should allow bidding flow', async () => {
        const accounts = await ethers.getSigners();
        const { yieldBox, liquidationQueue, weth, LQ_META, BN, jumpTime } =
            await register();
        const POOL = 1;
        const assetId = await liquidationQueue.lqAssetId();

        for (let i = 0; i < accounts.length; i++) {
            // deposit yieldBox
            await weth.connect(accounts[i]).freeMint(LQ_META.minBidAmount);
            await weth
                .connect(accounts[i])
                .approve(yieldBox.address, LQ_META.minBidAmount);
            await yieldBox
                .connect(accounts[i])
                .depositAsset(
                    assetId,
                    accounts[i].address,
                    accounts[i].address,
                    LQ_META.minBidAmount,
                    0,
                );

            const initialAccShare = await yieldBox.balanceOf(
                accounts[i].address,
                assetId,
            );
            const initialLQBalance = await yieldBox.balanceOf(
                liquidationQueue.address,
                assetId,
            );

            // bid
            await yieldBox
                .connect(accounts[i])
                .setApprovalForAll(liquidationQueue.address, true);
            await liquidationQueue
                .connect(accounts[i])
                .bid(accounts[i].address, POOL, LQ_META.minBidAmount);

            const finalAccShare = await yieldBox.balanceOf(
                accounts[i].address,
                assetId,
            );
            const finalLQBalance = await yieldBox.balanceOf(
                liquidationQueue.address,
                assetId,
            );

            // Check for transfer of assets
            expect(
                await yieldBox.toAmount(
                    assetId,
                    initialAccShare.sub(finalAccShare),
                    false,
                ),
            ).to.equal(BN(LQ_META.minBidAmount));
            expect(
                await yieldBox.toAmount(
                    assetId,
                    finalLQBalance.sub(initialLQBalance),
                    false,
                ),
            ).to.equal(BN(LQ_META.minBidAmount));
        }

        // removeInactiveBid

        // activate bid after 10min

        // remove bid
    });
});

//

/**
 * external user functions:
 * X bid
 * - activateBid
 * - removeInactiveBid
 * - removeBid
 *
 * - redeem
 * - executeBids
 */

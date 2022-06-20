import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { LiquidationQueue } from '../typechain';

describe('LiquidationQueue integration test', () => {
    it('should allow successful contract interactions', async () => {
        const accounts = await ethers.getSigners();
        const { yieldBox, liquidationQueue, weth, LQ_META, BN, jumpTime } =
            await register();
        const POOL = 1;
        const assetId = await liquidationQueue.lqAssetId();

        for (let i = 0; i < accounts.length; i++) {
            // Deposit yieldBox
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

            // Bid
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

        // Size of user groups
        const groupLength = accounts.length / 4;

        // First group: users periodically remove their inactivated bids
        for (let i = 0; i < groupLength; i++) {
            const initialAccShare = await yieldBox.balanceOf(
                accounts[i].address,
                assetId,
            );
            const initialLQBalance = await yieldBox.balanceOf(
                liquidationQueue.address,
                assetId,
            );

            await liquidationQueue
                .connect(accounts[i])
                .removeInactivatedBid(accounts[i].address, POOL);

            const finalAccShare = await yieldBox.balanceOf(
                accounts[i].address,
                assetId,
            );
            const finalLQBalance = await yieldBox.balanceOf(
                liquidationQueue.address,
                assetId,
            );

            // Check for asset transfer
            expect(
                await yieldBox.toAmount(
                    assetId,
                    finalAccShare.sub(initialAccShare),
                    false,
                ),
            ).to.equal(BN(LQ_META.minBidAmount));
            expect(
                await yieldBox.toAmount(
                    assetId,
                    initialLQBalance.sub(finalLQBalance),
                    false,
                ),
            ).to.equal(BN(LQ_META.minBidAmount));

            // **add interval / timeout
        }

        jumpTime(LQ_META.activationTime);

        // Rest of accounts activate their bid
        for (let i = groupLength; i < accounts.length; i++) {
            await liquidationQueue
                .connect(accounts[i])
                .activateBid(accounts[i].address, POOL);
            // ** add interval / timeout
        }

        // Second group removes their activated bid
        for (let i = groupLength; i < 2 * groupLength; i++) {
            await liquidationQueue
                .connect(accounts[i])
                .removeBid(accounts[i].address, POOL, 1);
            // ** add interval / timeout
            // Check transfer of assets
        }

        // executeBids
        // redeem
    });
});

//

/**
 * external user functions:
 * X bid
 * - activateBid
 * - removeInactivatedBid
 * - removeBid
 *
 * - redeem
 * - executeBids
 */

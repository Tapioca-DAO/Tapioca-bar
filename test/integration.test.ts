import hh, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';

describe('LiquidationQueue integration test', () => {
    it('should allow successful contract interactions', async () => {
        const accounts = await ethers.getSigners();
        const {
            yieldBox,
            liquidationQueue,
            weth,
            usdc,
            __wethUsdcPrice,
            wethUsdcOracle,
            LQ_META,
            wethUsdcMixologist,
            multiSwapper,
            BN,
            jumpTime,
        } = await register();
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
            const initialLQShare = await yieldBox.balanceOf(
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
            const finalLQShare = await yieldBox.balanceOf(
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
                    finalLQShare.sub(initialLQShare),
                    false,
                ),
            ).to.equal(BN(LQ_META.minBidAmount));
        }

        // Size of user groups
        const groupLength = accounts.length / 4;

        // First group: remove their inactivated bids
        for (let i = 0; i < groupLength; i++) {
            const initialAccShare = await yieldBox.balanceOf(
                accounts[i].address,
                assetId,
            );
            const initialLQShare = await yieldBox.balanceOf(
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
            const finalLQShare = await yieldBox.balanceOf(
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
                    initialLQShare.sub(finalLQShare),
                    false,
                ),
            ).to.equal(BN(LQ_META.minBidAmount));
        }

        jumpTime(LQ_META.activationTime);

        // Rest of accounts activate their bid
        for (let i = groupLength; i < accounts.length; i++) {
            await liquidationQueue
                .connect(accounts[i])
                .activateBid(accounts[i].address, POOL);
        }

        // Second group removes their activated bid
        // for (let i = groupLength; i < accounts.length; i++) {
        // for (let i = groupLength; i < groupLength + 2; i++) {
        // const initialAccShare = await yieldBox.balanceOf(
        //     accounts[i].address,
        //     assetId,
        // );
        // const initialLQShare = await yieldBox.balanceOf(
        //     liquidationQueue.address,
        //     assetId,
        // );
        // console.log(
        //     await liquidationQueue.bidPools(POOL, accounts[i].address),
        // );
        // console.log(await liquidationQueue.orderBookEntries(POOL, 0));
        // console.log(await liquidationQueue.orderBookInfos(POOL));
        // console.log(
        //     await liquidationQueue.userBidIndexes(
        //         accounts[i].address,
        //         POOL,
        //         0,
        //     ),
        // );
        // const bidIndexLength = await liquidationQueue
        //     .connect(accounts[i])
        //     .userBidIndexLength(accounts[i].address, POOL);
        // await liquidationQueue
        //     .connect(accounts[i])
        //     .removeBid(accounts[i].address, POOL, bidIndexLength.sub(1));
        // await hh.network.provider.send('evm_mine', []);
        // const finalAccShare = await yieldBox.balanceOf(
        //     accounts[i].address,
        //     assetId,
        // );
        // const finalLQShare = await yieldBox.balanceOf(
        //     liquidationQueue.address,
        //     assetId,
        // );
        // Check transfer of assets
        // expect(
        //     await yieldBox.toAmount(
        //         assetId,
        //         finalAccShare.sub(initialAccShare),
        //         false,
        //     ),
        // ).to.equal(BN(LQ_META.minBidAmount));
        // expect(
        //     await yieldBox.toAmount(
        //         assetId,
        //         initialLQShare.sub(finalLQShare),
        //         false,
        //     ),
        // ).to.equal(BN(LQ_META.minBidAmount));
        // }

        // First group: lends their assets
        for (let i = 0; i < groupLength; i++) {
            await yieldBox
                .connect(accounts[i])
                .setApprovalForAll(wethUsdcMixologist.address, true);
            await wethUsdcMixologist
                .connect(accounts[i])
                .addAsset(
                    accounts[i].address,
                    false,
                    await yieldBox.toShare(
                        assetId,
                        BN(LQ_META.minBidAmount),
                        false,
                    ),
                );
        }

        const marketColId = await wethUsdcMixologist.collateralId();
        // Second group: borrow assets
        for (let i = groupLength; i < 2 * groupLength; i++) {
            // add collateral asset
            const usdcAmount = LQ_META.minBidAmount.mul(
                __wethUsdcPrice.div(BN(1e18)),
            );
            await usdc.connect(accounts[i]).freeMint(usdcAmount);
            await usdc
                .connect(accounts[i])
                .approve(yieldBox.address, usdcAmount);
            await yieldBox
                .connect(accounts[i])
                .depositAsset(
                    marketColId,
                    accounts[i].address,
                    accounts[i].address,
                    usdcAmount,
                    0,
                );
            await yieldBox
                .connect(accounts[i])
                .setApprovalForAll(wethUsdcMixologist.address, true);
            await wethUsdcMixologist
                .connect(accounts[i])
                .addCollateral(
                    accounts[i].address,
                    false,
                    await yieldBox.toShare(marketColId, usdcAmount, false),
                );

            // borrow
            const borrowAmount = usdcAmount
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div(BN(1e18)));
            await wethUsdcMixologist
                .connect(accounts[i])
                .borrow(accounts[i].address, borrowAmount);
        }

        // price movement
        const priceDrop = __wethUsdcPrice.mul(5).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
        await wethUsdcMixologist.updateExchangeRate();

        // liquidate the second group debt
        let accountsToLiquidate = [];
        let borrowParts = [];
        for (let i = groupLength; i < 2 * groupLength; i++) {
            accountsToLiquidate.push(accounts[i].address);
            borrowParts.push(
                await wethUsdcMixologist.userBorrowPart(accounts[i].address),
            );
        }
        // check mixologist & yieldBox for asset transfer
        await wethUsdcMixologist.liquidate(
            accountsToLiquidate,
            borrowParts,
            multiSwapper.address,
        );

        // redeem
    });
});

//

/**
 * external user functions:
 * X bid
 * X activateBid
 * X removeInactivatedBid
 * - removeBid - BUG
 * - executeBids
 * - redeem
 */

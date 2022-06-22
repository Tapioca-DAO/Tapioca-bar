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
            deployer,
        } = await register();
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
            const initialLQShare = await yieldBox.balanceOf(
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
            const finalLQShare = await yieldBox.balanceOf(
                liquidationQueue.address,
                assetId,
            );

            // check for transfer of assets
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

        // size of user groups
        const groupLength = accounts.length / 4;

        // first group: remove their inactivated bids
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

            // check for asset transfer
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

        // rest of accounts activate their bid
        for (let i = groupLength; i < accounts.length; i++) {
            await liquidationQueue
                .connect(accounts[i])
                .activateBid(accounts[i].address, POOL);
        }

        // second group removes their activated bid
        for (let i = groupLength; i < groupLength * 2; i++) {
            const initialAccShare = await yieldBox.balanceOf(
                accounts[i].address,
                assetId,
            );
            const initialLQShare = await yieldBox.balanceOf(
                liquidationQueue.address,
                assetId,
            );
            // activate bid
            const bidIndexLength = await liquidationQueue
                .connect(accounts[i])
                .userBidIndexLength(accounts[i].address, POOL);
            await liquidationQueue
                .connect(accounts[i])
                .removeBid(accounts[i].address, POOL, bidIndexLength.sub(1));

            const finalAccShare = await yieldBox.balanceOf(
                accounts[i].address,
                assetId,
            );
            const finalLQShare = await yieldBox.balanceOf(
                liquidationQueue.address,
                assetId,
            );
            // Check transfer of assets
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

        const initialShareLQ = await yieldBox.balanceOf(
            liquidationQueue.address,
            assetId,
        );
        const initialShareMixologist = await yieldBox.balanceOf(
            wethUsdcMixologist.address,
            assetId,
        );

        // liquidate the second group debt
        let accountsToLiquidate = [];
        let borrowParts = [];
        for (let i = groupLength; i < 2 * groupLength; i++) {
            accountsToLiquidate.push(accounts[i].address);
            borrowParts.push(
                await wethUsdcMixologist.userBorrowPart(accounts[i].address),
            );
        }
        await wethUsdcMixologist.liquidate(
            accountsToLiquidate,
            borrowParts,
            multiSwapper.address,
        );

        // get the amount of bid executed
        const eventEB = liquidationQueue.filters.ExecuteBids(
            wethUsdcMixologist.address,
            POOL,
        );
        const ifaceLQ = liquidationQueue.interface;
        const eventEBLog = await hh.network.provider.send('eth_getLogs', [
            {
                fromBlock: 'earliest',
                toBlock: 'latest',
                address: liquidationQueue.address,
                topics: eventEB.topics,
            },
        ]);
        const decodedEventEB = ifaceLQ.parseLog(eventEBLog[0]);
        const bidAmountExecuted = decodedEventEB.args.amountExecuted;

        // get the fee sent from the market to the caller of orderBookLiquidation()
        const eventTS = yieldBox.filters.TransferSingle(
            wethUsdcMixologist.address,
            wethUsdcMixologist.address,
            deployer.address,
        );
        const ifaceYB = yieldBox.interface;
        const eventTSLog = await hh.network.provider.send('eth_getLogs', [
            {
                fromBlock: 'earliest',
                toBlock: 'latest',
                address: yieldBox.address,
                topics: eventTS.topics,
            },
        ]);
        const decodedEventTS = ifaceYB.parseLog(eventTSLog[0]);
        const callerShare = decodedEventTS.args._value;

        const finalShareLQ = await yieldBox.balanceOf(
            liquidationQueue.address,
            assetId,
        );
        const finalShareMixologist = await yieldBox.balanceOf(
            wethUsdcMixologist.address,
            assetId,
        );

        // check asset transfer
        expect(initialShareLQ.sub(finalShareLQ)).to.equal(
            await yieldBox.toShare(assetId, bidAmountExecuted, false),
        );

        expect(
            finalShareMixologist.sub(initialShareMixologist.sub(callerShare)),
        ).to.equal(await yieldBox.toShare(assetId, bidAmountExecuted, false));

        // redeem
        for (let i = groupLength * 2; i < accounts.length; i++) {
            const balanceDue = await liquidationQueue.balancesDue(
                accounts[i].address,
            );
            if (balanceDue.gt(0)) {
                const initialShareLQ = await yieldBox.balanceOf(
                    liquidationQueue.address,
                    marketColId,
                );
                const initialShareAccount = await yieldBox.balanceOf(
                    accounts[i].address,
                    marketColId,
                );

                // redeem
                await liquidationQueue
                    .connect(accounts[i])
                    .redeem(accounts[i].address);

                const finalShareLQ = await yieldBox.balanceOf(
                    liquidationQueue.address,
                    marketColId,
                );
                const finalShareAccount = await yieldBox.balanceOf(
                    accounts[i].address,
                    marketColId,
                );

                // get redeemable amount
                const event = liquidationQueue.filters.Redeem(
                    accounts[i].address,
                    accounts[i].address,
                );
                const eventLog = await hh.network.provider.send('eth_getLogs', [
                    {
                        fromBlock: 'earliest',
                        toBlock: 'latest',
                        address: liquidationQueue.address,
                        topics: event.topics,
                    },
                ]);
                const decodedEvent = ifaceLQ.parseLog(eventLog[0]);
                const redeemable = decodedEvent.args.amount;

                // check transfer of assets
                expect(initialShareLQ.sub(finalShareLQ)).to.equal(
                    await yieldBox.toShare(marketColId, redeemable, false),
                );
                expect(finalShareAccount.sub(initialShareAccount)).to.equal(
                    await yieldBox.toShare(marketColId, redeemable, false),
                );
            }
        }
    });
});

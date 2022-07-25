import hh, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

const day = 86400;
const poolId = 1;
describe('Integration tests - LiquidationQueue', async () => {
    it('should do nothing', async () => {
        await expect(true, 'nothing to do here').to.be.true;
    });

    it('should check different flows using the 18 decimals test tokens', async () => {
        let accounts = await ethers.getSigners();
        const {
            yieldBox,
            liquidationQueue,
            wethUsdcMixologist,
            LQ_META,
            weth,
            usdc,
            __wethUsdcPrice,
            jumpTime,
            multiSwapper,
            wethUsdcOracle,
        } = await register();

        const mixologistAssetId = await wethUsdcMixologist.assetId();
        const mixologistCollateralId = await wethUsdcMixologist.collateralId();
        const lqAssetId = await liquidationQueue.lqAssetId();
        expect(lqAssetId, '✖️ Wrong asset id').to.eq(mixologistAssetId);
        expect(lqAssetId, '✖️ Wrong collateral id').to.not.eq(
            mixologistCollateralId,
        );

        const usdcMintVal = LQ_META.defaultBidAmount.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        const usdcDepositVal = LQ_META.minBidAmount.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );

        ///
        /// - get test funds
        ///
        for (let account of accounts) {
            await weth.connect(account).freeMint(LQ_META.defaultBidAmount); //for lending
            await usdc.connect(account).freeMint(usdcMintVal); //for collateral
        }

        const wethBalanceOfFirstAccount = parseFloat(
            ethers.utils.formatEther(await weth.balanceOf(accounts[0].address)),
        );
        const usdcBalanceOfFirstAccount = parseFloat(
            ethers.utils.formatEther(await weth.balanceOf(accounts[0].address)), //seems like the mock version of USDC has 18 decimals instead of 6
        );

        expect(wethBalanceOfFirstAccount, '✖️ WETH minting failed ').to.eq(
            parseFloat(ethers.utils.formatEther(LQ_META.defaultBidAmount)),
        );
        expect(usdcBalanceOfFirstAccount, '✖️ USDC minting failed').to.eq(
            parseFloat(ethers.utils.formatEther(LQ_META.defaultBidAmount)),
        );

        ///
        /// - deposit asset into the YieldBox
        ///
        for (let account of accounts) {
            const beforeDepositAmountOfAccount = await yieldBox.amountOf(
                account.address,
                lqAssetId,
            );
            expect(
                parseFloat(
                    ethers.utils.formatEther(beforeDepositAmountOfAccount),
                ),
                `✖️ Initial amount not right for account ${accounts.indexOf(
                    account,
                )}`,
            ).to.eq(0);

            await expect(
                yieldBox
                    .connect(account)
                    .depositAsset(
                        lqAssetId,
                        account.address,
                        account.address,
                        LQ_META.defaultBidAmount,
                        0,
                    ),
            ).to.be.reverted;

            await weth
                .connect(account)
                .approve(yieldBox.address, LQ_META.defaultBidAmount);

            await expect(
                yieldBox
                    .connect(account)
                    .depositAsset(
                        lqAssetId,
                        account.address,
                        account.address,
                        LQ_META.defaultBidAmount,
                        0,
                    ),
            ).to.emit(yieldBox, 'Deposit');

            const amountOfAccount = await yieldBox.amountOf(
                account.address,
                lqAssetId,
            );
            expect(
                parseFloat(ethers.utils.formatEther(amountOfAccount)),
                `✖️ Amount not right for account ${accounts.indexOf(account)}`,
            ).to.eq(
                parseFloat(ethers.utils.formatEther(LQ_META.defaultBidAmount)),
            );
        }

        ///
        /// - place some bids, try to activate before time and remove inactive
        ///
        for (let account of accounts) {
            await expect(
                liquidationQueue
                    .connect(account)
                    .bid(account.address, poolId, LQ_META.minBidAmount),
            ).to.be.reverted;
            await expect(
                liquidationQueue
                    .connect(account)
                    .removeInactivatedBid(account.address, poolId),
            ).to.be.revertedWith('LQ: bid does not exist');

            await yieldBox
                .connect(account)
                .setApprovalForAll(liquidationQueue.address, true);
            await liquidationQueue
                .connect(account)
                .bid(account.address, poolId, LQ_META.minBidAmount);
            await expect(
                liquidationQueue
                    .connect(account)
                    .activateBid(account.address, poolId),
            ).to.be.revertedWith('LQ: too soon');

            const bidInfo = await liquidationQueue.bidPools(
                poolId,
                account.address,
            );
            expect(
                parseFloat(ethers.utils.formatEther(bidInfo.amount)),
                `✖️ Bid pool amount not right for account ${accounts.indexOf(
                    account,
                )}`,
            ).to.eq(parseFloat(ethers.utils.formatEther(LQ_META.minBidAmount)));

            await liquidationQueue
                .connect(account)
                .removeInactivatedBid(account.address, poolId);
        }

        const firstAccountYieldBoxBalanceBeforeBids = await yieldBox.toAmount(
            lqAssetId,
            await yieldBox.balanceOf(accounts[0].address, lqAssetId),
            false,
        );

        ///
        /// - place some bids, activate them, remove activated bid
        ///
        for (let account of accounts) {
            await expect(
                liquidationQueue
                    .connect(account)
                    .bid(account.address, poolId, LQ_META.minBidAmount),
            ).to.emit(liquidationQueue, 'Bid');
        }
        jumpTime(600); //jump 10 mins to be able to activate bids
        for (let account of accounts) {
            await expect(
                liquidationQueue
                    .connect(account)
                    .activateBid(account.address, poolId),
            ).to.emit(liquidationQueue, 'ActivateBid');

            const bidInfo = await liquidationQueue.bidPools(
                poolId,
                account.address,
            );
            expect(parseFloat(ethers.utils.formatEther(bidInfo.amount))).to.eq(
                0,
            );

            const orderBookInfo = await liquidationQueue.orderBookInfos(poolId);
            const orderBookEntry = await liquidationQueue.orderBookEntries(
                poolId,
                orderBookInfo.nextBidPush - 1,
            );

            expect(
                orderBookEntry.bidder.toLowerCase(),
                `✖️ Bidder address not right for account ${accounts.indexOf(
                    account,
                )}`,
            ).to.eq(account.address.toLowerCase());

            expect(
                parseFloat(
                    ethers.utils.formatEther(orderBookEntry.bidInfo.amount),
                ),
                `✖️ Activated bid amount not right for account ${accounts.indexOf(
                    account,
                )}`,
            ).to.eq(parseFloat(ethers.utils.formatEther(LQ_META.minBidAmount)));
        }

        for (let account of accounts) {
            const userBidsLength = await liquidationQueue
                .connect(account)
                .userBidIndexLength(account.address, poolId);

            await expect(
                liquidationQueue
                    .connect(account)
                    .removeBid(account.address, poolId, userBidsLength.sub(1)),
            ).to.emit(liquidationQueue, 'RemoveBid');

            expect(
                (await liquidationQueue.bidPools(poolId, account.address))
                    .amount,
            ).to.be.eq(0);
        }

        const firstAccountYieldBoxBalanceAfterBids = await yieldBox.toAmount(
            lqAssetId,
            await yieldBox.balanceOf(accounts[0].address, lqAssetId),
            false,
        );
        expect(
            parseFloat(
                ethers.utils.formatEther(firstAccountYieldBoxBalanceBeforeBids),
            ),
            `✖️ Balance not right after removing the active bid`,
        ).to.eq(
            parseFloat(
                ethers.utils.formatEther(firstAccountYieldBoxBalanceAfterBids),
            ),
        );

        //should be 0 as no bid was executed
        const firstUserBalanceDue = await liquidationQueue.balancesDue(
            accounts[0].address,
        );
        expect(firstUserBalanceDue, `✖️ Due for first user not right`).to.eq(0);

        ///
        /// - split accounts into 2 groups (first lends, the 2nd one borrows), place bids, change collateral price, execute bids
        ///
        if (accounts.length > 1) {
            const arrays = splitArray(accounts, 2);
            let firstHalf = arrays[0];
            let secondHalf = arrays[1];

            if (firstHalf.length < secondHalf.length) {
                //make sure there's enough for borrowing
                const temp = firstHalf;
                firstHalf = secondHalf;
                secondHalf = temp;
            }

            //place bids
            for (let account of accounts) {
                await liquidationQueue
                    .connect(account)
                    .bid(account.address, poolId, LQ_META.minBidAmount);
            }
            //jump over the min activation period
            jumpTime(600);
            //activate bids
            for (let account of accounts) {
                await liquidationQueue
                    .connect(account)
                    .activateBid(account.address, poolId);
            }
            //first half lends the asset
            const lendValShare = await yieldBox.toShare(
                mixologistAssetId,
                LQ_META.minBidAmount,
                false,
            );
            for (let account of firstHalf) {
                const mixologistBalanceOfAccountBefore =
                    await wethUsdcMixologist.balanceOf(account.address);
                await expect(
                    mixologistBalanceOfAccountBefore,
                    `✖️ Account ${firstHalf.indexOf(
                        account,
                    )} mixologist balance before is not right`,
                ).to.eq(0);

                await yieldBox
                    .connect(account)
                    .setApprovalForAll(wethUsdcMixologist.address, true);

                await wethUsdcMixologist
                    .connect(account)
                    .addAsset(account.address, false, lendValShare);

                const mixologistBalanceOfAccountAfter =
                    await wethUsdcMixologist.balanceOf(account.address);

                await expect(
                    parseFloat(
                        ethers.utils.formatEther(
                            mixologistBalanceOfAccountAfter,
                        ),
                    ),
                    `✖️ Account ${firstHalf.indexOf(
                        account,
                    )} mixologist balance after lend operation is not right`,
                ).to.eq(parseFloat(ethers.utils.formatEther(lendValShare)));
            }
            //second half borrows
            const borrowVal = usdcDepositVal
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div((1e18).toString())); // We borrow 74% collateral, max is 75%
            for (let account of secondHalf) {
                //we don't use skim; need yieldbox balance
                await usdc
                    .connect(account)
                    .approve(yieldBox.address, usdcDepositVal);
                await yieldBox
                    .connect(account)
                    .depositAsset(
                        mixologistCollateralId,
                        account.address,
                        account.address,
                        usdcDepositVal,
                        0,
                    );
                //register collateral
                await yieldBox
                    .connect(account)
                    .setApprovalForAll(wethUsdcMixologist.address, true);
                const collateralShare = await yieldBox.toShare(
                    mixologistCollateralId,
                    usdcDepositVal,
                    false,
                );
                await wethUsdcMixologist
                    .connect(account)
                    .addCollateral(account.address, false, collateralShare);

                await wethUsdcMixologist
                    .connect(account)
                    .borrow(account.address, borrowVal);

                // Can't liquidate yet
                await expect(
                    wethUsdcMixologist.liquidate(
                        [account.address],
                        [borrowVal],
                        multiSwapper.address,
                    ),
                ).to.be.reverted;
            }

            //simulate a price drop
            const priceDrop = __wethUsdcPrice.mul(2).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));

            //liquidate accounts
            const liqudatableAccounts = secondHalf.map(
                (el: SignerWithAddress) => el.address,
            );
            const liquidatebleAmonts = Array.from(
                { length: liqudatableAccounts.length },
                (_) => borrowVal,
            );

            const shareForCallerBefore = await yieldBox.balanceOf(
                accounts[0].address,
                lqAssetId,
            );

            await wethUsdcMixologist
                .connect(accounts[0])
                .liquidate(
                    liqudatableAccounts,
                    liquidatebleAmonts,
                    multiSwapper.address,
                );
            const shareForCallerAfter = await yieldBox.balanceOf(
                accounts[0].address,
                lqAssetId,
            );

            await expect(
                parseFloat(shareForCallerAfter.toString()),
                `✖️ After liquidation shares not right`,
            ).to.be.greaterThan(parseFloat(shareForCallerBefore.toString()));

            //redeem if everything is left
            for (let account of secondHalf) {
                const dueAmount = await liquidationQueue.balancesDue(
                    account.address,
                );
                if (dueAmount.gt(0)) {
                    const balanceBeforeRedeem = await yieldBox.balanceOf(
                        account.address,
                        mixologistCollateralId,
                    );
                    await expect(
                        liquidationQueue
                            .connect(account)
                            .redeem(account.address),
                    ).to.emit(liquidationQueue, 'Redeem');
                    const balanceAfterRedeem = await yieldBox.balanceOf(
                        account.address,
                        mixologistCollateralId,
                    );
                    await expect(
                        parseFloat(balanceAfterRedeem.toString()),
                        `✖️ After redeem shares not right`,
                    ).to.be.greaterThan(
                        parseFloat(balanceBeforeRedeem.toString()),
                    );
                }
            }
        }
    });
});

//TODO: move to utils if needed in other places
const splitArray = (arr: any, batches: number) => {
    var chunkLength = Math.max(arr.length / batches, 1);
    var chunks = [];
    for (var i = 0; i < batches; i++) {
        if (chunkLength * (i + 1) <= arr.length)
            chunks.push(arr.slice(chunkLength * i, chunkLength * (i + 1)));
    }
    return chunks;
};

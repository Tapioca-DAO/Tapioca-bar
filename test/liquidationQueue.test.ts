import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('LiquidationQueue test', () => {
    it('should throw if premium too high or amount too low', async () => {
        const { liquidationQueue, deployer } = await loadFixture(register);

        await expect(
            liquidationQueue.bid(deployer.address, 40, 1),
        ).to.be.revertedWith('LQ: premium too high');

        await expect(
            liquidationQueue.bid(deployer.address, 10, 1),
        ).to.be.revertedWith('LQ: bid too low');
    });

    it('Should make a bid', async () => {
        const { liquidationQueue, deployer, weth, LQ_META, yieldBox } =
            await loadFixture(register);

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
            (await liquidationQueue.bidPools(POOL, deployer.address))
                .liquidatedAssetAmount,
        ).to.equal(LQ_META.minBidAmount);
    });

    it('Should make a bid, wait 10min and activate it', async () => {
        const {
            liquidationQueue,
            deployer,
            weth,
            LQ_META,
            yieldBox,
            timeTravel,
        } = await loadFixture(register);

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
        await timeTravel(10_000);

        // Activate bid
        await expect(
            liquidationQueue.activateBid(deployer.address, POOL),
        ).to.emit(liquidationQueue, 'ActivateBid');

        // Check for deleted bid pool entry queue
        expect(
            (await liquidationQueue.bidPools(POOL, deployer.address))
                .liquidatedAssetAmount,
        ).to.be.eq(0);

        // Check for order book entry addition record
        const lastAdditionIdx = await liquidationQueue.orderBookInfos(POOL);
        const entry = await liquidationQueue.orderBookEntries(
            POOL,
            lastAdditionIdx.nextBidPush - 1,
        );

        expect(
            entry.bidder.toLowerCase() === deployer.address.toLowerCase() &&
                entry.bidInfo.liquidatedAssetAmount.eq(LQ_META.minBidAmount),
        ).to.be.true;

        // Check order pool info update
        const poolInfo = await liquidationQueue.orderBookInfos(POOL);
        expect(poolInfo.nextBidPush).to.be.eq(1);
    });

    it('Should remove an inactivated bid', async () => {
        const { liquidationQueue, deployer, weth, LQ_META, yieldBox } =
            await loadFixture(register);

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
            (await liquidationQueue.bidPools(POOL, deployer.address))
                .liquidatedAssetAmount,
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
        const {
            liquidationQueue,
            deployer,
            weth,
            LQ_META,
            yieldBox,
            timeTravel,
        } = await loadFixture(register);

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
        await timeTravel(10_000);
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
            (await liquidationQueue.bidPools(POOL, deployer.address))
                .liquidatedAssetAmount,
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

    it('Should execute bids', async () => {
        const {
            deployer,
            eoa1,
            feeCollector,
            __wethUsdcPrice,
            liquidationQueue,
            LQ_META,
            weth,
            usdc,
            yieldBox,
            wethUsdcMixologist,
            wethUsdcOracle,
            multiSwapper,
            BN,
            timeTravel,
        } = await loadFixture(register);

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
        await timeTravel(10_000);
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
            deployer.address,
            false,
            await yieldBox.toShare(marketColId, usdcAmount, false),
        );
        await wethUsdcMixologist.borrow(
            deployer.address,
            deployer.address,
            borrowAmount,
        );

        // Try to liquidate but with failure since price hasn't changed
        const data = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
        await expect(
            wethUsdcMixologist.liquidate(
                [deployer.address],
                [await wethUsdcMixologist.userBorrowPart(deployer.address)],
                ethers.constants.AddressZero,
                data,
                data,
            ),
        ).to.be.revertedWith('Mx: solvent');

        // Make some price movement and liquidate
        const priceDrop = __wethUsdcPrice.mul(5).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
        await wethUsdcMixologist.updateExchangeRate();

        await expect(
            wethUsdcMixologist.liquidate(
                [deployer.address],
                [await wethUsdcMixologist.userBorrowPart(deployer.address)],
                multiSwapper.address,
                data,
                data,
            ),
        ).to.not.be.reverted;

        await expect(
            wethUsdcMixologist.liquidate(
                [deployer.address],
                [await wethUsdcMixologist.userBorrowPart(deployer.address)],
                multiSwapper.address,
                data,
                data,
            ),
        ).to.be.revertedWith('Mx: solvent');

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

    it('should get the market', async () => {
        const { liquidationQueue, wethUsdcMixologist } = await loadFixture(
            register,
        );

        const market = await liquidationQueue.market();
        const mixologistName = await wethUsdcMixologist.name();
        expect(market.length > 0).to.be.true;
        expect(market).to.eq(mixologistName);
    });

    it('should return order book entries', async () => {
        const {
            liquidationQueue,
            weth,
            LQ_META,
            yieldBox,
            deployer,
            timeTravel,
        } = await loadFixture(register);

        const orderBookEntries = await liquidationQueue.getOrderBookPoolEntries(
            0,
        );
        expect(orderBookEntries.length == 0).to.be.true;

        const POOL = 10;

        await (await weth.freeMint(LQ_META.minBidAmount.mul(2))).wait();
        await (
            await weth.approve(yieldBox.address, LQ_META.minBidAmount.mul(2))
        ).wait();
        await yieldBox.depositAsset(
            await liquidationQueue.lqAssetId(),
            deployer.address,
            deployer.address,
            LQ_META.minBidAmount.mul(2),
            0,
        );

        await yieldBox.setApprovalForAll(liquidationQueue.address, true);
        await expect(
            liquidationQueue.bid(deployer.address, POOL, LQ_META.minBidAmount),
        ).to.emit(liquidationQueue, 'Bid');

        await timeTravel(10_000);
        await expect(
            liquidationQueue.activateBid(deployer.address, POOL),
        ).to.emit(liquidationQueue, 'ActivateBid');

        const orderBookEntriesForExistingPool =
            await liquidationQueue.getOrderBookPoolEntries(POOL);
        expect(orderBookEntriesForExistingPool.length > 0).to.be.true;
    });

    it('should bid twice', async () => {
        const {
            liquidationQueue,
            weth,
            LQ_META,
            yieldBox,
            deployer,
            timeTravel,
        } = await loadFixture(register);

        const POOL = 10;

        await (await weth.freeMint(LQ_META.minBidAmount.mul(2))).wait();
        await (
            await weth.approve(yieldBox.address, LQ_META.minBidAmount.mul(2))
        ).wait();
        await yieldBox.depositAsset(
            await liquidationQueue.lqAssetId(),
            deployer.address,
            deployer.address,
            LQ_META.minBidAmount.mul(2),
            0,
        );

        await yieldBox.setApprovalForAll(liquidationQueue.address, true);
        await expect(
            liquidationQueue.bid(deployer.address, POOL, LQ_META.minBidAmount),
        ).to.emit(liquidationQueue, 'Bid');

        await timeTravel(10_000);
        await expect(
            liquidationQueue.activateBid(deployer.address, POOL),
        ).to.emit(liquidationQueue, 'ActivateBid');

        await yieldBox.setApprovalForAll(liquidationQueue.address, true);
        await expect(
            liquidationQueue.bid(deployer.address, POOL, LQ_META.minBidAmount),
        ).to.emit(liquidationQueue, 'Bid');

        await timeTravel(10_000);
        await expect(
            liquidationQueue.activateBid(deployer.address, POOL),
        ).to.emit(liquidationQueue, 'ActivateBid');
    });

    it('should check different flows using the 18 decimals test tokens', async () => {
        const poolId = 1;
        const accounts = await ethers.getSigners();
        const {
            yieldBox,
            liquidationQueue,
            wethUsdcMixologist,
            LQ_META,
            weth,
            usdc,
            __wethUsdcPrice,
            multiSwapper,
            wethUsdcOracle,
            timeTravel,
        } = await loadFixture(register);

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
        for (const account of accounts) {
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
        for (const account of accounts) {
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

            await yieldBox
                .connect(account)
                .depositAsset(
                    lqAssetId,
                    account.address,
                    account.address,
                    LQ_META.defaultBidAmount,
                    0,
                );

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
        for (const account of accounts) {
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
                parseFloat(
                    ethers.utils.formatEther(bidInfo.liquidatedAssetAmount),
                ),
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
        for (const account of accounts) {
            await expect(
                liquidationQueue
                    .connect(account)
                    .bid(account.address, poolId, LQ_META.minBidAmount),
            ).to.emit(liquidationQueue, 'Bid');
        }
        await timeTravel(600); //jump 10 mins to be able to activate bids
        for (const account of accounts) {
            await expect(
                liquidationQueue
                    .connect(account)
                    .activateBid(account.address, poolId),
            ).to.emit(liquidationQueue, 'ActivateBid');

            const bidInfo = await liquidationQueue.bidPools(
                poolId,
                account.address,
            );
            expect(
                parseFloat(
                    ethers.utils.formatEther(bidInfo.liquidatedAssetAmount),
                ),
            ).to.eq(0);

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
                    ethers.utils.formatEther(
                        orderBookEntry.bidInfo.liquidatedAssetAmount,
                    ),
                ),
                `✖️ Activated bid amount not right for account ${accounts.indexOf(
                    account,
                )}`,
            ).to.eq(parseFloat(ethers.utils.formatEther(LQ_META.minBidAmount)));
        }

        for (const account of accounts) {
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
                    .liquidatedAssetAmount,
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
            '✖️ Balance not right after removing the active bid',
        ).to.eq(
            parseFloat(
                ethers.utils.formatEther(firstAccountYieldBoxBalanceAfterBids),
            ),
        );

        //should be 0 as no bid was executed
        const firstUserBalanceDue = await liquidationQueue.balancesDue(
            accounts[0].address,
        );
        expect(firstUserBalanceDue, '✖️ Due for first user not right').to.eq(0);

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
            for (const account of accounts) {
                await liquidationQueue
                    .connect(account)
                    .bid(account.address, poolId, LQ_META.minBidAmount);
            }
            //jump over the min activation period
            timeTravel(600);
            //activate bids
            for (const account of accounts) {
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
            for (const account of firstHalf) {
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
                    .addAsset(
                        account.address,
                        account.address,
                        false,
                        lendValShare,
                    );

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

            const swapData = new ethers.utils.AbiCoder().encode(
                ['uint256'],
                [1],
            );
            //second half borrows
            const borrowVal = usdcDepositVal
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div((1e18).toString())); // We borrow 74% collateral, max is 75%
            for (const account of secondHalf) {
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
                    .addCollateral(
                        account.address,
                        account.address,
                        false,
                        collateralShare,
                    );

                await wethUsdcMixologist
                    .connect(account)
                    .borrow(account.address, account.address, borrowVal);

                // Can't liquidate yet
                await expect(
                    wethUsdcMixologist.liquidate(
                        [account.address],
                        [borrowVal],
                        multiSwapper.address,
                        swapData,
                        swapData,
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
                    swapData,
                    swapData,
                );
            const shareForCallerAfter = await yieldBox.balanceOf(
                accounts[0].address,
                lqAssetId,
            );

            await expect(
                parseFloat(shareForCallerAfter.toString()),
                '✖️ After liquidation shares not right',
            ).to.be.greaterThan(parseFloat(shareForCallerBefore.toString()));

            //redeem if everything is left
            for (const account of secondHalf) {
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
                        '✖️ After redeem shares not right',
                    ).to.be.greaterThan(
                        parseFloat(balanceBeforeRedeem.toString()),
                    );
                }
            }
        }
    });

    it('should now allow bid on uninitialized contract', async () => {
        const { deployer, LQ_META } = await loadFixture(register);

        const liquidationQueueTest = await (
            await ethers.getContractFactory('LiquidationQueue')
        ).deploy();
        await liquidationQueueTest.deployed();

        await expect(
            liquidationQueueTest.bid(
                deployer.address,
                10,
                LQ_META.minBidAmount,
            ),
        ).to.be.revertedWith('LQ: Not initialized');
    });

    it('should not allow setting bid swapper from not authorized account ', async () => {
        const { liquidationQueue } = await loadFixture(register);

        await expect(
            liquidationQueue.setBidExecutionSwapper(
                ethers.constants.AddressZero,
            ),
        ).to.be.revertedWith('unauthorized');
    });

    it('should not allow initializing LQ twice', async () => {
        const { liquidationQueue, deployer } = await loadFixture(register);

        const LQ_META = {
            activationTime: 600, // 10min
            minBidAmount: ethers.BigNumber.from((1e18).toString()).mul(200), // 200 USDC
            defaultBidAmount: ethers.BigNumber.from((1e18).toString()).mul(400), // 400 USDC
            feeCollector: deployer.address,
            bidExecutionSwapper: ethers.constants.AddressZero,
            usdoSwapper: ethers.constants.AddressZero,
        };
        await expect(liquidationQueue.init(LQ_META)).to.be.revertedWith(
            'LQ: Initialized',
        );
    });

    it('sould not be able to redeem without a balance', async () => {
        const { liquidationQueue, deployer } = await loadFixture(register);

        await expect(
            liquidationQueue.redeem(deployer.address),
        ).to.be.revertedWith('LQ: No balance due');
    });

    it('should not allow bid execution from EOA', async () => {
        const { liquidationQueue, BN } = await loadFixture(register);

        await expect(
            liquidationQueue.executeBids(
                BN(1e18).toString(),
                ethers.utils.toUtf8Bytes(''),
            ),
        ).to.be.revertedWith('LQ: Only Mixologist');
    });

    it('should bid with USDC through external swapper', async () => {
        const {
            deployer,
            bar,
            yieldBox,
            liquidationQueue,
            wethUsdcMixologist,
            usdc,
            usdcAssetId,
            LQ_META,
            weth,
            __uniRouter,
            __uniFactory,
            __wethUsdcPrice,
            usdoToWethBidder,
            deployAndSetUsdo,
            deployCurveStableToUsdoBidder,
            addUniV2UsdoWethLiquidity,
        } = await loadFixture(register);

        //deploy and register USD0
        const { usdo } = await deployAndSetUsdo(bar);

        //deploy and register usdoSwapper and bidExecutionSwapper
        const { stableToUsdoBidder, curveSwapper } =
            await deployCurveStableToUsdoBidder(bar, usdc, usdo);

        const usdofnData = wethUsdcMixologist.interface.encodeFunctionData(
            'updateLQUsdoSwapper',
            [stableToUsdoBidder.address],
        );
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [usdofnData],
        );

        const executionfnData = wethUsdcMixologist.interface.encodeFunctionData(
            'updateLQExecutionSwapper',
            [usdoToWethBidder.address],
        );
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [executionfnData],
        );

        const savedBidSwapper = (await liquidationQueue.liquidationQueueMeta())
            .usdoSwapper;
        expect(savedBidSwapper.toLowerCase()).to.eq(
            stableToUsdoBidder.address.toLowerCase(),
        );

        //setup univ2 enviroment for usdo <> weth pair
        await addUniV2UsdoWethLiquidity(
            deployer.address,
            usdo,
            weth,
            __uniFactory,
            __uniRouter,
        );

        /// --- Acts ----
        const POOL = 10;
        const lqMeta = await liquidationQueue.liquidationQueueMeta();
        expect(lqMeta.usdoSwapper).to.not.eq(ethers.constants.AddressZero);

        const toBid = LQ_META.defaultBidAmount.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        await usdc.freeMint(toBid);
        await usdc.approve(yieldBox.address, toBid);
        await yieldBox.depositAsset(
            usdcAssetId,
            deployer.address,
            deployer.address,
            toBid,
            0,
        );

        await yieldBox.setApprovalForAll(liquidationQueue.address, true);
        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'uint256'],
            [LQ_META.minBidAmount.div(1e3), LQ_META.minBidAmount],
        );
        await expect(
            liquidationQueue.bidWithStable(
                deployer.address,
                POOL,
                usdcAssetId,
                LQ_META.minBidAmount.sub(1e5),
                new ethers.utils.AbiCoder().encode(
                    ['uint256', 'uint256'],
                    [0, 0],
                ),
            ),
        ).to.be.revertedWith('LQ: bid too low');

        await expect(
            liquidationQueue.bidWithStable(
                deployer.address,
                POOL,
                usdcAssetId,
                toBid,
                new ethers.utils.AbiCoder().encode(
                    ['uint256', 'uint256'],
                    [toBid.mul(10), toBid.mul(10)],
                ),
            ),
        ).to.be.revertedWith('insufficient-amount-out');

        const testingUsdoToUsdcAmount =
            await stableToUsdoBidder.getOutputAmount(
                wethUsdcMixologist.address,
                usdcAssetId,
                toBid,
                ethers.utils.toUtf8Bytes(''),
            );
        expect(testingUsdoToUsdcAmount.gt(LQ_META.minBidAmount)).to.be.true;
        expect(testingUsdoToUsdcAmount.lte(toBid)).to.be.true;

        await expect(
            stableToUsdoBidder.setCurveSwapper(curveSwapper.address),
        ).to.emit(stableToUsdoBidder, 'CurveSwapperUpdated');

        await expect(
            liquidationQueue.bidWithStable(
                deployer.address,
                POOL,
                usdcAssetId,
                toBid,
                data,
            ),
        ).to.emit(liquidationQueue, 'Bid');
        await expect(
            liquidationQueue.bidWithStable(
                deployer.address,
                9999999,
                usdcAssetId,
                toBid,
                data,
            ),
        ).to.be.revertedWith('LQ: premium too high');

        const bidPoolInfo = await liquidationQueue.bidPools(
            POOL,
            deployer.address,
        );
        expect(bidPoolInfo.usdoAmount.gt(LQ_META.minBidAmount)).to.be.true;
        expect(bidPoolInfo.usdoAmount.lte(toBid)).to.be.true;
    });

    it('should bid with USD0 through external swapper', async () => {
        const {
            deployer,
            bar,
            yieldBox,
            liquidationQueue,
            wethUsdcMixologist,
            usdc,
            weth,
            LQ_META,
            __uniRouter,
            __wethUsdcPrice,
            usdoToWethBidder,
            deployAndSetUsdo,
            deployCurveStableToUsdoBidder,
        } = await loadFixture(register);

        //deploy and register USD0
        const { usdo } = await deployAndSetUsdo(bar);

        //deploy and register usdoSwapper and bidExecutionSwapper
        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usdo,
        );

        const usdofnData = wethUsdcMixologist.interface.encodeFunctionData(
            'updateLQUsdoSwapper',
            [stableToUsdoBidder.address],
        );
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [usdofnData],
        );

        const executionfnData = wethUsdcMixologist.interface.encodeFunctionData(
            'updateLQExecutionSwapper',
            [usdoToWethBidder.address],
        );
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [executionfnData],
        );

        const savedBidSwapper = (await liquidationQueue.liquidationQueueMeta())
            .usdoSwapper;
        expect(savedBidSwapper.toLowerCase()).to.eq(
            stableToUsdoBidder.address.toLowerCase(),
        );

        //setup univ2 enviroment for usdo <> weth pair
        const wethPairAmount = ethers.BigNumber.from(1e6).mul(
            (1e18).toString(),
        );
        const usdoPairAmount = wethPairAmount.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        await weth.freeMint(wethPairAmount);
        await usdo.freeMint(usdoPairAmount);

        await weth.approve(__uniRouter.address, wethPairAmount);
        await usdo.approve(__uniRouter.address, usdoPairAmount);
        await __uniRouter.addLiquidity(
            weth.address,
            usdo.address,
            wethPairAmount,
            usdoPairAmount,
            wethPairAmount,
            usdoPairAmount,
            deployer.address,
            Math.floor(Date.now() / 1000) + 1000 * 60, // 1min margin
        );

        /// --- Acts ----
        const POOL = 10;

        const usdoAssetId = await yieldBox.ids(
            1,
            usdo.address,
            ethers.constants.AddressZero,
            0,
        );

        const toBid = LQ_META.defaultBidAmount.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        await usdo.freeMint(toBid);
        await usdo.approve(yieldBox.address, toBid);
        await yieldBox.depositAsset(
            usdoAssetId,
            deployer.address,
            deployer.address,
            toBid,
            0,
        );

        await yieldBox.setApprovalForAll(liquidationQueue.address, true);
        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'uint256'],
            [LQ_META.minBidAmount.div(1e3), LQ_META.minBidAmount],
        );
        const testOutput = await stableToUsdoBidder.getOutputAmount(
            wethUsdcMixologist.address,
            usdoAssetId,
            toBid,
            ethers.utils.toUtf8Bytes(''),
        );
        expect(testOutput.eq(toBid)).to.be.true;

        await expect(
            liquidationQueue.bidWithStable(
                deployer.address,
                POOL,
                usdoAssetId,
                toBid,
                data,
            ),
        ).to.emit(liquidationQueue, 'Bid');

        const bidPoolInfo = await liquidationQueue.bidPools(
            POOL,
            deployer.address,
        );
        expect(bidPoolInfo.usdoAmount.gt(LQ_META.minBidAmount)).to.be.true;
        expect(bidPoolInfo.usdoAmount.lte(toBid)).to.be.true;
    });

    it('should bid with stable, remove inactive bid, bid again, activate bid and remove activated bid', async () => {
        const {
            deployer,
            bar,
            yieldBox,
            liquidationQueue,
            wethUsdcMixologist,
            usdc,
            weth,
            usdcAssetId,
            LQ_META,
            __wethUsdcPrice,
            usdoToWethBidder,
            timeTravel,
            deployAndSetUsdo,
            deployCurveStableToUsdoBidder,
            __uniRouter,
        } = await loadFixture(register);

        //deploy and register USD0
        const { usdo } = await deployAndSetUsdo(bar);

        //deploy and register usdoSwapper and bidExecutionSwapper
        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usdo,
        );

        const usdofnData = wethUsdcMixologist.interface.encodeFunctionData(
            'updateLQUsdoSwapper',
            [stableToUsdoBidder.address],
        );
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [usdofnData],
        );

        const executionfnData = wethUsdcMixologist.interface.encodeFunctionData(
            'updateLQExecutionSwapper',
            [usdoToWethBidder.address],
        );
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [executionfnData],
        );

        //setup univ2 enviroment for usdo <> weth pair
        const wethPairAmount = ethers.BigNumber.from(1e6).mul(
            (1e18).toString(),
        );
        const usdoPairAmount = wethPairAmount.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        await weth.freeMint(wethPairAmount);
        await usdo.freeMint(usdoPairAmount);

        await weth.approve(__uniRouter.address, wethPairAmount);
        await usdo.approve(__uniRouter.address, usdoPairAmount);
        await __uniRouter.addLiquidity(
            weth.address,
            usdo.address,
            wethPairAmount,
            usdoPairAmount,
            wethPairAmount,
            usdoPairAmount,
            deployer.address,
            Math.floor(Date.now() / 1000) + 1000 * 60, // 1min margin
        );

        /// --- Acts ----
        const POOL = 10;
        const lqMeta = await liquidationQueue.liquidationQueueMeta();
        expect(lqMeta.usdoSwapper).to.not.eq(ethers.constants.AddressZero);

        const toBid = LQ_META.defaultBidAmount.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        await usdc.freeMint(toBid);
        await usdc.approve(yieldBox.address, toBid);
        await yieldBox.depositAsset(
            usdcAssetId,
            deployer.address,
            deployer.address,
            toBid,
            0,
        );

        await yieldBox.setApprovalForAll(liquidationQueue.address, true);
        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'uint256'],
            [LQ_META.minBidAmount.div(1e3), LQ_META.minBidAmount],
        );
        await expect(
            liquidationQueue.bidWithStable(
                deployer.address,
                POOL,
                usdcAssetId,
                toBid,
                data,
            ),
        ).to.emit(liquidationQueue, 'Bid');

        const bidPoolInfo = await liquidationQueue.bidPools(
            POOL,
            deployer.address,
        );
        expect(bidPoolInfo.usdoAmount.gt(LQ_META.minBidAmount)).to.be.true;
        expect(bidPoolInfo.usdoAmount.lte(toBid)).to.be.true;

        // Remove inactive bid
        await expect(
            liquidationQueue.removeInactivatedBid(deployer.address, POOL),
        ).to.emit(liquidationQueue, 'RemoveBid');

        // Bid again
        await usdc.freeMint(toBid);
        await usdc.approve(yieldBox.address, toBid);
        await yieldBox.depositAsset(
            usdcAssetId,
            deployer.address,
            deployer.address,
            toBid,
            0,
        );
        await expect(
            liquidationQueue.bidWithStable(
                deployer.address,
                POOL,
                usdcAssetId,
                toBid,
                data,
            ),
        ).to.emit(liquidationQueue, 'Bid');
        // Wait 10min
        await timeTravel(10_000);

        // Activate bid
        await expect(
            liquidationQueue.activateBid(deployer.address, POOL),
        ).to.emit(liquidationQueue, 'ActivateBid');

        // Remove bid
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
            (await liquidationQueue.bidPools(POOL, deployer.address))
                .liquidatedAssetAmount,
        ).to.be.eq(0);
    });

    it('should execute bids for stable bidders', async () => {
        const {
            deployer,
            bar,
            yieldBox,
            liquidationQueue,
            wethUsdcMixologist,
            usdc,
            usdcAssetId,
            LQ_META,
            multiSwapper,
            timeTravel,
            __wethUsdcPrice,
            __uniRouter,
            weth,
            wethUsdcOracle,
            usdoToWethBidder,
            deployAndSetUsdo,
            deployCurveStableToUsdoBidder,
        } = await loadFixture(register);

        //deploy and register USD0
        const { usdo } = await deployAndSetUsdo(bar);

        //deploy and register usdoSwapper and bidExecutionSwapper
        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usdo,
        );

        const usdofnData = wethUsdcMixologist.interface.encodeFunctionData(
            'updateLQUsdoSwapper',
            [stableToUsdoBidder.address],
        );
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [usdofnData],
        );

        const executionfnData = wethUsdcMixologist.interface.encodeFunctionData(
            'updateLQExecutionSwapper',
            [usdoToWethBidder.address],
        );
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [executionfnData],
        );

        const savedBidSwapper = (await liquidationQueue.liquidationQueueMeta())
            .usdoSwapper;
        expect(savedBidSwapper.toLowerCase()).to.eq(
            stableToUsdoBidder.address.toLowerCase(),
        );

        //setup univ2 enviroment for usdo <> weth pair
        const wethPairAmount = ethers.BigNumber.from(1e6).mul(
            (1e18).toString(),
        );
        const usdoPairAmount = wethPairAmount.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        await weth.freeMint(wethPairAmount);
        await usdo.freeMint(usdoPairAmount);

        await weth.approve(__uniRouter.address, wethPairAmount);
        await usdo.approve(__uniRouter.address, usdoPairAmount);
        await __uniRouter.addLiquidity(
            weth.address,
            usdo.address,
            wethPairAmount,
            usdoPairAmount,
            wethPairAmount,
            usdoPairAmount,
            deployer.address,
            Math.floor(Date.now() / 1000) + 1000 * 60, // 1min margin
        );

        /// --- Acts ----
        const POOL = 10;

        const toBid = LQ_META.defaultBidAmount.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        await usdc.freeMint(toBid);
        await usdc.approve(yieldBox.address, toBid);
        await yieldBox.depositAsset(
            usdcAssetId,
            deployer.address,
            deployer.address,
            toBid,
            0,
        );

        await yieldBox.setApprovalForAll(liquidationQueue.address, true);
        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'uint256'],
            [LQ_META.minBidAmount.div(1e3), LQ_META.minBidAmount],
        );

        await expect(
            liquidationQueue.bidWithStable(
                deployer.address,
                POOL,
                usdcAssetId,
                toBid,
                data,
            ),
        ).to.emit(liquidationQueue, 'Bid');

        const bidPoolInfo = await liquidationQueue.bidPools(
            POOL,
            deployer.address,
        );
        expect(bidPoolInfo.usdoAmount.gt(LQ_META.minBidAmount)).to.be.true;
        expect(bidPoolInfo.usdoAmount.lte(toBid)).to.be.true;

        // Wait 10min
        await timeTravel(10_000);

        // Activate bid
        await expect(
            liquidationQueue.activateBid(deployer.address, POOL),
        ).to.emit(liquidationQueue, 'ActivateBid');

        const accounts = await ethers.getSigners();

        const mixologistAssetId = await wethUsdcMixologist.assetId();
        const mixologistCollateralId = await wethUsdcMixologist.collateralId();
        const lqAssetId = await liquidationQueue.lqAssetId();

        //Lend from first account & borrow from the 2nd
        const usdcMintVal = LQ_META.defaultBidAmount.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );

        await weth.connect(accounts[0]).freeMint(LQ_META.defaultBidAmount); //for lending
        await usdc.connect(accounts[0]).freeMint(usdcMintVal); //for collateral

        await weth.connect(accounts[1]).freeMint(LQ_META.defaultBidAmount); //for lending
        await usdc.connect(accounts[1]).freeMint(usdcMintVal); //for collateral

        const lendValShare = await yieldBox.toShare(
            mixologistAssetId,
            LQ_META.minBidAmount,
            false,
        );

        // --- lend
        const mixologistBalanceOfAccountBefore =
            await wethUsdcMixologist.balanceOf(accounts[0].address);
        await expect(
            mixologistBalanceOfAccountBefore,
            '✖️ Account 0 mixologist balance before is not right',
        ).to.eq(0);

        await weth
            .connect(accounts[0])
            .approve(yieldBox.address, LQ_META.defaultBidAmount);

        await yieldBox
            .connect(accounts[0])
            .depositAsset(
                lqAssetId,
                accounts[0].address,
                accounts[0].address,
                LQ_META.defaultBidAmount,
                0,
            );

        await yieldBox
            .connect(accounts[0])
            .setApprovalForAll(wethUsdcMixologist.address, true);

        await wethUsdcMixologist
            .connect(accounts[0])
            .addAsset(
                accounts[0].address,
                accounts[0].address,
                false,
                lendValShare,
            );

        const mixologistBalanceOfAccountAfter =
            await wethUsdcMixologist.balanceOf(accounts[0].address);

        await expect(
            parseFloat(
                ethers.utils.formatEther(mixologistBalanceOfAccountAfter),
            ),
            '✖️ Account 0 mixologist balance after lend operation is not right',
        ).to.eq(parseFloat(ethers.utils.formatEther(lendValShare)));

        // --- borrow
        const usdcDepositVal = LQ_META.minBidAmount.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        const borrowVal = usdcDepositVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString())); // We borrow 74% collateral, max is 75%

        await usdc
            .connect(accounts[1])
            .approve(yieldBox.address, usdcDepositVal);
        await yieldBox
            .connect(accounts[1])
            .depositAsset(
                mixologistCollateralId,
                accounts[1].address,
                accounts[1].address,
                usdcDepositVal,
                0,
            );
        await yieldBox
            .connect(accounts[1])
            .setApprovalForAll(wethUsdcMixologist.address, true);
        const collateralShare = await yieldBox.toShare(
            mixologistCollateralId,
            usdcDepositVal,
            false,
        );
        await wethUsdcMixologist
            .connect(accounts[1])
            .addCollateral(
                accounts[1].address,
                accounts[1].address,
                false,
                collateralShare,
            );
        await wethUsdcMixologist
            .connect(accounts[1])
            .borrow(accounts[1].address, accounts[1].address, borrowVal);

        //  ---liquidate now
        const swapData = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
        await expect(
            wethUsdcMixologist.liquidate(
                [accounts[1].address],
                [borrowVal],
                multiSwapper.address,
                swapData,
                swapData,
            ),
        ).to.be.reverted;

        const priceDrop = __wethUsdcPrice.mul(2).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));

        const shareForCallerBefore = await yieldBox.balanceOf(
            accounts[0].address,
            lqAssetId,
        );


        await wethUsdcMixologist
            .connect(accounts[0])
            .liquidate(
                [accounts[1].address],
                [borrowVal],
                multiSwapper.address,
                swapData,
                swapData,
            );
        const shareForCallerAfter = await yieldBox.balanceOf(
            accounts[0].address,
            lqAssetId,
        );
        await expect(
            parseFloat(shareForCallerAfter.toString()),
            '✖️ After liquidation shares not right',
        ).to.be.greaterThan(parseFloat(shareForCallerBefore.toString()));
    });

    it('should execute bids for stable bidders using th entire bid amount', async () => {
        const {
            deployer,
            bar,
            yieldBox,
            liquidationQueue,
            wethUsdcMixologist,
            usdc,
            usdcAssetId,
            LQ_META,
            multiSwapper,
            __wethUsdcPrice,
            __uniRouter,
            weth,
            wethUsdcOracle,
            usdoToWethBidder,
            deployAndSetUsdo,
            deployCurveStableToUsdoBidder,
            timeTravel,
        } = await loadFixture(register);

        //deploy and register USD0
        const { usdo } = await deployAndSetUsdo(bar);

        //deploy and register usdoSwapper and bidExecutionSwapper
        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usdo,
        );

        const usdofnData = wethUsdcMixologist.interface.encodeFunctionData(
            'updateLQUsdoSwapper',
            [stableToUsdoBidder.address],
        );
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [usdofnData],
        );

        const executionfnData = wethUsdcMixologist.interface.encodeFunctionData(
            'updateLQExecutionSwapper',
            [usdoToWethBidder.address],
        );
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [executionfnData],
        );

        const savedBidSwapper = (await liquidationQueue.liquidationQueueMeta())
            .usdoSwapper;
        expect(savedBidSwapper.toLowerCase()).to.eq(
            stableToUsdoBidder.address.toLowerCase(),
        );

        //setup univ2 enviroment for usdo <> weth pair
        const wethPairAmount = ethers.BigNumber.from(1e6).mul(
            (1e18).toString(),
        );
        const usdoPairAmount = wethPairAmount.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        await weth.freeMint(wethPairAmount);
        await usdo.freeMint(usdoPairAmount);

        await weth.approve(__uniRouter.address, wethPairAmount);
        await usdo.approve(__uniRouter.address, usdoPairAmount);
        await __uniRouter.addLiquidity(
            weth.address,
            usdo.address,
            wethPairAmount,
            usdoPairAmount,
            wethPairAmount,
            usdoPairAmount,
            deployer.address,
            Math.floor(Date.now() / 1000) + 1000 * 60, // 1min margin
        );

        /// --- Acts ----
        const POOL = 10;

        const toBid = LQ_META.closeToMinBidAmount.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        await usdc.freeMint(toBid);
        await usdc.approve(yieldBox.address, toBid);
        await yieldBox.depositAsset(
            usdcAssetId,
            deployer.address,
            deployer.address,
            toBid,
            0,
        );

        await yieldBox.setApprovalForAll(liquidationQueue.address, true);
        const data = new ethers.utils.AbiCoder().encode(
            ['uint256', 'uint256'],
            [LQ_META.minBidAmount.div(1e3), LQ_META.minBidAmount],
        );
        const accounts = await ethers.getSigners();
        await expect(
            liquidationQueue.bidWithStable(
                deployer.address,
                POOL,
                usdcAssetId,
                toBid,
                data,
            ),
        ).to.emit(liquidationQueue, 'Bid');

        await usdc.connect(accounts[2]).freeMint(toBid);
        await usdc.connect(accounts[2]).approve(yieldBox.address, toBid);
        await yieldBox
            .connect(accounts[2])
            .depositAsset(
                usdcAssetId,
                accounts[2].address,
                accounts[2].address,
                toBid,
                0,
            );

        await yieldBox
            .connect(accounts[2])
            .setApprovalForAll(liquidationQueue.address, true);
        await expect(
            liquidationQueue
                .connect(accounts[2])
                .bidWithStable(
                    accounts[2].address,
                    POOL,
                    usdcAssetId,
                    toBid,
                    data,
                ),
        ).to.emit(liquidationQueue, 'Bid');

        const bidPoolInfoDeployer = await liquidationQueue.bidPools(
            POOL,
            deployer.address,
        );
        expect(bidPoolInfoDeployer.usdoAmount.gt(LQ_META.minBidAmount)).to.be
            .true;
        expect(bidPoolInfoDeployer.usdoAmount.lte(toBid)).to.be.true;
        const bidPoolInfoAnotherAccount = await liquidationQueue.bidPools(
            POOL,
            accounts[2].address,
        );

        expect(bidPoolInfoAnotherAccount.usdoAmount.gt(LQ_META.minBidAmount)).to
            .be.true;
        expect(bidPoolInfoAnotherAccount.usdoAmount.lte(toBid)).to.be.true;

        // Wait 10min
        await timeTravel(10_000);

        // Activate bid
        await expect(
            liquidationQueue.activateBid(deployer.address, POOL),
        ).to.emit(liquidationQueue, 'ActivateBid');
        await expect(
            liquidationQueue
                .connect(accounts[2])
                .activateBid(accounts[2].address, POOL),
        ).to.emit(liquidationQueue, 'ActivateBid');

        const mixologistAssetId = await wethUsdcMixologist.assetId();
        const mixologistCollateralId = await wethUsdcMixologist.collateralId();
        const lqAssetId = await liquidationQueue.lqAssetId();

        //Lend from first account & borrow from the 2nd
        const lentAmount = LQ_META.defaultBidAmount.mul(2);
        const usdcMintVal = lentAmount.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );

        await weth.connect(accounts[0]).freeMint(lentAmount); //for lending
        await usdc.connect(accounts[0]).freeMint(usdcMintVal); //for collateral

        await weth.connect(accounts[1]).freeMint(lentAmount); //for lending
        await usdc.connect(accounts[1]).freeMint(usdcMintVal); //for collateral

        const lendValShare = await yieldBox.toShare(
            mixologistAssetId,
            lentAmount,
            false,
        );

        // --- lend
        const mixologistBalanceOfAccountBefore =
            await wethUsdcMixologist.balanceOf(accounts[0].address);
        await expect(
            mixologistBalanceOfAccountBefore,
            '✖️ Account 0 mixologist balance before is not right',
        ).to.eq(0);

        await weth.connect(accounts[0]).approve(yieldBox.address, lentAmount);

        await yieldBox
            .connect(accounts[0])
            .depositAsset(
                lqAssetId,
                accounts[0].address,
                accounts[0].address,
                lentAmount,
                0,
            );

        await yieldBox
            .connect(accounts[0])
            .setApprovalForAll(wethUsdcMixologist.address, true);

        await wethUsdcMixologist
            .connect(accounts[0])
            .addAsset(
                accounts[0].address,
                accounts[0].address,
                false,
                lendValShare,
            );

        const mixologistBalanceOfAccountAfter =
            await wethUsdcMixologist.balanceOf(accounts[0].address);

        await expect(
            parseFloat(
                ethers.utils.formatEther(mixologistBalanceOfAccountAfter),
            ),
            '✖️ Account 0 mixologist balance after lend operation is not right',
        ).to.eq(parseFloat(ethers.utils.formatEther(lendValShare)));

        // --- borrow
        const usdcDepositVal = LQ_META.defaultBidAmount.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        const borrowVal = usdcDepositVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString())); // We borrow 74% collateral, max is 75%

        await usdc
            .connect(accounts[1])
            .approve(yieldBox.address, usdcDepositVal);
        await yieldBox
            .connect(accounts[1])
            .depositAsset(
                mixologistCollateralId,
                accounts[1].address,
                accounts[1].address,
                usdcDepositVal,
                0,
            );
        await yieldBox
            .connect(accounts[1])
            .setApprovalForAll(wethUsdcMixologist.address, true);
        const collateralShare = await yieldBox.toShare(
            mixologistCollateralId,
            usdcDepositVal,
            false,
        );
        await wethUsdcMixologist
            .connect(accounts[1])
            .addCollateral(
                accounts[1].address,
                accounts[1].address,
                false,
                collateralShare,
            );
        await wethUsdcMixologist
            .connect(accounts[1])
            .borrow(accounts[1].address, accounts[1].address, borrowVal);

        //  ---liquidate now
        const swapData = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
        await expect(
            wethUsdcMixologist.liquidate(
                [accounts[1].address],
                [borrowVal],
                multiSwapper.address,
                swapData,
                swapData,
            ),
        ).to.be.reverted;

        const priceDrop = __wethUsdcPrice.mul(2).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));

        const shareForCallerBefore = await yieldBox.balanceOf(
            accounts[0].address,
            lqAssetId,
        );

        await wethUsdcMixologist
            .connect(accounts[0])
            .liquidate(
                [accounts[1].address],
                [borrowVal],
                multiSwapper.address,
                swapData,
                swapData,
            );
        const shareForCallerAfter = await yieldBox.balanceOf(
            accounts[0].address,
            lqAssetId,
        );
        await expect(
            parseFloat(shareForCallerAfter.toString()),
            '✖️ After liquidation shares not right',
        ).to.be.greaterThan(parseFloat(shareForCallerBefore.toString()));

        // Check that LQ balances has been added
        const deployerBalancesDue = await liquidationQueue.balancesDue(
            deployer.address,
        );
        const acc1BalancesDue = await liquidationQueue.balancesDue(
            accounts[1].address,
        );
        const acc2BalancesDue = await liquidationQueue.balancesDue(
            accounts[2].address,
        );
        expect(acc1BalancesDue.eq(0)).to.be.true;
        expect(deployerBalancesDue.gt(acc2BalancesDue)).to.be.true; //the first bidder
    });
});

//TODO: move to utils if needed in other places
const splitArray = (arr: any, batches: number) => {
    const chunkLength = Math.max(arr.length / batches, 1);
    const chunks = [];
    for (let i = 0; i < batches; i++) {
        if (chunkLength * (i + 1) <= arr.length)
            chunks.push(arr.slice(chunkLength * i, chunkLength * (i + 1)));
    }
    return chunks;
};

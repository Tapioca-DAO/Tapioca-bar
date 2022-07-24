import hh, { ethers } from 'hardhat';
import { expect } from 'chai';
import { parseEvent, register } from './test.utils';
import { Contract, Signer } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

/*

### COMMENTS ABOUT CHANGES DONE AND OTHER NOTES ###

Needed to fix hardhat version to 5.6.8, since latest(5.7.0) apparently includes a bug or breaking change where transaction that should revert throws "insufficient funds for intrinsic transaction cost"

I would also recommend to set a fix version number of all dependencies or at least of the patch, instead of the minor (changing `^` for `~`) to avoid this kind of problems

Fixed `.solhint.json` file and added more rules

Fixed smart contract style violations of solhint rules

Added hardhat-dodoc plugin to generate md files containing smart contracts documentation

Added additional scripts in package.json to facilitate commonly used tasks (clean, compile, test...)

Added `license` field to package.json to get rid of warning

There is the function `jumpTime` in the test utils but it wasn't being used in a test, using the `evm_increaseTime` op instead of calling the function

Changed README.md to adapt `deposit` to correct function name `depositAsset`

Fixed some warnings:
  - variable `masterContractLength` with same name as function in BeachBar.sol. Since nothing inside the contract is calling the function but rather doing `masterContracts.length`, function `masterContractLength()` set to external
  - removed visibility for constructors
  - removed variable names for unused parameters
  - restricted state mutability where necessary

Added requires to contracts:
  - checking that either amount or shares are != 0 in YieldBox
  - checking that assetId corresponds to an actual asset

Added AssetDeposited and AssetWithdrawn events to IYieldBox

Identified a bug in removeBid@LiquidationQueue.sol: "Remove bid from the order book by replacing it with the last activated bid". There might not be any bids left. Fixed by adding a check and reordering part of the code

Other improvements I would make to the contracts:
  - Standardize variable namings. Some parameters have leading or trailing underscores, while others have none. I would have all parameters start with an underscore
  - Add events where necessary
  - Review the whole codebase to add more requires. Getting arithmetic panic codes shouldn't happen, would be better to control the errors
  - Use a test coverage tool to check that an acceptable % of the code is tested
  - Some stuff is duplicated. For example, there's a `interface IERC1155` in `contracts/bar/interfaces` but then the project uses the @boringcrypto `IERC1155.sol` so the extra one should be removed
  - Looks strange to me that YieldBox contract doesn't implement IYieldBox interface. Maybe I'm missing something but I would add the public functions of YieldBox to the IYieldBox interface and link them properly
  - The function `userBidIndexLength` in LiquidationQueue does a loop to modify the `bidIndexesLen` variable but then returns `bidIndexes.length`. Either the return value is invalid or the for loop should be removed
  - In my opinion, the constants of the contracts (like fee amounts, collateralization rates, etc) should be public instead of private

The test was tried with 1000 users but this surpasses the gas limit if it's attempted to liquidate all of them in the same transaction. The default number of users have been set to 100 in `hardhat.export.ts` but can be tuned in the .env file

*/

describe('LiquidationQueue integration test', () => {
    it.only('should try the interaction of a high number of users', async () => {
        const {
            BN,
            feeCollector,
            jumpTime,
            liquidationQueue,
            LQ_META,
            multiSwapper,
            usdc,
            weth,
            wethUsdcMixologist,
            wethUsdcOracle,
            yieldBox,
            __wethUsdcPrice,
        } = await register();

        const allAccounts = await ethers.getSigners();

        const belowMinBidAmount = LQ_META.minBidAmount.sub(1);

        const wethInitBalance = LQ_META.minBidAmount.mul(10); // 10 times the minimum bid amount
        const usdcInitBalance = wethInitBalance
            .mul(__wethUsdcPrice)
            .div(BN(1e18)); // Adjusted to USDC price

        const POOL = 10;
        const marketAssetId = await wethUsdcMixologist.assetId();
        const marketColId = await wethUsdcMixologist.collateralId();
        const lqAssetId = await liquidationQueue.lqAssetId();
        const fakeLqAssetId = 999999;

        // Assign initial balances to all accounts and deposit into YieldBox
        // Then make bids and cancel them before activating them
        // Make bids again to be activated after waiting
        for (const account of allAccounts) {
            // - Assign initial balances to all accounts
            const usdcFreeMintRc = await (
                await usdc.connect(account).freeMint(usdcInitBalance)
            ).wait();
            expect(await usdc.balanceOf(account.address)).to.equal(
                usdcInitBalance,
            );
            const usdcMintEv = parseEvent(usdcFreeMintRc, usdc, 'Transfer');
            expect(usdcMintEv, 'Should have triggered Transfer event').not.to.be
                .undefined;
            expect(usdcMintEv?.args.from).to.equal(
                ethers.constants.AddressZero,
                'Invalid arg from',
            );
            expect(usdcMintEv?.args.to).to.equal(
                account.address,
                'Invalid arg to',
            );
            expect(usdcMintEv?.args.value).to.equal(
                usdcInitBalance,
                'Invalid arg value',
            );

            await (
                await weth.connect(account).freeMint(wethInitBalance)
            ).wait();
            expect(await weth.balanceOf(account.address)).to.equal(
                wethInitBalance,
            );
            // This contract doesn't emit event on freeMint

            // - Deposit into YieldBox

            await expect(
                yieldBox
                    .connect(account)
                    .depositAsset(
                        fakeLqAssetId,
                        account.address,
                        account.address,
                        wethInitBalance,
                        0,
                    ),
            ).to.be.revertedWith('Asset id out of range');

            await expect(
                yieldBox
                    .connect(account)
                    .depositAsset(
                        lqAssetId,
                        account.address,
                        account.address,
                        wethInitBalance,
                        0,
                    ),
            ).to.be.revertedWith('BoringERC20: TransferFrom failed');

            await expect(
                yieldBox
                    .connect(account)
                    .depositAsset(
                        lqAssetId,
                        account.address,
                        account.address,
                        0,
                        0,
                    ),
            ).to.be.revertedWith('YieldBox: share or amount must be non-zero');

            await (
                await weth
                    .connect(account)
                    .approve(yieldBox.address, wethInitBalance)
            ).wait();
            const yieldBoxDepositRc = await (
                await yieldBox
                    .connect(account)
                    .depositAsset(
                        lqAssetId,
                        account.address,
                        account.address,
                        wethInitBalance,
                        0,
                    )
            ).wait();
            const yieldBoxDepositEv = parseEvent(
                yieldBoxDepositRc,
                yieldBox,
                'AssetDeposited',
            );
            expect(
                yieldBoxDepositEv,
                'Should have triggered AssetDeposited event',
            ).not.to.be.undefined;
            expect(yieldBoxDepositEv?.args.assetId).to.equal(
                lqAssetId,
                'Invalid arg assetId',
            );
            expect(yieldBoxDepositEv?.args.from).to.equal(
                account.address,
                'Invalid arg from',
            );
            expect(yieldBoxDepositEv?.args.to).to.equal(
                account.address,
                'Invalid arg to',
            );
            expect(yieldBoxDepositEv?.args.amount).to.equal(
                wethInitBalance,
                'Invalid arg amount',
            );
            const expectedShares = await yieldBox.toShare(
                lqAssetId,
                wethInitBalance,
                false,
            );
            expect(yieldBoxDepositEv?.args.shares).to.equal(
                expectedShares,
                'Invalid arg shares',
            );

            // - Make bids
            await expect(
                yieldBox
                    .connect(account)
                    .setApprovalForAll(ethers.constants.AddressZero, true),
            ).to.be.revertedWith('YieldBox: operator not set');
            await expect(
                yieldBox
                    .connect(account)
                    .setApprovalForAll(yieldBox.address, true),
            ).to.be.revertedWith("YieldBox: can't approve yieldBox");
            const approvalForAllRc = await (
                await yieldBox
                    .connect(account)
                    .setApprovalForAll(liquidationQueue.address, true)
            ).wait();
            const approvalForAllEv = parseEvent(
                approvalForAllRc,
                yieldBox,
                'ApprovalForAll',
            );
            expect(
                approvalForAllEv,
                'Should have triggered ApprovalForAll event',
            ).not.to.be.undefined;
            expect(approvalForAllEv?.args._owner).to.equal(
                account.address,
                'Invalid arg _owner',
            );
            expect(approvalForAllEv?.args._operator).to.equal(
                liquidationQueue.address,
                'Invalid arg _operator',
            );
            expect(approvalForAllEv?.args._approved).to.equal(
                true,
                'Invalid arg _approved',
            );

            expect(
                liquidationQueue
                    .connect(account)
                    .bid(account.address, POOL, belowMinBidAmount),
            ).to.be.revertedWith('LQ: bid too low');
            expect(
                liquidationQueue
                    .connect(account)
                    .bid(account.address, POOL * 100, LQ_META.minBidAmount),
            ).to.be.revertedWith('LQ: premium too high');

            const bidRc = await (
                await liquidationQueue
                    .connect(account)
                    .bid(account.address, POOL, LQ_META.minBidAmount)
            ).wait();
            const bidEv = parseEvent(bidRc, liquidationQueue, 'Bid');
            expect(bidEv, 'Should have triggered Bid event').not.to.be
                .undefined;
            expect(bidEv?.args.caller).to.equal(
                account.address,
                'Invalid arg caller',
            );
            expect(bidEv?.args.bidder).to.equal(
                account.address,
                'Invalid arg bidder',
            );
            expect(bidEv?.args.pool).to.equal(POOL, 'Invalid arg pool');
            expect(bidEv?.args.amount).to.equal(
                LQ_META.minBidAmount,
                'Invalid arg amount',
            );
            expect(
                (await liquidationQueue.bidPools(POOL, account.address)).amount,
            ).to.equal(LQ_META.minBidAmount);

            // - Now try to activate the bid before time
            await expect(
                liquidationQueue
                    .connect(account)
                    .activateBid(account.address, POOL),
            ).to.be.revertedWith('LQ: too soon');

            // - Remove inactive bid
            const removeBidRc = await (
                await liquidationQueue
                    .connect(account)
                    .removeInactivatedBid(account.address, POOL)
            ).wait();
            const removeBidEv = parseEvent(
                removeBidRc,
                liquidationQueue,
                'RemoveBid',
            );
            expect(removeBidEv, 'Should have triggered RemoveBid event').not.to
                .be.undefined;
            expect(removeBidEv?.args.caller).to.equal(
                account.address,
                'Invalid arg caller',
            );
            expect(removeBidEv?.args.bidder).to.equal(
                account.address,
                'Invalid arg bidder',
            );
            expect(removeBidEv?.args.pool).to.equal(POOL, 'Invalid arg pool');
            expect(removeBidEv?.args.amount).to.equal(
                LQ_META.minBidAmount,
                'Invalid arg amount',
            );
            expect(
                (await liquidationQueue.bidPools(POOL, account.address)).amount,
            ).to.equal(0);
            expect(
                (await liquidationQueue.bidPools(POOL, account.address)).amount,
            ).to.equal(0);
            expect(
                await yieldBox.toAmount(
                    lqAssetId,
                    await yieldBox.balanceOf(account.address, lqAssetId),
                    false,
                ),
            ).to.equal(wethInitBalance);

            // - Make bids again
            const bidRc2 = await (
                await liquidationQueue
                    .connect(account)
                    .bid(account.address, POOL, LQ_META.minBidAmount)
            ).wait();
            const bidEv2 = parseEvent(bidRc2, liquidationQueue, 'Bid');
            expect(bidEv2, 'Should have triggered Bid event').not.to.be
                .undefined;
            expect(bidEv2?.args.caller).to.equal(
                account.address,
                'Invalid arg caller',
            );
            expect(bidEv2?.args.bidder).to.equal(
                account.address,
                'Invalid arg bidder',
            );
            expect(bidEv2?.args.pool).to.equal(POOL, 'Invalid arg pool');
            expect(bidEv2?.args.amount).to.equal(
                LQ_META.minBidAmount,
                'Invalid arg amount',
            );
            expect(
                (await liquidationQueue.bidPools(POOL, account.address)).amount,
            ).to.equal(LQ_META.minBidAmount);
        }

        // - Wait to be able to activate the bids
        jumpTime(LQ_META.activationTime);

        // - Activate the bids and then remove them, then make them again
        for (const account of allAccounts) {
            // - Activate the bid
            const activateBidRc = await (
                await liquidationQueue
                    .connect(account)
                    .activateBid(account.address, POOL)
            ).wait();
            const activateBidEv = parseEvent(
                activateBidRc,
                liquidationQueue,
                'ActivateBid',
            );
            expect(activateBidEv, 'Should have triggered ActivateBid event').not
                .to.be.undefined;
            expect(activateBidEv?.args.caller).to.equal(
                account.address,
                'Invalid arg caller',
            );
            expect(activateBidEv?.args.bidder).to.equal(
                account.address,
                'Invalid arg bidder',
            );
            expect(activateBidEv?.args.pool).to.equal(POOL, 'Invalid arg pool');
            expect(activateBidEv?.args.amount).to.equal(
                LQ_META.minBidAmount,
                'Invalid arg amount',
            );
            expect(
                (await liquidationQueue.bidPools(POOL, account.address)).amount,
            ).to.equal(0);
            expect(
                await yieldBox.toAmount(
                    lqAssetId,
                    await yieldBox.balanceOf(account.address, lqAssetId),
                    false,
                ),
            ).to.equal(wethInitBalance.sub(LQ_META.minBidAmount));

            // - Remove the bid
            const bidIndexLen = await liquidationQueue
                .connect(account)
                .userBidIndexLength(account.address, POOL);
            await expect(
                liquidationQueue
                    .connect(account)
                    .removeBid(account.address, POOL, bidIndexLen.add(1)),
            ).to.be.revertedWith('LQ: bid position out of range');
            const removeBidRc = await (
                await liquidationQueue
                    .connect(account)
                    .removeBid(account.address, POOL, bidIndexLen.sub(1))
            ).wait();
            const removeBidEv = parseEvent(
                removeBidRc,
                liquidationQueue,
                'RemoveBid',
            );
            expect(removeBidEv, 'Should have triggered RemoveBid event').not.to
                .be.undefined;
            expect(removeBidEv?.args.caller).to.equal(
                account.address,
                'Invalid arg caller',
            );
            expect(removeBidEv?.args.bidder).to.equal(
                account.address,
                'Invalid arg bidder',
            );
            expect(removeBidEv?.args.pool).to.equal(POOL, 'Invalid arg pool');
            expect(removeBidEv?.args.amount).to.equal(
                LQ_META.minBidAmount,
                'Invalid arg amount',
            );
            expect(
                (await liquidationQueue.bidPools(POOL, account.address)).amount,
            ).to.equal(0, 'Invalid bid pools amount');
            expect(
                await yieldBox.toAmount(
                    lqAssetId,
                    await yieldBox.balanceOf(account.address, lqAssetId),
                    false,
                ),
            ).to.equal(wethInitBalance, 'Invalid yieldBox balance of account');

            // - Make bids again
            const bidRc2 = await (
                await liquidationQueue
                    .connect(account)
                    .bid(account.address, POOL, LQ_META.minBidAmount)
            ).wait();
            const bidEv2 = parseEvent(bidRc2, liquidationQueue, 'Bid');
            expect(bidEv2, 'Should have triggered Bid event').not.to.be
                .undefined;
            expect(bidEv2?.args.caller).to.equal(
                account.address,
                'Invalid arg caller',
            );
            expect(bidEv2?.args.bidder).to.equal(
                account.address,
                'Invalid arg bidder',
            );
            expect(bidEv2?.args.pool).to.equal(POOL, 'Invalid arg pool');
            expect(bidEv2?.args.amount).to.equal(
                LQ_META.minBidAmount,
                'Invalid arg amount',
            );
            expect(
                (await liquidationQueue.bidPools(POOL, account.address)).amount,
            ).to.equal(LQ_META.minBidAmount);
        }

        // - Wait to be able to activate the bids
        jumpTime(LQ_META.activationTime);

        // - Activate the bids
        for (const account of allAccounts) {
            // - Activate the bid
            const activateBidRc = await (
                await liquidationQueue
                    .connect(account)
                    .activateBid(account.address, POOL)
            ).wait();
            const activateBidEv = parseEvent(
                activateBidRc,
                liquidationQueue,
                'ActivateBid',
            );
            expect(activateBidEv, 'Should have triggered ActivateBid event').not
                .to.be.undefined;
            expect(activateBidEv?.args.caller).to.equal(
                account.address,
                'Invalid arg caller',
            );
            expect(activateBidEv?.args.bidder).to.equal(
                account.address,
                'Invalid arg bidder',
            );
            expect(activateBidEv?.args.pool).to.equal(POOL, 'Invalid arg pool');
            expect(activateBidEv?.args.amount).to.equal(
                LQ_META.minBidAmount,
                'Invalid arg amount',
            );
            expect(
                (await liquidationQueue.bidPools(POOL, account.address)).amount,
            ).to.equal(0);
            expect(
                await yieldBox.toAmount(
                    lqAssetId,
                    await yieldBox.balanceOf(account.address, lqAssetId),
                    false,
                ),
            ).to.equal(wethInitBalance.sub(LQ_META.minBidAmount));
        }

        // - Try to liquidate all users (should fail)
        const accountAddresses = allAccounts.map((account) => account.address);
        const accountBorrowParts = await getAccountBorrowParts(
            allAccounts,
            wethUsdcMixologist,
        );

        await expect(
            wethUsdcMixologist.liquidate(
                accountAddresses,
                accountBorrowParts,
                multiSwapper.address,
            ),
        ).to.be.revertedWith('Mx: all are solvent');

        // - Make accounts lend
        const lendShareAmount = await yieldBox.toShare(
            marketAssetId,
            LQ_META.minBidAmount,
            false,
        );
        for (const account of allAccounts) {
            const approvalForAllRc = await (
                await yieldBox
                    .connect(account)
                    .setApprovalForAll(wethUsdcMixologist.address, true)
            ).wait();
            const approvalForAllEv = parseEvent(
                approvalForAllRc,
                yieldBox,
                'ApprovalForAll',
            );
            expect(
                approvalForAllEv,
                'Should have triggered ApprovalForAll event',
            ).not.to.be.undefined;
            expect(approvalForAllEv?.args._owner).to.equal(
                account.address,
                'Invalid arg _owner',
            );
            expect(approvalForAllEv?.args._operator).to.equal(
                wethUsdcMixologist.address,
                'Invalid arg _operator',
            );
            expect(approvalForAllEv?.args._approved).to.equal(
                true,
                'Invalid arg _approved',
            );
            const lendRc = await (
                await wethUsdcMixologist
                    .connect(account)
                    .addAsset(account.address, false, lendShareAmount)
            ).wait();
            const lendEv = parseEvent(
                lendRc,
                wethUsdcMixologist,
                'LogAddAsset',
            );
            expect(lendEv, 'Should have triggered LogAddAsset event').not.to.be
                .undefined;
            expect(lendEv?.args.from).to.equal(account.address);
            expect(lendEv?.args.to).to.equal(account.address);
            expect(lendEv?.args.share).to.equal(lendShareAmount);
            expect(lendEv?.args.fraction).to.equal(lendShareAmount);
            expect(
                await wethUsdcMixologist.balanceOf(account.address),
            ).to.equal(lendShareAmount);
        }

        // - Make accounts borrow
        const usdcCollateralAmount = usdcInitBalance.div(10);

        const usdcCollateralShares = await yieldBox.toShare(
            marketColId,
            usdcCollateralAmount,
            false,
        );
        const borrowAmount = usdcCollateralAmount
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div(BN(1e18))); // 74% of the collateral
        for (const account of allAccounts) {
            // First deposit usdc as collateral
            await (
                await usdc
                    .connect(account)
                    .approve(yieldBox.address, usdcCollateralAmount)
            ).wait();

            const yieldBoxDepositRc = await (
                await yieldBox
                    .connect(account)
                    .depositAsset(
                        marketColId,
                        account.address,
                        account.address,
                        usdcCollateralAmount,
                        0,
                    )
            ).wait();
            const yieldBoxDepositEv = parseEvent(
                yieldBoxDepositRc,
                yieldBox,
                'AssetDeposited',
            );
            expect(
                yieldBoxDepositEv,
                'Should have triggered AssetDeposited event',
            ).not.to.be.undefined;
            expect(yieldBoxDepositEv?.args.assetId).to.equal(
                marketColId,
                'Invalid arg assetId',
            );
            expect(yieldBoxDepositEv?.args.from).to.equal(
                account.address,
                'Invalid arg from',
            );
            expect(yieldBoxDepositEv?.args.to).to.equal(
                account.address,
                'Invalid arg to',
            );
            expect(yieldBoxDepositEv?.args.amount).to.equal(
                usdcCollateralAmount,
                'Invalid arg amount',
            );
            const expectedShares = await yieldBox.toShare(
                marketColId,
                usdcCollateralAmount,
                false,
            );
            expect(yieldBoxDepositEv?.args.shares).to.equal(
                expectedShares,
                'Invalid arg shares',
            );

            const approvalForAllRc = await (
                await yieldBox
                    .connect(account)
                    .setApprovalForAll(wethUsdcMixologist.address, true)
            ).wait();
            const approvalForAllEv = parseEvent(
                approvalForAllRc,
                yieldBox,
                'ApprovalForAll',
            );
            expect(
                approvalForAllEv,
                'Should have triggered ApprovalForAll event',
            ).not.to.be.undefined;

            expect(approvalForAllEv?.args._owner).to.equal(
                account.address,
                'Invalid arg _owner',
            );
            expect(approvalForAllEv?.args._operator).to.equal(
                wethUsdcMixologist.address,
                'Invalid arg _operator',
            );
            expect(approvalForAllEv?.args._approved).to.equal(
                true,
                'Invalid arg _approved',
            );
            const addCollateralRc = await (
                await wethUsdcMixologist
                    .connect(account)
                    .addCollateral(account.address, false, usdcCollateralShares)
            ).wait();
            const addCollateralEv = parseEvent(
                addCollateralRc,
                wethUsdcMixologist,
                'LogAddCollateral',
            );
            expect(
                addCollateralEv,
                'Should have triggered LogAddCollateral event',
            ).not.to.be;
            expect(addCollateralEv?.args.from).to.equal(account.address);
            expect(addCollateralEv?.args.to).to.equal(account.address);
            expect(addCollateralEv?.args.share).to.equal(usdcCollateralShares);

            const borrowRc = await (
                await wethUsdcMixologist
                    .connect(account)
                    .borrow(account.address, borrowAmount)
            ).wait();
            const borrowEv = parseEvent(
                borrowRc,
                wethUsdcMixologist,
                'LogBorrow',
            );
            expect(borrowEv, 'Should have triggered LogBorrow event').not.to.be
                .undefined;
            expect(borrowEv?.args.from).to.equal(account.address);
            expect(borrowEv?.args.to).to.equal(account.address);
            expect(borrowEv?.args.amount).to.equal(borrowAmount);
        }

        // - Try to liquidate all users again (should fail)
        const accountBorrowPartsAfterBorrow = await getAccountBorrowParts(
            allAccounts,
            wethUsdcMixologist,
        );

        await expect(
            wethUsdcMixologist.liquidate(
                accountAddresses,
                accountBorrowPartsAfterBorrow,
                multiSwapper.address,
            ),
        ).to.be.revertedWith('Mx: all are solvent');

        // Create an artificial price drop so users are no solvent anymore
        const newPrice = __wethUsdcPrice.mul(120).div(100);
        await wethUsdcOracle.set(newPrice);
        expect(
            (
                await wethUsdcOracle.get(
                    await wethUsdcOracle.getDataParameter(),
                )
            )[1],
        ).to.equal(newPrice, 'Wrong exchange rate');

        await wethUsdcMixologist.updateExchangeRate();

        expect(await wethUsdcMixologist.exchangeRate()).to.equal(
            newPrice,
            'Wrong exchange rate',
        );

        // - Liquidate all users
        await expect(
            wethUsdcMixologist.liquidate(
                accountAddresses,
                accountBorrowPartsAfterBorrow,
                multiSwapper.address,
            ),
        ).not.to.be.reverted;

        // - Check balances and redeem if necessary
        expect(
            await yieldBox.balanceOf(feeCollector.address, marketColId),
        ).to.equal(0);
        expect(
            await liquidationQueue.balancesDue(feeCollector.address),
        ).to.equal(0);
        let anyRedeemPerformed = false;
        for (const account of allAccounts) {
            const balanceDue = await liquidationQueue.balancesDue(
                account.address,
            );
            if (balanceDue.gt(0)) {
                anyRedeemPerformed = true;
                const redeemRc = await (
                    await liquidationQueue
                        .connect(account)
                        .redeem(feeCollector.address)
                ).wait();
                const redeemEv = parseEvent(
                    redeemRc,
                    liquidationQueue,
                    'Redeem',
                );
                expect(redeemEv, 'Should have triggered Redeem event').not.to.be
                    .undefined;
                expect(redeemEv?.args.redeemer).to.equal(
                    account.address,
                    'Invalid arg account',
                );
                expect(redeemEv?.args.to).to.equal(
                    feeCollector.address,
                    'Invalid arg account',
                );
            } else {
                // Nothing to redeem, should fail
                await expect(
                    liquidationQueue
                        .connect(account)
                        .redeem(feeCollector.address),
                ).to.be.revertedWith('LQ: No balance due');
            }
        }
        if (anyRedeemPerformed) {
            expect(
                await liquidationQueue.balancesDue(feeCollector.address),
            ).to.be.gt(0);
            expect(
                await yieldBox.balanceOf(feeCollector.address, marketColId),
            ).to.be.gt(0);
        }
    });
});

async function getAccountBorrowParts(
    accounts: SignerWithAddress[],
    mixologistContract: Contract,
) {
    const borrowParts = [];
    for (const account of accounts) {
        const borrowPart = await mixologistContract.userBorrowPart(
            account.address,
        );
        borrowParts.push(borrowPart);
    }
    return borrowParts;
}

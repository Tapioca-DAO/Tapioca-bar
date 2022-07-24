import hh, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { LiquidationQueue, WETH9Mock } from '../typechain';
import { setFlagsFromString } from 'v8';
import { BigNumber, Contract, Wallet } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';




// EOA1 has deposited assets weth for yield farming
// deployer borrows weth against usdc collateral
// when collateral gets liquidated, bidders participate in the auction
describe('LiquidationQueue Integration test', () => {
    it('If all bidders in same pool, should execute according to bid activation time', async () => {
        // setup contracts and accounts
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

        const POOL = 10;
        const marketAssetId = await wethUsdcMixologist.assetId();
        const marketColId = await wethUsdcMixologist.collateralId();
        const lqAssetId = await liquidationQueue.lqAssetId();


       // Mint some weth to deposit as asset with EOA1
       const wethAmount = BN(1e18).mul(3000);
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
            .mul(1)
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


        // define helper function to initialise n bidders with funds and connected to yieldbox
        // function could be added to test.utils for quicker setup of future tests with n users
        // 100 users to save time, can in principle be more
        async function initBidders(n: number){

            // hardhat config file sets default number of signers to 101, first signer is deployer and 100 bidders
            let bidders = (await ethers.getSigners()).slice(1,n+1);

            // get weth for each account and transfer it to yieldbox and authorise liquidation Queue
            await Promise.all(bidders.map(async bidder =>{
                weth.connect(bidder).freeMint(LQ_META.minBidAmount.mul(100));
                })
            )

            await Promise.all(bidders.map(async bidder =>{
                weth.connect(bidder).approve(yieldBox.address, LQ_META.minBidAmount.mul(100));
                })
            )

            await Promise.all(bidders.map(async bidder =>{
                yieldBox.connect(bidder).depositAsset(
                    lqAssetId,
                    bidder.address,
                    bidder.address,
                    LQ_META.minBidAmount.mul(100),
                    0,
                );
                })
            )

            await Promise.all(bidders.map(async bidder =>{
                yieldBox.connect(bidder).setApprovalForAll(liquidationQueue.address, true);
                })
            )

            return bidders
        }

        // start of the actual test case
        const n_accounts = 100;
        const bidders = await initBidders(n_accounts);

        // all accounts bid the min amount for the same POOL
        for (let i = 0; i < n_accounts; i++) {
            await liquidationQueue.connect(bidders[i]).bid(
                bidders[i].address,
                POOL,
                LQ_META.minBidAmount.mul(1)
                )
            }
        

        await hh.network.provider.send('evm_increaseTime', [10_000]);
        await hh.network.provider.send('evm_mine');

        // there is enough collateral for liquidation for 8 bidders to get a share
        // the last (could be set to random 8 of 100) 8 bidders activate their bid first
        for (let i = n_accounts - 8; i < n_accounts; i++) {
            await liquidationQueue.connect(bidders[i]).activateBid(
                bidders[i].address,
                POOL,
                )
            }

        // all bidders activate their bid
        for (let i = 0; i < n_accounts ; i++) {
            await liquidationQueue.connect(bidders[i]).activateBid(
                bidders[i].address,
                POOL,
                )
            }


        // Make some price movement and liquidate
        const priceDrop = __wethUsdcPrice.mul(5).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
        await wethUsdcMixologist.updateExchangeRate();

        
        await wethUsdcMixologist.liquidate(
                [deployer.address],
                [await wethUsdcMixologist.userBorrowPart(deployer.address)],
                multiSwapper.address,
            );

        // check the result: balance of everyone should be 0, the last 8 bidders should have acquired some usdc
        for (let i = 0; i < n_accounts; i++) {

            if (i < n_accounts - 8) {
                expect(
                await liquidationQueue.connect(bidders[i]).balancesDue(bidders[i].address)
                ).to.eq(0);
            } else {
                expect(
                await liquidationQueue.connect(bidders[i]).balancesDue(bidders[i].address)
                ).to.not.eq(0);           
            }
        }
    });
});

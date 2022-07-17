import { expect } from 'chai';
import {register, setBalance} from './test.utils';
import hh, {ethers} from "hardhat";
import {mixologist} from "../front/src/deployment";

describe('LiquidiationQueue Integrations test', () => {
    it('Should execute bids from multiple liquidators', async () => {
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


        // setup accounts and split them to 2 groups: borrowers and liquidators
        const lender1 = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);
        await setBalance(lender1.address, 100000);
        const lender2 = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);
        await setBalance(lender2.address, 100000);
        const borrower1 = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);
        await setBalance(borrower1.address, 100000);
        const borrower2 = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);
        await setBalance(borrower2.address, 100000);
        const liquidator1 = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);
        await setBalance(liquidator1.address, 100000);
        const liquidator2 = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, ethers.provider);
        await setBalance(liquidator2.address, 100000);
        const lenders = [lender1, lender2];
        const borrowers = [borrower1, borrower2];
        const liquidators = [liquidator1, liquidator2];

        const POOL = 1;
        const marketAssetId = await wethUsdcMixologist.assetId();
        const marketColId = await wethUsdcMixologist.collateralId();

        // add assets to lenders and deposit to mixologist
        const wethAmount = LQ_META.minBidAmount.mul(100);
        const usdcAmount = wethAmount.mul(__wethUsdcPrice.div(BN(1e18)));
        for (let i = 0; i < lenders.length; i++) {
            await weth.connect(lenders[i]).freeMint(wethAmount);
            await weth.connect(lenders[i]).approve(yieldBox.address, wethAmount);
            await yieldBox.connect(lenders[i]).setApprovalForAll(wethUsdcMixologist.address, true);
            await yieldBox.connect(lenders[i]).depositAsset(
                marketAssetId,
                lenders[i].address,
                lenders[i].address,
                wethAmount,
                  0,
            );
            await wethUsdcMixologist
                .connect(lenders[i])
                .addAsset(
                    lenders[i].address,
                    false,
                    await yieldBox.toShare(marketAssetId, wethAmount, false),
                );
        }


        // add assets to liquidators and create bids
        for (let i = 0; i < liquidators.length; i++) {
            await weth.connect(liquidators[i]).freeMint(wethAmount);
            await weth.connect(liquidators[i]).approve(yieldBox.address, wethAmount);
            await yieldBox.connect(liquidators[i]).setApprovalForAll(liquidationQueue.address, true);
            await yieldBox.connect(liquidators[i]).depositAsset(
                marketAssetId,
                liquidators[i].address,
                liquidators[i].address,
                wethAmount,
                  0,
            );

            await liquidationQueue.connect(liquidators[i]).bid(
                liquidators[i].address,
                POOL,
                wethAmount,
            );
        }

        await hh.network.provider.send('evm_increaseTime', [10_000]);
        await hh.network.provider.send('evm_mine');

        // active bids
        // add assets to liquidators and create bids
        for (let i = 0; i < liquidators.length; i++) {
            await liquidationQueue.activateBid(liquidators[i].address, POOL);
        }

        // add collateral fund to borrowers and borrow funds
        for (let i = 0; i < borrowers.length; i++) {
            await usdc.connect(borrowers[i]).freeMint(usdcAmount);
            await usdc.connect(borrowers[i]).approve(yieldBox.address, usdcAmount);
            await yieldBox.connect(borrowers[i]).depositAsset(
                marketColId,
                borrowers[i].address,
                borrowers[i].address,
                usdcAmount,
                  0,
            );
            // add collateral fund to mixologist
            await yieldBox.connect(borrowers[i]).setApprovalForAll(wethUsdcMixologist.address, true);
            await wethUsdcMixologist
                .connect(borrowers[i])
                .addCollateral(
                    borrowers[i].address,
                    false,
                    await yieldBox.toShare(marketColId, usdcAmount, false),
                );

            // borrow funds
            const borrowAmount = usdcAmount
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div(BN(1e18)));
            // exceed collateral
            await expect(wethUsdcMixologist.connect(borrowers[i]).borrow(borrowers[i].address, usdcAmount)).to.be.revertedWith('');
            await wethUsdcMixologist.connect(borrowers[i]).borrow(borrowers[i].address, borrowAmount);
        }

        // Try to liquidate but with failure since price hasn't changed
        const borrowerAddresses = borrowers.map(b => b.address);
        const borrowParts = [];
        for (let i=0; i<borrowerAddresses.length; i++) {
            borrowParts.push(await wethUsdcMixologist.userBorrowPart(borrowerAddresses[i]));
        }
        await expect(
          wethUsdcMixologist.connect(deployer).liquidate(
            borrowerAddresses,
            borrowParts,
            ethers.constants.AddressZero,
          ),
        ).to.be.revertedWith('Mx: all are solvent');

        // Make some price movement and liquidate, increase asset weth price,
        // which require more collateral for borrowers
        const priceDrop = __wethUsdcPrice.mul(10).div(100);
        const new__wethUsdcPrice = __wethUsdcPrice.add(priceDrop);
        await wethUsdcOracle.set(new__wethUsdcPrice);
        await wethUsdcMixologist.updateExchangeRate();

        // get data before liquidation
        const amountToBeLiquidated = [];
        const borrowerCollateral = [];
        for(let i=0; i<borrowers.length; i++) {
           amountToBeLiquidated.push(await wethUsdcMixologist.computeAssetAmountToSolvency(borrowers[i].address, new__wethUsdcPrice));
           borrowerCollateral.push(await wethUsdcMixologist.userCollateralShare(borrowers[i].address));
        }

        await wethUsdcMixologist.connect(deployer).liquidate(
            borrowerAddresses,
            borrowParts,
            ethers.constants.AddressZero,
          )

        // all borrowers are solvents again
        await expect(
          wethUsdcMixologist.connect(deployer).liquidate(
            borrowerAddresses,
            borrowParts,
            ethers.constants.AddressZero,
          ),
        ).to.be.revertedWith('Mx: all are solvent');

        // check that liquidation happened
        const liquidatorBalanceDues = [];
        for(let i=0; i<liquidators.length; i++) {
            liquidatorBalanceDues.push(await liquidationQueue.balancesDue(liquidators[i].address));
            expect(liquidatorBalanceDues[i]).to.not.eq(0);
            expect(await yieldBox.balanceOf(liquidators[i].address, marketColId)).to.be.eq(BN(0));

            await liquidationQueue.connect(liquidators[i]).redeem(liquidators[i].address);
            await expect(liquidationQueue.connect(liquidators[i]).redeem(liquidators[i].address)).to.be.revertedWith('LQ: No balance due');

            // check liquidator received correct amount minus fees
            let balance = await yieldBox.balanceOf(liquidators[i].address, marketColId);
            let balanceWithFeeDeducted = liquidatorBalanceDues[i].sub(liquidatorBalanceDues[i].mul(5).div(1000));
            expect(balance).to.be.eq(await yieldBox.toShare(marketColId, balanceWithFeeDeducted, false));
        }

        // check borrower balance
        for (let i=0; i<borrowers.length; i++) {
            const currBorrowPart = await wethUsdcMixologist.userBorrowPart(borrowerAddresses[i]);
            expect(await liquidationQueue.balancesDue(borrowers[i].address)).to.be.eq(BN(0));
            // check borrow parts
            // due to rounding errors, we can't expect exact balance
            expect(currBorrowPart.sub(borrowParts[i].sub(amountToBeLiquidated[i]))).to.be.lt(currBorrowPart.div(100000));

            // check remaining collateral
            const LIQUIDATION_MULTIPLIER = BN(112000);
            const EXCHANGE_RATE_PRECISION = BN(1e18);
            const LIQUIDATION_MULTIPLIER_PRECISION = BN(1e5);
            const collateralShareToBeRemoved = await yieldBox.toShare(
                    marketColId,
                    amountToBeLiquidated[i].mul(new__wethUsdcPrice).mul(LIQUIDATION_MULTIPLIER).div(EXCHANGE_RATE_PRECISION.mul(LIQUIDATION_MULTIPLIER_PRECISION)),
           false
            );
            const currentCollateralShare = await wethUsdcMixologist.userCollateralShare(borrowers[i].address);
            // due to rounding errors, we can't expect exact balance
            expect(currentCollateralShare.sub(borrowerCollateral[i].sub(collateralShareToBeRemoved))).to.be.lt(currentCollateralShare.div(100000));
        }
    });
});

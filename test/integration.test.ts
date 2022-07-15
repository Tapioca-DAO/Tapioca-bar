import { ethers } from 'hardhat';
import { expect } from 'chai';
import {
    register,
    setBalance,
    usdcDepositAndAddCollateral,
    wethDepositAndAddAsset,
} from './test.utils';
import {
    ERC20Mock,
    LiquidationQueue,
    Mixologist,
    WETH9Mock,
    YieldBox,
} from '../typechain';
import { BigNumber, BigNumberish, Wallet } from 'ethers';

const NUM_LENDERS = 2;
const NUM_BORROWERS = 2;
const NUM_BIDDERS = 10;

async function createEOAs(num: number) {
    const accounts = [];
    for (let i = 0; i < num; i++) {
        accounts[i] = new ethers.Wallet(
            ethers.Wallet.createRandom().privateKey,
            ethers.provider,
        );
        await setBalance(accounts[i].address, 100);
    }
    return accounts;
}

async function makeBid(
    liquidator: Wallet,
    weth: WETH9Mock,
    liquidationQueue: LiquidationQueue,
    yieldBox: YieldBox,
    liquidatorBalance: BigNumberish,
    poolId: number,
) {
    const assetId = await liquidationQueue.lqAssetId();
    await setBalance(liquidator.address, 100000);
    await weth.connect(liquidator).freeMint(liquidatorBalance);
    await weth.connect(liquidator).approve(yieldBox.address, liquidatorBalance);
    await yieldBox
        .connect(liquidator)
        .depositAsset(
            assetId,
            liquidator.address,
            liquidator.address,
            liquidatorBalance,
            0,
        );
    await yieldBox
        .connect(liquidator)
        .setApprovalForAll(liquidationQueue.address, true);
    // bid
    expect(
        await liquidationQueue
            .connect(liquidator)
            .bid(liquidator.address, poolId, liquidatorBalance),
    ).to.emit(liquidationQueue, 'Bid');
}

async function depositAssetToLend(
    eoa: Wallet,
    weth: WETH9Mock,
    amount: BigNumber,
    yieldBox: YieldBox,
    wethUsdcMixologist: Mixologist,
) {
    await weth.connect(eoa).freeMint(amount);
    // We approve external operators
    await weth
        .connect(eoa)
        .approve(yieldBox.address, ethers.constants.MaxUint256);
    await yieldBox
        .connect(eoa)
        .setApprovalForAll(wethUsdcMixologist.address, true);
    // We lend WETH as deployer
    await wethDepositAndAddAsset(eoa, yieldBox, wethUsdcMixologist, amount);
}

async function depositCollateralAndBorrow(
    eoa: Wallet,
    collateralAmount: BigNumber,
    weth: WETH9Mock,
    usdc: ERC20Mock,
    yieldBox: YieldBox,
    wethUsdcMixologist: Mixologist,
    __wethUsdcPrice: BigNumber,
    doBorrow: boolean,
    doWithdraw: boolean,
) {
    // weth id
    const assetId = await wethUsdcMixologist.assetId();
    // We get asset
    await usdc.connect(eoa).freeMint(collateralAmount);
    // We approve external operators
    await usdc
        .connect(eoa)
        .approve(yieldBox.address, ethers.constants.MaxUint256);
    await yieldBox
        .connect(eoa)
        .setApprovalForAll(wethUsdcMixologist.address, true);
    await usdcDepositAndAddCollateral(
        eoa,
        yieldBox,
        wethUsdcMixologist,
        collateralAmount,
    );
    // const startWethBalance = await weth.balanceOf(eoa.address);
    // console.log('startWethBalance ' + startWethBalance);
    if (doBorrow) {
        // borrow
        const wethBorrowVal = collateralAmount
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));
        await wethUsdcMixologist
            .connect(eoa)
            .borrow(eoa.address, wethBorrowVal);
        // const yieldBoxBalance = await yieldBox.amountOf(eoa.address, assetId);
        // console.log('yieldBoxBalance ' + yieldBoxBalance);
        if (doWithdraw) {
            // withdraw from yieldBox
            await yieldBox
                .connect(eoa)
                .withdraw(assetId, eoa.address, eoa.address, wethBorrowVal, 0);
            // const endWethBalance = await weth.balanceOf(eoa.address);
            // console.log('endWethBalance ' + endWethBalance);
        }
    }
}

async function getAmountToSolvency(
    eoa: Wallet,
    wethUsdcMixologist: Mixologist,
) {
    return await wethUsdcMixologist.computeAssetAmountToSolvency(
        eoa.address,
        await wethUsdcMixologist.exchangeRate(),
    );
}

describe('integration test for LiquidationQueue', () => {
    it.only('should test different cases for loan liquidation using lq', async () => {
        const {
            BN,
            usdc,
            weth,
            liquidationQueue,
            wethUsdcMixologist,
            __wethUsdcPrice,
            yieldBox,
            LQ_META,
            jumpTime,
            wethUsdcOracle,
        } = await register();

        const lenders = await createEOAs(NUM_LENDERS);
        const borrowers = await createEOAs(NUM_BORROWERS);
        const liquidators = await createEOAs(NUM_BIDDERS);

        // 10eth
        const wethMintVal = BN(1e18).mul(10);
        // amount of equivalent USDC
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );

        for (let i = 0; i < NUM_LENDERS; i++) {
            // lender deposit funds
            await depositAssetToLend(
                lenders[i],
                weth,
                wethMintVal,
                yieldBox,
                wethUsdcMixologist,
            );
        }

        const borrowerAddresses = [];
        for (let i = 0; i < NUM_BORROWERS; i++) {
            borrowerAddresses[i] = borrowers[i].address;
            await depositCollateralAndBorrow(
                borrowers[i],
                usdcMintVal,
                weth,
                usdc,
                yieldBox,
                wethUsdcMixologist,
                __wethUsdcPrice,
                true,
                true,
            );
        }

        // add bids for all bidders for small amounts
        for (let i = 0; i < NUM_BIDDERS; i++) {
            const amount = LQ_META.minBidAmount.mul(120).div(100);
            await makeBid(
                liquidators[i],
                weth,
                liquidationQueue,
                yieldBox,
                amount,
                i % 10,
            );
            await makeBid(
                liquidators[i],
                weth,
                liquidationQueue,
                yieldBox,
                amount,
                (i % 10) + 1,
            );
        }

        const liquidator = liquidators[0];
        const poolId = 0 % 10;
        expect(
            (await liquidationQueue.bidPools(poolId, liquidator.address))
                .amount,
        ).to.equal(LQ_META.minBidAmount.mul(120).div(100));
        await jumpTime(LQ_META.activationTime);
        await liquidationQueue
            .connect(liquidator)
            .activateBid(liquidator.address, poolId);
        expect((await liquidationQueue.getNextAvailBidPool()).available).to.be
            .true;
        // Make some price movement
        await wethUsdcOracle.set(__wethUsdcPrice.mul(105).div(100));
        await wethUsdcMixologist.updateExchangeRate();
        // check if eoa is still solvent
        let assetAmountToSolvency = await getAmountToSolvency(
            borrowers[0],
            wethUsdcMixologist,
        );
        // console.log('assetAmountToSolvency', assetAmountToSolvency.toString());
        expect(assetAmountToSolvency).gte(0);
        // unable to liquidate because of low bid amount
        await expect(
            wethUsdcMixologist.liquidate(
                borrowerAddresses,
                [],
                ethers.constants.AddressZero,
            ),
        ).to.be.revertedWith('LQ: Unable to fully liquidate');

        // Make some price movement
        await wethUsdcOracle.set(__wethUsdcPrice);
        await wethUsdcMixologist.updateExchangeRate();
        // unable to liquidate because of no one is insolvent
        await expect(
            wethUsdcMixologist.liquidate(
                borrowerAddresses,
                [],
                ethers.constants.AddressZero,
            ),
        ).to.be.revertedWith('Mx: all are solvent');
        // remove bid for liquidator
        expect(
            await liquidationQueue
                .connect(liquidator)
                .removeBid(liquidator.address, 0, 0),
        ).to.emit(liquidationQueue, 'RemoveBid');

        // Make some price movement
        await wethUsdcOracle.set(__wethUsdcPrice.mul(102).div(100));
        await wethUsdcMixologist.updateExchangeRate();

        // todo liquidation by multiple bidders with redeem
        for (let i = 0; i < NUM_BIDDERS; i++) {
            await liquidationQueue
                .connect(liquidators[i])
                .activateBid(liquidators[i].address, (i % 10) + 1);
            await liquidationQueue
                .connect(liquidators[i])
                .activateBid(liquidators[i].address, i % 10);
        }
        assetAmountToSolvency = await getAmountToSolvency(
            borrowers[0],
            wethUsdcMixologist,
        );
        console.log('assetAmountToSolvency', assetAmountToSolvency.toString());
        // liquidate
        await wethUsdcMixologist.liquidate(
            borrowerAddresses,
            [],
            ethers.constants.AddressZero,
        );
        // await expect(
        //     wethUsdcMixologist.liquidate(
        //         borrowerAddresses,
        //         [],
        //         ethers.constants.AddressZero,
        //     ),
        // ).to.not.be.reverted;

        // todo test full liquidation by 1 bidder with redeem

        // todo no bidder available to liquidate

        // expect(
        //     await wethUsdcMixologist.liquidate(
        //         [eoa1.address],
        //         [],
        //         ethers.constants.AddressZero,
        //     ),
        // ).to.emit(liquidationQueue, 'ExecuteBids');
    });
});

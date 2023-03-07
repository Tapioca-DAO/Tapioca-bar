import { expect } from 'chai';
import { ethers } from 'hardhat';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { BigBang, USD0, WETH9Mock, yieldbox } from '../typechain';
import { BigNumber, BigNumberish } from 'ethers';
import { MarketsHelper } from '../typechain/contracts/singularity/MarketsHelper';
import { Singularity } from '../typechain/contracts/singularity/Singularity';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { time } from '@nomicfoundation/hardhat-network-helpers';

describe('e2e tests', () => {
    /*
    ---Lenders---
    - mint WETH
    - deposit WETH into YieldBox
    - add collateral to Weth-BigBang
    - deposit WETH into Weth-BigBang
    - borrow USD0 from Weth-BigBang
    - lend USD0 to Weth-Usd0-Singularity

    ---Borrowers---
    - add collateral to Weth-Usd0-Singularity
    - borrow USD0 from Weth-Usd0-Singularity
    
    ---1/2 Borrowers---
    - repay
    
    ---1/2 Borrowers---
    - get liquidated
    */
    it('should use minterSingularity and market to add, borrow and get liquidated', async () => {
        const {
            bar,
            wethBigBangMarket,
            usd0,
            createWethUsd0Singularity,
            marketsHelper,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            eoas,
            mediumRiskMC,
            usdc,
            multiSwapper,
            deployCurveStableToUsdoBidder,
            timeTravel,
        } = await loadFixture(register);

        const usdoStratregy = await bar.emptyStrategies(usd0.address);
        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            usdoStratregy,
            0,
        );

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const wethMintShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );
        const usdoBorrowVal = wethMintVal.mul(50).div(100).mul(1000);

        const eoasArr = eoas.slice();
        const middle = Math.ceil(eoasArr.length / 2);
        const lenders = eoasArr.splice(0, middle);
        const borrowers = eoasArr.splice(-middle);

        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usd0,
            false,
        );
        const { wethUsdoSingularity } = await createWethUsd0Singularity(
            usd0,
            weth,
            bar,
            usdoAssetId,
            wethAssetId,
            mediumRiskMC,
            yieldBox,
            stableToUsdoBidder,
            ethers.utils.parseEther('1'),
            false,
        );

        //get USD0 from minter and lent it WETH-USD0 Singularity
        await addUsd0Module(
            weth,
            wethMintVal,
            marketsHelper,
            wethBigBangMarket,
            usdoBorrowVal,
            yieldBox,
            usdoAssetId,
            wethUsdoSingularity,
            lenders,
        );

        await approvePlug(
            deployer,
            weth,
            wethUsdoSingularity,
            marketsHelper,
            yieldBox,
            ethers.constants.MaxUint256,
        );
        await setYieldBoxApprovalPlug(deployer, yieldBox, wethBigBangMarket);

        // add WETH and borrow USD0 from WETH-USD00-Singularity
        await borrowFromSingularityModule(
            borrowers,
            wethMintVal.div(10),
            usdoBorrowVal.div(10),
            weth,
            marketsHelper,
            wethUsdoSingularity,
            yieldBox,
            usdoAssetId,
            usd0,
        );

        const borrowersMiddle = Math.ceil(borrowers.length / 2);
        const repayArr = borrowers.splice(0, borrowersMiddle);
        const liquidateArr = borrowers.splice(-borrowersMiddle);

        // repay
        await repayModule(
            repayArr,
            usd0,
            deployer,
            usdoBorrowVal,
            marketsHelper,
            wethUsdoSingularity,
            yieldBox,
        );
        await usd0.setMinterStatus(deployer.address, true);
        await usd0.mint(deployer.address, usdoBorrowVal.mul(100));
        for (let i = 0; i < repayArr.length; i++) {
            const repayer = repayArr[i];
            const repayerUsd0Balance = await usd0.balanceOf(repayer.address);

            await usd0.transfer(repayer.address, repayerUsd0Balance.div(2)); //add extra USD0 for repayment

            await usd0
                .connect(repayer)
                .approve(
                    marketsHelper.address,
                    repayerUsd0Balance.add(repayerUsd0Balance.div(2)),
                );
            await wethUsdoSingularity
                .connect(repayer)
                .approve(
                    marketsHelper.address,
                    repayerUsd0Balance.add(repayerUsd0Balance.div(2)),
                );
            await marketsHelper
                .connect(repayer)
                .depositAndRepay(
                    wethUsdoSingularity.address,
                    repayerUsd0Balance.add(repayerUsd0Balance.div(2)),
                    repayerUsd0Balance,
                    true,
                );
        }

        //get liquidated
        await liquidateModule(
            liquidateArr,
            wethUsdoSingularity,
            usd0,
            yieldBox,
            wethAssetId,
            deployer,
            timeTravel,
            multiSwapper,
            marketsHelper,
        );
    });

    it('should try to use minterSingularity and market to add, borrow and get liquidated, but in a wrong order', async () => {
        const {
            bar,
            wethBigBangMarket,
            usd0,
            createWethUsd0Singularity,
            marketsHelper,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            eoas,
            mediumRiskMC,
            usdc,
            multiSwapper,
            deployCurveStableToUsdoBidder,
            timeTravel,
        } = await loadFixture(register);

        const usdoStratregy = await bar.emptyStrategies(usd0.address);
        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            usdoStratregy,
            0,
        );
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const wethMintShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );
        const eoasArr = eoas.slice();
        const usdoBorrowVal = wethMintVal.mul(50).div(100).mul(1000);
        const middle = Math.ceil(eoasArr.length / 2);
        const lenders = eoasArr.splice(0, middle);
        const borrowers = eoasArr.splice(-middle);

        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usd0,
            false,
        );
        const { wethUsdoSingularity } = await createWethUsd0Singularity(
            usd0,
            weth,
            bar,
            usdoAssetId,
            wethAssetId,
            mediumRiskMC,
            yieldBox,
            stableToUsdoBidder,
            ethers.utils.parseEther('1'),
            false,
        );

        await approvePlug(
            deployer,
            weth,
            wethUsdoSingularity,
            marketsHelper,
            yieldBox,
            ethers.constants.MaxUint256,
        );
        await setYieldBoxApprovalPlug(deployer, yieldBox, wethBigBangMarket);

        await mintWethPlug(borrowers[0], weth, wethMintVal);
        await approvePlug(
            borrowers[0],
            weth,
            wethUsdoSingularity,
            marketsHelper,
            yieldBox,
            wethMintVal,
        );

        //try to borrow without lender
        await depositAddCollateralAndBorrowPlug(
            borrowers[0],
            marketsHelper,
            wethUsdoSingularity,
            yieldBox,
            usdoAssetId,
            wethMintVal,
            usdoBorrowVal,
            true,
            ethers.utils.toUtf8Bytes(''),
            true,
            'SGL: min limit',
        );

        //try to borrow more than available
        await addUsd0Module(
            weth,
            wethMintVal,
            marketsHelper,
            wethBigBangMarket,
            usdoBorrowVal,
            yieldBox,
            usdoAssetId,
            wethUsdoSingularity,
            [lenders[0]],
        );
        await mintWethPlug(
            borrowers[borrowers.length - 1],
            weth,
            wethMintVal.mul(10),
        );
        await approvePlug(
            borrowers[borrowers.length - 1],
            weth,
            wethUsdoSingularity,
            marketsHelper,
            yieldBox,
            wethMintVal.mul(10),
        );
        await depositAddCollateralAndBorrowPlug(
            borrowers[borrowers.length - 1],
            marketsHelper,
            wethUsdoSingularity,
            yieldBox,
            usdoAssetId,
            wethMintVal.mul(10),
            usdoBorrowVal.mul(10),
            true,
            ethers.utils.toUtf8Bytes(''),
            true,
            'SGL: no return data',
        );

        const borrowersMiddle = Math.ceil(borrowers.length / 2);
        const repayArr = borrowers.splice(0, borrowersMiddle);
        const liquidateArr = borrowers.splice(-borrowersMiddle);

        //try to repay without borrowing
        await mintUsd0Plug(deployer, usd0, usdoBorrowVal);
        await transferPlug(deployer, repayArr[0].address, usd0, usdoBorrowVal); //add extra USD0 for repayment
        await approvePlug(
            repayArr[0],
            usd0,
            wethUsdoSingularity,
            marketsHelper,
            yieldBox,
            usdoBorrowVal,
        );
        await depositAndRepayPlug(
            repayArr[0],
            marketsHelper,
            wethUsdoSingularity,
            usdoBorrowVal,
            usdoBorrowVal,
            true,
            'SGL: no return data',
        );

        //try to liquidate
        const liquidationQueue = await ethers.getContractAt(
            'LiquidationQueue',
            await wethUsdoSingularity.liquidationQueue(),
        );
        const extraUsd0 = ethers.utils.parseEther('100000');

        await mintUsd0Plug(deployer, usd0, extraUsd0);
        await approvePlug(
            deployer,
            usd0,
            wethUsdoSingularity,
            marketsHelper,
            yieldBox,
            extraUsd0,
        );
        await depositToYieldBoxPlug(
            deployer,
            yieldBox,
            await liquidationQueue.lqAssetId(),
            extraUsd0,
        );

        await setYieldBoxApprovalPlug(deployer, yieldBox, liquidationQueue);
        await bidOnLQPlug(
            deployer,
            liquidationQueue,
            ethers.utils.parseEther('99999'),
        );
        await activateBidPlug(deployer, liquidationQueue, timeTravel);
        await liquidatePlug(
            liquidateArr,
            usd0,
            yieldBox,
            wethUsdoSingularity,
            wethAssetId,
            multiSwapper,
            true,
            'SGL: solvent',
        );
    });

    it('should borrow and repay in multipe small operations', async () => {
        const {
            bar,
            wethBigBangMarket,
            usd0,
            createWethUsd0Singularity,
            marketsHelper,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            eoas,
            mediumRiskMC,
            usdc,
            multiSwapper,
            deployCurveStableToUsdoBidder,
            timeTravel,
        } = await loadFixture(register);

        const usdoStratregy = await bar.emptyStrategies(usd0.address);
        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            usdoStratregy,
            0,
        );

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const wethMintShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );
        const usdoBorrowVal = wethMintVal.mul(50).div(100).mul(1000);

        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usd0,
            false,
        );
        const { wethUsdoSingularity } = await createWethUsd0Singularity(
            usd0,
            weth,
            bar,
            usdoAssetId,
            wethAssetId,
            mediumRiskMC,
            yieldBox,
            stableToUsdoBidder,
            ethers.utils.parseEther('1'),
            false,
        );

        //get USD0 from minter and lent it WETH-USD0 Singularity
        await addUsd0Module(
            weth,
            wethMintVal,
            marketsHelper,
            wethBigBangMarket,
            usdoBorrowVal,
            yieldBox,
            usdoAssetId,
            wethUsdoSingularity,
            [deployer],
        );

        const borrower = eoas[0];
        const borrowerCollateralValue = wethMintVal.div(100); //0.1 eth
        const borrowerBorrowValue = usdoBorrowVal.div(200); //50

        for (let i = 0; i < 100; i++) {
            // deposit, add collateral and borrow UDS0
            await mintWethPlug(borrower, weth, borrowerCollateralValue);
            await approvePlug(
                borrower,
                weth,
                wethUsdoSingularity,
                marketsHelper,
                yieldBox,
                borrowerCollateralValue,
            );

            const previousBorrowerUsd0Balance = await usd0.balanceOf(
                borrower.address,
            );
            await depositAddCollateralAndBorrowPlug(
                borrower,
                marketsHelper,
                wethUsdoSingularity,
                yieldBox,
                usdoAssetId,
                borrowerCollateralValue,
                borrowerBorrowValue,
                true,
                ethers.utils.toUtf8Bytes(''),
            );

            const finalBorrowerUsd0Balance = await usd0.balanceOf(
                borrower.address,
            );
            expect(finalBorrowerUsd0Balance.gt(previousBorrowerUsd0Balance)).to
                .be.true;
        }
        const totalBorrowed = await wethUsdoSingularity.userBorrowPart(
            borrower.address,
        );
        expect(totalBorrowed.gt(0)).to.be.true;

        const repayPart = totalBorrowed.div(50);
        await approvePlug(
            borrower,
            usd0,
            wethUsdoSingularity,
            marketsHelper,
            yieldBox,
            ethers.constants.MaxUint256,
        );

        for (let i = 0; i < 10; i++) {
            await depositAndRepayPlug(
                borrower,
                marketsHelper,
                wethUsdoSingularity,
                repayPart.mul(2),
                repayPart,
            );
        }

        const borrowedAfterRepayment = await wethUsdoSingularity.userBorrowPart(
            borrower.address,
        );
        expect(borrowedAfterRepayment.lt(totalBorrowed)).to.be.true;

        await mintUsd0Plug(borrower, usd0, borrowedAfterRepayment.mul(2));
        await depositAndRepayPlug(
            borrower,
            marketsHelper,
            wethUsdoSingularity,
            borrowedAfterRepayment.mul(2),
            borrowedAfterRepayment,
        );

        const finalBorrowed = await wethUsdoSingularity.userBorrowPart(
            borrower.address,
        );
        expect(finalBorrowed.eq(0)).to.be.true;
    });
});

//plugs
async function mintWethPlug(
    signer: SignerWithAddress,
    weth: WETH9Mock,
    val: BigNumberish,
) {
    await weth.connect(signer).freeMint(val);
    await time.increase(86500);
}

async function mintUsd0Plug(
    signer: SignerWithAddress,
    usd0: USD0,
    val: BigNumberish,
) {
    await usd0.setMinterStatus(signer.address, true);
    await usd0.mint(signer.address, val);
}

async function tokenApprovalPlug(
    signer: SignerWithAddress,
    token: any,
    marketsHelper: MarketsHelper,
    yieldBox: any,
    val: BigNumberish,
) {
    await token.connect(signer).approve(marketsHelper.address, val);
    await token.approve(yieldBox.address, val);
}

async function bigBangApprovePlug(
    signer: SignerWithAddress,
    token: any,
    BigBang: any,
    marketsHelper: MarketsHelper,
    yieldBox: any,
    val: BigNumberish,
) {
    await tokenApprovalPlug(signer, token, marketsHelper, yieldBox, val);
    await BigBang.connect(signer).updateOperator(marketsHelper.address, true);
}

async function approvePlug(
    signer: SignerWithAddress,
    token: any,
    Singularity: any,
    marketsHelper: MarketsHelper,
    yieldBox: any,
    val: BigNumberish,
) {
    await tokenApprovalPlug(signer, token, marketsHelper, yieldBox, val);
    await Singularity.connect(signer).approve(marketsHelper.address, val);
}

async function transferPlug(
    signer: SignerWithAddress,
    to: string,
    token: any,
    val: BigNumberish,
) {
    await token.connect(signer).transfer(to, val);
}

async function setYieldBoxApprovalPlug(
    signer: SignerWithAddress,
    yieldBox: any,
    on: any,
) {
    await yieldBox.connect(signer).setApprovalForAll(on.address, true);
}

async function depositAddCollateralAndBorrowPlug(
    signer: SignerWithAddress,
    marketsHelper: MarketsHelper,
    Singularity: any,
    yieldBox: any,
    assetId: BigNumberish,
    collateralValue: BigNumberish,
    borrowValue: BigNumberish,
    withdraw: boolean,
    withdrawData: any,
    shouldRevert?: boolean,
    revertMessage?: string,
) {
    let share, amount;

    if (shouldRevert) {
        await expect(
            marketsHelper
                .connect(signer)
                .depositAddCollateralAndBorrow(
                    Singularity.address,
                    collateralValue,
                    borrowValue,
                    {
                        deposit: true,
                        withdraw: withdraw,
                        withdrawData: withdrawData,
                        wrap: false,
                    },
                ),
        ).to.be.revertedWith(revertMessage!);
        return { share, amount };
    }
    await marketsHelper
        .connect(signer)
        .depositAddCollateralAndBorrow(
            Singularity.address,
            collateralValue,
            borrowValue,
            {
                deposit: true,
                withdraw: withdraw,
                withdrawData: withdrawData,
                wrap: false,
            },
        );
    share = await yieldBox.balanceOf(signer.address, assetId);
    amount = await yieldBox.toAmount(assetId, share, false);
    if (!withdraw) {
        expect(amount.eq(borrowValue)).to.be.true;
    } else {
        expect(amount.eq(0)).to.be.true;
    }
    return { share, amount };
}

async function addAssetToSingularityPlug(
    signer: SignerWithAddress,
    Singularity: any,
    shareValue: BigNumberish,
) {
    let addAssetFn = Singularity.interface.encodeFunctionData('addAsset', [
        signer.address,
        signer.address,
        false,
        shareValue,
    ]);
    await Singularity.connect(signer).execute([addAssetFn], true);

    const lentAssetBalance = await Singularity.balanceOf(signer.address);
    expect(lentAssetBalance.eq(shareValue)).to.be.true;
    return { lentAssetBalance };
}

async function depositAndRepayPlug(
    signer: SignerWithAddress,
    marketsHelper: MarketsHelper,
    Singularity: Singularity,
    depositVal: BigNumberish,
    repayVal: BigNumberish,
    shouldRevert?: boolean,
    revertMessage?: string,
) {
    if (shouldRevert) {
        await expect(
            marketsHelper
                .connect(signer)
                .depositAndRepay(
                    Singularity.address,
                    depositVal,
                    repayVal,
                    true,
                ),
        ).to.be.revertedWith(revertMessage!);
        return;
    }

    const previousBorrowAmount = await Singularity.userBorrowPart(
        signer.address,
    );
    await marketsHelper
        .connect(signer)
        .depositAndRepay(Singularity.address, depositVal, repayVal, true);
    const finalBorrowAmount = await Singularity.userBorrowPart(signer.address);

    expect(finalBorrowAmount.lt(previousBorrowAmount)).to.be.true;
}

async function priceDropPlug(
    signer: SignerWithAddress,
    Singularity: Singularity,
) {
    const oracle = await ethers.getContractAt(
        'OracleMock',
        await Singularity.oracle(),
    );
    const oracleData = await Singularity.oracleData();
    const currentPrice = (await oracle.peek(oracleData))[1];
    const priceDrop = currentPrice.mul(80).div(100);
    await oracle.connect(signer).set(currentPrice.add(priceDrop));
}

async function depositToYieldBoxPlug(
    signer: SignerWithAddress,
    yieldBox: any,
    assetId: BigNumberish,
    val: BigNumberish,
) {
    await yieldBox
        .connect(signer)
        .depositAsset(assetId, signer.address, signer.address, val, 0);
}

async function bidOnLQPlug(
    signer: SignerWithAddress,
    liquidationQueue: any,
    val: BigNumberish,
) {
    await expect(
        liquidationQueue
            .connect(signer)
            .bid(signer.address, 1, ethers.utils.parseEther('99999')),
    ).to.emit(liquidationQueue, 'Bid');
}

async function activateBidPlug(
    signer: SignerWithAddress,
    liquidationQueue: any,
    timeTravel: (amount: number) => {},
) {
    await timeTravel(10_000);
    await expect(
        liquidationQueue.connect(signer).activateBid(signer.address, 1),
    ).to.emit(liquidationQueue, 'ActivateBid');
}

async function liquidatePlug(
    liquidateArr: any[],
    asset: any,
    yieldBox: any,
    Singularity: Singularity,
    collateralId: BigNumberish,
    multiSwapper: any,
    shouldRevert?: boolean,
    revertMessage?: string,
) {
    const liquidateValues = [];
    const liquidateAddresses = [];
    const previousCollaterals = [];
    for (let i = 0; i < liquidateArr.length; i++) {
        const lq = liquidateArr[i];
        const amount = await asset.balanceOf(lq.address);
        liquidateValues.push(amount);
        liquidateAddresses.push(lq.address);
        const collateralShare = await Singularity.userCollateralShare(
            lq.address,
        );
        const collateralAmount = await yieldBox.toAmount(
            collateralId,
            collateralShare,
            false,
        );
        previousCollaterals.push(collateralAmount);
    }

    const data = new ethers.utils.AbiCoder().encode(['uint256'], [1]);

    if (shouldRevert) {
        await expect(
            Singularity.liquidate(
                liquidateAddresses,
                liquidateValues,
                multiSwapper.address,
                data,
                data,
            ),
        ).to.be.revertedWith(revertMessage!);
        return;
    }
    await Singularity.liquidate(
        liquidateAddresses,
        liquidateValues,
        multiSwapper.address,
        data,
        data,
    );

    for (let i = 0; i < liquidateArr.length; i++) {
        const lq = liquidateArr[i];
        const collateralShare = await Singularity.userCollateralShare(
            lq.address,
        );
        const collateralAmount = await yieldBox.toAmount(
            collateralId,
            collateralShare,
            false,
        );
        expect(collateralAmount.lt(previousCollaterals[i])).to.be.true;
    }
}

//modules
async function addUsd0Module(
    weth: WETH9Mock,
    wethMintVal: BigNumberish,
    marketsHelper: MarketsHelper,
    wethBigBangMarket: BigBang,
    usdoBorrowVal: BigNumberish,
    yieldBox: any,
    usdoAssetId: BigNumberish,
    wethUsdoSingularity: Singularity,
    lenders: any[],
) {
    // deposit, add collateral and borrow UDS0
    for (let i = 0; i < lenders.length; i++) {
        const lender = lenders[i];

        await mintWethPlug(lender, weth, wethMintVal);
        await bigBangApprovePlug(
            lender,
            weth,
            wethBigBangMarket,
            marketsHelper,
            yieldBox,
            wethMintVal,
        );

        const { share, amount } = await depositAddCollateralAndBorrowPlug(
            lender,
            marketsHelper,
            wethBigBangMarket,
            yieldBox,
            usdoAssetId,
            wethMintVal,
            usdoBorrowVal,
            false,
            ethers.utils.toUtf8Bytes(''),
        );

        //lend USD0 to WethUSD0Singularity
        await setYieldBoxApprovalPlug(lender, yieldBox, wethUsdoSingularity);
        await addAssetToSingularityPlug(
            lender,
            wethUsdoSingularity,
            share.div(2),
        );
    }
}

async function borrowFromSingularityModule(
    borrowers: any[],
    wethMintVal: BigNumber,
    usdoBorrowVal: BigNumber,
    weth: WETH9Mock,
    marketsHelper: MarketsHelper,
    wethUsdoSingularity: Singularity,
    yieldBox: any,
    usdoAssetId: BigNumberish,
    usd0: USD0,
) {
    for (let i = 0; i < borrowers.length; i++) {
        const borrower = borrowers[i];

        // deposit, add collateral and borrow UDS0
        await mintWethPlug(borrower, weth, wethMintVal);
        await approvePlug(
            borrower,
            weth,
            wethUsdoSingularity,
            marketsHelper,
            yieldBox,
            wethMintVal,
        );

        await depositAddCollateralAndBorrowPlug(
            borrower,
            marketsHelper,
            wethUsdoSingularity,
            yieldBox,
            usdoAssetId,
            wethMintVal,
            usdoBorrowVal,
            true,
            ethers.utils.toUtf8Bytes(''),
        );

        const borrowerUsd0Balance = await usd0.balanceOf(borrower.address);
        expect(borrowerUsd0Balance.eq(usdoBorrowVal)).to.be.true;
    }
}

async function repayModule(
    repayArr: any[],
    usd0: USD0,
    deployer: SignerWithAddress,
    usdoBorrowVal: BigNumber,
    marketsHelper: MarketsHelper,
    wethUsdoSingularity: Singularity,
    yieldBox: any,
) {
    await mintUsd0Plug(deployer, usd0, usdoBorrowVal.mul(100));

    for (let i = 0; i < repayArr.length; i++) {
        const repayer = repayArr[i];

        const repayerUsd0Balance = await usd0.balanceOf(repayer.address);
        const transferVal = repayerUsd0Balance.div(2);

        await transferPlug(deployer, repayer.address, usd0, transferVal); //add extra USD0 for repayment

        await approvePlug(
            repayer,
            usd0,
            wethUsdoSingularity,
            marketsHelper,
            yieldBox,
            repayerUsd0Balance.add(transferVal),
        );

        await depositAndRepayPlug(
            repayer,
            marketsHelper,
            wethUsdoSingularity,
            repayerUsd0Balance.add(transferVal),
            repayerUsd0Balance,
        );
    }
}

async function liquidateModule(
    liquidateArr: any[],
    wethUsdoSingularity: Singularity,
    usd0: USD0,
    yieldBox: any,
    wethAssetId: BigNumberish,
    deployer: SignerWithAddress,
    timeTravel: any,
    multiSwapper: any,
    marketsHelper: any,
) {
    const liquidationQueue = await ethers.getContractAt(
        'LiquidationQueue',
        await wethUsdoSingularity.liquidationQueue(),
    );
    const extraUsd0 = ethers.utils.parseEther('100000');

    await priceDropPlug(deployer, wethUsdoSingularity);

    await mintUsd0Plug(deployer, usd0, extraUsd0);
    await approvePlug(
        deployer,
        usd0,
        wethUsdoSingularity,
        marketsHelper,
        yieldBox,
        extraUsd0,
    );
    await depositToYieldBoxPlug(
        deployer,
        yieldBox,
        await liquidationQueue.lqAssetId(),
        extraUsd0,
    );

    await setYieldBoxApprovalPlug(deployer, yieldBox, liquidationQueue);
    await bidOnLQPlug(
        deployer,
        liquidationQueue,
        ethers.utils.parseEther('99999'),
    );
    await activateBidPlug(deployer, liquidationQueue, timeTravel);

    await liquidatePlug(
        liquidateArr,
        usd0,
        yieldBox,
        wethUsdoSingularity,
        wethAssetId,
        multiSwapper,
    );
}

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { MinterMixologist, USD0, WETH9Mock, yieldbox } from '../typechain';
import { BigNumber, BigNumberish } from 'ethers';
import { MixologistHelper } from '../typechain/contracts/mixologist/MixologistHelper';
import { Mixologist } from '../typechain/contracts/mixologist/Mixologist';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('e2e tests', () => {
    /*
    ---Lenders---
    - mint WETH
    - deposit WETH into YieldBox
    - add collateral to Weth-MinterMixologist
    - deposit WETH into Weth-MinterMixologist
    - borrow USD0 from Weth-MinterMixologist
    - lend USD0 to Weth-Usd0-Mixologist

    ---Borrowers---
    - add collateral to Weth-Usd0-Mixologist
    - borrow USD0 from Weth-Usd0-Mixologist
    
    ---1/2 Borrowers---
    - repay
    
    ---1/2 Borrowers---
    - get liquidated
    */
    it('should use minterMixologist and market to add, borrow and get liquidated', async () => {
        const {
            bar,
            wethMinterMixologist,
            usd0,
            createWethUsd0Mixologist,
            mixologistHelper,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            eoas,
            tapSwapPath,
            mediumRiskMC,
            usdc,
            multiSwapper,
            deployCurveStableToUsdoBidder,
            timeTravel,
        } = await loadFixture(register);

        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            ethers.constants.AddressZero,
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
        const { wethUsdoMixologist } = await createWethUsd0Mixologist(
            usd0,
            weth,
            bar,
            usdoAssetId,
            wethAssetId,
            tapSwapPath,
            mediumRiskMC,
            yieldBox,
            usdc,
            stableToUsdoBidder,
            false,
        );

        //get USD0 from minter and lent it WETH-USD0 mixologist
        await addUsd0Module(
            weth,
            wethMintVal,
            mixologistHelper,
            wethMinterMixologist,
            usdoBorrowVal,
            yieldBox,
            usdoAssetId,
            wethUsdoMixologist,
            lenders,
        );

        await approvePlug(
            deployer,
            weth,
            wethUsdoMixologist,
            mixologistHelper,
            yieldBox,
            ethers.constants.MaxUint256,
        );
        await setYieldBoxApprovalPlug(deployer, yieldBox, wethMinterMixologist);

        // add WETH and borrow USD0 from WETH-USD00-Mixologist
        await borrowFromMixologistModule(
            borrowers,
            wethMintVal.div(10),
            usdoBorrowVal.div(10),
            weth,
            mixologistHelper,
            wethUsdoMixologist,
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
            mixologistHelper,
            wethUsdoMixologist,
            yieldBox,
        );
        await usd0.setMinterStatus(deployer.address, true);
        await usd0.mint(deployer.address, usdoBorrowVal.mul(100));
        for (var i = 0; i < repayArr.length; i++) {
            const repayer = repayArr[i];
            const repayerUsd0Balance = await usd0.balanceOf(repayer.address);

            await usd0.transfer(repayer.address, repayerUsd0Balance.div(2)); //add extra USD0 for repayment

            await usd0
                .connect(repayer)
                .approve(
                    mixologistHelper.address,
                    repayerUsd0Balance.add(repayerUsd0Balance.div(2)),
                );
            await wethUsdoMixologist
                .connect(repayer)
                .approve(
                    mixologistHelper.address,
                    repayerUsd0Balance.add(repayerUsd0Balance.div(2)),
                );
            await mixologistHelper
                .connect(repayer)
                .depositAndRepay(
                    wethUsdoMixologist.address,
                    repayerUsd0Balance.add(repayerUsd0Balance.div(2)),
                    repayerUsd0Balance,
                );
        }

        //get liquidated
        await liquidateModule(
            liquidateArr,
            wethUsdoMixologist,
            usd0,
            yieldBox,
            wethAssetId,
            deployer,
            timeTravel,
            multiSwapper,
            mixologistHelper,
        );
    });

    it('should try to use minterMixologist and market to add, borrow and get liquidated, but in a wrong order', async () => {
        const {
            bar,
            wethMinterMixologist,
            usd0,
            createWethUsd0Mixologist,
            mixologistHelper,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            eoas,
            tapSwapPath,
            mediumRiskMC,
            usdc,
            multiSwapper,
            deployCurveStableToUsdoBidder,
            timeTravel,
        } = await loadFixture(register);

        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            ethers.constants.AddressZero,
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
        const { wethUsdoMixologist } = await createWethUsd0Mixologist(
            usd0,
            weth,
            bar,
            usdoAssetId,
            wethAssetId,
            tapSwapPath,
            mediumRiskMC,
            yieldBox,
            usdc,
            stableToUsdoBidder,
            false,
        );

        await approvePlug(
            deployer,
            weth,
            wethUsdoMixologist,
            mixologistHelper,
            yieldBox,
            ethers.constants.MaxUint256,
        );
        await setYieldBoxApprovalPlug(deployer, yieldBox, wethMinterMixologist);

        await mintWethPlug(borrowers[0], weth, wethMintVal);
        await approvePlug(
            borrowers[0],
            weth,
            wethUsdoMixologist,
            mixologistHelper,
            yieldBox,
            wethMintVal,
        );

        //try to borrow without lender
        await depositAddCollateralAndBorrowPlug(
            borrowers[0],
            mixologistHelper,
            wethUsdoMixologist,
            yieldBox,
            usdoAssetId,
            wethMintVal,
            usdoBorrowVal,
            true,
            ethers.utils.toUtf8Bytes(''),
            true,
            'Mx: min limit',
        );

        //try to borrow more than available
        await addUsd0Module(
            weth,
            wethMintVal,
            mixologistHelper,
            wethMinterMixologist,
            usdoBorrowVal,
            yieldBox,
            usdoAssetId,
            wethUsdoMixologist,
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
            wethUsdoMixologist,
            mixologistHelper,
            yieldBox,
            wethMintVal.mul(10),
        );
        await depositAddCollateralAndBorrowPlug(
            borrowers[borrowers.length - 1],
            mixologistHelper,
            wethUsdoMixologist,
            yieldBox,
            usdoAssetId,
            wethMintVal.mul(10),
            usdoBorrowVal.mul(10),
            true,
            ethers.utils.toUtf8Bytes(''),
            true,
            'Mx: no return data',
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
            wethUsdoMixologist,
            mixologistHelper,
            yieldBox,
            usdoBorrowVal,
        );
        await depositAndRepayPlug(
            repayArr[0],
            mixologistHelper,
            wethUsdoMixologist,
            usdoBorrowVal,
            usdoBorrowVal,
            true,
            'Mx: no return data',
        );

        //try to liquidate
        const liquidationQueue = await ethers.getContractAt(
            'LiquidationQueue',
            await wethUsdoMixologist.liquidationQueue(),
        );
        const extraUsd0 = ethers.utils.parseEther('100000');

        await mintUsd0Plug(deployer, usd0, extraUsd0);
        await approvePlug(
            deployer,
            usd0,
            wethUsdoMixologist,
            mixologistHelper,
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
            wethUsdoMixologist,
            wethAssetId,
            multiSwapper,
            true,
            'Mx: solvent',
        );
    });

    it('should borrow and repay in multipe small operations', async () => {
        const {
            bar,
            wethMinterMixologist,
            usd0,
            createWethUsd0Mixologist,
            mixologistHelper,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            eoas,
            tapSwapPath,
            mediumRiskMC,
            usdc,
            multiSwapper,
            deployCurveStableToUsdoBidder,
            timeTravel,
        } = await loadFixture(register);

        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            ethers.constants.AddressZero,
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
        const { wethUsdoMixologist } = await createWethUsd0Mixologist(
            usd0,
            weth,
            bar,
            usdoAssetId,
            wethAssetId,
            tapSwapPath,
            mediumRiskMC,
            yieldBox,
            usdc,
            stableToUsdoBidder,
            false,
        );

        //get USD0 from minter and lent it WETH-USD0 mixologist
        await addUsd0Module(
            weth,
            wethMintVal,
            mixologistHelper,
            wethMinterMixologist,
            usdoBorrowVal,
            yieldBox,
            usdoAssetId,
            wethUsdoMixologist,
            [deployer],
        );

        const borrower = eoas[0];
        const borrowerCollateralValue = wethMintVal.div(100); //0.1 eth
        const borrowerBorrowValue = usdoBorrowVal.div(200); //50

        for (var i = 0; i < 100; i++) {
            // deposit, add collateral and borrow UDS0
            await mintWethPlug(borrower, weth, borrowerCollateralValue);
            await approvePlug(
                borrower,
                weth,
                wethUsdoMixologist,
                mixologistHelper,
                yieldBox,
                borrowerCollateralValue,
            );

            const previousBorrowerUsd0Balance = await usd0.balanceOf(
                borrower.address,
            );
            await depositAddCollateralAndBorrowPlug(
                borrower,
                mixologistHelper,
                wethUsdoMixologist,
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
        const totalBorrowed = await wethUsdoMixologist.userBorrowPart(
            borrower.address,
        );
        expect(totalBorrowed.gt(0)).to.be.true;

        const repayPart = totalBorrowed.div(50);
        await approvePlug(
            borrower,
            usd0,
            wethUsdoMixologist,
            mixologistHelper,
            yieldBox,
            ethers.constants.MaxUint256,
        );

        for (var i = 0; i < 10; i++) {
            await depositAndRepayPlug(borrower, mixologistHelper, wethUsdoMixologist, repayPart.mul(2), repayPart);
        }

        const borrowedAfterRepayment = await wethUsdoMixologist.userBorrowPart(
            borrower.address,
        );
        expect(borrowedAfterRepayment.lt(totalBorrowed)).to.be.true;

        await mintUsd0Plug(borrower, usd0, borrowedAfterRepayment.mul(2));
        await depositAndRepayPlug(borrower, mixologistHelper, wethUsdoMixologist, borrowedAfterRepayment.mul(2), borrowedAfterRepayment);

        const finalBorrowed = await wethUsdoMixologist.userBorrowPart(
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
}

async function mintUsd0Plug(
    signer: SignerWithAddress,
    usd0: USD0,
    val: BigNumberish,
) {
    await usd0.setMinterStatus(signer.address, true);
    await usd0.mint(signer.address, val);
}

async function approvePlug(
    signer: SignerWithAddress,
    token: any,
    mixologist: any,
    mixologistHelper: MixologistHelper,
    yieldBox: any,
    val: BigNumberish,
) {
    await token.connect(signer).approve(mixologistHelper.address, val);
    await mixologist.connect(signer).approve(mixologistHelper.address, val);
    await token.approve(yieldBox.address, val);
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
    mixologistHelper: MixologistHelper,
    mixologist: any,
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
            mixologistHelper
                .connect(signer)
                .depositAddCollateralAndBorrow(
                    mixologist.address,
                    collateralValue,
                    borrowValue,
                    withdraw,
                    withdrawData,
                ),
        ).to.be.revertedWith(revertMessage!);
        return { share, amount };
    }
    await mixologistHelper
        .connect(signer)
        .depositAddCollateralAndBorrow(
            mixologist.address,
            collateralValue,
            borrowValue,
            withdraw,
            withdrawData,
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

async function addAssetToMixologistPlug(
    signer: SignerWithAddress,
    mixologist: any,
    shareValue: BigNumberish,
) {
    let addAssetFn = mixologist.interface.encodeFunctionData('addAsset', [
        signer.address,
        signer.address,
        false,
        shareValue,
    ]);
    await mixologist.connect(signer).execute([addAssetFn], true);

    const lentAssetBalance = await mixologist.balanceOf(signer.address);
    expect(lentAssetBalance.eq(shareValue)).to.be.true;
    return { lentAssetBalance };
}

async function depositAndRepayPlug(
    signer: SignerWithAddress,
    mixologistHelper: MixologistHelper,
    mixologist: Mixologist,
    depositVal: BigNumberish,
    repayVal: BigNumberish,
    shouldRevert?: boolean,
    revertMessage?: string,
) {
    if (shouldRevert) {
        await expect(
            mixologistHelper
                .connect(signer)
                .depositAndRepay(mixologist.address, depositVal, repayVal),
        ).to.be.revertedWith(revertMessage!);
        return;
    }

    const previousBorrowAmount = await mixologist.userBorrowPart(
        signer.address,
    );
    await mixologistHelper
        .connect(signer)
        .depositAndRepay(mixologist.address, depositVal, repayVal);
    const finalBorrowAmount = await mixologist.userBorrowPart(signer.address);

    expect(finalBorrowAmount.lt(previousBorrowAmount)).to.be.true;
}

async function priceDropPlug(
    signer: SignerWithAddress,
    mixologist: Mixologist,
) {
    const oracle = await ethers.getContractAt(
        'OracleMock',
        await mixologist.oracle(),
    );
    const oracleData = await mixologist.oracleData();
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
    mixologist: Mixologist,
    collateralId: BigNumberish,
    multiSwapper: any,
    shouldRevert?: boolean,
    revertMessage?: string,
) {
    const liquidateValues = [];
    const liquidateAddresses = [];
    const previousCollaterals = [];
    for (var i = 0; i < liquidateArr.length; i++) {
        const lq = liquidateArr[i];
        const amount = await asset.balanceOf(lq.address);
        liquidateValues.push(amount);
        liquidateAddresses.push(lq.address);
        const collateralShare = await mixologist.userCollateralShare(
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
            mixologist.liquidate(
                liquidateAddresses,
                liquidateValues,
                multiSwapper.address,
                data,
                data,
            ),
        ).to.be.revertedWith(revertMessage!);
        return;
    }
    await mixologist.liquidate(
        liquidateAddresses,
        liquidateValues,
        multiSwapper.address,
        data,
        data,
    );

    for (var i = 0; i < liquidateArr.length; i++) {
        const lq = liquidateArr[i];
        const collateralShare = await mixologist.userCollateralShare(
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
    mixologistHelper: MixologistHelper,
    wethMinterMixologist: MinterMixologist,
    usdoBorrowVal: BigNumberish,
    yieldBox: any,
    usdoAssetId: BigNumberish,
    wethUsdoMixologist: Mixologist,
    lenders: any[],
) {
    // deposit, add collateral and borrow UDS0
    for (var i = 0; i < lenders.length; i++) {
        const lender = lenders[i];

        await mintWethPlug(lender, weth, wethMintVal);
        await approvePlug(
            lender,
            weth,
            wethMinterMixologist,
            mixologistHelper,
            yieldBox,
            wethMintVal,
        );

        const { share, amount } = await depositAddCollateralAndBorrowPlug(
            lender,
            mixologistHelper,
            wethMinterMixologist,
            yieldBox,
            usdoAssetId,
            wethMintVal,
            usdoBorrowVal,
            false,
            ethers.utils.toUtf8Bytes(''),
        );

        //lend USD0 to WethUSD0Mixologist
        await setYieldBoxApprovalPlug(lender, yieldBox, wethUsdoMixologist);
        await addAssetToMixologistPlug(
            lender,
            wethUsdoMixologist,
            share.div(2),
        );
    }
}

async function borrowFromMixologistModule(
    borrowers: any[],
    wethMintVal: BigNumber,
    usdoBorrowVal: BigNumber,
    weth: WETH9Mock,
    mixologistHelper: MixologistHelper,
    wethUsdoMixologist: Mixologist,
    yieldBox: any,
    usdoAssetId: BigNumberish,
    usd0: USD0,
) {
    for (var i = 0; i < borrowers.length; i++) {
        const borrower = borrowers[i];

        // deposit, add collateral and borrow UDS0
        await mintWethPlug(borrower, weth, wethMintVal);
        await approvePlug(
            borrower,
            weth,
            wethUsdoMixologist,
            mixologistHelper,
            yieldBox,
            wethMintVal,
        );

        await depositAddCollateralAndBorrowPlug(
            borrower,
            mixologistHelper,
            wethUsdoMixologist,
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
    mixologistHelper: MixologistHelper,
    wethUsdoMixologist: Mixologist,
    yieldBox: any,
) {
    await mintUsd0Plug(deployer, usd0, usdoBorrowVal.mul(100));

    for (var i = 0; i < repayArr.length; i++) {
        const repayer = repayArr[i];

        const repayerUsd0Balance = await usd0.balanceOf(repayer.address);
        const transferVal = repayerUsd0Balance.div(2);

        await transferPlug(deployer, repayer.address, usd0, transferVal); //add extra USD0 for repayment

        await approvePlug(
            repayer,
            usd0,
            wethUsdoMixologist,
            mixologistHelper,
            yieldBox,
            repayerUsd0Balance.add(transferVal),
        );

        await depositAndRepayPlug(
            repayer,
            mixologistHelper,
            wethUsdoMixologist,
            repayerUsd0Balance.add(transferVal),
            repayerUsd0Balance,
        );
    }
}

async function liquidateModule(
    liquidateArr: any[],
    wethUsdoMixologist: Mixologist,
    usd0: USD0,
    yieldBox: any,
    wethAssetId: BigNumberish,
    deployer: SignerWithAddress,
    timeTravel: any,
    multiSwapper: any,
    mixologistHelper: any,
) {
    const liquidationQueue = await ethers.getContractAt(
        'LiquidationQueue',
        await wethUsdoMixologist.liquidationQueue(),
    );
    const extraUsd0 = ethers.utils.parseEther('100000');

    await priceDropPlug(deployer, wethUsdoMixologist);

    await mintUsd0Plug(deployer, usd0, extraUsd0);
    await approvePlug(
        deployer,
        usd0,
        wethUsdoMixologist,
        mixologistHelper,
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
        wethUsdoMixologist,
        wethAssetId,
        multiSwapper,
    );
}

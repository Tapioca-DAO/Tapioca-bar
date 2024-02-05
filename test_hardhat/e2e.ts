import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';
import { ethers } from 'hardhat';
import { BigBang, ERC20, ERC20Mock, USDO, Singularity } from '../typechain';
import { BN, register } from './test.utils';

import OracleMockArtifact from '@tapioca-sdk/artifacts/tapioca-mocks/OracleMock.json';
import { MagnetarV2 } from '@tapioca-sdk/typechain/tapioca-periphery';
import cluster from 'cluster';

describe.skip('e2e tests', () => {
    /*
    ---Lenders---
    - mint WETH
    - deposit WETH into YieldBox
    - add collateral to Weth-BigBang
    - deposit WETH into Weth-BigBang
    - borrow USDO from Weth-BigBang
    - lend USDO to Weth-Usd0-Singularity

    ---Borrowers---
    - add collateral to Weth-Usd0-Singularity
    - borrow USDO from Weth-Usd0-Singularity
    
    ---1/2 Borrowers---
    - repay
    
    ---1/2 Borrowers---
    - get liquidated
    */
    it('should use minterSingularity and market to add, borrow and get liquidated', async () => {
        const {
            penrose,
            wethBigBangMarket,
            usd0,
            createWethUsd0Singularity,
            magnetar,
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
            cluster,
        } = await loadFixture(register);

        const usdoStratregy = await penrose.emptyStrategies(usd0.address);
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
            yieldBox,
            usdc,
            usd0,
            false,
        );
        const { wethUsdoSingularity } = await createWethUsd0Singularity(
            usd0,
            weth,
            penrose,
            usdoAssetId,
            wethAssetId,
            mediumRiskMC,
            yieldBox,
            stableToUsdoBidder,
            multiSwapper.address,
            cluster.address,
            ethers.utils.parseEther('1'),
            false,
        );
        await cluster['updateContract(uint16,address,bool)'](
            31337,
            magnetar.address,
            true,
        );
        await cluster['updateContract(uint16,address,bool)'](
            31337,
            wethUsdoSingularity.address,
            true,
        );
        await cluster['updateContract(uint16,address,bool)'](
            31337,
            wethBigBangMarket.address,
            true,
        );
        await cluster['updateContract(uint16,address,bool)'](
            31337,
            yieldBox.address,
            true,
        );
        //get USDO from minter and lent it WETH-USDO Singularity
        await addUsd0Module(
            weth,
            wethMintVal,
            magnetar,
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
            magnetar,
            yieldBox,
            await wethUsdoSingularity.collateralId(),
            ethers.constants.MaxUint256,
        );
        await setYieldBoxApprovalPlug(deployer, yieldBox, wethBigBangMarket);

        // add WETH and borrow USDO from WETH-USD00-Singularity
        await borrowFromSingularityModule(
            borrowers,
            wethMintVal.div(10),
            usdoBorrowVal.div(10),
            weth,
            magnetar,
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
            magnetar,
            wethUsdoSingularity,
            yieldBox,
        );
        await usd0.setMinterStatus(deployer.address, true);
        await usd0.mint(deployer.address, usdoBorrowVal.mul(100));

        for (let i = 0; i < repayArr.length; i++) {
            const repayer = repayArr[i];
            const repayerUsd0Balance = await usd0.balanceOf(repayer.address);

            await usd0.transfer(repayer.address, repayerUsd0Balance.div(2)); //add extra USDO for repayment

            await usd0
                .connect(repayer)
                .approve(
                    magnetar.address,
                    repayerUsd0Balance.add(repayerUsd0Balance.div(2)),
                );

            await magnetar
                .connect(repayer)
                .depositRepayAndRemoveCollateralFromMarket(
                    wethUsdoSingularity.address,
                    repayer.address,
                    repayerUsd0Balance.add(repayerUsd0Balance.div(2)),
                    repayerUsd0Balance,
                    0,
                    true,
                    {
                        withdraw: false,
                        withdrawLzFeeAmount: 0,
                        withdrawOnOtherChain: false,
                        withdrawLzChainId: 0,
                        withdrawAdapterParams: ethers.utils.toUtf8Bytes(''),
                        unwrap: false,
                        refundAddress: repayer.address,
                        zroPaymentAddress: ethers.constants.AddressZero,
                    },
                );
        }
    });

    //skipped as it takes too much time to run
    it.skip('should borrow and repay in multipe small operations', async () => {
        const {
            penrose,
            wethBigBangMarket,
            usd0,
            createWethUsd0Singularity,
            magnetar,
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
            cluster,
        } = await loadFixture(register);

        const usdoStratregy = await penrose.emptyStrategies(usd0.address);
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
            yieldBox,
            usdc,
            usd0,
            false,
        );
        const { wethUsdoSingularity } = await createWethUsd0Singularity(
            usd0,
            weth,
            penrose,
            usdoAssetId,
            wethAssetId,
            mediumRiskMC,
            yieldBox,
            stableToUsdoBidder,
            multiSwapper.address,
            cluster.address,
            ethers.utils.parseEther('1'),
            false,
        );

        //get USDO from minter and lent it WETH-USDO Singularity
        await addUsd0Module(
            weth,
            wethMintVal,
            magnetar,
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
                magnetar,
                yieldBox,
                await wethUsdoSingularity.collateralId(),
                borrowerCollateralValue,
            );

            const previousBorrowerUsd0Balance = await usd0.balanceOf(
                borrower.address,
            );

            await depositAddCollateralAndBorrowPlug(
                borrower,
                magnetar,
                wethUsdoSingularity,
                yieldBox,
                usdoAssetId,
                borrowerCollateralValue,
                borrowerBorrowValue,
                encodeMarketHelperWithdrawData(
                    false,
                    0,
                    borrower.address,
                    '0x00',
                ),
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
            magnetar,
            yieldBox,
            await wethUsdoSingularity.collateralId(),
            ethers.constants.MaxUint256,
        );

        for (let i = 0; i < 10; i++) {
            await depositAndRepayPlug(
                borrower,
                magnetar,
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
            magnetar,
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
    weth: ERC20Mock,
    val: BigNumberish,
) {
    await weth.connect(signer).freeMint(val);
    await time.increase(86500);
}

async function mintUsd0Plug(
    signer: SignerWithAddress,
    usd0: USDO,
    val: BigNumberish,
) {
    await usd0.setMinterStatus(signer.address, true);
    await usd0.mint(signer.address, val);
}

async function tokenApprovalPlug(
    signer: SignerWithAddress,
    token: any,
    magnetar: MagnetarV2,
    yieldBox: any,
    val: BigNumberish,
) {
    await token.connect(signer).approve(magnetar.address, val);
    await token.approve(yieldBox.address, val);
}

async function bigBangApprovePlug(
    signer: SignerWithAddress,
    token: any,
    BigBang: any,
    magnetar: MagnetarV2,
    yieldBox: any,
    val: BigNumberish,
) {
    await tokenApprovalPlug(signer, token, magnetar, yieldBox, val);
    await BigBang.connect(signer).approve(
        magnetar.address,
        // TODO use correct amount
        ethers.constants.MaxUint256,
    );
    await BigBang.connect(signer).approveBorrow(
        magnetar.address,
        // TODO use correct amount
        ethers.constants.MaxUint256,
    );
}

// TODO use correct amount
async function approvePlug(
    signer: SignerWithAddress,
    token: any,
    Singularity: Singularity,
    magnetar: MagnetarV2,
    yieldBox: YieldBox,
    assetId: BigNumberish,
    val: BigNumberish,
) {
    await tokenApprovalPlug(signer, token, magnetar, yieldBox, val);
    await Singularity.connect(signer).approve(
        magnetar.address,
        // TODO use correct amount
        ethers.constants.MaxUint256,
    );
    await Singularity.connect(signer).approveBorrow(
        magnetar.address,
        // TODO use correct amount
        ethers.constants.MaxUint256,
    );
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
    magnetar: MagnetarV2,
    Singularity: any,
    yieldBox: any,
    assetId: BigNumberish,
    collateralValue: BigNumberish,
    borrowValue: BigNumberish,
    withdrawData: any,
    shouldRevert?: boolean,
    revertMessage?: string,
) {
    let share = BN(0),
        amount = BN(0);

    if (shouldRevert) {
        await expect(
            magnetar
                .connect(signer)
                .depositAddCollateralAndBorrowFromMarket(
                    Singularity.address,
                    signer.address,
                    collateralValue,
                    borrowValue,
                    true,
                    true,
                    withdrawData,
                ),
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ).to.be.reverted;
        return { share, amount };
    }

    await magnetar
        .connect(signer)
        .depositAddCollateralAndBorrowFromMarket(
            Singularity.address,
            signer.address,
            collateralValue,
            borrowValue,
            true,
            true,
            withdrawData,
        );

    share = await yieldBox.balanceOf(signer.address, assetId);
    amount = await yieldBox.toAmount(assetId, share, false);

    if (!withdrawData.withdraw) {
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
    const addAssetFn = Singularity.interface.encodeFunctionData('addAsset', [
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
    magnetar: MagnetarV2,
    Singularity: Singularity,
    depositVal: BigNumberish,
    repayVal: BigNumberish,
    shouldRevert?: boolean,
    revertMessage?: string,
) {
    if (shouldRevert) {
        await expect(
            magnetar
                .connect(signer)
                .depositRepayAndRemoveCollateralFromMarket(
                    Singularity.address,
                    signer.address,
                    depositVal,
                    repayVal,
                    0,
                    true,
                    {
                        withdraw: false,
                        withdrawLzFeeAmount: 0,
                        withdrawOnOtherChain: false,
                        withdrawLzChainId: 0,
                        withdrawAdapterParams: ethers.utils.toUtf8Bytes(''),
                        unwrap: false,
                        refundAddress: signer.address,
                        zroPaymentAddress: ethers.constants.AddressZero,
                    },
                ),
        ).to.be.reverted;
        return;
    }

    const previousBorrowAmount = await Singularity.userBorrowPart(
        signer.address,
    );
    await magnetar
        .connect(signer)
        .depositRepayAndRemoveCollateralFromMarket(
            Singularity.address,
            signer.address,
            depositVal,
            repayVal,
            0,
            true,
            {
                withdraw: false,
                withdrawLzFeeAmount: 0,
                withdrawOnOtherChain: false,
                withdrawLzChainId: 0,
                withdrawAdapterParams: ethers.utils.toUtf8Bytes(''),
                unwrap: false,
                refundAddress: signer.address,
                zroPaymentAddress: ethers.constants.AddressZero,
            },
        );
    const finalBorrowAmount = await Singularity.userBorrowPart(signer.address);

    expect(finalBorrowAmount.lt(previousBorrowAmount)).to.be.true;
}

async function priceDropPlug(
    signer: SignerWithAddress,
    Singularity: Singularity,
) {
    const oracle = new ethers.Contract(
        await Singularity.oracle(),
        OracleMockArtifact.abi,
        signer,
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
    timeTravel: (amount: number) => any,
) {
    await timeTravel(10_000);
    await expect(
        liquidationQueue.connect(signer).activateBid(signer.address, 1),
    ).to.emit(liquidationQueue, 'ActivateBid');
}

function encodeMarketHelperWithdrawData(
    otherChain: boolean,
    destChain: number,
    receiver: string,
    adapterParams: string,
) {
    const receiverSplit = receiver.split('0x');

    return ethers.utils.defaultAbiCoder.encode(
        ['bool', 'uint16', 'bytes32', 'bytes'],
        [
            otherChain,
            destChain,
            '0x'.concat(receiverSplit[1].padStart(64, '0')),
            adapterParams,
        ],
    );
}

//modules
async function addUsd0Module(
    weth: ERC20Mock,
    wethMintVal: BigNumberish,
    magnetar: MagnetarV2,
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
            magnetar,
            yieldBox,
            wethMintVal,
        );

        const { share, amount } = await depositAddCollateralAndBorrowPlug(
            lender,
            magnetar,
            wethBigBangMarket,
            yieldBox,
            usdoAssetId,
            wethMintVal,
            usdoBorrowVal,
            {
                withdraw: false,
                withdrawLzFeeAmount: 0,
                withdrawOnOtherChain: false,
                withdrawLzChainId: 0,
                withdrawAdapterParams: ethers.utils.toUtf8Bytes(''),
                unwrap: false,
                refundAddress: lender.address,
                zroPaymentAddress: ethers.constants.AddressZero,
            },
            false,
        );

        //lend USDO to WethUSD0Singularity
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
    weth: ERC20Mock,
    magnetar: MagnetarV2,
    wethUsdoSingularity: Singularity,
    yieldBox: any,
    usdoAssetId: BigNumberish,
    usd0: USDO,
) {
    for (let i = 0; i < borrowers.length; i++) {
        const borrower = borrowers[i];

        // deposit, add collateral and borrow UDS0
        await mintWethPlug(borrower, weth, wethMintVal);
        await approvePlug(
            borrower,
            weth,
            wethUsdoSingularity,
            magnetar,
            yieldBox,
            await wethUsdoSingularity.collateralId(),
            wethMintVal,
        );
        await depositAddCollateralAndBorrowPlug(
            borrower,
            magnetar,
            wethUsdoSingularity,
            yieldBox,
            usdoAssetId,
            wethMintVal,
            usdoBorrowVal,
            {
                withdraw: true,
                withdrawLzFeeAmount: 0,
                withdrawOnOtherChain: false,
                withdrawLzChainId: 0,
                withdrawAdapterParams: ethers.utils.toUtf8Bytes(''),
                unwrap: false,
                refundAddress: borrower.address,
                zroPaymentAddress: ethers.constants.AddressZero,
            },
        );

        const borrowerUsd0Balance = await usd0.balanceOf(borrower.address);
        expect(borrowerUsd0Balance.eq(usdoBorrowVal)).to.be.true;
    }
}

async function repayModule(
    repayArr: any[],
    usd0: USDO,
    deployer: SignerWithAddress,
    usdoBorrowVal: BigNumber,
    magnetar: MagnetarV2,
    wethUsdoSingularity: Singularity,
    yieldBox: any,
) {
    await mintUsd0Plug(deployer, usd0, usdoBorrowVal.mul(100));

    for (let i = 0; i < repayArr.length; i++) {
        const repayer = repayArr[i];

        const repayerUsd0Balance = await usd0.balanceOf(repayer.address);
        const transferVal = repayerUsd0Balance.div(2);

        await transferPlug(deployer, repayer.address, usd0, transferVal); //add extra USDO for repayment

        await approvePlug(
            repayer,
            usd0,
            wethUsdoSingularity,
            magnetar,
            yieldBox,
            await wethUsdoSingularity.assetId(),
            repayerUsd0Balance.add(transferVal),
        );

        await depositAndRepayPlug(
            repayer,
            magnetar,
            wethUsdoSingularity,
            repayerUsd0Balance.add(transferVal),
            repayerUsd0Balance,
        );
    }
}

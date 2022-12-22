import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import {  getDeployment, getBingBangContract } from './utils';

//Execution example:
//      npx hardhat getParticipantBingBangInfo --bingBang "<address>" --participant "<address>"
export const getDetails = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const userAddress = taskArgs['participant'];
    const { bingBangContract, bingBangAddress } =
        await getBingBangContract(taskArgs, hre);

    const mixologistHelperContract = await getDeployment(
        hre,
        'SingularityHelper',
    );
    const yieldBoxContract = await getDeployment(hre, 'YieldBox');

    const assetId = await bingBangContract.assetId();
    const collateralId = await bingBangContract.collateralId();

    const borrowAmount = await bingBangContract.userBorrowPart(userAddress);
    const borrowShare = await yieldBoxContract.toShare(
        assetId,
        borrowAmount,
        false,
    );

    const collateralShare = await bingBangContract.userCollateralShare(
        userAddress,
    );
    const collateralAmount = await yieldBoxContract.toAmount(
        collateralId,
        collateralShare,
        false,
    );
    const exchangeRate = await bingBangContract.exchangeRate();
    const amountToSolvency =
        await bingBangContract.computeAssetAmountToSolvency(
            userAddress,
            exchangeRate,
        );

    const collateralUsedShares =
        await mixologistHelperContract.getCollateralSharesForBorrowPart(
            bingBangContract,
            borrowAmount,
        );
    const collateralUsedAmount = await yieldBoxContract.toAmount(
        collateralId,
        collateralUsedShares,
        false,
    );

    return {
        borrowAmount: borrowAmount,
        borrowShare: borrowShare,
        collateralAmount: collateralAmount,
        collateralShare: collateralShare,
        exchangeRate: exchangeRate,
        amountToSolvency: amountToSolvency,
        collateralSharesUsed: collateralUsedShares,
        collateralAmountUsed: collateralUsedAmount,
    };
};

export const getParticipantBingBangInfo__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(await getDetails(args, hre));
};

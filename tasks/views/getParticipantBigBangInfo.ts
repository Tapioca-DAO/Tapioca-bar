import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getBigBangContract, getDeployment } from '../utils';

//Execution example:
//      npx hardhat getParticipantBigBangInfo --bigBang "<address>" --participant "<address>"
export const getDetails = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const userAddress = taskArgs['participant'];
    const { bigBangContract, bigBangAddress } = await getBigBangContract(
        taskArgs,
        hre,
    );

    const mixologistHelperContract = await getDeployment(hre, 'MarketHelper');
    const yieldBoxContract = await getDeployment(hre, 'YieldBox');

    const assetId = await bigBangContract.assetId();
    const collateralId = await bigBangContract.collateralId();

    const borrowAmount = await bigBangContract.userBorrowPart(userAddress);
    const borrowShare = await yieldBoxContract.toShare(
        assetId,
        borrowAmount,
        false,
    );

    const collateralShare = await bigBangContract.userCollateralShare(
        userAddress,
    );
    const collateralAmount = await yieldBoxContract.toAmount(
        collateralId,
        collateralShare,
        false,
    );
    const exchangeRate = await bigBangContract.exchangeRate();
    const amountToSolvency = await bigBangContract.computeAssetAmountToSolvency(
        userAddress,
        exchangeRate,
    );

    const collateralUsedShares =
        await mixologistHelperContract.getCollateralSharesForBorrowPart(
            bigBangContract,
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

export const getParticipantBigBangInfo__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(await getDetails(args, hre));
};

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getDeployment, getSingularityContract } from '../utils';

//Execution example:
//      npx hardhat getParticipantSingularityInfo --singularity "<address>" --participant "<address>"
export const getDetails = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const userAddress = taskArgs['participant'];
    const { singularityContract, singularityAddress } =
        await getSingularityContract(taskArgs, hre);

    const mixologistHelperContract = await getDeployment(hre, 'MarketsHelper');
    const yieldBoxContract = await getDeployment(hre, 'YieldBox');

    const assetId = await singularityContract.assetId();
    const collateralId = await singularityContract.collateralId();

    const borrowAmount = await singularityContract.userBorrowPart(userAddress);
    const borrowShare = await yieldBoxContract.toShare(
        assetId,
        borrowAmount,
        false,
    );

    const collateralShare = await singularityContract.userCollateralShare(
        userAddress,
    );
    const collateralAmount = await yieldBoxContract.toAmount(
        collateralId,
        collateralShare,
        false,
    );
    const exchangeRate = await singularityContract.exchangeRate();
    const amountToSolvency =
        await singularityContract.computeAssetAmountToSolvency(
            userAddress,
            exchangeRate,
        );

    const collateralUsedShares =
        await mixologistHelperContract.getCollateralSharesForBorrowPart(
            singularityAddress,
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

export const getParticipantSingularityInfo__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(await getDetails(args, hre));
};

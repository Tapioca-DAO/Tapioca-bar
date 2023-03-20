import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getDeployment, getSingularityContract } from '../utils';

//Execution example:
//      npx hardhat getSingularityTotals --market "<address>"
export const getTotals = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const { singularityContract } = await getSingularityContract(taskArgs, hre);
    const yieldBoxContract = await getDeployment(hre, 'YieldBox');

    const collateralId = await singularityContract.collateralId();

    const borrowCap = await singularityContract.totalBorrowCap();
    const totalBorrowed = await singularityContract.totalBorrow();
    const totalAsset = await singularityContract.totalAsset();
    const totalCollateralShare =
        await singularityContract.totalCollateralShare();
    const totalCollateralAmount = yieldBoxContract.toAmount(
        collateralId,
        totalCollateralShare,
        false,
    );

    return {
        borrowCap: borrowCap,
        totalBorrowedAmount: totalBorrowed.base,
        totalBorrowedShares: totalBorrowed.elastic,
        totalAssetAmount: totalAsset.base,
        totalAssetShares: totalAsset.elastic,
        totalCollateralShare: totalCollateralShare,
        totalCollateralAmount: totalCollateralAmount,
    };
};

export const getSingularityTotals__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(await getTotals(args, hre));
};

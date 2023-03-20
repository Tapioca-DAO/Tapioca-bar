import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getBigBangContract } from '../utils';

//Execution example:
//      npx hardhat getBigBangTotals --market "<address>"
export const getTotals = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const { bigBangContract } = await getBigBangContract(taskArgs, hre);
    const yieldBoxContract = await getDeployment(hre, 'YieldBox');

    const collateralId = await bigBangContract.collateralId();

    const borrowCap = await bigBangContract.totalBorrowCap();
    const totalBorrowed = await bigBangContract.totalBorrow();
    const totalAsset = await bigBangContract.totalAsset();
    const totalCollateralShare = await bigBangContract.totalCollateralShare();
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

export const getBigBangTotals__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(await getTotals(args, hre));
};

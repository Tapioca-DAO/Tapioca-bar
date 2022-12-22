import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getBingBangContract, getDeployment } from './utils';

//Execution example:
//      npx hardhat getBingBangTotals --market "<address>"
export const getTotals = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const { bingBangContract } = await getBingBangContract(taskArgs, hre);
    const yieldBoxContract = await getDeployment(hre, 'YieldBox');

    const collateralId = await bingBangContract.collateralId();

    const borrowCap = await bingBangContract.totalBorrowCap();
    const totalBorrowed = await bingBangContract.totalBorrow();
    const totalAsset = await bingBangContract.totalAsset();
    const totalCollateralShare = await bingBangContract.totalCollateralShare();
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

export const getBingBangTotals__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(await getTotals(args, hre));
};

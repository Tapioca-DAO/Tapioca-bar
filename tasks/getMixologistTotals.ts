import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import {
    getMixologistContract,
    getMixologistHelperContract,
    getYieldBoxContract,
} from './utils';

//Execution example:
//      npx hardhat getMixologistTotals --mixologist "<address>"
export const getTotals = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const { mixologistContract, mixologistAddress } =
        await getMixologistContract(taskArgs, hre);

    const { mixologistHelperContract } = await getMixologistHelperContract(
        taskArgs,
        hre,
    );
    const { yieldBoxContract } = await getYieldBoxContract(taskArgs, hre);

    const assetId = await mixologistContract.assetId();
    const collateralId = await mixologistContract.collateralId();

    const borrowCap = await mixologistContract.totalBorrowCap();
    const totalBorrowed = await mixologistContract.totalBorrow();
    const totalAsset = await mixologistContract.totalAsset();
    const totalCollateralShare =
        await mixologistContract.totalCollateralShare();
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

export const getMixologistTotals__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(await getTotals(args, hre));
};

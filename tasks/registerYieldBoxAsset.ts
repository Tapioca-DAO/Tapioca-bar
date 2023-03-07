import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import SDK from 'tapioca-sdk';
import { getDeployment } from './utils';

//Execution example:
//      npx hardhat registerYieldBoxAsset --address "<address>"
export const registerYieldBoxAsset = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const yieldBoxContract = await getDeployment(hre, 'YieldBox');

    await (
        await yieldBoxContract.registerAsset(
            1,
            taskArgs['address'],
            hre.ethers.constants.AddressZero,
            0,
        )
    ).wait();
};

export const registerYieldBoxAsset__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('Register YieldBox asset');
    await registerYieldBoxAsset(args, hre);
    console.log('Execution completed');
};

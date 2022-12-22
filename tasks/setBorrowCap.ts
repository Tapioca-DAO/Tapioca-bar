import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import {
    getBingBangContract,
    getDeployment,
    getSingularityContract,
} from './utils';

//Execution example:
//      npx hardhat setBorrowCap --singularity "<address>" --bingBang "<address>" --cap "<cap>"
export const setCap = async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const penroseContract = await getDeployment(hre, 'Penrose');

    let callData;
    let marketAddress;
    if (hre.ethers.utils.isAddress(taskArgs.singularity)) {
        const { singularityContract, singularityAddress } =
            await getSingularityContract(taskArgs, hre);
        marketAddress = singularityAddress;

        callData = singularityContract.interface.encodeFunctionData(
            'setBorrowCap',
            [taskArgs['cap']],
        );
    } else if (hre.ethers.utils.isAddress(taskArgs.bingBang)) {
        const { bingBangContract, bingBangAddress } = await getBingBangContract(
            taskArgs,
            hre,
        );
        marketAddress = bingBangAddress;
        callData = bingBangContract.interface.encodeFunctionData(
            'setBorrowCap',
            [taskArgs['cap']],
        );
    }
    await penroseContract.executeMarketFn([marketAddress], [callData], true);
};

export const setBorrowCap__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(
        `Setting borrow cap ('${args['path']}') on singularity: ${args['singularity']} and/or bingBang: ${args['bingBang']}`,
    );
    await setCap(args, hre);
    console.log('Execution completed');
};

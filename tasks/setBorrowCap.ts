import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import {
    getBigBangContract,
    getDeployment,
    getSingularityContract,
} from './utils';

//Execution example:
//      npx hardhat setBorrowCap --singularity "<address>" --bigBang "<address>" --cap "<cap>"
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
    } else if (hre.ethers.utils.isAddress(taskArgs.bigBang)) {
        const { bigBangContract, bigBangAddress } = await getBigBangContract(
            taskArgs,
            hre,
        );
        marketAddress = bigBangAddress;
        callData = bigBangContract.interface.encodeFunctionData(
            'setBorrowCap',
            [taskArgs['cap']],
        );
    }
    await (
        await penroseContract.executeMarketFn([marketAddress], [callData], true)
    ).wait();
};

export const setBorrowCap__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(
        `Setting borrow cap ('${args['path']}') on singularity: ${args['singularity']} and/or bigBang: ${args['bigBang']}`,
    );
    await setCap(args, hre);
    console.log('Execution completed');
};

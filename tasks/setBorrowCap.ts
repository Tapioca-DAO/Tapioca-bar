import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getDeployment, getSingularityContract } from './utils';

//Execution example:
//      npx hardhat setBorrowCap --singularity "<address>" --cap "<cap>"
export const setCap = async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const penroseContract = await getDeployment(hre, 'Penrose');
    const { singularityContract, singularityAddress } =
        await getSingularityContract(taskArgs, hre);

    const callData = singularityContract.interface.encodeFunctionData(
        'setBorrowCap',
        [taskArgs['cap']],
    );

    await penroseContract.executeSingularityFn(
        [singularityAddress],
        [callData],
        true,
    );
};

export const setBorrowCap__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(
        `Setting borrow cap ('${args['path']}') on singularity: ${args['singularity']}`,
    );
    await setCap(args, hre);
    console.log('Execution completed');
};

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getDeployment, getSingularityContract } from './utils';

//Execution example:
//      npx hardhat setColleteralSwapPath --singularity "<address>" --path "[<address1>,<address2>]"
export const setPath = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const penroseContract = await getDeployment(hre, 'Penrose');
    const { singularityContract, singularityAddress } =
        await getSingularityContract(taskArgs, hre);

    const callData = singularityContract.interface.encodeFunctionData(
        'setCollateralSwapPath',
        [taskArgs['path']],
    );

    await penroseContract.executeSingularityFn([singularityAddress], [callData],true);
};

export const setCollateralSwapPath__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(
        `Setting collateralSwapPath ('${args['path']}') on singularity: ${args['singularity']}`,
    );
    await setPath(args, hre);
    console.log('Execution completed');
};

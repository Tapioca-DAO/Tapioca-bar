import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getDeployment, getSingularityContract } from './utils';

//Execution example:
//      npx hardhat setTapSwapPath --singularity "<address>" --path "[<address1>,<address2>]"
export const setPath = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const penroseContract = await getDeployment(hre, 'Penrose');
    const { singularityContract, singularityAddress } =
        await getSingularityContract(taskArgs, hre);

    const callData = singularityContract.interface.encodeFunctionData(
        'setTapSwapPath',
        [taskArgs['path']],
    );

    await penroseContract.executeMarketFn(
        [singularityAddress],
        [callData],
        true,
    );
};

export const setTapSwapPath__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(
        `Setting tapSwapPath ('${args['path']}') on singularity: ${args['singularity']}`,
    );
    await setPath(args, hre);
    console.log('Execution completed');
};

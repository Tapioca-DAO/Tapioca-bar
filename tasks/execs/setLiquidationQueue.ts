import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getDeployment, getSingularityContract } from '../utils';

//Execution example:
//      npx hardhat setLiquidationQueue --singularity "<address>" --liquidationQueue "" --meta "{}"
export const setLiquidationQueue = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const penroseContract = await getDeployment(hre, 'Penrose');
    const { singularityContract, singularityAddress } =
        await getSingularityContract(taskArgs, hre);

    const callData = singularityContract.interface.encodeFunctionData(
        'setLiquidationQueue',
        [taskArgs['liquidationQueue'], taskArgs['meta']],
    );

    await (
        await penroseContract.executeMarketFn(
            [singularityAddress],
            [callData],
            true,
        )
    ).wait();
};

export const setLiquidationQueue__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(
        `Setting LiquidationQueue on singularity: ${args['singularity']}`,
    );
    await setLiquidationQueue(args, hre);
    console.log('Execution completed');
};

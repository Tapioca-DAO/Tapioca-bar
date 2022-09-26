import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getBeachBarContract, getMixologistContract } from './utils';

//Execution example:
//      npx hardhat setLiquidationQueueBidSwapper --mixologist "<address>" --swapper "<cap>"
export const setLiquidationQueueExecutionSwapper = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const { beachBarContract } = await getBeachBarContract(taskArgs, hre);
    const { mixologistContract, mixologistAddress } =
        await getMixologistContract(taskArgs, hre);

    const callData = mixologistContract.interface.encodeFunctionData(
        'updateLQExecutionSwapper',
        [taskArgs['swapper']],
    );

    await beachBarContract.executeMixologistFn([mixologistAddress], [callData]);
};

export const setLiquidationQueueExecutionSwapper__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(
        `Setting LiquidationQueue big swapper on mixologist: ${args['mixologist']}`,
    );
    await setLiquidationQueueExecutionSwapper(args, hre);
    console.log('Execution completed');
};

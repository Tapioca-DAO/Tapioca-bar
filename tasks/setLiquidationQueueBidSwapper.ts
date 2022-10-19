import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getDeployment, getMixologistContract } from './utils';

//Execution example:
//      npx hardhat setLiquidationQueueBidSwapper --mixologist "<address>" --swapper "<cap>"
export const setLiquidationQueueBidSwapper = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const beachBarContract = await getDeployment(hre, 'BeachBar');
    const { mixologistContract, mixologistAddress } =
        await getMixologistContract(taskArgs, hre);

    const callData = mixologistContract.interface.encodeFunctionData(
        'updateLQUsdoSwapper',
        [taskArgs['swapper']],
    );

    await beachBarContract.executeMixologistFn([mixologistAddress], [callData],true);
};

export const setLiquidationQueueBidSwapper__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(
        `Setting LiquidationQueue big swapper on mixologist: ${args['mixologist']}`,
    );
    await setLiquidationQueueBidSwapper(args, hre);
    console.log('Execution completed');
};

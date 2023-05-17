import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getDeployment, getSingularityContract } from '../utils';

//Execution example:
//      npx hardhat setLiquidationQueueBidSwapper --singularity "<address>" --swapper "<cap>"
export const setLiquidationQueueBidSwapper = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const penroseContract = await getDeployment(hre, 'Penrose');
    const { singularityContract, singularityAddress } =
        await getSingularityContract(taskArgs, hre);

    const callData = singularityContract.interface.encodeFunctionData(
        'updateLQUsdoSwapper',
        [taskArgs['swapper']],
    );

    await (
        await penroseContract.executeMarketFn(
            [singularityAddress],
            [callData],
            true,
        )
    ).wait();
};

export const setLiquidationQueueBidSwapper__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(
        `Setting LiquidationQueue big swapper on singularity: ${args['singularity']}`,
    );
    await setLiquidationQueueBidSwapper(args, hre);
    console.log('Execution completed');
};

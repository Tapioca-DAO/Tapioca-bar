import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getDeployment, getMixologistContract } from './utils';

//Execution example:
//      npx hardhat setLiquidationQueue --mixologist "<address>" --liquidationQueue "" --meta "{}"
export const setLiquidationQueue = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const beachBarContract = await getDeployment(hre, 'BeachBar');
    const { mixologistContract, mixologistAddress } =
        await getMixologistContract(taskArgs, hre);

    const callData = mixologistContract.interface.encodeFunctionData(
        'setLiquidationQueue',
        [taskArgs['liquidationQueue'], taskArgs['meta']],
    );

    await beachBarContract.executeMixologistFn(
        [mixologistAddress],
        [callData],
        true,
    );
};

export const setLiquidationQueue__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(
        `Setting LiquidationQueue on mixologist: ${args['mixologist']}`,
    );
    await setLiquidationQueue(args, hre);
    console.log('Execution completed');
};

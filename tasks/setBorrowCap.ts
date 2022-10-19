import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getDeployment, getMixologistContract } from './utils';

//Execution example:
//      npx hardhat setBorrowCap --mixologist "<address>" --cap "<cap>"
export const setCap = async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const beachBarContract = await getDeployment(hre, 'BeachBar');
    const { mixologistContract, mixologistAddress } =
        await getMixologistContract(taskArgs, hre);

    const callData = mixologistContract.interface.encodeFunctionData(
        'setBorrowCap',
        [taskArgs['cap']],
    );

    await beachBarContract.executeMixologistFn(
        [mixologistAddress],
        [callData],
        true,
    );
};

export const setBorrowCap__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(
        `Setting borrow cap ('${args['path']}') on mixologist: ${args['mixologist']}`,
    );
    await setCap(args, hre);
    console.log('Execution completed');
};

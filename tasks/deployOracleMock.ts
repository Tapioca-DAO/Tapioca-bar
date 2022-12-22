import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { deployOracleMock, updateDeployments } from '../deploy/utils';

export const deployOracleMock__task = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const oracleObj = await deployOracleMock(hre,taskArgs.name);
    await updateDeployments([oracleObj], await hre.getChainId());
};

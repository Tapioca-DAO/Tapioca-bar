import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { registerMinterMarket, updateDeployments } from '../deploy/utils';

export const deployMinterMarket__task = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const marketObj = await registerMinterMarket(hre, taskArgs.name);
    await updateDeployments([marketObj], await hre.getChainId());
};

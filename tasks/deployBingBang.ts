import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { registerBingBangMarket, updateDeployments } from '../deploy/utils';

export const deployBingBang__task = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const marketObj = await registerBingBangMarket(hre, taskArgs.name);
    await updateDeployments([marketObj], await hre.getChainId());
};

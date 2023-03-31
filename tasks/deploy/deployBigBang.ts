import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { registerBigBangMarket, updateDeployments } from './utils';

export const deployBigBang__task = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const marketObj = await registerBigBangMarket(
        hre,
        taskArgs.name,
        taskArgs.exchangeRatePrecision,
    );
    await updateDeployments([marketObj], await hre.getChainId());
};

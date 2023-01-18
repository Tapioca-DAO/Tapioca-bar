import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
    registerLiquidationQueue,
    registerMarket,
    updateDeployments,
} from '../deploy/utils';

export const deployMarket__task = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    // const marketObj = await registerMarket(
    //     hre,
    //     taskArgs.name,
    //     taskArgs.exchangeRatePrecision,
    // );
    // await updateDeployments([marketObj], await hre.getChainId());

    const lqObject = await registerLiquidationQueue(hre, taskArgs.name);
    await updateDeployments([lqObject], await hre.getChainId());
};

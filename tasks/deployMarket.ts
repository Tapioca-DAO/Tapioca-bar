import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
    registerLiquidationQueue,
    registerMarket,
    updateDeployments,
} from '../deploy/utils';

//npx hardhat deployMarket --network arbitrum_goerli --name TMATIC --exchange-rate-precision 0
//npx hardhat deployMarket --network arbitrum_goerli --name TAVAX --exchange-rate-precision 0
//npx hardhat deployMarket --network arbitrum_goerli --name TWETH --exchange-rate-precision 0
//npx hardhat deployMarket --network arbitrum_goerli --name TFTM --exchange-rate-precision 0
export const deployMarket__task = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const marketObj = await registerMarket(
        hre,
        taskArgs.name,
        taskArgs.exchangeRatePrecision,
    );
    await updateDeployments([marketObj], await hre.getChainId());

    const lqObject = await registerLiquidationQueue(hre, taskArgs.name);
    await updateDeployments([lqObject], await hre.getChainId());
};

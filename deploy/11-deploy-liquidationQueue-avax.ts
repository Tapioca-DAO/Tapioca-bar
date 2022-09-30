import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { updateDeployments, registerLiquidationQueue } from './utils';
import _ from 'lodash';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const contracts: any[] = [];
    const lqObject = await registerLiquidationQueue(hre, 'AVAX');
    contracts.push(lqObject);

    updateDeployments(contracts, await hre.getChainId());
};

export default func;
func.tags = ['LiquidationQueueAVAX'];

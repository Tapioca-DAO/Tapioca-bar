import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { updateDeployments, registerMarket } from './utils';
import _ from 'lodash';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const contracts: any[] = [];
    const marketObj = await registerMarket(hre, 'TUS');
    contracts.push(marketObj);

    updateDeployments(contracts, await hre.getChainId());
};

export default func;
func.tags = ['MixologistTUS'];

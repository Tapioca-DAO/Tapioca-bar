import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { verify, updateDeployments } from './utils';
import _ from 'lodash';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await hre.getChainId();
    const contracts: any[] = [];

    console.log(`\n Deploying MasterContract`);
    await deploy('Mixologist', { from: deployer, log: true });
    await verify(hre, 'Mixologist', []);
    const deployedMC = await deployments.get('Mixologist');
    contracts.push({
        contract: deployedMC,
        args: [],
        artifact: 'MediumRiskMC',
    });
    console.log(`Done`);

    updateDeployments(contracts, chainId);
};

export default func;
func.tags = ['MasterContract'];

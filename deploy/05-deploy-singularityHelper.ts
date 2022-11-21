import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { verify, updateDeployments, constants } from './utils';
import _ from 'lodash';
import { TContract } from 'tapioca-sdk/dist/shared';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await hre.getChainId();
    const contracts: TContract[] = [];

    console.log('\n Deploying SingularityHelper');
    await deploy('SingularityHelper', {
        from: deployer,
        log: true,
    });
    await verify(hre, 'SingularityHelper', []);
    const deployedSingularityHelper = await deployments.get('SingularityHelper');
    contracts.push({
        name: 'SingularityHelper',
        address: deployedSingularityHelper.address,
        meta: {},
    });
    console.log(
        `Done. Deployed on ${deployedSingularityHelper.address} with no arguments`,
    );

    await updateDeployments(contracts, chainId);
};

export default func;
func.tags = ['SingularityHelper'];

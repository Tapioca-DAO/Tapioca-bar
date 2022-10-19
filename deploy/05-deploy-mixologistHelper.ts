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

    console.log('\n Deploying MixologistHelper');
    await deploy('MixologistHelper', {
        from: deployer,
        log: true,
    });
    await verify(hre, 'MixologistHelper', []);
    const deployedMixologistHelper = await deployments.get('MixologistHelper');
    contracts.push({
        name: 'MixologistHelper',
        address: deployedMixologistHelper.address,
        meta: {},
    });
    console.log(
        `Done. Deployed on ${deployedMixologistHelper.address} with no arguments`,
    );

    await updateDeployments(contracts, chainId);
};

export default func;
func.tags = ['MixologistHelper'];

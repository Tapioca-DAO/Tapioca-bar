import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { verify, updateDeployments, constants } from './utils';
import _ from 'lodash';
import { TContract } from 'tapioca-sdk/dist/shared';
import { getDeployment } from '../tasks/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await hre.getChainId();
    const contracts: TContract[] = [];

    console.log('\n Deploying OracleMock');

    await deploy('OracleMock', {
        from: deployer,
        log: true,
    });
    await verify(hre, 'OracleMock', []);
    const deployed = await deployments.get('OracleMock');
    contracts.push({
        name: 'OracleMock',
        address: deployed.address,
        meta: {},
    });
    console.log(`Done. Deployed on ${deployed.address} with no arguments`);

    await updateDeployments(contracts, chainId);

    console.log('Done');
};

export default func;
func.tags = ['OracleMock'];

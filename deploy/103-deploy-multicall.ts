import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import _ from 'lodash';
import { verify } from './utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log('\nDeploying Multicall');
    await deploy('Multicall3', {
        from: deployer,
        log: true,
        args: [],
    });
    const multiCall = await deployments.get('Multicall3');

    await verify(hre, 'Multicall3', []);
    console.log(`Multicall deployed on ${multiCall.address}`);
};

export default func;
func.tags = ['Multicall'];

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import _ from 'lodash';
import { verify } from './utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log('\nDeploying MultisigMock');
    await deploy('MultisigMock', {
        from: deployer,
        log: true,
        args: [1],
    });
    const deployed = await deployments.get('MultisigMock');

    await verify(hre, 'MultisigMock', ['1']);
    console.log(`MultisigMock deployed on ${deployed.address}`);
};

export default func;
func.tags = ['MultisigMock'];

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

    console.log(`\nDeploying SGLProxy`);
    const args = [constants[chainId].address, deployer];
    await deploy('SGLProxy', {
        from: deployer,
        log: true,
        args,
    });
    const sglProxy = await deployments.get('SGLProxy');
    contracts.push({
        name: 'SGLProxy-Test',
        address: sglProxy.address,
        meta: { constructorArguments: args },
    });
    await verify(hre, 'SGLProxy', [constants[chainId].address, deployer]);
    console.log(
        `Done. Deployed SGLProxy on ${sglProxy.address} with args [${constants[chainId].address},${deployer}]`,
    );
    await updateDeployments(contracts, chainId);
};

export default func;
func.tags = ['SGLProxy'];

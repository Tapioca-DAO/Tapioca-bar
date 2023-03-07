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

    console.log('\nDeploying MarketsProxy');
    const args = [constants[chainId].address, deployer];
    await deploy('MarketsProxy', {
        from: deployer,
        log: true,
        args,
    });
    const marketsProxy = await deployments.get('MarketsProxy');
    contracts.push({
        name: 'MarketsProxy-Test',
        address: marketsProxy.address,
        meta: { constructorArguments: args },
    });
    await verify(hre, 'MarketsProxy', [constants[chainId].address, deployer]);
    console.log(
        `Done. Deployed MarketsProxy on ${marketsProxy.address} with args [${constants[chainId].address},${deployer}]`,
    );
    await updateDeployments(contracts, chainId);
};

export default func;
func.tags = ['MarketsProxy'];

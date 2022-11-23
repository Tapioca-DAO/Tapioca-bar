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

    console.log('\nDeploying SGLLiquidation');
    await deploy('SGLLiquidation', {
        from: deployer,
        log: true,
    });
    await verify(hre, 'SGLLiquidation', []);
    const sglLiquidation = await deployments.get('SGLLiquidation');
    contracts.push({
        name: 'SGLLiquidation',
        address: sglLiquidation.address,
        meta: {},
    });
    console.log('Done');

    console.log('\nDeploying SGLLendingBorrowing');
    await deploy('SGLLendingBorrowing', { from: deployer, log: true });
    await verify(hre, 'SGLLendingBorrowing', []);
    const sglLendingBorrowing = await deployments.get('SGLLendingBorrowing');
    contracts.push({
        name: 'SGLLendingBorrowing',
        address: sglLendingBorrowing.address,
        meta: {},
    });
    console.log('Done');

    await updateDeployments(contracts, chainId);
};

export default func;
func.tags = ['SingularityModules'];

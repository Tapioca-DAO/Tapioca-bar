import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { verify, updateDeployments, constants } from './utils';
import _ from 'lodash';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await hre.getChainId();
    const contracts: any[] = [];

    console.log(`\n Deploying MultiSwapper`);
    const uniswapFactoryContract = await hre.ethers.getContractAt(
        'UniswapV2Factory',
        constants[chainId].uniV2Factory,
    );
    const beachBar = await deployments.get('BeachBar');

    const args = [
        constants[chainId].uniV2Factory,
        beachBar.address,
        await uniswapFactoryContract.pairCodeHash(),
    ];
    await deploy('MultiSwapper', {
        from: deployer,
        log: true,
        args,
    });
    await verify(hre, 'MultiSwapper', args);
    const deployedMultiSwapper = await deployments.get('MultiSwapper');
    contracts.push({
        contract: deployedMultiSwapper,
        args: args,
        artifact: 'MultiSwapper',
    });
    console.log(`Done`);

    updateDeployments(contracts, chainId);

    console.log(`\n Setting MultiSwapper`);
    const beachBarContract = await hre.ethers.getContractAt(
        'BeachBar',
        beachBar.address,
    );
    await (
        await beachBarContract.setSwapper(deployedMultiSwapper.address, true)
    ).wait();
    console.log(`Done`);
};

export default func;
func.tags = ['MultiSwapperV2'];

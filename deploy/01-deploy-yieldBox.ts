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

    const yieldBoxAddress = constants[chainId].yieldBoxAddress;
    if (
        hre.ethers.utils.isAddress(yieldBoxAddress!) &&
        yieldBoxAddress != hre.ethers.constants.AddressZero
    ) {
        console.log('YieldBox already deployed. Skipping...');
        return;
    }

    //deploy YieldBoxURIBuilder
    console.log('\n Deploying YieldBoxURIBuilder');
    await deploy('YieldBoxURIBuilder', { from: deployer, log: true });
    await verify(hre, 'YieldBoxURIBuilder', []);
    const deployedUriBuilder = await deployments.get('YieldBoxURIBuilder');
    contracts.push({
        contract: deployedUriBuilder,
        args: [],
        artifact: 'YieldBoxURIBuilder',
    });
    console.log('Done');

    //deploy YieldBox
    console.log('\n Deploying YieldBox');
    const yieldBoxArgs = [
        constants[chainId].wrappedNative,
        deployedUriBuilder.address,
    ];
    await deploy('YieldBox', {
        from: deployer,
        log: true,
        args: yieldBoxArgs,
    });
    await verify(hre, 'YieldBox', yieldBoxArgs);
    const deployedYieldBox = await deployments.get('YieldBox');
    contracts.push({
        contract: deployedYieldBox,
        args: yieldBoxArgs,
        artifact: 'YieldBox',
    });
    console.log('Done');

    await updateDeployments(contracts, chainId);
};

export default func;
func.tags = ['YieldBox'];

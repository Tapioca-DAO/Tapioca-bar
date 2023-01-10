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

    const yieldBoxAddress = constants[chainId]?.yieldBoxAddress;
    if (
        hre.ethers.utils.isAddress(yieldBoxAddress!) &&
        yieldBoxAddress != hre.ethers.constants.AddressZero
    ) {
        console.log('YieldBox already deployed. Skipping...');
        return;
    }

    //deploy YieldBoxURIBuilderf
    console.log('\n Deploying YieldBoxURIBuilder');
    await deploy('YieldBoxURIBuilder', {
        from: deployer,
        log: true,
    });
    await verify(hre, 'YieldBoxURIBuilder', []);
    const deployedUriBuilder = await deployments.get('YieldBoxURIBuilder');
    contracts.push({
        name: 'YieldBoxURIBuilder',
        address: deployedUriBuilder.address,
        meta: {},
    });
    console.log(
        `Done. Deployed on ${deployedUriBuilder.address} with no arguments`,
    );

    //deploy YieldBox
    console.log('\n Deploying YieldBox');
    const yieldBoxArgs = [
        constants[chainId]?.wrappedNative ?? hre.ethers.constants.AddressZero,
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
        name: 'YieldBox',
        address: deployedYieldBox.address,
        meta: { constructorArguments: yieldBoxArgs },
    });
    console.log(
        `Done. Deployed on ${
            deployedYieldBox.address
        } with args ${JSON.stringify(yieldBoxArgs)}`,
    );

    await updateDeployments(contracts, chainId);
};

export default func;
func.tags = ['YieldBox'];

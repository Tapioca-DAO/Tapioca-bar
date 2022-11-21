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

    const penrose = await deployments.get('Penrose');

    console.log('\n Deploying MultiSwapper');
    const args = [
        constants[chainId].uniV2Factory,
        penrose.address,
        constants[chainId].uniV2PairHash,
    ];
    await deploy('MultiSwapper', {
        from: deployer,
        log: true,
        args,
    });
    await verify(hre, 'MultiSwapper', args);
    const deployedMultiSwapper = await deployments.get('MultiSwapper');
    contracts.push({
        name: 'MultiSwapper',
        address: deployedMultiSwapper.address,
        meta: { constructorArguments: args },
    });
    console.log(
        `Done. Deployed on ${
            deployedMultiSwapper.address
        } with args ${JSON.stringify(args)}`,
    );

    await updateDeployments(contracts, chainId);

    console.log('\n Setting MultiSwapper');
    const penroseContract = await hre.ethers.getContractAt(
        'Penrose',
        penrose.address,
    );
    await (
        await penroseContract.setSwapper(deployedMultiSwapper.address, true)
    ).wait();
    console.log('Done');
};

export default func;
func.tags = ['MultiSwapperV2'];

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

    console.log('\n Deploying Penrose');
    const yieldBoxContract = await getDeployment(hre, 'YieldBox');

    const args = [yieldBoxContract.address, constants[chainId].tapAddress];
    await deploy('Penrose', {
        from: deployer,
        log: true,
        args,
    });
    await verify(hre, 'Penrose', args);
    const deployedPenrose = await deployments.get('Penrose');
    contracts.push({
        name: 'Penrose',
        address: deployedPenrose.address,
        meta: { constructorArguments: args },
    });
    console.log(
        `Done. Deployed on ${
            deployedPenrose.address
        } with args ${JSON.stringify(args)}`,
    );

    await updateDeployments(contracts, chainId);

    console.log('\n Setting feeTo & feeVeTo');
    const penroseContract = await hre.ethers.getContractAt(
        'Penrose',
        deployedPenrose.address,
    );

    await (await penroseContract.setFeeTo(constants[chainId].feeTo)).wait();
    console.log('Done');
};

export default func;
func.tags = ['Penrose'];

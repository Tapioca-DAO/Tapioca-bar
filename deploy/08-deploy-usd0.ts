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

    console.log('\n Deploying USDO');
    const yieldBoxContract = await getDeployment(hre, 'YieldBox');

    const args = [constants[chainId].address, yieldBoxContract.address];
    await deploy('USDO', {
        from: deployer,
        log: true,
        args,
    });
    await verify(hre, 'USDO', args);
    const deployedUSD0 = await deployments.get('USDO');
    contracts.push({
        name: 'USDO',
        address: deployedUSD0.address,
        meta: { constructorArguments: args },
    });
    console.log(
        `Done. Deployed on ${deployedUSD0.address} with args ${JSON.stringify(
            args,
        )}`,
    );

    await updateDeployments(contracts, chainId);

    console.log('\n Setting USDO');
    try {
        const penrose = await deployments.get('Penrose');
        const penroseContract = await hre.ethers.getContractAt(
            'Penrose',
            penrose.address,
        );
        await (await penroseContract.setUsdoToken(deployedUSD0.address)).wait();
    } catch {
        console.log('setUsdoToken failed');
    }
    console.log('Done');
};

export default func;
func.tags = ['USDO'];

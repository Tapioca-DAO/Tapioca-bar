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

    console.log('\n Deploying USD0');
    const args = [constants[chainId].address];
    await deploy('USD0', {
        from: deployer,
        log: true,
        args,
    });
    await verify(hre, 'USD0', args);
    const deployedUSD0 = await deployments.get('USD0');
    contracts.push({
        name: 'USD0',
        address: deployedUSD0.address,
        meta: { constructorArguments: args },
    });
    console.log(
        `Done. Deployed on ${deployedUSD0.address} with args ${JSON.stringify(
            args,
        )}`,
    );

    await updateDeployments(contracts, chainId);

    console.log('\n Setting USD0');
    const penrose = await deployments.get('Penrose');
    const penroseContract = await hre.ethers.getContractAt(
        'Penrose',
        penrose.address,
    );
    await (await penroseContract.setUsdoToken(deployedUSD0.address)).wait();
    console.log('Done');
};

export default func;
func.tags = ['USD0'];

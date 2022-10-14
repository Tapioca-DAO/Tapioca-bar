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

    console.log('\n Deploying USD0');

    const args = [constants[chainId].lzEndpoint];
    await deploy('USD0', {
        from: deployer,
        log: true,
        args,
    });
    await verify(hre, 'USD0', args);
    const deployedUSD0 = await deployments.get('USD0');
    contracts.push({
        contract: deployedUSD0,
        args: args,
        artifact: 'USD0',
    });
    console.log(
        `Done. Deployed on ${deployedUSD0.address} with args ${JSON.stringify(
            args,
        )}`,
    );

    await updateDeployments(contracts, chainId);

    console.log('\n Setting USD0');
    const beachBar = await deployments.get('BeachBar');
    const beachBarContract = await hre.ethers.getContractAt(
        'BeachBar',
        beachBar.address,
    );
    await (await beachBarContract.setUsdoToken(deployedUSD0.address)).wait();
    console.log('Done');
};

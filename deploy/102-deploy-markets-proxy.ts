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
    const proxy = await deployments.get('MarketsProxy');
    contracts.push({
        name: 'MarketsProxy-Test',
        address: proxy.address,
        meta: { constructorArguments: args },
    });
    await verify(hre, 'MarketsProxy', [constants[chainId].address, deployer]);
    console.log(
        `Done. Deployed MarketsProxy on ${proxy.address} with args [${constants[chainId].address},${deployer}]`,
    );
    await updateDeployments(contracts, chainId);

    const contract = await hre.ethers.getContractAt(
        'MarketsProxy',
        proxy.address,
    );
    if (!constants[chainId].isMainChain) {
        console.log('Setting custom adapter params');
        await contract.setUseCustomAdapterParams(true);

        console.log('Setting min dst gas');
        for (let i = 0; i < constants[chainId].connectedLzIds.length; i++) {
            await contract.setMinDstGas(
                constants[chainId].connectedLzIds[i],
                1,
                200000,
            );
        }
    }
};

export default func;
func.tags = ['MarketsProxy'];

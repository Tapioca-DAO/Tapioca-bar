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

    console.log(`\nDeploying ProxyDeployer`);
    await deploy('ProxyDeployer', {
        from: deployer,
        log: true,
    });
    await verify(hre, 'ProxyDeployer', []);
    const proxyDeployer = await deployments.get('ProxyDeployer');
    contracts.push({
        name: 'ProxyDeployer',
        address: proxyDeployer.address,
        meta: {},
    });
    console.log(
        `Done. Deployed ProxyDeployer on ${proxyDeployer.address} with no arguments`,
    );

    const salt = hre.ethers.utils.formatBytes32String('MarketsProxy');
    console.log(`\nDeploying MarketsProxy for current chain with salt ${salt}`);
    const proxyDeployerContract = await hre.ethers.getContractAt(
        'ProxyDeployer',
        proxyDeployer.address,
    );

    console.log(`\nDeploying MarketsProxy`);
    await proxyDeployerContract.deployWithCreate2(
        constants[chainId].address,
        salt,
    );
    console.log(`Done`);
    const count = await proxyDeployerContract.proxiesCount();
    const proxy = await proxyDeployerContract.proxies(count.sub(1));

    contracts.push({
        name: 'MarketsProxy',
        address: proxy,
        meta: {},
    });

    console.log(
        `Done. Deployed Proxy on ${proxy} with args [${constants[chainId].address}, ${deployer}]`,
    );

    await updateDeployments(contracts, chainId);
};

export default func;
func.tags = ['ProxyDeployer'];

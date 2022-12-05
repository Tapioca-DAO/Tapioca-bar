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

    console.log('\n Deploying Mock tokens');
    // const args = [hre.ethers.utils.parseEther('10000000000')];
    await deploy('WETH9Mock', {
        from: deployer,
        log: true,
    });
    await verify(hre, 'WETH9Mock', []);
    const deployedWeth = await deployments.get('WETH9Mock');
    contracts.push({
        name: 'WETH9Mock',
        address: deployedWeth.address,
        meta: {},
    });
    console.log(
        `Done. Deployed WETH9Mock on ${deployedWeth.address} with no arguments`,
    );

    const args = [hre.ethers.utils.parseEther('10000000000').toString()];
    await deploy('ERC20Mock', {
        from: deployer,
        log: true,
        args,
    });
    await verify(hre, 'ERC20Mock', args);
    const deployedUsdc = await deployments.get('ERC20Mock');
    contracts.push({
        name: 'ERC20Mock',
        address: deployedUsdc.address,
        meta: { constructorArguments: args },
    });
    console.log(
        `Done. Deployed ERC20Mock on ${deployedUsdc.address} with no args [${args}]`,
    );
    await updateDeployments(contracts, chainId);
};

export default func;
func.tags = ['MockTokens'];

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

    console.log('\n Deploying BeachBar');
    let yieldBoxAddress = constants[chainId].yieldBoxAddress;
    if (
        !hre.ethers.utils.isAddress(yieldBoxAddress!) ||
        yieldBoxAddress == hre.ethers.constants.AddressZero
    ) {
        const deployedYieldBox = await deployments.get('YieldBox');
        yieldBoxAddress = deployedYieldBox.address;
    }

    const args = [yieldBoxAddress, constants[chainId].tapAddress];
    await deploy('BeachBar', {
        from: deployer,
        log: true,
        args,
    });
    await verify(hre, 'BeachBar', args);
    const deployedBeachBar = await deployments.get('BeachBar');
    contracts.push({
        contract: deployedBeachBar,
        args: args,
        artifact: 'BeachBar',
    });
    console.log('Done');

    await updateDeployments(contracts, chainId);

    console.log('\n Setting feeTo & feeVeTo');
    const beachBarContract = await hre.ethers.getContractAt(
        'BeachBar',
        deployedBeachBar.address,
    );
    await (await beachBarContract.setFeeTo(constants[chainId].feeTo)).wait();
    await (
        await beachBarContract.setFeeVeTap(constants[chainId].feeVeTo)
    ).wait();
    console.log('Done');
};

export default func;
func.tags = ['BeachBar'];

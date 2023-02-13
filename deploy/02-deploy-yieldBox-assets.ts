import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Address, DeployFunction } from 'hardhat-deploy/types';
import { verify, updateDeployments, constants } from './utils';
import { TContract } from 'tapioca-sdk/dist/shared';
import _ from 'lodash';

// It does not deploy, but registers assets to YieldBox
// Created as a separate file in case YieldBox is already there
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await hre.getChainId();
    const contracts: TContract[] = [];

    let yieldBoxAddress = constants[chainId]?.yieldBoxAddress;
    if (
        !hre.ethers.utils.isAddress(yieldBoxAddress!) ||
        yieldBoxAddress == hre.ethers.constants.AddressZero
    ) {
        const deployedYieldBox = await deployments.get('YieldBox');
        yieldBoxAddress = deployedYieldBox.address;
    }

    const yieldBoxContract = await hre.ethers.getContractAt(
        'YieldBox',
        yieldBoxAddress,
    );

    console.log('\n Settings assets on YieldBox');
    const assets = constants[chainId].assets;
    for (let i = 0; i < assets.length; i++) {
        console.log(`\n   registering ${assets[i].name}`);

        await (
            await yieldBoxContract.registerAsset(
                1,
                assets[i].address,
                assets[i].strategy,
                0,
            )
        ).wait();
        console.log('   done');
    }
    console.log(`Done`);
};

export default func;
func.tags = ['YieldBoxAssets'];

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { verify, updateDeployments } from './utils';
import _ from 'lodash';
import { TContract } from 'tapioca-sdk/dist/shared';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await hre.getChainId();
    const contracts: TContract[] = [];

    console.log('\n Deploying MasterContract');
    await deploy('MediumRiskMC', {
        contract: 'Mixologist',
        from: deployer,
        log: true,
    });
    await verify(hre, 'MediumRiskMC', []);
    const mediumRiskMC = await deployments.get('MediumRiskMC');
    contracts.push({
        name: 'MediumRiskMC',
        address: mediumRiskMC.address,
        meta: {},
    });
    console.log(
        `Done. Deployed MediumRiskMC on ${mediumRiskMC.address} with no arguments`,
    );

    await updateDeployments(contracts, chainId);

    const beachBarContract = await hre.ethers.getContractAt(
        'BeachBar',
        (
            await deployments.get('BeachBar')
        ).address,
    );

    console.log('\n Setting MasterContract on BeachBar');
    await (
        await beachBarContract.registerMasterContract(mediumRiskMC.address, 1)
    ).wait();
    console.log(`Done`);
};

export default func;
func.tags = ['MasterContract'];

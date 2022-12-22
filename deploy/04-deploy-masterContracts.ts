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
        contract: 'Singularity',
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


    const penroseContract = await hre.ethers.getContractAt(
        'Penrose',
        (
            await deployments.get('Penrose')
        ).address,
    );

    console.log('\n Setting MasterContract on Penrose');
    await (
        await penroseContract.registerSingularityMasterContract(mediumRiskMC.address, 1)
    ).wait();
    console.log(`Done`);


    console.log('\n Deploying BingBangMasterContract');
    await deploy('BingBangMediumRiskMC', {
        contract: 'BingBang',
        from: deployer,
        log: true,
    });
    await verify(hre, 'BingBangMediumRiskMC', []);
    const bingBangMediumRiskMC = await deployments.get('BingBangMediumRiskMC');
    contracts.push({
        name: 'BingBangMediumRiskMC',
        address: bingBangMediumRiskMC.address,
        meta: {},
    });
    console.log(
        `Done. Deployed BingBangMediumRiskMC on ${bingBangMediumRiskMC.address} with no arguments`,
    );
    console.log('\n Setting BingBangMasterContract on Penrose');
    await (
        await penroseContract.registerBingBangMasterContract(bingBangMediumRiskMC.address, 1)
    ).wait();
    console.log(`Done`);


    await updateDeployments(contracts, chainId);

};

export default func;
func.tags = ['MasterContract'];

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { TContract } from 'tapioca-sdk/dist/shared';
import { getDeployments } from './getDeployments';

export const getBeachBarContract = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    let deployments: TContract[] = [];
    try {
        deployments = await getDeployments(hre, true);
    } catch (e) {
        deployments = await getDeployments(hre);
    }

    const beachBar = _.find(deployments, { name: 'bar' });
    if (!beachBar) {
        throw new Error('[-] BeachBar not found');
    }

    const beachBarContract = await hre.ethers.getContractAt(
        'BeachBar',
        beachBar.address,
    );

    return { beachBarContract };
};

export const getMixologistContract = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    let deployments: TContract[] = [];
    try {
        deployments = await getDeployments(hre, true);
    } catch (e) {
        deployments = await getDeployments(hre);
    }

    const mixologistAddress = taskArgs['mixologist'];
    if (!hre.ethers.utils.isAddress(mixologistAddress)) {
        throw new Error('[-] Mixologist address not valid');
    }

    const mixologistContract = await hre.ethers.getContractAt(
        'Mixologist',
        mixologistAddress,
    );
    return { mixologistContract, mixologistAddress };
};

export const getMixologistHelperContract = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    let deployments: TContract[] = [];
    try {
        deployments = await getDeployments(hre, true);
    } catch (e) {
        deployments = await getDeployments(hre);
    }

    const mixologistHelper = _.find(deployments, { name: 'mixologistHelper' });
    if (!mixologistHelper) {
        throw new Error('[-] Helper not found');
    }

    const mixologistHelperContract = await hre.ethers.getContractAt(
        'MixhologistHelper',
        mixologistHelper.address,
    );

    return { mixologistHelperContract };
};

export const getYieldBoxContract = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    let deployments: TContract[] = [];
    try {
        deployments = await getDeployments(hre, true);
    } catch (e) {
        deployments = await getDeployments(hre);
    }

    const yieldBox = _.find(deployments, { name: 'yieldBox' });
    if (!yieldBox) {
        throw new Error('[-] YieldBox not found');
    }

    const yieldBoxContract = await hre.ethers.getContractAt(
        'YieldBox',
        yieldBox.address,
    );

    return { yieldBoxContract };
};

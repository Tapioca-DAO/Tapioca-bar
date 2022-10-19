import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { TContract } from 'tapioca-sdk/dist/shared';
import { getDeployments } from './getDeployments';

export const getDeployment = async (
    hre: HardhatRuntimeEnvironment,
    name: string,
) => {
    let deployments: TContract[] = [];

    try {
        deployments = await getDeployments(hre, true);
    } catch (e) {
        deployments = await getDeployments(hre);
    }

    const deployment = _.find(deployments, { name: name });
    if (!deployment) {
        throw new Error('[-] Contract not found');
    }

    const contract = await hre.ethers.getContractAt(name, deployment.address);

    return contract;
};

export const getMixologistContract = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
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

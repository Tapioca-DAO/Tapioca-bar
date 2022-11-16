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

export const getSingularityContract = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const singularityAddress = taskArgs['singularity'];
    if (!hre.ethers.utils.isAddress(singularityAddress)) {
        throw new Error('[-] Singularity address not valid');
    }

    const singularityContract = await hre.ethers.getContractAt(
        'Singularity',
        singularityAddress,
    );
    return { singularityContract, singularityAddress };
};

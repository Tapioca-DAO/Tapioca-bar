import { Contract } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { typechain } from 'tapioca-sdk';
import { TDeploymentVMContract } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { TContract } from 'tapioca-sdk/dist/shared';
import { getDeployments } from './views/getDeployments';

export const loadVM = async (
    hre: HardhatRuntimeEnvironment,
    tag: string,
    debugMode = false,
) => {
    const signer = (await hre.ethers.getSigners())[0];
    const VM = new hre.SDK.DeployerVM(hre, {
        // Change this if you get bytecode size error / gas required exceeds allowance (550000000)/ anything related to bytecode size
        // Could be different by network/RPC provider
        bytecodeSizeLimit: 100_000,
        multicall: typechain.Multicall.MulticallWithReason__factory.connect(
            hre.SDK.config.MULTICALL_ADDRESS,
            signer,
        ),
        debugMode,
        tag,
    });
    return VM;
};

export const getAfterDepContract = async <T extends Contract>(
    hre: HardhatRuntimeEnvironment,
    deps: TDeploymentVMContract[],
    contractName: string,
    artifactName?: string,
) => {
    /**
     * Load addresses
     */
    const contractAddr = deps.find((e) => e.name === contractName)?.address;

    if (!contractAddr) {
        throw new Error(`[-] +Call queue: ${contractName} not found`);
    }

    /**
     * Load contracts
     */
    return (await hre.ethers.getContractAt(
        artifactName ?? contractName,
        contractAddr,
    )) as T;
};

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
    const singularityAddress = taskArgs['market'];
    if (!hre.ethers.utils.isAddress(singularityAddress)) {
        throw new Error('[-] Singularity address not valid');
    }

    const singularityContract = await hre.ethers.getContractAt(
        'Singularity',
        singularityAddress,
    );
    return { singularityContract, singularityAddress };
};

export const getBigBangContract = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const bigBangAddress = taskArgs['market'];
    if (!hre.ethers.utils.isAddress(bigBangAddress)) {
        throw new Error('[-] BigBang address not valid');
    }

    const bigBangContract = await hre.ethers.getContractAt(
        'Singularity',
        bigBangAddress,
    );
    return { bigBangContract, bigBangAddress };
};

import { Contract, ContractFactory } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { typechain } from 'tapioca-sdk';
import {
    IDeployerVMAdd,
    TDeploymentVMContract,
} from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { TContract } from '@tapioca-sdk//shared';
import { getDeployments } from './view/getDeployments';
import { EChainID } from '@tapioca-sdk//api/config';

export const loadVM = async (
    hre: HardhatRuntimeEnvironment,
    tag: string,
    debugMode = true,
) => {
    const signer = (await hre.ethers.getSigners())[0];
    const chainInfo = hre.SDK.utils.getChainBy('chainId', hre.SDK.eChainId);
    // const multicallAddress =
    //     hre.SDK.config.MULTICALL_ADDRESSES[chainInfo?.chainId];
    // if (!multicallAddress) {
    //     throw '[-] Multicall not deployed';
    // }

    const VM = new hre.SDK.DeployerVM(hre, {
        // Change this if you get bytecode size error / gas required exceeds allowance (550000000)/ anything related to bytecode size
        // Could be different by network/RPC provider
        bytecodeSizeLimit: 60_000,
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

export const getBigBangContract = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const bigBangAddress = taskArgs['bigBang'];
    if (!hre.ethers.utils.isAddress(bigBangAddress)) {
        throw new Error('[-] BigBang address not valid');
    }

    const bigBangContract = await hre.ethers.getContractAt(
        'Singularity',
        bigBangAddress,
    );
    return { bigBangContract, bigBangAddress };
};

export const deployMultisigMock = async (
    hre: HardhatRuntimeEnvironment,
    numOfConfiramtions: number,
    owners: string[],
): Promise<string> => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('MultisigMock', {
        from: deployer,
        log: true,
        args: [numOfConfiramtions],
    });
    const deployed = await deployments.get('MultisigMock');

    await hre.run('verify', {
        address: deployed.address,
        constructorArgsParams: [numOfConfiramtions.toString()],
    });

    for (let i = 0; i < owners.length; i++) {
        const ctr = await hre.ethers.getContractAt(
            'MultisigMock',
            deployed.address,
        );
        await ctr.addOwner(owners[i]);
    }
    return deployed.address;
};

export const getLocalContract = async (
    hre: HardhatRuntimeEnvironment,
    contractName: string,
    contractAddress?: string,
) => {
    if (!contractAddress) return;
    return await hre.ethers.getContractAt(contractName, contractAddress);
};

export const transferOwnership = async (
    hre: HardhatRuntimeEnvironment,
    deployments: IDeployerVMAdd<ContractFactory>[],
    tag: string,
    chainId: string,
    multisigAddress: string,
) => {
    for (let i = 0; i < deployments.length; i++) {
        const deployment = deployments[i];

        const crtContract = await getLocalContract(
            hre,
            deployment.deploymentName,
            hre.SDK.db
                .loadLocalDeployment(tag, chainId)
                .find((e) => e.name.startsWith(deployment.deploymentName))
                ?.address,
        );
        await crtContract.transferOwnership(multisigAddress);
    }
};

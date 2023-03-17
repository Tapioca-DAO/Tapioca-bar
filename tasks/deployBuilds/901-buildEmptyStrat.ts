import { ContractFactory } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';

export const buildEmptyStrat = async (
    hre: HardhatRuntimeEnvironment,
    tokenName: string,
): Promise<IDeployerVMAdd<ContractFactory>> => {
    return {
        deploymentName: 'ERC20WithoutStrategy-' + tokenName,
        contract: await hre.ethers.getContractFactory('ERC20WithoutStrategy'),
        args: [
            // Yieldbox, to be replaced by VM
            hre.ethers.constants.AddressZero,
            // USD0, to be replaced by VM
            hre.ethers.constants.AddressZero,
        ],
        meta: {
            stratFor: tokenName,
        },
        dependsOn: [
            { argPosition: 0, deploymentName: 'YieldBox' },
            { argPosition: 1, deploymentName: tokenName },
        ],
    };
};

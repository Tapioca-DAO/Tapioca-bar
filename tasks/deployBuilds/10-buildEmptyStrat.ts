import { ContractFactory } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { TContract } from 'tapioca-sdk/dist/shared';

export const buildEmptyStrat = async (
    hre: HardhatRuntimeEnvironment,
    yieldBoxAddress: string,
    token: TContract,
): Promise<IDeployerVMAdd<ContractFactory>> => {
    console.log(`TOKEN NAME ${token.name}`);
    return {
        deploymentName: 'ERC20WithoutStrategy-' + token.name,
        contract: await hre.ethers.getContractFactory('ERC20WithoutStrategy'),
        args: [
            yieldBoxAddress,
            // USD0, to be replaced by VM
            hre.ethers.constants.AddressZero,
        ],
        meta: {
            stratFor: token.name,
        },
    };
};

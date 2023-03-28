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
    if (!token.address) throw '[-] Token needs to be deployed';
    if (!yieldBoxAddress) throw '[-] YieldBox needs to be deployed';

    return {
        deploymentName: 'ERC20WithoutStrategy-' + token.name,
        contract: await hre.ethers.getContractFactory('ERC20WithoutStrategy'),
        args: [yieldBoxAddress, token.address],
        meta: {
            stratFor: token.name,
        },
    };
};

import { ContractFactory } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { TContract } from '@tapioca-sdk//shared';

export const buildEmptyStrat = async (
    hre: HardhatRuntimeEnvironment,
    yieldBox: string,
    token: TContract,
): Promise<IDeployerVMAdd<ContractFactory>> => {
    console.log(`TOKEN NAME ${token.name}`);
    if (!token.address) throw '[-] Token needs to be deployed';
    if (!yieldBox) throw '[-] YieldBox needs to be deployed';

    return {
        deploymentName: 'ERC20WithoutStrategy-' + token.name,
        contract: await hre.ethers.getContractFactory('ERC20WithoutStrategy'),
        args: [yieldBox, token.address],
        meta: {
            stratFor: token.name,
        },
    };
};

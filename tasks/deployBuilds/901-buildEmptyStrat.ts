import { ContractFactory } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { TContract } from 'tapioca-sdk/dist/shared';
import { ERC20WithoutStrategy__factory } from '../../typechain';

export const buildEmptyStrat = async (
    hre: HardhatRuntimeEnvironment,
    yieldBox: string,
    tokens: TContract[],
): Promise<IDeployerVMAdd<ContractFactory>[]> => {
    const builds: IDeployerVMAdd<ERC20WithoutStrategy__factory>[] = [];

    for (const token of tokens) {
        builds.push({
            deploymentName: 'ERC20WithoutStrategy-' + token.name,
            contract: await hre.ethers.getContractFactory(
                'ERC20WithoutStrategy',
            ),
            args: [yieldBox, token.address],
            meta: {
                stratFor: token.name,
            },
        });
    }

    return builds;
};

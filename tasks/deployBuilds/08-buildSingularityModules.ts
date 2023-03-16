import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import {
    SGLLendingBorrowing__factory,
    SGLLiquidation__factory,
} from '../../typechain';

export const buildSingularityModules = async (
    hre: HardhatRuntimeEnvironment,
): Promise<
    [
        IDeployerVMAdd<SGLLiquidation__factory>,
        IDeployerVMAdd<SGLLendingBorrowing__factory>,
    ]
> => {
    return [
        {
            contract: await hre.ethers.getContractFactory('SGLLiquidation'),
            deploymentName: 'SGLLiquidation',
            args: [],
        },
        {
            contract: await hre.ethers.getContractFactory(
                'SGLLendingBorrowing',
            ),
            deploymentName: 'SGLLendingBorrowing',
            args: [],
        },
    ];
};

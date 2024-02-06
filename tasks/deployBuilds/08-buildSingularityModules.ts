import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import {
    SGLCollateral__factory,
    SGLBorrow__factory,
    SGLLeverage__factory,
    SGLLiquidation__factory,
} from '../../typechain';

export const buildSingularityModules = async (
    hre: HardhatRuntimeEnvironment,
): Promise<
    [
        IDeployerVMAdd<SGLLiquidation__factory>,
        IDeployerVMAdd<SGLBorrow__factory>,
        IDeployerVMAdd<SGLCollateral__factory>,
        IDeployerVMAdd<SGLLeverage__factory>,
    ]
> => {
    return [
        {
            contract: await hre.ethers.getContractFactory('SGLLiquidation'),
            deploymentName: 'SGLLiquidation',
            args: [],
        },
        {
            contract: await hre.ethers.getContractFactory('SGLBorrow'),
            deploymentName: 'SGLBorrow',
            args: [],
        },
        {
            contract: await hre.ethers.getContractFactory('SGLCollateral'),
            deploymentName: 'SGLCollateral',
            args: [],
        },
        {
            contract: await hre.ethers.getContractFactory('SGLLeverage'),
            deploymentName: 'SGLLeverage',
            args: [],
        },
    ];
};

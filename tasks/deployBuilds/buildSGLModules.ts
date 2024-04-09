import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import {
    SGLBorrow__factory,
    SGLCollateral__factory,
    SGLLeverage__factory,
    SGLLiquidation__factory,
} from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from 'tasks/deploy/DEPLOY_CONFIG';

export const buildSGLModules = async (
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
            deploymentName: DEPLOYMENT_NAMES.SGL_LIQUIDATION_MODULE,
            args: [],
        },
        {
            contract: await hre.ethers.getContractFactory('SGLBorrow'),
            deploymentName: DEPLOYMENT_NAMES.SGL_BORROW_MODULE,
            args: [],
        },
        {
            contract: await hre.ethers.getContractFactory('SGLCollateral'),
            deploymentName: DEPLOYMENT_NAMES.SGL_COLLATERAL_MODULE,
            args: [],
        },
        {
            contract: await hre.ethers.getContractFactory('SGLLeverage'),
            deploymentName: DEPLOYMENT_NAMES.SGL_COLLATERAL_MODULE,
            args: [],
        },
    ];
};

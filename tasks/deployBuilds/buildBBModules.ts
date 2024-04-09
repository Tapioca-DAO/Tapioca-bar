import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import {
    BBBorrow__factory,
    BBCollateral__factory,
    BBLeverage__factory,
    BBLiquidation__factory,
} from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from 'tasks/deploy/DEPLOY_CONFIG';

export const buildBBModules = async (
    hre: HardhatRuntimeEnvironment,
): Promise<
    [
        IDeployerVMAdd<BBLiquidation__factory>,
        IDeployerVMAdd<BBBorrow__factory>,
        IDeployerVMAdd<BBCollateral__factory>,
        IDeployerVMAdd<BBLeverage__factory>,
    ]
> => {
    return [
        {
            contract: await hre.ethers.getContractFactory('BBLiquidation'),
            deploymentName: DEPLOYMENT_NAMES.BB_LIQUIDATION_MODULE,
            args: [],
        },
        {
            contract: await hre.ethers.getContractFactory('BBBorrow'),
            deploymentName: DEPLOYMENT_NAMES.BB_BORROW_MODULE,
            args: [],
        },
        {
            contract: await hre.ethers.getContractFactory('BBCollateral'),
            deploymentName: DEPLOYMENT_NAMES.BB_COLLATERAL_MODULE,
            args: [],
        },
        {
            contract: await hre.ethers.getContractFactory('BBLeverage'),
            deploymentName: DEPLOYMENT_NAMES.BB_COLLATERAL_MODULE,
            args: [],
        },
    ];
};

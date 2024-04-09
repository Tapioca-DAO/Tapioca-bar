import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import {
    BBCollateral__factory,
    BBBorrow__factory,
    BBLeverage__factory,
    BBLiquidation__factory,
} from '../../typechain';

export const buildBigBangModules = async (
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
            deploymentName: 'BBLiquidation',
            args: [],
        },
        {
            contract: await hre.ethers.getContractFactory('BBBorrow'),
            deploymentName: 'BBBorrow',
            args: [],
        },
        {
            contract: await hre.ethers.getContractFactory('BBCollateral'),
            deploymentName: 'BBCollateral',
            args: [],
        },
        {
            contract: await hre.ethers.getContractFactory('BBLeverage'),
            deploymentName: 'BBLeverage',
            args: [],
        },
    ];
};

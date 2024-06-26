import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { BigBang__factory, Singularity__factory } from '../../typechain';

export const buildMasterContracts = async (
    hre: HardhatRuntimeEnvironment,
): Promise<
    [IDeployerVMAdd<Singularity__factory>, IDeployerVMAdd<BigBang__factory>]
> => {
    return [
        {
            contract: await hre.ethers.getContractFactory('Singularity'),
            deploymentName: 'MediumRiskMC',
            args: [],
        },
        {
            contract: await hre.ethers.getContractFactory('BigBang'),
            deploymentName: 'BigBangMediumRiskMC',
            args: [],
        },
    ];
};

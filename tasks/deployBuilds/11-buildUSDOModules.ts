import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import {
    USDOMarketModule__factory,
    USDOLeverageModule__factory,
    USDOOptionsModule__factory,
} from '../../typechain';

export const buildUSDOModules = async (
    lzEndpoint: string,
    hre: HardhatRuntimeEnvironment,
    yieldBox: string,
    cluster: string,
): Promise<
    [
        IDeployerVMAdd<USDOLeverageModule__factory>,
        IDeployerVMAdd<USDOMarketModule__factory>,
        IDeployerVMAdd<USDOOptionsModule__factory>,
    ]
> => {
    return [
        {
            contract: await hre.ethers.getContractFactory('USDOLeverageModule'),
            deploymentName: 'USDOLeverageModule',
            args: [lzEndpoint, yieldBox, cluster],
            dependsOn: [
                { argPosition: 1, deploymentName: 'YieldBox' },
                { argPosition: 2, deploymentName: 'Cluster' },
            ],
        },
        {
            contract: await hre.ethers.getContractFactory('USDOMarketModule'),
            deploymentName: 'USDOMarketModule',
            args: [lzEndpoint, yieldBox, cluster],
            dependsOn: [
                { argPosition: 1, deploymentName: 'YieldBox' },
                { argPosition: 2, deploymentName: 'Cluster' },
            ],
        },
        {
            contract: await hre.ethers.getContractFactory('USDOOptionsModule'),
            deploymentName: 'USDOOptionsModule',
            args: [lzEndpoint, yieldBox, cluster],
            dependsOn: [
                { argPosition: 1, deploymentName: 'YieldBox' },
                { argPosition: 2, deploymentName: 'Cluster' },
            ],
        },
    ];
};

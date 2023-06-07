import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import {
    USDOMarketModule__factory,
    USDOLeverageModule__factory,
} from '../../typechain';

export const buildUSDOModules = async (
    lzEndpoint: string,
    hre: HardhatRuntimeEnvironment,
): Promise<
    [
        IDeployerVMAdd<USDOLeverageModule__factory>,
        IDeployerVMAdd<USDOMarketModule__factory>,
    ]
> => {
    return [
        {
            contract: await hre.ethers.getContractFactory('USDOLeverageModule'),
            deploymentName: 'USDOLeverageModule',
            args: [
                lzEndpoint,
                hre.ethers.constants.AddressZero, // YieldBoxURIBuilder, to be replaced by VM
            ],
            dependsOn: [{ argPosition: 1, deploymentName: 'YieldBox' }],
        },
        {
            contract: await hre.ethers.getContractFactory('USDOMarketModule'),
            deploymentName: 'USDOMarketModule',
            args: [
                lzEndpoint,
                hre.ethers.constants.AddressZero, // YieldBoxURIBuilder, to be replaced by VM
            ],
            dependsOn: [{ argPosition: 1, deploymentName: 'YieldBox' }],
        },
    ];
};

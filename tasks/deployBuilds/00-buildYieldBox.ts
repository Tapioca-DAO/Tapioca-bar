import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import {
    YieldBoxURIBuilder__factory,
    YieldBox__factory,
} from '../../typechain';

// TODO - Put WETH9 in params for prod
export const buildYieldBox = async (
    hre: HardhatRuntimeEnvironment,
    weth: string,
): Promise<
    [
        IDeployerVMAdd<YieldBoxURIBuilder__factory>,
        IDeployerVMAdd<YieldBox__factory>,
    ]
> => {
    const ybURIBuilder = await hre.ethers.getContractFactory(
        'YieldBoxURIBuilder',
    );
    const yb = await hre.ethers.getContractFactory('YieldBox');

    return [
        {
            contract: ybURIBuilder,
            deploymentName: 'YieldBoxURIBuilder',
            args: [],
        },
        {
            contract: yb,
            deploymentName: 'YieldBox',
            args: [
                weth,
                // YieldBoxURIBuilder, to be replaced by VM
                hre.ethers.constants.AddressZero,
            ],
            dependsOn: [
                { argPosition: 1, deploymentName: 'YieldBoxURIBuilder' },
            ],
        },
    ];
};

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import {
    YieldBox__factory,
    YieldBoxURIBuilder__factory,
} from '@tapioca-sdk//typechain/YieldBox';
import YieldBoxArtifact from '@tapioca-sdk//artifacts/YieldBox/contracts/YieldBox.sol/YieldBox.json';
import YieldBoxURIBuilderArtifact from '@tapioca-sdk//artifacts/YieldBox/contracts/YieldBoxURIBuilder.sol/YieldBoxURIBuilder.json';

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
    const signer = (await hre.ethers.getSigners())[0];

    const YieldBoxURIBuilder = (
        (await hre.ethers.getContractFactoryFromArtifact(
            YieldBoxURIBuilderArtifact,
        )) as YieldBoxURIBuilder__factory
    ).connect(signer);

    const YieldBox = (
        (await hre.ethers.getContractFactoryFromArtifact(
            YieldBoxArtifact,
        )) as YieldBox__factory
    ).connect(signer);

    return [
        {
            contract: YieldBoxURIBuilder,
            deploymentName: 'YieldBoxURIBuilder',
            args: [],
        },
        {
            contract: YieldBox,
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

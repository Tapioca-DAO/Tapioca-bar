import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import {
    CurveSwapper__factory,
    CurveStableToUsdoBidder__factory,
} from '@tapioca-sdk//typechain/tapioca-periphery';
import CurveSwapperArtifact from '@tapioca-sdk//artifacts/tapioca-periphery/CurveSwapper.json';
import CurveStableToUsdoBidderArtifact from '@tapioca-sdk//artifacts/tapioca-periphery/CurveStableToUsdoBidder.json';

// TODO - @Rektora, didn't had time to check if this is relevant/needed, coming back to it later
export const buildStableToUSD0Bidder = async (
    hre: HardhatRuntimeEnvironment,
    crvStablePoolAddr: string,
    yieldBox: string,
    curvePoolAssetCount = '4',
): Promise<
    [
        IDeployerVMAdd<CurveSwapper__factory>,
        IDeployerVMAdd<CurveStableToUsdoBidder__factory>,
    ]
> => {
    const CurveSwapper = (await hre.ethers.getContractFactoryFromArtifact(
        CurveSwapperArtifact,
    )) as CurveSwapper__factory;

    const CurveStableToUsdoBidder =
        (await hre.ethers.getContractFactoryFromArtifact(
            CurveStableToUsdoBidderArtifact,
        )) as CurveStableToUsdoBidder__factory;

    return [
        {
            contract: CurveSwapper,
            deploymentName: 'CurveSwapper',
            args: [crvStablePoolAddr, yieldBox],
            dependsOn: [{ argPosition: 1, deploymentName: 'YieldBox' }],
            runStaticSimulation: false,
        },
        {
            contract: CurveStableToUsdoBidder,
            deploymentName: 'CurveStableToUsdoBidder',
            args: [
                // CurveSwapper, to be replaced by VM
                hre.ethers.constants.AddressZero,
                curvePoolAssetCount,
            ],
            dependsOn: [
                { argPosition: 0, deploymentName: 'CurveSwapper' },
                { argPosition: 1, deploymentName: 'Penrose' },
            ],
            runStaticSimulation: false,
        },
    ];
};

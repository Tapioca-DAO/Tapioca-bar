import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { CurveSwapper__factory } from 'tapioca-sdk/dist/typechain/tapioca-periphery';
import { CurveStableToUsdoBidder__factory } from '../../typechain';

// TODO - @Rektora, didn't had time to check if this is relevant/needed, coming back to it later
export const buildStableToUSD0Bidder = async (
    hre: HardhatRuntimeEnvironment,
    crvStablePoolAddr: string,
    curvePoolAssetCount = '4',
): Promise<
    [
        IDeployerVMAdd<CurveSwapper__factory>,
        IDeployerVMAdd<CurveStableToUsdoBidder__factory>,
    ]
> => {
    return [
        {
            contract: await hre.ethers.getContractFactory('CurveSwapper'),
            deploymentName: 'CurveSwapper',
            args: [
                crvStablePoolAddr,
                // Penrose, to be replaced by VM
                hre.ethers.constants.AddressZero,
            ],
            dependsOn: [{ argPosition: 1, deploymentName: 'Penrose' }],
            runStaticSimulation: false,
        },
        {
            contract: await hre.ethers.getContractFactory(
                'CurveStableToUsdoBidder',
            ),
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

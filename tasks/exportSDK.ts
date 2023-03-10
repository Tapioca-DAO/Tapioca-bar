import { HardhatRuntimeEnvironment } from 'hardhat/types';
import SDK from 'tapioca-sdk';
import { TLocalDeployment } from 'tapioca-sdk/dist/shared';

/**
 * Script used to generate typings for the tapioca-sdk
 * https://github.com/Tapioca-DAO/tapioca-sdk
 */
export const exportSDK__task = async (
    taskArgs: { tag?: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const chainId = await hre.getChainId();
    console.log(`\nRetrieving deployments for chain ${chainId}`);

    SDK.API.exportSDK.run({
        projectCaller: 'Tapioca-Bar',
        artifactPath: './artifacts',
        contractNames: [
            'YieldBox',
            'USD0',
            'BigBang',
            'Penrose',
            'SGLLendingBorrowing',
            'SGLLiquidation',
            'Singularity',
            'ProxyDeployer',
            'MarketsProxy',
            'MarketsHelper',
            'MultiSwapper',
            'LiquidationQueue',
        ],
        deployment: {
            tag: taskArgs.tag ?? 'default',
            data: SDK.API.db.readDeployment('local', {
                tag: taskArgs.tag,
                chainId,
                project: 'Tapioca-Bar',
            }) as TLocalDeployment,
        },
    });
};

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import SDK from 'tapioca-sdk';
import { TContract, TProjectDeployment } from 'tapioca-sdk/dist/shared';
import { getDeployments } from './getDeployments';

/**
 * Script used to generate typings for the tapioca-sdk
 * https://github.com/Tapioca-DAO/tapioca-sdk
 */
export const exportSDK__task = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    const chainId = await hre.getChainId();
    console.log(`\nRetrieving deployments for chain ${chainId}`);

    const _deployments: TProjectDeployment = {
        [chainId as keyof TProjectDeployment]: (
            (await getDeployments(hre, true)) ?? []
        ).map((e: TContract) => ({
            address: e.address,
            meta: {},
            name: e.name,
        })),
    };
    console.log('\nExporting:');
    await SDK.API.exportSDK.run({
        projectCaller: 'Tapioca-Bar',
        contractNames: [
            'YieldBox',
            'USD0',
            'MinterMixologist',
            'BeachBar',
            'Mixologist',
            'MixologistHelper',
            'ERC20',
            'ERC20Mock',
        ],
        artifactPath: hre.config.paths.artifacts,
        _deployments,
    });
    console.log('Done');
};

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
    const _deployments: TProjectDeployment = {
        [(await hre.getChainId()) as keyof TProjectDeployment]: (
            (await getDeployments(hre, true)) ?? []
        ).map((e: TContract) => ({
            address: e.address,
            meta: {},
            name: e.name,
        })),
    };
    console.log('[+] Exporting:');
    console.log(JSON.stringify(_deployments, null, 2));
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
};

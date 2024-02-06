import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import SDK from 'tapioca-sdk';
import { TContract } from '@tapioca-sdk//shared';

export const getDeployments = async (
    hre: HardhatRuntimeEnvironment,
    local?: boolean,
): Promise<TContract[]> => {
    if (local) {
        return JSON.parse(
            fs.readFileSync(
                SDK.API.utils.PROJECT_RELATIVE_DEPLOYMENT_PATH,
                'utf8',
            ),
        )[hre.SDK.eChainId];
    }
    return SDK.API.utils.getDeployment('Tapioca-Bar', hre.SDK.eChainId);
};

export const getLocalDeployments__task = async function (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) {
    try {
        console.log(await getDeployments(hre, true));
    } catch (e) {
        console.log(
            '[-] No local deployments found on chain id',
            hre.SDK.eChainId,
        );
    }
};

export const getSDKDeployments__task = async function (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) {
    try {
        console.log(await getDeployments(hre));
    } catch (e) {
        console.log(
            '[-] No SDK deployments found on chain id',
            hre.SDK.eChainId,
        );
    }
};

import { createEmptyStratYbAsset__task, loadLocalContract } from 'tapioca-sdk';
import { TContract } from 'tapioca-sdk/dist/shared';
import { TPostDeployParams } from '../1-1-setupPostLbp';
import { DEPLOYMENT_NAMES } from '../DEPLOY_CONFIG';

export async function setupUsdoInPenrose(params: TPostDeployParams) {
    const { hre, VM, deployed, calls, tag } = params;

    const penroseDep = deployed.find(
        (e) => e.name === DEPLOYMENT_NAMES.PENROSE,
    )!;
    const usdoDep = deployed.find((e) => e.name === DEPLOYMENT_NAMES.USDO)!;

    const penrose = await hre.ethers.getContractAt(
        'Penrose',
        penroseDep.address,
    );

    let usdoStratAsset: TContract & { meta: { ybAssetId: string } };
    try {
        usdoStratAsset = loadLocalContract(
            hre,
            hre.SDK.chainInfo.chainId,
            DEPLOYMENT_NAMES.YB_USDO_ASSET_WITHOUT_STRATEGY,
            tag,
        );
        if (
            !usdoStratAsset.meta.ybAssetId ||
            usdoStratAsset.meta.token.toLowerCase() !==
                usdoDep.address.toLowerCase()
        ) {
            throw new Error('[+] 1 - USDO No ybAssetId found');
        }
    } catch (e) {
        console.log('\t[+] Creating USDO Strat Asset');
        await createEmptyStratYbAsset__task(
            {
                deploymentName: DEPLOYMENT_NAMES.YB_USDO_ASSET_WITHOUT_STRATEGY,
                tag,
                token: usdoDep.address,
            },
            hre,
        );
        usdoStratAsset = loadLocalContract(
            hre,
            hre.SDK.chainInfo.chainId,
            DEPLOYMENT_NAMES.YB_USDO_ASSET_WITHOUT_STRATEGY,
            tag,
        );
        if (!usdoStratAsset.meta.ybAssetId) {
            throw new Error('[+] 2- USDO No ybAssetId found');
        }
    }

    if (
        (await penrose.usdoToken()).toLowerCase() !==
        usdoDep.address.toLowerCase()
    ) {
        console.log(
            `\t[+] Setting up USDO ${usdoDep.address} and strat ${usdoStratAsset.address} with id ${usdoStratAsset.meta.ybAssetId} in Penrose ${penroseDep.address}`,
        );
        calls.push({
            target: penrose.address,
            callData: penrose.interface.encodeFunctionData('setUsdoToken', [
                usdoDep.address,
                usdoStratAsset.meta.ybAssetId,
            ]),
            allowFailure: false,
        });
    }
}

import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { Penrose__factory } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES, DEPLOY_CONFIG } from 'tasks/deploy/DEPLOY_CONFIG';

export const buildPenrose = async (
    hre: HardhatRuntimeEnvironment,
    params: {
        yieldBox: string;
        cluster: string;
        tapToken: string;
        pearlmit: string;
        tapAssetId: string;
        wethAssetId: string;
        owner: string;
    },
): Promise<IDeployerVMAdd<Penrose__factory>> => {
    const { yieldBox, cluster, tapToken, pearlmit, owner } = params;
    return {
        contract: await hre.ethers.getContractFactory('Penrose'),
        deploymentName: DEPLOYMENT_NAMES.PENROSE,
        args: [
            yieldBox,
            cluster,
            tapToken,
            DEPLOY_CONFIG.MISC[hre.SDK.eChainId]!.WETH,
            pearlmit,
            params.tapAssetId,
            params.wethAssetId,
            owner,
        ],
        dependsOn: [],
    };
};

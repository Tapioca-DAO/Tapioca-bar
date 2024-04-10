import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { Origins__factory } from '@typechain/index';
import { BigNumberish } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export const buildOrigins = async (
    hre: HardhatRuntimeEnvironment,
    params: {
        deploymentName: string;
        owner: string;
        yieldBox: string;
        asset: string;
        assetStrategy: string;
        collateral: string;
        collateralStrategy: string;
        oracle: string;
        collateralizationRate: BigNumberish;
    },
): Promise<IDeployerVMAdd<Origins__factory>> => {
    const { deploymentName } = params;
    const yieldBox = await hre.ethers.getContractAt(
        'YieldBox',
        params.yieldBox,
    );
    const assetId = await yieldBox.assetId(
        1,
        params.asset,
        params.assetStrategy,
        0,
    );
    const collateralId = await yieldBox.assetId(
        1,
        params.collateral,
        params.collateralStrategy,
        0,
    );

    const exchangeRatePrecision = (1e18).toString();
    return {
        contract: await hre.ethers.getContractFactory('Origins'),
        deploymentName,
        args: [
            params.owner,
            params.yieldBox,
            params.asset,
            assetId,
            params.collateral,
            collateralId,
            exchangeRatePrecision,
            params.oracle,
            params.collateralizationRate,
        ],
        dependsOn: [],
    };
};

import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { IYieldBox, Origins__factory } from '@typechain/index';
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
        penrose: string;
    },
): Promise<IDeployerVMAdd<Origins__factory>> => {
    const { deploymentName } = params;
    const yieldBox = (await hre.ethers.getContractAt(
        'tapioca-periph/interfaces/yieldbox/IYieldBox.sol:IYieldBox',
        params.yieldBox,
    )) as IYieldBox;
    const assetId = await yieldBox.ids(
        1,
        params.asset,
        params.assetStrategy,
        0,
    );
    const collateralId = await yieldBox.ids(
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
            params.oracle,
            exchangeRatePrecision,
            params.collateralizationRate,
            params.penrose,
        ],
        dependsOn: [],
    };
};

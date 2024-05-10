import { TapiocaMulticall } from '@tapioca-sdk/typechain/tapioca-periphery';
import { BigNumber } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { loadContracts__mintOriginUSDO } from '../1-2-deployPostLbp';

export async function mintOriginUSDO__deployPostLbp_2(params: {
    hre: HardhatRuntimeEnvironment;
    tag: string;
    multicallAddr: string;
    collateralAmount: BigNumber;
    borrowAmount: BigNumber;
}): Promise<TapiocaMulticall.CallStruct[]> {
    const calls: TapiocaMulticall.CallStruct[] = [];

    const { hre, tag, collateralAmount, multicallAddr, borrowAmount } = params;
    const { origins, yieldBox, mtETH } = await loadContracts__mintOriginUSDO({
        hre,
        tag,
    });

    const collateralAssetId = await origins._collateralId();

    // Step 1 - Deposit ETH to YieldBox
    {
        // mtETH.approve(yieldBox.address, collateralAmount);
        calls.push({
            target: mtETH.address,
            allowFailure: false,
            callData: mtETH.interface.encodeFunctionData('approve', [
                yieldBox.address,
                collateralAmount,
            ]),
        });

        // yieldBox.depositAsset( collateralAssetId,multicallAddr,multicallAddr,collateralAmount,0);
        calls.push({
            target: yieldBox.address,
            allowFailure: false,
            callData: yieldBox.interface.encodeFunctionData('depositAsset', [
                collateralAssetId,
                multicallAddr,
                multicallAddr,
                collateralAmount,
                0,
            ]),
        });
    }

    // Step 2 - Borrow USDO
    {
        // yieldBox.setApprovalForAsset(origins.address, collateralAssetId, true);
        calls.push({
            target: yieldBox.address,
            allowFailure: false,
            callData: yieldBox.interface.encodeFunctionData(
                'setApprovalForAsset',
                [origins.address, collateralAssetId, true],
            ),
        });

        // origins.addCollateral(collateralAmount, 0);
        calls.push({
            target: origins.address,
            allowFailure: false,
            callData: origins.interface.encodeFunctionData('addCollateral', [
                collateralAmount,
                0,
            ]),
        });

        // origins.borrow(borrowAmount);
        calls.push({
            target: origins.address,
            allowFailure: false,
            callData: origins.interface.encodeFunctionData('borrow', [
                borrowAmount,
            ]),
        });

        // yieldBox.setApprovalForAsset(origins.address, collateralAssetId, false);
        calls.push({
            target: yieldBox.address,
            allowFailure: false,
            callData: yieldBox.interface.encodeFunctionData(
                'setApprovalForAsset',
                [origins.address, collateralAssetId, false],
            ),
        });
    }

    return calls;
}

import { BigNumberish } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import writeJsonFile from 'write-json-file';

//npx hardhat otherChainBorrow --network fuji_avalanche --src-lz-chain-id 10106 --dest-lz-chain-id 10143 --extra-gas 4000000 --asset-id 1 --zro-address 0x0000000000000000000000000000000000000000 --deposit-gas 400000000000000000 --airdrop-gas 200000000000000000 --singularity-gas 800000000000000000 --deposit-amount 25000000000000000000 --oft 0x28D691380D2d8C86f6fdD2e49123C1DA9fa33b32 --proxy 0x68EcA2cd0d7557e61eaf6B6831B892B842e38D65 --singularity-destination 0x3Ee0490ee2cDa3718c2C622f834255B6da393d31 --collateral-share 2500000000000000000000000000 --borrow-amount 1000000000000000000 --withdraw 1
//note: approvals should have been already executed
export const otherChainBorrow__task = async (
    taskArgs: {
        srcLzChainId: string;
        destLzChainId: string;
        extraGas: string;
        assetId: number;
        zroAddress: string;
        depositGas: BigNumberish;
        singularityGas: BigNumberish;
        airdropGas: BigNumberish;
        depositAmount: BigNumberish;
        oft: string;
        proxy: string;
        singularityDestination: string;
        collateralShare: BigNumberish;
        borrowAmount: BigNumberish;
        withdraw: number;
    },
    hre: HardhatRuntimeEnvironment,
) => {
    //Retrieve contracts
    const tapiocaOFT = await hre.ethers.getContractAt(
        'ITapiocaOFT',
        taskArgs.oft,
    );
    const singularityDestination = await hre.ethers.getContractAt(
        'Singularity',
        taskArgs.singularityDestination,
    );
    const proxySrc = await hre.ethers.getContractAt(
        'MarketsProxy',
        taskArgs.proxy,
    );

    //Send to YB
    const confirmations = 25;
    console.log(
        `\nSending to YB from chain ${taskArgs.destLzChainId}. Waiting for ${confirmations} confirmations...`,
    );
    await (
        await tapiocaOFT.sendToYB(
            taskArgs.depositAmount,
            taskArgs.assetId,
            taskArgs.destLzChainId,
            taskArgs.extraGas,
            taskArgs.zroAddress,
            false,
            {
                value: taskArgs.depositGas,
            },
        )
    ).wait(confirmations);
    console.log('Done. YB funds added');

    //Add collateral, borrow and withdraw through the proxy contract
    const signer = (await hre.ethers.getSigners())[0];
    const addCollateralFn = singularityDestination.interface.encodeFunctionData(
        'addCollateral',
        [signer.address, signer.address, false, taskArgs.collateralShare],
    );
    const borrowFn = singularityDestination.interface.encodeFunctionData(
        'borrow',
        [signer.address, signer.address, taskArgs.borrowAmount],
    );
    const withdrawFn = singularityDestination.interface.encodeFunctionData(
        'withdrawTo',
        [
            signer.address,
            taskArgs.srcLzChainId,
            hre.ethers.utils.defaultAbiCoder.encode(
                ['address'],
                [signer.address],
            ),
            taskArgs.borrowAmount,
            hre.ethers.utils.toUtf8Bytes(''),
            signer.address,
        ],
    );

    console.log('\nAdding collateral, borrow & withdraw...');
    let adapterParam = hre.ethers.utils.solidityPack(
        ['uint16', 'uint256'],
        [1, 2250000],
    );
    const lzEndpointSrc = await hre.ethers.getContractAt(
        'ILayerZeroEndpoint',
        await proxySrc.lzEndpoint(),
    );

    const actions = [addCollateralFn, borrowFn];
    if (taskArgs.withdraw == 1) {
        console.log('WITHDRAW TOO');
        adapterParam = hre.ethers.utils.solidityPack(
            ['uint16', 'uint', 'uint', 'address'],
            [2, 2250000, taskArgs.airdropGas, singularityDestination.address],
        );
        actions.push(withdrawFn);
    }

    const fees = await lzEndpointSrc.estimateFees(
        taskArgs.destLzChainId,
        singularityDestination.address,
        hre.ethers.utils.solidityPack(
            ['address', 'address', 'bytes[]'],
            [proxySrc.address, signer.address, actions],
        ),
        false,
        adapterParam,
    );
    if (fees.nativeFee.gt(taskArgs.singularityGas)) {
        throw 'Script: not enough fees';
    }
    await (
        await proxySrc
            .connect(signer)
            .executeOnChain(
                taskArgs.destLzChainId,
                singularityDestination.address,
                actions,
                adapterParam,
                {
                    value: taskArgs.singularityGas,
                },
            )
    ).wait(confirmations);
    console.log('Done');
};

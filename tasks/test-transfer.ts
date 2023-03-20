import { BigNumberish } from 'ethers';
 import { HardhatRuntimeEnvironment } from 'hardhat/types';
 import writeJsonFile from 'write-json-file';

export const transfer__task = async (
    taskArgs: {
        oftAddress: string;
        fromAddress: string;
        toAddress: string;
        dstChainId: string;
        amount: string;
        native: string;
    },
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('\nRetrieving tOFT');
    const endpoint = await hre.ethers.getContractAt(
        'ITapiocaOFT',
        taskArgs.oftAddress,
    );

    console.log(`Sending over chain for ${endpoint.address}`);
    await endpoint.sendFrom(
        taskArgs.fromAddress,
        taskArgs.dstChainId,
        hre.ethers.utils.defaultAbiCoder.encode(
            ['address'],
            [taskArgs.toAddress],
        ),
        taskArgs.amount,
        {
            refundAddress: taskArgs.fromAddress,
            zroPaymentAddress: hre.ethers.constants.AddressZero,
            adapterParams: hre.ethers.utils.solidityPack(
                ['uint16', 'uint256'],
                [1, 2250000],
            ),
        },
        {
            value: taskArgs.native,
        },
    );

    console.log('Done');
};
import { BigNumberish } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import writeJsonFile from 'write-json-file';

//npx hardhat retryPayload --network arbitrum_goerli --src-chain-id 10106 --src-address 0x28D691380D2d8C86f6fdD2e49123C1DA9fa33b32 --dst-address 0xef0871E0e8C3320f5Cf8c0051EC856b9c083660f --lz-endpoint 0x6ab5ae6822647046626e83ee6db8187151e1d5ab --block-hash 0x
export const retryPayload__task = async (
    taskArgs: {
        srcChainId: number;
        srcAddress: string;
        dstAddress: string;
        lzEndpoint: string;
        blockHash: string;
    },
    hre: HardhatRuntimeEnvironment,
) => {
    const endpoint = await hre.ethers.getContractAt(
        'LZEndpointMock',
        taskArgs.lzEndpoint,
    );

    const addrPack = hre.ethers.utils.solidityPack(
        ['address', 'address'],
        [taskArgs.srcAddress, taskArgs.dstAddress],
    );

    const hasPayload = await endpoint.hasStoredPayload(
        taskArgs.srcChainId,
        addrPack,
    );
    console.log(`   *   Has stored payload: ${hasPayload}`);
    if (!hasPayload) return;

    const blockEvents = await endpoint.queryFilter(
        endpoint.filters.PayloadStored(),
        taskArgs.blockHash,
    );
    if (blockEvents.length == 0) return;

    let actualEvent;
    for (let i = 0; i < blockEvents.length; i++) {
        const isRightEvent =
            blockEvents[i].args[0] == taskArgs.srcChainId &&
            blockEvents[i].args[1] == addrPack;
        if (!isRightEvent) continue;

        actualEvent = blockEvents[i];
        break;
    }

    console.log('Retrying payload');
    const payload = actualEvent?.args[4];
    await endpoint.retryPayload(taskArgs.srcChainId, addrPack, payload);
    console.log('Done');
};

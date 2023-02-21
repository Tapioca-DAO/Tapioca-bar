import { BigNumberish } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import writeJsonFile from 'write-json-file';

//npx hardhat hasStoredPayload --network arbitrum_goerli --src-chain-id 10106 --src-address 0x28D691380D2d8C86f6fdD2e49123C1DA9fa33b32 --dst-address 0xef0871E0e8C3320f5Cf8c0051EC856b9c083660f --lz-endpoint 0x6ab5ae6822647046626e83ee6db8187151e1d5ab
export const hasStoredPayload__task = async (
    taskArgs: {
        srcChainId: number;
        srcAddress: string;
        dstAddress: string;
        lzEndpoint: string;
    },
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('\nRetrieving LZEndpoint');
    const endpoint = await hre.ethers.getContractAt(
        'ILayerZeroEndpoint',
        taskArgs.lzEndpoint,
    );

    const addrPack = hre.ethers.utils.solidityPack(
        ['address', 'address'],
        [taskArgs.srcAddress, taskArgs.dstAddress],
    );

    console.log('Checking payload');
    const hasPayload = await endpoint.hasStoredPayload(
        taskArgs.srcChainId,
        addrPack,
    );
    console.log(`   *   Has stored payload: ${hasPayload}`);

    console.log('Done');
};

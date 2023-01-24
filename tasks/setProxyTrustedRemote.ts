import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { glob, runTypeChain } from 'typechain';
import writeJsonFile from 'write-json-file';
import { getDeployment } from './utils';

//npx hardhat setProxyTrustedRemote --network arbitrum_goerli --chain 10106 --dst 0x68EcA2cd0d7557e61eaf6B6831B892B842e38D65 --src 0x4806ab44E687AC1Fdb01339A718656b0838D9027
//npx hardhat setProxyTrustedRemote --network arbitrum_goerli --chain 10109 --dst 0xf415243B79651F6bf15053fA1712Cbb67BEc5B87 --src 0x4806ab44E687AC1Fdb01339A718656b0838D9027

//npx hardhat setProxyTrustedRemote --network fuji_avalanche --chain 10143 --dst 0x4806ab44E687AC1Fdb01339A718656b0838D9027 --src 0x68EcA2cd0d7557e61eaf6B6831B892B842e38D65
//npx hardhat setProxyTrustedRemote --network fuji_avalanche --chain 10109 --dst 0xf415243B79651F6bf15053fA1712Cbb67BEc5B87 --src 0x68EcA2cd0d7557e61eaf6B6831B892B842e38D65

//npx hardhat setProxyTrustedRemote --network mumbai --chain 10143 --dst 0x4806ab44E687AC1Fdb01339A718656b0838D9027 --src 0xf415243B79651F6bf15053fA1712Cbb67BEc5B87
//npx hardhat setProxyTrustedRemote --network mumbai --chain 10106 --dst 0x68EcA2cd0d7557e61eaf6B6831B892B842e38D65 --src 0xf415243B79651F6bf15053fA1712Cbb67BEc5B87
export const setProxyTrustedRemote__task = async (
    taskArgs: { chain: string; dst: string; src: string },
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('\nRetrieving SGLProxy');
    const proxyContract = await getDeployment(hre, 'SGLProxy');

    const path = hre.ethers.utils.solidityPack(
        ['address', 'address'],
        [taskArgs.dst, taskArgs.src],
    );
    console.log(`Setting trusted remote with path ${path}`);
    await (await proxyContract.setTrustedRemote(taskArgs.chain, path)).wait();

    console.log('Done');
};

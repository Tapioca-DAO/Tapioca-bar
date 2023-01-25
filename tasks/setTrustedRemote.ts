import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { glob, runTypeChain } from 'typechain';
import writeJsonFile from 'write-json-file';
import { getDeployment } from './utils';

//npx hardhat setTrustedRemote --network arbitrum_goerli --chain 10106 --dst 0x2966E7c576492Bd4e2e06CC3A40b1d01ccf63D69 --src 0x006dcF07511D332299f83056731Cb15f0Aeb2F2B
//npx hardhat setTrustedRemote --network fuji_avalanche --chain 10143 --dst 0x006dcF07511D332299f83056731Cb15f0Aeb2F2B --src 0x2966E7c576492Bd4e2e06CC3A40b1d01ccf63D69

//npx hardhat setTrustedRemote --network arbitrum_goerli --chain 10109 --dst 0xFfbd22431bb5142D95E09D90db19D252e2cEcd27 --src 0x006dcF07511D332299f83056731Cb15f0Aeb2F2B
//npx hardhat setTrustedRemote --network fuji_avalanche --chain 10109 --dst 0xFfbd22431bb5142D95E09D90db19D252e2cEcd27 --src 0x2966E7c576492Bd4e2e06CC3A40b1d01ccf63D69

//npx hardhat setTrustedRemote --network mumbai --chain 10143 --dst 0x006dcF07511D332299f83056731Cb15f0Aeb2F2B --src 0xFfbd22431bb5142D95E09D90db19D252e2cEcd27
//npx hardhat setTrustedRemote --network mumbai --chain 10106 --dst 0x2966E7c576492Bd4e2e06CC3A40b1d01ccf63D69 --src 0xFfbd22431bb5142D95E09D90db19D252e2cEcd27

export const setTrustedRemote__task = async (
    taskArgs: { chain: string; dst: string; src: string },
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('\nRetrieving USD0');
    const usd0Contract = await getDeployment(hre, 'USD0');

    const path = hre.ethers.utils.solidityPack(
        ['address', 'address'],
        [taskArgs.dst, taskArgs.src],
    );
    console.log(`Setting trusted remote with path ${path}`);
    await (await usd0Contract.setTrustedRemote(taskArgs.chain, path)).wait();

    console.log('Done');
};

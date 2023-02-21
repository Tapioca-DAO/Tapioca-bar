import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { glob, runTypeChain } from 'typechain';
import writeJsonFile from 'write-json-file';

// npx hardhat configurePacketTypes --network arbitrum_goerli --src 0x006dcF07511D332299f83056731Cb15f0Aeb2F2B --dst-lz-chain-id 10106
// npx hardhat configurePacketTypes --network arbitrum_goerli --src 0x006dcF07511D332299f83056731Cb15f0Aeb2F2B --dst-lz-chain-id 10109

// npx hardhat configurePacketTypes --network fuji_avalanche --src 0x2966E7c576492Bd4e2e06CC3A40b1d01ccf63D69 --dst-lz-chain-id 10143
// npx hardhat configurePacketTypes --network fuji_avalanche --src 0x2966E7c576492Bd4e2e06CC3A40b1d01ccf63D69 --dst-lz-chain-id 10109

// npx hardhat configurePacketTypes --network mumbai --src 0xFfbd22431bb5142D95E09D90db19D252e2cEcd27 --dst-lz-chain-id 10143
// npx hardhat configurePacketTypes --network mumbai --src 0xFfbd22431bb5142D95E09D90db19D252e2cEcd27 --dst-lz-chain-id 10106
export const configurePacketTypes__task = async (
    taskArgs: { src: string; dstLzChainId: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const packetTypes = [1, 2, 770, 771, 772, 773];

    const usd0Contract = await hre.ethers.getContractAt('USD0', taskArgs.src);

    for (var i = 0; i < packetTypes.length; i++) {
        await (
            await usd0Contract.setMinDstGas(
                taskArgs.dstLzChainId,
                packetTypes[i],
                200000,
            )
        ).wait();
        await (await usd0Contract.setUseCustomAdapterParams(true)).wait();
    }
    console.log('\nDone');
};

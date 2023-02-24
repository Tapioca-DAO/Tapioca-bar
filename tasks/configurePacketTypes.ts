import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { glob, runTypeChain } from 'typechain';
import writeJsonFile from 'write-json-file';

//*****USD0
// npx hardhat configurePacketTypes --network arbitrum_goerli --src 0x006dcF07511D332299f83056731Cb15f0Aeb2F2B --dst-lz-chain-id 10106 --contract USD0
// npx hardhat configurePacketTypes --network arbitrum_goerli --src 0x006dcF07511D332299f83056731Cb15f0Aeb2F2B --dst-lz-chain-id 10109 --contract USD0
// npx hardhat configurePacketTypes --network arbitrum_goerli --src 0x006dcF07511D332299f83056731Cb15f0Aeb2F2B --dst-lz-chain-id 10112 --contract USD0

// npx hardhat configurePacketTypes --network fuji_avalanche --src 0x2966E7c576492Bd4e2e06CC3A40b1d01ccf63D69 --dst-lz-chain-id 10143 --contract USD0
// npx hardhat configurePacketTypes --network fuji_avalanche --src 0x2966E7c576492Bd4e2e06CC3A40b1d01ccf63D69 --dst-lz-chain-id 10109 --contract USD0
// npx hardhat configurePacketTypes --network fuji_avalanche --src 0x2966E7c576492Bd4e2e06CC3A40b1d01ccf63D69 --dst-lz-chain-id 10112 --contract USD0

// npx hardhat configurePacketTypes --network mumbai --src 0xFfbd22431bb5142D95E09D90db19D252e2cEcd27 --dst-lz-chain-id 10143 --contract USD0
// npx hardhat configurePacketTypes --network mumbai --src 0xFfbd22431bb5142D95E09D90db19D252e2cEcd27 --dst-lz-chain-id 10106 --contract USD0
// npx hardhat configurePacketTypes --network mumbai --src 0xFfbd22431bb5142D95E09D90db19D252e2cEcd27 --dst-lz-chain-id 10112 --contract USD0

// npx hardhat configurePacketTypes --network fantom_testnet --src 0x4da7E36B2A1E51409526Cc1E63C67cAA93f4fD13 --dst-lz-chain-id 10143 --contract USD0
// npx hardhat configurePacketTypes --network fantom_testnet --src 0x4da7E36B2A1E51409526Cc1E63C67cAA93f4fD13 --dst-lz-chain-id 10109 --contract USD0
// npx hardhat configurePacketTypes --network fantom_testnet --src 0x4da7E36B2A1E51409526Cc1E63C67cAA93f4fD13 --dst-lz-chain-id 10106 --contract USD0

//*****MarketsProxy
// npx hardhat configurePacketTypes --network arbitrum_goerli --src 0xD441B51FeBEB9633831947547fbdfb5b662617FF --dst-lz-chain-id 10106 --contract MarketsProxy
// npx hardhat configurePacketTypes --network arbitrum_goerli --src 0xD441B51FeBEB9633831947547fbdfb5b662617FF --dst-lz-chain-id 10109 --contract MarketsProxy
// npx hardhat configurePacketTypes --network arbitrum_goerli --src 0xD441B51FeBEB9633831947547fbdfb5b662617FF --dst-lz-chain-id 10112 --contract MarketsProxy

// npx hardhat configurePacketTypes --network fuji_avalanche --src 0xC83D48DA75720fDa857dCd21DdD44254FdD962a3 --dst-lz-chain-id 10143 --contract MarketsProxy
// npx hardhat configurePacketTypes --network fuji_avalanche --src 0xC83D48DA75720fDa857dCd21DdD44254FdD962a3 --dst-lz-chain-id 10109 --contract MarketsProxy
// npx hardhat configurePacketTypes --network fuji_avalanche --src 0xC83D48DA75720fDa857dCd21DdD44254FdD962a3 --dst-lz-chain-id 10112 --contract MarketsProxy

// npx hardhat configurePacketTypes --network mumbai --src 0xf0484Ead813d68dAff6A885381957BF8cb3d633c --dst-lz-chain-id 10143 --contract MarketsProxy
// npx hardhat configurePacketTypes --network mumbai --src 0xf0484Ead813d68dAff6A885381957BF8cb3d633c --dst-lz-chain-id 10106 --contract MarketsProxy
// npx hardhat configurePacketTypes --network mumbai --src 0xf0484Ead813d68dAff6A885381957BF8cb3d633c --dst-lz-chain-id 10112 --contract MarketsProxy

// npx hardhat configurePacketTypes --network fantom_testnet --src 0x71f524A2ED8B20e6465EE08d5A8Cc2Bc5C8acBca --dst-lz-chain-id 10143 --contract MarketsProxy
// npx hardhat configurePacketTypes --network fantom_testnet --src 0x71f524A2ED8B20e6465EE08d5A8Cc2Bc5C8acBca --dst-lz-chain-id 10109 --contract MarketsProxy
// npx hardhat configurePacketTypes --network fantom_testnet --src 0x71f524A2ED8B20e6465EE08d5A8Cc2Bc5C8acBca --dst-lz-chain-id 10106 --contract MarketsProxy

export const configurePacketTypes__task = async (
    taskArgs: { src: string; dstLzChainId: string; contract: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const packetTypes = [0, 1, 2, 770, 771, 772, 773];

    const ctr = await hre.ethers.getContractAt(taskArgs.contract, taskArgs.src);

    for (var i = 0; i < packetTypes.length; i++) {
        await (
            await ctr.setMinDstGas(
                taskArgs.dstLzChainId,
                packetTypes[i],
                200000,
            )
        ).wait();
        await (await ctr.setUseCustomAdapterParams(true)).wait();
    }
    console.log('\nDone');
};

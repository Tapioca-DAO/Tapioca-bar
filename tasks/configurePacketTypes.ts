import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { glob, runTypeChain } from 'typechain';
import writeJsonFile from 'write-json-file';

//*****USDO
// npx hardhat configurePacketTypes --network arbitrum_goerli --src 0xAF933E0E75E0576511e17b173cc6e3D0a09DB764 --dst-lz-chain-id 10106 --contract USDO
// npx hardhat configurePacketTypes --network arbitrum_goerli --src 0xAF933E0E75E0576511e17b173cc6e3D0a09DB764 --dst-lz-chain-id 10109 --contract USDO
// npx hardhat configurePacketTypes --network arbitrum_goerli --src 0xAF933E0E75E0576511e17b173cc6e3D0a09DB764 --dst-lz-chain-id 10112 --contract USDO

// npx hardhat configurePacketTypes --network fuji_avalanche --src 0x2Bd2DD6aD7AA00fF6C2A4db7aB67735451242A98 --dst-lz-chain-id 10143 --contract USDO
// npx hardhat configurePacketTypes --network fuji_avalanche --src 0x2Bd2DD6aD7AA00fF6C2A4db7aB67735451242A98 --dst-lz-chain-id 10109 --contract USDO
// npx hardhat configurePacketTypes --network fuji_avalanche --src 0x2Bd2DD6aD7AA00fF6C2A4db7aB67735451242A98 --dst-lz-chain-id 10112 --contract USDO

// npx hardhat configurePacketTypes --network mumbai --src 0x4C12521DA4d702b2c514725572aB9A2c57F98b0F --dst-lz-chain-id 10143 --contract USDO
// npx hardhat configurePacketTypes --network mumbai --src 0x4C12521DA4d702b2c514725572aB9A2c57F98b0F --dst-lz-chain-id 10106 --contract USDO
// npx hardhat configurePacketTypes --network mumbai --src 0x4C12521DA4d702b2c514725572aB9A2c57F98b0F --dst-lz-chain-id 10112 --contract USDO

// npx hardhat configurePacketTypes --network fantom_testnet --src 0xd4F17F7E852e44fE7bfC3096D68ce2b7daA3E83B --dst-lz-chain-id 10143 --contract USDO
// npx hardhat configurePacketTypes --network fantom_testnet --src 0xd4F17F7E852e44fE7bfC3096D68ce2b7daA3E83B --dst-lz-chain-id 10109 --contract USDO
// npx hardhat configurePacketTypes --network fantom_testnet --src 0xd4F17F7E852e44fE7bfC3096D68ce2b7daA3E83B --dst-lz-chain-id 10106 --contract USDO

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

    for (let i = 0; i < packetTypes.length; i++) {
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

import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { glob, runTypeChain } from 'typechain';
import writeJsonFile from 'write-json-file';
import { getDeployment } from '../utils';

//npx hardhat setProxyTrustedRemote --network arbitrum_goerli --chain 10106 --dst 0xC83D48DA75720fDa857dCd21DdD44254FdD962a3 --src 0xD441B51FeBEB9633831947547fbdfb5b662617FF
//npx hardhat setProxyTrustedRemote --network arbitrum_goerli --chain 10109 --dst 0xf0484Ead813d68dAff6A885381957BF8cb3d633c --src 0xD441B51FeBEB9633831947547fbdfb5b662617FF
//npx hardhat setProxyTrustedRemote --network arbitrum_goerli --chain 10112 --dst 0x71f524A2ED8B20e6465EE08d5A8Cc2Bc5C8acBca --src 0xD441B51FeBEB9633831947547fbdfb5b662617FF

//npx hardhat setProxyTrustedRemote --network fuji_avalanche --chain 10143 --dst 0xD441B51FeBEB9633831947547fbdfb5b662617FF --src 0xC83D48DA75720fDa857dCd21DdD44254FdD962a3
//npx hardhat setProxyTrustedRemote --network fuji_avalanche --chain 10109 --dst 0xf0484Ead813d68dAff6A885381957BF8cb3d633c --src 0xC83D48DA75720fDa857dCd21DdD44254FdD962a3
//npx hardhat setProxyTrustedRemote --network fuji_avalanche --chain 10112 --dst 0x71f524A2ED8B20e6465EE08d5A8Cc2Bc5C8acBca --src 0xC83D48DA75720fDa857dCd21DdD44254FdD962a3

//npx hardhat setProxyTrustedRemote --network mumbai --chain 10143 --dst 0xD441B51FeBEB9633831947547fbdfb5b662617FF --src 0xf0484Ead813d68dAff6A885381957BF8cb3d633c
//npx hardhat setProxyTrustedRemote --network mumbai --chain 10106 --dst 0xC83D48DA75720fDa857dCd21DdD44254FdD962a3 --src 0xf0484Ead813d68dAff6A885381957BF8cb3d633c
//npx hardhat setProxyTrustedRemote --network mumbai --chain 10112 --dst 0x71f524A2ED8B20e6465EE08d5A8Cc2Bc5C8acBca --src 0xf0484Ead813d68dAff6A885381957BF8cb3d633c

//npx hardhat setProxyTrustedRemote --network fantom_testnet --chain 10143 --dst 0xD441B51FeBEB9633831947547fbdfb5b662617FF --src 0x71f524A2ED8B20e6465EE08d5A8Cc2Bc5C8acBca
//npx hardhat setProxyTrustedRemote --network fantom_testnet --chain 10109 --dst 0xf0484Ead813d68dAff6A885381957BF8cb3d633c --src 0x71f524A2ED8B20e6465EE08d5A8Cc2Bc5C8acBca
//npx hardhat setProxyTrustedRemote --network fantom_testnet --chain 10106 --dst 0xC83D48DA75720fDa857dCd21DdD44254FdD962a3 --src 0x71f524A2ED8B20e6465EE08d5A8Cc2Bc5C8acBca

export const setProxyTrustedRemote__task = async (
    taskArgs: { chain: string; dst: string; src: string },
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('\nRetrieving MarketsProxy');
    const proxyContract = await getDeployment(hre, 'MarketsProxy');

    const path = hre.ethers.utils.solidityPack(
        ['address', 'address'],
        [taskArgs.dst, taskArgs.src],
    );
    console.log(`Setting trusted remote with path ${path}`);
    await (await proxyContract.setTrustedRemote(taskArgs.chain, path)).wait();

    console.log('Done');
};

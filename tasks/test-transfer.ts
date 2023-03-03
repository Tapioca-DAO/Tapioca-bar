import { BigNumberish } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import writeJsonFile from 'write-json-file';

// 0x5ba1cf78aaea752bec33c2036b1e315c881d8e49

//npx hardhat transfer --network fantom_testnet --oft-address 0x9C574C71eCabc7aEf19593A595fb9f8Aa6a78bB0 --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10143 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 300000000000000000 --native 8000000000000000000
//npx hardhat transfer --network fantom_testnet --oft-address 0x5ba1cf78aaea752bec33c2036b1e315c881d8e49 --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10143 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 100000000000000000 --native 8000000000000000000
//npx hardhat transfer --network fuji_avalanche --oft-address 0x71ddd5ec9815740529d62726adc50eb84a3a4e1a --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10112 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 100000000000000000 --native 300000000000000000
//npx hardhat transfer --network fantom_testnet --oft-address 0x5ba1cf78aaea752bec33c2036b1e315c881d8e49 --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10106 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 100000000000000000 --native 8000000000000000000
//npx hardhat transfer --network arbitrum_goerli --oft-address 0xc0106C090153F651c5E6e12249412b9e51f8d49d --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10112 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 100000000000000000 --native 300000000000000000
//npx hardhat transfer --network arbitrum_goerli --oft-address 0xc0106C090153F651c5E6e12249412b9e51f8d49d --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10109 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 100000000000000000 --native 300000000000000000
//npx hardhat transfer --network arbitrum_goerli --oft-address 0xc0106C090153F651c5E6e12249412b9e51f8d49d --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10106 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 100000000000000000 --native 300000000000000000
//npx hardhat transfer --network fuji_avalanche --oft-address 0x71ddd5ec9815740529d62726adc50eb84a3a4e1a --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10143 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 100000000000000000 --native 300000000000000000
//npx hardhat transfer --network fuji_avalanche --oft-address 0x71ddd5ec9815740529d62726adc50eb84a3a4e1a --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10109 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 100000000000000000 --native 300000000000000000
//npx hardhat transfer --network mumbai --oft-address 0xa1BD6C0B6b35209B3710cA6Ab306736e06C1fe9c --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10106 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 100000000000000000 --native 300000000000000000
//npx hardhat transfer --network mumbai --oft-address 0x556029cb9c74b07bc34abed41eaa424159463e50 --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10106 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 100000000000000000 --native 1800000000000000000
//npx hardhat transfer --network fuji_avalanche --oft-address 0x05C0a8C53BED62edf009b8B870fAC065B4cc3533 --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10109 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 100000000000000000 --native 300000000000000000
//npx hardhat transfer --network fuji_avalanche --oft-address 0x628570d3768e7424dd7ca4671846d1b67c82e141 --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10109 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 100000000000000000 --native 300000000000000000
//npx hardhat transfer --network fuji_avalanche --oft-address 0x05C0a8C53BED62edf009b8B870fAC065B4cc3533 --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10143 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 100000000000000000 --native 300000000000000000
//npx hardhat transfer --network arbitrum_goerli --oft-address 0xd37e276907e76bf25ebada04fb2dce67c8be5188 --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10112 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 30000000000000000 --native 300000000000000000
//npx hardhat transfer --network arbitrum_goerli --oft-address 0xd37e276907e76bf25ebada04fb2dce67c8be5188 --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10106 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 30000000000000000 --native 300000000000000000
//npx hardhat transfer --network fantom_testnet --oft-address 0x177b341C0E1b36f9D4fAC0F90B1ebF3a20480834 --from-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --dst-chain-id 10143 --to-address 0x40282d3Cf4890D9806BC1853e97a59C93D813653 --amount 30000000000000000 --native 8000000000000000000
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

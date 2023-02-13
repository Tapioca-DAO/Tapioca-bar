import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { updateDeployments, deployEmptyStrategy } from '../deploy/utils';

//arbitrum_goerli
//   npx hardhat deployYbStrategy --network arbitrum_goerli --yieldbox 0x93cF32C5fF98c0758b32dF9F6DB9e4f4faaCe736 --token 0xc0106C090153F651c5E6e12249412b9e51f8d49d
//   npx hardhat deployYbStrategy --network arbitrum_goerli --yieldbox 0x93cF32C5fF98c0758b32dF9F6DB9e4f4faaCe736 --token 0xd37E276907e76bF25eBaDA04fB2dCe67c8BE5188
//   npx hardhat deployYbStrategy --network arbitrum_goerli --yieldbox 0x93cF32C5fF98c0758b32dF9F6DB9e4f4faaCe736 --token 0xd429a8F683Aa8D43Aa3CBdDCa93956CBc44c4242
//   npx hardhat deployYbStrategy --network arbitrum_goerli --yieldbox 0x93cF32C5fF98c0758b32dF9F6DB9e4f4faaCe736 --token 0x31dA039c8Cf6eDC95fAFECb7B3E70a308128b7E0

//fuji_avalanche
//   npx hardhat deployYbStrategy --network fuji_avalanche --yieldbox 0x538c2189ea266069031622e70441bc73A613e9Ed --token 0x71dDd5ec9815740529D62726Adc50EB84a3A4e1a
//   npx hardhat deployYbStrategy --network fuji_avalanche --yieldbox 0x538c2189ea266069031622e70441bc73A613e9Ed --token 0x05C0a8C53BED62edf009b8B870fAC065B4cc3533
//   npx hardhat deployYbStrategy --network fuji_avalanche --yieldbox 0x538c2189ea266069031622e70441bc73A613e9Ed --token 0x628570D3768e7424dd7Ca4671846D1b67c82E141
//   npx hardhat deployYbStrategy --network fuji_avalanche --yieldbox 0x538c2189ea266069031622e70441bc73A613e9Ed --token 0xc6B03Ba05Fb5E693D8b3533aa676FB4AFDd7DDc7

//mumbai
//   npx hardhat deployYbStrategy --network mumbai --yieldbox 0xF0a07d15F4F6FCB919EE410B10D8ab282eD1107F --token 0x4172056FDC344b8Fd38bfDe590a7eDdF32cD1d55
//   npx hardhat deployYbStrategy --network mumbai --yieldbox 0xF0a07d15F4F6FCB919EE410B10D8ab282eD1107F --token 0x556029CB9c74B07bC34abED41eaA424159463E50
//   npx hardhat deployYbStrategy --network mumbai --yieldbox 0xF0a07d15F4F6FCB919EE410B10D8ab282eD1107F --token 0xa1BD6C0B6b35209B3710cA6Ab306736e06C1fe9c
//   npx hardhat deployYbStrategy --network mumbai --yieldbox 0xF0a07d15F4F6FCB919EE410B10D8ab282eD1107F --token 0xd621150f4BE5b6E537f61dB2A59499F648F1B6e2

export const deployYbStrategy__task = async (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(`hre ${JSON.stringify(hre.network.name)}`);
    const emptyStrategy = await deployEmptyStrategy(
        hre,
        taskArgs.yieldbox,
        taskArgs.token,
    );
    await updateDeployments([emptyStrategy], await hre.getChainId());
};

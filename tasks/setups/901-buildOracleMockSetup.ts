import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TDeploymentVMContract } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { Multicall3 } from '../../typechain/contracts/MultiCall';

export const buildYieldBoxAssets = async (
    hre: HardhatRuntimeEnvironment,
    deps: (TDeploymentVMContract & { meta: { stratFor?: string } })[],
): Promise<Multicall3.Call3Struct[]> => {
    const calls: Multicall3.Call3Struct[] = [];

    /**
     * Load addresses
     */
    const yieldBoxAddr = deps.find((e) => e.name === 'YieldBox')?.address;

    if (!yieldBoxAddr) {
        throw new Error('[-] One address not found');
    }

    /**
     * Load contracts
     */
    const yieldBox = await hre.ethers.getContractAt('YieldBox', yieldBoxAddr);

    /**
     * Add calls
     */
    console.log('[+] +Call queue: Adding calls to register assets on YieldBox');

    const assets = deps.filter((e) => e.meta.stratFor);

    for (const asset of assets) {
        console.log(`\t+registering ${asset.name}`);
        calls.push({
            target: yieldBoxAddr,
            callData: yieldBox.interface.encodeFunctionData('registerAsset', [
                1,
                asset.meta.stratFor!,
                asset.address,
                0,
            ]),
            allowFailure: false,
        });
    }

    return calls;
};

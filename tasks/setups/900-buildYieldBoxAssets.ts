import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TDeploymentVMContract } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { Multicall3 } from '../../typechain/contracts/MultiCall';

export const buildYieldBoxAssets = async (
    hre: HardhatRuntimeEnvironment,
    tag: string,
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
    console.log(
        '[+] +Call queue: Adding calls to register assets on YieldBox: ',
    );

    const strategies = deps.filter((e) => e.meta?.stratFor);

    for (const strategy of strategies) {
        console.log(`\t+registering ${strategy.name}`);

        const stratFor = deps.find((e) => e.name == strategy.meta.stratFor);
        calls.push({
            target: yieldBoxAddr,
            callData: yieldBox.interface.encodeFunctionData('registerAsset', [
                1,
                stratFor?.address,
                strategy.address,
                0,
            ]),
            allowFailure: false,
        });
        console.log(
            `   [*] Strategy: ${strategy.address} (${strategy.name}) for token ${stratFor?.address} (${stratFor?.name})`,
        );
    }
    return calls;
};

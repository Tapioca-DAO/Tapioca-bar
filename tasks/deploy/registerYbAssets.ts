import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { buildYieldBoxAssets } from '../setups/900-buildYieldBoxAssets';
import { typechain } from 'tapioca-sdk';

// hh registerYbAssets --network ...
export const registerYbAssets__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('[+] Registering YieldBox assets...');
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const { deployment: yieldBoxDep } =
        await hre.SDK.hardhatUtils.getLocalContract(hre, 'YieldBox', tag);

    const strats = hre.SDK.db.loadLocalDeployment(tag, await hre.getChainId());
    console.log('[+] Found', strats.length, 'strategies.');
    console.log(strats.map((e) => e.name));

    const deps = [...strats, yieldBoxDep];
    const calls = await buildYieldBoxAssets(hre, deps);

    const signer = (await hre.ethers.getSigners())[0];
    const multiCall = typechain.Multicall.Multicall3__factory.connect(
        hre.SDK.config.MULTICALL_ADDRESSES[chainInfo?.chainId],
        signer,
    );

    // Execute
    console.log('[+] Aggregating: ', calls.length, 'calls');
    const tx = await (await multiCall.aggregate3(calls)).wait(1);
    console.log(
        '[+] After deployment setup multicall Tx: ',
        tx.transactionHash,
    );
};

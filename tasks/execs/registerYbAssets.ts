import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { buildYieldBoxAssets } from '../setups/900-buildYieldBoxAssets';
import { typechain } from 'tapioca-sdk';

// hh registerYbAssets --network ...
export const registerYbAssets__task = async (
    {},
    hre: HardhatRuntimeEnvironment,
) => {
    const chainInfo = hre.SDK.utils.getChainBy(
        'chainId',
        await hre.getChainId(),
    );
    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    console.log('[+] Registering YieldBox assets...');
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const { deployment: yieldBoxDep } =
        await hre.SDK.hardhatUtils.getLocalContract(hre, 'YieldBox', tag);

    const strats = hre.SDK.db
        .loadLocalDeployment(tag, await hre.getChainId())
        .filter((a) => a.name.startsWith('ERC20WithoutStrategy'));
    console.log('[+] Found', strats.length, 'strategies.');
    console.log(strats.map((e) => e.name));

    const stratForNames = strats.map((e) => e.meta.stratFor);
    const toftTokens = hre.SDK.db
        .loadGlobalDeployment(
            tag,
            hre.SDK.config.TAPIOCA_PROJECTS_NAME.TapiocaZ,
            await hre.getChainId(),
        )
        .filter((a) => stratForNames.find((e) => a.name.startsWith(e)));
    const tapOFTTokens = hre.SDK.db
        .loadGlobalDeployment(
            tag,
            hre.SDK.config.TAPIOCA_PROJECTS_NAME.TapToken,
            await hre.getChainId(),
        )
        .filter((a) => stratForNames.find((e) => a.name.startsWith(e)));
    const localTokens = hre.SDK.db
        .loadLocalDeployment(tag, await hre.getChainId())
        .filter((a) => stratForNames.find((e) => a.name.startsWith(e)));
    const deps = [
        ...strats,
        ...toftTokens,
        ...localTokens,
        ...tapOFTTokens,
        yieldBoxDep,
    ];
    const calls = await buildYieldBoxAssets(hre, tag, deps);

    const signer = (await hre.ethers.getSigners())[0];
    const multiCall =
        typechain.TapiocaPeriphery.multicall.Multicall3__factory.connect(
            hre.SDK.config.MULTICALL_ADDRESSES[chainInfo?.chainId],
            signer,
        );

    // Execute
    console.log('[+] Aggregating: ', calls.length, 'calls');
    const tx = await (await multiCall.multicall(calls)).wait(1);
    console.log(
        '[+] After deployment setup multicall Tx: ',
        tx.transactionHash,
    );
};

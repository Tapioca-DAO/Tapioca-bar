import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { buildYieldBoxAssets } from '../setups/900-buildYieldBoxAssets';
import { typechain } from 'tapioca-sdk';
import inquirer from 'inquirer';
import { TContract } from '@tapioca-sdk/shared';

// hh registerYbAssets --network ...
export const registerYbAssets__task = async (
    taskArgs: { strategies?: string[] },
    hre: HardhatRuntimeEnvironment,
) => {
    const chainInfo = hre.SDK.utils.getChainBy('chainId', hre.SDK.eChainId);
    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    console.log('[+] Registering YieldBox assets...');
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');

    let yieldBoxDep = hre.SDK.db
        .loadGlobalDeployment(tag, 'yieldbox', chainInfo.chainId)
        .find((e) => e.name == 'YieldBox');

    if (!yieldBoxDep) {
        yieldBoxDep = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name == 'YieldBox');
    }
    if (!yieldBoxDep) throw new Error('[-] YieldBox not found');

    let localStrats = hre.SDK.db
        .loadLocalDeployment(tag, hre.SDK.eChainId)
        .filter((a) => a.name.startsWith('ERC20WithoutStrategy'));

    const globalStrats = hre.SDK.db
        .loadGlobalDeployment(tag, 'tapioca-strategies', chainInfo.chainId)
        .filter((e) => e.name.endsWith('Strategy'));

    if (taskArgs.strategies) {
        // remove empty strategies for same token
        const specificGlobalStrats = globalStrats
            .filter((a) => taskArgs.strategies?.indexOf(a.name) >= 0)
            .map((a) => a.meta.stratFor);

        if (specificGlobalStrats.length > 0) {
            localStrats = localStrats.filter(
                (a) => specificGlobalStrats.indexOf(a.meta.stratFor) < 0,
            );
        }
    }

    let strats = [...localStrats, ...globalStrats];

    console.log('[+] Found', strats.length, 'strategies.');
    console.log(strats.map((e) => e.name));

    const isTestnet = chainInfo.tags[0] == 'testnet';

    const { wantToFilter } = await inquirer.prompt({
        type: 'confirm',
        name: 'wantToFilter',
        message: 'Do you want to filter strategies?',
    });

    if (wantToFilter) {
        const { filterTerm } = await inquirer.prompt({
            type: 'input',
            name: 'filterTerm',
            message: 'Filtering term',
        });

        strats = strats.filter((a) => a.name.includes(filterTerm));

        console.log('[+] Found', strats.length, 'strategies.');
        console.log(strats.map((e) => e.name));
    }

    const stratForNames = strats.map((e) => e.meta.stratFor);
    const toftTokens = hre.SDK.db
        .loadGlobalDeployment(
            tag,
            hre.SDK.config.TAPIOCA_PROJECTS_NAME.TapiocaZ,
            hre.SDK.eChainId,
        )
        .filter((a) => stratForNames.find((e) => a.name.startsWith(e)));
    const tapOFTTokens = hre.SDK.db
        .loadGlobalDeployment(
            tag,
            hre.SDK.config.TAPIOCA_PROJECTS_NAME.TapToken,
            hre.SDK.eChainId,
        )
        .filter((a) => stratForNames.find((e) => a.name.startsWith(e)));

    let mockTokens: Array<TContract> = [];
    if (isTestnet) {
        mockTokens = hre.SDK.db
            .loadGlobalDeployment(
                tag,
                hre.SDK.config.TAPIOCA_PROJECTS_NAME.TapiocaMocks,
                hre.SDK.eChainId,
            )
            .filter((a) => stratForNames.find((e) => a.name.startsWith(e)));
    }
    const localTokens = hre.SDK.db
        .loadLocalDeployment(tag, hre.SDK.eChainId)
        .filter((a) => stratForNames.find((e) => a.name.startsWith(e)));
    const deps = [
        ...strats,
        ...toftTokens,
        ...localTokens,
        ...tapOFTTokens,
        ...mockTokens,
        yieldBoxDep,
    ];
    const calls = await buildYieldBoxAssets(hre, tag, deps);

    const { confirm } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: 'Are calls alright?',
    });
    if (!confirm) throw new Error('[-] Aborted');

    const signer = (await hre.ethers.getSigners())[0];
    const multiCall =
        typechain.TapiocaPeriphery.contracts.multicall.Multicall3__factory.connect(
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

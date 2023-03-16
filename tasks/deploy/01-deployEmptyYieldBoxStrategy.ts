import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { buildEmptyStrat } from '../deployBuilds/901-buildEmptyStrat';
import { loadVM } from '../utils';

// hh deployYbStrats --network arbitrum_goerli
export const deployYbStrats__task = async (
    {},
    hre: HardhatRuntimeEnvironment,
) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const { contract: yieldBox } = await hre.SDK.hardhatUtils.getLocalContract(
        hre,
        'YieldBox',
        tag,
    );

    const VM = await loadVM(hre, tag);

    const tokens = hre.SDK.db
        .loadGlobalDeployment(tag, 'tapiocaz', await hre.getChainId())
        .filter((e) => e.name.startsWith('TapiocaOFT'));

    console.log('[+] Found', tokens.length, 'tokens');
    console.log(tokens.map((e) => `\t${e.name}`));
    const { isOk } = await inquirer.prompt({
        type: 'confirm',
        name: 'isOk',
        message:
            'Are those the tokens wanted? (If not, deploy on TapiocaZ. Follow this guide: https://app.clickup.com/36811639/docs/133cvq-562)',
    });
    if (!isOk) {
        throw new Error('[-] Aborting');
    }

    console.log('[+] Deploying', tokens.length, 'strategies...');
    for (const strat of await buildEmptyStrat(hre, yieldBox.address, tokens)) {
        VM.add(strat);
    }
    await VM.execute(3);
    VM.save();
    await VM.verify();
};

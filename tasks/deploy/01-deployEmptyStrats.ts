import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { buildEmptyStrat } from '../deployBuilds/10-buildEmptyStrat';
import { loadVM } from '../utils';
import SDK from 'tapioca-sdk';

enum StratType {
    TOFT = 0,
    MarketsProxy = 1,
    USDO = 2,
    TAP = 3,
}
// hh 01-deployEmptyStrats --network arbitrum_goerli --type 0/1/2/3
export const deployEmptyStrats__task = async (
    taskArgs: { type: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const chainInfo = hre.SDK.utils.getChainBy(
        'chainId',
        await hre.getChainId(),
    );
    if (!chainInfo) {
        throw new Error('Chain not found');
    }
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');

    const yieldBox = hre.SDK.db
        .loadLocalDeployment(tag, chainInfo.chainId)
        .find((e) => e.name === 'YieldBox');

    const type: StratType = parseInt(taskArgs.type);

    let project: 'tapiocaz' | 'tap-token' | 'tapioca-bar';
    let name: string;
    switch (type) {
        case StratType.TOFT:
            project = SDK.API.config.TAPIOCA_PROJECTS_NAME.TapiocaZ;
            name = 'TapiocaOFT';
            break;
        case StratType.MarketsProxy:
            project = SDK.API.config.TAPIOCA_PROJECTS_NAME.TapiocaBar;
            name = 'MarketsProxy';
            break;
        case StratType.USDO:
            project = SDK.API.config.TAPIOCA_PROJECTS_NAME.TapiocaBar;
            name = 'USD0';
            break;
        case StratType.TAP:
            project = SDK.API.config.TAPIOCA_PROJECTS_NAME.TapToken;
            name = 'TapOFT';
            break;
    }
    console.log(`-------- name    ${name}`);
    console.log(`-------- project ${project}`);

    const VM = await loadVM(hre, tag);

    const tokens = hre.SDK.db
        .loadGlobalDeployment(tag, project, await hre.getChainId())
        .filter((e) => e.name.startsWith(name));

    console.log('[+] Found', tokens.length, 'tokens');
    console.log(tokens.map((e) => `\t${e.name}`));
    const { isOk } = await inquirer.prompt({
        type: 'confirm',
        name: 'isOk',
        message: 'Are those the tokens wanted?',
    });
    if (!isOk) {
        throw new Error('[-] Aborting');
    }

    console.log('[+] Deploying', tokens.length, 'strategies...');
    for (let i = 0; i < tokens.length; i++) {
        VM.add(
            await buildEmptyStrat(hre, yieldBox?.address as string, tokens[i]),
        );
    }

    await VM.execute(3);
    VM.save();
    await VM.verify();
};

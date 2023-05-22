import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { buildEmptyStrat } from '../deployBuilds/10-buildEmptyStrat';
import { loadVM } from '../utils';
import SDK from 'tapioca-sdk';

enum StratType {
    TOFT = 0,
    USDO = 1,
    TAP = 2,
    Token = 3,
}
// hh 01-deployEmptyStrats --network arbitrum_goerli --type 0/1/2
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
        case StratType.USDO:
            project = SDK.API.config.TAPIOCA_PROJECTS_NAME.TapiocaBar;
            name = 'USDO';
            break;
        case StratType.TAP:
            project = SDK.API.config.TAPIOCA_PROJECTS_NAME.TapToken;
            name = 'TapOFT';
            break;
        case StratType.Token:
            const { projectName } = await inquirer.prompt({
                type: 'input',
                name: 'projectName',
                message: 'In which project is the token registerd?',
            });
            project = projectName;

            const { tokenName } = await inquirer.prompt({
                type: 'input',
                name: 'tokenName',
                message:
                    'What is the token you want to register the strategy for?',
            });
            name = tokenName;
            break;
        default:
            console.log('Specific deployment:');
            project = SDK.API.config.TAPIOCA_PROJECTS_NAME.TapiocaBar;
            const { testTokenName } = await inquirer.prompt({
                type: 'input',
                name: 'testTokenName',
                message:
                    'What is the token you want to register the strategy for?',
            });
            name = testTokenName;
            console.log(`Will deploy a strategy for: ${name} contract`);
            break;
    }

    const VM = await loadVM(hre, tag, true);

    let tokens = hre.SDK.db
        .loadGlobalDeployment(tag, project, await hre.getChainId())
        .filter((e) => e.name.startsWith(name));

    if (tokens.length == 0) {
        tokens = hre.SDK.db
            .loadLocalDeployment(tag, await hre.getChainId())
            .filter((e) => e.name.startsWith(name));
    }

    console.log('[+] Found', tokens.length, 'tokens');
    console.log(tokens.map((e) => `${e.name}`));
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
        VM.add(await buildEmptyStrat(hre, yieldBox?.address, tokens[i]));
    }

    await VM.execute(3);
    VM.save();
    await VM.verify();
};

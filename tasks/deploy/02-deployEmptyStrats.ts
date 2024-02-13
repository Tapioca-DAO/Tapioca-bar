import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { buildEmptyStrat } from '../deployBuilds/10-buildEmptyStrat';
import { loadVM } from '../utils';
import SDK from 'tapioca-sdk';
import { TContract } from '@tapioca-sdk//shared';

enum StratType {
    TOFT = 0,
    USDO = 1,
    TAP = 2,
    Token = 3,
    TokenAddress = 4,
}
// hh 01-deployEmptyStrats --network arbitrum_goerli --type 0/1/2
export const deployEmptyStrats__task = async (
    taskArgs: { type: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const chainInfo = hre.SDK.utils.getChainBy('chainId', hre.SDK.eChainId);
    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');

    let yieldBox = hre.SDK.db
        .loadGlobalDeployment(tag, 'yieldbox', chainInfo.chainId)
        .find((e) => e.name == 'YieldBox');

    if (!yieldBox) {
        yieldBox = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name == 'YieldBox');
    }
    if (!yieldBox) throw new Error('[-] YieldBox not found');

    const type: StratType = parseInt(taskArgs.type);

    let project: 'tapiocaz' | 'tap-token' | 'tapioca-bar';
    let name: string;
    let tokens: TContract[];
    let predicate = (e: any) => e.name == name;
    let individualTokenAddress;
    switch (type) {
        case StratType.TOFT:
            project = SDK.API.config.TAPIOCA_PROJECTS_NAME.TapiocaZ;
            name = 'TapiocaOFT';
            predicate = (e) => e.name.startsWith(name);
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
                message:
                    'In which project is the token registerd? (ex: tapioca-mocks)',
            });
            project = projectName;

            const { tokenName } = await inquirer.prompt({
                type: 'input',
                name: 'tokenName',
                message:
                    'What is the token you want to register the strategy for? (ex: WETHMock)',
            });
            name = tokenName;
            break;
        case StratType.TokenAddress:
            project = SDK.API.config.TAPIOCA_PROJECTS_NAME.TapiocaBar;

            const { tokenAddress } = await inquirer.prompt({
                type: 'input',
                name: 'tokenAddress',
                message: 'Token address',
            });
            const token = await hre.ethers.getContractAt(
                'IERC20Metadata',
                tokenAddress,
            );
            name = await token.name();
            individualTokenAddress = tokenAddress;
            break;
        default:
            console.log('Specific deployment:');
            project = SDK.API.config.TAPIOCA_PROJECTS_NAME.TapiocaBar;
            const { testTokenName } = await inquirer.prompt({
                type: 'input',
                name: 'testTokenName',
                message:
                    'What is the token you want to register the strategy for? (ex: WETHMock)',
            });
            name = testTokenName;
            console.log(`Will deploy a strategy for: ${name} contract`);
            break;
    }

    const VM = await loadVM(hre, tag, true);

    if (type != StratType.TokenAddress) {
        tokens = hre.SDK.db
            .loadGlobalDeployment(tag, project, hre.SDK.eChainId)
            .filter((e) => predicate(e));

        if (tokens.length == 0) {
            tokens = hre.SDK.db
                .loadLocalDeployment(tag, hre.SDK.eChainId)
                .filter((e) => predicate(e));
        }
    } else {
        tokens = [
            {
                name: name,
                address: individualTokenAddress,
                meta: {},
            },
        ];
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

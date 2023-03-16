import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { buildOracleMock } from '../deployBuilds/05-buildOracleMock';
import { loadVM } from '../utils';

export const deploySGLMarket__task = async (
    {},
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('[+] Deploying: SGL market');
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const VM = await loadVM(hre, tag);

    const { contract: yieldBox } = await hre.SDK.hardhatUtils.getLocalContract(
        hre,
        'YieldBox',
        tag,
    );

    const { contract: penrose } = await hre.SDK.hardhatUtils.getLocalContract(
        hre,
        'Penrose',
        tag,
    );

    const { contract: usd0 } = await hre.SDK.hardhatUtils.getLocalContract(
        hre,
        'USD0',
        tag,
    );

    const tokens = hre.SDK.db.loadGlobalDeployment(
        tag,
        'tapiocaz',
        await hre.getChainId(),
    );

    const { marketList } = await inquirer.prompt({
        type: 'list',
        name: 'marketList',
        message:
            'Which token do you want to deploy a market for? (List loaded from tapiocaz repo)',
        choices: tokens.map((e) => e.name),
    });
};

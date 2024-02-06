import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { buildOracleMock } from '../deployBuilds/05-buildOracleMock';
import { loadVM } from '../utils';

export const deployOracleMock__task = async (
    {},
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('[+] Deploying: OracleMock');
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const VM = await loadVM(hre, tag);

    const tokens = hre.SDK.db.loadGlobalDeployment(
        tag,
        'tapiocaz',
        hre.SDK.eChainId,
    );

    const { oracleMockSuffix } = await inquirer.prompt({
        type: 'list',
        name: 'oracleMockSuffix',
        message:
            'Which token do you want the oracle for? (List loaded from tapiocaz repo)',
        choices: tokens.map((e) => e.name),
    });

    const { rate } = await inquirer.prompt({
        type: 'input',
        name: 'rate',
        message: 'What is the rate of the oracle? (In ether, i.e 1.43)',
        default: 1,
    });
    VM.add(
        await buildOracleMock(
            hre,
            'OracleMock' + oracleMockSuffix,
            'OM' + oracleMockSuffix,
            hre.ethers.utils.parseEther(rate.toString()),
        ),
    );

    await VM.execute(3);
    VM.save();
    await VM.verify();
};

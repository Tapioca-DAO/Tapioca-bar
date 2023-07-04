import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { buildYieldBox } from '../deployBuilds/00-buildYieldBox';
import { buildUSD0 } from '../deployBuilds/06-buildUSDO';
import { buildUSDOModules } from '../deployBuilds/11-buildUSDOModules';
import { loadVM } from '../utils';

// hh deployLinkedChainStack --network bsc_testnet
export const deployLinkedChainStack__task = async (
    {},
    hre: HardhatRuntimeEnvironment,
) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const signer = (await hre.ethers.getSigners())[0];
    const VM = await loadVM(hre, tag, true);

    const chainInfo = hre.SDK.utils.getChainBy(
        'chainId',
        await hre.getChainId(),
    );

    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    let weth = hre.SDK.db
        .loadGlobalDeployment(tag, 'tapioca-mocks', chainInfo.chainId)
        .find((e) => e.name.startsWith('WETHMock'));

    if (!weth) {
        //try to take it again from local deployment
        weth = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name.startsWith('WETHMock'));
    }

    if (!weth) {
        throw new Error('[-] Token not found');
    }

    // 01 YieldBox
    const [ybURI, yieldBox] = await buildYieldBox(hre, weth.address);
    VM.add(ybURI).add(yieldBox);

    // 02 USDO
    const [leverageModule, marketModule, optionsModule] =
        await buildUSDOModules(chainInfo.address, hre);
    VM.add(leverageModule).add(marketModule).add(optionsModule);

    const usdo = await buildUSD0(hre, chainInfo.address, signer.address);
    VM.add(usdo);

    // Add and execute
    await VM.execute(3, true);
    VM.save();
    const { wantToVerify } = await inquirer.prompt({
        type: 'confirm',
        name: 'wantToVerify',
        message: 'Do you want to verify the contracts?',
    });
    if (wantToVerify) {
        try {
            await VM.verify();
        } catch (e) {
            console.log('[-] Verification failed');
            console.log(`error: ${JSON.stringify(e)}`);
        }
    }

    console.log('[+] Stack deployed! 🎉');
};

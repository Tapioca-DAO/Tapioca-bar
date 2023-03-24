import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { buildYieldBox } from '../deployBuilds/00-buildYieldBox';
import { buildUSD0 } from '../deployBuilds/06-buildUSDO';
import { buildMarketProxy } from '../deployBuilds/09-buildMarketProxy';
import { loadVM, deployMultisigMock, transferOwnership } from '../utils';

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
        .loadGlobalDeployment(tag, 'tap-token', chainInfo.chainId)
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

    // Owner deployment
    const multisig = await deployMultisigMock(hre, 1, [
        hre.SDK.config.MULTICALL_ADDRESSES[chainInfo?.chainId],
    ]);
    console.log(`[+] Multisig deployed on ${multisig}`);

    // 01 YieldBox
    const [ybURI, yieldBox] = await buildYieldBox(hre, weth.address);
    VM.add(ybURI).add(yieldBox);

    // 02 USDO
    const usdo = await buildUSD0(hre, chainInfo.address, signer.address);
    VM.add(usdo);

    // 03 - MarketsProxy
    const marketProxy = await buildMarketProxy(
        hre,
        chainInfo.address,
        signer.address,
    );
    VM.add(marketProxy);

    // Add and execute
    await VM.execute(3, false);
    VM.save();
    const { wantToVerify } = await inquirer.prompt({
        type: 'confirm',
        name: 'wantToVerify',
        message: 'Do you want to verify the contracts?',
    });
    if (wantToVerify) {
        await VM.verify();
    }

    //Transfer ownership
    console.log('[+] Transferring ownership');
    await transferOwnership(
        hre,
        [usdo, marketProxy],
        tag,
        chainInfo.chainId,
        multisig,
    );

    console.log('[+] Stack deployed! 🎉');
};

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { buildMarketProxy } from '../deployBuilds/09-buildMarketProxy';
import { loadVM } from '../utils';

// hh deployMarketProxy --network arbitrum_goerli
export const deployMarketProxy = async ({}, hre: HardhatRuntimeEnvironment) => {
    console.log('[+] Deploying MarketProxy');

    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const signer = (await hre.ethers.getSigners())[0];
    const VM = await loadVM(hre, tag);

    const chainInfo = hre.SDK.utils.getChainBy(
        'chainId',
        await hre.getChainId(),
    );
    if (!chainInfo) throw new Error('Chain not found in config');

    VM.add(await buildMarketProxy(hre, chainInfo.address, signer.address));

    await VM.execute(3);
    VM.save();
    await VM.verify();

    console.log(
        '[+] Deployed MarketProxy. When they are deployed on other network: use the setTrustedRemote & setConfig tasks',
    );
};

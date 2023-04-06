import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { buildMarketHelpers } from '../deployBuilds/03-buildMarketHelpers';
import { loadVM } from '../utils';

export const deployMarketHelper__task = async (
    {},
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('[+] Deploying: MarketHelper');
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const VM = await loadVM(hre, tag);

    VM.add(await buildMarketHelpers(hre));

    await VM.execute(3);
    VM.save();
    await VM.verify();
};

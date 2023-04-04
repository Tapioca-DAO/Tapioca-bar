//TODO: to be moved to the SDK

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { buildMagnetar } from '../deployBuilds/11-buildMagnetar';
import { loadVM } from '../utils';

export const deployMagnetar__task = async (
    {},
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('[+] Deploying: Magnetar');
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const VM = await loadVM(hre, tag);

    VM.add(await buildMagnetar(hre));

    await VM.execute(3);
    VM.save();
    await VM.verify();
};

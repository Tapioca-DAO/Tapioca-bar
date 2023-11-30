import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { Penrose } from '../../typechain';

export const setBigBangEthMarketDebtRate__task = async (
    taskArgs: { penrose: string; rate: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const { contract: penrose } =
        await hre.SDK.hardhatUtils.getLocalContract<Penrose>(
            hre,
            'Penrose',
            tag,
        );

    await (await penrose.setBigBangEthMarketDebtRate(taskArgs.rate)).wait(3);
};

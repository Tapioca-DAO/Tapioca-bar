import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { Penrose } from '../../typechain';

export const withdrawFees__task = async (
    taskArgs: { penrose: string; twTap: string; markets: string[] },
    hre: HardhatRuntimeEnvironment,
) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const { contract: penrose } =
        await hre.SDK.hardhatUtils.getLocalContract<Penrose>(
            hre,
            'Penrose',
            tag,
        );

    await (
        await penrose.withdrawAllMarketFees(taskArgs.markets, taskArgs.twTap)
    ).wait(3);
};

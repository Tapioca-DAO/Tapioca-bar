import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { Penrose } from '../../typechain';

export const setPenroseCluster__task = async (
    taskArgs: { penrose: string; cluster: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const { contract: penrose } =
        await hre.SDK.hardhatUtils.getLocalContract<Penrose>(
            hre,
            'Penrose',
            tag,
        );

    await (await penrose.setCluster(taskArgs.cluster)).wait(3);
};

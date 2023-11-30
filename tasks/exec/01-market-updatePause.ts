import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { Penrose } from '../../typechain';

export const marketUpdatePause__task = async (
    taskArgs: { market: string; type: string; status: boolean },
    hre: HardhatRuntimeEnvironment,
) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const { contract: penrose } =
        await hre.SDK.hardhatUtils.getLocalContract<Penrose>(
            hre,
            'Penrose',
            tag,
        );

    const market = await hre.ethers.getContractAt('Market', taskArgs.market);
    const callData = market.interface.encodeFunctionData('updatePause', [
        taskArgs.type,
        taskArgs.status,
    ]);
    await (
        await penrose.executeMarketFn([market.address], [callData], true)
    ).wait(3);
};

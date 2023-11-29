import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { Penrose } from '../../typechain';

export const setLeverageExecutor__task = async (
    taskArgs: { market: string; executor: string },
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
    const callData = market.interface.encodeFunctionData(
        'setLeverageExecutor',
        [taskArgs.executor],
    );
    await (
        await penrose.executeMarketFn([market.address], [callData], true)
    ).wait(3);
};

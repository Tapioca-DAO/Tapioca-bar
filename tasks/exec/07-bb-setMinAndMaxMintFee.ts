import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { Penrose } from '../../typechain';

export const setMinAndMaxMintFee__task = async (
    taskArgs: { bb: string; min: string; max: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const { contract: penrose } =
        await hre.SDK.hardhatUtils.getLocalContract<Penrose>(
            hre,
            'Penrose',
            tag,
        );

    const market = await hre.ethers.getContractAt('BigBang', taskArgs.bb);
    const callData = market.interface.encodeFunctionData(
        'setMinAndMaxMintFee',
        [taskArgs.min, taskArgs.max],
    );
    await (
        await penrose.executeMarketFn([market.address], [callData], true)
    ).wait(3);
};

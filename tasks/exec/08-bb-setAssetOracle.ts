import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { Penrose } from '../../typechain';

export const setAssetOracle__task = async (
    taskArgs: { bb: string; oracle: string; oracleData: string },
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
    const callData = market.interface.encodeFunctionData('setAssetOracle', [
        taskArgs.oracle,
        taskArgs.oracleData,
    ]);
    await (
        await penrose.executeMarketFn([market.address], [callData], true)
    ).wait(3);
};

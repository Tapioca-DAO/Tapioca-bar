import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { Penrose } from '../../typechain';
import inquirer from 'inquirer';

export const setBigBangConfig__task = async (
    taskArgs: { bb: string },
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

    const { minDebtRate } = await inquirer.prompt({
        type: 'input',
        name: 'minDebtRate',
        message: 'Minimum debt rate (16 decimals; leave 0 to skip)',
        default: 0,
    });

    const { maxDebtRate } = await inquirer.prompt({
        type: 'input',
        name: 'maxDebtRate',
        message: 'Maximum debt rate (16 decimals; leave 0 to skip)',
        default: 0,
    });

    const { debtRateAgainstEthMarket } = await inquirer.prompt({
        type: 'input',
        name: 'debtRateAgainstEthMarket',
        message: 'Debt rate against main market (leave 0 to skip)',
        default: 0,
    });

    const { liquidationMultiplier } = await inquirer.prompt({
        type: 'input',
        name: 'liquidationMultiplier',
        message: 'Liquidation multiplier (leave 0 to skip)',
        default: 0,
    });

    const callData = market.interface.encodeFunctionData('setBigBangConfig', [
        minDebtRate,
        maxDebtRate,
        debtRateAgainstEthMarket,
        liquidationMultiplier,
    ]);
    await (
        await penrose.executeMarketFn([market.address], [callData], true)
    ).wait(3);
};

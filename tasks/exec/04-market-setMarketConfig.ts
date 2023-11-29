import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { Penrose } from '../../typechain';
import inquirer from 'inquirer';

export const setMarketConfig__task = async (
    taskArgs: { market: string },
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

    const { oracle } = await inquirer.prompt({
        type: 'input',
        name: 'oracle',
        message: 'Oracle address (leave 0 to skip)',
        default: hre.ethers.constants.AddressZero,
    });

    const { oracleData } = await inquirer.prompt({
        type: 'input',
        name: 'oracleData',
        message: 'Oracle data (leave 0 to skip)',
        default: '0x',
    });

    const { conservator } = await inquirer.prompt({
        type: 'input',
        name: 'conservator',
        message: 'Conservator address (leave 0 to skip)',
        default: hre.ethers.constants.AddressZero,
    });

    const { protocolFee } = await inquirer.prompt({
        type: 'input',
        name: 'protocolFee',
        message: 'Liquidation protocol fee amount (leave 0 to skip)',
        default: 0,
    });

    const { liquidationBonusAmount } = await inquirer.prompt({
        type: 'input',
        name: 'liquidationBonusAmount',
        message: 'Liquidation bonus amount (leave 0 to skip)',
        default: 0,
    });

    const { minLiquidatorReward } = await inquirer.prompt({
        type: 'input',
        name: 'minLiquidatorReward',
        message: 'Minimum % a liquidator could receive (leave 0 to skip)',
        default: 0,
    });

    const { maxLiquidatorReward } = await inquirer.prompt({
        type: 'input',
        name: 'maxLiquidatorReward',
        message: 'Maximum % a liquidator could receive (leave 0 to skip)',
        default: 0,
    });

    const { totalBorrowCap } = await inquirer.prompt({
        type: 'input',
        name: 'totalBorrowCap',
        message: 'Max borrow cap (leave 0 to skip)',
        default: 0,
    });

    const { collateralizationRate } = await inquirer.prompt({
        type: 'input',
        name: 'collateralizationRate',
        message: 'Market collateralization rate (leave 0 to skip)',
        default: 0,
    });

    const { liquidationCollateralizationRate } = await inquirer.prompt({
        type: 'input',
        name: 'liquidationCollateralizationRate',
        message:
            'Market liquidation start collateralization rate (leave 0 to skip)',
        default: 0,
    });

    const callData = market.interface.encodeFunctionData('setMarketConfig', [
        oracle,
        oracleData,
        conservator,
        0, //callerFee - deprecated
        protocolFee,
        liquidationBonusAmount,
        minLiquidatorReward,
        maxLiquidatorReward,
        totalBorrowCap,
        collateralizationRate,
        liquidationCollateralizationRate,
    ]);

    await (
        await penrose.executeMarketFn([market.address], [callData], true)
    ).wait(3);
};

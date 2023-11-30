import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { Penrose } from '../../typechain';
import inquirer from 'inquirer';

export const setSingularityConfig__task = async (
    taskArgs: { singularity: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const { contract: penrose } =
        await hre.SDK.hardhatUtils.getLocalContract<Penrose>(
            hre,
            'Penrose',
            tag,
        );

    const market = await hre.ethers.getContractAt(
        'Singularity',
        taskArgs.singularity,
    );

    const openingFee = await market.borrowOpeningFee();

    const { borrowOpeningFee } = await inquirer.prompt({
        type: 'input',
        name: 'borrowOpeningFee',
        message: 'Borrow opening fee',
        default: openingFee,
    });

    const { lqCollateralizationRate } = await inquirer.prompt({
        type: 'input',
        name: 'lqCollateralizationRate',
        message: 'Liquidation Queue collateralization rate (leave 0 to skip)',
        default: 0,
    });

    const { liquidationMultiplier } = await inquirer.prompt({
        type: 'input',
        name: 'liquidationMultiplier',
        message: 'Liquidation multiplier (leave 0 to skip)',
        default: 0,
    });

    const { minimumTargetUtilization } = await inquirer.prompt({
        type: 'input',
        name: 'minimumTargetUtilization',
        message: 'Minimum target utilization (leave 0 to skip)',
        default: 0,
    });

    const { maximumTargetUtilization } = await inquirer.prompt({
        type: 'input',
        name: 'maximumTargetUtilization',
        message: 'Maximum target utilization (leave 0 to skip)',
        default: 0,
    });

    const { minimumInterestPerSecond } = await inquirer.prompt({
        type: 'input',
        name: 'minimumInterestPerSecond',
        message: 'Minimum intereset per second (leave 0 to skip)',
        default: 0,
    });

    const { maximumInterestPerSecond } = await inquirer.prompt({
        type: 'input',
        name: 'maximumInterestPerSecond',
        message: 'Maximum intereset per second (leave 0 to skip)',
        default: 0,
    });

    const { interestElasticity } = await inquirer.prompt({
        type: 'input',
        name: 'interestElasticity',
        message: 'intereset elasticity (leave 0 to skip)',
        default: 0,
    });
    const callData = market.interface.encodeFunctionData(
        'setSingularityConfig',
        [
            borrowOpeningFee,
            lqCollateralizationRate,
            liquidationMultiplier,
            minimumTargetUtilization,
            maximumTargetUtilization,
            minimumInterestPerSecond,
            maximumInterestPerSecond,
            interestElasticity,
        ],
    );

    await (
        await penrose.executeMarketFn([market.address], [callData], true)
    ).wait(3);
};

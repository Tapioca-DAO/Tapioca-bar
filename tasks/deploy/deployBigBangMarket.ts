import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { getOverrideOptions } from 'tapioca-sdk/dist/api/utils';
import { TContract } from 'tapioca-sdk/dist/shared';
import { Penrose, YieldBox } from '../../typechain';
import { buildOracleMock } from '../deployBuilds/05-buildOracleMock';
import { loadVM } from '../utils';

export const deployBigBangMarket__task = async (
    taskArgs: {
        overrideOptions?: boolean;
    },
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('[+] Deploying: BigBang market');
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');

    const { contract: yieldBox } =
        await hre.SDK.hardhatUtils.getLocalContract<YieldBox>(
            hre,
            'YieldBox',
            tag,
        );

    const { contract: penrose } =
        await hre.SDK.hardhatUtils.getLocalContract<Penrose>(
            hre,
            'Penrose',
            tag,
        );

    const mediumRiskMC = hre.SDK.db.getLocalDeployment(
        await hre.getChainId(),
        'BigBangMediumRiskMC',
        tag,
    );

    if (!mediumRiskMC) throw new Error('[-] BigBangMediumRiskMC not found');

    const { projectName } = await inquirer.prompt({
        type: 'input',
        name: 'projectName',
        message: 'In which project is the token registered?',
    });
    const tokens = hre.SDK.db.loadGlobalDeployment(
        tag,
        projectName,
        await hre.getChainId(),
    );

    const { tokenName } = await inquirer.prompt({
        type: 'list',
        name: 'tokenName',
        message:
            'Which token do you want to deploy a market for? (List loaded from tapiocaz repo)',
        choices: tokens.map((e) => e.name),
    });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const token = tokens.find((e) => e.name === tokenName)!;

    const tokenStrategy = hre.SDK.db.getLocalDeployment(
        await hre.getChainId(),
        `ERC20WithoutStrategy-${token.name}`,
        tag,
    );
    if (!tokenStrategy) {
        throw '[-] Token strategy not found. Use deployEmptyStrategy to create one';
    }
    const collateral = {
        collateralAddress: token.address,
        collateralStrategyAddress: tokenStrategy.address,
    };

    const collateralId = await yieldBox.ids(
        1,
        collateral.collateralAddress,
        collateral.collateralStrategyAddress,
        0,
    );

    const chainInfo = hre.SDK.utils.getChainBy(
        'chainId',
        await hre.getChainId(),
    );
    if (!chainInfo) {
        throw new Error('Chain not found');
    }
    let oracle = hre.SDK.db
        .loadLocalDeployment(tag, chainInfo.chainId)
        .find((e) => e.name.startsWith('OracleMock-' + token.name));

    const VM = await loadVM(hre, tag);
    if (!oracle) {
        const { oracleRate } = await inquirer.prompt({
            type: 'input',
            name: 'oracleRate',
            message: 'Oracle rate (can be changed later)',
            default: '1',
        });

        VM.add(
            await buildOracleMock(
                hre,
                'OracleMock-' + token.name,
                'OCM-' + token.name,
                hre.ethers.utils.parseEther(oracleRate),
            ),
        );
        await VM.execute(3);
        VM.save();
        try {
            await VM.verify();
        } catch {
            console.log('[-] Verification failed');
        }

        oracle = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name.startsWith('WETHMock'));
    }

    const { exchangeRatePrecision } = await inquirer.prompt({
        type: 'input',
        name: 'exchangeRatePrecision',
        message: 'Exchange Rate precision (decimals)',
        default: '0',
    });

    const { debtRateAgainstEth } = await inquirer.prompt({
        type: 'input',
        name: 'debtRateAgainstEth',
        message:
            'Debt rate against ETH market (leave empty if this is the main market)',
        default: '0',
    });

    const { debtRateMin } = await inquirer.prompt({
        type: 'input',
        name: 'debtRateMin',
        message: 'Minimum debt rate',
        default: '0',
    });

    const { debtRateMax } = await inquirer.prompt({
        type: 'input',
        name: 'debtRateMax',
        message: 'Maximum debt rate',
        default: '0',
    });

    const { debtStartPoint } = await inquirer.prompt({
        type: 'input',
        name: 'debtStartPoint',
        message: 'Debt start point',
        default: '0',
    });

    const data = new hre.ethers.utils.AbiCoder().encode(
        [
            'address', //penrose
            'address', //collateral address
            'uint256', //collateral id
            'address', //oracle address
            'uint256', //exchangeRatePrecision
            'uint256', //debtRateAgainstEth
            'uint256', //debtRateMin
            'uint256', //debtRateMax
            'uint256', //debtStartPoint
        ],
        [
            penrose.address,
            collateral.collateralAddress,
            collateralId,
            oracle?.address ?? VM.list()[0].address,
            exchangeRatePrecision ??
                hre.ethers.BigNumber.from((1e18).toString()),
            debtRateAgainstEth,
            debtRateMin,
            debtRateMax,
            debtStartPoint,
        ],
    );

    console.log('[+] +Setting: Register BigBang market in Penrose');
    const tx = await penrose.registerBigBang(
        mediumRiskMC.address,
        data,
        true,
        taskArgs.overrideOptions
            ? getOverrideOptions(String(hre.network.config.chainId))
            : {},
    );
    await tx.wait(3);

    const marketsLength = (await penrose.bigBangMarkets()).length;
    const market = await hre.ethers.getContractAt(
        'BigBang',
        await penrose.clonesOf(mediumRiskMC.address, marketsLength - 1),
    );

    console.log(`[+] BigBang market for ${token.name} deployed! 🥳`);
    VM.load([
        {
            name: `BigBang-${token.name}`,
            address: market.address,
            meta: {
                isBigBangMarket: true,
                collateral,
            },
        },
    ]);
    VM.save();
};

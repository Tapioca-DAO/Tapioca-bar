import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { getOverrideOptions } from '@tapioca-sdk/api/utils';
import { TContract } from '@tapioca-sdk//shared';
import { Penrose, YieldBox } from '../../typechain';
import { buildOracleMock } from '../deployBuilds/05-buildOracleMock';
import ClusterArtifact from '@tapioca-sdk/artifacts/tapioca-periphery/Cluster.json';

import { loadVM } from '../utils';
import { Cluster } from '@tapioca-sdk/typechain/tapioca-periphery';

export const deployBigBangMarket__task = async (
    taskArgs: {
        executorName?: string;
        tokenStrategyName?: string;
        oracleName?: string;
        assetOracleName?: string;
        overrideOptions?: boolean;
    },
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('[+] Deploying: BigBang market');
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');

    const chainInfo = hre.SDK.utils.getChainBy('chainId', hre.SDK.eChainId);
    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    let yb = hre.SDK.db
        .loadGlobalDeployment(tag, 'yieldbox', chainInfo.chainId)
        .find((e) => e.name == 'YieldBox');

    if (!yb) {
        yb = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name == 'YieldBox');
    }

    const yieldBox = await hre.ethers.getContractAt('YieldBox', yb?.address);

    const { contract: penrose } =
        await hre.SDK.hardhatUtils.getLocalContract<Penrose>(
            hre,
            'Penrose',
            tag,
        );

    const mediumRiskMC = hre.SDK.db.getLocalDeployment(
        hre.SDK.eChainId,
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
        hre.SDK.eChainId,
    );

    const { tokenName } = await inquirer.prompt({
        type: 'list',
        name: 'tokenName',
        message: 'Which token do you want to deploy a market for?',
        choices: tokens.map((e) => e.name),
    });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const token = tokens.find((e) => e.name === tokenName)!;

    const tokenStrategyFilter =
        taskArgs.tokenStrategyName ?? `ERC20WithoutStrategy-${token.name}`;
    let tokenStrategy = hre.SDK.db.getLocalDeployment(
        hre.SDK.eChainId,
        tokenStrategyFilter,
        tag,
    );
    if (!tokenStrategy) {
        tokenStrategy = hre.SDK.db
            .loadGlobalDeployment(tag, 'tapioca-strategies', chainInfo.chainId)
            .find((e) => e.name === tokenStrategyFilter);
    }
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

    const isTestnet = chainInfo.tags[0] == 'testnet';

    const oracleFilterName = taskArgs.oracleName ?? 'OracleMock-' + token.name;
    let oracle = hre.SDK.db
        .loadLocalDeployment(tag, chainInfo.chainId)
        .find((e) => e.name.startsWith(oracleFilterName));

    if (!oracle) {
        oracle = hre.SDK.db
            .loadGlobalDeployment(tag, 'tapioca-periphery', chainInfo.chainId)
            .find((e) => e.name === oracleFilterName);
    }
    const VM = await loadVM(hre, tag);
    let shouldSave = false;
    if (!oracle) {
        if (!isTestnet) throw new Error('[-] Oracle not found');

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
        shouldSave = true;
    }

    const assetOracleFilterName = taskArgs.assetOracleName ?? 'AssetOracleMock';
    let assetOracle = hre.SDK.db
        .loadLocalDeployment(tag, chainInfo.chainId)
        .find((e) => e.name == assetOracleFilterName);
    if (!assetOracle) {
        assetOracle = hre.SDK.db
            .loadGlobalDeployment(tag, 'tapioca-periphery', chainInfo.chainId)
            .find((e) => e.name === assetOracleFilterName);
    }
    if (!assetOracle) {
        if (!isTestnet) throw new Error('[-] Asset oracle not found');
        VM.add(
            await buildOracleMock(
                hre,
                'AssetOracleMock',
                'OCM-' + token.name,
                hre.ethers.utils.parseEther('1'),
            ),
        );
        shouldSave = true;
    }
    if (shouldSave) {
        await VM.execute(3);
        VM.save();
        try {
            await VM.verify();
        } catch {
            console.log('[-] Verification failed');
        }

        oracle = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name.startsWith('OracleMock-' + token.name));
        assetOracle = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name == 'AssetOracleMock');
    }

    const { contract: bbLiquidation } =
        await hre.SDK.hardhatUtils.getLocalContract(hre, 'BBLiquidation', tag);

    const { contract: bbCollateral } =
        await hre.SDK.hardhatUtils.getLocalContract(hre, 'BBCollateral', tag);

    const { contract: bbBorrow } = await hre.SDK.hardhatUtils.getLocalContract(
        hre,
        'BBBorrow',
        tag,
    );

    const { contract: bbLeverage } =
        await hre.SDK.hardhatUtils.getLocalContract(hre, 'BBLeverage', tag);

    const leverageExecutorFilter =
        taskArgs.executorName ?? 'SimpleLeverageExecutor';
    const leverageExecutor = hre.SDK.db.getLocalDeployment(
        hre.SDK.eChainId,
        leverageExecutorFilter,
        tag,
    );

    const { exchangeRatePrecision } = await inquirer.prompt({
        type: 'input',
        name: 'exchangeRatePrecision',
        message: 'Exchange Rate precision (decimals)',
        default: '0',
    });

    const { collateralizationRate } = await inquirer.prompt({
        type: 'input',
        name: 'collateralizationRate',
        message: 'Collateralization rate (75000 is 75%)',
        default: '0',
    });

    const { liquidationCollateralizationRate } = await inquirer.prompt({
        type: 'input',
        name: 'liquidationCollateralizationRate',
        message: 'Liquidation collateralization rate (85000 is 75%)',
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

    const bbFactory = await hre.ethers.getContractFactory('BigBang');
    const bb = await bbFactory.deploy();
    await bb.deployed();

    const data = new hre.ethers.utils.AbiCoder().encode(
        [
            'address', //bb liquidation
            'address', //bb borrow
            'address', //bb collateral
            'address', //bb leverage
            'address', //penrose
            'address', //collateral address
            'uint256', //collateral id
            'address', //oracle address
            'uint256', //exchangeRatePrecision
            'uint256', //debtRateAgainstEth
            'uint256', //debtRateMin
            'uint256', //debtRateMax
            'uint256', //collateralizationRate
            'uint256', //liquidationCollateralizationRate
            'address', // simpleLeverageExecutor
        ],
        [
            bbLiquidation.address,
            bbBorrow.address,
            bbCollateral.address,
            bbLeverage.address,
            penrose.address,
            collateral.collateralAddress,
            collateralId,
            oracle?.address ?? VM.list()[0].address,
            exchangeRatePrecision ??
                hre.ethers.BigNumber.from((1e18).toString()),
            debtRateAgainstEth,
            debtRateMin,
            debtRateMax,
            collateralizationRate,
            liquidationCollateralizationRate,
            leverageExecutor.address,
        ],
    );
    await (await bb.init(data)).wait(3);

    console.log('[+] +Setting: Register BigBang market in Penrose');
    await (await penrose.addBigBang(mediumRiskMC.address, bb.address)).wait(3);

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

    console.log('[+] Setting asset oracle');
    const setAssetOracleFn = market.interface.encodeFunctionData(
        'setAssetOracle',
        [assetOracle?.address, '0x'],
    );
    await (
        await penrose.executeMarketFn(
            [market.address],
            [setAssetOracleFn],
            true,
        )
    ).wait(3);

    console.log('[+] Setting the market as a minter & burner for USDO');
    const usdoDeployment = hre.SDK.db
        .loadLocalDeployment(tag, chainInfo.chainId)
        .find((e) => e.name == 'USDO');
    if (!usdoDeployment) throw new Error('[-] USDO deployment not found');

    const usdo = await hre.ethers.getContractAt(
        'USDO',
        usdoDeployment?.address,
    );
    await (await usdo.setMinterStatus(market.address, true)).wait(3);
    await (await usdo.setBurnerStatus(market.address, true)).wait(3);

    if (debtRateAgainstEth == '0') {
        console.log('[+] Setting the main market on Penrose');
        await penrose.setBigBangEthMarket(market.address);
    }
};

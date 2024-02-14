import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { getOverrideOptions } from '@tapioca-sdk/api/utils';
import { TContract } from '@tapioca-sdk//shared';
import { Penrose, YieldBox } from '../../typechain';
import { buildOracleMock } from '../deployBuilds/05-buildOracleMock';
import { loadVM } from '../utils';

export const deploySGLMarket__task = async (
    taskArgs: {
        executorName?: string;
        oracleName?: string;
        tokenStrategyName?: string;
        overrideOptions?: boolean;
    },
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('[+] Deploying: SGL market');
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');

    const chainInfo = hre.SDK.utils.getChainBy('chainId', hre.SDK.eChainId);
    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    const {
        yieldBox,
        penrose,
        usd0,
        sglCollateral,
        sglBorrow,
        sglLeverage,
        sglLiquidation,
        mediumRiskMC,
        token,
    } = await loadContracts(hre, tag);

    const { usd0Strategy, oracleAddress } = await loadStrats(
        hre,
        tag,
        token,
        taskArgs.oracleName,
    );

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

    const [asset, collateral] = [
        {
            assetAddress: usd0.address,
            assetStrategyAddress: usd0Strategy.address,
        },
        {
            collateralAddress: token.address,
            collateralStrategyAddress: tokenStrategy.address,
        },
    ];

    const { assetId, collateralId } = await loadAssets(
        hre,
        yieldBox,
        asset,
        collateral,
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

    const leverageExecutorFilter =
        taskArgs.executorName ?? 'SimpleLeverageExecutor';
    const leverageExecutor = hre.SDK.db.getLocalDeployment(
        hre.SDK.eChainId,
        leverageExecutorFilter,
        tag,
    );

    if (!leverageExecutor) throw new Error('[-] Leverage executor not found');

    const sglFactory = await hre.ethers.getContractFactory('Singularity');
    const sgl = await sglFactory.deploy();
    await sgl.deployed();

    const data = new hre.ethers.utils.AbiCoder().encode(
        [
            'address',
            'address',
            'address',
            'address',
            'address',
            'address',
            'uint256',
            'address',
            'uint256',
            'address',
            'uint256',
            'uint256',
            'uint256',
            'address',
        ],
        [
            sglLiquidation.address,
            sglBorrow.address,
            sglCollateral.address,
            sglLeverage.address,
            penrose.address,
            asset.assetAddress,
            assetId,
            collateral.collateralAddress,
            collateralId,
            oracleAddress,
            exchangeRatePrecision ??
                hre.ethers.BigNumber.from((1e18).toString()),
            collateralizationRate,
            liquidationCollateralizationRate,
            leverageExecutor.address,
        ],
    );

    await (await sgl.init(data)).wait(3);

    console.log('[+] +Setting: Register SGL market in Penrose');
    await (
        await penrose.addSingularity(mediumRiskMC.address, sgl.address)
    ).wait(3);

    const marketsLength = (await penrose.singularityMarkets()).length;
    const market = await hre.ethers.getContractAt(
        'Singularity',
        await penrose.clonesOf(mediumRiskMC.address, marketsLength - 1),
    );

    console.log(`[+] ${await market.name()} deployed! 🥳`);
    const VM = await loadVM(hre, tag);
    VM.load([
        {
            name: await market.name(),
            address: market.address,
            meta: {
                isSGLMarket: true,
                collateral,
                asset,
            },
        },
    ]);
    VM.save();
};

async function loadAssets(
    hre: HardhatRuntimeEnvironment,
    yieldBox: YieldBox,
    asset: { assetAddress: string; assetStrategyAddress: string },
    collateral: {
        collateralAddress: string;
        collateralStrategyAddress: string;
    },
) {
    const assetId = await yieldBox.ids(
        1,
        asset.assetAddress,
        asset.assetStrategyAddress,
        0,
    );
    const collateralId = await yieldBox.ids(
        1,
        collateral.collateralAddress,
        collateral.collateralStrategyAddress,
        0,
    );
    return { assetId, collateralId };
}

async function loadStrats(
    hre: HardhatRuntimeEnvironment,
    tag: string,
    token: TContract,
    oracleName?: string,
) {
    const VM = await loadVM(hre, tag);

    let usd0Strategy = hre.SDK.db.getLocalDeployment(
        hre.SDK.eChainId,
        'ERC20WithoutStrategy-USDO',
        tag,
    );

    //if host chain, USDO strategy might be available in Penrose
    if (!usd0Strategy) {
        const penroseDeployment = hre.SDK.db.getLocalDeployment(
            hre.SDK.eChainId,
            'Penrose',
            tag,
        );
        const penroseContract = await hre.ethers.getContractAt(
            'Penrose',
            penroseDeployment?.address,
        );
        if (!penroseContract) {
            throw new Error('[-] Penrose not found on host chain');
        }
        const usdoDeployment = hre.SDK.db.getLocalDeployment(
            hre.SDK.eChainId,
            'USDO',
            tag,
        );
        if (!usdoDeployment) {
            throw new Error('[-] USDO not found on host chain');
        }
        const strategyAddress = await penroseContract.emptyStrategies(
            usdoDeployment.address,
        );
        usd0Strategy = {
            name: 'ERC20WithoutStrategy-USDO',
            address: strategyAddress,
            meta: {},
        };
    }
    if (!usd0Strategy) {
        throw new Error('[-] USDO strategy not found');
    }

    const chainInfo = hre.SDK.utils.getChainBy('chainId', hre.SDK.eChainId);
    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    const oracleFilterName = oracleName ?? 'OracleMock-' + token.name;
    let oracle = hre.SDK.db
        .loadLocalDeployment(tag, chainInfo.chainId)
        .find((e) => e.name.startsWith(oracleFilterName));

    if (!oracle) {
        oracle = hre.SDK.db
            .loadGlobalDeployment(tag, 'tapioca-periphery', chainInfo.chainId)
            .find((e) => e.name === oracleFilterName);
    }
    if (!oracle) {
        const isTestnet = chainInfo.tags[0] == 'testnet';
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
        await VM.execute(3);
        VM.save();
        try {
            await VM.verify();
        } catch {
            console.log('[-] Verification failed');
        }
    }

    return {
        usd0Strategy,
        oracleAddress: oracle?.address ?? VM.list()[0].address,
    };
}

async function loadContracts(hre: HardhatRuntimeEnvironment, tag: string) {
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

    const { contract: usd0 } = await hre.SDK.hardhatUtils.getLocalContract(
        hre,
        'USDO',
        tag,
    );

    const { contract: sglLiquidation } =
        await hre.SDK.hardhatUtils.getLocalContract(hre, 'SGLLiquidation', tag);

    const { contract: sglCollateral } =
        await hre.SDK.hardhatUtils.getLocalContract(hre, 'SGLCollateral', tag);

    const { contract: sglBorrow } = await hre.SDK.hardhatUtils.getLocalContract(
        hre,
        'SGLBorrow',
        tag,
    );

    const { contract: sglLeverage } =
        await hre.SDK.hardhatUtils.getLocalContract(hre, 'SGLLeverage', tag);

    const mediumRiskMC = hre.SDK.db.getLocalDeployment(
        hre.SDK.eChainId,
        'MediumRiskMC',
        tag,
    );

    if (!mediumRiskMC) throw new Error('[-] MediumRiskMC not found');

    const tokens = hre.SDK.db.loadGlobalDeployment(
        tag,
        'tapiocaz',
        hre.SDK.eChainId,
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

    return {
        yieldBox,
        penrose,
        usd0,
        sglLiquidation,
        sglCollateral,
        sglBorrow,
        sglLeverage,
        mediumRiskMC,
        token,
    };
}

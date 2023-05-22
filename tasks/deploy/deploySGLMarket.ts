import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { TContract } from 'tapioca-sdk/dist/shared';
import { Penrose, YieldBox } from '../../typechain';
import { buildOracleMock } from '../deployBuilds/05-buildOracleMock';
import { loadVM } from '../utils';

export const deploySGLMarket__task = async (
    {},
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('[+] Deploying: SGL market');
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');

    const {
        yieldBox,
        penrose,
        usd0,
        sglLendingBorrowing,
        sglLiquidation,
        mediumRiskMC,
        token,
    } = await loadContracts(hre, tag);

    const { usd0Strategy, oracleAddress } = await loadStrats(hre, tag, token);

    const tokenStrategy = hre.SDK.db.getLocalDeployment(
        await hre.getChainId(),
        `ERC20WithoutStrategy-${token.name}`,
        tag,
    );
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

    const data = new hre.ethers.utils.AbiCoder().encode(
        [
            'address',
            'address',
            'address',
            'address',
            'uint256',
            'address',
            'uint256',
            'address',
            'uint256',
        ],
        [
            sglLiquidation.address,
            sglLendingBorrowing.address,
            penrose.address,
            asset.assetAddress,
            assetId,
            collateral.collateralAddress,
            collateralId,
            oracleAddress.address,
            exchangeRatePrecision ??
                hre.ethers.BigNumber.from((1e18).toString()),
        ],
    );

    console.log('[+] +Setting: Register SGL market in Penrose');
    const tx = await penrose.registerSingularity(
        mediumRiskMC.address,
        data,
        true,
        hre.SDK.utils.getOverrideOptions(await hre.getChainId()),
    );
    await tx.wait(3);

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
) {
    const VM = await loadVM(hre, tag);

    let usd0Strategy = hre.SDK.db.getLocalDeployment(
        await hre.getChainId(),
        'ERC20WithoutStrategy-USDO',
        tag,
    );

    //if host chain, USDO strategy might be available in Penrose
    if (!usd0Strategy) {
        const penroseDeployment = hre.SDK.db.getLocalDeployment(
            await hre.getChainId(),
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
            await hre.getChainId(),
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

    const oracle = hre.SDK.db
        .loadLocalDeployment(tag, chainInfo.chainId)
        .find((e) => e.name.startsWith('OracleMock-' + token.name));

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
    }

    return {
        usd0Strategy,
        oracleAddress: oracle?.address ?? VM.list()[0],
    };
}

async function loadContracts(hre: HardhatRuntimeEnvironment, tag: string) {
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

    const { contract: usd0 } = await hre.SDK.hardhatUtils.getLocalContract(
        hre,
        'USDO',
        tag,
    );

    const { contract: sglLiquidation } =
        await hre.SDK.hardhatUtils.getLocalContract(hre, 'SGLLiquidation', tag);

    const { contract: sglLendingBorrowing } =
        await hre.SDK.hardhatUtils.getLocalContract(
            hre,
            'SGLLendingBorrowing',
            tag,
        );

    const mediumRiskMC = hre.SDK.db.getLocalDeployment(
        await hre.getChainId(),
        'MediumRiskMC',
        tag,
    );

    if (!mediumRiskMC) throw new Error('[-] MediumRiskMC not found');

    const tokens = hre.SDK.db.loadGlobalDeployment(
        tag,
        'tapiocaz',
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

    return {
        yieldBox,
        penrose,
        usd0,
        sglLiquidation,
        sglLendingBorrowing,
        mediumRiskMC,
        token,
    };
}

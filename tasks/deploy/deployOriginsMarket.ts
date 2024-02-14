import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { TContract } from '@tapioca-sdk//shared';
import { Penrose, YieldBox } from '../../typechain';
import { buildOracleMock } from '../deployBuilds/05-buildOracleMock';
import { loadVM } from '../utils';

export const deployOriginsMarket__task = async (
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

    const { yieldBox, penrose, usd0, token } = await loadContracts(hre, tag);

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

    const deployer = (await hre.ethers.getSigners())[0];

    const originsFactory = await hre.ethers.getContractFactory('Origins');
    const origins = await originsFactory.deploy(
        deployer.address,
        yieldBox.address,
        asset.assetAddress,
        assetId,
        collateral.collateralAddress,
        collateralId,
        oracleAddress,
        exchangeRatePrecision,
        collateralizationRate,
    );
    await origins.deployed();

    console.log('[+] Origins deployed! 🥳');
    const VM = await loadVM(hre, tag);
    VM.load([
        {
            name: 'Origins',
            address: origins.address,
            meta: {
                isSGLMarket: false,
                collateral,
                asset,
            },
        },
    ]);
    VM.save();

    console.log('[+] Setting the market as a minter & burner for USDO');
    const usdoDeployment = hre.SDK.db
        .loadLocalDeployment(tag, chainInfo.chainId)
        .find((e) => e.name == 'USDO');
    if (!usdoDeployment) throw new Error('[-] USDO deployment not found');

    const usdo = await hre.ethers.getContractAt(
        'USDO',
        usdoDeployment?.address,
    );
    await (await usdo.setMinterStatus(origins.address, true)).wait(3);
    await (await usdo.setBurnerStatus(origins.address, true)).wait(3);
    console.log('[+] Done');

    console.log('[+] Setting the market as Origins on Penrose');
    await penrose.addOriginsMarket(origins.address);
    console.log('[+] Done');
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
    const { tokenAddress } = await inquirer.prompt({
        type: 'input',
        name: 'tokenAddress',
        message: 'Collateral address',
    });

    const ercToken = await hre.ethers.getContractAt(
        'IERC20Metadata',
        tokenAddress,
    );
    const token: TContract = {
        name: await ercToken.name(),
        address: ercToken.address,
        meta: {},
    };
    return {
        yieldBox,
        penrose,
        usd0,
        token,
    };
}

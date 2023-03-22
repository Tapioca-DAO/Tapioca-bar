import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { DeployerVM } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { TContract } from 'tapioca-sdk/dist/shared';
import { Penrose, YieldBox } from '../../typechain';
import { buildOracleMock } from '../deployBuilds/05-buildOracleMock';
import { buildEmptyStrat } from '../deployBuilds/10-buildEmptyStrat';
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

    const { tokenStrategy, usd0Strategy, oracleAddress } = await loadStrats(
        hre,
        tag,
        token,
        yieldBox.address,
    );

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
            hre.ethers.BigNumber.from((1e18).toString()),
        ],
    );

    console.log('[+] +Setting: Register SGL market in Penrose');
    const tx = await penrose.registerSingularity(
        mediumRiskMC.address,
        data,
        true,
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
    yieldBoxAddr: string,
) {
    const VM = await loadVM(hre, tag);

    const usd0Strategy = hre.SDK.db.getLocalDeployment(
        await hre.getChainId(),
        'ERC20WithoutStrategy-USD0',
        tag,
    );
    if (!usd0Strategy) {
        throw new Error('[-] USD0 strategy not found');
    }

    VM.add({
        contract: await hre.ethers.getContractFactory('ERC20WithoutStrategy'),
        deploymentName: 'ERC20WithoutStrategy-' + token.name,
        args: [yieldBoxAddr, usd0Strategy.address],
        meta: {
            stratFor: token.name,
        },
    });

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
    await VM.verify();

    return {
        usd0Strategy,
        tokenStrategy: VM.list()[0],
        oracleAddress: VM.list()[1],
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
        'USD0',
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

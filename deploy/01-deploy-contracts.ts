import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import {
    verify,
    createObjectAndAppendToFile,
    createObjectAndAppendDataToFile,
    appendToFile,
} from './utils';
import _ from 'lodash';
import { BigNumber } from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const chainId = await hre.getChainId();

    console.log(`Starting deployment on chain: ${chainId}`);
    //Deploy YieldBox
    console.log(`\n Deploying YieldBox...`);
    const { deployedUriBuilder, deployedYieldBox } = await _deployYieldBox(hre);
    console.log(`Done`);

    //Register YieldBox assets
    console.log(`\n Registering YieldBox assets...`);
    const { wethAssetId, usdcAssetId } = await _registerYieldBoxAssets(
        hre,
        deployedYieldBox.address,
    );
    console.log(`Done`);

    //Deploy BeachBar
    console.log(`\n Deploying BeachBar...`);
    const { deployedBeachBar } = await _deployBeachBar(hre);
    console.log(`Done`);

    //Deploy MultiSwapper
    console.log(`\n Deploying MultiSwapper...`);
    const { deployedMultiSwapper } = await _deployMultiSwapper(
        hre,
        deployedBeachBar.address,
    );
    console.log(`Done`);

    //Set MultiSwapper
    console.log(`\n Setting MultiSwapper on YieldBox...`);
    await _setMultiSwapper(
        hre,
        deployedMultiSwapper.address,
        deployedBeachBar.address,
    );
    console.log(`Done`);

    //Deploy medium risk master contract
    console.log(`\n Deploying Master contract...`);
    const { deployedMC } = await _deployMediumRiskMC(hre);
    console.log(`Done`);

    //Deploy MixologistHelper
    console.log(`\n Deploying MixologistHelper contract...`);
    const { deployedMixologistHelper } = await _deployMixologistHelper(hre);
    console.log(`Done`);

    //Save deployments to file
    const contracts = {
        deployedUriBuilder,
        deployedYieldBox,
        deployedBeachBar,
        deployedMultiSwapper,
        deployedMC,
        deployedMixologistHelper,
    };
    await createObjectAndAppendToFile(contracts, chainId, 'core');

    //Save data to file
    const data = {
        wethAssetId,
        usdcAssetId,
    };
    await createObjectAndAppendDataToFile(data, chainId, 'core-data');

    //Register makerts
    const markets = [
        {
            name: 'WETH-USDC',
            asset: process.env.WETH_ADDRESS,
            assetId: wethAssetId,
            collateral: process.env.USDC_ADDRESS,
            collateralId: usdcAssetId,
            oracle: process.env.WETH_USDC_ORACLE_ADDRESS,
        },
    ];
    const marketContracts: any = {};
    for (let i = 0; i < markets.length; i++) {
        const marketData = markets[i];
        const { mxLiquidation, mxLendingBorrowing, deployedMixologist } =
            await _registerMixologist(
                hre,
                deployedMC.address,
                deployedBeachBar.address,
                deployedYieldBox.address,
                marketData.asset!,
                marketData.assetId,
                marketData.collateral!,
                marketData.collateralId,
                marketData.oracle!,
            );

        marketContracts[marketData.name] = {
            mxLiquidation,
            mxLendingBorrowing,
            deployedMixologist,
        };
    }
    await appendToFile(marketContracts);
};

async function _deployYieldBox(hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    //deploy YieldBoxURIBuilder
    await deploy('YieldBoxURIBuilder', { from: deployer, log: true });
    await verify(hre, 'YieldBoxURIBuilder', []);
    const deployedUriBuilder = await deployments.get('YieldBoxURIBuilder');

    //deploy YieldBox
    const yieldBoxArgs = [
        process.env.WRAPPED_NATIVE,
        deployedUriBuilder.address,
    ];
    await deploy('YieldBox', {
        from: deployer,
        log: true,
        args: yieldBoxArgs,
    });
    await verify(hre, 'YieldBox', yieldBoxArgs);
    const deployedYieldBox = await deployments.get('YieldBox');

    return { deployedUriBuilder, deployedYieldBox };
}

async function _registerYieldBoxAssets(
    hre: HardhatRuntimeEnvironment,
    yieldBoxAddress: string,
) {
    const yieldBoxContract = await hre.ethers.getContractAt(
        'YieldBox',
        yieldBoxAddress,
    );

    console.log(`   Registering WETH`);
    await (
        await yieldBoxContract.registerAsset(
            1,
            process.env.WETH_ADDRESS!,
            hre.ethers.constants.AddressZero,
            0,
        )
    ).wait();

    console.log(`   Registering USDC`);
    await (
        await yieldBoxContract.registerAsset(
            1,
            process.env.USDC_ADDRESS!,
            hre.ethers.constants.AddressZero,
            0,
        )
    ).wait();

    const wethAssetId = await yieldBoxContract.ids(
        1,
        process.env.WETH_ADDRESS!,
        hre.ethers.constants.AddressZero,
        0,
    );

    const usdcAssetId = await yieldBoxContract.ids(
        1,
        process.env.USDC_ADDRESS!,
        hre.ethers.constants.AddressZero,
        0,
    );

    return { wethAssetId, usdcAssetId };
}

async function _deployBeachBar(hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    let yieldBoxAddress = process.env.YIELDBOX_ADDRESS;
    if (!hre.ethers.utils.isAddress(yieldBoxAddress!)) {
        const deployedYieldBox = await deployments.get('YieldBox');
        yieldBoxAddress = deployedYieldBox.address;
    }

    const args = [yieldBoxAddress, process.env.TAP_ADDRESS];
    await deploy('BeachBar', {
        from: deployer,
        log: true,
        args,
    });
    await verify(hre, 'BeachBar', args);
    const deployedBeachBar = await deployments.get('BeachBar');

    const beachBarContract = await hre.ethers.getContractAt(
        'BeachBar',
        deployedBeachBar.address,
    );
    await (await beachBarContract.setFeeTo(process.env.FEE_TO_ADDRESS!)).wait();
    await (
        await beachBarContract.setFeeVeTap(process.env.FEE_VETAP_ADDRESS!)
    ).wait();

    return { deployedBeachBar };
}

async function _deployMultiSwapper(
    hre: HardhatRuntimeEnvironment,
    barAddress: string,
) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const uniswapFactoryContract = await hre.ethers.getContractAt(
        'UniswapV2Factory',
        process.env.UNISWAP_FACTORY!,
    );

    const args = [
        process.env.UNISWAP_FACTORY,
        barAddress,
        await uniswapFactoryContract.pairCodeHash(),
    ];
    await deploy('MultiSwapper', {
        from: deployer,
        log: true,
        args,
    });
    await verify(hre, 'MultiSwapper', args);
    const deployedMultiSwapper = await deployments.get('MultiSwapper');

    return { deployedMultiSwapper };
}

async function _setMultiSwapper(
    hre: HardhatRuntimeEnvironment,
    multiSwapperAddress: string,
    barAddress: string,
) {
    const beachBarContract = await hre.ethers.getContractAt(
        'BeachBar',
        barAddress,
    );
    await (await beachBarContract.setSwapper(multiSwapperAddress, true)).wait();
}

async function _deployMediumRiskMC(hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('Mixologist', { from: deployer, log: true });
    await verify(hre, 'Mixologist', []);
    const deployedMC = await deployments.get('Mixologist');

    return { deployedMC };
}

async function _deployMixologistHelper(hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('MixologistHelper', {
        from: deployer,
        log: true,
    });
    await verify(hre, 'MixologistHelper', []);
    const deployedMixologistHelper = await deployments.get('MixologistHelper');
    return { deployedMixologistHelper };
}

async function _registerMixologist(
    hre: HardhatRuntimeEnvironment,
    masterContractAddress: string,
    barAddress: string,
    yieldBoxAddress: string,
    assetAddress: string,
    assetId: BigNumber,
    collateralAddress: string,
    collateralId: BigNumber,
    oracleAddress: string,
) {
    const collateralSwapPath = [collateralAddress, assetAddress];
    const tapSwapPath = [assetAddress, process.env.TAP_ADDRESS];

    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('MXLiquidation', { from: deployer, log: true });
    await verify(hre, 'MXLiquidation', []);
    const mxLiquidation = await deployments.get('MXLiquidation');

    await deploy('MXLendingBorrowing', { from: deployer, log: true });
    await verify(hre, 'MXLendingBorrowing', []);
    const mxLendingBorrowing = await deployments.get('MXLendingBorrowing');

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
            'address[]',
            'address[]',
        ],
        [
            mxLiquidation.address,
            mxLendingBorrowing.address,
            barAddress,
            assetAddress,
            assetId,
            collateralAddress,
            collateralId,
            oracleAddress,
            collateralSwapPath,
            tapSwapPath,
        ],
    );
    const yieldBoxContract = await hre.ethers.getContractAt(
        'YieldBox',
        yieldBoxAddress,
    );
    const beachBarContract = await hre.ethers.getContractAt(
        'BeachBar',
        barAddress,
    );
    await (
        await beachBarContract.registerMixologist(
            masterContractAddress,
            data,
            true,
        )
    ).wait();

    const deployedMixologist = await hre.ethers.getContractAt(
        'Mixologist',
        await yieldBoxContract.clonesOf(
            masterContractAddress,
            (
                await yieldBoxContract.clonesOfCount(masterContractAddress)
            ).sub(1),
        ),
    );

    console.log(`    - verifying Mixologist`);
    try {
        await hre.run('verify', {
            address: deployedMixologist.address,
            constructorArgsParams: [],
        });
    } catch (err: any) {
        console.log(`Error: ${err.message}\n`);
    }
    console.log(`    - verified`);
    console.log(`\n    - deploying LiquidationQueue for current market`);
    const { deployedLQ } = await _registerLiquidationQueue(hre);
    console.log(`    - done`);

    return {
        mxLiquidation,
        mxLendingBorrowing,
        deployedMixologist,
        deployedLQ,
    };
}

async function _registerLiquidationQueue(
    hre: HardhatRuntimeEnvironment,
    mixologistAddress: string,
    barAddress: string,
) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('LiquidationQueue', { from: deployer, log: true });
    await verify(hre, 'LiquidationQueue', []);
    const deployedLQ = await deployments.get('LiquidationQueue');

    const LQ_META = {
        activationTime: 600, // 10min
        minBidAmount: hre.ethers.BigNumber.from((1e18).toString()).mul(200), // 200 USDC
        feeCollector: process.env.LIQUIDATION_FEE_COLLATERAL,
        bidExecutionSwapper: hre.ethers.constants.AddressZero,
        usdoSwapper: hre.ethers.constants.AddressZero,
    };
    const mixologistContract = await hre.ethers.getContractAt(
        'Mixologist',
        mixologistAddress,
    );
    const beachBarContract = await hre.ethers.getContractAt(
        'BeachBar',
        barAddress,
    );

    const payload = mixologistContract.interface.encodeFunctionData(
        'setLiquidationQueue',
        [deployedLQ.address, LQ_META],
    );

    await (
        await beachBarContract.executeMixologistFn(
            [mixologistAddress],
            [payload],
        )
    ).wait();

    //TODO: add bid swappers

    return { deployedLQ };
}

export default func;
func.tags = ['tapioca'];

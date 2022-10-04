import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import SDK from 'tapioca-sdk';
import { TContract } from 'tapioca-sdk/dist/shared';

export const constants: { [key: string]: any } = {
    //optimism
    '10': {
        feeTo: '0x0000000000000000000000000000000000000000', //for BeachBar
        feeVeTo: '0x0000000000000000000000000000000000000000', //for BeachBar
        lqFeeCollector: '0x0000000000000000000000000000000000000000', //for LiquidationQueue
        yieldBoxAddress: '0x0000000000000000000000000000000000000000', //can be omitted/address(0) if we need to deploy it
        tapAddress: '0x0000000000000000000000000000000000000000', //TapOFT address
        wrappedNative: '0x0000000000000000000000000000000000000000', //for YieldBox
        usdoAddress: '0x0000000000000000000000000000000000000000', //USD0 address
        uniV2Factory: '0x0000000000000000000000000000000000000000', //TODO: fill it with the right value
        uniV2Router: '0x0000000000000000000000000000000000000000', //TODO: fill it with the right value
        curveStablePool: '0x0000000000000000000000000000000000000000', //TODO: fill it with the right value
        assets: [
            //list of tokens to be added to YieldBox
            {
                name: 'USDO',
                address: '0x0000000000000000000000000000000000000000',
            },
            {
                name: 'tETH',
                address: '0x0000000000000000000000000000000000000000',
            },
        ],
        //markets
        mx_ETH: {
            collateralAddress: '0x0000000000000000000000000000000000000000', //tETH address
            oracleAddress: '0x0000000000000000000000000000000000000000', //tETH-USD0 oracle
            minBidAmount: 20, //min USD0 bid amount
            hasExecutionBidder: false, //if false, bidExecutionSwapper is not set
            executionBidder: '0x0000000000000000000000000000000000000000', //bidExecutionSwapper address
        },
        mx_AVAX: {
            collateralAddress: '0x0000000000000000000000000000000000000000', //tAVAX address
            oracleAddress: '0x0000000000000000000000000000000000000000', //tAVAX-USD0 oracle
            minBidAmount: 20, //min USD0 bid amount
            hasExecutionBidder: false, //if false, bidExecutionSwapper is not set
            executionBidder: '0x0000000000000000000000000000000000000000', //bidExecutionSwapper address
        },
        //TODO: add rest of the markets
    },
    //optimism goerli (tesnet)
    '420': {
        feeTo: '0x0000000000000000000000000000000000000000',
        feeVeTo: '0x0000000000000000000000000000000000000000',
        lqFeeCollector: '0x0000000000000000000000000000000000000000',
        yieldBoxAddress: '0x0000000000000000000000000000000000000000',
        tapAddress: '0x0000000000000000000000000000000000000000',
        wrappedNative: '0x0000000000000000000000000000000000000000',
        usdoAddress: '0x0000000000000000000000000000000000000000',
        uniV2Factory: '0x0000000000000000000000000000000000000000',
        uniV2Router: '0x0000000000000000000000000000000000000000',
        curveStablePool: '0x0000000000000000000000000000000000000000',
        assets: [
            {
                name: 'USDO',
                address: '0x0000000000000000000000000000000000000000',
            },
            {
                name: 'tETH',
                address: '0x0000000000000000000000000000000000000000',
            },
        ],
        mx_ETH: {
            collateralAddress: '0x0000000000000000000000000000000000000000',
            oracleAddress: '0x0000000000000000000000000000000000000000',
            minBidAmount: 20,
            hasExecutionBidder: false,
            executionBidder: '0x0000000000000000000000000000000000000000',
        },
        mx_AVAX: {
            collateralAddress: '0x0000000000000000000000000000000000000000', //tAVAX address
            oracleAddress: '0x0000000000000000000000000000000000000000', //tAVAX-USD0 oracle
            minBidAmount: 20, //min USD0 bid amount
            hasExecutionBidder: false, //if false, bidExecutionSwapper is not set
            executionBidder: '0x0000000000000000000000000000000000000000', //bidExecutionSwapper address
        },
        //TODO: add rest of the markets
    },
};

export const verify = async (
    hre: HardhatRuntimeEnvironment,
    artifact: string,
    args: any[],
) => {
    const { deployments } = hre;

    const deployed = await deployments.get(artifact);
    console.log(`[+] Verifying ${artifact}`);
    try {
        await hre.run('verify', {
            address: deployed.address,
            constructorArgsParams: args,
        });
        console.log('[+] Verified');
    } catch (err: any) {
        console.log(
            `[-] failed to verify ${artifact}; error: ${err.message}\n`,
        );
    }
};

export const readJSONFromFile = () => {
    //file should exist
    const rawContent = fs.readFileSync('./deployments.json', {
        encoding: 'utf8',
    });
    return JSON.parse(rawContent);
};

export const updateDeployments = async (
    contracts: TContract[],
    chainId: string,
) => {
    await SDK.API.utils.saveDeploymentOnDisk({
        [chainId]: contracts,
    });
};

export const registerMarket = async (
    hre: HardhatRuntimeEnvironment,
    name: string,
): Promise<TContract> => {
    const { deployments, getNamedAccounts } = hre;
    const chainId = await hre.getChainId();

    let assetAddress = constants[chainId].usdoAddress;
    if (
        !hre.ethers.utils.isAddress(assetAddress!) ||
        assetAddress == hre.ethers.constants.AddressZero
    ) {
        const deployedUsd0 = await deployments.get('USD0');
        assetAddress = deployedUsd0.address;
    }
    const marketData = constants[chainId][`mx-${name}`];

    let yieldBoxAddress = constants[chainId].yieldBoxAddress;
    if (
        !hre.ethers.utils.isAddress(yieldBoxAddress!) ||
        yieldBoxAddress == hre.ethers.constants.AddressZero
    ) {
        const deployedYieldBox = await deployments.get('YieldBox');
        yieldBoxAddress = deployedYieldBox.address;
    }

    const beachBar = await hre.ethers.getContractAt(
        'BeachBar',
        (
            await deployments.get('BeachBar')
        ).address,
    );
    const yieldBox = await hre.ethers.getContractAt(
        'YieldBox',
        yieldBoxAddress,
    );
    const assetId = await yieldBox.ids(
        1,
        assetAddress,
        hre.ethers.constants.AddressZero,
        0,
    );
    const collateralId = await yieldBox.ids(
        1,
        marketData.collateralAddress,
        hre.ethers.constants.AddressZero,
        0,
    );
    const collateralSwapPath = [marketData.collateralAddress, assetAddress];
    const tapSwapPath = [assetAddress, constants[chainId].tapAddress];

    const mxLiquidation = await deployments.get('MXLiquidation');
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
            beachBar.address,
            assetAddress,
            assetId,
            marketData.collateralAddress,
            collateralId,
            marketData.oracleAddress,
            collateralSwapPath,
            tapSwapPath,
        ],
    );

    const deploymentsJson = readJSONFromFile();
    const masterContract = _.find(
        deploymentsJson,
        (e) => e.name === 'MediumRiskMC',
    );

    console.log(`[+] Registering ${name} - MxLiquidation`);
    await (
        await beachBar.registerMixologist(masterContract.address, data, true)
    ).wait();

    const market = await hre.ethers.getContractAt(
        'Mixologist',
        await yieldBox.clonesOf(
            masterContract.address,
            (await yieldBox.clonesOfCount(masterContract.address)).sub(1),
        ),
    );
    console.log('[+] Done');
    //No need to verify as the same contract type was previously verified

    return new Promise(async (resolve) =>
        resolve({
            name: await market.name(),
            address: market.address,
            meta: {},
        }),
    );
};

export const registerLiquidationQueue = async (
    hre: HardhatRuntimeEnvironment,
    name: string,
): Promise<TContract> => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await hre.getChainId();

    console.log(`\n Deploying ${name} LiquidationQueue`);

    const lqName = `lq-${name}`;
    await deploy(lqName, { from: deployer, log: true });
    await verify(hre, lqName, []);
    const deployedLQ = await deployments.get(lqName);

    const deploymentsJson = readJSONFromFile();
    const marketData: TContract = _.find(
        deploymentsJson,
        (e) => e.name === `mx-${name}`,
    );
    if (!marketData) {
        throw new Error(`[-] Market ${name} not found`);
    }

    const stableToUsdoBidder = await deployments.get('CurveStableToUsdoBidder');

    const LQ_META = {
        activationTime: 600, // 10min
        minBidAmount: hre.ethers.BigNumber.from((1e18).toString()).mul(
            constants[chainId][`mx_${name}`].minBidAmount,
        ),
        feeCollector: constants[chainId].feeCollector,
        bidExecutionSwapper: constants[chainId][`mx_${name}`].hasExecutionBidder
            ? constants[chainId][`mx_${name}`].executionBidder
            : hre.ethers.constants.AddressZero,
        usdoSwapper: stableToUsdoBidder.address,
    };
    const mixologistContract = await hre.ethers.getContractAt(
        'Mixologist',
        marketData.address,
    );
    const beachBarContract = await hre.ethers.getContractAt(
        'BeachBar',
        (
            await deployments.get('BeachBar')
        ).address,
    );

    const payload = mixologistContract.interface.encodeFunctionData(
        'setLiquidationQueue',
        [deployedLQ.address, LQ_META],
    );

    await (
        await beachBarContract.executeMixologistFn(
            [marketData.address],
            [payload],
        )
    ).wait();
    console.log('[+] Done');

    return new Promise(async (resolve) =>
        resolve({
            name: lqName,
            address: deployedLQ.address,
            meta: LQ_META,
        }),
    );
};

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TContract, TProjectDeployment } from 'tapioca-sdk/dist/api/exportSDK';
import fs from 'fs';
import _ from 'lodash';

export const constants: { [key: string]: any } = {
    //optimism
    '10': {
        feeTo: '0x0000000000000000000000000000000000000000', //for BeachBar
        feeVeTo: '0x0000000000000000000000000000000000000000', //for BeachBar
        lqFeeCollector: '0x0000000000000000000000000000000000000000', //for LiquidationQueue
        yieldBoxAddress: '0x0000000000000000000000000000000000000000', //can be omitted/address(0) if we need to deploy it
        tapAddress: '0x0000000000000000000000000000000000000000', //TapOFT address
        wrappedNative: '0x0000000000000000000000000000000000000000', //for YieldBox
        usdoAddress: '0x0000000000000000000000000000000000000000', //can be omitted/address(0) if we need to deploy it
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
        market_ETH: {
            collateralAddress: '0x0000000000000000000000000000000000000000', //tETH address
            oracleAddress: '0x0000000000000000000000000000000000000000', //tETH-USD0 oracle
            minBidAmount: 20, //min USD0 bid amount
            hasExecutionBidder: false, //if false, bidExecutionSwapper is not set
            executionBidder: '0x0000000000000000000000000000000000000000', //bidExecutionSwapper address
        },
        market_AVAX: {
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
        market_ETH: {
            collateralAddress: '0x0000000000000000000000000000000000000000',
            oracleAddress: '0x0000000000000000000000000000000000000000',
            minBidAmount: 20,
            hasExecutionBidder: false,
            executionBidder: '0x0000000000000000000000000000000000000000',
        },
        market_AVAX: {
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
    console.log(`    - verifying ${artifact}`);
    try {
        await hre.run('verify', {
            address: deployed.address,
            constructorArgsParams: args,
        });
        console.log(`    verified`);
    } catch (err: any) {
        console.log(
            `    failed to verify ${artifact}; error: ${err.message}\n`,
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

export const updateDeployments = (contracts: any[], chainId: string) => {
    const projectDeployment: TProjectDeployment = readJSONFromFile();
    projectDeployment[chainId] = projectDeployment[chainId] ?? [];

    for (let i = 0; i < contracts.length; i++) {
        let meta = {};
        if (contracts[i].args.length > 0) {
            meta = {
                constructorArguments: contracts[i].args,
                toVerify: {
                    address: contracts[i].contract.address,
                    args: contracts[i].args,
                },
            };
        }

        (projectDeployment[Number(chainId) as 10] as TContract[]).push({
            name: contracts[i].artifact,
            address: contracts[i].contract.address,
            meta,
        });
    }

    saveJSONToFile(projectDeployment);
};

export const registerMarket = async (
    hre: HardhatRuntimeEnvironment,
    name: string,
) => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await hre.getChainId();

    let assetAddress = constants[chainId].usdoAddress;
    if (
        !hre.ethers.utils.isAddress(assetAddress!) ||
        assetAddress == hre.ethers.constants.AddressZero
    ) {
        const deployedUsd0 = await deployments.get('USD0');
        assetAddress = deployedUsd0.address;
    }
    const marketData = constants[chainId][`market_${name}`];

    console.log(`\n Register ${name} Mixologist`);

    console.log(`\n     deploy ${name} - MxLiquidation`);
    await deploy('MXLiquidation', { from: deployer, log: true });
    await verify(hre, 'MXLiquidation', []);
    const mxLiquidation = await deployments.get('MXLiquidation');
    console.log(`     done`);

    console.log(`\n     deploy ${name} - MXLendingBorrowing`);
    await deploy('MXLendingBorrowing', { from: deployer, log: true });
    await verify(hre, 'MXLendingBorrowing', []);
    const mxLendingBorrowing = await deployments.get('MXLendingBorrowing');
    console.log(`     done`);

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

    console.log(`\n     register ${name} - MxLiquidation`);
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
    console.log(`     done`);
    console.log(`Done`);
    //No need to verify as the same contract type was previously verified

    return {
        contract: market,
        args: [],
        artifact: `Market${name}`,
    };
};

export const registerLiquidationQueue = async (
    hre: HardhatRuntimeEnvironment,
    name: string,
) => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await hre.getChainId();

    console.log(`\n Deploying ${name} LiquidationQueue`);

    await deploy('LiquidationQueue', { from: deployer, log: true });
    await verify(hre, 'LiquidationQueue', []);
    const deployedLQ = await deployments.get('LiquidationQueue');

    const deploymentsJson = readJSONFromFile();
    const marketData = _.find(
        deploymentsJson,
        (e) => e.name === `Market${name}`,
    );

    const stableToUsdoBidder = await deployments.get('CurveStableToUsdoBidder');

    const LQ_META = {
        activationTime: 600, // 10min
        minBidAmount: hre.ethers.BigNumber.from((1e18).toString()).mul(
            constants[chainId][`market_${name}`].minBidAmount,
        ),
        feeCollector: constants[chainId].feeCollector,
        bidExecutionSwapper: constants[chainId][`market_${name}`]
            .hasExecutionBidder
            ? constants[chainId][`market_${name}`].executionBidder
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
    console.log(`Done`);

    return {
        contract: deployedLQ,
        args: [],
        artifact: `LiquidationQueue${name}`,
    };
};

const saveJSONToFile = (data: any) => {
    const toSave = JSON.stringify(data, null, 2);
    fs.writeFileSync('./deployments.json', toSave);
};

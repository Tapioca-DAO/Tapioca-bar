import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import SDK from 'tapioca-sdk';
import { TContract } from 'tapioca-sdk/dist/shared';

let supportedChains: { [key: string]: any } = SDK.API.utils
    .getSupportedChains()
    .reduce(
        (sdkChains, chain) => ({
            ...sdkChains,
            [chain.name]: {
                ...chain,
            },
        }),
        {},
    );

export const constants: { [key: string]: any } = {
    //------------- TESTNETS --------------
    //goerli
    '5': {
        ...supportedChains['goerli'],
        wrappedNative: '0x0000000000000000000000000000000000000000',
        tapAddress: '0x306547aa4B4241D73ae1e7A5465D277d06C40cbC',
        feeTo: '0x40282d3Cf4890D9806BC1853e97a59C93D813653',
        feeVeTo: '0x40282d3Cf4890D9806BC1853e97a59C93D813653',
        feeCollector: '0x40282d3Cf4890D9806BC1853e97a59C93D813653', //liquidation queue
        uniV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        uniV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D ',
        uniV2PairHash:
            '0x68ddfd89d43db94fbd68a4abd2861ebcbfea56c0fd36334bbb95f0661c3171a2',
        crvStablePool: '0x803147a1f65f9b838e7be39bac1a4f51e6d29a18', //random address
        assets: [
            {
                name: 'USDC',
                address: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
            },
            {
                name: 'WETH',
                address: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
            },
        ],
        mx_ETH: {
            collateralAddress: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
            assetAddress: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
            oracleAddress: '0x08aa8c316b485a1a73356f662a9881d7b31bf427', //mock
            minBidAmount: 20,
            hasExecutionBidder: false,
            executionBidder: '0x0000000000000000000000000000000000000000',
        },
        minterMx_ETH: {
            collateralAddress: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
            oracleAddress: '0x08aa8c316b485a1a73356f662a9881d7b31bf427', //mock
        },
    },
    //mumbai
    '80001': {
        ...supportedChains['mumbai'],
    },
    //fantom tesnet
    '4002': {
        ...supportedChains['fantom_testnet'],
    },
    //optimism-goerli
    '420': {
        ...supportedChains['optimism_goerli'],
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
    },

    //------------- MAINNETS --------------
    //optimism
    '10': {
        ...supportedChains['optimism'],
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

export const deployOracleMock = async (
    hre: HardhatRuntimeEnvironment,
): Promise<TContract> => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const contracts: TContract[] = [];

    console.log('\nDeploying OracleMock');
    await deploy('OracleMock', { from: deployer, log: true });
    await verify(hre, 'OracleMock', []);
    const oracleMock = await deployments.get('OracleMock');
    contracts.push({
        name: 'OracleMock',
        address: oracleMock.address,
        meta: {},
    });
    console.log('Done');

    console.log(`\nSetting mock price`);
    const oracleContract = await hre.ethers.getContractAt(
        'OracleMock',
        oracleMock.address,
    );
    const __wethUsdcPrice = hre.ethers.utils.parseEther('1000');
    await oracleContract.set(__wethUsdcPrice);
    console.log('Done');

    return new Promise(async (resolve) =>
        resolve({
            name: 'OracleMock',
            address: oracleMock.address,
            meta: {},
        }),
    );
};
export const registerMinterMarket = async (
    hre: HardhatRuntimeEnvironment,
    name: string,
): Promise<TContract> => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await hre.getChainId();
    name = name.toUpperCase();

    const marketData = constants[chainId][`minterMx_${name.toUpperCase()}`];

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

    const usd0Deployed = await deployments.get('USD0');

    const collateralId = await yieldBox.ids(
        1,
        marketData.collateralAddress,
        hre.ethers.constants.AddressZero,
        0,
    );

    const collateralSwapPath = [
        marketData.collateralAddress,
        usd0Deployed.address,
    ];
    const tapSwapPath = [usd0Deployed.address, constants[chainId].tapAddress];

    const args = [
        beachBar.address,
        marketData.collateralAddress,
        collateralId,
        marketData.oracleAddress,
        tapSwapPath,
        collateralSwapPath,
    ];
    await deploy('MinterMixologist', {
        from: deployer,
        log: true,
        args,
    });
    await verify(hre, 'MinterMixologist', args);
    const deployedMinter = await deployments.get('MinterMixologist');
    console.log(
        `Done. Deployed on ${deployedMinter.address} with args ${args}`,
    );

    console.log(`\nSetting minter and burner role for USD0`);
    const usd0Contract = await hre.ethers.getContractAt(
        'USD0',
        usd0Deployed.address,
    );
    await usd0Contract.setMinterStatus(deployedMinter.address, true);
    await usd0Contract.setBurnerStatus(deployedMinter.address, true);
    console.log(`Done`);

    return new Promise(async (resolve) =>
        resolve({
            name: `minterMX_${name}`,
            address: deployedMinter.address,
            meta: { constructorArguments: args },
        }),
    );
};

export const registerMarket = async (
    hre: HardhatRuntimeEnvironment,
    name: string,
): Promise<TContract> => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await hre.getChainId();
    name = name.toUpperCase();

    const marketData = constants[chainId][`mx_${name}`];
    let assetAddress = marketData.assetAddress;

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
        deploymentsJson[chainId],
        (e) => e.name === 'MediumRiskMC',
    );

    console.log(`\nRegistering mx_${name}`);
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
    console.log('Done');
    //No need to verify as the same contract type was previously verified

    return new Promise(async (resolve) =>
        resolve({
            name: `mx_${name}`,
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

    name = name.toUpperCase();
    console.log(`\nDeploying ${name} LiquidationQueue`);

    const lqName = `lq_${name}`;
    await deploy('LiquidationQueue', {
        from: deployer,
        log: true,
    });
    await verify(hre, 'LiquidationQueue', []);
    const deployedLQ = await deployments.get('LiquidationQueue');
    console.log(`Done. Deployed on ${deployedLQ.address} with no arguments`);

    console.log(`\nInitializing ${name} LiquidationQueue`);
    const deploymentsJson = readJSONFromFile();
    const marketData: TContract = _.find(
        deploymentsJson[chainId],
        (e) => e.name === `mx_${name}`,
    );
    if (!marketData) {
        throw new Error(`[-] Market ${name} not found`);
    }
    const mixologistContract = await hre.ethers.getContractAt(
        'Mixologist',
        marketData.address,
    );
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
    const lqContract = await hre.ethers.getContractAt(
        'LiquidationQueue',
        deployedLQ.address,
    );
    await lqContract.init(LQ_META, mixologistContract.address);
    console.log(`Done`);

    console.log(`\nSetting ${name} LiquidationQueue on Mixologist`);
    const beachBarContract = await hre.ethers.getContractAt(
        'BeachBar',
        (
            await deployments.get('BeachBar')
        ).address,
    );

    const payload = mixologistContract.interface.encodeFunctionData(
        'setLiquidationQueue',
        [deployedLQ.address],
    );

    await (
        await beachBarContract.executeMixologistFn(
            [marketData.address],
            [payload],
            true,
        )
    ).wait();
    console.log('Done');

    return new Promise(async (resolve) =>
        resolve({
            name: lqName,
            address: deployedLQ.address,
            meta: { constructorArguments: LQ_META },
        }),
    );
};

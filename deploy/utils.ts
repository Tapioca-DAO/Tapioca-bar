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
        feeCollector: '0x40282d3Cf4890D9806BC1853e97a59C93D813653', //for liquidation queue
        uniV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        uniV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D ',
        uniV2PairHash:
            '0x68ddfd89d43db94fbd68a4abd2861ebcbfea56c0fd36334bbb95f0661c3171a2',
        crvStablePool: '0x803147a1f65f9b838e7be39bac1a4f51e6d29a18', //random address
        assets: [
            {
                name: 'USDC',
                address: '0x93FBA3AA589A1BC9120e0a8AA514fE8f839853F5', //'0x07865c6e87b9f70255377e024ace6630c1eaa37f',
            },
            {
                name: 'WETH',
                address: '0xe1E3E81B5b868cAB59a27Fa8D30C5225c5D55FC4', //'0xe1E3E81B5b868cAB59a27Fa8D30C5225c5D55FC4',
            },
            {
                name: 'WBTC',
                address: '0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05',
            },
            {
                name: 'TAP',
                address: '0x306547aa4B4241D73ae1e7A5465D277d06C40cbC',
            },
        ],
        sgl_ETH: {
            collateralAddress: '0xe1E3E81B5b868cAB59a27Fa8D30C5225c5D55FC4', //weth
            assetAddress: '0xf64364494212954c20B0762fcB1ebB6DC3e85441',
            oracleAddress: '0x08aa8c316b485a1a73356f662a9881d7b31bf427', //mock
            minBidAmount: 20,
            hasExecutionBidder: false,
            executionBidder: '0x0000000000000000000000000000000000000000',
        },
        sgl_BTC: {
            collateralAddress: '0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05', //weth
            assetAddress: '0xf64364494212954c20B0762fcB1ebB6DC3e85441',
            oracleAddress: '0x08aa8c316b485a1a73356f662a9881d7b31bf427', //mock
            minBidAmount: 20,
            hasExecutionBidder: false,
            executionBidder: '0x0000000000000000000000000000000000000000',
        },
        minterSGL_ETH: {
            collateralAddress: '0xe1E3E81B5b868cAB59a27Fa8D30C5225c5D55FC4',
            oracleAddress: '0x08aa8c316b485a1a73356f662a9881d7b31bf427', //mock
        },
    },
    //fantom_testnet
    '4002': {
        ...supportedChains['fantom_testnet'],
        wrappedNative: '0x0000000000000000000000000000000000000000',
        tapAddress: '0x4663B30afc168A6D1810fA6857a74d04bf632E54',
        feeTo: '0x40282d3Cf4890D9806BC1853e97a59C93D813653',
        feeVeTo: '0x40282d3Cf4890D9806BC1853e97a59C93D813653',
        feeCollector: '0x40282d3Cf4890D9806BC1853e97a59C93D813653', //for liquidation queue
        uniV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        uniV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D ',
        uniV2PairHash:
            '0x68ddfd89d43db94fbd68a4abd2861ebcbfea56c0fd36334bbb95f0661c3171a2',
        crvStablePool: '0x803147a1f65f9b838e7be39bac1a4f51e6d29a18', //random address
        assets: [
            {
                name: 'USDC',
                address: '0xb72e878a9c806f975c8e0e916afa6a328a764359', //'0xdEE65CaD824eD001a03215941FEb7c85D3E0aA94',
            },
            {
                name: 'WETH',
                address: '0xa3e6cCe9165Dd2C42dFA89e446d44520431d383d', //'0x84C7dD519Ea924bf1Cf6613f9127F26D7aB801D0',
            },
            {
                name: 'WBTC',
                address: '0x1e1fdb53451C5262A5ba449271789C7F551a9142',
            },
            {
                name: 'TAP',
                address: '0x4663B30afc168A6D1810fA6857a74d04bf632E54',
            },
        ],
        sgl_ETH: {
            collateralAddress: '0xa3e6cCe9165Dd2C42dFA89e446d44520431d383d', //weth
            assetAddress: '0xBD46Fa5C363E222c4cEf7589100F6486926C0D56',
            oracleAddress: '0x41dC15C448aB9141254EEd98F562a407E915d3b1', //mock
            minBidAmount: 20,
            hasExecutionBidder: false,
            executionBidder: '0x0000000000000000000000000000000000000000',
        },
        sgl_BTC: {
            collateralAddress: '0x1e1fdb53451C5262A5ba449271789C7F551a9142', //weth
            assetAddress: '0xBD46Fa5C363E222c4cEf7589100F6486926C0D56',
            oracleAddress: '0x08aa8c316b485a1a73356f662a9881d7b31bf427', //mock
            minBidAmount: 20,
            hasExecutionBidder: false,
            executionBidder: '0x0000000000000000000000000000000000000000',
        },
        minterSGL_ETH: {
            collateralAddress: '0xa3e6cCe9165Dd2C42dFA89e446d44520431d383d',
            oracleAddress: '0x41dC15C448aB9141254EEd98F562a407E915d3b1', //mock
        },
    },

    //------------- MAINNETS --------------
    //optimism
    '10': {
        ...supportedChains['optimism'],
        feeTo: '0x0000000000000000000000000000000000000000', //for Penrose
        feeVeTo: '0x0000000000000000000000000000000000000000', //for Penrose
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
        sgl_ETH: {
            collateralAddress: '0x0000000000000000000000000000000000000000', //tETH address
            oracleAddress: '0x0000000000000000000000000000000000000000', //tETH-USD0 oracle
            minBidAmount: 20, //min USD0 bid amount
            hasExecutionBidder: false, //if false, bidExecutionSwapper is not set
            executionBidder: '0x0000000000000000000000000000000000000000', //bidExecutionSwapper address
        },
        sgl_AVAX: {
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
    name: string,
): Promise<TContract> => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    name = name.toLowerCase();

    await deploy('OracleMockFactory', { from: deployer, log: true });
    await verify(hre, 'OracleMockFactory', []);
    const oracleFactory = await deployments.get('OracleMockFactory');
    const oracleFactoryContract = await hre.ethers.getContractAt(
        'OracleMockFactory',
        oracleFactory.address,
    );
    console.log('Done');

    console.log(`\nDeploying OracleMock for ${name}`);
    await oracleFactoryContract.deployOracle();
    const oracleMock = await oracleFactoryContract.last();
    await verify(hre, 'OracleMock', []);
    console.log('Done');

    console.log(`\nSetting mock price`);
    const oracleContract = await hre.ethers.getContractAt(
        'OracleMock',
        oracleMock.address,
    );
    const price =
        name == 'btc'
            ? hre.ethers.utils.parseEther('10000')
            : hre.ethers.utils.parseEther('1000');
    await oracleContract.set(price);
    console.log('Done');

    return new Promise(async (resolve) =>
        resolve({
            name: 'OracleMock',
            address: oracleMock.address,
            meta: {},
        }),
    );
};
export const registerBingBangMarket = async (
    hre: HardhatRuntimeEnvironment,
    name: string,
): Promise<TContract> => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await hre.getChainId();
    name = name.toUpperCase();

    const marketData = constants[chainId][`minterSGL_${name.toUpperCase()}`];

    let yieldBoxAddress = constants[chainId].yieldBoxAddress;
    if (
        !hre.ethers.utils.isAddress(yieldBoxAddress!) ||
        yieldBoxAddress == hre.ethers.constants.AddressZero
    ) {
        const deployedYieldBox = await deployments.get('YieldBox');
        yieldBoxAddress = deployedYieldBox.address;
    }

    const penrose = await hre.ethers.getContractAt(
        'Penrose',
        (
            await deployments.get('Penrose')
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

    const data = new hre.ethers.utils.AbiCoder().encode(
        ['address', 'address', 'uint256', 'address', 'address[]', 'address[]'],
        [
            penrose.address,
            marketData.collateralAddress,
            collateralId,
            marketData.oracleAddress,
            tapSwapPath,
            collateralSwapPath,
        ],
    );

    const deploymentsJson = readJSONFromFile();
    const masterContract = _.find(
        deploymentsJson[chainId],
        (e) => e.name === 'BingBangMediumRiskMC',
    );
    console.log(`\nRegistering bingBang_${name}`);
    await (
        await penrose.registerBingBang(masterContract.address, data, true)
    ).wait();

    await deploy('BingBang', {
        from: deployer,
        log: true,
    });
    const deployedMinter = await hre.ethers.getContractAt(
        'BingBang',
        await yieldBox.clonesOf(
            masterContract.address,
            (await yieldBox.clonesOfCount(masterContract.address)).sub(1),
        ),
    );
    console.log('Done');
    //No need to verify as the same contract type was previously verified

    console.log(`\nSetting minter and burner role for USD0`);
    const usd0Contract = await hre.ethers.getContractAt(
        'USD0',
        usd0Deployed.address,
    );
    await (
        await usd0Contract.setMinterStatus(deployedMinter.address, true)
    ).wait();
    await (
        await usd0Contract.setBurnerStatus(deployedMinter.address, true)
    ).wait();
    console.log(`Done`);

    return new Promise(async (resolve) =>
        resolve({
            name: `bingBang_${name}`,
            address: deployedMinter.address,
            meta: {},
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

    const marketData = constants[chainId][`sgl_${name}`];
    let assetAddress = marketData.assetAddress;

    let yieldBoxAddress = constants[chainId].yieldBoxAddress;
    if (
        !hre.ethers.utils.isAddress(yieldBoxAddress!) ||
        yieldBoxAddress == hre.ethers.constants.AddressZero
    ) {
        const deployedYieldBox = await deployments.get('YieldBox');
        yieldBoxAddress = deployedYieldBox.address;
    }

    const penrose = await hre.ethers.getContractAt(
        'Penrose',
        (
            await deployments.get('Penrose')
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

    const sglLiquidation = await deployments.get('SGLLiquidation');
    const sglLendingBorrowing = await deployments.get('SGLLendingBorrowing');

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
            sglLiquidation.address,
            sglLendingBorrowing.address,
            penrose.address,
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

    console.log(`\nRegistering sgl_${name}`);
    await (
        await penrose.registerSingularity(masterContract.address, data, true)
    ).wait();

    const market = await hre.ethers.getContractAt(
        'Singularity',
        await yieldBox.clonesOf(
            masterContract.address,
            (await yieldBox.clonesOfCount(masterContract.address)).sub(1),
        ),
    );
    console.log('Done');
    //No need to verify as the same contract type was previously verified

    return new Promise(async (resolve) =>
        resolve({
            name: `sgl_${name}`,
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
        (e) => e.name === `sgl_${name}`,
    );
    if (!marketData) {
        throw new Error(`[-] Market ${name} not found`);
    }
    const singularityContract = await hre.ethers.getContractAt(
        'Singularity',
        marketData.address,
    );
    const stableToUsdoBidder = await deployments.get('CurveStableToUsdoBidder');
    const LQ_META = {
        activationTime: 600, // 10min
        minBidAmount: hre.ethers.BigNumber.from((1e18).toString()).mul(
            constants[chainId][`sgl_${name}`].minBidAmount,
        ),
        feeCollector: constants[chainId].feeCollector,
        bidExecutionSwapper: constants[chainId][`sgl_${name}`]
            .hasExecutionBidder
            ? constants[chainId][`sgl_${name}`].executionBidder
            : hre.ethers.constants.AddressZero,
        usdoSwapper: stableToUsdoBidder.address,
    };

    const lqContract = await hre.ethers.getContractAt(
        'LiquidationQueue',
        deployedLQ.address,
    );
    await (await lqContract.init(LQ_META, singularityContract.address)).wait();
    console.log(`Done`);

    console.log(`\nSetting ${name} LiquidationQueue on Singularity`);
    const penroseContract = await hre.ethers.getContractAt(
        'Penrose',
        (
            await deployments.get('Penrose')
        ).address,
    );

    const payload = singularityContract.interface.encodeFunctionData(
        'setLiquidationQueue',
        [deployedLQ.address],
    );

    await (
        await penroseContract.executeMarketFn(
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

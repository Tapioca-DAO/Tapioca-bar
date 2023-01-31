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
    //arbitrum_goerli
    '421613': {
        ...supportedChains['arbitrum_goerli'],
        wrappedNative: '0x0000000000000000000000000000000000000000',
        tapAddress: '0xC27F48670cDae9Eee92156209642d47Ea1B85a35',
        feeTo: '0x40282d3Cf4890D9806BC1853e97a59C93D813653',
        feeCollector: '0x40282d3Cf4890D9806BC1853e97a59C93D813653', //for liquidation queue
        uniV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        uniV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D ',
        uniV2PairHash:
            '0x68ddfd89d43db94fbd68a4abd2861ebcbfea56c0fd36334bbb95f0661c3171a2',
        crvStablePool: '0x803147a1f65f9b838e7be39bac1a4f51e6d29a18', //random address
        wethAddress: '0xd428690148436dA9c7422698eEe15F51C8cec871',
        assets: [
            {
                name: 'tAvax',
                address: '0xef0871E0e8C3320f5Cf8c0051EC856b9c083660f',
            },
            {
                name: 'tWETH',
                address: '0xd5d5d2fed1eCb5Dea28Fe81fB575c9C241448D71',
            },
            {
                name: 'tMATIC',
                address: '0x48d95D182D33990910DC39868Da6FcA59182626c',
            },
            {
                name: 'TAP',
                address: '0xC27F48670cDae9Eee92156209642d47Ea1B85a35',
            },
        ],
        sgl_TWETH: {
            collateralAddress: '0xd5d5d2fed1eCb5Dea28Fe81fB575c9C241448D71', //tWeth
            assetAddress: '0x006dcF07511D332299f83056731Cb15f0Aeb2F2B',
            oracleAddress: '0xB63815242ec16F1D8F83A4dEec844296A546cA8d', //mock
            minBidAmount: 20,
            hasExecutionBidder: false,
            executionBidder: '0x0000000000000000000000000000000000000000',
        },

        sgl_TAVAX: {
            collateralAddress: '0xef0871E0e8C3320f5Cf8c0051EC856b9c083660f', //tAvax
            assetAddress: '0x006dcF07511D332299f83056731Cb15f0Aeb2F2B',
            oracleAddress: '0x707dC804728495e14F58c22a38dE17b5c7591323', //mock
            minBidAmount: 20,
            hasExecutionBidder: false,
            executionBidder: '0x0000000000000000000000000000000000000000',
        },
        sgl_TMATIC: {
            collateralAddress: '0x48d95D182D33990910DC39868Da6FcA59182626c', //tMatic
            assetAddress: '0x006dcF07511D332299f83056731Cb15f0Aeb2F2B',
            oracleAddress: '0x56E626a05193B1576dCc4CFE4d89FfEC6dD115C8', //mock
            minBidAmount: 20,
            hasExecutionBidder: false,
            executionBidder: '0x0000000000000000000000000000000000000000',
        },
    },
    //fuji
    '43113': {
        ...supportedChains['fuji_avalanche'],
        wrappedNative: '0x0000000000000000000000000000000000000000',
        tapAddress: '0xBEb739E11742D7015B807012894bDA8b0fe6b141',
        feeTo: '0x40282d3Cf4890D9806BC1853e97a59C93D813653',
        feeCollector: '0x40282d3Cf4890D9806BC1853e97a59C93D813653', //for liquidation queue
        uniV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        uniV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D ',
        uniV2PairHash:
            '0x68ddfd89d43db94fbd68a4abd2861ebcbfea56c0fd36334bbb95f0661c3171a2',
        crvStablePool: '0x803147a1f65f9b838e7be39bac1a4f51e6d29a18', //random address
        wethAddress: '0xc5A3f63c28F625D0496804e169C21a280B2d10B9',
        assets: [
            {
                name: 'tAvax',
                address: '0x28D691380D2d8C86f6fdD2e49123C1DA9fa33b32',
            },
            {
                name: 'tWETH',
                address: '0x4ee2C3e02D9c47951a6a56bE803030D70F3dbfb7',
            },
            {
                name: 'tMATIC',
                address: '0xe82f613C2B46D3fD51bA2A6Bc04a4dB65413b2a1',
            },
            {
                name: 'TAP',
                address: '0xBEb739E11742D7015B807012894bDA8b0fe6b141',
            },
        ],
    },
    //mumbai
    '80001': {
        ...supportedChains['mumbai'],
        wrappedNative: '0x0000000000000000000000000000000000000000',
        tapAddress: '0x78Ab2649fd6682e5c3CCFABb87ed6FcED0843cE4',
        feeTo: '0x40282d3Cf4890D9806BC1853e97a59C93D813653',
        feeCollector: '0x40282d3Cf4890D9806BC1853e97a59C93D813653', //for liquidation queue
        uniV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        uniV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D ',
        uniV2PairHash:
            '0x68ddfd89d43db94fbd68a4abd2861ebcbfea56c0fd36334bbb95f0661c3171a2',
        crvStablePool: '0x803147a1f65f9b838e7be39bac1a4f51e6d29a18', //random address
        wethAddress: '0x766d7631F6aE1E37c87dc10c8d4D9272e6be6Fc8',
        assets: [
            {
                name: 'tAvax',
                address: '0x74FC744146cb0067AC34DF10c6e7bcc050439D37',
            },
            {
                name: 'tWETH',
                address: '0xAa7e77fb38C8B5df58cba3a49227dAb6ee5f18Cb',
            },
            {
                name: 'tMATIC',
                address: '0x18BC2Be450e04EBB72A150dfa9a268F60302215c',
            },
            {
                name: 'TAP',
                address: '0x78Ab2649fd6682e5c3CCFABb87ed6FcED0843cE4',
            },
        ],
    },
    //goerli
    '5': {
        ...supportedChains['goerli'],
        wrappedNative: '0x0000000000000000000000000000000000000000',
        tapAddress: '0xdb7677D723ED0B12E7A3945A4Ae234d4EFa4b91e',
        feeTo: '0x40282d3Cf4890D9806BC1853e97a59C93D813653',
        feeCollector: '0x40282d3Cf4890D9806BC1853e97a59C93D813653', //for liquidation queue
        uniV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        uniV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D ',
        uniV2PairHash:
            '0x68ddfd89d43db94fbd68a4abd2861ebcbfea56c0fd36334bbb95f0661c3171a2',
        crvStablePool: '0x803147a1f65f9b838e7be39bac1a4f51e6d29a18', //random address
        wethAddress: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
        assets: [
            {
                name: 'tUSDC',
                address: '0x8AE919C76297a20795Fa69DE5DD713248abd6EfE',
            },
            {
                name: 'tWETH',
                address: '0xE40CE28B4353ad276Ac9cccb87787F7dfA2984d7',
            },
            {
                name: 'tWBTC',
                address: '0x2E50122Fa37d294dF52030E2F602b4c7F73cD38F',
            },
            {
                name: 'TAP',
                address: '0xdb7677D723ED0B12E7A3945A4Ae234d4EFa4b91e',
            },
        ],
        sgl_ETH: {
            collateralAddress: '0xE40CE28B4353ad276Ac9cccb87787F7dfA2984d7', //tWeth
            assetAddress: '0xf64364494212954c20B0762fcB1ebB6DC3e85441',
            oracleAddress: '0x08aa8c316b485a1a73356f662a9881d7b31bf427', //mock
            minBidAmount: 20,
            hasExecutionBidder: false,
            executionBidder: '0x0000000000000000000000000000000000000000',
        },
        minterSGL_ETH: {
            collateralAddress: '0xE40CE28B4353ad276Ac9cccb87787F7dfA2984d7',
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

    let deployed = await deployments.get(artifact);
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
    mockFactory: string,
): Promise<TContract> => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    name = name.toLowerCase();

    console.log(`\nDeploying OracleMockFactory for ${name}`);
    if (!hre.ethers.utils.isAddress(mockFactory)) {
        const contracts: TContract[] = [];

        await deploy('OracleMockFactory', { from: deployer, log: true });
        await verify(hre, 'OracleMockFactory', []);
        const oracleFactory = await deployments.get('OracleMockFactory');
        mockFactory = oracleFactory.address;

        contracts.push({
            name: 'Penrose',
            address: oracleFactory.address,
            meta: {},
        });
        const chainId = await hre.getChainId();
        await updateDeployments(contracts, chainId);
        console.log(`Deployed`);
    }
    const oracleFactoryContract = await hre.ethers.getContractAt(
        'OracleMockFactory',
        mockFactory,
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
        oracleMock,
    );
    const price =
        name == 'btc'
            ? hre.ethers.utils.parseEther('10000')
            : hre.ethers.utils.parseEther('1000');
    await oracleContract.set(price);
    console.log('Done');

    return new Promise(async (resolve) =>
        resolve({
            name: `OracleMock-${name}`,
            address: oracleMock,
            meta: {},
        }),
    );
};

export const registerVesting = async (
    hre: HardhatRuntimeEnvironment,
    token: string,
    cliff: string,
    duration: string,
): Promise<TContract> => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log('\n Deploying Vesting');
    const args = [token, cliff, duration];
    await deploy('Vesting', {
        from: deployer,
        log: true,
        args,
    });
    await verify(hre, 'Vesting', args);
    const vestingContract = await deployments.get('Vesting');
    console.log('Done');

    return new Promise(async (resolve) =>
        resolve({
            name: 'Vesting',
            address: vestingContract.address,
            meta: { constructorArguments: args },
        }),
    );
};

export const registerBigBangMarket = async (
    hre: HardhatRuntimeEnvironment,
    name: string,
    exchangeRatePrecision: string,
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

    const data = new hre.ethers.utils.AbiCoder().encode(
        ['address', 'address', 'uint256', 'address', 'uint256'],
        [
            penrose.address,
            marketData.collateralAddress,
            collateralId,
            marketData.oracleAddress,
            exchangeRatePrecision,
        ],
    );

    const deploymentsJson = readJSONFromFile();
    const masterContract = _.find(
        deploymentsJson[chainId],
        (e) => e.name === 'BigBangMediumRiskMC',
    );
    console.log(`\nRegistering bigBang_${name}`);
    await (
        await penrose.registerBigBang(masterContract.address, data, true)
    ).wait();

    await deploy('BigBang', {
        from: deployer,
        log: true,
    });
    const deployedMinter = await hre.ethers.getContractAt(
        'BigBang',
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
            name: `bigBang_${name}`,
            address: deployedMinter.address,
            meta: {},
        }),
    );
};

export const registerMarket = async (
    hre: HardhatRuntimeEnvironment,
    name: string,
    exchangeRatePrecision: string,
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
            'uint256',
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
            exchangeRatePrecision,
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

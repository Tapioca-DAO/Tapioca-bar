import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import SDK from 'tapioca-sdk';
import { TContract } from 'tapioca-sdk/dist/shared';

const supportedChains: { [key: string]: any } = SDK.API.utils
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
    //fantom_testnet
    '4002': {
        ...supportedChains['fantom_testnet'],
        isMainChain: false,
        connectedLzIds: [10109, 10143, 10106],
        wrappedNative: '0x0000000000000000000000000000000000000000',
        tapAddress: '0xFCdE8366705e8A9c1eDE4C56D716c9e7564CE50D',
        feeTo: '0x40282d3Cf4890D9806BC1853e97a59C93D813653',
        feeCollector: '0x40282d3Cf4890D9806BC1853e97a59C93D813653', //for liquidation queue
        uniV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        uniV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D ',
        uniV2PairHash:
            '0x68ddfd89d43db94fbd68a4abd2861ebcbfea56c0fd36334bbb95f0661c3171a2',
        crvStablePool: '0x803147a1f65f9b838e7be39bac1a4f51e6d29a18', //random address
        wethAddress: '0x95c7E83D6d44F3d81cb60FB4e5472dC5C0415571',
        assets: [
            {
                name: 'tAvax',
                address: '0x177b341C0E1b36f9D4fAC0F90B1ebF3a20480834',
                strategy: '0xF191A3c62854C5F328C7550575f559DA9898f663',
            },
            {
                name: 'tWETH',
                address: '0x5Ba1CF78AAEA752BEC33c2036B1E315C881d8E49',
                strategy: '0x6a735Ae4B3beCa4BbE4b4fD1BD11D31dB9CE66bf',
            },
            {
                name: 'tMATIC',
                address: '0x5916f519dfb4b80a3aad07e0530b93605c35c636',
                strategy: '0xeB8611F1bBA1D29C3E880C3535d89B15fC1e1414',
            },
            {
                name: 'TAP',
                address: '0xFCdE8366705e8A9c1eDE4C56D716c9e7564CE50D',
                strategy: '0xeadA6AA17da83a206510F6818cBaF2B1bb1cD952',
            },
            {
                name: 'tFTM',
                address: '0x9C574C71eCabc7aEf19593A595fb9f8Aa6a78bB0',
                strategy: '0xcfa9Fbc204a5724fC9f5DCD3B190e2760B9955F1',
            },
        ],
    },
    //arbitrum_goerli
    '421613': {
        ...supportedChains['arbitrum_goerli'],
        isMainChain: true,
        connectedLzIds: [10109, 10106, 10112],
        wrappedNative: '0x0000000000000000000000000000000000000000',
        tapAddress: '0x31dA039c8Cf6eDC95fAFECb7B3E70a308128b7E0',
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
                address: '0xd37E276907e76bF25eBaDA04fB2dCe67c8BE5188',
                strategy: '0xbD5c3Af44fc4C6C3dbAa500DbE77aC4049194058',
            },
            {
                name: 'tWETH',
                address: '0xc0106C090153F651c5E6e12249412b9e51f8d49d',
                strategy: '0xDA535a926560de4F6130e878Ea0BD81F076e3b74',
            },
            {
                name: 'tMATIC',
                address: '0xd429a8F683Aa8D43Aa3CBdDCa93956CBc44c4242',
                strategy: '0xcCD1F3Fb54fcB421Ed321e916560877890363f4a',
            },
            {
                name: 'TAP',
                address: '0x31dA039c8Cf6eDC95fAFECb7B3E70a308128b7E0',
                strategy: '0xEc473BCA9d74866e055C1761994cdb5139f778c2',
            },
            {
                name: 'tFTM',
                address: '0x4ba186b07cf3C5C4e2aB967d0Daa996dc83Ce30E',
                strategy: '0x9A50a3D30fA5dD1D5cd08d06e2B70Da5382B29f6',
            },
        ],
        sgl_TWETH: {
            collateralAddress: '0xc0106C090153F651c5E6e12249412b9e51f8d49d', //tWeth
            assetAddress: '0xAF933E0E75E0576511e17b173cc6e3D0a09DB764',
            oracleAddress: '0xB63815242ec16F1D8F83A4dEec844296A546cA8d', //mock
            minBidAmount: 20,
            hasExecutionBidder: false,
            executionBidder: '0x0000000000000000000000000000000000000000',
            strategyAddress: '0xDA535a926560de4F6130e878Ea0BD81F076e3b74',
        },

        sgl_TAVAX: {
            collateralAddress: '0xd37E276907e76bF25eBaDA04fB2dCe67c8BE5188', //tAvax
            assetAddress: '0xAF933E0E75E0576511e17b173cc6e3D0a09DB764',
            oracleAddress: '0x707dC804728495e14F58c22a38dE17b5c7591323', //mock
            minBidAmount: 20,
            hasExecutionBidder: false,
            executionBidder: '0x0000000000000000000000000000000000000000',
            strategyAddress: '0xbD5c3Af44fc4C6C3dbAa500DbE77aC4049194058',
        },
        sgl_TMATIC: {
            collateralAddress: '0xd429a8F683Aa8D43Aa3CBdDCa93956CBc44c4242', //tMatic
            assetAddress: '0xAF933E0E75E0576511e17b173cc6e3D0a09DB764',
            oracleAddress: '0x56E626a05193B1576dCc4CFE4d89FfEC6dD115C8', //mock
            minBidAmount: 20,
            hasExecutionBidder: false,
            executionBidder: '0x0000000000000000000000000000000000000000',
            strategyAddress: '0xcCD1F3Fb54fcB421Ed321e916560877890363f4a',
        },
        sgl_TFTM: {
            collateralAddress: '0x4ba186b07cf3C5C4e2aB967d0Daa996dc83Ce30E', //tFTM
            assetAddress: '0xAF933E0E75E0576511e17b173cc6e3D0a09DB764',
            oracleAddress: '0xf8dbb74e1c371edf37fa652514d1e4aa3c517156', //mock
            minBidAmount: 20,
            hasExecutionBidder: false,
            executionBidder: '0x0000000000000000000000000000000000000000',
            strategyAddress: '0x9A50a3D30fA5dD1D5cd08d06e2B70Da5382B29f6',
        },
    },
    //fuji
    '43113': {
        ...supportedChains['fuji_avalanche'],
        isMainChain: false,
        connectedLzIds: [10109, 10143, 10112],
        wrappedNative: '0x0000000000000000000000000000000000000000',
        tapAddress: '0xc6B03Ba05Fb5E693D8b3533aa676FB4AFDd7DDc7',
        feeTo: '0x40282d3Cf4890D9806BC1853e97a59C93D813653',
        feeCollector: '0x40282d3Cf4890D9806BC1853e97a59C93D813653', //for liquidation queue
        uniV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        uniV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D ',
        uniV2PairHash:
            '0x68ddfd89d43db94fbd68a4abd2861ebcbfea56c0fd36334bbb95f0661c3171a2',
        crvStablePool: '0x803147a1f65f9b838e7be39bac1a4f51e6d29a18', //random address
        wethAddress: '0x71E4364611BDCc8865c61f2e8F979644Ba0ec7f7',
        assets: [
            {
                name: 'tAvax',
                address: '0x05C0a8C53BED62edf009b8B870fAC065B4cc3533',
                strategy: '0x3020Fd33BAB76De7057F637ac3A314dd5118FeaA',
            },
            {
                name: 'tWETH',
                address: '0x71dDd5ec9815740529D62726Adc50EB84a3A4e1a',
                strategy: '0xa33e61894D266bf602d71F33fe741616c1F83A9d',
            },
            {
                name: 'tMATIC',
                address: '0x628570D3768e7424dd7Ca4671846D1b67c82E141',
                strategy: '0xdCf35763e643Adb8Db5D502F7b8246737faDac7f',
            },
            {
                name: 'TAP',
                address: '0xc6B03Ba05Fb5E693D8b3533aa676FB4AFDd7DDc7',
                strategy: '0xC4007F1A61A76A241d01f141112d805eBF07E640',
            },
            {
                name: 'tFTM',
                address: '0x33e1eFe92dBca2d45fe131ab3a1613A169696924',
                strategy: '0x4bdE7F9f62421082866996355654c11F883fDbb1',
            },
        ],
    },
    //mumbai
    '80001': {
        ...supportedChains['mumbai'],
        connectedLzIds: [10106, 10143, 10112],
        isMainChain: false,
        wrappedNative: '0x0000000000000000000000000000000000000000',
        tapAddress: '0xd621150f4BE5b6E537f61dB2A59499F648F1B6e2',
        feeTo: '0x40282d3Cf4890D9806BC1853e97a59C93D813653',
        feeCollector: '0x40282d3Cf4890D9806BC1853e97a59C93D813653', //for liquidation queue
        uniV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        uniV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D ',
        uniV2PairHash:
            '0x68ddfd89d43db94fbd68a4abd2861ebcbfea56c0fd36334bbb95f0661c3171a2',
        crvStablePool: '0x803147a1f65f9b838e7be39bac1a4f51e6d29a18', //random address
        wethAddress: '0x5d405f701fb11f749e2D8D5D73A70181Ef25d457',
        assets: [
            {
                name: 'tAvax',
                address: '0x556029CB9c74B07bC34abED41eaA424159463E50',
                strategy: '0xC6Dd56Af72c0E74e4f0dD35DC6c68A95A4b0c0A5',
            },
            {
                name: 'tWETH',
                address: '0x4172056FDC344b8Fd38bfDe590a7eDdF32cD1d55',
                strategy: '0x463f52c8D711ecE2b423d41cfEb00b88195C7216',
            },
            {
                name: 'tMATIC',
                address: '0xa1BD6C0B6b35209B3710cA6Ab306736e06C1fe9c',
                strategy: '0x85f6A39aaCfEA335B83F9695Ff2F30C09214DD32',
            },
            {
                name: 'TAP',
                address: '0xd621150f4BE5b6E537f61dB2A59499F648F1B6e2',
                strategy: '0xc5A3f63c28F625D0496804e169C21a280B2d10B9',
            },
            {
                name: 'tFTM',
                address: '0x8688820A09b5796840c4570747E7E0064B87d3DF',
                strategy: '0x0bfB41C464ee1626D41fb5D096baf6d7b0c0F76F',
            },
        ],
    },
    //goerli
    '5': {
        ...supportedChains['goerli'],
        isMainChain: false,
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

    //------------- MAINNETS --------------
    //optimism
    '10': {
        ...supportedChains['optimism'],
        isMainChain: false,
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

export const deployEmptyStrategy = async (
    hre: HardhatRuntimeEnvironment,
    yieldbox: string,
    token: string,
): Promise<TContract> => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log('starting');
    const tokenContract = await hre.ethers.getContractAt(
        'IERC20Metadata',
        token,
    );
    const name = await tokenContract.name();
    const symbol = await tokenContract.symbol();

    console.log(`\nDeploying ERC20WithoutStrategy for ${name}`);

    const args = [yieldbox, token];
    await deploy('ERC20WithoutStrategy', {
        from: process.env.PUBLIC_KEY!,
        log: true,
        args,
    });
    await verify(hre, 'ERC20WithoutStrategy', args);
    const deployedNoStrategy = await deployments.get('ERC20WithoutStrategy');

    return new Promise(async (resolve) =>
        resolve({
            name: `ERC20WithoutStrategy-${symbol}`,
            address: deployedNoStrategy.address,
            meta: { constructorArguments: args },
        }),
    );
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
        console.log('Deployed');
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

    console.log('\nSetting mock price');
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
        await penrose.clonesOf(
            masterContract.address,
            (await penrose.clonesOfCount(masterContract.address)).sub(1),
        ),
    );
    console.log('Done');
    //No need to verify as the same contract type was previously verified

    console.log('\nSetting minter and burner role for USD0');
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
    console.log('Done');

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
    const assetAddress = marketData.assetAddress;

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

    const collateralStrategyAddress = marketData.strategyAddress;
    if (collateralStrategyAddress == hre.ethers.constants.AddressZero) {
        throw 'Collateral strategy is not valid';
    }
    const assetStrategyAddress = await penrose.emptyStrategies(assetAddress);
    if (assetStrategyAddress == hre.ethers.constants.AddressZero) {
        throw 'Asset strategy is not valid';
    }

    const assetId = await yieldBox.ids(
        1,
        assetAddress,
        assetStrategyAddress,
        0,
    );
    const collateralId = await yieldBox.ids(
        1,
        marketData.collateralAddress,
        collateralStrategyAddress,
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
        await penrose.clonesOf(
            masterContract.address,
            (await penrose.clonesOfCount(masterContract.address)).sub(1),
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
    console.log('Done');

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

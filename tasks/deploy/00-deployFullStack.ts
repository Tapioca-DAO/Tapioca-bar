import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { Multicall3 } from 'tapioca-sdk/dist/typechain/tapioca-periphery';
import { buildYieldBox } from '../deployBuilds/00-buildYieldBox';
import { buildPenrose } from '../deployBuilds/01-buildPenrose';
import { buildMasterContracts } from '../deployBuilds/02-buildMasterContracts';
import { buildMultiSwapper } from '../deployBuilds/04-buildMultiSwapper';
import { buildUSD0 } from '../deployBuilds/06-buildUSDO';
import { buildStableToUSD0Bidder } from '../deployBuilds/07-buildStableToUSD0Bidder';
import { buildSingularityModules } from '../deployBuilds/08-buildSingularityModules';
import { buildPenroseSetup } from '../setups/01-buildPenroseSetup';
import { buildMasterContractsSetup } from '../setups/02-buildMasterContractsSetup';
import { loadVM } from '../utils';
import SDK from 'tapioca-sdk';
import { buildUSDOModules } from '../deployBuilds/11-buildUSDOModules';

// hh deployFullStack --network goerli
export const deployFullStack__task = async (
    {},
    hre: HardhatRuntimeEnvironment,
) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const signer = (await hre.ethers.getSigners())[0];
    const VM = await loadVM(hre, tag, true);

    const chainInfo = hre.SDK.utils.getChainBy(
        'chainId',
        await hre.getChainId(),
    );
    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    let tapToken = hre.SDK.db
        .loadGlobalDeployment(tag, 'tap-token', chainInfo.chainId)
        .find((e) => e.name === 'TapOFT');

    let weth = hre.SDK.db
        .loadGlobalDeployment(tag, 'tapioca-mocks', chainInfo.chainId)
        .find((e) => e.name.startsWith('WETHMock'));

    if (!weth) {
        //try to take it again from local deployment
        weth = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name.startsWith('WETHMock'));
    }
    if (!tapToken) {
        //try to take it again from local deployment
        tapToken = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name.startsWith('TapOFT'));
    }

    if (!tapToken || !weth) {
        throw new Error(`[-] Token not found: ${tapToken}, ${weth}`);
    }

    // const test = await buildTest(hre);
    // VM.add(test);

    // 00 - Deploy YieldBox
    const [ybURI, yieldBox] = await buildYieldBox(hre, weth.address);
    VM.add(ybURI).add(yieldBox);

    // 01 - Penrose
    const penrose = await buildPenrose(
        hre,
        tapToken.address,
        weth.address,
        signer.address,
    );
    VM.add(penrose);

    // 02 - Master contracts
    const [sgl, bb] = await buildMasterContracts(hre);
    VM.add(sgl).add(bb);

    // 04 - MultiSwapper
    const multiSwapper = await buildMultiSwapper(
        hre,
        constants[chainInfo.chainId].uniV2Router,
        constants[chainInfo.chainId].uniV2Factory,
    );
    VM.add(multiSwapper);

    // 05 - SingularityModules
    const [liq, borrow, collateral, leverage] = await buildSingularityModules(
        hre,
    );
    VM.add(liq).add(borrow).add(collateral).add(leverage);

    // 06 USDO
    const [leverageModule, marketModule, optionsModule] =
        await buildUSDOModules(chainInfo.address, hre);
    VM.add(leverageModule).add(marketModule).add(optionsModule);

    const usdo = await buildUSD0(hre, chainInfo.address, signer.address);
    VM.add(usdo);

    // 07 - CurveSwapper-buildStableToUSD0Bidder
    const [curveSwapper, curveStableToUsd0] = await buildStableToUSD0Bidder(
        hre,
        constants[chainInfo.chainId].crvStablePool,
    );
    VM.add(curveSwapper).add(curveStableToUsd0);

    // Add and execute
    await VM.execute(3, false);
    VM.save();
    const { wantToVerify } = await inquirer.prompt({
        type: 'confirm',
        name: 'wantToVerify',
        message: 'Do you want to verify the contracts?',
    });
    if (wantToVerify) {
        try {
            await VM.verify();
        } catch {
            console.log('[-] Verification failed');
        }
    }

    // After deployment setup
    const vmList = VM.list();

    const multiCall = await VM.getMulticall();

    const calls: Multicall3.CallStruct[] = [
        ...(await buildPenroseSetup(hre, vmList, signer.address)),
        ...(await buildMasterContractsSetup(hre, vmList)),
    ];

    // Execute
    console.log('[+] After deployment setup calls number: ', calls.length);
    if (calls.length > 0) {
        try {
            const tx = await (await multiCall.multicall(calls)).wait(1);
            console.log(
                '[+] After deployment setup multicall Tx: ',
                tx.transactionHash,
            );
        } catch (e) {
            // If one fail, try them one by one
            for (const call of calls) {
                await (
                    await signer.sendTransaction({
                        data: call.callData,
                        to: call.target,
                    })
                ).wait();
            }
        }
    }

    console.log('[+] Stack deployed! 🎉');
};

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

const constants: { [key: string]: any } = {
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
        uniV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
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
        uniV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
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
        uniV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
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
        uniV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
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
    //bsc_testnet
    '97': {
        ...supportedChains['bsc_testnet'],
        isMainChain: false,
        feeTo: '0x40282d3Cf4890D9806BC1853e97a59C93D813653',
        feeCollector: '0x40282d3Cf4890D9806BC1853e97a59C93D813653', //for liquidation queue
        uniV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        uniV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        uniV2PairHash:
            '0x68ddfd89d43db94fbd68a4abd2861ebcbfea56c0fd36334bbb95f0661c3171a2',
        crvStablePool: '0x803147a1f65f9b838e7be39bac1a4f51e6d29a18', //random address
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
        usdoAddress: '0x0000000000000000000000000000000000000000', //USDO address
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
            oracleAddress: '0x0000000000000000000000000000000000000000', //tETH-USDO oracle
            minBidAmount: 20, //min USDO bid amount
            hasExecutionBidder: false, //if false, bidExecutionSwapper is not set
            executionBidder: '0x0000000000000000000000000000000000000000', //bidExecutionSwapper address
        },
        sgl_AVAX: {
            collateralAddress: '0x0000000000000000000000000000000000000000', //tAVAX address
            oracleAddress: '0x0000000000000000000000000000000000000000', //tAVAX-USDO oracle
            minBidAmount: 20, //min USDO bid amount
            hasExecutionBidder: false, //if false, bidExecutionSwapper is not set
            executionBidder: '0x0000000000000000000000000000000000000000', //bidExecutionSwapper address
        },
    },
};

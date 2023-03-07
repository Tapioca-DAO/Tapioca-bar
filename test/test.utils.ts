import { time } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber, BigNumberish } from 'ethers';
import hre, { ethers, getChainId } from 'hardhat';
import { any } from 'hardhat/internal/core/params/argumentTypes';
import {
    Penrose,
    CurveStableToUsdoBidder,
    ERC20Mock,
    Singularity,
    OracleMock,
    USD0,
    WETH9Mock,
    YieldBox,
} from '../typechain';
import { MultiSwapper } from '../typechain/MultiSwapper';
import { UniswapV2Factory } from '../typechain/UniswapV2Factory';
import { UniswapV2Router02 } from '../typechain/UniswapV2Router02';

ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR);

const verifyEtherscanQueue: { address: string; args: any[] }[] = [];

async function resetVM() {
    await ethers.provider.send('hardhat_reset', []);
}

export function BN(n: BigNumberish) {
    return ethers.BigNumber.from(n.toString());
}

const __wethUsdcPrice = BN(1000).mul((1e18).toString());
const __wbtcUsdcPrice = BN(10000).mul((1e18).toString());

export async function setBalance(addr: string, ether: number) {
    await ethers.provider.send('hardhat_setBalance', [
        addr,
        ethers.utils.hexStripZeros(ethers.utils.parseEther(String(ether))._hex),
    ]);
}
async function registerUsd0Contract(
    chainId: string,
    yieldBox: string,
    staging?: boolean,
) {
    const lzEndpointContract = await (
        await ethers.getContractFactory('LZEndpointMock')
    ).deploy(chainId, { gasPrice: gasPrice });
    await lzEndpointContract.deployed();
    log(
        `Deployed LZEndpointMock ${lzEndpointContract.address} with args [${chainId}]`,
        staging,
    );
    await verifyEtherscan(lzEndpointContract.address, [chainId], staging);

    const usd0 = await (
        await ethers.getContractFactory('USD0')
    ).deploy(lzEndpointContract.address, yieldBox, { gasPrice: gasPrice });
    await usd0.deployed();
    log(
        `Deployed UDS0 ${usd0.address} with args [${lzEndpointContract.address},${yieldBox}]`,
        staging,
    );
    await verifyEtherscan(
        usd0.address,
        [lzEndpointContract.address, yieldBox],
        staging,
    );

    return { usd0, lzEndpointContract };
}
async function registerUniswapV2(staging?: boolean) {
    const __uniFactoryFee = ethers.Wallet.createRandom();
    const __uniFactory = await (
        await ethers.getContractFactory('UniswapV2Factory')
    ).deploy(__uniFactoryFee.address, { gasPrice: gasPrice });
    await __uniFactory.deployed();
    log(
        `Deployed UniswapV2Factory ${__uniFactory.address} with args [${__uniFactoryFee.address}]`,
        staging,
    );

    const __uniRouter = await (
        await ethers.getContractFactory('UniswapV2Router02')
    ).deploy(__uniFactory.address, ethers.constants.AddressZero, {
        gasPrice: gasPrice,
    });
    await __uniRouter.deployed();
    log(
        `Deployed UniswapV2Router02 ${__uniRouter.address} with args [${__uniFactory.address}, ${ethers.constants.AddressZero}]`,
        staging,
    );

    return { __uniFactory, __uniFactoryFee, __uniRouter };
}

async function registerERC20Tokens(staging?: boolean) {
    const mintLimitERC20 = ethers.BigNumber.from((1e18).toString()).mul(1e15);
    const supplyStart = ethers.BigNumber.from((1e18).toString()).mul(1e9);
    const mintLimitWbtc = ethers.BigNumber.from((1e8).toString()).mul(1e15);
    const supplyStartWbtc = ethers.BigNumber.from((1e8).toString()).mul(1e9);

    // Deploy ERC20FactoryMock
    const erc20Factory = await (
        await ethers.getContractFactory('ERC20FactoryMock')
    ).deploy({ gasPrice: gasPrice });
    await erc20Factory.deployed();
    log(
        `Deployed ERC20FactoryMock ${erc20Factory.address} with no arguments`,
        staging,
    );

    //Deploy USDC
    await erc20Factory.deployToken(supplyStart, 18, mintLimitERC20, {
        gasPrice: gasPrice,
    });
    const usdc = await ethers.getContractAt(
        'ERC20Mock',
        await erc20Factory.last(),
    );
    log(
        `Deployed USDC ${usdc.address} with args [${supplyStart},18, ${mintLimitERC20}]`,
        staging,
    );

    //Deploy WBTC
    await erc20Factory.deployToken(supplyStartWbtc, 8, mintLimitWbtc, {
        gasPrice: gasPrice,
    });
    const wbtc = await ethers.getContractAt(
        'ERC20Mock',
        await erc20Factory.last(),
    );
    log(
        `Deployed WBTC ${wbtc.address} with args [${supplyStartWbtc},8,${mintLimitWbtc}]`,
        staging,
    );

    //Deploy TAP
    await erc20Factory.deployToken(supplyStart, 18, mintLimitERC20, {
        gasPrice: gasPrice,
    });
    const tap = await ethers.getContractAt(
        'ERC20Mock',
        await erc20Factory.last(),
    );
    log(
        `Deployed TAP ${tap.address} with args [${supplyStart},18,${mintLimitERC20}]`,
        staging,
    );

    // Deploy WETH
    const weth = await (
        await ethers.getContractFactory('WETH9Mock')
    ).deploy(mintLimitERC20, { gasPrice: gasPrice });
    await weth.deployed();
    log(`Deployed WETH ${weth.address} with no arguments`, staging);

    await verifyEtherscan(
        usdc.address,
        [supplyStart, 18, mintLimitERC20],
        staging,
    );
    await verifyEtherscan(
        tap.address,
        [supplyStart, 18, mintLimitERC20],
        staging,
    );
    await verifyEtherscan(
        wbtc.address,
        [supplyStart, 8, mintLimitWbtc],
        staging,
    );
    await verifyEtherscan(weth.address, [mintLimitERC20], staging);

    return { usdc, weth, tap, wbtc, erc20Factory };
}

async function registerYieldBox(wethAddress: string, staging?: boolean) {
    // Deploy URIBuilder
    const uriBuilder = await (
        await ethers.getContractFactory('YieldBoxURIBuilder')
    ).deploy({ gasPrice: gasPrice });
    await uriBuilder.deployed();
    log(
        `Deployed YieldBoxURIBuilder ${uriBuilder.address} with no arguments`,
        staging,
    );

    // Deploy yieldBox
    const yieldBox = await (
        await ethers.getContractFactory('YieldBox')
    ).deploy(ethers.constants.AddressZero, uriBuilder.address, {
        gasPrice: gasPrice,
    });
    await yieldBox.deployed();
    log(
        `Deployed YieldBox ${yieldBox.address} with args [${ethers.constants.AddressZero}, ${uriBuilder.address}] `,
        staging,
    );

    await verifyEtherscan(uriBuilder.address, [], staging);
    await verifyEtherscan(
        yieldBox.address,
        [ethers.constants.AddressZero, uriBuilder.address],
        staging,
    );

    return { uriBuilder, yieldBox };
}

async function registerPenrose(
    yieldBox: string,
    tapAddress: string,
    wethAddress: string,
    staging?: boolean,
) {
    const bar = await (
        await ethers.getContractFactory('Penrose')
    ).deploy(yieldBox, tapAddress, wethAddress, { gasPrice: gasPrice });
    await bar.deployed();
    log(
        `Deployed Penrose ${bar.address} with args [${yieldBox}, ${tapAddress}, ${wethAddress}]`,
        staging,
    );
    await verifyEtherscan(
        bar.address,
        [yieldBox, tapAddress, wethAddress],
        staging,
    );

    return { bar };
}

async function setPenroseAssets(
    yieldBox: YieldBox,
    bar: Penrose,
    wethAddress: string,
    usdcAddress: string,
    wbtcAddress: string,
) {
    const wethAssetId = await bar.wethAssetId();

    const usdcStrategy = await createTokenEmptyStrategy(
        yieldBox.address,
        usdcAddress,
    );
    await (
        await yieldBox.registerAsset(1, usdcAddress, usdcStrategy.address, 0, {
            gasPrice: gasPrice,
        })
    ).wait();
    const usdcAssetId = await yieldBox.ids(
        1,
        usdcAddress,
        usdcStrategy.address,
        0,
    );

    const wbtcStrategy = await createTokenEmptyStrategy(
        yieldBox.address,
        wbtcAddress,
    );
    await (
        await yieldBox.registerAsset(1, wbtcAddress, wbtcStrategy.address, 0, {
            gasPrice: gasPrice,
        })
    ).wait();
    const wbtcAssetId = await yieldBox.ids(
        1,
        wbtcAddress,
        wbtcStrategy.address,
        0,
    );

    return {
        wethAssetId,
        usdcAssetId,
        wbtcAssetId,
        usdcStrategy,
        wbtcStrategy,
    };
}

async function deployProxyDeployer() {
    const proxyDeployer = await (
        await ethers.getContractFactory('ProxyDeployer')
    ).deploy({
        gasPrice: gasPrice,
    });
    await proxyDeployer.deployed();

    return { proxyDeployer };
}

async function addUniV2Liquidity(
    deployerAddress: string,
    token1: any,
    token2: any,
    token1Amount: BigNumberish,
    token2Amount: BigNumberish,
    __uniFactory: UniswapV2Factory,
    __uniRouter: UniswapV2Router02,
    createPair?: boolean,
) {
    if (createPair) {
        await (
            await __uniFactory.createPair(token1.address, token2.address, {
                gasPrice: gasPrice,
            })
        ).wait();
    }
    if (token1.freeMint !== undefined) {
        await token1.freeMint(token1Amount, { gasPrice: gasPrice });
    } else {
        await token1.mint(deployerAddress, token1Amount, {
            gasPrice: gasPrice,
        });
    }
    if (token2.freeMint !== undefined) {
        await token2.freeMint(token2Amount, { gasPrice: gasPrice });
    } else {
        await token2.mint(deployerAddress, token2Amount, {
            gasPrice: gasPrice,
        });
    }

    await token1.approve(__uniRouter.address, token1Amount, {
        gasPrice: gasPrice,
    });
    await token2.approve(__uniRouter.address, token2Amount, {
        gasPrice: gasPrice,
    });
    await __uniRouter.addLiquidity(
        token1.address,
        token2.address,
        token1Amount,
        token2Amount,
        token1Amount,
        token2Amount,
        deployerAddress,
        ethers.utils.parseEther('10'),
        { gasPrice: gasPrice },
    );
    await time.increase(86500);
}

async function addUniV2UsdoWethLiquidity(
    deployerAddress: string,
    usdo: ERC20Mock,
    weth: WETH9Mock,
    __uniFactory: UniswapV2Factory,
    __uniRouter: UniswapV2Router02,
) {
    const wethPairAmount = ethers.BigNumber.from(1e6).mul((1e18).toString());
    const usdoPairAmount = wethPairAmount.mul(
        __wethUsdcPrice.div((1e18).toString()),
    );
    await addUniV2Liquidity(
        deployerAddress,
        weth,
        usdo,
        wethPairAmount,
        usdoPairAmount,
        __uniFactory,
        __uniRouter,
    );
}

async function createUniV2Usd0Pairs(
    deployerAddress: string,
    uniFactory: UniswapV2Factory,
    uniRouter: UniswapV2Router02,
    weth: WETH9Mock,
    tap: ERC20Mock,
    usdo: USD0,
) {
    // Create WETH<>USD0 pair
    const wethPairAmount = ethers.BigNumber.from(1e6).mul((1e18).toString());
    const usdoPairAmount = wethPairAmount.mul(
        __wethUsdcPrice.div((1e18).toString()),
    );
    await addUniV2Liquidity(
        deployerAddress,
        weth,
        usdo,
        wethPairAmount,
        usdoPairAmount,
        uniFactory,
        uniRouter,
        true,
    );

    const __wethUsdoMockPair = await uniFactory.getPair(
        weth.address,
        usdo.address,
    );

    // Create TAP<>USD0 pair
    const tapPairAmount = ethers.BigNumber.from(1e6).mul((1e18).toString());
    const usdoTapPairAmount = ethers.BigNumber.from(1e6).mul((1e18).toString());

    await addUniV2Liquidity(
        deployerAddress,
        tap,
        usdo,
        tapPairAmount,
        usdoTapPairAmount,
        uniFactory,
        uniRouter,
        true,
    );

    const __tapUsdoMockPair = await uniFactory.getPair(
        tap.address,
        usdo.address,
    );

    return { __wethUsdoMockPair, __tapUsdoMockPair };
}

async function uniV2EnvironnementSetup(
    deployerAddress: string,
    weth: WETH9Mock,
    usdc: ERC20Mock,
    tap: ERC20Mock,
    wbtc: ERC20Mock,
    staging?: boolean,
) {
    // Deploy Uni factory, create pair and add liquidity
    const { __uniFactory, __uniRouter } = await registerUniswapV2(staging);
    await (
        await __uniFactory.createPair(weth.address, usdc.address, {
            gasPrice: gasPrice,
        })
    ).wait();

    // Create WETH/USDC LP
    const wethPairAmount = ethers.BigNumber.from(1e6).mul((1e18).toString());
    let usdcPairAmount = wethPairAmount.mul(
        __wethUsdcPrice.div((1e18).toString()),
    );
    await (await weth.freeMint(wethPairAmount, { gasPrice: gasPrice })).wait();
    await (await usdc.freeMint(usdcPairAmount, { gasPrice: gasPrice })).wait();

    await (
        await weth.approve(__uniRouter.address, wethPairAmount, {
            gasPrice: gasPrice,
        })
    ).wait();
    await (
        await usdc.approve(__uniRouter.address, usdcPairAmount, {
            gasPrice: gasPrice,
        })
    ).wait();
    await (
        await __uniRouter.addLiquidity(
            weth.address,
            usdc.address,
            wethPairAmount,
            usdcPairAmount,
            wethPairAmount,
            usdcPairAmount,
            deployerAddress,
            ethers.utils.parseEther('10'),
            { gasPrice: gasPrice },
        )
    ).wait();
    const __wethUsdcMockPair = await __uniFactory.getPair(
        weth.address,
        usdc.address,
    );
    await time.increase(86500);

    // Create WBTC/USDC LP
    const wbtcPairAmount = ethers.BigNumber.from(1e6).mul((1e8).toString());
    usdcPairAmount = wbtcPairAmount
        .mul(1e10)
        .mul(__wbtcUsdcPrice.div((1e18).toString()));
    await (await wbtc.freeMint(wbtcPairAmount, { gasPrice: gasPrice })).wait();
    await (await usdc.freeMint(usdcPairAmount, { gasPrice: gasPrice })).wait();
    await (
        await wbtc.approve(__uniRouter.address, ethers.constants.MaxUint256, {
            gasPrice: gasPrice,
        })
    ).wait();
    await (
        await usdc.approve(__uniRouter.address, ethers.constants.MaxUint256, {
            gasPrice: gasPrice,
        })
    ).wait();
    await (
        await __uniRouter.addLiquidity(
            wbtc.address,
            usdc.address,
            wbtcPairAmount,
            usdcPairAmount,
            wbtcPairAmount,
            usdcPairAmount,
            deployerAddress,
            ethers.utils.parseEther('10'),
            { gasPrice: gasPrice },
        )
    ).wait();
    const __wbtcUsdcMockPair = await __uniFactory.getPair(
        wbtc.address,
        usdc.address,
    );
    await time.increase(86500);

    // Create WETH/TAP LP
    await (await weth.freeMint(wethPairAmount, { gasPrice: gasPrice })).wait();
    await (await tap.freeMint(wethPairAmount, { gasPrice: gasPrice })).wait();

    await (
        await weth.approve(__uniRouter.address, wethPairAmount, {
            gasPrice: gasPrice,
        })
    ).wait();
    await (
        await tap.approve(__uniRouter.address, wethPairAmount, {
            gasPrice: gasPrice,
        })
    ).wait();
    await (
        await __uniRouter.addLiquidity(
            weth.address,
            tap.address,
            wethPairAmount,
            wethPairAmount,
            wethPairAmount,
            wethPairAmount,
            deployerAddress,
            ethers.utils.parseEther('10'),
            { gasPrice: gasPrice },
        )
    ).wait();
    const __wethTapMockPair = await __uniFactory.getPair(
        weth.address,
        tap.address,
    );

    await time.increase(86500);
    return {
        __wethUsdcMockPair,
        __wethTapMockPair,
        __wbtcUsdcMockPair,
        __uniFactory,
        __uniRouter,
    };
}

async function registerMultiSwapper(
    bar: Penrose,
    __uniFactoryAddress: string,
    __uniFactoryPairCodeHash: string,
    staging?: boolean,
) {
    const multiSwapper = await (
        await ethers.getContractFactory('MultiSwapper')
    ).deploy(__uniFactoryAddress, bar.address, __uniFactoryPairCodeHash, {
        gasPrice: gasPrice,
    });
    await multiSwapper.deployed();
    log(
        `Deployed MultiSwapper ${multiSwapper.address} with args [${__uniFactoryAddress}, ${bar.address}, ${__uniFactoryPairCodeHash}]`,
        staging,
    );

    await (
        await bar.setSwapper(multiSwapper.address, true, { gasPrice: gasPrice })
    ).wait();
    log('Swapper was set on Penrose', staging);

    await verifyEtherscan(
        multiSwapper.address,
        [__uniFactoryAddress, bar.address, __uniFactoryPairCodeHash],
        staging,
    );

    return { multiSwapper };
}

async function deployMediumRiskMC(bar: Penrose, staging?: boolean) {
    const mediumRiskMC = await (
        await ethers.getContractFactory('Singularity')
    ).deploy({ gasPrice: gasPrice });
    await mediumRiskMC.deployed();
    log(
        `Deployed MediumRiskMC ${mediumRiskMC.address} with no arguments`,
        staging,
    );

    await (
        await bar.registerSingularityMasterContract(mediumRiskMC.address, 1, {
            gasPrice: gasPrice,
        })
    ).wait();
    log('MediumRiskMC was set on Penrose', staging);

    await verifyEtherscan(mediumRiskMC.address, [], staging);

    return { mediumRiskMC };
}

async function deployMediumRiskBigBangMC(bar: Penrose, staging?: boolean) {
    const mediumRiskBigBangMC = await (
        await ethers.getContractFactory('BigBang')
    ).deploy({ gasPrice: gasPrice });
    await mediumRiskBigBangMC.deployed();
    log(
        `Deployed MediumRiskBigBangMC ${mediumRiskBigBangMC.address} with no arguments`,
        staging,
    );

    await (
        await bar.registerBigBangMasterContract(
            mediumRiskBigBangMC.address,
            1,
            {
                gasPrice: gasPrice,
            },
        )
    ).wait();
    log('MediumRiskMC was set on Penrose', staging);

    await verifyEtherscan(mediumRiskBigBangMC.address, [], staging);

    return { mediumRiskBigBangMC };
}

async function registerSingularity(
    mediumRiskMC: string,
    yieldBox: YieldBox,
    bar: Penrose,
    weth: WETH9Mock | ERC20Mock,
    wethAssetId: BigNumberish,
    usdc: ERC20Mock,
    usdcAssetId: BigNumberish,
    wethUsdcOracle: OracleMock,
    exchangeRatePrecision?: BigNumberish,
    staging?: boolean,
) {
    const _sglLiquidationModule = await (
        await ethers.getContractFactory('SGLLiquidation')
    ).deploy({ gasPrice: gasPrice });
    await _sglLiquidationModule.deployed();
    log(
        `Deployed WethUsdcSGLLiquidationModule ${_sglLiquidationModule.address} with no arguments`,
        staging,
    );

    const _sglLendingBorrowingModule = await (
        await ethers.getContractFactory('SGLLendingBorrowing')
    ).deploy({ gasPrice: gasPrice });
    await _sglLendingBorrowingModule.deployed();
    log(
        `Deployed WethUsdcSGLLendingBorrowing ${_sglLendingBorrowingModule.address} with no arguments`,
        staging,
    );

    const data = new ethers.utils.AbiCoder().encode(
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
            _sglLiquidationModule.address,
            _sglLendingBorrowingModule.address,
            bar.address,
            weth.address,
            wethAssetId,
            usdc.address,
            usdcAssetId,
            wethUsdcOracle.address,
            exchangeRatePrecision ?? 0,
        ],
    );
    await (
        await bar.registerSingularity(mediumRiskMC, data, true, {
            gasPrice: gasPrice,
        })
    ).wait();
    log('WethUsdcSingularity registered on Penrose', staging);

    const singularityMarket = await ethers.getContractAt(
        'Singularity',
        await bar.clonesOf(
            mediumRiskMC,
            (await bar.clonesOfCount(mediumRiskMC)).sub(1),
        ),
    );

    await verifyEtherscan(singularityMarket.address, [], staging);

    return {
        singularityMarket,
        _sglLiquidationModule,
        _sglLendingBorrowingModule,
    };
}

async function registerUniUsdoToWethBidder(
    uniSwapper: MultiSwapper,
    wethAssetId: BigNumber,
    staging?: boolean,
) {
    const usdoToWethBidder = await (
        await ethers.getContractFactory('UniUsdoToWethBidder')
    ).deploy(uniSwapper.address, wethAssetId, { gasPrice: gasPrice });
    await usdoToWethBidder.deployed();
    log(
        `Deployed UniUsdoToWethBidder ${usdoToWethBidder.address} with args [${uniSwapper.address},${wethAssetId}]`,
        staging,
    );

    await verifyEtherscan(
        usdoToWethBidder.address,
        [uniSwapper.address, wethAssetId],
        staging,
    );

    return { usdoToWethBidder };
}
async function deployCurveStableToUsdoBidder(
    bar: Penrose,
    usdc: ERC20Mock,
    usdo: USD0,
    staging?: boolean,
) {
    const curvePoolMock = await (
        await ethers.getContractFactory('CurvePoolMock')
    ).deploy(usdo.address, usdc.address, { gasPrice: gasPrice });

    await usdo.setMinterStatus(curvePoolMock.address, true);
    log(
        `Deployed CurvePoolMock ${curvePoolMock.address} with args [${usdo.address},${usdc.address}]`,
        staging,
    );

    const curveSwapper = await (
        await ethers.getContractFactory('CurveSwapper')
    ).deploy(curvePoolMock.address, bar.address, { gasPrice: gasPrice });
    log(
        `Deployed CurveSwapper ${curveSwapper.address} with args [${curvePoolMock.address},${bar.address}]`,
        staging,
    );

    const stableToUsdoBidder = await (
        await ethers.getContractFactory('CurveStableToUsdoBidder')
    ).deploy(curveSwapper.address, 2, { gasPrice: gasPrice });
    await stableToUsdoBidder.deployed();
    log(
        `Deployed CurveStableToUsdoBidder ${stableToUsdoBidder.address} with args [${curveSwapper.address},2]`,
        staging,
    );

    await verifyEtherscan(
        curvePoolMock.address,
        [usdo.address, usdc.address],
        staging,
    );
    await verifyEtherscan(
        curveSwapper.address,
        [curvePoolMock.address, bar.address],
        staging,
    );
    await verifyEtherscan(
        stableToUsdoBidder.address,
        [curveSwapper.address, 2],
        staging,
    );

    return { stableToUsdoBidder, curveSwapper };
}

async function createWethUsd0Singularity(
    usd0: USD0,
    weth: WETH9Mock,
    bar: Penrose,
    usdoAssetId: any,
    wethAssetId: any,
    mediumRiskMC: Singularity,
    yieldBox: YieldBox,
    stableToUsdoBidder: CurveStableToUsdoBidder,
    exchangePrecision?: BigNumberish,
    staging?: boolean,
) {
    const _sglLiquidationModule = await (
        await ethers.getContractFactory('SGLLiquidation')
    ).deploy({ gasPrice: gasPrice });
    await _sglLiquidationModule.deployed();
    log(
        `Deployed WethUsd0SGLLiquidationModule ${_sglLiquidationModule.address} with no arguments`,
        staging,
    );

    const _sglLendingBorrowingModule = await (
        await ethers.getContractFactory('SGLLendingBorrowing')
    ).deploy({ gasPrice: gasPrice });
    await _sglLendingBorrowingModule.deployed();
    log(
        `Deployed WethUsd0SGLLendingBorrowingModule ${_sglLendingBorrowingModule.address} with no arguments`,
        staging,
    );

    const collateralSwapPath = [usd0.address, weth.address];

    // Deploy WethUSD0 mock oracle
    const wethUsd0Oracle = await (
        await ethers.getContractFactory('OracleMock')
    ).deploy({ gasPrice: gasPrice });
    await wethUsd0Oracle.deployed();
    log(
        `Deployed WethUsd0 mock oracle at ${wethUsd0Oracle.address} with no arguments`,
        staging,
    );

    const newPrice = __wethUsdcPrice.div(1000000);
    await wethUsd0Oracle.set(newPrice, { gasPrice: gasPrice });
    log('Price was set for WethUsd0 mock oracle', staging);

    const data = new ethers.utils.AbiCoder().encode(
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
            _sglLiquidationModule.address,
            _sglLendingBorrowingModule.address,
            bar.address,
            usd0.address,
            usdoAssetId,
            weth.address,
            wethAssetId,
            wethUsd0Oracle.address,
            exchangePrecision,
        ],
    );
    await bar.registerSingularity(mediumRiskMC.address, data, false, {
        gasPrice: gasPrice,
    });

    const clonesCount = await bar.clonesOfCount(mediumRiskMC.address);
    log(`Clones count of MediumRiskMC ${clonesCount}`, staging);

    const wethUsdoSingularity = await ethers.getContractAt(
        'Singularity',
        await bar.clonesOf(
            mediumRiskMC.address,
            (await bar.clonesOfCount(mediumRiskMC.address)).sub(1),
        ),
    );
    log(
        `Deployed WethUsd0Singularity at ${wethUsdoSingularity.address} with no arguments`,
        staging,
    );

    //Deploy & set LiquidationQueue
    await usd0.setMinterStatus(wethUsdoSingularity.address, true, {
        gasPrice: gasPrice,
    });
    await usd0.setBurnerStatus(wethUsdoSingularity.address, true, {
        gasPrice: gasPrice,
    });
    log(
        'Updated Usd0 Minter and Burner status for WethUsd0Singularity',
        staging,
    );

    const liquidationQueue = await (
        await ethers.getContractFactory('LiquidationQueue')
    ).deploy({ gasPrice: gasPrice });
    await liquidationQueue.deployed();
    log(
        `Deployed WethUsd0LiquidationQueue at ${liquidationQueue.address} with no arguments`,
        staging,
    );

    const feeCollector = new ethers.Wallet(
        ethers.Wallet.createRandom().privateKey,
        ethers.provider,
    );
    log(`WethUsd0Singularity feeCollector ${feeCollector.address}`, staging);

    const LQ_META = {
        activationTime: 600, // 10min
        minBidAmount: ethers.BigNumber.from((1e18).toString()).mul(1), // 1 USDC
        closeToMinBidAmount: ethers.BigNumber.from((1e18).toString()).mul(202),
        defaultBidAmount: ethers.BigNumber.from((1e18).toString()).mul(400), // 400 USDC
        feeCollector: feeCollector.address,
        bidExecutionSwapper: ethers.constants.AddressZero,
        usdoSwapper: stableToUsdoBidder.address,
    };

    await liquidationQueue.init(LQ_META, wethUsdoSingularity.address, {
        gasPrice: gasPrice,
    });
    log('LiquidationQueue initialized');

    const payload = wethUsdoSingularity.interface.encodeFunctionData(
        'setLiquidationQueue',
        [liquidationQueue.address],
    );

    await (
        await bar.executeMarketFn(
            [wethUsdoSingularity.address],
            [payload],
            true,
            {
                gasPrice: gasPrice,
            },
        )
    ).wait();
    log('WethUsd0LiquidationQueue was set for WethUsd0Singularity', staging);

    return { wethUsdoSingularity };
}

async function registerLiquidationQueue(
    bar: Penrose,
    singularity: Singularity,
    feeCollector: string,
    staging?: boolean,
) {
    const liquidationQueue = await (
        await ethers.getContractFactory('LiquidationQueue')
    ).deploy({ gasPrice: gasPrice });
    await liquidationQueue.deployed();
    log(
        `Deployed LiquidationQueue ${liquidationQueue.address} with no arguments`,
        staging,
    );

    const LQ_META = {
        activationTime: 600, // 10min
        minBidAmount: ethers.BigNumber.from((1e18).toString()).mul(1), // 1 USDC
        closeToMinBidAmount: ethers.BigNumber.from((1e18).toString()).mul(202),
        defaultBidAmount: ethers.BigNumber.from((1e18).toString()).mul(400), // 400 USDC
        feeCollector,
        bidExecutionSwapper: ethers.constants.AddressZero,
        usdoSwapper: ethers.constants.AddressZero,
    };
    await liquidationQueue.init(LQ_META, singularity.address);
    log('LiquidationQueue initialized', staging);

    const payload = singularity.interface.encodeFunctionData(
        'setLiquidationQueue',
        [liquidationQueue.address],
    );

    await (
        await bar.executeMarketFn([singularity.address], [payload], true, {
            gasPrice: gasPrice,
        })
    ).wait();
    log('WethUsdcLiquidationQueue was set for WethUsdcSingularity', staging);

    await verifyEtherscan(
        liquidationQueue.address,
        [BN(1e18).mul(1e9).toString()],
        staging,
    );

    return { liquidationQueue, LQ_META };
}

async function registerBigBangMarket(
    mediumRiskBigBangMC: string,
    yieldBox: YieldBox,
    bar: Penrose,
    collateral: WETH9Mock | ERC20Mock,
    collateralId: BigNumberish,
    oracle: OracleMock,
    exchangeRatePrecision?: BigNumberish,
    debtRateAgainstEth?: BigNumberish,
    debtRateMin?: BigNumberish,
    debtRateMax?: BigNumberish,
    debtStartPoint?: BigNumberish,
    staging?: boolean,
) {
    const data = new ethers.utils.AbiCoder().encode(
        [
            'address',
            'address',
            'uint256',
            'address',
            'uint256',
            'uint256',
            'uint256',
            'uint256',
            'uint256',
        ],
        [
            bar.address,
            collateral.address,
            collateralId,
            oracle.address,
            exchangeRatePrecision,
            debtRateAgainstEth,
            debtRateMin,
            debtRateMax,
            debtStartPoint,
        ],
    );

    await (
        await bar.registerBigBang(mediumRiskBigBangMC, data, true, {
            gasPrice: gasPrice,
        })
    ).wait();
    log('BigBang market registered on Penrose', staging);

    const bigBangMarket = await ethers.getContractAt(
        'BigBang',
        await bar.clonesOf(
            mediumRiskBigBangMC,
            (await bar.clonesOfCount(mediumRiskBigBangMC)).sub(1),
        ),
    );
    await verifyEtherscan(bigBangMarket.address, [], staging);
    return { bigBangMarket };
}

const verifyEtherscan = async (
    address: string,
    args: any[],
    staging?: boolean,
) => {
    if (staging) {
        verifyEtherscanQueue.push({ address, args });
    }
};

export async function createTokenEmptyStrategy(
    yieldBox: string,
    token: string,
) {
    const noStrategy = await (
        await ethers.getContractFactory('ERC20WithoutStrategy')
    ).deploy(yieldBox, token, {
        gasPrice: gasPrice,
    });
    await noStrategy.deployed();
    return noStrategy;
}

const gasPrice = 22000000000; //55gwei
const log = (message: string, staging?: boolean) =>
    staging && console.log(message);
export async function register(staging?: boolean) {
    if (!staging) {
        await resetVM();
    }

    /**
     * INITIAL SETUP
     */
    const deployer = (await ethers.getSigners())[0];
    const eoas = await ethers.getSigners();
    eoas.shift(); //remove deployer

    // ------------------- Deploy WethUSDC mock oracle -------------------
    log('Deploying WethUSDC mock oracle', staging);
    const wethUsdcOracle = await (
        await ethers.getContractFactory('OracleMock')
    ).deploy({ gasPrice: gasPrice });
    await wethUsdcOracle.deployed();
    log(
        `Deployed WethUSDC mock oracle ${wethUsdcOracle.address} with no arguments `,
        staging,
    );
    await (
        await wethUsdcOracle.set(__wethUsdcPrice, { gasPrice: gasPrice })
    ).wait();
    await verifyEtherscan(wethUsdcOracle.address, [], staging);
    log('Price was set for WethUSDC mock oracle ', staging);

    // ------------------- Deploy WbtcUSDC mock oracle -------------------
    const wbtcUsdcOracle = await (
        await ethers.getContractFactory('OracleMock')
    ).deploy({ gasPrice: gasPrice });
    await wbtcUsdcOracle.deployed();
    log(
        `Deployed WbtcUDSC mock oracle ${wbtcUsdcOracle.address} with no arguments `,
        staging,
    );
    await (
        await wbtcUsdcOracle.set(__wbtcUsdcPrice, { gasPrice: gasPrice })
    ).wait();
    await verifyEtherscan(wbtcUsdcOracle.address, [], staging);
    log('Price was set for WbtcUDSC mock oracle ', staging);

    // -------------------  Deploy WethUSD0 mock oracle -------------------
    log('Deploying USD0WETH mock oracle', staging);
    const usd0WethOracle = await (
        await ethers.getContractFactory('OracleMock')
    ).deploy({ gasPrice: gasPrice });
    await usd0WethOracle.deployed();
    log(
        `Deployed USD0WETH mock oracle ${usd0WethOracle.address} with no arguments`,
        staging,
    );
    const __usd0WethPrice = __wethUsdcPrice.div(1000000);
    await (
        await usd0WethOracle.set(__usd0WethPrice, { gasPrice: gasPrice })
    ).wait();
    await verifyEtherscan(usd0WethOracle.address, [], staging);
    log('Price was set for USD0WETH mock oracle', staging);

    // ------------------- 1  Deploy tokens -------------------
    log('Deploying Tokens', staging);
    const { usdc, weth, tap, wbtc, erc20Factory } = await registerERC20Tokens(
        staging,
    );
    log(
        `Deployed Tokens ${tap.address}, ${usdc.address}, ${weth.address}, ${wbtc.address} & Factory ${erc20Factory.address}`,
        staging,
    );

    // -------------------  2 Deploy Yieldbox -------------------
    log('Deploying YieldBox', staging);
    const { yieldBox, uriBuilder } = await registerYieldBox(
        weth.address,
        staging,
    );
    log(`Deployed YieldBox ${yieldBox.address}`, staging);

    // ------------------- 2.1 Deploy Penrose -------------------
    log('Deploying Penrose', staging);
    const { bar } = await registerPenrose(
        yieldBox.address,
        tap.address,
        weth.address,
        staging,
    );
    log(`Deployed Penrose ${bar.address}`, staging);

    // -------------------  3 Add asset types to Penrose -------------------
    log('Setting Penrose assets', staging);
    const {
        usdcAssetId,
        wethAssetId,
        wbtcAssetId,
        usdcStrategy,
        wbtcStrategy,
    } = await setPenroseAssets(
        yieldBox,
        bar,
        weth.address,
        usdc.address,
        wbtc.address,
    );
    log(
        `Penrose assets were set USDC: ${usdcAssetId}, WETH: ${wethAssetId}, WBTC: ${wbtcAssetId}`,
        staging,
    );

    // -------------------  4 Deploy UNIV2 env -------------------
    log('Deploying UNIV2 Environment', staging);
    const {
        __wethUsdcMockPair,
        __wethTapMockPair,
        __wbtcTapMockPair,
        __uniFactory,
        __uniRouter,
    } = await uniV2EnvironnementSetup(
        deployer.address,
        weth,
        usdc,
        tap,
        wbtc,
        staging,
    );
    log(
        `Deployed UNIV2 Environment WethUsdcMockPair: ${__wethUsdcMockPair}, WethTapMockPar: ${__wethTapMockPair}, WbtcUsdcMockPair: ${__wbtcTapMockPair}, UniswapV2Factory: ${__uniFactory.address}, UniswapV2Router02: ${__uniRouter.address}`,
        staging,
    );

    // ------------------- 5 Deploy MultiSwapper -------------------
    log('Registering MultiSwapper', staging);
    const { multiSwapper } = await registerMultiSwapper(
        bar,
        __uniFactory.address,
        await __uniFactory.pairCodeHash(),
        staging,
    );
    log(`Deployed MultiSwapper ${multiSwapper.address}`, staging);

    // ------------------- 6 Deploy MediumRisk master contract -------------------
    log('Deploying MediumRiskMC', staging);
    const { mediumRiskMC } = await deployMediumRiskMC(bar, staging);
    log(`Deployed MediumRiskMC ${mediumRiskMC.address}`, staging);

    // ------------------- 6.1 Deploy MediumRiskBigBang master contract -------------------
    log('Deploying MediumRiskBigBangMC', staging);
    const { mediumRiskBigBangMC } = await deployMediumRiskBigBangMC(
        bar,
        staging,
    );
    log(`Deployed MediumRiskBigBangMC ${mediumRiskBigBangMC.address}`, staging);

    // ------------------- 7 Deploy WethUSDC medium risk MC clone-------------------
    log('Deploying WethUsdcSingularity', staging);
    const wethUsdcSingularityData = await registerSingularity(
        mediumRiskMC.address,
        yieldBox,
        bar,
        weth,
        wethAssetId,
        usdc,
        usdcAssetId,
        wethUsdcOracle,
        ethers.utils.parseEther('1'),
        staging,
    );
    const wethUsdcSingularity = wethUsdcSingularityData.singularityMarket;
    const _sglLendingBorrowingModule =
        wethUsdcSingularityData._sglLendingBorrowingModule;
    const _sglLiquidationModule = wethUsdcSingularityData._sglLiquidationModule;
    log(`Deployed WethUsdcSingularity ${wethUsdcSingularity.address}`, staging);

    log('Deploying WbtcUsdcSingularity', staging);
    const collateralWbtcSwapPath = [usdc.address, wbtc.address];
    const wbtcUsdcSingularityData = await registerSingularity(
        mediumRiskMC.address,
        yieldBox,
        bar,
        wbtc,
        wbtcAssetId,
        usdc,
        usdcAssetId,
        wbtcUsdcOracle,
        (1e8).toString(),
        staging,
    );
    const wbtcUsdcSingularity = wbtcUsdcSingularityData.singularityMarket;
    const _sglWbtcUsdcLendingBorrowingModule =
        wbtcUsdcSingularityData._sglLendingBorrowingModule;
    const _sglWbtcUsdcLiquidationModule =
        wbtcUsdcSingularityData._sglLiquidationModule;

    log(`Deployed WbtcUsdcSingularity ${wbtcUsdcSingularity.address}`, staging);

    // ------------------- 8 Set feeTo -------------------
    log('Setting feeTo and feeVeTap', staging);
    const singularityFeeTo = ethers.Wallet.createRandom();
    await bar.setFeeTo(singularityFeeTo.address, { gasPrice: gasPrice });
    log(`feeTo ${singularityFeeTo} were set for WethUsdcSingularity`, staging);

    // ------------------- 9 Deploy & set LiquidationQueue -------------------
    log('Registering WETHUSDC LiquidationQueue', staging);
    const feeCollector = new ethers.Wallet(
        ethers.Wallet.createRandom().privateKey,
        ethers.provider,
    );
    const { liquidationQueue, LQ_META } = await registerLiquidationQueue(
        bar,
        wethUsdcSingularity,
        feeCollector.address,
        staging,
    );
    log(
        `Registered WETHUSDC LiquidationQueue ${liquidationQueue.address}`,
        staging,
    );

    log('Registering WBTCUSDC LiquidationQueue', staging);
    const wbtcUsdcLiquidationData = await registerLiquidationQueue(
        bar,
        wbtcUsdcSingularity,
        feeCollector.address,
        staging,
    );
    const wbtcLiquidationQueue = wbtcUsdcLiquidationData.liquidationQueue;
    const wbtcLQ_META = wbtcUsdcLiquidationData.LQ_META;
    log(
        `Registered WBTC LiquidationQueue ${wbtcLiquidationQueue.address}`,
        staging,
    );

    // ------------------- 10 Deploy USD0 -------------------
    log('Registering USD0', staging);
    const chainId = await hre.getChainId();
    const { usd0, lzEndpointContract } = await registerUsd0Contract(
        chainId,
        yieldBox.address,
        staging,
    );
    log(`USD0 registered ${usd0.address}`, staging);

    // ------------------- 11 Set USD0 on Penrose -------------------
    await bar.setUsdoToken(usd0.address, { gasPrice: gasPrice });
    log('USD0 was set on Penrose', staging);

    // ------------------- 12 Register WETH BigBang -------------------
    log('Deploying WethMinterSingularity', staging);
    let bigBangRegData = await registerBigBangMarket(
        mediumRiskBigBangMC.address,
        yieldBox,
        bar,
        weth,
        wethAssetId,
        usd0WethOracle,
        ethers.utils.parseEther('1'),
        0,
        0,
        0,
        0, //ignored, as this is the main market
        staging,
    );
    const wethBigBangMarket = bigBangRegData.bigBangMarket;
    await bar.setBigBangEthMarket(wethBigBangMarket.address);
    log(`WethMinterSingularity deployed ${wethBigBangMarket.address}`, staging);
    // ------------------- 12.1 Register BigBang -------------------
    log('Deploying wbtcBigBangMarket', staging);
    bigBangRegData = await registerBigBangMarket(
        mediumRiskBigBangMC.address,
        yieldBox,
        bar,
        wbtc,
        wbtcAssetId,
        usd0WethOracle,
        ethers.utils.parseEther('1'),
        ethers.utils.parseEther('0.5'),
        ethers.utils.parseEther('0.005'),
        ethers.utils.parseEther('0.035'),
        0,
        staging,
    );
    const wbtcBigBangMarket = bigBangRegData.bigBangMarket;
    log(`wbtcBigBangMarket deployed ${wbtcBigBangMarket.address}`, staging);
    // ------------------- 13 Set Minter and Burner for USD0 -------------------
    await usd0.setMinterStatus(wethBigBangMarket.address, true, {
        gasPrice: gasPrice,
    });
    await usd0.setBurnerStatus(wethBigBangMarket.address, true, {
        gasPrice: gasPrice,
    });
    await usd0.setMinterStatus(wbtcBigBangMarket.address, true, {
        gasPrice: gasPrice,
    });
    await usd0.setBurnerStatus(wbtcBigBangMarket.address, true, {
        gasPrice: gasPrice,
    });
    log(
        'Minter and Burner roles set for wethBigBangMarket & wbtcBigBangMarket',
        staging,
    );

    // ------------------- 14 Create weth-usd0 pair -------------------
    log('Creating WethUSDO and TapUSDO pairs', staging);
    const { __wethUsdoMockPair, __tapUsdoMockPair } =
        await createUniV2Usd0Pairs(
            deployer.address,
            __uniFactory,
            __uniRouter,
            weth,
            tap,
            usd0,
        );
    log(
        `WethUSDO ${__wethUsdoMockPair} & TapUSDO ${__tapUsdoMockPair} pairs created`,
        staging,
    );

    // ------------------- 15 Create MarketsHelper -------------------
    log('Deploying MarketsHelper', staging);
    const marketsHelper = await (
        await ethers.getContractFactory('MarketsHelper')
    ).deploy({ gasPrice: gasPrice });
    await marketsHelper.deployed();
    log(
        `Deployed MarketsHelper ${marketsHelper.address} with no args`,
        staging,
    );

    // ------------------- 16 Create UniswapUsdoToWethBidder -------------------
    log('Deploying UniswapUsdoToWethBidder', staging);
    const { usdoToWethBidder } = await registerUniUsdoToWethBidder(
        multiSwapper,
        wethAssetId,
        staging,
    );
    log(
        `Deployed UniswapUsdoToWethBidder ${usdoToWethBidder.address}`,
        staging,
    );

    if (staging) {
        //------------------- 17 Create CurveStableToUsdoBidder -------------------
        log('Deploying CurveStableToUsdoBidder', staging);
        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usd0,
            staging,
        );
        log(
            `Deployed CurveStableToUsdoBidder ${stableToUsdoBidder.address}`,
            staging,
        );
        // ------------------- 18 Create WethUsd0Singularity -------------------
        log('Deploying WethUsd0Singularty', staging);
        const usd0AssetId = await yieldBox.ids(
            1,
            usd0.address,
            ethers.constants.AddressZero,
            0,
        );
        const { wethUsdoSingularity } = await createWethUsd0Singularity(
            usd0,
            weth,
            bar,
            usd0AssetId,
            wethAssetId,
            mediumRiskMC,
            yieldBox,
            stableToUsdoBidder,
            ethers.utils.parseEther('1'),
            staging,
        );
        log(
            `Deployed WethUsd0Singularity ${wethUsdoSingularity.address}`,
            staging,
        );
    }

    // ------------------- 19 Create ProxyDeployer -------------------
    const { proxyDeployer } = await deployProxyDeployer();
    /**
     * OTHERS
     */

    // Deploy an EOA
    const eoa1 = new ethers.Wallet(
        ethers.Wallet.createRandom().privateKey,
        ethers.provider,
    );

    if (!staging) {
        await setBalance(eoa1.address, 100000);
    }

    // Helper
    const initialSetup = {
        __wethUsdcPrice,
        __usd0WethPrice,
        __wbtcUsdcPrice,
        deployer,
        eoas,
        usd0,
        lzEndpointContract,
        usdc,
        usdcAssetId,
        weth,
        wethAssetId,
        wbtc,
        wbtcAssetId,
        usdcStrategy,
        wbtcStrategy,
        erc20Factory,
        tap,
        collateralWbtcSwapPath,
        wethUsdcOracle,
        usd0WethOracle,
        wbtcUsdcOracle,
        yieldBox,
        bar,
        wethBigBangMarket,
        wbtcBigBangMarket,
        wethUsdcSingularity,
        _sglLiquidationModule,
        _sglLendingBorrowingModule,
        wbtcUsdcSingularity,
        _sglWbtcUsdcLendingBorrowingModule,
        _sglWbtcUsdcLiquidationModule,
        marketsHelper,
        eoa1,
        multiSwapper,
        singularityFeeTo,
        liquidationQueue,
        LQ_META,
        wbtcLiquidationQueue,
        wbtcLQ_META,
        feeCollector,
        usdoToWethBidder,
        mediumRiskMC,
        mediumRiskBigBangMC,
        proxyDeployer,
        registerSingularity,
        __uniFactory,
        __uniRouter,
        __wethUsdcMockPair,
        __wethTapMockPair,
        __wethUsdoMockPair,
        __tapUsdoMockPair,
    };

    /**
     * UTIL FUNCS
     */

    const approveTokensAndSetBarApproval = async (account?: typeof eoa1) => {
        const _usdc = account ? usdc.connect(account) : usdc;
        const _weth = account ? weth.connect(account) : weth;
        const _wbtc = account ? wbtc.connect(account) : wbtc;
        const _yieldBox = account ? yieldBox.connect(account) : yieldBox;
        await (
            await _usdc.approve(yieldBox.address, ethers.constants.MaxUint256)
        ).wait();
        await (
            await _weth.approve(yieldBox.address, ethers.constants.MaxUint256)
        ).wait();
        await (
            await _wbtc.approve(yieldBox.address, ethers.constants.MaxUint256)
        ).wait();
        await (
            await _yieldBox.setApprovalForAll(wethUsdcSingularity.address, true)
        ).wait();
        await (
            await _yieldBox.setApprovalForAll(wbtcUsdcSingularity.address, true)
        ).wait();
    };

    const timeTravel = async (seconds: number) => {
        await time.increase(seconds);
    };

    const wethDepositAndAddAsset = async (
        amount: BigNumberish,
        account?: typeof eoa1,
    ) => {
        const _account = account ?? deployer;
        const _yieldBox = account ? yieldBox.connect(account) : yieldBox;
        const _wethUsdcSingularity = account
            ? wethUsdcSingularity.connect(account)
            : wethUsdcSingularity;

        const id = await _wethUsdcSingularity.assetId();
        const _valShare = await _yieldBox.toShare(id, amount, false);
        await (
            await _yieldBox.depositAsset(
                id,
                _account.address,
                _account.address,
                0,
                _valShare,
            )
        ).wait();
        await (
            await _wethUsdcSingularity.addAsset(
                _account.address,
                _account.address,
                false,
                _valShare,
            )
        ).wait();
    };

    const wbtcDepositAndAddAsset = async (
        amount: BigNumberish,
        account?: typeof eoa1,
    ) => {
        const _account = account ?? deployer;
        const _yieldBox = account ? yieldBox.connect(account) : yieldBox;
        const _wbtcUsdcSingularity = account
            ? wbtcUsdcSingularity.connect(account)
            : wbtcUsdcSingularity;

        const id = await _wbtcUsdcSingularity.assetId();
        const _valShare = await _yieldBox.toShare(id, amount, false);
        await (
            await _yieldBox.depositAsset(
                id,
                _account.address,
                _account.address,
                0,
                _valShare,
            )
        ).wait();
        await (
            await _wbtcUsdcSingularity.addAsset(
                _account.address,
                _account.address,
                false,
                _valShare,
            )
        ).wait();
    };

    const usdcDepositAndAddCollateral = async (
        amount: BigNumberish,
        account?: typeof eoa1,
    ) => {
        const _account = account ?? deployer;
        const _yieldBox = account ? yieldBox.connect(account) : yieldBox;
        const _wethUsdcSingularity = account
            ? wethUsdcSingularity.connect(account)
            : wethUsdcSingularity;

        const wethUsdcCollateralId = await _wethUsdcSingularity.collateralId();
        await (
            await _yieldBox.depositAsset(
                wethUsdcCollateralId,
                _account.address,
                _account.address,
                amount,
                0,
            )
        ).wait();
        const _wethUsdcValShare = await _yieldBox.balanceOf(
            _account.address,
            wethUsdcCollateralId,
        );
        await (
            await _wethUsdcSingularity.addCollateral(
                _account.address,
                _account.address,
                false,
                _wethUsdcValShare,
            )
        ).wait();
    };

    const usdcDepositAndAddCollateralWbtcSingularity = async (
        amount: BigNumberish,
        account?: typeof eoa1,
    ) => {
        const _account = account ?? deployer;
        const _yieldBox = account ? yieldBox.connect(account) : yieldBox;

        const _wbtcUsdcSingularity = account
            ? wbtcUsdcSingularity.connect(account)
            : wbtcUsdcSingularity;

        const wbtcUsdcCollateralId = await _wbtcUsdcSingularity.collateralId();
        await (
            await _yieldBox.depositAsset(
                wbtcUsdcCollateralId,
                _account.address,
                _account.address,
                amount,
                0,
            )
        ).wait();
        const _wbtcUsdcValShare = await _yieldBox.balanceOf(
            _account.address,
            wbtcUsdcCollateralId,
        );
        await (
            await _wbtcUsdcSingularity.addCollateral(
                _account.address,
                _account.address,
                false,
                _wbtcUsdcValShare,
            )
        ).wait();
    };

    const initContracts = async () => {
        await (await weth.freeMint(1000)).wait();
        await timeTravel(86500);
        const mintValShare = await yieldBox.toShare(
            await wethUsdcSingularity.assetId(),
            1000,
            false,
        );
        await (await weth.approve(yieldBox.address, 1000)).wait();
        await (
            await yieldBox.depositAsset(
                await wethUsdcSingularity.assetId(),
                deployer.address,
                deployer.address,
                0,
                mintValShare,
            )
        ).wait();
        await (
            await yieldBox.setApprovalForAll(wethUsdcSingularity.address, true)
        ).wait();
        await (
            await wethUsdcSingularity.addAsset(
                deployer.address,
                deployer.address,
                false,
                mintValShare,
            )
        ).wait();
    };

    const utilFuncs = {
        BN,
        approveTokensAndSetBarApproval,
        wethDepositAndAddAsset,
        wbtcDepositAndAddAsset,
        usdcDepositAndAddCollateral,
        usdcDepositAndAddCollateralWbtcSingularity,
        initContracts,
        timeTravel,
        deployCurveStableToUsdoBidder,
        registerUsd0Contract,
        addUniV2UsdoWethLiquidity,
        createWethUsd0Singularity,
        createTokenEmptyStrategy,
    };

    return { ...initialSetup, ...utilFuncs, verifyEtherscanQueue };
}

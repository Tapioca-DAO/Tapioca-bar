import { EChainID } from '@tapioca-sdk/api/config';
import { BigNumber, BigNumberish, ethers } from 'ethers';

// Name of the contract deployments to be used in the deployment scripts and saved in the deployments file
export const DEPLOYMENT_NAMES = {
    PENROSE: 'PENROSE',
    USDO: 'USDO',
    USDO_EXT_EXEC: 'USDO_EXT_EXEC',
    USDO_FLASHLOAN_HELPER: 'USDO_FLASHLOAN_HELPER',
    USDO_HELPER: 'USDO_HELPER',
    SIMPLE_LEVERAGE_EXECUTOR: 'SIMPLE_LEVERAGE_EXECUTOR',
    MARKET_HELPER: 'MARKET_HELPER',
    YB_USDO_ASSET_WITHOUT_STRATEGY: 'YB_USDO_ASSET_WITHOUT_STRATEGY',
    YB_SDAI_ASSET_WITHOUT_STRATEGY: 'YB_SDAI_ASSET_WITHOUT_STRATEGY',
    YB_SGLP_ASSET_WITHOUT_STRATEGY: 'YB_SGLP_ASSET_WITHOUT_STRATEGY',
    YB_MT_ETH_ASSET_WITHOUT_STRATEGY: 'YB_MT_ETH_ASSET_WITHOUT_STRATEGY',
    YB_T_ETH_ASSET_WITHOUT_STRATEGY: 'YB_T_ETH_ASSET_WITHOUT_STRATEGY',
    YB_T_RETH_ASSET_WITHOUT_STRATEGY: 'YB_T_RETH_ASSET_WITHOUT_STRATEGY',
    YB_T_WST_ETH_ASSET_WITHOUT_STRATEGY: 'YB_T_WST_ETH_ASSET_WITHOUT_STRATEGY',
    YB_SDAI_ASSET_WITH_STRATEGY: 'YB_SDAI_ASSET_WITH_STRATEGY',
    YB_SGLP_ASSET_WITH_STRATEGY: 'YB_SGLP_ASSET_WITH_STRATEGY',
    YB_T_SGL_SDAI_ASSET_WITHOUT_STRATEGY:
        'YB_T_SGL_SDAI_ASSET_WITHOUT_STRATEGY',
    YB_T_SGL_SGLP_ASSET_WITHOUT_STRATEGY:
        'YB_T_SGL_SGLP_ASSET_WITHOUT_STRATEGY',
    // ORIGINS
    ORIGINS_T_ETH_MARKET: 'ORIGINS_T_ETH_MARKET',
    // SGL
    SGL_S_DAI_MARKET: 'SGL_S_DAI_MARKET',
    SGL_S_GLP_MARKET: 'SGL_S_GLP_MARKET',
    SGL_MEDIUM_RISK_MC: 'SGL_MEDIUM_RISK_MC',
    SGL_INTEREST_HELPER: 'SGL_INTEREST_HELPER',
    SGL_LIQUIDATION_MODULE: 'SGL_LIQUIDATION_MODULE',
    SGL_BORROW_MODULE: 'SGL_BORROW_MODULE',
    SGL_COLLATERAL_MODULE: 'SGL_COLLATERAL_MODULE',
    SGL_LEVERAGE_MODULE: 'SGL_LEVERAGE_MODULE',
    // BB
    BB_MT_ETH_MARKET: 'BB_MT_ETH_MARKET',
    BB_T_RETH_MARKET: 'BB_T_RETH_MARKET',
    BB_T_WST_ETH_MARKET: 'BB_T_WST_ETH_MARKET',
    BB_MEDIUM_RISK_MC: 'BB_MEDIUM_RISK_MC',
    BB_LIQUIDATION_MODULE: 'BB_LIQUIDATION_MODULE',
    BB_BORROW_MODULE: 'BB_BORROW_MODULE',
    BB_COLLATERAL_MODULE: 'BB_COLLATERAL_MODULE',
    BB_LEVERAGE_MODULE: 'BB_LEVERAGE_MODULE',
    // USDO
    USDO_SENDER_MODULE: 'USDO_SENDER_MODULE',
    USDO_RECEIVER_MODULE: 'USDO_RECEIVER_MODULE',
    USDO_MARKET_RECEIVER_MODULE: 'USDO_MARKET_RECEIVER_MODULE',
    USDO_OPTION_RECEIVER_MODULE: 'USDO_OPTION_RECEIVER_MODULE',
};

type TBBMarketConfig = {
    debtRateAgainstEth: BigNumberish;
    debtRateMin: BigNumberish;
    debtRateMax: BigNumberish;
    collateralizationRate: BigNumberish;
    liquidationCollateralizationRate: BigNumberish;
};
type TSGLMarketConfig = {
    collateralizationRate: BigNumberish;
    liquidationCollateralizationRate: BigNumberish;
};
type TPostLbp = {
    [key in EChainID]?: {
        sDAI?: string;
        sGLP?: string;
        glpStrat?: {
            gmxRewardRouter: string;
            glpRewardRouter: string;
        };
        tEthOriginsMarketConfig?: {
            collateralizationRate: BigNumberish;
        };
        mtEthMarketConfig?: TBBMarketConfig;
        tRethMarketConfig?: TBBMarketConfig;
        twSTETHMarketConfig?: TBBMarketConfig;
        tSdaiMarketConfig?: TSGLMarketConfig;
        tSGlpMarketConfig?: TSGLMarketConfig;
    };
};

const marketConfigArb: TPostLbp[EChainID] = {
    tEthOriginsMarketConfig: {
        collateralizationRate: 100_000, // 100%
    },
    mtEthMarketConfig: {
        debtRateAgainstEth: 0,
        debtRateMin: 0,
        debtRateMax: 0,
        collateralizationRate: 87_000, // 87%
        liquidationCollateralizationRate: 93_000, //  93%
    },
    tRethMarketConfig: {
        debtRateAgainstEth: ethers.utils.parseEther('0.15'), // 15%
        debtRateMin: ethers.utils.parseEther('0.05'), // 5%
        debtRateMax: ethers.utils.parseEther('0.35'), // 35%
        collateralizationRate: 87_000, // 87%
        liquidationCollateralizationRate: 93_000, // 93%
    },
    twSTETHMarketConfig: {
        debtRateAgainstEth: ethers.utils.parseEther('0.15'), // 15%
        debtRateMin: ethers.utils.parseEther('0.05'), // 5%
        debtRateMax: ethers.utils.parseEther('0.35'), // 35%
        collateralizationRate: 86_000, // 86%
        liquidationCollateralizationRate: 92_000, // 92%
    },

    tSGlpMarketConfig: {
        collateralizationRate: 85_000, // 85%
        liquidationCollateralizationRate: 90_000, // 90%
    },
};

const marketConfigMainnet: TPostLbp[EChainID] = {
    tSdaiMarketConfig: {
        collateralizationRate: 98_000, // 98%
        liquidationCollateralizationRate: 99_000, // 99%
    },
};
const POST_LBP: TPostLbp = {
    [EChainID.ARBITRUM]: {
        sGLP: '0x5402B5F40310bDED796c7D0F3FF6683f5C0cFfdf',
        glpStrat: {
            gmxRewardRouter: '0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1',
            glpRewardRouter: '0xB95DB5B167D75e6d04227CfFFA61069348d271F5',
        },
        ...marketConfigArb,
    },
    [EChainID.ARBITRUM_SEPOLIA]: {
        sGLP: '0x1B460E311753fDB46451EF3d11d7B9eE5542b369',
        ...marketConfigArb,
    },
    [EChainID.MAINNET]: {
        sDAI: '0x83f20f44975d03b1b09e64809b757c47f942beea',
        ...marketConfigMainnet,
    },
    [EChainID.SEPOLIA]: {
        sDAI: '0xC6EA2075314a58cf74DE8430b24714E600A21Dd8',
        ...marketConfigMainnet,
    },
    [EChainID.OPTIMISM_SEPOLIA]: {
        sDAI: '0x37359B8bfbFAE28E513EE31a2A94A9Ec60668d90',
        ...marketConfigMainnet,
    },
    [EChainID.FUJI_AVALANCHE]: {
        sDAI: '0xed18DBCb2810E4178c23668794198C81B0668b23',
        ...marketConfigMainnet,
    },
};

POST_LBP['31337' as EChainID] = POST_LBP[EChainID.ARBITRUM]; // Copy from Arbitrum

type TUSDOUniswapPool = {
    [key in EChainID]?: {
        ETH_AMOUNT_TO_MINT_FOR_USDC_POOL: BigNumber;
        ETH_AMOUNT_TO_MINT_FOR_DAI_POOL: BigNumber;
        EXTRA_ETH_AMOUNT_TO_SEED_SGL_YB_ASSET: BigNumber;
    };
};

const USDO_UNISWAP_POOL: TUSDOUniswapPool = {
    [EChainID.ARBITRUM]: {
        ETH_AMOUNT_TO_MINT_FOR_USDC_POOL: ethers.utils.parseEther('0'),
        ETH_AMOUNT_TO_MINT_FOR_DAI_POOL: ethers.utils.parseEther('0'),
        EXTRA_ETH_AMOUNT_TO_SEED_SGL_YB_ASSET: ethers.utils.parseEther('0.001'),
    },
    [EChainID.ARBITRUM_SEPOLIA]: {
        ETH_AMOUNT_TO_MINT_FOR_USDC_POOL: ethers.utils.parseEther('1'),
        ETH_AMOUNT_TO_MINT_FOR_DAI_POOL: ethers.utils.parseEther('1'),
        EXTRA_ETH_AMOUNT_TO_SEED_SGL_YB_ASSET: ethers.utils.parseEther('0.001'),
    },
};

type TMisc = {
    [key in EChainID]?: {
        WETH: string;
    };
};
const MISC: TMisc = {
    [EChainID.ARBITRUM]: {
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    },
    [EChainID.MAINNET]: {
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
    [EChainID.ARBITRUM_SEPOLIA]: {
        WETH: '0x2EAe4fbc552fE35C1D3Df2B546032409bb0E431E',
    },
    [EChainID.SEPOLIA]: {
        WETH: '0xD8a79b479b0c47675E3882A1DAA494b6775CE227', // Mock deployment
    },
    [EChainID.OPTIMISM_SEPOLIA]: {
        WETH: '0x4fB538Ed1a085200bD08F66083B72c0bfEb29112',
    },
    [EChainID.FUJI_AVALANCHE]: {
        WETH: '0x4404EF158716dfad1c2BEffE9c7c8Fa261684544',
    },
};

export const DEPLOY_CONFIG = {
    POST_LBP,
    USDO_UNISWAP_POOL,
    MISC,
};

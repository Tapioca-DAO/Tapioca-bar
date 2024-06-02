import { TPostDeployParams } from '../1-1-setupPostLbp';
import { DEPLOYMENT_NAMES } from '../DEPLOY_CONFIG';

export async function setupRegisterBBAndSGLMarketsInPenrose(
    params: TPostDeployParams,
) {
    const { hre, VM, deployed, calls, isHostChain, isSideChain } = params;

    const penroseDep = deployed.find(
        (e) => e.name === DEPLOYMENT_NAMES.PENROSE,
    )!;
    const penrose = await hre.ethers.getContractAt(
        'Penrose',
        penroseDep.address,
    );

    const registerMarket = async (
        marketType: 'BB' | 'SGL',
        mcMarketAddr: string,
        marketAddr: string,
        marketName: string,
    ) => {
        if ((await penrose.isMarketRegistered(marketAddr)) !== true) {
            console.log(
                `\t[+] Registering ${marketType} market ${marketName} ${marketAddr} in Penrose ${penroseDep.address}`,
            );
            calls.push({
                target: penrose.address,
                callData: penrose.interface.encodeFunctionData(
                    // @ts-ignore
                    marketType === 'BB' ? 'addBigBang' : 'addSingularity',
                    [mcMarketAddr, marketAddr],
                ),
                allowFailure: false,
            });
        }
    };

    if (isHostChain) {
        /**
         * BigBang markets
         */
        const bbMediumRiskMC = deployed.find(
            (e) => e.name === DEPLOYMENT_NAMES.BB_MEDIUM_RISK_MC,
        )!;
        const bbMtethMarket = deployed.find(
            (e) => e.name === DEPLOYMENT_NAMES.BB_MT_ETH_MARKET,
        )!;
        const bbtRethMarket = deployed.find(
            (e) => e.name === DEPLOYMENT_NAMES.BB_T_RETH_MARKET,
        )!;
        const bbtTwstethMarket = deployed.find(
            (e) => e.name === DEPLOYMENT_NAMES.BB_T_WST_ETH_MARKET,
        )!;

        await registerMarket(
            'BB',
            bbMediumRiskMC.address,
            bbMtethMarket.address,
            DEPLOYMENT_NAMES.BB_MT_ETH_MARKET,
        );
        await registerMarket(
            'BB',
            bbMediumRiskMC.address,
            bbtRethMarket.address,
            DEPLOYMENT_NAMES.BB_T_RETH_MARKET,
        );
        await registerMarket(
            'BB',
            bbMediumRiskMC.address,
            bbtTwstethMarket.address,
            DEPLOYMENT_NAMES.BB_T_WST_ETH_MARKET,
        );

        /**
         * Singularity markets
         */

        const sglMediumRiskMC = deployed.find(
            (e) => e.name === DEPLOYMENT_NAMES.SGL_MEDIUM_RISK_MC,
        )!;

        const sglSglpMarket = deployed.find(
            (e) => e.name === DEPLOYMENT_NAMES.SGL_S_GLP_MARKET,
        )!;

        await registerMarket(
            'SGL',
            sglMediumRiskMC.address,
            sglSglpMarket.address,
            DEPLOYMENT_NAMES.SGL_S_GLP_MARKET,
        );
    }

    if (isSideChain) {
        const sglMediumRiskMC = deployed.find(
            (e) => e.name === DEPLOYMENT_NAMES.SGL_MEDIUM_RISK_MC,
        )!;
        const sglSdaiMarket = deployed.find(
            (e) => e.name === DEPLOYMENT_NAMES.SGL_S_DAI_MARKET,
        )!;

        await registerMarket(
            'SGL',
            sglMediumRiskMC.address,
            sglSdaiMarket.address,
            DEPLOYMENT_NAMES.SGL_S_DAI_MARKET,
        );
    }
}

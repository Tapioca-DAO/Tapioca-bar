import { TPostDeployParams } from '../1-1-setupPostLbp';
import { DEPLOYMENT_NAMES } from '../DEPLOY_CONFIG';

export async function setupRegisterBBAsMinterBurnerInUsdo(
    params: TPostDeployParams,
) {
    const { hre, deployed, tag, isHostChain, isSideChain } = params;

    const registerMinterBurner = async (
        marketName: string,
        marketAddr: string,
    ) => {
        const usdoAddr = deployed.find(
            (e) => e.name === DEPLOYMENT_NAMES.USDO,
        )!.address;

        const usdo = await hre.ethers.getContractAt('Usdo', usdoAddr);

        if (
            (await usdo.allowedMinter(
                hre.SDK.chainInfo.lzChainId,
                marketAddr,
            )) !== true
        ) {
            console.log(
                `\t[+] Setting up ${marketName} as MINTER/BURNER in USDO`,
            );

            params.calls.push({
                target: usdo.address,
                callData: usdo.interface.encodeFunctionData('setMinterStatus', [
                    marketAddr,
                    true,
                ]),
                allowFailure: false,
            });
            params.calls.push({
                target: usdo.address,
                callData: usdo.interface.encodeFunctionData('setBurnerStatus', [
                    marketAddr,
                    true,
                ]),
                allowFailure: false,
            });
        }
    };

    if (isHostChain) {
        const bbmtEthMarketAddr = deployed.find(
            (e) => e.name === DEPLOYMENT_NAMES.BB_MT_ETH_MARKET,
        )!.address;
        const bbtRethMarketAddr = deployed.find(
            (e) => e.name === DEPLOYMENT_NAMES.BB_T_RETH_MARKET,
        )!.address;
        const bbtWstEthMarketAddr = deployed.find(
            (e) => e.name === DEPLOYMENT_NAMES.BB_T_WST_ETH_MARKET,
        )!.address;

        await registerMinterBurner(
            DEPLOYMENT_NAMES.BB_MT_ETH_MARKET,
            bbmtEthMarketAddr,
        );
        await registerMinterBurner(
            DEPLOYMENT_NAMES.BB_T_RETH_MARKET,
            bbtRethMarketAddr,
        );
        await registerMinterBurner(
            DEPLOYMENT_NAMES.BB_T_WST_ETH_MARKET,
            bbtWstEthMarketAddr,
        );
    }
}

import { TapiocaMulticall } from '@tapioca-sdk/typechain/tapioca-periphery';
import { IYieldBox } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { loadLocalContract } from 'tapioca-sdk';
import { deploy__LoadDeployments_Generic } from '../1-1-deployPostLbp';
import { DEPLOYMENT_NAMES } from '../DEPLOY_CONFIG';

/**
 * @notice - Deposit USDO and add SGL asset in YieldBox
 */
export async function depositUsdoYbAndAddSgl(params: {
    hre: HardhatRuntimeEnvironment;
    multicallAddr: string;
    marketName: string;
    calls: TapiocaMulticall.CallStruct[];
    tag: string;
    isTestnet: boolean;
}) {
    const { hre, multicallAddr, marketName, calls, tag, isTestnet } = params;
    const usdoStrat = loadLocalContract(
        hre,
        hre.SDK.chainInfo.chainId,
        DEPLOYMENT_NAMES.YB_USDO_ASSET_WITHOUT_STRATEGY,
        tag,
    ).address;
    const usdo = await hre.ethers.getContractAt(
        'Usdo',
        loadLocalContract(
            hre,
            hre.SDK.chainInfo.chainId,
            DEPLOYMENT_NAMES.USDO,
            tag,
        ).address,
    );
    const sglMarket = await hre.ethers.getContractAt(
        'Singularity',
        loadLocalContract(hre, hre.SDK.chainInfo.chainId, marketName, tag)
            .address,
    );
    const { yieldBox: ybAddress } = deploy__LoadDeployments_Generic({
        hre,
        tag,
        isTestnet,
    });

    const yieldBox = (await hre.ethers.getContractAt(
        'tapioca-periph/interfaces/yieldbox/IYieldBox.sol:IYieldBox',
        ybAddress,
    )) as IYieldBox;

    const amount = hre.ethers.utils.parseEther('1');
    const assetId = await yieldBox.ids(1, usdo.address, usdoStrat, 0);
    const shares = await yieldBox.toShare(assetId, amount, false);

    calls.push(
        // usdo.approve(yieldBox.address, amount);
        {
            target: usdo.address,
            callData: usdo.interface.encodeFunctionData('approve', [
                yieldBox.address,
                amount,
            ]),
            allowFailure: false,
        },
        // yieldBox.depositAsset(asset, multicallAddr, multicallAddr, amount, 0);
        {
            target: yieldBox.address,
            callData: yieldBox.interface.encodeFunctionData('depositAsset', [
                assetId,
                multicallAddr,
                multicallAddr,
                amount,
                0,
            ]),
            allowFailure: false,
        },
        // yieldBox.setApprovalForAsset(sglMarket.address, asset, true);
        {
            target: yieldBox.address,
            callData: yieldBox.interface.encodeFunctionData(
                'setApprovalForAsset',
                [sglMarket.address, assetId, true],
            ),
            allowFailure: false,
        },
        // sglMarket.lend(usdo.address, asset, amount);
        {
            target: sglMarket.address,
            callData: sglMarket.interface.encodeFunctionData('addAsset', [
                multicallAddr,
                multicallAddr,
                false,
                shares,
            ]),
            allowFailure: false,
        },
    );
}

export async function depositSglAssetYB(params: {
    hre: HardhatRuntimeEnvironment;
    tokenAddr: string;
    stratName: string;
    tapiocaMulticallAddr: string;
    calls: TapiocaMulticall.CallStruct[];
    tag: string;
    isTestnet: boolean;
}) {
    const {
        hre,
        tokenAddr,
        stratName,
        tapiocaMulticallAddr,
        calls,
        tag,
        isTestnet,
    } = params;

    const { yieldBox: ybAddress } = deploy__LoadDeployments_Generic({
        hre,
        tag,
        isTestnet,
    });

    const yieldboxContract = await hre.ethers.getContractAt(
        'YieldBox',
        ybAddress,
    );
    const strat = loadLocalContract(
        hre,
        hre.SDK.chainInfo.chainId,
        stratName,
        tag,
    ).address;

    const tokenContract = await hre.ethers.getContractAt('TOFT', tokenAddr);

    if (isTestnet) {
        console.log('[+] Testnet | Free minting and wrapping tAsset');
        const erc20Addr = await tokenContract.erc20();
        const erc20 = await hre.ethers.getContractAt('ERC20Mock', erc20Addr);
        const amountToMint = hre.ethers.utils.parseEther('1');

        // erc20.mintTo(tapiocaMulticallAddr, amountToMint);
        // erc20.approve(tokenAddr, amountToMint);
        // tokenContract.wrap(
        //     tapiocaMulticallAddr,
        //     tapiocaMulticallAddr,
        //     amountToMint,
        // );
        calls.push(
            {
                target: erc20Addr,
                callData: erc20.interface.encodeFunctionData('mintTo', [
                    tapiocaMulticallAddr,
                    amountToMint,
                ]),
                allowFailure: false,
            },
            {
                target: erc20Addr,
                callData: erc20.interface.encodeFunctionData('approve', [
                    tokenAddr,
                    amountToMint,
                ]),
                allowFailure: false,
            },
            {
                target: tokenAddr,
                callData: tokenContract.interface.encodeFunctionData('wrap', [
                    tapiocaMulticallAddr,
                    tapiocaMulticallAddr,
                    amountToMint,
                ]),
                allowFailure: false,
            },
        );
    }

    const asset = await yieldboxContract.ids(1, tokenAddr, strat, 0);
    const amount = await tokenContract.balanceOf(tapiocaMulticallAddr);
    console.log(
        '[+] Depositing asset in YieldBox',
        await tokenContract.name(),
        tokenAddr,
        hre.ethers.utils.formatEther(amount),
    );

    calls.push(
        {
            target: tokenAddr,
            callData: tokenContract.interface.encodeFunctionData('approve', [
                ybAddress,
                amount,
            ]),
            allowFailure: false,
        },
        {
            target: ybAddress,
            callData: yieldboxContract.interface.encodeFunctionData(
                'depositAsset',
                [asset, tapiocaMulticallAddr, tapiocaMulticallAddr, amount, 0],
            ),
            allowFailure: false,
        },
    );
}

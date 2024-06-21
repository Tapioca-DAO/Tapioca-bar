import { TapiocaMulticall } from '@tapioca-sdk/typechain/tapioca-periphery';
import { IYieldBox } from '@typechain/index';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { loadLocalContract } from 'tapioca-sdk';
import { deploy__LoadDeployments_Generic } from '../1-1-deployPostLbp';
import { DEPLOYMENT_NAMES } from '../DEPLOY_CONFIG';
import { BigNumberish } from 'ethers';

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
    amount: BigNumberish;
}) {
    const { hre, multicallAddr, marketName, calls, tag, isTestnet, amount } =
        params;
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
    const { yieldBox: ybAddress, pearlmit: pearlmitAddr } =
        deploy__LoadDeployments_Generic({
            hre,
            tag,
            isTestnet,
        });

    const pearlmit = await hre.ethers.getContractAt('Pearlmit', pearlmitAddr);
    const yieldBox = (await hre.ethers.getContractAt(
        'tapioca-periph/interfaces/yieldbox/IYieldBox.sol:IYieldBox',
        ybAddress,
    )) as IYieldBox;

    const assetId = await yieldBox.ids(1, usdo.address, usdoStrat, 0);
    const shares = await yieldBox.toShare(assetId, amount, false);

    console.log(
        '[+] Depositing USDO in YieldBox',
        hre.ethers.utils.formatEther(amount),
    );

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
        // yieldbox.setApprovalForAll(pearlmit.address, true);
        {
            target: yieldBox.address,
            callData: yieldBox.interface.encodeFunctionData(
                'setApprovalForAll',
                [pearlmit.address, true],
            ),
            allowFailure: false,
        },
        // pearlmit.approve(20, usdo.address, 0, sglMarket.address, shares, blockTimestamp + 1800);
        {
            target: pearlmit.address,
            callData: pearlmit.interface.encodeFunctionData('approve', [
                1155,
                yieldBox.address,
                assetId,
                sglMarket.address,
                shares,
                (await hre.ethers.provider.getBlock('latest')).timestamp + 1800,
            ]),
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
    freeMint?: boolean;
}) {
    const {
        hre,
        tokenAddr,
        stratName,
        tapiocaMulticallAddr,
        calls,
        tag,
        isTestnet,
        freeMint,
    } = params;

    const { yieldBox: ybAddress, pearlmit } = deploy__LoadDeployments_Generic({
        hre,
        tag,
        isTestnet,
    });

    const pearlmitContract = await hre.ethers.getContractAt(
        'Pearlmit',
        pearlmit,
    );

    const yieldboxContract = await hre.ethers.getContractAt(
        'tapioca-periph/interfaces/yieldbox/IYieldBox.sol:IYieldBox',
        ybAddress,
    );
    const strat = loadLocalContract(
        hre,
        hre.SDK.chainInfo.chainId,
        stratName,
        tag,
    ).address;

    const tokenContract = await hre.ethers.getContractAt('TOFT', tokenAddr);

    const blockTimestamp = await (
        await hre.ethers.provider.getBlock('latest')
    ).timestamp;
    if (isTestnet && freeMint) {
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
                    pearlmit,
                    amountToMint,
                ]),
                allowFailure: false,
            },
            {
                target: pearlmit,
                callData: pearlmitContract.interface.encodeFunctionData(
                    'approve',
                    [
                        20,
                        erc20Addr,
                        0,
                        tokenAddr,
                        amountToMint,
                        blockTimestamp + 1800,
                    ],
                ),
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
    if (amount.eq(0)) {
        throw new Error('[-] No balance to deposit');
    }

    calls.push(
        {
            target: tokenAddr,
            callData: tokenContract.interface.encodeFunctionData('approve', [
                pearlmit,
                amount,
            ]),
            allowFailure: false,
        },
        {
            target: pearlmit,
            callData: pearlmitContract.interface.encodeFunctionData('approve', [
                20,
                tokenAddr,
                0,
                ybAddress,
                amount,
                blockTimestamp + 1800,
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

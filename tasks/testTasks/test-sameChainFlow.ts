import { ContractTransaction } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { BigBang, Singularity } from '@tapioca-sdk//typechain/tapioca-bar';
import { ERC20Mock } from '@tapioca-sdk//typechain/tapioca-mocks';
import { MagnetarV2 } from '@tapioca-sdk//typechain/tapioca-periphery';
import { TapiocaOFT } from '@tapioca-sdk//typechain/tapiocaz';
import { YieldBox } from '@tapioca-sdk//typechain/YieldBox';
import ERC20MockArtifact from '@tapioca-sdk/artifacts/tapioca-mocks/ERC20Mock.json';
import TapiocaOFTArtifact from '@tapioca-sdk/artifacts/tapiocaz/TapiocaOFT.json';
import MagnetarArtifact from '@tapioca-sdk/artifacts/tapioca-periphery/MagnetarV2.json';
import YieldBoxArtifact from '@tapioca-sdk/artifacts/YieldBox/contracts/YieldBox.sol/YieldBox.json';

export const sameChainFlowTest__task = async (
    taskArgs: {
        bbMarket: string;
        sglMarket: string;
        magnetarAddress: string;
    },
    hre: HardhatRuntimeEnvironment,
) => {
    await testFlowByUsingIndividualActions(taskArgs, hre);

    await testFlowByUsingMagnetar(taskArgs, hre);

    console.log('\n[+] Done');
};

const testFlowByUsingMagnetar = async (
    taskArgs: {
        bbMarket: string;
        sglMarket: string;
        magnetarAddress: string;
    },
    hre: HardhatRuntimeEnvironment,
) => {
    const signer = (await hre.ethers.getSigners())[0];

    console.log('\n[+] Testing through Magnetar');

    /*
        BigBang actions
    */
    console.log('Initializing setup');
    const singularity = (await hre.ethers.getContractAt(
        'Singularity',
        taskArgs.sglMarket,
    )) as Singularity;
    const bigBang = (await hre.ethers.getContractAt(
        'BigBang',
        taskArgs.bbMarket,
    )) as BigBang;

    const magnetar = new hre.ethers.Contract(
        taskArgs.magnetarAddress,
        MagnetarArtifact.abi,
        signer,
    ).connect(signer) as MagnetarV2;

    const ybAddress = await bigBang.yieldBox();
    const yieldBox = new hre.ethers.Contract(
        ybAddress,
        YieldBoxArtifact.abi,
        signer,
    ).connect(signer) as YieldBox;

    const bbCollateralOFTAddress = await bigBang.collateral();
    const bbCollateralOFT = new hre.ethers.Contract(
        bbCollateralOFTAddress,
        TapiocaOFTArtifact.abi,
        signer,
    ).connect(signer) as TapiocaOFT;

    const bbCollateralAddress = await bbCollateralOFT.erc20();
    const bbCollateral = new hre.ethers.Contract(
        bbCollateralAddress,
        ERC20MockArtifact.abi,
        signer,
    ).connect(signer) as ERC20Mock;

    const sglCollateralOFTAddress = await singularity.collateral();
    const sglCollateralOFT = new hre.ethers.Contract(
        sglCollateralOFTAddress,
        TapiocaOFTArtifact.abi,
        signer,
    ).connect(signer) as TapiocaOFT;

    const sglCollateralAddress = await sglCollateralOFT.erc20();
    const sglCollateral = new hre.ethers.Contract(
        sglCollateralAddress,
        ERC20MockArtifact.abi,
        signer,
    ).connect(signer) as ERC20Mock;

    const bbAmount = await hre.ethers.utils.parseEther('1');
    const bbShare = await yieldBox.toShare(
        await bigBang.collateralId(),
        bbAmount,
        false,
    );
    const sglCollateralAmount = await hre.ethers.utils.parseEther('1');
    const sglCollateralShare = await yieldBox.toShare(
        await singularity.collateralId(),
        sglCollateralAmount,
        false,
    );
    const sglBorrowAmount = await hre.ethers.utils.parseEther('0.1');
    const sglBorrowShare = await yieldBox.toShare(
        await singularity.assetId(),
        sglBorrowAmount,
        false,
    );

    try {
        console.log('Free mint BB collateral underlying token');
        const bbFreeMintLimit = await bbCollateral.mintLimit();
        const freeMintTx = await bbCollateral.freeMint(bbFreeMintLimit);
        const freeMintReceipt = await freeMintTx.wait(3);
        if (!freeMintReceipt) {
            throw new Error('[-] Free mint for BB failed');
        }
    } catch {
        console.log('Free mint failed');
    }

    const bbWrapEncodedTx = bbCollateralOFT.interface.encodeFunctionData(
        'wrap',
        [signer.address, signer.address, bbAmount],
    );
    const bbYbDepositEncodedTx = yieldBox.interface.encodeFunctionData(
        'depositAsset',
        [
            await bigBang.collateralId(),
            signer.address,
            signer.address,
            bbAmount,
            0,
        ],
    );
    const bbAddCollateralEncodedTx = bigBang.interface.encodeFunctionData(
        'addCollateral',
        [signer.address, signer.address, false, 0, bbShare],
    );
    const bbMintEncodedTx = bigBang.interface.encodeFunctionData('borrow', [
        signer.address,
        signer.address,
        bbAmount,
    ]);

    const receiverSplit = signer.address.split('0x');
    const bbWithdrawToEncodedTx = magnetar.interface.encodeFunctionData(
        'withdrawTo',
        [
            yieldBox.address,
            signer.address,
            await bigBang.assetId(),
            0,
            '0x'.concat(receiverSplit[1].padStart(64, '0')),
            0,
            bbShare,
            hre.ethers.utils.toUtf8Bytes(''),
            signer.address,
            0,
        ],
    );

    let calls = [
        {
            id: 300,
            target: bbCollateralOFT.address,
            value: 0,
            allowFailure: false,
            call: bbWrapEncodedTx,
        },
        {
            id: 100,
            target: yieldBox.address,
            value: 0,
            allowFailure: false,
            call: bbYbDepositEncodedTx,
        },
        {
            id: 200,
            target: bigBang.address,
            value: 0,
            allowFailure: false,
            call: bbAddCollateralEncodedTx,
        },
        {
            id: 201,
            target: bigBang.address,
            value: 0,
            allowFailure: false,
            call: bbMintEncodedTx,
        },
        {
            id: 102,
            target: yieldBox.address,
            value: 0,
            allowFailure: false,
            call: bbWithdrawToEncodedTx,
        },
    ];

    await bbCollateral.approve(bbCollateralOFTAddress, bbAmount);
    await bbCollateralOFT.approve(yieldBox.address, bbAmount);
    await bbCollateralOFT.approve(magnetar.address, bbAmount);
    await yieldBox.setApprovalForAll(bigBang.address, true);
    await yieldBox.setApprovalForAll(magnetar.address, true);
    await bigBang.approveBorrow(magnetar.address, bbShare.mul(2));

    console.log('Executing BB action set');
    const bbBurstTx = await magnetar
        .connect(signer)
        .burst(calls, { gasLimit: 4000000 });
    const bbBurstReceipt = await bbBurstTx.wait(3);
    if (!bbBurstReceipt) {
        throw new Error('[-] BB action set failed');
    }

    try {
        console.log('Free mint SGL collateral underlying token');
        const sglCollateralMintLimit = await sglCollateral.mintLimit();
        const sglFreeMintTx = await sglCollateral.freeMint(
            sglCollateralMintLimit,
        );
        const sglFreeMintReceipt = await sglFreeMintTx.wait(3);
        if (!sglFreeMintReceipt) {
            throw new Error('[-] Free mint for SGL failed');
        }
    } catch {
        console.log('Free mint failed');
    }

    const usdo = await hre.ethers.getContractAt('USDO', await bigBang.asset());
    const lendDeposiToYbEncodedTx = yieldBox.interface.encodeFunctionData(
        'depositAsset',
        [
            await singularity.assetId(),
            signer.address,
            signer.address,
            bbAmount,
            0,
        ],
    );
    const addAssetEncodedTx = singularity.interface.encodeFunctionData(
        'addAsset',
        [signer.address, signer.address, false, bbShare],
    );
    calls = [
        {
            id: 100,
            target: yieldBox.address,
            value: 0,
            allowFailure: false,
            call: lendDeposiToYbEncodedTx,
        },
        {
            id: 203,
            target: singularity.address,
            value: 0,
            allowFailure: false,
            call: addAssetEncodedTx,
        },
    ];
    await usdo.approve(yieldBox.address, bbAmount);
    await yieldBox.setApprovalForAll(singularity.address, true);
    await singularity.approve(magnetar.address, bbShare);
    console.log('Executing SGL lend action set');
    const sglLendBurstTx = await magnetar
        .connect(signer)
        .burst(calls, { gasLimit: 4000000 });
    const sglLendBurstReceipt = await sglLendBurstTx.wait(3);
    if (!sglLendBurstReceipt) {
        throw new Error('[-] SGL lend action set failed');
    }

    const sglWrapEncodedTx = sglCollateralOFT.interface.encodeFunctionData(
        'wrap',
        [signer.address, signer.address, sglCollateralAmount],
    );
    const sglYbDepositEncodedTx = yieldBox.interface.encodeFunctionData(
        'depositAsset',
        [
            await singularity.collateralId(),
            signer.address,
            signer.address,
            sglCollateralAmount,
            0,
        ],
    );
    const sglAddCollateralEncodedTx = singularity.interface.encodeFunctionData(
        'addCollateral',
        [signer.address, signer.address, false, 0, sglCollateralShare],
    );
    const sgBorrowEncodedTx = singularity.interface.encodeFunctionData(
        'borrow',
        [signer.address, signer.address, sglBorrowAmount],
    );

    const sglWithdrawToEncodedTx = magnetar.interface.encodeFunctionData(
        'withdrawTo',
        [
            yieldBox.address,
            signer.address,
            await singularity.assetId(),
            0,
            '0x'.concat(receiverSplit[1].padStart(64, '0')),
            0,
            sglBorrowShare,
            hre.ethers.utils.toUtf8Bytes(''),
            signer.address,
            0,
        ],
    );

    calls = [
        {
            id: 300,
            target: sglCollateralOFT.address,
            value: 0,
            allowFailure: false,
            call: sglWrapEncodedTx,
        },
        {
            id: 100,
            target: yieldBox.address,
            value: 0,
            allowFailure: false,
            call: sglYbDepositEncodedTx,
        },
        {
            id: 200,
            target: singularity.address,
            value: 0,
            allowFailure: false,
            call: sglAddCollateralEncodedTx,
        },
        {
            id: 201,
            target: singularity.address,
            value: 0,
            allowFailure: false,
            call: sgBorrowEncodedTx,
        },
        {
            id: 102,
            target: yieldBox.address,
            value: 0,
            allowFailure: false,
            call: sglWithdrawToEncodedTx,
        },
    ];

    await sglCollateral.approve(sglCollateralOFTAddress, sglCollateralAmount);
    await sglCollateralOFT.approve(yieldBox.address, sglCollateralAmount);
    await sglCollateralOFT.approve(magnetar.address, sglCollateralAmount);
    await yieldBox.setApprovalForAll(singularity.address, true);
    await yieldBox.setApprovalForAll(magnetar.address, true);
    await singularity.approveBorrow(
        magnetar.address,
        sglCollateralShare.mul(2),
    );

    console.log('Executing SGL action set');
    const sglBurstTx = await magnetar
        .connect(signer)
        .burst(calls, { gasLimit: 4000000 });
    const sglBurstReceipt = await sglBurstTx.wait(3);
    if (!sglBurstReceipt) {
        throw new Error('[-] SGL action set failed');
    }
};

const testFlowByUsingIndividualActions = async (
    taskArgs: {
        bbMarket: string;
        sglMarket: string;
        magnetarAddress: string;
    },
    hre: HardhatRuntimeEnvironment,
) => {
    const signer = (await hre.ethers.getSigners())[0];

    console.log('\n[+] Testing individual actions');

    /*
        BigBang actions
    */
    console.log('Initializing setup');
    const singularity = (await hre.ethers.getContractAt(
        'Singularity',
        taskArgs.sglMarket,
    )) as Singularity;
    const bigBang = (await hre.ethers.getContractAt(
        'BigBang',
        taskArgs.bbMarket,
    )) as BigBang;

    const ybAddress = await bigBang.yieldBox();
    const yieldBox = new hre.ethers.Contract(
        ybAddress,
        YieldBoxArtifact.abi,
        signer,
    ).connect(signer) as YieldBox;

    const bbCollateralOFTAddress = await bigBang.collateral();
    const bbCollateralOFT = new hre.ethers.Contract(
        bbCollateralOFTAddress,
        TapiocaOFTArtifact.abi,
        signer,
    ).connect(signer) as TapiocaOFT;

    const bbCollateralAddress = await bbCollateralOFT.erc20();
    const bbCollateral = new hre.ethers.Contract(
        bbCollateralAddress,
        ERC20MockArtifact.abi,
        signer,
    ).connect(signer) as ERC20Mock;

    const bbBalance = await bbCollateral.balanceOf(signer.address);
    const bbOftBalance = await bbCollateralOFT.balanceOf(signer.address);
    const bbOftBalanceYb = await yieldBox.amountOf(
        signer.address,
        await bigBang.collateralId(),
    );
    const existingBBCollateral = await yieldBox.toAmount(
        await bigBang.collateralId(),
        await bigBang.userCollateralShare(signer.address),
        false,
    );

    //  Get tokens
    const bbAmount = await hre.ethers.utils.parseEther('1');
    try {
        console.log('Free mint BB collateral underlying token');
        const bbCollateralMintLimit = await bbCollateral.mintLimit();
        const freeMintTx = await bbCollateral.freeMint(bbCollateralMintLimit);
        const freeMintReceipt = await freeMintTx.wait(3);
        if (!freeMintReceipt) {
            throw new Error('[-] Free mint for BB failed');
        }
    } catch {
        console.log('Free mint failed');
    }

    // Wrap
    console.log('Wrap BB collateral underlying token');
    await bbCollateral.approve(bbCollateralOFTAddress, bbAmount);
    const wrapBBTx = await bbCollateralOFT.wrap(
        signer.address,
        signer.address,
        bbAmount,
    );
    const wrapBBReceipt = await wrapBBTx.wait(3);
    if (!wrapBBReceipt) {
        throw new Error('[-] Wrap BB collateral failed');
    }

    // Add to YB
    console.log('Add BB collateral tokens to YB');
    await bbCollateralOFT.approve(yieldBox.address, bbAmount);
    const ybBBDepositTx = await yieldBox.depositAsset(
        await bigBang.collateralId(),
        signer.address,
        signer.address,
        bbAmount,
        0,
    );
    const ybBBDepositReceipt = await ybBBDepositTx.wait(3);
    if (!ybBBDepositReceipt) {
        throw new Error('[-] YieldBox BB collateral failed');
    }

    // Add collateral
    const bbShare = await yieldBox.toShare(
        await bigBang.collateralId(),
        bbAmount,
        false,
    );
    const isBBApprovedForAll = await yieldBox.isApprovedForAll(
        signer.address,
        bigBang.address,
    );
    if (!isBBApprovedForAll) {
        console.log('BB not approved for all. Approve in progress');
        await yieldBox.setApprovalForAll(bigBang.address, true);
    } else {
        console.log('BB approved for all on YB');
    }

    console.log('Add collateral in progress');
    await bigBang.approveBorrow(signer.address, bbShare);
    const bbAddCollateralTx = await bigBang.addCollateral(
        signer.address,
        signer.address,
        false,
        0,
        bbShare,
    );
    const addCollateralReceipt = await bbAddCollateralTx.wait(3);
    if (!addCollateralReceipt) {
        throw new Error('[-] BB add collateral failed');
    }

    // Borrow USDO
    console.log('Minting USDO');
    await bigBang.approveBorrow(signer.address, bbShare);
    const bbBorrowTx = await bigBang.borrow(
        signer.address,
        signer.address,
        bbAmount,
    );
    const bbBorrowReceipt = await bbBorrowTx.wait(3);
    if (!bbBorrowReceipt) {
        throw new Error('[-] BB borrow failed');
    }

    await yieldBox.withdraw(
        await bigBang.assetId(),
        signer.address,
        signer.address,
        0,
        bbShare,
    );

    let usdoYBBalance = await yieldBox.amountOf(
        signer.address,
        await bigBang.assetId(),
    );
    if (usdoYBBalance.eq(bbAmount)) {
        console.log('Withdrawing USDO from YB');
        const withdratTx = await yieldBox.withdraw(
            await bigBang.assetId(),
            signer.address,
            signer.address,
            bbAmount,
            0,
        );
        const withdrawReceipt = await withdratTx.wait(3);
        if (!withdrawReceipt) {
            throw new Error('[-] YB USDO withdraw failed');
        }
    }

    /*
        SGL actions
    */
    const usdo = await hre.ethers.getContractAt('USDO', await bigBang.asset());
    const usdoBalanceOfSigner = await usdo.balanceOf(signer.address);

    // Add USDO to YB
    if (usdoBalanceOfSigner.eq(bbAmount)) {
        console.log('Adding USDO to YB');
        await usdo.approve(yieldBox.address, bbAmount);
        const depositAssetTx = await yieldBox.depositAsset(
            await bigBang.assetId(),
            signer.address,
            signer.address,
            bbAmount,
            0,
        );
        const depositAssetReceipt = await depositAssetTx.wait(3);
        if (!depositAssetReceipt) {
            throw new Error('[-] USDO YB deposit failed');
        }
    }

    const isSGLApprovedForAll = await yieldBox.isApprovedForAll(
        signer.address,
        singularity.address,
    );
    if (!isSGLApprovedForAll) {
        console.log('SGL not approved for all. Approve in progress');
        await yieldBox.setApprovalForAll(singularity.address, true);
    } else {
        console.log('SGL approved for all on YB');
    }

    // Add asset
    usdoYBBalance = await yieldBox.amountOf(
        signer.address,
        await bigBang.assetId(),
    );
    if (usdoYBBalance.eq(bbAmount)) {
        console.log('Add asset to SGL');
        const usdoYBShare = await yieldBox.toShare(
            await bigBang.assetId(),
            usdoYBBalance,
            false,
        );

        await singularity.approve(signer.address, usdoYBShare);
        const addAssetTx = await singularity.addAsset(
            signer.address,
            signer.address,
            false,
            usdoYBShare,
        );
        const addAssetReceipt = await addAssetTx.wait(3);
        if (!addAssetReceipt) {
            throw new Error('[-] Add USDO to SGL failed');
        }
    }

    //  Get tokens
    const sglCollateralOFTAddress = await singularity.collateral();
    const sglCollateralOFT = new hre.ethers.Contract(
        sglCollateralOFTAddress,
        TapiocaOFTArtifact.abi,
        signer,
    ).connect(signer) as TapiocaOFT;

    const sglCollateralAddress = await sglCollateralOFT.erc20();
    const sglCollateral = new hre.ethers.Contract(
        sglCollateralAddress,
        ERC20MockArtifact.abi,
        signer,
    ).connect(signer) as ERC20Mock;

    const sglBalance = await sglCollateral.balanceOf(signer.address);
    const sglOftBalance = await sglCollateralOFT.balanceOf(signer.address);
    const sglOftBalanceYb = await yieldBox.amountOf(
        signer.address,
        await singularity.collateralId(),
    );
    const existingSGLCollateral = await yieldBox.toAmount(
        await singularity.collateralId(),
        await singularity.userCollateralShare(signer.address),
        false,
    );
    const sglCollateralAmount = await hre.ethers.utils.parseEther('1');

    try {
        console.log('Free mint SGL collateral underlying token');
        const sglCollateralMintLimit = await sglCollateral.mintLimit();
        const freeMintTx = await sglCollateral.freeMint(sglCollateralMintLimit);
        const freeMintReceipt = await freeMintTx.wait(3);
        if (!freeMintReceipt) {
            throw new Error('[-] Free mint for SGL failed');
        }
    } catch {
        console.log('Free mint failed');
    }

    // Wrap
    console.log('Wrap SGL collateral underlying token');
    await sglCollateral.approve(sglCollateralOFTAddress, sglCollateralAmount);
    const wrapTx = await sglCollateralOFT.wrap(
        signer.address,
        signer.address,
        sglCollateralAmount,
    );
    const wrapReceipt = await wrapTx.wait(3);
    if (!wrapReceipt) {
        throw new Error('[-] Wrap SGL collateral failed');
    }

    // Add to YB
    console.log('Add SGL collateral tokens to YB');
    await sglCollateralOFT.approve(yieldBox.address, sglCollateralAmount);
    const ybDepositTx = await yieldBox.depositAsset(
        await singularity.collateralId(),
        signer.address,
        signer.address,
        sglCollateralAmount,
        0,
    );
    const ybDepositReceipt = await ybDepositTx.wait(3);
    if (!ybDepositReceipt) {
        throw new Error('[-] YieldBox SGL collateral failed');
    }

    // Add collateral
    const sglCollateralShare = await yieldBox.toShare(
        await singularity.collateralId(),
        sglCollateralAmount,
        false,
    );
    console.log('Add SGL collateral in progress');
    await singularity.approveBorrow(signer.address, sglCollateralShare);
    const sglAddCollateralTx = await singularity.addCollateral(
        signer.address,
        signer.address,
        false,
        0,
        sglCollateralShare,
    );
    const addSGLCollateralReceipt = await sglAddCollateralTx.wait(3);
    if (!addSGLCollateralReceipt) {
        throw new Error('[-] SGL add collateral failed');
    }

    // Borrow
    const sglBorrowAmount = await hre.ethers.utils.parseEther('0.1');
    const sglBorrowShare = await yieldBox.toShare(
        await singularity.assetId(),
        sglBorrowAmount,
        false,
    );

    console.log('Borrow from SGL');
    await singularity.approveBorrow(signer.address, sglBorrowShare);
    const sglBorrowTx = await singularity.borrow(
        signer.address,
        signer.address,
        sglBorrowAmount,
    );
    const sglBorrowReceipt = await sglBorrowTx.wait(3);
    if (!sglBorrowReceipt) {
        throw new Error('[-] SGL borrow failed');
    }

    await yieldBox.withdraw(
        await bigBang.assetId(),
        signer.address,
        signer.address,
        0,
        sglBorrowShare,
    );

    // Withdraw
    const sglAssetYBBalance = await yieldBox.amountOf(
        signer.address,
        await singularity.assetId(),
    );
    if (sglAssetYBBalance.eq(sglBorrowAmount)) {
        console.log('Withdrawing SGL asset from YB');
        const withdratTx = await yieldBox.withdraw(
            await singularity.assetId(),
            signer.address,
            signer.address,
            sglBorrowAmount,
            0,
        );
        const withdrawReceipt = await withdratTx.wait(3);
        if (!withdrawReceipt) {
            throw new Error('[-] YB SGL asset withdraw failed');
        }
    }

    // Add to YB
    const sglAsset = await hre.ethers.getContractAt(
        'USDO',
        await singularity.asset(),
    );
    const sglAssetSignerBalance = await sglAsset.balanceOf(signer.address);
    if (sglAssetSignerBalance.gt(0)) {
        console.log('Add SGL asset to YB for repayment');
        await sglAsset.approve(yieldBox.address, sglBorrowAmount);
        const ybDepositTx = await yieldBox.depositAsset(
            await singularity.assetId(),
            signer.address,
            signer.address,
            sglBorrowAmount,
            0,
        );
        const ybDepositReceipt = await ybDepositTx.wait(3);
        if (!ybDepositReceipt) {
            throw new Error('[-] YB SGL asset deposit failed');
        }
    }

    // Repay
    const sglAssetInYbBalance = await yieldBox.amountOf(
        signer.address,
        await singularity.assetId(),
    );
    if (sglAssetInYbBalance.gt(0)) {
        const repayTx = await singularity.repay(
            signer.address,
            signer.address,
            false,
            sglBorrowAmount.div(2),
        );
        const repayReceipt = await repayTx.wait(3);
        if (!repayReceipt) {
            throw new Error('[-] YB SGL asset repay failed');
        }
    }
};

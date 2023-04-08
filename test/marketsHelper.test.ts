import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import TapiocaOFTMockArtifact from '../gitsub_tapioca-sdk/src/artifacts/tapiocaz/contracts/mocks/TapiocaOFTMock.sol/TapiocaOFTMock.json';
import {
    BN,
    createTokenEmptyStrategy,
    getSGLPermitSignature,
    register,
} from './test.utils';

import { TapiocaOFTMock__factory } from '../gitsub_tapioca-sdk/src/typechain/TapiocaZ/factories/mocks/TapiocaOFTMock__factory';
import { BaseTOFT } from '../typechain';

import hre from 'hardhat';

describe('MarketsHelper test', () => {
    it('Should deposit to yieldBox & add asset to singularity through SGL helper', async () => {
        const {
            weth,
            yieldBox,
            wethUsdcSingularity,
            deployer,
            initContracts,
            marketsHelper,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Singularity: below minimum`

        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        await weth.approve(marketsHelper.address, mintVal);
        await marketsHelper.depositAndAddAsset(
            wethUsdcSingularity.address,
            deployer.address,
            mintVal,
            true,
        );
    });

    it('should deposit, add collateral and borrow through SGL helper', async () => {
        const {
            weth,
            yieldBox,
            wethUsdcSingularity,
            deployer,
            usdc,
            eoa1,
            initContracts,
            marketsHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Singularity: below minimum`

        const assetId = await wethUsdcSingularity.assetId();
        const collateralId = await wethUsdcSingularity.collateralId();

        const borrowAmount = ethers.BigNumber.from((1e17).toString());
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We lend WETH as deployer
        await approveTokensAndSetBarApproval();
        await wethDepositAndAddAsset(wethMintVal);

        await usdc.connect(eoa1).approve(marketsHelper.address, usdcMintVal);
        await wethUsdcSingularity
            .connect(eoa1)
            .approveBorrow(marketsHelper.address, ethers.constants.MaxUint256);
        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                eoa1.address,
                usdcMintVal,
                borrowAmount,
                true,
                false,
                ethers.utils.toUtf8Bytes(''),
            );
    });

    it('should deposit, add collateral, borrow and withdraw through SGL helper', async () => {
        const {
            weth,
            deployer,
            wethUsdcSingularity,
            usdc,
            eoa1,
            initContracts,
            marketsHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
            yieldBox,
        } = await loadFixture(register);

        const collateralId = await wethUsdcSingularity.collateralId();

        await initContracts(); // To prevent `Singularity: below minimum`

        const borrowAmount = ethers.BigNumber.from((1e17).toString());
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We lend WETH as deployer
        await approveTokensAndSetBarApproval();
        await wethDepositAndAddAsset(wethMintVal);

        await usdc.connect(eoa1).approve(marketsHelper.address, usdcMintVal);
        await wethUsdcSingularity
            .connect(eoa1)
            .approveBorrow(marketsHelper.address, ethers.constants.MaxUint256);

        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                eoa1.address,
                usdcMintVal,
                borrowAmount,
                true,
                true,
                encodeMarketHelperWithdrawData(false, 0, eoa1.address, '0x00'),
            );
    });

    it('should deposit, add collateral, borrow and withdraw through SGL helper without withdraw', async () => {
        const {
            weth,
            deployer,
            wethUsdcSingularity,
            usdc,
            eoa1,
            initContracts,
            marketsHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
            yieldBox,
        } = await loadFixture(register);

        const collateralId = await wethUsdcSingularity.collateralId();

        await initContracts(); // To prevent `Singularity: below minimum`

        const borrowAmount = ethers.BigNumber.from((1e17).toString());
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We lend WETH as deployer
        await approveTokensAndSetBarApproval();
        await wethDepositAndAddAsset(wethMintVal);

        await usdc.connect(eoa1).approve(marketsHelper.address, usdcMintVal);
        await wethUsdcSingularity
            .connect(eoa1)
            .approveBorrow(marketsHelper.address, ethers.constants.MaxUint256);
        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                eoa1.address,
                usdcMintVal,
                borrowAmount,
                true,
                false,
                ethers.utils.toUtf8Bytes(''),
            );
    });

    it('should add collateral, borrow and withdraw through SGL helper', async () => {
        const {
            weth,
            deployer,
            wethUsdcSingularity,
            usdc,
            usdcAssetId,
            eoa1,
            initContracts,
            marketsHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
            yieldBox,
            usdcDepositAndAddCollateral,
        } = await loadFixture(register);

        const collateralId = await wethUsdcSingularity.collateralId();
        const assetId = await wethUsdcSingularity.assetId();
        await initContracts(); // To prevent `Singularity: below minimum`

        const borrowAmount = ethers.BigNumber.from((1e17).toString());
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We lend WETH as deployer
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);
        await wethDepositAndAddAsset(wethMintVal);

        await usdc.connect(eoa1).approve(marketsHelper.address, usdcMintVal);
        await wethUsdcSingularity
            .connect(eoa1)
            .approve(marketsHelper.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                usdcAssetId,
                eoa1.address,
                eoa1.address,
                usdcMintVal,
                0,
            );

        await wethUsdcSingularity
            .connect(eoa1)
            .approveBorrow(marketsHelper.address, ethers.constants.MaxUint256);
        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                eoa1.address,
                usdcMintVal,
                borrowAmount,
                false,
                true,
                ethers.utils.defaultAbiCoder.encode(
                    ['bool', 'uint16', 'bytes32', 'bytes'],
                    [
                        false,
                        0,
                        '0x00000000000000000000000022076fba2ea9650a028aa499d0444c4aa9af1bf8',
                        ethers.utils.solidityPack(
                            ['uint16', 'uint256'],
                            [1, 1000000],
                        ),
                    ],
                ),
            );
    });

    it('should deposit and repay through SGL helper', async () => {
        const {
            weth,
            wethUsdcSingularity,
            usdc,
            eoa1,
            deployer,
            initContracts,
            marketsHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
            yieldBox,
        } = await loadFixture(register);

        const assetId = await wethUsdcSingularity.assetId();
        const collateralId = await wethUsdcSingularity.collateralId();
        await initContracts(); // To prevent `Singularity: below minimum`

        const borrowAmount = ethers.BigNumber.from((1e17).toString());
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We lend WETH as deployer
        await approveTokensAndSetBarApproval();
        await wethDepositAndAddAsset(wethMintVal);

        await usdc.connect(eoa1).approve(marketsHelper.address, usdcMintVal);
        await wethUsdcSingularity
            .connect(eoa1)
            .approveBorrow(marketsHelper.address, ethers.constants.MaxUint256);
        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                eoa1.address,
                usdcMintVal,
                borrowAmount,
                true,
                true,
                encodeMarketHelperWithdrawData(false, 0, eoa1.address, '0x00'),
            );

        const userBorrowPart = await wethUsdcSingularity.userBorrowPart(
            eoa1.address,
        );
        await weth.connect(eoa1).freeMint(userBorrowPart.mul(2));

        await weth
            .connect(eoa1)
            .approve(marketsHelper.address, userBorrowPart.mul(2));
        await wethUsdcSingularity
            .connect(eoa1)
            .approve(
                marketsHelper.address,
                await yieldBox.toShare(assetId, userBorrowPart.mul(2), true),
            );
        await marketsHelper
            .connect(eoa1)
            .depositAndRepay(
                wethUsdcSingularity.address,
                userBorrowPart.mul(2),
                userBorrowPart,
                true,
            );
    });

    it('should deposit, repay, remove collateral and withdraw through SGL helper', async () => {
        const {
            usdcAssetId,
            weth,
            wethUsdcSingularity,
            usdc,
            deployer,
            eoa1,
            initContracts,
            yieldBox,
            marketsHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
        } = await loadFixture(register);

        const collateralId = await wethUsdcSingularity.collateralId();
        await initContracts(); // To prevent `Singularity: below minimum`

        const borrowAmount = ethers.BigNumber.from((1e17).toString());
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We lend WETH as deployer
        await approveTokensAndSetBarApproval();
        await wethDepositAndAddAsset(wethMintVal);

        await usdc.connect(eoa1).approve(marketsHelper.address, usdcMintVal);
        await wethUsdcSingularity
            .connect(eoa1)
            .approveBorrow(marketsHelper.address, ethers.constants.MaxUint256);

        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                eoa1.address,
                usdcMintVal,
                borrowAmount,
                true,
                true,
                encodeMarketHelperWithdrawData(false, 0, eoa1.address, '0x00'),
            );

        const userBorrowPart = await wethUsdcSingularity.userBorrowPart(
            eoa1.address,
        );

        const collateralShare = await wethUsdcSingularity.userCollateralShare(
            eoa1.address,
        );
        const collateralAmount = await yieldBox.toAmount(
            usdcAssetId,
            collateralShare,
            false,
        );
        const usdcBalanceBefore = await usdc.balanceOf(eoa1.address);

        await weth.connect(eoa1).freeMint(userBorrowPart.mul(2));

        await weth
            .connect(eoa1)
            .approve(marketsHelper.address, userBorrowPart.mul(2));

        await wethUsdcSingularity
            .connect(eoa1)
            .approveBorrow(
                marketsHelper.address,
                await yieldBox.toShare(collateralId, collateralAmount, true),
            );

        await marketsHelper
            .connect(eoa1)
            .depositRepayAndRemoveCollateral(
                wethUsdcSingularity.address,
                userBorrowPart.mul(2),
                userBorrowPart,
                collateralAmount,
                true,
                true,
            );
        const usdcBalanceAfter = await usdc.balanceOf(eoa1.address);
        expect(usdcBalanceAfter.gt(usdcBalanceBefore)).to.be.true;
        expect(usdcBalanceAfter.sub(usdcBalanceBefore).eq(collateralAmount)).to
            .be.true;
    });

    it('should mint and lend', async () => {
        const {
            weth,
            createWethUsd0Singularity,
            wethBigBangMarket,
            usd0,
            usdc,
            bar,
            wethAssetId,
            mediumRiskMC,
            deployCurveStableToUsdoBidder,
            initContracts,
            yieldBox,
            marketsHelper,
            deployer,
        } = await loadFixture(register);

        await initContracts();

        const usdoStratregy = await bar.emptyStrategies(usd0.address);
        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            usdoStratregy,
            0,
        );

        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usd0,
            false,
        );
        const { wethUsdoSingularity } = await createWethUsd0Singularity(
            usd0,
            weth,
            bar,
            usdoAssetId,
            wethAssetId,
            mediumRiskMC,
            yieldBox,
            stableToUsdoBidder,
            ethers.utils.parseEther('1'),
            false,
        );

        const borrowAmount = ethers.BigNumber.from((1e18).toString()).mul(100);
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);

        // We get asset
        await weth.freeMint(wethMintVal);

        // Approve tokens
        // await approveTokensAndSetBarApproval();
        await yieldBox.setApprovalForAll(wethUsdoSingularity.address, true);
        await wethBigBangMarket.updateOperator(marketsHelper.address, true);
        await weth.approve(marketsHelper.address, wethMintVal);
        await wethUsdoSingularity.approve(
            marketsHelper.address,
            ethers.constants.MaxUint256,
        );

        await marketsHelper.mintAndLend(
            wethUsdoSingularity.address,
            wethBigBangMarket.address,
            wethMintVal,
            borrowAmount,
            true,
        );

        const bingBangCollateralShare =
            await wethBigBangMarket.userCollateralShare(deployer.address);
        const bingBangCollateralAmount = await yieldBox.toAmount(
            wethAssetId,
            bingBangCollateralShare,
            false,
        );
        expect(bingBangCollateralAmount.eq(wethMintVal)).to.be.true;

        const bingBangBorrowPart = await wethBigBangMarket.userBorrowPart(
            deployer.address,
        );
        expect(bingBangBorrowPart.gte(borrowAmount)).to.be.true;

        const lentAssetShare = await wethUsdoSingularity.balanceOf(
            deployer.address,
        );
        const lentAssetAmount = await yieldBox.toAmount(
            usdoAssetId,
            lentAssetShare,
            false,
        );
        expect(lentAssetAmount.eq(borrowAmount)).to.be.true;
    });

    it('should remove asset, repay BingBang, remove collateral and withdraw', async () => {
        const {
            weth,
            createWethUsd0Singularity,
            wethBigBangMarket,
            usd0,
            usdc,
            bar,
            wethAssetId,
            mediumRiskMC,
            deployCurveStableToUsdoBidder,
            initContracts,
            yieldBox,
            marketsHelper,
            deployer,
        } = await loadFixture(register);

        await initContracts();

        const usdoStratregy = await bar.emptyStrategies(usd0.address);
        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            usdoStratregy,
            0,
        );

        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usd0,
            false,
        );
        const { wethUsdoSingularity } = await createWethUsd0Singularity(
            usd0,
            weth,
            bar,
            usdoAssetId,
            wethAssetId,
            mediumRiskMC,
            yieldBox,
            stableToUsdoBidder,
            ethers.utils.parseEther('1'),
            false,
        );

        const borrowAmount = ethers.BigNumber.from((1e18).toString()).mul(100);
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);

        await usd0.mint(deployer.address, borrowAmount.mul(2));
        // We get asset
        await weth.freeMint(wethMintVal);

        // Approve tokens
        // await approveTokensAndSetBarApproval();
        await yieldBox.setApprovalForAll(wethUsdoSingularity.address, true);
        await wethBigBangMarket.updateOperator(marketsHelper.address, true);
        await weth.approve(marketsHelper.address, wethMintVal);
        await wethUsdoSingularity.approve(
            marketsHelper.address,
            ethers.constants.MaxUint256,
        );

        await marketsHelper.mintAndLend(
            wethUsdoSingularity.address,
            wethBigBangMarket.address,
            wethMintVal,
            borrowAmount,
            true,
        );

        await usd0.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.depositAsset(
            usdoAssetId,
            deployer.address,
            deployer.address,
            borrowAmount,
            0,
        );
        const wethBalanceBefore = await weth.balanceOf(deployer.address);
        const fraction = await wethUsdoSingularity.balanceOf(deployer.address);
        const fractionAmount = await yieldBox.toAmount(
            usdoAssetId,
            fraction,
            false,
        );
        const totalBingBangCollateral =
            await wethBigBangMarket.userCollateralShare(deployer.address);

        await expect(
            marketsHelper.removeAssetAndRepay(
                wethUsdoSingularity.address,
                wethBigBangMarket.address,
                fraction,
                fraction,
                totalBingBangCollateral,
                true,
                encodeMarketHelperWithdrawData(
                    false,
                    0,
                    deployer.address,
                    '0x00',
                ),
            ),
        ).to.be.revertedWith('SGL: min limit');

        await marketsHelper.removeAssetAndRepay(
            wethUsdoSingularity.address,
            wethBigBangMarket.address,
            fraction.div(2),
            await yieldBox.toAmount(usdoAssetId, fraction.div(3), false),
            totalBingBangCollateral.div(5),
            true,
            encodeMarketHelperWithdrawData(false, 0, deployer.address, '0x00'),
        );
        const wethBalanceAfter = await weth.balanceOf(deployer.address);

        expect(wethBalanceBefore.eq(0)).to.be.true;
        expect(wethBalanceAfter.eq(wethMintVal.div(5))).to.be.true;
    });

    it('should remove asset, repay BingBang and remove collateral', async () => {
        const {
            weth,
            createWethUsd0Singularity,
            wethBigBangMarket,
            usd0,
            usdc,
            bar,
            wethAssetId,
            mediumRiskMC,
            deployCurveStableToUsdoBidder,
            initContracts,
            yieldBox,
            marketsHelper,
            deployer,
        } = await loadFixture(register);

        await initContracts();

        const usdoStratregy = await bar.emptyStrategies(usd0.address);
        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            usdoStratregy,
            0,
        );
        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usd0,
            false,
        );
        const { wethUsdoSingularity } = await createWethUsd0Singularity(
            usd0,
            weth,
            bar,
            usdoAssetId,
            wethAssetId,
            mediumRiskMC,
            yieldBox,
            stableToUsdoBidder,
            ethers.utils.parseEther('1'),
            false,
        );

        const borrowAmount = ethers.BigNumber.from((1e18).toString()).mul(100);
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);

        await usd0.mint(deployer.address, borrowAmount.mul(2));
        // We get asset
        await weth.freeMint(wethMintVal);

        // Approve tokens
        // await approveTokensAndSetBarApproval();
        await yieldBox.setApprovalForAll(wethUsdoSingularity.address, true);
        await wethBigBangMarket.updateOperator(marketsHelper.address, true);
        await weth.approve(marketsHelper.address, wethMintVal);
        await wethUsdoSingularity.approve(
            marketsHelper.address,
            ethers.constants.MaxUint256,
        );

        await marketsHelper.mintAndLend(
            wethUsdoSingularity.address,
            wethBigBangMarket.address,
            wethMintVal,
            borrowAmount,
            true,
        );

        await usd0.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.depositAsset(
            usdoAssetId,
            deployer.address,
            deployer.address,
            borrowAmount,
            0,
        );
        const wethCollateralBefore =
            await wethBigBangMarket.userCollateralShare(deployer.address);
        const fraction = await wethUsdoSingularity.balanceOf(deployer.address);
        const fractionAmount = await yieldBox.toAmount(
            usdoAssetId,
            fraction,
            false,
        );
        const totalBingBangCollateral =
            await wethBigBangMarket.userCollateralShare(deployer.address);

        await marketsHelper.removeAssetAndRepay(
            wethUsdoSingularity.address,
            wethBigBangMarket.address,
            fraction.div(2),
            await yieldBox.toAmount(usdoAssetId, fraction.div(3), false),
            totalBingBangCollateral.div(5),
            false,
            encodeMarketHelperWithdrawData(false, 0, deployer.address, '0x00'),
        );
        const wethCollateralAfter = await wethBigBangMarket.userCollateralShare(
            deployer.address,
        );

        expect(wethCollateralAfter.lt(wethCollateralBefore)).to.be.true;

        const wethBalanceAfter = await weth.balanceOf(deployer.address);
        expect(wethBalanceAfter.eq(0)).to.be.true;
    });

    describe('TOFT => MarketHelper', () => {
        it('should deposit and add asset through SGL helper', async () => {
            const {
                yieldBox,
                deployer,
                marketsHelper,
                registerSingularity,
                mediumRiskMC,
                bar,
            } = await loadFixture(register);

            const TapiocaOFTMock__factory = (
                (await ethers.getContractFactoryFromArtifact(
                    TapiocaOFTMockArtifact,
                )) as TapiocaOFTMock__factory
            ).connect(deployer);

            // -------------------  Get LZ endpoints -------------------
            const lzEndpoint1 = await (
                await ethers.getContractFactory('LZEndpointMock')
            ).deploy(1);
            const lzEndpoint2 = await (
                await ethers.getContractFactory('LZEndpointMock')
            ).deploy(2);

            // -------------------   Create TOFT -------------------
            const erc20Mock = await (
                await ethers.getContractFactory('ERC20Mock')
            ).deploy(BN(100e18), 18, BN(10e18));

            // Collateral
            const collateralHost = await TapiocaOFTMock__factory.deploy(
                lzEndpoint1.address,
                false,
                erc20Mock.address,
                yieldBox.address,
                'collateralMock',
                'toftMock',
                18,
                1,
            );

            const collateralLinked = await TapiocaOFTMock__factory.deploy(
                lzEndpoint2.address,
                false,
                erc20Mock.address,
                yieldBox.address,
                'collateralMock',
                'collateralMock',
                18,
                1,
            );

            // Asset
            const assetHost = await (
                await ethers.getContractFactory('USDO')
            ).deploy(lzEndpoint1.address, yieldBox.address, deployer.address);

            const assetLinked = await (
                await ethers.getContractFactory('USDO')
            ).deploy(lzEndpoint2.address, yieldBox.address, deployer.address);

            // -------------------  Link TOFTs -------------------

            // Collateral
            lzEndpoint1.setDestLzEndpoint(
                collateralLinked.address,
                lzEndpoint2.address,
            );
            lzEndpoint2.setDestLzEndpoint(
                collateralHost.address,
                lzEndpoint1.address,
            );

            await collateralHost.setTrustedRemote(
                2,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [collateralLinked.address, collateralHost.address],
                ),
            );
            await collateralLinked.setTrustedRemote(
                1,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [collateralHost.address, collateralLinked.address],
                ),
            );
            await collateralHost.setMinDstGas(2, 774, 200_00);
            await collateralHost.setMinDstGas(2, 775, 200_00);
            await collateralLinked.setMinDstGas(1, 774, 200_00);
            await collateralLinked.setMinDstGas(1, 775, 200_00);

            // Asset
            lzEndpoint1.setDestLzEndpoint(
                assetLinked.address,
                lzEndpoint2.address,
            );
            lzEndpoint2.setDestLzEndpoint(
                assetHost.address,
                lzEndpoint1.address,
            );
            await assetHost.setTrustedRemote(
                2,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [assetLinked.address, assetHost.address],
                ),
            );
            await assetLinked.setTrustedRemote(
                1,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [assetHost.address, assetLinked.address],
                ),
            );

            // ------------------- Deploy TOFT mock oracle -------------------
            const toftUsdcPrice = BN(22e18);
            const toftUsdcOracle = await (
                await ethers.getContractFactory('OracleMock')
            ).deploy('WETHMOracle', 'WETHMOracle', toftUsdcPrice.toString());

            // ------------------- Register Penrose Asset -------------------
            // Collateral
            const collateralHostStrategy = await createTokenEmptyStrategy(
                yieldBox.address,
                collateralHost.address,
            );
            await yieldBox.registerAsset(
                1,
                collateralHost.address,
                collateralHostStrategy.address,
                0,
            );

            const collateralHostAssetId = await yieldBox.ids(
                1,
                collateralHost.address,
                collateralHostStrategy.address,
                0,
            );
            // Asset
            const hostAssetStrategy = await createTokenEmptyStrategy(
                yieldBox.address,
                assetHost.address,
            );
            await yieldBox.registerAsset(
                1,
                assetHost.address,
                hostAssetStrategy.address,
                0,
            );
            const assetHostId = await yieldBox.ids(
                1,
                assetHost.address,
                hostAssetStrategy.address,
                0,
            );

            // ------------------- Deploy ToftUSDC medium risk MC clone-------------------
            const { singularityMarket: assetCollateralSingularity } =
                await registerSingularity(
                    mediumRiskMC.address,
                    yieldBox,
                    bar,
                    assetHost,
                    assetHostId,
                    collateralHost,
                    collateralHostAssetId,
                    toftUsdcOracle,
                    ethers.utils.parseEther('1'),
                    false,
                );
            // ------------------- Init SGL -------------------
            const collateralMintVal = ethers.BigNumber.from(
                (1e18).toString(),
            ).mul(10);
            const assetMintVal = collateralMintVal.mul(
                toftUsdcPrice.div((1e18).toString()),
            );

            // ------------------- Permit Setup -------------------
            const deadline = BN(
                (await ethers.provider.getBlock('latest')).timestamp + 10_000,
            );
            const permitLendAmount = ethers.constants.MaxUint256;
            const permitLend = await getSGLPermitSignature(
                'Permit',
                deployer,
                assetCollateralSingularity,
                marketsHelper.address,
                permitLendAmount,
                deadline,
            );
            const permitLendStruct: BaseTOFT.IApprovalStruct = {
                deadline,
                permitBorrow: false,
                owner: deployer.address,
                spender: marketsHelper.address,
                value: permitLendAmount,
                r: permitLend.r,
                s: permitLend.s,
                v: permitLend.v,
                target: assetCollateralSingularity.address,
            };

            // ------------------- Actual TOFT test -------------------
            // We get asset
            await assetLinked.freeMint(assetMintVal);

            expect(
                await assetCollateralSingularity.balanceOf(deployer.address),
            ).to.be.equal(0);

            await assetLinked.sendToYBAndLend(
                deployer.address,
                deployer.address,
                1,
                {
                    amount: assetMintVal,
                    marketHelper: marketsHelper.address,
                    market: assetCollateralSingularity.address,
                },
                {
                    extraGasLimit: 1_000_000,
                    strategyDeposit: false,
                    wrap: false,
                    zroPaymentAddress: ethers.constants.AddressZero,
                },
                [permitLendStruct],
                { value: ethers.utils.parseEther('2') },
            );

            expect(
                await assetCollateralSingularity.balanceOf(deployer.address),
            ).to.be.eq(
                await yieldBox.toShare(assetHostId, assetMintVal, false),
            );
        });

        it('should deposit and add asset through Magnetar', async () => {
            const {
                yieldBox,
                deployer,
                marketsHelper,
                registerSingularity,
                mediumRiskMC,
                bar,
            } = await loadFixture(register);

            const magnetar = await (
                await ethers.getContractFactory('Magnetar')
            ).deploy(deployer.address);
            await magnetar.deployed();

            const TapiocaOFTMock__factory = (
                (await ethers.getContractFactoryFromArtifact(
                    TapiocaOFTMockArtifact,
                )) as TapiocaOFTMock__factory
            ).connect(deployer);

            // -------------------  Get LZ endpoints -------------------
            const lzEndpoint1 = await (
                await ethers.getContractFactory('LZEndpointMock')
            ).deploy(1);
            const lzEndpoint2 = await (
                await ethers.getContractFactory('LZEndpointMock')
            ).deploy(2);

            // -------------------   Create TOFT -------------------
            const erc20Mock = await (
                await ethers.getContractFactory('ERC20Mock')
            ).deploy(BN(100e18), 18, BN(10e18));

            // Collateral
            const collateralHost = await TapiocaOFTMock__factory.deploy(
                lzEndpoint1.address,
                false,
                erc20Mock.address,
                yieldBox.address,
                'collateralMock',
                'toftMock',
                18,
                1,
            );

            const collateralLinked = await TapiocaOFTMock__factory.deploy(
                lzEndpoint2.address,
                false,
                erc20Mock.address,
                yieldBox.address,
                'collateralMock',
                'collateralMock',
                18,
                1,
            );

            // Asset
            const assetHost = await (
                await ethers.getContractFactory('USDO')
            ).deploy(lzEndpoint1.address, yieldBox.address, deployer.address);

            const assetLinked = await (
                await ethers.getContractFactory('USDO')
            ).deploy(lzEndpoint2.address, yieldBox.address, deployer.address);

            // -------------------  Link TOFTs -------------------

            // Collateral
            lzEndpoint1.setDestLzEndpoint(
                collateralLinked.address,
                lzEndpoint2.address,
            );
            lzEndpoint2.setDestLzEndpoint(
                collateralHost.address,
                lzEndpoint1.address,
            );

            await collateralHost.setTrustedRemote(
                2,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [collateralLinked.address, collateralHost.address],
                ),
            );
            await collateralLinked.setTrustedRemote(
                1,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [collateralHost.address, collateralLinked.address],
                ),
            );
            await collateralHost.setMinDstGas(2, 774, 200_00);
            await collateralHost.setMinDstGas(2, 775, 200_00);
            await collateralLinked.setMinDstGas(1, 774, 200_00);
            await collateralLinked.setMinDstGas(1, 775, 200_00);

            // Asset
            lzEndpoint1.setDestLzEndpoint(
                assetLinked.address,
                lzEndpoint2.address,
            );
            lzEndpoint2.setDestLzEndpoint(
                assetHost.address,
                lzEndpoint1.address,
            );
            await assetHost.setTrustedRemote(
                2,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [assetLinked.address, assetHost.address],
                ),
            );
            await assetLinked.setTrustedRemote(
                1,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [assetHost.address, assetLinked.address],
                ),
            );

            // ------------------- Deploy TOFT mock oracle -------------------
            const toftUsdcPrice = BN(22e18);
            const toftUsdcOracle = await (
                await ethers.getContractFactory('OracleMock')
            ).deploy('WETHMOracle', 'WETHMOracle', toftUsdcPrice.toString());

            // ------------------- Register Penrose Asset -------------------
            // Collateral
            const collateralHostStrategy = await createTokenEmptyStrategy(
                yieldBox.address,
                collateralHost.address,
            );
            await yieldBox.registerAsset(
                1,
                collateralHost.address,
                collateralHostStrategy.address,
                0,
            );

            const collateralHostAssetId = await yieldBox.ids(
                1,
                collateralHost.address,
                collateralHostStrategy.address,
                0,
            );
            // Asset
            const hostAssetStrategy = await createTokenEmptyStrategy(
                yieldBox.address,
                assetHost.address,
            );
            await yieldBox.registerAsset(
                1,
                assetHost.address,
                hostAssetStrategy.address,
                0,
            );
            const assetHostId = await yieldBox.ids(
                1,
                assetHost.address,
                hostAssetStrategy.address,
                0,
            );

            // ------------------- Deploy ToftUSDC medium risk MC clone-------------------
            const { singularityMarket: assetCollateralSingularity } =
                await registerSingularity(
                    mediumRiskMC.address,
                    yieldBox,
                    bar,
                    assetHost,
                    assetHostId,
                    collateralHost,
                    collateralHostAssetId,
                    toftUsdcOracle,
                    ethers.utils.parseEther('1'),
                    false,
                );
            // ------------------- Init SGL -------------------
            const collateralMintVal = ethers.BigNumber.from(
                (1e18).toString(),
            ).mul(10);
            const assetMintVal = collateralMintVal.mul(
                toftUsdcPrice.div((1e18).toString()),
            );

            // ------------------- Permit Setup -------------------
            const deadline = BN(
                (await ethers.provider.getBlock('latest')).timestamp + 10_000,
            );
            const permitLendAmount = ethers.constants.MaxUint256;
            const permitLend = await getSGLPermitSignature(
                'Permit',
                deployer,
                assetCollateralSingularity,
                marketsHelper.address,
                permitLendAmount,
                deadline,
            );
            const permitLendStruct: BaseTOFT.IApprovalStruct = {
                deadline,
                owner: deployer.address,
                spender: marketsHelper.address,
                value: permitLendAmount,
                r: permitLend.r,
                s: permitLend.s,
                v: permitLend.v,
                target: assetCollateralSingularity.address,
            };

            // ------------------- Actual TOFT test -------------------
            // We get asset
            await assetLinked.freeMint(assetMintVal);

            expect(
                await assetCollateralSingularity.balanceOf(deployer.address),
            ).to.be.equal(0);
            const sendToYbAndLendFn = assetLinked.interface.encodeFunctionData(
                'sendToYBAndLend',
                [
                    deployer.address,
                    deployer.address,
                    1,
                    {
                        amount: assetMintVal,
                        marketHelper: marketsHelper.address,
                        market: assetCollateralSingularity.address,
                    },
                    {
                        extraGasLimit: 1_000_000,
                        strategyDeposit: false,
                        zroPaymentAddress: ethers.constants.AddressZero,
                    },
                    [permitLendStruct],
                ],
            );

            await assetLinked.approve(
                magnetar.address,
                ethers.constants.MaxUint256,
            );

            await magnetar.connect(deployer).burst(
                [
                    {
                        id: 14,
                        target: assetLinked.address,
                        value: ethers.utils.parseEther('2'),
                        allowFailure: false,
                        call: sendToYbAndLendFn,
                    },
                ],
                {
                    value: ethers.utils.parseEther('2'),
                },
            );

            expect(
                await assetCollateralSingularity.balanceOf(deployer.address),
            ).to.be.eq(
                await yieldBox.toShare(assetHostId, assetMintVal, false),
            );
        });

        it('should deposit, and borrow through Magnetar', async () => {
            const {
                yieldBox,
                eoa1,
                deployer,
                marketsHelper,
                registerSingularity,
                mediumRiskMC,
                bar,
            } = await loadFixture(register);

            const magnetar = await (
                await ethers.getContractFactory('Magnetar')
            ).deploy(deployer.address);
            await magnetar.deployed();

            const TapiocaOFTMock__factory = (
                (await ethers.getContractFactoryFromArtifact(
                    TapiocaOFTMockArtifact,
                )) as TapiocaOFTMock__factory
            ).connect(deployer);

            // -------------------  Get LZ endpoints -------------------
            const lzEndpoint1 = await (
                await ethers.getContractFactory('LZEndpointMock')
            ).deploy(1);
            const lzEndpoint2 = await (
                await ethers.getContractFactory('LZEndpointMock')
            ).deploy(2);

            // -------------------   Create TOFT -------------------
            const erc20Mock = await (
                await ethers.getContractFactory('ERC20Mock')
            ).deploy(BN(100e18), 18, BN(10e18));

            // Collateral
            const collateralHost = await TapiocaOFTMock__factory.deploy(
                lzEndpoint1.address,
                false,
                erc20Mock.address,
                yieldBox.address,
                'collateralMock',
                'toftMock',
                18,
                1,
            );

            const collateralLinked = await TapiocaOFTMock__factory.deploy(
                lzEndpoint2.address,
                false,
                erc20Mock.address,
                yieldBox.address,
                'collateralMock',
                'collateralMock',
                18,
                1,
            );

            // Asset
            const assetHost = await (
                await ethers.getContractFactory('USDO')
            ).deploy(lzEndpoint1.address, yieldBox.address, deployer.address);

            const assetLinked = await (
                await ethers.getContractFactory('USDO')
            ).deploy(lzEndpoint2.address, yieldBox.address, deployer.address);

            // -------------------  Link TOFTs -------------------

            // Collateral
            lzEndpoint1.setDestLzEndpoint(
                collateralLinked.address,
                lzEndpoint2.address,
            );
            lzEndpoint2.setDestLzEndpoint(
                collateralHost.address,
                lzEndpoint1.address,
            );

            await collateralHost.setTrustedRemote(
                2,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [collateralLinked.address, collateralHost.address],
                ),
            );
            await collateralLinked.setTrustedRemote(
                1,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [collateralHost.address, collateralLinked.address],
                ),
            );
            await collateralHost.setMinDstGas(2, 774, 200_00);
            await collateralHost.setMinDstGas(2, 775, 200_00);
            await collateralLinked.setMinDstGas(1, 774, 200_00);
            await collateralLinked.setMinDstGas(1, 775, 200_00);

            // Asset
            lzEndpoint1.setDestLzEndpoint(
                assetLinked.address,
                lzEndpoint2.address,
            );
            lzEndpoint2.setDestLzEndpoint(
                assetHost.address,
                lzEndpoint1.address,
            );
            await assetHost.setTrustedRemote(
                2,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [assetLinked.address, assetHost.address],
                ),
            );
            await assetLinked.setTrustedRemote(
                1,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [assetHost.address, assetLinked.address],
                ),
            );

            // ------------------- Deploy TOFT mock oracle -------------------
            const toftUsdcPrice = BN(22e18);
            const toftUsdcOracle = await (
                await ethers.getContractFactory('OracleMock')
            ).deploy('WETHMOracle', 'WETHMOracle', toftUsdcPrice.toString());

            // ------------------- Register Penrose Asset -------------------
            // Collateral
            const collateralHostStrategy = await createTokenEmptyStrategy(
                yieldBox.address,
                collateralHost.address,
            );
            await yieldBox.registerAsset(
                1,
                collateralHost.address,
                collateralHostStrategy.address,
                0,
            );

            const collateralHostAssetId = await yieldBox.ids(
                1,
                collateralHost.address,
                collateralHostStrategy.address,
                0,
            );
            // Asset
            const hostAssetStrategy = await createTokenEmptyStrategy(
                yieldBox.address,
                assetHost.address,
            );
            await yieldBox.registerAsset(
                1,
                assetHost.address,
                hostAssetStrategy.address,
                0,
            );
            const assetHostId = await yieldBox.ids(
                1,
                assetHost.address,
                hostAssetStrategy.address,
                0,
            );

            // ------------------- Deploy ToftUSDC medium risk MC clone-------------------
            const { singularityMarket: assetCollateralSingularity } =
                await registerSingularity(
                    mediumRiskMC.address,
                    yieldBox,
                    bar,
                    assetHost,
                    assetHostId,
                    collateralHost,
                    collateralHostAssetId,
                    toftUsdcOracle,
                    ethers.utils.parseEther('1'),
                    false,
                );
            // ------------------- Init SGL -------------------
            const borrowAmount = ethers.BigNumber.from((1e10).toString());
            const collateralMintVal = ethers.BigNumber.from(
                (1e18).toString(),
            ).mul(10);
            const assetMintVal = collateralMintVal.mul(
                toftUsdcPrice.div((1e18).toString()),
            );

            // We get asset
            await assetHost.connect(eoa1).freeMint(assetMintVal);

            await assetHost
                .connect(eoa1)
                .approve(marketsHelper.address, assetMintVal);
            await marketsHelper
                .connect(eoa1)
                .depositAndAddAsset(
                    assetCollateralSingularity.address,
                    eoa1.address,
                    assetMintVal,
                    true,
                );

            // ------------------- Permit Setup -------------------
            const deadline = BN(
                (await ethers.provider.getBlock('latest')).timestamp + 10_000,
            );
            const permitBorrowAmount = ethers.constants.MaxUint256;
            const permitBorrow = await getSGLPermitSignature(
                'PermitBorrow',
                deployer,
                assetCollateralSingularity,
                marketsHelper.address,
                permitBorrowAmount,
                deadline,
            );
            const permitBorrowStruct: BaseTOFT.IApprovalStruct = {
                deadline,
                permitBorrow: true,
                owner: deployer.address,
                spender: marketsHelper.address,
                value: permitBorrowAmount,
                r: permitBorrow.r,
                s: permitBorrow.s,
                v: permitBorrow.v,
                target: assetCollateralSingularity.address,
            };

            const permitLendAmount = ethers.constants.MaxUint256;
            const permitLend = await getSGLPermitSignature(
                'Permit',
                deployer,
                assetCollateralSingularity,
                marketsHelper.address,
                permitLendAmount,
                deadline,
                {
                    nonce: (
                        await assetCollateralSingularity.nonces(
                            deployer.address,
                        )
                    ).add(1),
                },
            );
            const permitLendStruct: BaseTOFT.IApprovalStruct = {
                deadline,
                owner: deployer.address,
                permitBorrow: false,
                spender: marketsHelper.address,
                value: permitLendAmount,
                r: permitLend.r,
                s: permitLend.s,
                v: permitLend.v,
                target: assetCollateralSingularity.address,
            };

            // ------------------- Actual TOFT test -------------------
            // We get asset
            await collateralLinked.freeMint(
                deployer.address,
                collateralMintVal,
            );

            const withdrawFees = await assetHost.estimateSendFee(
                2,
                ethers.utils
                    .solidityPack(['address'], [assetLinked.address])
                    .padEnd(66, '0'),
                borrowAmount,
                false,
                '0x',
            );

            await collateralLinked.approve(
                magnetar.address,
                ethers.constants.MaxUint256,
            );

            const airdropAdapterParams = ethers.utils.solidityPack(
                ['uint16', 'uint', 'uint', 'address'],
                [
                    2, //it needs to be 2
                    913_823, //extra gas limit; min 200k
                    ethers.utils.parseEther('2.678'), //amount of eth to airdrop
                    marketsHelper.address,
                ],
            );

            const sendToYBAndBorrowFn =
                collateralLinked.interface.encodeFunctionData(
                    'sendToYBAndBorrow',
                    [
                        deployer.address,
                        deployer.address,
                        1,
                        airdropAdapterParams,
                        {
                            amount: collateralMintVal,
                            borrowAmount,
                            marketHelper: marketsHelper.address,
                            market: assetCollateralSingularity.address,
                        },
                        {
                            withdrawAdapterParams: ethers.utils.toUtf8Bytes(''),
                            withdrawLzChainId: await lzEndpoint2.getChainId(),
                            withdrawLzFeeAmount: withdrawFees.nativeFee,
                            withdrawOnOtherChain: true,
                        },
                        {
                            extraGasLimit: 1_000_000,
                            strategyDeposit: false,
                            wrap: false,
                            zroPaymentAddress: ethers.constants.AddressZero,
                        },
                        [permitBorrowStruct, permitLendStruct],
                    ],
                );

            await assetLinked.approve(
                magnetar.address,
                ethers.constants.MaxUint256,
            );

            await magnetar.connect(deployer).burst(
                [
                    {
                        id: 13,
                        target: collateralLinked.address,
                        value: ethers.utils.parseEther('4'),
                        allowFailure: false,
                        call: sendToYBAndBorrowFn,
                    },
                ],
                {
                    value: ethers.utils.parseEther('4'),
                },
            );
            hre.tracer.enabled = false;

            // console.log(`deployer      ${deployer.address}`);
            // console.log(`mhelper       ${marketsHelper.address}`);
            // console.log(`magnetar      ${magnetar.address}`);
            // console.log(`market        ${assetCollateralSingularity.address}`);
            // console.log(`assetHost     ${assetHost.address}`);
            // console.log(`assetLinked   ${assetLinked.address}`);

            // console.log(
            //     `assetLinked  balance  ${await assetLinked.balanceOf(
            //         deployer.address,
            //     )}`,
            // );
            // console.log(
            //     `assetHost    balance  ${await assetHost.balanceOf(
            //         deployer.address,
            //     )}`,
            // );

            expect(await assetLinked.balanceOf(deployer.address)).to.be.eq(
                borrowAmount,
            );
        });

        it('should deposit, add collateral and borrow through SGL helper', async () => {
            const {
                yieldBox,
                deployer,
                eoa1,
                marketsHelper,
                registerSingularity,
                mediumRiskMC,
                bar,
            } = await loadFixture(register);

            const TapiocaOFTMock__factory = (
                (await ethers.getContractFactoryFromArtifact(
                    TapiocaOFTMockArtifact,
                )) as TapiocaOFTMock__factory
            ).connect(deployer);

            // -------------------  Get LZ endpoints -------------------
            const lzEndpoint1 = await (
                await ethers.getContractFactory('LZEndpointMock')
            ).deploy(1);
            const lzEndpoint2 = await (
                await ethers.getContractFactory('LZEndpointMock')
            ).deploy(2);

            // -------------------   Create TOFT -------------------
            const erc20Mock = await (
                await ethers.getContractFactory('ERC20Mock')
            ).deploy(BN(100e18), 18, BN(10e18));

            // Collateral
            const collateralHost = await TapiocaOFTMock__factory.deploy(
                lzEndpoint1.address,
                false,
                erc20Mock.address,
                yieldBox.address,
                'collateralMock',
                'toftMock',
                18,
                1,
            );

            const collateralLinked = await TapiocaOFTMock__factory.deploy(
                lzEndpoint2.address,
                false,
                erc20Mock.address,
                yieldBox.address,
                'collateralMock',
                'collateralMock',
                18,
                1,
            );

            // Asset
            const assetHost = await TapiocaOFTMock__factory.deploy(
                lzEndpoint1.address,
                false,
                erc20Mock.address,
                yieldBox.address,
                'assetHost',
                'assetHost',
                18,
                1,
            );

            const assetLinked = await TapiocaOFTMock__factory.deploy(
                lzEndpoint2.address,
                false,
                erc20Mock.address,
                yieldBox.address,
                'assetLinked',
                'assetLinked',
                18,
                1,
            );

            // -------------------  Link TOFTs -------------------

            // Collateral
            lzEndpoint1.setDestLzEndpoint(
                collateralLinked.address,
                lzEndpoint2.address,
            );
            lzEndpoint2.setDestLzEndpoint(
                collateralHost.address,
                lzEndpoint1.address,
            );

            await collateralHost.setTrustedRemote(
                2,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [collateralLinked.address, collateralHost.address],
                ),
            );
            await collateralLinked.setTrustedRemote(
                1,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [collateralHost.address, collateralLinked.address],
                ),
            );
            await collateralHost.setMinDstGas(2, 774, 200_00);
            await collateralHost.setMinDstGas(2, 775, 200_00);
            await collateralLinked.setMinDstGas(1, 774, 200_00);
            await collateralLinked.setMinDstGas(1, 775, 200_00);

            // Asset
            lzEndpoint1.setDestLzEndpoint(
                assetLinked.address,
                lzEndpoint2.address,
            );
            lzEndpoint2.setDestLzEndpoint(
                assetHost.address,
                lzEndpoint1.address,
            );
            await assetHost.setTrustedRemote(
                2,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [assetLinked.address, assetHost.address],
                ),
            );
            await assetLinked.setTrustedRemote(
                1,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [assetHost.address, assetLinked.address],
                ),
            );

            // ------------------- Deploy TOFT mock oracle -------------------
            const toftUsdcPrice = BN(22e18);
            const toftUsdcOracle = await (
                await ethers.getContractFactory('OracleMock')
            ).deploy('WETHMOracle', 'WETHMOracle', toftUsdcPrice.toString());

            // ------------------- Register Penrose Asset -------------------
            // Collateral
            const collateralHostStrategy = await createTokenEmptyStrategy(
                yieldBox.address,
                collateralHost.address,
            );
            await yieldBox.registerAsset(
                1,
                collateralHost.address,
                collateralHostStrategy.address,
                0,
            );

            const collateralHostAssetId = await yieldBox.ids(
                1,
                collateralHost.address,
                collateralHostStrategy.address,
                0,
            );
            // Asset
            const hostAssetStrategy = await createTokenEmptyStrategy(
                yieldBox.address,
                assetHost.address,
            );
            await yieldBox.registerAsset(
                1,
                assetHost.address,
                hostAssetStrategy.address,
                0,
            );
            const assetHostId = await yieldBox.ids(
                1,
                assetHost.address,
                hostAssetStrategy.address,
                0,
            );

            // ------------------- Deploy ToftUSDC medium risk MC clone-------------------
            const { singularityMarket: assetCollateralSingularity } =
                await registerSingularity(
                    mediumRiskMC.address,
                    yieldBox,
                    bar,
                    assetHost,
                    assetHostId,
                    collateralHost,
                    collateralHostAssetId,
                    toftUsdcOracle,
                    ethers.utils.parseEther('1'),
                    false,
                );
            // ------------------- Init SGL -------------------

            const borrowAmount = ethers.BigNumber.from((1e10).toString());
            const collateralMintVal = ethers.BigNumber.from(
                (1e18).toString(),
            ).mul(10);
            const assetMintVal = collateralMintVal.mul(
                toftUsdcPrice.div((1e18).toString()),
            );

            // We get asset
            await assetHost.connect(eoa1).freeMint(eoa1.address, assetMintVal);

            await assetHost
                .connect(eoa1)
                .approve(marketsHelper.address, assetMintVal);
            await marketsHelper
                .connect(eoa1)
                .depositAndAddAsset(
                    assetCollateralSingularity.address,
                    eoa1.address,
                    assetMintVal,
                    true,
                );

            // ------------------- Permit Setup -------------------
            const deadline = BN(
                (await ethers.provider.getBlock('latest')).timestamp + 10_000,
            );

            const permitBorrowAmount = ethers.constants.MaxUint256;
            const permitBorrow = await getSGLPermitSignature(
                'PermitBorrow',
                deployer,
                assetCollateralSingularity,
                marketsHelper.address,
                permitBorrowAmount,
                deadline,
            );
            const permitBorrowStruct: BaseTOFT.IApprovalStruct = {
                deadline,
                permitBorrow: true,
                owner: deployer.address,
                spender: marketsHelper.address,
                value: permitBorrowAmount,
                r: permitBorrow.r,
                s: permitBorrow.s,
                v: permitBorrow.v,
                target: assetCollateralSingularity.address,
            };

            const permitLendAmount = ethers.constants.MaxUint256;
            const permitLend = await getSGLPermitSignature(
                'Permit',
                deployer,
                assetCollateralSingularity,
                marketsHelper.address,
                permitLendAmount,
                deadline,
                {
                    nonce: (
                        await assetCollateralSingularity.nonces(
                            deployer.address,
                        )
                    ).add(1),
                },
            );
            const permitLendStruct: BaseTOFT.IApprovalStruct = {
                deadline,
                permitBorrow: false,
                owner: deployer.address,
                spender: marketsHelper.address,
                value: permitLendAmount,
                r: permitLend.r,
                s: permitLend.s,
                v: permitLend.v,
                target: assetCollateralSingularity.address,
            };

            // ------------------- Actual TOFT test -------------------
            const withdrawFees = await assetHost.estimateSendFee(
                2,
                ethers.utils
                    .solidityPack(['address'], [assetLinked.address])
                    .padEnd(66, '0'),
                borrowAmount,
                false,
                '0x',
            );

            const airdropAdapterParams = ethers.utils.solidityPack(
                ['uint16', 'uint', 'uint', 'address'],
                [
                    2, //it needs to be 2
                    1_000_000, //extra gas limit; min 200k
                    ethers.utils.parseEther('2.678'), //amount of eth to airdrop
                    marketsHelper.address,
                ],
            );

            // Execute
            await collateralLinked.freeMint(
                deployer.address,
                collateralMintVal,
            );

            await collateralLinked.sendToYBAndBorrow(
                deployer.address,
                deployer.address,
                1,
                airdropAdapterParams,
                {
                    amount: collateralMintVal,
                    borrowAmount,
                    marketHelper: marketsHelper.address,
                    market: assetCollateralSingularity.address,
                },
                {
                    withdrawAdapterParams: '0x00',
                    withdrawLzChainId: 2,
                    withdrawLzFeeAmount: withdrawFees.nativeFee,
                    withdrawOnOtherChain: true,
                },
                {
                    extraGasLimit: 1000000,
                    strategyDeposit: false,
                    wrap: false,
                    zroPaymentAddress: deployer.address,
                },
                [permitBorrowStruct, permitLendStruct],
                { value: ethers.utils.parseEther('10') },
            );
            expect(await assetLinked.balanceOf(deployer.address)).to.be.eq(
                borrowAmount,
            );
        });
    });
});

function encodeMarketHelperWithdrawData(
    otherChain: boolean,
    destChain: number,
    receiver: string,
    adapterParams: string,
) {
    const receiverSplit = receiver.split('0x');

    return ethers.utils.defaultAbiCoder.encode(
        ['bool', 'uint16', 'bytes32', 'bytes'],
        [
            otherChain,
            destChain,
            '0x'.concat(receiverSplit[1].padStart(64, '0')),
            adapterParams,
        ],
    );
}

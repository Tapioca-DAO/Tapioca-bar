import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

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
            .approve(marketsHelper.address, usdcMintVal);
        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
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
            wethUsdcSingularity,
            usdc,
            eoa1,
            initContracts,
            marketsHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
        } = await loadFixture(register);

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
            .approve(marketsHelper.address, usdcMintVal);
        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                usdcMintVal,
                borrowAmount,
                true,
                true,
                ethers.utils.toUtf8Bytes(''),
            );
    });

    it('should add collateral, borrow and withdraw through SGL helper', async () => {
        const {
            weth,
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
            .approve(marketsHelper.address, usdcMintVal);
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                usdcAssetId,
                eoa1.address,
                eoa1.address,
                usdcMintVal,
                0,
            );

        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                usdcMintVal,
                borrowAmount,
                false,
                true,
                ethers.utils.toUtf8Bytes(''),
            );
    });

    it('should deposit and repay through SGL helper', async () => {
        const {
            weth,
            wethUsdcSingularity,
            usdc,
            eoa1,
            initContracts,
            marketsHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
        } = await loadFixture(register);

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
            .approve(marketsHelper.address, usdcMintVal);
        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                usdcMintVal,
                borrowAmount,
                true,
                true,
                ethers.utils.toUtf8Bytes(''),
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
            .approve(marketsHelper.address, userBorrowPart.mul(2));
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
            eoa1,
            initContracts,
            yieldBox,
            marketsHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
        } = await loadFixture(register);

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
            .approve(marketsHelper.address, usdcMintVal);

        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                usdcMintVal,
                borrowAmount,
                true,
                true,
                ethers.utils.toUtf8Bytes(''),
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
            .approve(marketsHelper.address, userBorrowPart.mul(2));
        const collateralShare = await wethUsdcSingularity.userCollateralShare(
            eoa1.address,
        );
        const collateralAmount = await yieldBox.toAmount(
            usdcAssetId,
            collateralShare,
            false,
        );
        const usdcBalanceBefore = await usdc.balanceOf(eoa1.address);
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
});

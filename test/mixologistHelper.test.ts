import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('MixologistHelper test', () => {
    it('Should deposit to yieldBox & add asset to mixologist through Mx helper', async () => {
        const {
            weth,
            yieldBox,
            wethUsdcMixologist,
            deployer,
            initContracts,
            mixologistHelper,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Mixologist: below minimum`

        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        await weth.approve(mixologistHelper.address, mintVal);
        await mixologistHelper.depositAndAddAsset(
            wethUsdcMixologist.address,
            mintVal,
        );
    });

    it('should deposit, add collateral and borrow through Mx helper', async () => {
        const {
            weth,
            yieldBox,
            wethUsdcMixologist,
            deployer,
            usdc,
            eoa1,
            initContracts,
            mixologistHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Mixologist: below minimum`

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();

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

        await usdc.connect(eoa1).approve(mixologistHelper.address, usdcMintVal);
        await wethUsdcMixologist
            .connect(eoa1)
            .setApprovalForAll(mixologistHelper.address, true);
        await mixologistHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcMixologist.address,
                usdcMintVal,
                borrowAmount,
                false,
            );
    });

    it('should deposit, add collateral, borrow and withdraw through Mx helper', async () => {
        const {
            weth,
            wethUsdcMixologist,
            usdc,
            eoa1,
            initContracts,
            mixologistHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Mixologist: below minimum`

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

        await usdc.connect(eoa1).approve(mixologistHelper.address, usdcMintVal);
        await wethUsdcMixologist
            .connect(eoa1)
            .setApprovalForAll(mixologistHelper.address, true);
        await mixologistHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcMixologist.address,
                usdcMintVal,
                borrowAmount,
                true,
            );
    });

    it('should deposit and repay through Mx helper', async () => {
        const {
            weth,
            wethUsdcMixologist,
            usdc,
            eoa1,
            initContracts,
            mixologistHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Mixologist: below minimum`

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

        await usdc.connect(eoa1).approve(mixologistHelper.address, usdcMintVal);
        await wethUsdcMixologist
            .connect(eoa1)
            .setApprovalForAll(mixologistHelper.address, true);
        await mixologistHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcMixologist.address,
                usdcMintVal,
                borrowAmount,
                true,
            );

        const userBorrowPart = await wethUsdcMixologist.userBorrowPart(
            eoa1.address,
        );
        await weth.connect(eoa1).freeMint(userBorrowPart.mul(2));

        await weth
            .connect(eoa1)
            .approve(mixologistHelper.address, userBorrowPart.mul(2));
        await wethUsdcMixologist
            .connect(eoa1)
            .setApprovalForAll(mixologistHelper.address, true);
        await mixologistHelper
            .connect(eoa1)
            .depositAndRepay(
                wethUsdcMixologist.address,
                userBorrowPart.mul(2),
                userBorrowPart,
            );
    });

    it('should deposit, repay, remove collateral and withdraw through Mx helper', async () => {
        const {
            usdcAssetId,
            weth,
            wethUsdcMixologist,
            usdc,
            eoa1,
            initContracts,
            yieldBox,
            mixologistHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Mixologist: below minimum`

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

        await usdc.connect(eoa1).approve(mixologistHelper.address, usdcMintVal);
        await wethUsdcMixologist
            .connect(eoa1)
            .setApprovalForAll(mixologistHelper.address, true);
        await mixologistHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcMixologist.address,
                usdcMintVal,
                borrowAmount,
                true,
            );

        const userBorrowPart = await wethUsdcMixologist.userBorrowPart(
            eoa1.address,
        );
        await weth.connect(eoa1).freeMint(userBorrowPart.mul(2));

        await weth
            .connect(eoa1)
            .approve(mixologistHelper.address, userBorrowPart.mul(2));
        await wethUsdcMixologist
            .connect(eoa1)
            .setApprovalForAll(mixologistHelper.address, true);

        const collateralShare = await wethUsdcMixologist.userCollateralShare(
            eoa1.address,
        );
        const collateralAmount = await yieldBox.toAmount(
            usdcAssetId,
            collateralShare,
            false,
        );
        const usdcBalanceBefore = await usdc.balanceOf(eoa1.address);
        await mixologistHelper
            .connect(eoa1)
            .depositRepayAndRemoveCollateral(
                wethUsdcMixologist.address,
                userBorrowPart.mul(2),
                userBorrowPart,
                collateralAmount,
                true,
            );
        const usdcBalanceAfter = await usdc.balanceOf(eoa1.address);
        expect(usdcBalanceAfter.gt(usdcBalanceBefore)).to.be.true;
        expect(usdcBalanceAfter.sub(usdcBalanceBefore).eq(collateralAmount)).to
            .be.true;
    });
});

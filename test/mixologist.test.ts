import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
describe('Mixologist test', () => {
    it('Should deposit to bar, add asset to mixologist, remove asset and withdraw', async () => {
        const { usdc, weth, bar, wethUsdcMixologist, deployer } = await register();

        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(1e5);
        usdc.freeMint(mintVal);

        const balanceBefore = await usdc.balanceOf(deployer.address);
        // Deposit assets to bar
        const mintValShare = await bar.toShare(await wethUsdcMixologist.assetId(), mintVal, false);
        await (await usdc.approve(bar.address, mintVal)).wait();
        await (await bar.deposit(await wethUsdcMixologist.assetId(), deployer.address, deployer.address, 0, mintValShare)).wait();

        // Add asset to Mixologist
        await (await bar.setApprovalForAll(wethUsdcMixologist.address, true)).wait();
        await (await wethUsdcMixologist.addAsset(deployer.address, false, mintValShare)).wait();

        // Remove asset from Mixologist
        await (await wethUsdcMixologist.removeAsset(deployer.address, mintValShare)).wait();

        // Withdraw from bar
        await (await bar.withdraw(await wethUsdcMixologist.assetId(), deployer.address, deployer.address, 0, mintValShare)).wait();

        // Check the value of the asset
        const balanceAfter = await usdc.balanceOf(deployer.address);
        expect(balanceAfter).to.equal(balanceBefore);
    });

    it.only('Should lend Weth, deposit Usdc collateral and borrow Weth', async () => {
        const {
            usdc,
            weth,
            bar,
            wethDepositAndAddAsset,
            usdcDepositAndAddCollateral,
            eoa1,
            approveTokensAndSetBarApproval,
            deployer,
            wethUsdcMixologist,
            jumpTime,
        } = await register();

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(2950);

        // We get asset
        weth.freeMint(wethMintVal);
        usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We lend WETH as deployer
        await wethDepositAndAddAsset(wethMintVal);
        expect(await wethUsdcMixologist.balanceOf(deployer.address)).to.be.equal(await bar.toShare(assetId, wethMintVal, false));

        // We deposit USDC collateral
        await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
        expect(await wethUsdcMixologist.userCollateralShare(eoa1.address)).equal(await bar.toShare(collateralId, usdcMintVal, false));

        // We borrow 74% collateral, max is 75%
        const borrowVal = wethMintVal.mul(12).div(100);

        await wethUsdcMixologist.connect(eoa1).borrow(eoa1.address, borrowVal);
        await bar.connect(eoa1).withdraw(assetId, eoa1.address, eoa1.address, borrowVal, 0);

        // Can't liquidate
        await expect(wethUsdcMixologist.liquidate([eoa1.address], [borrowVal], deployer.address, ethers.constants.AddressZero)).to.be
            .reverted;

        // Can be liquidated after fees accrual
        await wethUsdcMixologist.setSwapper(ethers.constants.AddressZero, true);
        await jumpTime(3600 * 60 * 60 * 24 * 60);
        await wethUsdcMixologist.accrue();
        console.log(await wethUsdcMixologist.userCollateralShare(eoa1.address));
        await wethUsdcMixologist.liquidate([eoa1.address], [borrowVal], deployer.address, ethers.constants.AddressZero);
        await expect(wethUsdcMixologist.liquidate([eoa1.address], [borrowVal], deployer.address, ethers.constants.AddressZero)).to.not.be
            .reverted;
    });
});

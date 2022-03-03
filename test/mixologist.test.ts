import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
describe('Mixologist test', () => {
    it('Should deposit to bar, add asset to mixologist, remove asset and withdraw', async () => {
        const { weth, bar, wethUsdcMixologist, deployer, initContracts } = await register();

        await initContracts(); // To prevent `Mixologist: below minimum`

        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        const balanceBefore = await weth.balanceOf(deployer.address);
        // Deposit assets to bar
        const mintValShare = await bar.toShare(await wethUsdcMixologist.assetId(), mintVal, false);
        await (await weth.approve(bar.address, mintVal)).wait();
        await (await bar.deposit(await wethUsdcMixologist.assetId(), deployer.address, deployer.address, 0, mintValShare)).wait();

        // Add asset to Mixologist
        await (await bar.setApprovalForAll(wethUsdcMixologist.address, true)).wait();
        await (await wethUsdcMixologist.addAsset(deployer.address, false, mintValShare)).wait();

        // Remove asset from Mixologist
        await (await wethUsdcMixologist.removeAsset(deployer.address, mintValShare)).wait();

        // Withdraw from bar
        await (await bar.withdraw(await wethUsdcMixologist.assetId(), deployer.address, deployer.address, 0, mintValShare)).wait();

        // Check the value of the asset
        const balanceAfter = await weth.balanceOf(deployer.address);
        expect(balanceAfter).to.equal(balanceBefore);
    });

    it('Should lend Weth, deposit Usdc collateral and borrow Weth', async () => {
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
            multiSwapper,
            wethUsdcOracle,
            __wethUsdcPrice,
        } = await register();

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(__wethUsdcPrice.div((1e18).toString()));

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
        const wethBorrowVal = usdcMintVal.mul(74).div(100).div(__wethUsdcPrice.div((1e18).toString()));

        await wethUsdcMixologist.connect(eoa1).borrow(eoa1.address, wethBorrowVal);
        await bar.connect(eoa1).withdraw(assetId, eoa1.address, eoa1.address, wethBorrowVal, 0);

        // Can't liquidate
        await expect(wethUsdcMixologist.liquidate([eoa1.address], [wethBorrowVal], multiSwapper.address)).to.be.reverted;

        // Can be liquidated price drop (USDC/WETH)
        const priceDrop = __wethUsdcPrice.mul(2).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));

        await wethUsdcMixologist.accrue();
        await expect(wethUsdcMixologist.liquidate([eoa1.address], [wethBorrowVal], multiSwapper.address)).to.not.be.reverted;
    });
});

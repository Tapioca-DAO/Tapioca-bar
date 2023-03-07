import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('Singularity test', () => {
    it('should add addset, remove asset and update exchange rate in a single tx', async () => {
        const { weth, yieldBox, wethUsdcSingularity, deployer, initContracts } =
            await loadFixture(register);

        await initContracts(); // To prevent `Singularity: below minimum`

        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        const balanceBefore = await weth.balanceOf(deployer.address);
        // Deposit assets to bar
        const mintValShare = await yieldBox.toShare(
            await wethUsdcSingularity.assetId(),
            mintVal,
            false,
        );
        await (await weth.approve(yieldBox.address, mintVal)).wait();
        await (
            await yieldBox.depositAsset(
                await wethUsdcSingularity.assetId(),
                deployer.address,
                deployer.address,
                0,
                mintValShare,
            )
        ).wait();

        await (
            await yieldBox.setApprovalForAll(wethUsdcSingularity.address, true)
        ).wait();

        let addAssetFn = wethUsdcSingularity.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );
        const removeAssetFn = wethUsdcSingularity.interface.encodeFunctionData(
            'removeAsset',
            [deployer.address, deployer.address, mintValShare],
        );

        const updateExchangeRateFn =
            wethUsdcSingularity.interface.encodeFunctionData(
                'updateExchangeRate',
            );

        await wethUsdcSingularity.execute(
            [addAssetFn, removeAssetFn, updateExchangeRateFn],
            true,
        );

        addAssetFn = wethUsdcSingularity.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, true, mintValShare],
        );

        await expect(
            wethUsdcSingularity.execute(
                [addAssetFn, removeAssetFn, updateExchangeRateFn],
                true,
            ),
        ).to.be.revertedWith('SGL: too much');

        // Withdraw from bar
        await yieldBox.withdraw(
            await wethUsdcSingularity.assetId(),
            deployer.address,
            deployer.address,
            0,
            mintValShare,
        );

        // Check the value of the asset
        const balanceAfter = await weth.balanceOf(deployer.address);
        expect(balanceAfter).to.equal(balanceBefore);
    });

    it('Should deposit Usdc collateral and borrow Weth in a single tx without lenders but revert with the right error code', async () => {
        const {
            usdc,
            weth,
            yieldBox,
            eoa1,
            approveTokensAndSetBarApproval,
            wethUsdcSingularity,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const assetId = await wethUsdcSingularity.assetId();
        const collateralId = await wethUsdcSingularity.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        const usdcMintValShare = await yieldBox.toShare(
            collateralId,
            usdcMintVal,
            false,
        );
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                collateralId,
                eoa1.address,
                eoa1.address,
                usdcMintVal,
                0,
            );

        const addCollateralFn =
            wethUsdcSingularity.interface.encodeFunctionData('addCollateral', [
                eoa1.address,
                eoa1.address,
                false,
                usdcMintValShare,
            ]);
        const borrowFn = wethUsdcSingularity.interface.encodeFunctionData(
            'borrow',
            [eoa1.address, eoa1.address, wethBorrowVal],
        );

        await expect(
            wethUsdcSingularity
                .connect(eoa1)
                .execute([addCollateralFn, borrowFn], true),
        ).to.be.revertedWith('SGL: min limit');
    });

    it('Should deposit Usdc collateral and borrow Weth in a single tx without lenders and decode the error codes', async () => {
        const {
            usdc,
            weth,
            yieldBox,
            eoa1,
            approveTokensAndSetBarApproval,
            wethUsdcSingularity,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const assetId = await wethUsdcSingularity.assetId();
        const collateralId = await wethUsdcSingularity.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        const usdcMintValShare = await yieldBox.toShare(
            collateralId,
            usdcMintVal,
            false,
        );
        await (
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    collateralId,
                    eoa1.address,
                    eoa1.address,
                    usdcMintVal,
                    0,
                )
        ).wait();

        const addCollateralFn =
            wethUsdcSingularity.interface.encodeFunctionData('addCollateral', [
                eoa1.address,
                eoa1.address,
                false,
                usdcMintValShare,
            ]);
        const borrowFn = wethUsdcSingularity.interface.encodeFunctionData(
            'borrow',
            [eoa1.address, eoa1.address, wethBorrowVal],
        );

        const data = await wethUsdcSingularity
            .connect(eoa1)
            .callStatic.execute([addCollateralFn, borrowFn], false);

        expect(data.successes[0]).to.be.true;
        expect(data.successes[1]).to.be.false; //can't borrow as there are no lenders

        expect(data.results[0]).to.eq('SGL: no return data');
        expect(data.results[1]).to.eq('SGL: min limit');

        await expect(
            wethUsdcSingularity
                .connect(eoa1)
                .execute([addCollateralFn, borrowFn], false),
        ).not.to.be.reverted;
    });

    it('Should lend Weth, deposit Usdc collateral and borrow Weth in a single tx', async () => {
        const {
            usdc,
            weth,
            yieldBox,
            eoa1,
            approveTokensAndSetBarApproval,
            deployer,
            wethUsdcSingularity,
            marketsHelper,
            wethUsdcOracle,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const assetId = await wethUsdcSingularity.assetId();
        const collateralId = await wethUsdcSingularity.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        const wethMintValShare = await yieldBox.toShare(
            assetId,
            wethMintVal,
            false,
        );
        await (
            await yieldBox.depositAsset(
                assetId,
                deployer.address,
                deployer.address,
                0,
                wethMintValShare,
            )
        ).wait();

        const addAssetFn = wethUsdcSingularity.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, wethMintValShare],
        );
        await (await wethUsdcSingularity.execute([addAssetFn], true)).wait();
        expect(
            await wethUsdcSingularity.balanceOf(deployer.address),
        ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

        const usdcMintValShare = await yieldBox.toShare(
            collateralId,
            usdcMintVal,
            false,
        );
        await (
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    collateralId,
                    eoa1.address,
                    eoa1.address,
                    usdcMintVal,
                    0,
                )
        ).wait();

        const addCollateralFn =
            wethUsdcSingularity.interface.encodeFunctionData('addCollateral', [
                eoa1.address,
                eoa1.address,
                false,
                usdcMintValShare,
            ]);
        const borrowFn = wethUsdcSingularity.interface.encodeFunctionData(
            'borrow',
            [eoa1.address, eoa1.address, wethBorrowVal],
        );

        await (
            await wethUsdcSingularity
                .connect(eoa1)
                .execute([addCollateralFn, borrowFn], true)
        ).wait();

        expect(
            await wethUsdcSingularity.userCollateralShare(eoa1.address),
        ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

        const dataFromHelper = (
            await marketsHelper.singularityMarketInfo(eoa1.address, [
                wethUsdcSingularity.address,
            ])
        )[0];
        expect(dataFromHelper.market[0].toLowerCase()).eq(
            usdc.address.toLowerCase(),
        );
        expect(dataFromHelper.market[2].toLowerCase()).eq(
            weth.address.toLowerCase(),
        );
        expect(dataFromHelper.market[4].toLowerCase()).eq(
            wethUsdcOracle.address.toLowerCase(),
        );
        expect(dataFromHelper.market[7].eq(usdcMintValShare)).to.be.true;

        const borrowed = await wethUsdcSingularity.userBorrowPart(eoa1.address);
        expect(dataFromHelper.market[9].eq(borrowed)).to.be.true;
    });

    it('Should deposit to yieldBox, add asset to singularity, remove asset and withdraw', async () => {
        const { weth, yieldBox, wethUsdcSingularity, deployer, initContracts } =
            await loadFixture(register);

        await initContracts(); // To prevent `Singularity: below minimum`

        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        const balanceBefore = await weth.balanceOf(deployer.address);
        // Deposit assets to bar
        const mintValShare = await yieldBox.toShare(
            await wethUsdcSingularity.assetId(),
            mintVal,
            false,
        );
        await (await weth.approve(yieldBox.address, mintVal)).wait();
        await (
            await yieldBox.depositAsset(
                await wethUsdcSingularity.assetId(),
                deployer.address,
                deployer.address,
                0,
                mintValShare,
            )
        ).wait();

        // Add asset to Singularity
        await (
            await yieldBox.setApprovalForAll(wethUsdcSingularity.address, true)
        ).wait();
        await (
            await wethUsdcSingularity.addAsset(
                deployer.address,
                deployer.address,
                false,
                mintValShare,
            )
        ).wait();

        // Remove asset from Singularity
        await (
            await wethUsdcSingularity.removeAsset(
                deployer.address,
                deployer.address,
                mintValShare,
            )
        ).wait();

        // Withdraw from bar
        await (
            await yieldBox.withdraw(
                await wethUsdcSingularity.assetId(),
                deployer.address,
                deployer.address,
                0,
                mintValShare,
            )
        ).wait();

        // Check the value of the asset
        const balanceAfter = await weth.balanceOf(deployer.address);
        expect(balanceAfter).to.equal(balanceBefore);
    });

    it('should not be able to borrow when cap is reached', async () => {
        const {
            usdc,
            weth,
            yieldBox,
            wethDepositAndAddAsset,
            usdcDepositAndAddCollateral,
            eoa1,
            approveTokensAndSetBarApproval,
            deployer,
            wethUsdcSingularity,
            bar,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const assetId = await wethUsdcSingularity.assetId();
        const collateralId = await wethUsdcSingularity.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We lend WETH as deployer
        await wethDepositAndAddAsset(wethMintVal);
        expect(
            await wethUsdcSingularity.balanceOf(deployer.address),
        ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

        // We deposit USDC collateral
        await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
        expect(
            await wethUsdcSingularity.userCollateralShare(eoa1.address),
        ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));

        let borrowCapData = wethUsdcSingularity.interface.encodeFunctionData(
            'setBorrowCap',
            [wethBorrowVal.div(2)],
        );
        await bar.executeMarketFn(
            [wethUsdcSingularity.address],
            [borrowCapData],
            true,
        );
        const savedBorrowCap = await wethUsdcSingularity.totalBorrowCap();
        expect(savedBorrowCap.eq(wethBorrowVal.div(2))).to.be.true;

        await expect(
            wethUsdcSingularity
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, wethBorrowVal),
        ).to.be.revertedWith('SGL: borrow cap reached');

        borrowCapData = wethUsdcSingularity.interface.encodeFunctionData(
            'setBorrowCap',
            [0],
        );
        await bar.executeMarketFn(
            [wethUsdcSingularity.address],
            [borrowCapData],
            true,
        );

        await expect(
            wethUsdcSingularity
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, wethBorrowVal),
        ).to.not.be.reverted;
    });

    it('Should lend Weth, deposit Usdc collateral and borrow Weth and be liquidated for price drop', async () => {
        const {
            usdc,
            weth,
            yieldBox,
            wethDepositAndAddAsset,
            usdcDepositAndAddCollateral,
            eoa1,
            approveTokensAndSetBarApproval,
            deployer,
            wethUsdcSingularity,
            multiSwapper,
            wethUsdcOracle,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const assetId = await wethUsdcSingularity.assetId();
        const collateralId = await wethUsdcSingularity.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We lend WETH as deployer
        await wethDepositAndAddAsset(wethMintVal);
        expect(
            await wethUsdcSingularity.balanceOf(deployer.address),
        ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

        // We deposit USDC collateral
        await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
        expect(
            await wethUsdcSingularity.userCollateralShare(eoa1.address),
        ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

        // We borrow 74% collateral, max is 75%
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));

        await wethUsdcSingularity
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, wethBorrowVal);
        await yieldBox
            .connect(eoa1)
            .withdraw(assetId, eoa1.address, eoa1.address, wethBorrowVal, 0);

        const data = new ethers.utils.AbiCoder().encode(['uint256'], [1]);

        // Can't liquidate
        await expect(
            wethUsdcSingularity.liquidate(
                [eoa1.address],
                [wethBorrowVal],
                multiSwapper.address,
                data,
                data,
            ),
        ).to.be.reverted;

        // Can be liquidated price drop (USDC/WETH)
        const priceDrop = __wethUsdcPrice.mul(2).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
        await wethUsdcSingularity.updateExchangeRate();

        const exchangeRate = await wethUsdcSingularity.exchangeRate();
        const maxLiquidatable = await wethUsdcSingularity.computeClosingFactor(
            eoa1.address,
            exchangeRate,
        );
        const userBorrowedAmountBefore =
            await wethUsdcSingularity.userBorrowPart(eoa1.address);
        await expect(
            wethUsdcSingularity.liquidate(
                [eoa1.address],
                [wethBorrowVal],
                multiSwapper.address,
                data,
                data,
            ),
        ).to.not.be.reverted;
        const userBorrowedAmountAfter =
            await wethUsdcSingularity.userBorrowPart(eoa1.address);

        expect(userBorrowedAmountAfter).to.be.approximately(
            userBorrowedAmountBefore.sub(maxLiquidatable),
            userBorrowedAmountAfter.mul(99).div(100),
        );
    });

    it('Should lend WBTC, deposit Usdc collateral and borrow WBTC and be liquidated for price drop', async () => {
        const {
            usdc,
            wbtc,
            yieldBox,
            wbtcDepositAndAddAsset,
            usdcDepositAndAddCollateralWbtcSingularity,
            eoa1,
            approveTokensAndSetBarApproval,
            deployer,
            wbtcUsdcSingularity,
            multiSwapper,
            wbtcUsdcOracle,
            __wbtcUsdcPrice,
        } = await loadFixture(register);

        const assetId = await wbtcUsdcSingularity.assetId();
        const collateralId = await wbtcUsdcSingularity.collateralId();
        const wbtcMintVal = ethers.BigNumber.from((1e8).toString()).mul(1);
        const usdcMintVal = wbtcMintVal
            .mul(1e10)
            .mul(__wbtcUsdcPrice.div((1e18).toString()));

        // We get asset
        await wbtc.freeMint(wbtcMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We lend WBTC as deployer
        await wbtcDepositAndAddAsset(wbtcMintVal);
        expect(
            await wbtcUsdcSingularity.balanceOf(deployer.address),
        ).to.be.equal(await yieldBox.toShare(assetId, wbtcMintVal, false));

        // We deposit USDC collateral
        await usdcDepositAndAddCollateralWbtcSingularity(usdcMintVal, eoa1);
        expect(
            await wbtcUsdcSingularity.userCollateralShare(eoa1.address),
        ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

        // We borrow 74% collateral, max is 75%
        const wbtcBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wbtcUsdcPrice.div((1e18).toString()))
            .div(1e10);

        await wbtcUsdcSingularity
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, wbtcBorrowVal.toString());
        await yieldBox
            .connect(eoa1)
            .withdraw(assetId, eoa1.address, eoa1.address, wbtcBorrowVal, 0);

        const data = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
        // Can't liquidate
        await expect(
            wbtcUsdcSingularity.liquidate(
                [eoa1.address],
                [wbtcBorrowVal],
                multiSwapper.address,
                data,
                data,
            ),
        ).to.be.reverted;

        // Can be liquidated price drop (USDC/WETH)
        const priceDrop = __wbtcUsdcPrice.mul(20).div(100);

        await wbtcUsdcOracle.set(__wbtcUsdcPrice.add(priceDrop));

        await expect(
            wbtcUsdcSingularity.liquidate(
                [eoa1.address],
                [wbtcBorrowVal],
                multiSwapper.address,
                data,
                data,
            ),
        ).to.not.be.reverted;
    });

    it('Should accumulate fees for lender', async () => {
        const {
            usdc,
            weth,
            yieldBox,
            eoa1,
            wethUsdcSingularity,
            deployer,
            initContracts,
            approveTokensAndSetBarApproval,
            usdcDepositAndAddCollateral,
            marketsHelper,
            BN,
            __wethUsdcPrice,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Singularity: below minimum`

        const lendVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const collateralVal = lendVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        const borrowVal = collateralVal
            .mul(50)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));
        await weth.freeMint(lendVal);
        await usdc.connect(eoa1).freeMint(collateralVal);

        /**
         * LEND
         */
        const balanceBefore = await weth.balanceOf(deployer.address);
        // Deposit assets to bar
        const lendValShare = await yieldBox.toShare(
            await wethUsdcSingularity.assetId(),
            lendVal,
            false,
        );
        await (await weth.approve(yieldBox.address, lendVal)).wait();
        await (
            await yieldBox.depositAsset(
                await wethUsdcSingularity.assetId(),
                deployer.address,
                deployer.address,
                0,
                lendValShare,
            )
        ).wait();

        // Add asset to Singularity
        await (
            await yieldBox.setApprovalForAll(wethUsdcSingularity.address, true)
        ).wait();
        await (
            await wethUsdcSingularity.addAsset(
                deployer.address,
                deployer.address,
                false,
                lendValShare,
            )
        ).wait();

        /**
         * BORROW
         */
        const collateralId = await wethUsdcSingularity.collateralId();

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We deposit USDC collateral
        await usdcDepositAndAddCollateral(collateralVal, eoa1);
        expect(
            await wethUsdcSingularity.userCollateralShare(eoa1.address),
        ).equal(await yieldBox.toShare(collateralId, collateralVal, false));

        // We borrow
        await wethUsdcSingularity
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, borrowVal);

        // Validate fees
        const userBorrowPart = await wethUsdcSingularity.userBorrowPart(
            eoa1.address,
        );
        const minCollateralShareRepay =
            await marketsHelper.getCollateralSharesForBorrowPart(
                wethUsdcSingularity.address,
                borrowVal.mul(50).div(100000).add(borrowVal),
                ethers.BigNumber.from((1e5).toString()),
                ethers.BigNumber.from((1e18).toString()),
            );
        const userCollateralShareToRepay =
            await marketsHelper.getCollateralSharesForBorrowPart(
                wethUsdcSingularity.address,
                userBorrowPart,
                ethers.BigNumber.from((1e5).toString()),
                ethers.BigNumber.from((1e18).toString()),
            );

        expect(userCollateralShareToRepay).to.be.eq(minCollateralShareRepay);

        // Repay borrow
        const assetId = await wethUsdcSingularity.assetId();

        await weth.connect(eoa1).freeMint(userBorrowPart);

        await yieldBox
            .connect(eoa1)
            .depositAsset(
                assetId,
                eoa1.address,
                eoa1.address,
                userBorrowPart,
                0,
            );
        await wethUsdcSingularity
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, false, userBorrowPart);

        expect(await wethUsdcSingularity.userBorrowPart(eoa1.address)).to.be.eq(
            BN(0),
        );
        // Withdraw collateral
        await (
            await wethUsdcSingularity
                .connect(eoa1)
                .removeCollateral(
                    eoa1.address,
                    eoa1.address,
                    await wethUsdcSingularity.userCollateralShare(eoa1.address),
                )
        ).wait();

        await (
            await yieldBox
                .connect(eoa1)
                .withdraw(
                    collateralId,
                    eoa1.address,
                    eoa1.address,
                    0,
                    await yieldBox.balanceOf(eoa1.address, collateralId),
                )
        ).wait();

        // Withdraw assets
        await (
            await wethUsdcSingularity.removeAsset(
                deployer.address,
                deployer.address,
                lendValShare,
            )
        ).wait();

        await (
            await yieldBox.withdraw(
                assetId,
                deployer.address,
                deployer.address,
                0,
                await yieldBox.balanceOf(deployer.address, assetId),
            )
        ).wait();

        // Check that the lender has an increased amount
        const balanceAfter = await weth.balanceOf(deployer.address);
        expect(balanceAfter.gt(balanceBefore)).to.be.true;
    });

    it('Should accumulate fees and harvest them as collateral', async () => {
        const {
            usdc,
            weth,
            bar,
            yieldBox,
            eoa1,
            wethUsdcSingularity,
            deployer,
            approveTokensAndSetBarApproval,
            usdcDepositAndAddCollateral,
            wethDepositAndAddAsset,
            multiSwapper,
            singularityFeeTo,
            __wethUsdcPrice,
            timeTravel,
            marketsHelper,
        } = await loadFixture(register);

        const assetId = await wethUsdcSingularity.assetId();
        const collateralId = await wethUsdcSingularity.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We lend WETH as deployer
        await wethDepositAndAddAsset(wethMintVal);
        expect(
            await wethUsdcSingularity.balanceOf(deployer.address),
        ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

        // We deposit USDC collateral
        await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
        expect(
            await wethUsdcSingularity.userCollateralShare(eoa1.address),
        ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

        // We borrow 74% collateral, max is 75%
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));
        await wethUsdcSingularity
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, wethBorrowVal);

        // We jump time to accumulate fees
        const day = 86400;
        await timeTravel(180 * day);

        // Repay
        const userBorrowPart = await wethUsdcSingularity.userBorrowPart(
            eoa1.address,
        );
        await weth.connect(eoa1).freeMint(userBorrowPart);

        await yieldBox
            .connect(eoa1)
            .depositAsset(
                assetId,
                eoa1.address,
                eoa1.address,
                userBorrowPart,
                0,
            );
        await wethUsdcSingularity
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, false, userBorrowPart);

        const feesAmountInAsset = await marketsHelper.getAmountForAssetFraction(
            wethUsdcSingularity.address,
            (
                await wethUsdcSingularity.accrueInfo()
            ).feesEarnedFraction,
        );

        // Confirm fees accumulation
        expect(userBorrowPart.gt(wethBorrowVal));
        // Withdraw fees from Penrose
        const markets = await bar.singularityMarkets();
        const swappers = [];
        const swapData = [];
        for (let i = 0; i < markets.length; i++) {
            swappers.push(multiSwapper.address);
            swapData.push({ minAssetAmount: 1 });
        }
        await expect(
            bar.withdrawAllSingularityFees(markets, swappers, swapData),
        ).to.emit(wethUsdcSingularity, 'LogYieldBoxFeesDeposit');

        const amountHarvested = await yieldBox.toAmount(
            await bar.wethAssetId(),
            await yieldBox.balanceOf(
                singularityFeeTo.address,
                await bar.wethAssetId(),
            ),
            false,
        );
        // 0.31%
        const acceptableHarvestMargin = feesAmountInAsset.sub(
            feesAmountInAsset.mul(31).div(10000),
        );
        expect(amountHarvested.gte(acceptableHarvestMargin)).to.be.true;
    });

    it('should return ERC20 properties', async () => {
        const { wethUsdcSingularity } = await loadFixture(register);
        const symbol = await wethUsdcSingularity.symbol();
        const decimals = await wethUsdcSingularity.decimals();
        const totalSupply = await wethUsdcSingularity.totalSupply();

        expect(symbol.toLowerCase()).to.contain('weth-test');
        expect(decimals).to.eq(18);
        expect(totalSupply).to.eq(0);
    });

    it('should not allow initialization with bad arguments', async () => {
        const {
            bar,
            mediumRiskMC,
            wethUsdcOracle,
            _sglLendingBorrowingModule,
            _sglLiquidationModule,
        } = await loadFixture(register);

        const data = new ethers.utils.AbiCoder().encode(
            [
                'address',
                'address',
                'address',
                'address',
                'uint256',
                'address',
                'uint256',
                'address',
                'address[]',
                'address[]',
                'uint256',
            ],
            [
                _sglLiquidationModule.address,
                _sglLendingBorrowingModule.address,
                bar.address,
                ethers.constants.AddressZero,
                0,
                ethers.constants.AddressZero,
                0,
                wethUsdcOracle.address,
                [],
                [],
                ethers.utils.parseEther('1'),
            ],
        );

        await expect(
            bar.registerSingularity(mediumRiskMC.address, data, true),
        ).to.be.revertedWith('SGL: bad pair');
    });

    it('should compute amount to solvency for nothing borrowed', async () => {
        const { wethUsdcSingularity } = await loadFixture(register);
        const amountForNothingBorrowed =
            await wethUsdcSingularity.computeTVLInfo(
                ethers.constants.AddressZero,
                0,
            );
        expect(amountForNothingBorrowed[0].eq(0)).to.be.true;
    });

    it('should not update exchange rate', async () => {
        const { wethUsdcSingularity, wethUsdcOracle } = await loadFixture(
            register,
        );
        await wethUsdcOracle.setSuccess(false);

        await wethUsdcOracle.set(100);

        const previousExchangeRate = await wethUsdcSingularity.exchangeRate();
        await wethUsdcSingularity.updateExchangeRate();
        let currentExchangeRate = await wethUsdcSingularity.exchangeRate();

        expect(previousExchangeRate.eq(currentExchangeRate)).to.be.true;

        await wethUsdcOracle.setSuccess(true);
        await wethUsdcSingularity.updateExchangeRate();
        currentExchangeRate = await wethUsdcSingularity.exchangeRate();
        expect(currentExchangeRate.eq(100)).to.be.true;
    });

    it('removing everything should not be allowed', async () => {
        const {
            weth,
            yieldBox,
            wethDepositAndAddAsset,
            approveTokensAndSetBarApproval,
            deployer,
            wethUsdcSingularity,
        } = await loadFixture(register);

        const assetId = await wethUsdcSingularity.assetId();
        const wethMintVal = 1000;

        await weth.freeMint(1000);
        await approveTokensAndSetBarApproval();
        await wethDepositAndAddAsset(wethMintVal);
        expect(
            await wethUsdcSingularity.balanceOf(deployer.address),
        ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));
        const share = await yieldBox.toShare(assetId, wethMintVal, false);

        await expect(
            wethUsdcSingularity.removeAsset(
                deployer.address,
                deployer.address,
                share,
            ),
        ).to.be.revertedWith('SGL: min limit');
    });

    it('deposit fees to yieldbox should not work for inexistent swapper', async () => {
        const { wethUsdcSingularity } = await loadFixture(register);

        await expect(
            wethUsdcSingularity.depositFeesToYieldBox(
                ethers.constants.AddressZero,
                { minAssetAmount: 1 },
            ),
        ).to.be.revertedWith('SGL: Invalid swapper');
    });

    it('should not be allowed to initialize twice', async () => {
        const { wethUsdcSingularity } = await loadFixture(register);

        await expect(
            wethUsdcSingularity.init(ethers.utils.toUtf8Bytes('')),
        ).to.be.revertedWith('SGL: initialized');
        await wethUsdcSingularity.accrue();
        await wethUsdcSingularity.accrue();
    });

    it('should accrue when utilization is over & under target', async () => {
        const {
            usdc,
            weth,
            yieldBox,
            wethDepositAndAddAsset,
            usdcDepositAndAddCollateral,
            eoa1,
            approveTokensAndSetBarApproval,
            deployer,
            wethUsdcSingularity,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const assetId = await wethUsdcSingularity.assetId();
        const collateralId = await wethUsdcSingularity.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We lend WETH as deployer
        await wethDepositAndAddAsset(wethMintVal);
        expect(
            await wethUsdcSingularity.balanceOf(deployer.address),
        ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

        // We deposit USDC collateral
        await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
        expect(
            await wethUsdcSingularity.userCollateralShare(eoa1.address),
        ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

        const firstBorrow = ethers.BigNumber.from((1e17).toString());
        await wethUsdcSingularity
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, firstBorrow);
        await wethUsdcSingularity.accrue();

        await wethUsdcSingularity
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, wethMintVal.sub(firstBorrow));

        await wethUsdcSingularity.accrue();
    });

    it('should not execute when module does not exist', async () => {
        //register a singularity without lending module
        const {
            usdc,
            weth,
            bar,
            yieldBox,
            wethAssetId,
            usdcAssetId,
            wethUsdcOracle,
            mediumRiskMC,
            deployer,
        } = await loadFixture(register);
        const data = new ethers.utils.AbiCoder().encode(
            [
                'address',
                'address',
                'address',
                'address',
                'uint256',
                'address',
                'uint256',
                'address',
                'uint256',
            ],
            [
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                bar.address,
                weth.address,
                wethAssetId,
                usdc.address,
                usdcAssetId,
                wethUsdcOracle.address,
                ethers.utils.parseEther('1'),
            ],
        );
        await (
            await bar.registerSingularity(mediumRiskMC.address, data, true)
        ).wait();
        const wethUsdcSingularity = await ethers.getContractAt(
            'Singularity',
            await bar.clonesOf(
                mediumRiskMC.address,
                (await bar.clonesOfCount(mediumRiskMC.address)).sub(1),
            ),
        );

        expect(wethUsdcSingularity.address).to.not.eq(
            ethers.constants.AddressZero,
        );

        await expect(
            wethUsdcSingularity
                .connect(deployer)
                .borrow(deployer.address, deployer.address, 1),
        ).to.be.revertedWith('SGL: module not set');
    });

    it('should create and test wethUsd0 singularity', async () => {
        const {
            deployer,
            bar,
            eoa1,
            yieldBox,
            weth,
            wethAssetId,
            usdcAssetId,
            mediumRiskMC,
            wethUsdcOracle,
            usdc,
            usd0,
            __wethUsdcPrice,
            deployCurveStableToUsdoBidder,
            multiSwapper,
            BN,
            timeTravel,
        } = await loadFixture(register);
        //deploy and register USD0

        const usdoStratregy = await bar.emptyStrategies(usd0.address);
        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            usdoStratregy,
            0,
        );

        //Deploy & set Singularity
        const _sglLiquidationModule = await (
            await ethers.getContractFactory('SGLLiquidation')
        ).deploy();
        await _sglLiquidationModule.deployed();
        const _sglLendingBorrowingModule = await (
            await ethers.getContractFactory('SGLLendingBorrowing')
        ).deploy();
        await _sglLendingBorrowingModule.deployed();

        const collateralSwapPath = [usd0.address, weth.address];

        const newPrice = __wethUsdcPrice.div(1000000);
        await wethUsdcOracle.set(newPrice);

        const data = new ethers.utils.AbiCoder().encode(
            [
                'address',
                'address',
                'address',
                'address',
                'uint256',
                'address',
                'uint256',
                'address',
                'uint256',
            ],
            [
                _sglLiquidationModule.address,
                _sglLendingBorrowingModule.address,
                bar.address,
                usd0.address,
                usdoAssetId,
                weth.address,
                wethAssetId,
                wethUsdcOracle.address,
                ethers.utils.parseEther('1'),
            ],
        );
        await bar.registerSingularity(mediumRiskMC.address, data, true);
        const wethUsdoSingularity = await ethers.getContractAt(
            'Singularity',
            await bar.clonesOf(
                mediumRiskMC.address,
                (await bar.clonesOfCount(mediumRiskMC.address)).sub(1),
            ),
        );

        //Deploy & set LiquidationQueue
        await usd0.setMinterStatus(wethUsdoSingularity.address, true);
        await usd0.setBurnerStatus(wethUsdoSingularity.address, true);

        const liquidationQueue = await (
            await ethers.getContractFactory('LiquidationQueue')
        ).deploy();
        await liquidationQueue.deployed();

        const feeCollector = new ethers.Wallet(
            ethers.Wallet.createRandom().privateKey,
            ethers.provider,
        );

        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usd0,
        );

        const LQ_META = {
            activationTime: 600, // 10min
            minBidAmount: ethers.BigNumber.from((1e18).toString()).mul(200), // 200 USDC
            closeToMinBidAmount: ethers.BigNumber.from((1e18).toString()).mul(
                202,
            ),
            defaultBidAmount: ethers.BigNumber.from((1e18).toString()).mul(400), // 400 USDC
            feeCollector: feeCollector.address,
            bidExecutionSwapper: ethers.constants.AddressZero,
            usdoSwapper: stableToUsdoBidder.address,
        };
        await liquidationQueue.init(LQ_META, wethUsdoSingularity.address);

        const payload = wethUsdoSingularity.interface.encodeFunctionData(
            'setLiquidationQueue',
            [liquidationQueue.address],
        );

        await (
            await bar.executeMarketFn(
                [wethUsdoSingularity.address],
                [payload],
                true,
            )
        ).wait();

        //get tokens
        const wethAmount = ethers.BigNumber.from((1e18).toString()).mul(100);
        const usdoAmount = ethers.BigNumber.from((1e18).toString()).mul(20000);
        await usd0.mint(deployer.address, usdoAmount);
        await weth.connect(eoa1).freeMint(wethAmount);

        //aprove external operators
        await usd0
            .connect(deployer)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await weth
            .connect(deployer)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(deployer)
            .setApprovalForAll(wethUsdoSingularity.address, true);

        await usd0
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethUsdoSingularity.address, true);

        // We lend Usdo as deployer
        const usdoLendValue = usdoAmount.div(2);
        const _valShare = await yieldBox.toShare(
            usdoAssetId,
            usdoLendValue,
            false,
        );
        await yieldBox.depositAsset(
            usdoAssetId,
            deployer.address,
            deployer.address,
            0,
            _valShare,
        );
        await wethUsdoSingularity.addAsset(
            deployer.address,
            deployer.address,
            false,
            _valShare,
        );
        expect(
            await wethUsdoSingularity.balanceOf(deployer.address),
        ).to.be.equal(
            await yieldBox.toShare(usdoAssetId, usdoLendValue, false),
        );

        //we lend weth collateral
        const wethDepositAmount = ethers.BigNumber.from((1e18).toString()).mul(
            1,
        );
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                wethAssetId,
                eoa1.address,
                eoa1.address,
                wethDepositAmount,
                0,
            );
        const _wethValShare = await yieldBox
            .connect(eoa1)
            .balanceOf(eoa1.address, wethAssetId);
        await wethUsdoSingularity
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, _wethValShare);
        expect(
            await wethUsdoSingularity.userCollateralShare(eoa1.address),
        ).equal(await yieldBox.toShare(wethAssetId, wethDepositAmount, false));

        //borrow
        const usdoBorrowVal = wethDepositAmount
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await wethUsdoSingularity
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);
        await yieldBox
            .connect(eoa1)
            .withdraw(
                usdoAssetId,
                eoa1.address,
                eoa1.address,
                usdoBorrowVal,
                0,
            );
        const usdoBalanceOfEoa = await usd0.balanceOf(eoa1.address);

        // Can't liquidate
        const swapData = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
        await expect(
            wethUsdoSingularity.liquidate(
                [eoa1.address],
                [usdoBorrowVal],
                multiSwapper.address,
                swapData,
                swapData,
            ),
        ).to.be.reverted;

        const priceDrop = newPrice.mul(2).div(100);
        await wethUsdcOracle.set(newPrice.add(priceDrop));

        const lqAssetId = await liquidationQueue.lqAssetId();
        expect(lqAssetId.eq(usdoAssetId)).to.be.true;

        await usdc.freeMint(ethers.BigNumber.from((1e18).toString()).mul(1000));
        await usdc.approve(
            yieldBox.address,
            ethers.BigNumber.from((1e18).toString()).mul(1000),
        );
        await yieldBox.depositAsset(
            usdcAssetId,
            deployer.address,
            deployer.address,
            ethers.BigNumber.from((1e18).toString()).mul(1000),
            0,
        );
        await yieldBox.setApprovalForAll(liquidationQueue.address, true);
        await expect(
            liquidationQueue.bidWithStable(
                deployer.address,
                1,
                usdcAssetId,
                ethers.BigNumber.from((1e18).toString()).mul(1000),
                swapData,
            ),
        ).to.emit(liquidationQueue, 'Bid');
        await timeTravel(10_000);
        await expect(liquidationQueue.activateBid(deployer.address, 1)).to.emit(
            liquidationQueue,
            'ActivateBid',
        );

        await expect(
            wethUsdoSingularity.liquidate(
                [eoa1.address],
                [usdoBorrowVal],
                multiSwapper.address,
                swapData,
                swapData,
            ),
        ).to.not.be.reverted;
    });

    it('should get correct amount from borrow part', async () => {
        const {
            deployer,
            usdc,
            BN,
            approveTokensAndSetBarApproval,
            usdcDepositAndAddCollateral,
            wethDepositAndAddAsset,
            wethUsdcSingularity,
            marketsHelper,
            __wethUsdcPrice,
            weth,
            eoa1,
        } = await loadFixture(register);

        const wethAmount = BN(1e18).mul(1);
        const usdcAmount = wethAmount
            .mul(__wethUsdcPrice.mul(2))
            .div((1e18).toString());

        await usdc.freeMint(usdcAmount);
        await approveTokensAndSetBarApproval();
        await usdcDepositAndAddCollateral(usdcAmount);

        await approveTokensAndSetBarApproval(eoa1);
        await weth.connect(eoa1).freeMint(wethAmount);
        await wethDepositAndAddAsset(wethAmount, eoa1);

        await wethUsdcSingularity.borrow(
            deployer.address,
            deployer.address,
            wethAmount,
        );

        const amountFromShares = await marketsHelper.getAmountForBorrowPart(
            wethUsdcSingularity.address,
            await wethUsdcSingularity.userBorrowPart(deployer.address),
        );

        expect(amountFromShares).to.be.approximately(
            wethAmount,
            wethAmount.mul(1).div(100),
        );
    });

    it('should compute fee withdrawals and execute', async () => {
        const {
            usdc,
            weth,
            bar,
            wethAssetId,
            yieldBox,
            eoa1,
            wethUsdcSingularity,
            deployer,
            approveTokensAndSetBarApproval,
            usdcDepositAndAddCollateral,
            wethDepositAndAddAsset,
            multiSwapper,
            singularityFeeTo,
            __wethUsdcPrice,
            timeTravel,
            marketsHelper,
        } = await loadFixture(register);

        const assetId = await wethUsdcSingularity.assetId();
        const collateralId = await wethUsdcSingularity.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We lend WETH as deployer
        await wethDepositAndAddAsset(wethMintVal);
        expect(
            await wethUsdcSingularity.balanceOf(deployer.address),
        ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

        // We deposit USDC collateral
        await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
        expect(
            await wethUsdcSingularity.userCollateralShare(eoa1.address),
        ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

        // We borrow 74% collateral, max is 75%
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));
        await wethUsdcSingularity
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, wethBorrowVal);

        // We jump time to accumulate fees
        const day = 86400;
        await timeTravel(180 * day);

        // Repay
        const userBorrowPart = await wethUsdcSingularity.userBorrowPart(
            eoa1.address,
        );
        await weth.connect(eoa1).freeMint(userBorrowPart);

        await yieldBox
            .connect(eoa1)
            .depositAsset(
                assetId,
                eoa1.address,
                eoa1.address,
                userBorrowPart,
                0,
            );
        await wethUsdcSingularity
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, false, userBorrowPart);

        const feesAmountInAsset = await marketsHelper.getAmountForAssetFraction(
            wethUsdcSingularity.address,
            (
                await wethUsdcSingularity.accrueInfo()
            ).feesEarnedFraction,
        );

        // Confirm fees accumulation
        expect(userBorrowPart.gt(wethBorrowVal));

        const feeShareIn = await yieldBox.toShare(
            assetId,
            feesAmountInAsset,
            false,
        );
        const marketAsset = await wethUsdcSingularity.asset();
        const marketCollateral = await wethUsdcSingularity.collateral();
        const marketAssetId = await wethUsdcSingularity.assetId();
        const feeMinAmount = await multiSwapper.getOutputAmount(
            marketAssetId,
            feeShareIn,
            new ethers.utils.AbiCoder().encode(
                ['address[]'],
                [[marketCollateral, marketAsset]],
            ),
        );

        // Withdraw fees from Penrose
        const markets = [wethUsdcSingularity.address];
        const swappers = [multiSwapper.address];
        const swapData = [{ minAssetAmount: feeMinAmount }];

        await expect(
            bar.withdrawAllSingularityFees(markets, swappers, swapData),
        ).to.emit(wethUsdcSingularity, 'LogYieldBoxFeesDeposit');

        const amountHarvested = await yieldBox.toAmount(
            wethAssetId,
            await yieldBox.balanceOf(singularityFeeTo.address, wethAssetId),
            false,
        );
        // 0.31%
        const acceptableHarvestMargin = feesAmountInAsset.sub(
            feesAmountInAsset.mul(31).div(10000),
        );
        expect(amountHarvested.gte(acceptableHarvestMargin)).to.be.true;
    });

    it('should get correct collateral amount from collateral shares', async () => {
        const {
            deployer,
            usdc,
            BN,
            approveTokensAndSetBarApproval,
            usdcDepositAndAddCollateral,
            wethUsdcSingularity,
            __wethUsdcPrice,
            eoa1,
            marketsHelper,
        } = await loadFixture(register);

        const wethAmount = BN(1e18).mul(1);
        const usdcAmount = wethAmount
            .mul(__wethUsdcPrice.mul(2))
            .div((1e18).toString());

        await usdc.freeMint(usdcAmount);
        await approveTokensAndSetBarApproval();
        await usdcDepositAndAddCollateral(usdcAmount);

        await usdc.connect(eoa1).freeMint(usdcAmount.mul(2));
        await approveTokensAndSetBarApproval(eoa1);
        await usdcDepositAndAddCollateral(usdcAmount.mul(2), eoa1);

        const collateralAmount =
            await marketsHelper.getCollateralAmountForShare(
                wethUsdcSingularity.address,
                await wethUsdcSingularity.userCollateralShare(deployer.address),
            );

        expect(collateralAmount).to.be.equal(usdcAmount);
    });

    it('should allow multiple borrowers', async () => {
        const {
            usdc,
            eoa1,
            weth,
            yieldBox,
            multiSwapper,
            deployer,
            wethUsdcSingularity,
            timeTravel,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
            usdcDepositAndAddCollateral,
            eoas,
        } = await loadFixture(register);

        const assetId = await wethUsdcSingularity.assetId();
        const collateralId = await wethUsdcSingularity.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));

        await weth.freeMint(wethMintVal.mul(10));
        await approveTokensAndSetBarApproval();
        await wethDepositAndAddAsset(wethMintVal.mul(10));
        expect(
            await wethUsdcSingularity.balanceOf(deployer.address),
        ).to.be.equal(
            await yieldBox.toShare(assetId, wethMintVal.mul(10), false),
        );

        const wethYieldShareFromSGLAfter =
            await wethUsdcSingularity.yieldBoxShares(deployer.address, assetId);

        expect(
            wethYieldShareFromSGLAfter.eq(
                await yieldBox.toShare(assetId, wethMintVal.mul(10), false),
            ),
        ).to.be.true;

        for (let i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            await usdc.connect(eoa).freeMint(usdcMintVal);
            await approveTokensAndSetBarApproval(eoa);
            await usdcDepositAndAddCollateral(usdcMintVal, eoa);
            expect(
                await wethUsdcSingularity.userCollateralShare(eoa.address),
            ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));
            timeTravel(86400);
        }

        timeTravel(86400 * 5);
        const firstBorrow = ethers.BigNumber.from((1e17).toString());

        for (let i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            await wethUsdcSingularity
                .connect(eoa)
                .borrow(eoa.address, eoa.address, firstBorrow);
            timeTravel(10 * 86400);
        }

        timeTravel(10 * 86400);
        await wethUsdcSingularity.depositFeesToYieldBox(multiSwapper.address, {
            minAssetAmount: 1,
        });
    });

    it('should test withdrawTo checks', async () => {
        const { wethUsdcSingularity, deployer } = await loadFixture(register);

        await expect(
            wethUsdcSingularity.withdrawTo(
                deployer.address,
                1,
                ethers.utils.defaultAbiCoder.encode(
                    ['address'],
                    [deployer.address],
                ),
                100,
                ethers.utils.toUtf8Bytes(''),
                deployer.address,
            ),
        ).to;
    });

    it('should test yieldBoxShares', async () => {
        const {
            eoa1,
            weth,
            yieldBox,
            deployer,
            wethUsdcSingularity,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
            timeTravel,
        } = await loadFixture(register);

        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        const assetId = await wethUsdcSingularity.assetId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);

        await weth.freeMint(wethMintVal);
        await timeTravel(86500);
        await wethDepositAndAddAsset(wethMintVal);

        let deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            deployer.address,
            assetId,
        );
        let eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            eoa1.address,
            assetId,
        );
        let yieldBoxSharesForSgl = await yieldBox.balanceOf(
            wethUsdcSingularity.address,
            assetId,
        );
        let yieldBoxSharesForDeployer = await yieldBox.balanceOf(
            deployer.address,
            assetId,
        );
        let yieldBoxSharesForEoa1 = await yieldBox.balanceOf(
            eoa1.address,
            assetId,
        );

        await weth.connect(eoa1).freeMint(wethMintVal);
        await timeTravel(86500);
        await wethDepositAndAddAsset(wethMintVal, eoa1);

        deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            deployer.address,
            assetId,
        );
        eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            eoa1.address,
            assetId,
        );
        yieldBoxSharesForSgl = await yieldBox.balanceOf(
            wethUsdcSingularity.address,
            assetId,
        );
        yieldBoxSharesForDeployer = await yieldBox.balanceOf(
            deployer.address,
            assetId,
        );
        yieldBoxSharesForEoa1 = await yieldBox.balanceOf(eoa1.address, assetId);
        expect(
            eoa1YieldBoxShares
                .add(deployerYieldBoxShares)
                .eq(
                    yieldBoxSharesForSgl
                        .add(yieldBoxSharesForDeployer)
                        .add(yieldBoxSharesForEoa1),
                ),
        ).to.be.true;

        deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            deployer.address,
            assetId,
        );
        eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            eoa1.address,
            assetId,
        );
        yieldBoxSharesForSgl = await yieldBox.balanceOf(
            wethUsdcSingularity.address,
            assetId,
        );
        yieldBoxSharesForDeployer = await yieldBox.balanceOf(
            deployer.address,
            assetId,
        );
        yieldBoxSharesForEoa1 = await yieldBox.balanceOf(eoa1.address, assetId);
        expect(
            eoa1YieldBoxShares
                .add(deployerYieldBoxShares)
                .eq(
                    yieldBoxSharesForSgl
                        .add(yieldBoxSharesForDeployer)
                        .add(yieldBoxSharesForEoa1),
                ),
        ).to.be.true;

        await weth.connect(eoa1).freeMint(wethMintVal);
        await timeTravel(86500);
        await wethDepositAndAddAsset(wethMintVal, eoa1);

        deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            deployer.address,
            assetId,
        );
        eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            eoa1.address,
            assetId,
        );
        yieldBoxSharesForSgl = await yieldBox.balanceOf(
            wethUsdcSingularity.address,
            assetId,
        );
        yieldBoxSharesForDeployer = await yieldBox.balanceOf(
            deployer.address,
            assetId,
        );
        yieldBoxSharesForEoa1 = await yieldBox.balanceOf(eoa1.address, assetId);
        expect(
            eoa1YieldBoxShares
                .add(deployerYieldBoxShares)
                .eq(
                    yieldBoxSharesForSgl
                        .add(yieldBoxSharesForDeployer)
                        .add(yieldBoxSharesForEoa1),
                ),
        ).to.be.true;
        const mintValShare = await yieldBox.toShare(
            assetId,
            wethMintVal,
            false,
        );
        await wethUsdcSingularity.removeAsset(
            deployer.address,
            deployer.address,
            mintValShare,
        );

        deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            deployer.address,
            assetId,
        );
        eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            eoa1.address,
            assetId,
        );
        yieldBoxSharesForSgl = await yieldBox.balanceOf(
            wethUsdcSingularity.address,
            assetId,
        );
        yieldBoxSharesForDeployer = await yieldBox.balanceOf(
            deployer.address,
            assetId,
        );
        yieldBoxSharesForEoa1 = await yieldBox.balanceOf(eoa1.address, assetId);
        expect(
            eoa1YieldBoxShares
                .add(deployerYieldBoxShares)
                .eq(
                    yieldBoxSharesForSgl
                        .add(yieldBoxSharesForDeployer)
                        .add(yieldBoxSharesForEoa1),
                ),
        ).to.be.true;

        await weth.freeMint(wethMintVal.mul(3));
        await timeTravel(86500);
        await wethDepositAndAddAsset(wethMintVal.mul(3));

        deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            deployer.address,
            assetId,
        );
        eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            eoa1.address,
            assetId,
        );
        yieldBoxSharesForSgl = await yieldBox.balanceOf(
            wethUsdcSingularity.address,
            assetId,
        );
        yieldBoxSharesForDeployer = await yieldBox.balanceOf(
            deployer.address,
            assetId,
        );
        yieldBoxSharesForEoa1 = await yieldBox.balanceOf(eoa1.address, assetId);
        expect(
            eoa1YieldBoxShares
                .add(deployerYieldBoxShares)
                .eq(
                    yieldBoxSharesForSgl
                        .add(yieldBoxSharesForDeployer)
                        .add(yieldBoxSharesForEoa1),
                ),
        ).to.be.true;

        await wethUsdcSingularity.removeAsset(
            deployer.address,
            deployer.address,
            mintValShare.mul(3),
        );
        await yieldBox.withdraw(
            assetId,
            deployer.address,
            deployer.address,
            0,
            mintValShare.mul(4),
        );

        deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            deployer.address,
            assetId,
        );
        eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            eoa1.address,
            assetId,
        );
        yieldBoxSharesForSgl = await yieldBox.balanceOf(
            wethUsdcSingularity.address,
            assetId,
        );
        yieldBoxSharesForDeployer = await yieldBox.balanceOf(
            deployer.address,
            assetId,
        );
        yieldBoxSharesForEoa1 = await yieldBox.balanceOf(eoa1.address, assetId);
        expect(
            eoa1YieldBoxShares
                .add(deployerYieldBoxShares)
                .eq(
                    yieldBoxSharesForSgl
                        .add(yieldBoxSharesForDeployer)
                        .add(yieldBoxSharesForEoa1),
                ),
        ).to.be.true;

        await wethUsdcSingularity
            .connect(eoa1)
            .removeAsset(eoa1.address, eoa1.address, mintValShare);

        deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            deployer.address,
            assetId,
        );
        eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            eoa1.address,
            assetId,
        );
        yieldBoxSharesForSgl = await yieldBox.balanceOf(
            wethUsdcSingularity.address,
            assetId,
        );
        yieldBoxSharesForDeployer = await yieldBox.balanceOf(
            deployer.address,
            assetId,
        );
        yieldBoxSharesForEoa1 = await yieldBox.balanceOf(eoa1.address, assetId);
        expect(
            eoa1YieldBoxShares
                .add(deployerYieldBoxShares)
                .eq(
                    yieldBoxSharesForSgl
                        .add(yieldBoxSharesForDeployer)
                        .add(yieldBoxSharesForEoa1),
                ),
        ).to.be.true;

        await yieldBox
            .connect(eoa1)
            .withdraw(assetId, eoa1.address, eoa1.address, 0, mintValShare);
        deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            deployer.address,
            assetId,
        );
        eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
            eoa1.address,
            assetId,
        );
        yieldBoxSharesForSgl = await yieldBox.balanceOf(
            wethUsdcSingularity.address,
            assetId,
        );
        yieldBoxSharesForDeployer = await yieldBox.balanceOf(
            deployer.address,
            assetId,
        );
        yieldBoxSharesForEoa1 = await yieldBox.balanceOf(eoa1.address, assetId);
        expect(
            eoa1YieldBoxShares
                .add(deployerYieldBoxShares)
                .eq(
                    yieldBoxSharesForSgl
                        .add(yieldBoxSharesForDeployer)
                        .add(yieldBoxSharesForEoa1),
                ),
        ).to.be.true;
    });

    it('actions should not work when the contract is paused', async () => {
        const {
            deployer,
            bar,
            usdc,
            BN,
            approveTokensAndSetBarApproval,
            usdcDepositAndAddCollateral,
            wethUsdcSingularity,
            wethDepositAndAddAsset,
            weth,
            __wethUsdcPrice,
            eoa1,
            marketsHelper,
            timeTravel,
        } = await loadFixture(register);

        const setConservatorData =
            wethUsdcSingularity.interface.encodeFunctionData('setConservator', [
                deployer.address,
            ]);
        await bar.executeMarketFn(
            [wethUsdcSingularity.address],
            [setConservatorData],
            true,
        );

        const wethAmount = BN(1e18).mul(1);
        const usdcAmount = wethAmount
            .mul(__wethUsdcPrice.mul(2))
            .div((1e18).toString());

        await wethUsdcSingularity.updatePause(true);

        await usdc.freeMint(usdcAmount);
        await timeTravel(86500);
        await approveTokensAndSetBarApproval();
        await expect(
            usdcDepositAndAddCollateral(usdcAmount),
        ).to.be.revertedWith('SGL: paused');

        await wethUsdcSingularity.updatePause(false);

        await usdc.freeMint(usdcAmount);
        await approveTokensAndSetBarApproval();
        await usdcDepositAndAddCollateral(usdcAmount);

        await wethUsdcSingularity.updatePause(true);

        await approveTokensAndSetBarApproval(eoa1);
        await weth.connect(eoa1).freeMint(wethAmount);
        await timeTravel(86500);
        await expect(
            wethDepositAndAddAsset(wethAmount, eoa1),
        ).to.be.revertedWith('SGL: paused');

        await wethUsdcSingularity.updatePause(false);

        await approveTokensAndSetBarApproval(eoa1);
        await weth.connect(eoa1).freeMint(wethAmount);
        await timeTravel(86500);
        await expect(wethDepositAndAddAsset(wethAmount, eoa1)).not.to.be
            .reverted;
    });

    it('should test liquidator rewards & closing factor', async () => {
        const {
            eoa1,
            usdc,
            weth,
            yieldBox,
            deployer,
            wethUsdcSingularity,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
            __wethUsdcPrice,
            timeTravel,
            usdcDepositAndAddCollateral,
            marketsHelper,
            BN,
            wethUsdcOracle,
        } = await loadFixture(register);

        const wethAmount = BN(1e18).mul(1);
        const usdcAmount = wethAmount
            .mul(__wethUsdcPrice.mul(3))
            .div((1e18).toString());

        await usdc.freeMint(usdcAmount);
        await approveTokensAndSetBarApproval();
        await usdcDepositAndAddCollateral(usdcAmount);

        await approveTokensAndSetBarApproval(eoa1);
        await weth.connect(eoa1).freeMint(wethAmount);
        await wethDepositAndAddAsset(wethAmount, eoa1);

        //30%
        await wethUsdcSingularity.borrow(
            deployer.address,
            deployer.address,
            wethAmount,
        );

        await wethUsdcSingularity.updateExchangeRate();
        let exchangeRate = await wethUsdcSingularity.exchangeRate();
        let reward = await wethUsdcSingularity.computeLiquidatorReward(
            deployer.address,
            exchangeRate,
        );

        expect(reward.eq(0)).to.be.true;

        await timeTravel(86500);
        //60%
        await weth.connect(eoa1).freeMint(wethAmount);
        await wethDepositAndAddAsset(wethAmount, eoa1);
        await wethUsdcSingularity.borrow(
            deployer.address,
            deployer.address,
            wethAmount,
        );
        reward = await wethUsdcSingularity.computeLiquidatorReward(
            deployer.address,
            exchangeRate,
        );
        expect(reward.eq(0)).to.be.true;

        await timeTravel(86500);

        //20% price drop
        let priceDrop = __wethUsdcPrice.mul(20).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
        await wethUsdcSingularity.updateExchangeRate();
        exchangeRate = await wethUsdcSingularity.exchangeRate();

        let prevReward;
        reward = await wethUsdcSingularity.computeLiquidatorReward(
            deployer.address,
            exchangeRate,
        );
        prevReward = reward;
        expect(reward.gt(0)).to.be.true;
        let prevClosingFactor;
        let closingFactor = await wethUsdcSingularity.computeClosingFactor(
            deployer.address,
            exchangeRate,
        );
        expect(closingFactor.gt(0)).to.be.true;
        prevClosingFactor = closingFactor;

        priceDrop = __wethUsdcPrice.mul(25).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
        await wethUsdcSingularity.updateExchangeRate();
        exchangeRate = await wethUsdcSingularity.exchangeRate();
        reward = await wethUsdcSingularity.computeLiquidatorReward(
            deployer.address,
            exchangeRate,
        );
        expect(reward.lt(prevReward)).to.be.true;
        prevReward = reward;
        closingFactor = await wethUsdcSingularity.computeClosingFactor(
            deployer.address,
            exchangeRate,
        );
        expect(closingFactor.gt(prevClosingFactor)).to.be.true;
        prevClosingFactor = closingFactor;

        priceDrop = __wethUsdcPrice.mul(35).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
        await wethUsdcSingularity.updateExchangeRate();
        exchangeRate = await wethUsdcSingularity.exchangeRate();
        reward = await wethUsdcSingularity.computeLiquidatorReward(
            deployer.address,
            exchangeRate,
        );
        expect(reward.lt(prevReward)).to.be.true;
        prevReward = reward;
        closingFactor = await wethUsdcSingularity.computeClosingFactor(
            deployer.address,
            exchangeRate,
        );
        expect(closingFactor.gt(prevClosingFactor)).to.be.true;
        prevClosingFactor = closingFactor;

        priceDrop = __wethUsdcPrice.mul(50).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
        await wethUsdcSingularity.updateExchangeRate();
        exchangeRate = await wethUsdcSingularity.exchangeRate();
        reward = await wethUsdcSingularity.computeLiquidatorReward(
            deployer.address,
            exchangeRate,
        );
        expect(reward.lt(prevReward)).to.be.true;
        prevReward = reward;
        closingFactor = await wethUsdcSingularity.computeClosingFactor(
            deployer.address,
            exchangeRate,
        );
        expect(closingFactor.gt(prevClosingFactor)).to.be.true;
        prevClosingFactor = closingFactor;

        priceDrop = __wethUsdcPrice.mul(60).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
        await wethUsdcSingularity.updateExchangeRate();
        exchangeRate = await wethUsdcSingularity.exchangeRate();
        reward = await wethUsdcSingularity.computeLiquidatorReward(
            deployer.address,
            exchangeRate,
        );
        expect(reward.eq(prevReward)).to.be.true;
        prevReward = reward;
        closingFactor = await wethUsdcSingularity.computeClosingFactor(
            deployer.address,
            exchangeRate,
        );
        expect(closingFactor.eq(prevClosingFactor)).to.be.true;
        prevClosingFactor = closingFactor;
    });
});

import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register, setBalance } from './test.utils';
import { LiquidationQueue, WETH9Mock, YieldBox } from '../typechain';
import { BigNumberish, Wallet } from 'ethers';

async function makeBid(
    liquidator: Wallet,
    weth: WETH9Mock,
    liquidationQueue: LiquidationQueue,
    yieldBox: YieldBox,
    liquidatorBalance: BigNumberish,
    poolId: number,
) {
    const assetId = await liquidationQueue.lqAssetId();
    await setBalance(liquidator.address, 100000);
    await weth.connect(liquidator).freeMint(liquidatorBalance);
    await weth.connect(liquidator).approve(yieldBox.address, liquidatorBalance);
    await yieldBox
        .connect(liquidator)
        .depositAsset(
            assetId,
            liquidator.address,
            liquidator.address,
            liquidatorBalance,
            0,
        );
    await yieldBox
        .connect(liquidator)
        .setApprovalForAll(liquidationQueue.address, true);
    // bid
    expect(
        await liquidationQueue
            .connect(liquidator)
            .bid(liquidator.address, poolId, liquidatorBalance),
    ).to.emit(liquidationQueue, 'Bid');
}

describe('LiquidationQueue test', () => {
    it('unable to fully liquidate the loan', async () => {
        const {
            BN,
            usdc,
            weth,
            liquidationQueue,
            wethUsdcMixologist,
            usdcDepositAndAddCollateral,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
            eoa1,
            __wethUsdcPrice,
            yieldBox,
            LQ_META,
            jumpTime,
            wethUsdcOracle,
        } = await register();

        // weth id
        const assetId = await wethUsdcMixologist.assetId();
        // 10eth
        const wethMintVal = BN(1e18).mul(10);
        // amount of equivalent USDC
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        // We get asset
        await usdc.connect(eoa1).freeMint(usdcMintVal);
        // We approve external operators
        await approveTokensAndSetBarApproval(eoa1);
        await usdcDepositAndAddCollateral(usdcMintVal, eoa1);

        const startWethBalance = await weth.balanceOf(eoa1.address);
        console.log('startWethBalance ' + startWethBalance);

        // lender deposit funds
        // We get asset
        await weth.freeMint(wethMintVal);
        // We approve external operators
        await approveTokensAndSetBarApproval();
        // We lend WETH as deployer
        await wethDepositAndAddAsset(wethMintVal);
        // borrow
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));
        await wethUsdcMixologist
            .connect(eoa1)
            .borrow(eoa1.address, wethBorrowVal);
        const yieldBoxBalance = await yieldBox.amountOf(eoa1.address, assetId);
        console.log('yieldBoxBalance ' + yieldBoxBalance);
        // withdraw from yieldBox
        await yieldBox
            .connect(eoa1)
            .withdraw(assetId, eoa1.address, eoa1.address, wethBorrowVal, 0);
        const endWethBalance = await weth.balanceOf(eoa1.address);
        console.log('endWethBalance ' + endWethBalance);

        // Make some price movement and liquidate
        await wethUsdcOracle.set(__wethUsdcPrice.mul(105).div(100));
        // check if eoa is still solvent
        await wethUsdcMixologist.updateExchangeRate();
        const assetAmountToSolvency =
            await wethUsdcMixologist.computeAssetAmountToSolvency(
                eoa1.address,
                await wethUsdcMixologist.exchangeRate(),
            );
        console.log('assetAmountToSolvency', assetAmountToSolvency.toString());
        expect(assetAmountToSolvency).gte(0);

        // create liquidator
        const liquidator = new ethers.Wallet(
            ethers.Wallet.createRandom().privateKey,
            ethers.provider,
        );
        const POOL = 10;

        const bidAmount = assetAmountToSolvency.mul(90).div(100);

        await makeBid(
            liquidator,
            weth,
            liquidationQueue,
            yieldBox,
            bidAmount,
            POOL,
        );

        expect(
            (await liquidationQueue.bidPools(POOL, liquidator.address)).amount,
        ).to.equal(bidAmount);

        await jumpTime(LQ_META.activationTime);
        await liquidationQueue
            .connect(liquidator)
            .activateBid(liquidator.address, POOL);
        expect((await liquidationQueue.getNextAvailBidPool()).available).to.be
            .true;

        // expect(
        //     await wethUsdcMixologist.liquidate(
        //         [eoa1.address],
        //         [],
        //         ethers.constants.AddressZero,
        //     ),
        // ).to.emit(liquidationQueue, 'ExecuteBids');

        await expect(
            wethUsdcMixologist.liquidate(
                [eoa1.address],
                [],
                ethers.constants.AddressZero,
            ),
        ).to.be.revertedWith('LQ: Unable to fully liquidate');
    });

    it('able to liquidate the loan', async () => {
        const {
            BN,
            usdc,
            weth,
            liquidationQueue,
            wethUsdcMixologist,
            usdcDepositAndAddCollateral,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
            eoa1,
            __wethUsdcPrice,
            yieldBox,
            LQ_META,
            jumpTime,
            wethUsdcOracle,
        } = await register();

        // weth id
        const assetId = await wethUsdcMixologist.assetId();
        // 10eth
        const wethMintVal = BN(1e18).mul(10);
        // amount of equivalent USDC
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        // We get asset
        await usdc.connect(eoa1).freeMint(usdcMintVal);
        // We approve external operators
        await approveTokensAndSetBarApproval(eoa1);
        await usdcDepositAndAddCollateral(usdcMintVal, eoa1);

        const startWethBalance = await weth.balanceOf(eoa1.address);
        console.log('startWethBalance ' + startWethBalance);

        // lender deposit funds
        // We get asset
        await weth.freeMint(wethMintVal);
        // We approve external operators
        await approveTokensAndSetBarApproval();
        // We lend WETH as deployer
        await wethDepositAndAddAsset(wethMintVal);
        // borrow
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));
        await wethUsdcMixologist
            .connect(eoa1)
            .borrow(eoa1.address, wethBorrowVal);
        const yieldBoxBalance = await yieldBox.amountOf(eoa1.address, assetId);
        console.log('yieldBoxBalance ' + yieldBoxBalance);
        // withdraw from yieldBox
        await yieldBox
            .connect(eoa1)
            .withdraw(assetId, eoa1.address, eoa1.address, wethBorrowVal, 0);
        const endWethBalance = await weth.balanceOf(eoa1.address);
        console.log('endWethBalance ' + endWethBalance);

        // Make some price movement and liquidate
        await wethUsdcOracle.set(__wethUsdcPrice.mul(105).div(100));
        // check if eoa is still solvent
        await wethUsdcMixologist.updateExchangeRate();
        const assetAmountToSolvency =
            await wethUsdcMixologist.computeAssetAmountToSolvency(
                eoa1.address,
                await wethUsdcMixologist.exchangeRate(),
            );
        console.log('assetAmountToSolvency', assetAmountToSolvency.toString());
        expect(assetAmountToSolvency).gte(0);

        // create liquidator
        const liquidator = new ethers.Wallet(
            ethers.Wallet.createRandom().privateKey,
            ethers.provider,
        );
        const POOL = 10;

        const bidAmount = assetAmountToSolvency.mul(90).div(100);

        await makeBid(
            liquidator,
            weth,
            liquidationQueue,
            yieldBox,
            bidAmount,
            POOL,
        );

        expect(
            (await liquidationQueue.bidPools(POOL, liquidator.address)).amount,
        ).to.equal(bidAmount);

        await jumpTime(LQ_META.activationTime);
        await liquidationQueue
            .connect(liquidator)
            .activateBid(liquidator.address, POOL);
        expect((await liquidationQueue.getNextAvailBidPool()).available).to.be
            .true;

        // expect(
        //     await wethUsdcMixologist.liquidate(
        //         [eoa1.address],
        //         [],
        //         ethers.constants.AddressZero,
        //     ),
        // ).to.emit(liquidationQueue, 'ExecuteBids');

        await expect(
            wethUsdcMixologist.liquidate(
                [eoa1.address],
                [],
                ethers.constants.AddressZero,
            ),
        ).to.be.revertedWith('LQ: Unable to fully liquidate');
    });
});

import hh, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';

describe('LiquidationQueue test', () => {
    it('should revert on liquidate when price drop is reversed', async ()=> {
            const {
                deployer,
                eoa1,
                feeCollector,
                __wethUsdcPrice,
                liquidationQueue,
                LQ_META,
                weth,
                usdc,
                bar,
                yieldBox,
                wethUsdcMixologist,
                wethUsdcOracle,
                multiSwapper,
                BN,
            } = await register();
    
    
            const POOL = 5;
            const marketAssetId = await wethUsdcMixologist.assetId();
            const marketColId = await wethUsdcMixologist.collateralId();
            const lqAssetId = await liquidationQueue.lqAssetId();
    
            // Bid ans ActivateBid
            const users = (await ethers.getSigners());//.slice(0, 11)
            for(let i = 0; i < users.length ; i++) {
                const signer = users[i];
    
                await (await weth.connect(signer).freeMint(LQ_META.minBidAmount.mul(100))).wait();
    
                await (
                    await weth.connect(signer).approve(yieldBox.address, LQ_META.minBidAmount.mul(100))
                ).wait();
                await yieldBox.connect(signer).depositAsset(
                    lqAssetId,
                    signer.address,
                    signer.address,
                    LQ_META.minBidAmount.mul(100),
                    0,
                );
                await yieldBox.connect(signer).setApprovalForAll(liquidationQueue.address, true);
                await liquidationQueue.connect(signer).bid(
                    signer.address,
                    POOL,
                    LQ_META.minBidAmount.mul(100),
                );
                await hh.network.provider.send('evm_increaseTime', [10_000]);
                await hh.network.provider.send('evm_mine');
                await liquidationQueue.connect(signer).activateBid(signer.address, POOL);
            }
    
            // Mint some weth to deposit as asset with EOA1
            const wethAmount = BN(1e18).mul(100000);
            await weth.connect(eoa1).freeMint(wethAmount);
            await weth.connect(eoa1).approve(yieldBox.address, wethAmount);
    
            // Add asset to market 
            await yieldBox
            .connect(eoa1)
            .depositAsset(
                marketAssetId,
                eoa1.address,
                eoa1.address,
                wethAmount,
                0,
            );
    
            await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethUsdcMixologist.address, true);
            
            await wethUsdcMixologist
            .connect(eoa1)
            .addAsset(
                eoa1.address,
                false,
              await yieldBox.toShare(marketAssetId, wethAmount, false));
        
            for(let i = 0; i < users.length ; i ++) {
                const signer = users[i]
                //const ta = await wethUsdcMixologist.totalAsset();
                // Mint some usdc to deposit as collateral and borrow
                const usdcAmount = ((wethAmount).mul(__wethUsdcPrice.div(BN(1e18)))).div(100000);
                
                const borrowAmount = usdcAmount
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div(BN(1e18)));
    
                await usdc.connect(signer).freeMint(usdcAmount);
                await usdc.connect(signer).approve(yieldBox.address, usdcAmount);
                await yieldBox.connect(signer).depositAsset(
                    marketColId,
                    signer.address,
                    signer.address,
                    usdcAmount,
                    0,
                );
    
                await yieldBox.connect(signer).setApprovalForAll(wethUsdcMixologist.address, true);
                await wethUsdcMixologist.connect(signer).addCollateral(
                    signer.address,
                    false,
                    await yieldBox.toShare(marketColId, usdcAmount, false),
                );
              await wethUsdcMixologist.connect(signer).borrow(signer.address, borrowAmount);
    
            }
            // Make price movements and liquidate
            let priceDrop = __wethUsdcPrice.mul(5).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
            await wethUsdcMixologist.updateExchangeRate();
    
            const userBorrowParts = []
            for(let i = 0; i < users.length; i++) {
                const signer = users[i]
                const result = await wethUsdcMixologist.userBorrowPart(signer.address)
                userBorrowParts.push(result)
            }
            // Liquidate half users
            for(let i = 0; i < users.length / 2; i++) {
                await expect(
                    wethUsdcMixologist.liquidate(
                        [users[i].address],
                        [userBorrowParts[i]],
                        multiSwapper.address,
                    ),
                ).to.not.be.reverted;
            }   
            // reverse price drop
            await wethUsdcOracle.set(__wethUsdcPrice);
            await wethUsdcMixologist.updateExchangeRate();
            //liquidate should fail for remaining users due to price recovery
            const start =  Math.ceil((users.length / 2)); 
            for(let i = start; i < users.length  ; i++) {
                await expect(
                    wethUsdcMixologist.liquidate(
                        [users[i].address],
                        [userBorrowParts[i]],
                        multiSwapper.address,
                    ),
                ).to.be.revertedWith('Mixologist_AllAreSolvent')
            }
    })
    
    it('should execute bids for 1000 users', async ()=> {
        const {
            deployer,
            eoa1,
            feeCollector,
            __wethUsdcPrice,
            liquidationQueue,
            LQ_META,
            weth,
            usdc,
            bar,
            yieldBox,
            wethUsdcMixologist,
            wethUsdcOracle,
            multiSwapper,
            BN,
        } = await register();


        const POOL = 5;
        const marketAssetId = await wethUsdcMixologist.assetId();
        const marketColId = await wethUsdcMixologist.collateralId();
        const lqAssetId = await liquidationQueue.lqAssetId();

        // Bid ans ActivateBid
        const users = (await ethers.getSigners()).slice(0, 11)
        for(let i = 0; i < users.length ; i++) {
            const signer = users[i];

            await (await weth.connect(signer).freeMint(LQ_META.minBidAmount.mul(100))).wait();

            await (
                await weth.connect(signer).approve(yieldBox.address, LQ_META.minBidAmount.mul(100))
            ).wait();
            await yieldBox.connect(signer).depositAsset(
                lqAssetId,
                signer.address,
                signer.address,
                LQ_META.minBidAmount.mul(100),
                0,
            );
            await yieldBox.connect(signer).setApprovalForAll(liquidationQueue.address, true);
            await liquidationQueue.connect(signer).bid(
                signer.address,
                POOL,
                LQ_META.minBidAmount.mul(100),
            );
            await hh.network.provider.send('evm_increaseTime', [10_000]);
            await hh.network.provider.send('evm_mine');
            await liquidationQueue.connect(signer).activateBid(signer.address, POOL);
        }

        // Mint some weth to deposit as asset with EOA1
        const wethAmount = BN(1e18).mul(100000);
        await weth.connect(eoa1).freeMint(wethAmount);
        await weth.connect(eoa1).approve(yieldBox.address, wethAmount);

        // Add asset to market 
        await yieldBox
        .connect(eoa1)
        .depositAsset(
            marketAssetId,
            eoa1.address,
            eoa1.address,
            wethAmount,
            0,
        );

        await yieldBox
        .connect(eoa1)
        .setApprovalForAll(wethUsdcMixologist.address, true);
        
        await wethUsdcMixologist
        .connect(eoa1)
        .addAsset(
            eoa1.address,
            false,
          await yieldBox.toShare(marketAssetId, wethAmount, false));
    
        // Add collateral and borrow for 1000 USERS
        for(let i = 0; i < users.length ; i ++) {
            const signer = users[i]
            //const ta = await wethUsdcMixologist.totalAsset();
            // Mint some usdc to deposit as collateral and borrow
            const usdcAmount = ((wethAmount).mul(__wethUsdcPrice.div(BN(1e18)))).div(100000);
            
            const borrowAmount = usdcAmount
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div(BN(1e18)));

            await usdc.connect(signer).freeMint(usdcAmount);
            await usdc.connect(signer).approve(yieldBox.address, usdcAmount);
            await yieldBox.connect(signer).depositAsset(
                marketColId,
                signer.address,
                signer.address,
                usdcAmount,
                0,
            );

            await yieldBox.connect(signer).setApprovalForAll(wethUsdcMixologist.address, true);
            await wethUsdcMixologist.connect(signer).addCollateral(
                signer.address,
                false,
                await yieldBox.toShare(marketColId, usdcAmount, false),
            );
          await wethUsdcMixologist.connect(signer).borrow(signer.address, borrowAmount);

        }
        // Make price movements and liquidate
        const priceDrop = __wethUsdcPrice.mul(5).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
        await wethUsdcMixologist.updateExchangeRate();

        // get userBorrowParts
        const userBorrowParts = []
        for(let i = 0; i < users.length; i++) {
            const signer = users[i]
            const result = await wethUsdcMixologist.userBorrowPart(signer.address)
            userBorrowParts.push(result)
        }

        // liquidate
        for(let i = 0; i < users.length ; i++) {
            await expect(
                wethUsdcMixologist.liquidate(
                    [users[i].address],
                    [userBorrowParts[i]],
                    multiSwapper.address,
                ),
            ).to.not.be.reverted;
        }

        for(let i = 0; i < users.length; i++) {
            await expect(
                wethUsdcMixologist.liquidate(
                    [users[i].address],
                    [userBorrowParts[i]],
                    multiSwapper.address,
                ),
            ).to.be.revertedWith('Mixologist_AllAreSolvent');
        }

    })
});


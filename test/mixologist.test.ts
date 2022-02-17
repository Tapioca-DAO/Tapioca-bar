import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';

describe('Mixologist test', () => {
    it('Should deposit to bar, add asset to mixologist, remove asset and withdraw', async () => {
        const { usdc, weth, bar, wethUsdcMixologist, deployer} = await register();

        const mintVal = ethers.BigNumber.from(1e18.toString()).mul(1e5);
        usdc.freeMint(mintVal);
        weth.freeMint(mintVal);

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
});

import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';

describe('LiquidationQueue test', () => {
    it('should throw if premium too high', async () => {
        const { liquidationQueue, deployer } = await register();
        await expect(
            liquidationQueue.bid(deployer.address, 40, 1),
        ).to.be.revertedWith('LQ: premium too high');
    });
});

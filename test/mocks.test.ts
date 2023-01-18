import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('Mocks test', () => {
    it.only('should test mint limit for ERC20Mock', async () => {
        const { usdc, timeTravel } = await loadFixture(register);

        const mintLimt = await usdc.mintLimit();
        expect(mintLimt.gt(0)).to.be.true;

        await timeTravel(86500);
        await usdc.freeMint(ethers.utils.parseEther('1'));
        await timeTravel(30000);
        await expect(
            usdc.freeMint(ethers.utils.parseEther('1')),
        ).to.be.revertedWith('ERC20Mock: too early');
        await timeTravel(86500);
        await usdc.freeMint(ethers.utils.parseEther('1'));
    });

    it('should test mint limit for WETH9Mock', async () => {
        const { weth, timeTravel } = await loadFixture(register);

        const mintLimt = await weth.mintLimit();
        expect(mintLimt.gt(0)).to.be.true;

        await timeTravel(86500);
        await weth.freeMint(ethers.utils.parseEther('1'));
        await timeTravel(30000);
        await expect(
            weth.freeMint(ethers.utils.parseEther('1')),
        ).to.be.revertedWith('WETH9Mock: too early');
        await timeTravel(86500);
        await weth.freeMint(ethers.utils.parseEther('1'));
    });

    it('should test mint limit for usd0', async () => {
        const { usd0, timeTravel } = await loadFixture(register);

        const mintLimt = await usd0.mintLimit();
        expect(mintLimt.gt(0)).to.be.true;

        await timeTravel(86500);
        await usd0.freeMint(ethers.utils.parseEther('1'));
        await timeTravel(30000);
        await expect(
            usd0.freeMint(ethers.utils.parseEther('1')),
        ).to.be.revertedWith('USD0: too early');
        await timeTravel(86500);
        await usd0.freeMint(ethers.utils.parseEther('1'));

        await timeTravel(86500);

        await usd0.setMintLimit(ethers.utils.parseEther('1'));
        await expect(
            usd0.freeMint(ethers.utils.parseEther('2')),
        ).to.be.revertedWith('USD0: amount too big');
    });
});

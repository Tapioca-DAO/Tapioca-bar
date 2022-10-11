import { ethers } from 'hardhat';
import { expect } from 'chai';

import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('USD0', () => {
    it('should test initial values', async () => {
        const { registerUsd0Contract, deployer } = await loadFixture(register);
        const { usd0 } = await registerUsd0Contract('1');

        const signerIsAllowedToMint = await usd0.allowedMinter(
            1,
            deployer.address,
        );
        const signerIsAllowedToBurn = await usd0.allowedBurner(
            1,
            deployer.address,
        );
        expect(signerIsAllowedToMint).to.be.true;
        expect(signerIsAllowedToBurn).to.be.true;

        const decimals = await usd0.decimals();
        expect(decimals == 18).to.be.true;
    });

    it('should set minters and burners', async () => {
        const { registerUsd0Contract, deployer } = await loadFixture(register);
        const { usd0 } = await registerUsd0Contract('1');
        const minter = new ethers.Wallet(
            ethers.Wallet.createRandom().privateKey,
            ethers.provider,
        );

        let minterStatus = await usd0.allowedMinter(1, minter.address);
        expect(minterStatus).to.be.false;

        await usd0.setMinterStatus(minter.address, true);
        minterStatus = await usd0.allowedMinter(1, minter.address);
        expect(minterStatus).to.be.true;

        let burnerStatus = await usd0.allowedBurner(1, minter.address);
        expect(burnerStatus).to.be.false;

        await usd0.setBurnerStatus(minter.address, true);
        burnerStatus = await usd0.allowedBurner(1, minter.address);
        expect(burnerStatus).to.be.true;
    });

    it('should mint and burn', async () => {
        const { registerUsd0Contract, deployer, BN, eoas } = await loadFixture(
            register,
        );
        const { usd0 } = await registerUsd0Contract('1');
        const normalUser = eoas[1];

        const amount = BN(1000).mul((1e18).toString());

        let usd0Balance = await usd0.balanceOf(normalUser.address);
        expect(usd0Balance.eq(0)).to.be.true;

        await expect(
            usd0.connect(normalUser).mint(normalUser.address, amount),
        ).to.be.revertedWith('unauthorized');
        await usd0.connect(deployer).mint(normalUser.address, amount);

        usd0Balance = await usd0.balanceOf(normalUser.address);
        expect(usd0Balance.eq(amount)).to.be.true;

        await expect(
            usd0.connect(normalUser).burn(normalUser.address, amount),
        ).to.be.revertedWith('unauthorized');
        await usd0.connect(deployer).burn(normalUser.address, amount);
        usd0Balance = await usd0.balanceOf(normalUser.address);
        expect(usd0Balance.eq(0)).to.be.true;
    });
});

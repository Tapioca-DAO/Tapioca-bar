import { expect } from 'chai';
import { ethers } from 'hardhat';

import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { BN, getERC20PermitSignature, register } from './test.utils';

describe('USDO', () => {
    it('should test initial values', async () => {
        const { registerUsd0Contract, deployer, yieldBox } = await loadFixture(
            register,
        );
        const { usd0 } = await registerUsd0Contract(
            '1',
            yieldBox.address,
            deployer.address,
        );

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
        const { registerUsd0Contract, deployer, yieldBox } = await loadFixture(
            register,
        );
        const { usd0 } = await registerUsd0Contract(
            '1',
            yieldBox.address,
            deployer.address,
        );
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
        const { registerUsd0Contract, deployer, BN, eoas, yieldBox } =
            await loadFixture(register);
        const { usd0 } = await registerUsd0Contract(
            '1',
            yieldBox.address,
            deployer.address,
        );
        const normalUser = eoas[1];

        const amount = BN(1000).mul((1e18).toString());

        let usd0Balance = await usd0.balanceOf(normalUser.address);
        expect(usd0Balance.eq(0)).to.be.true;

        await expect(
            usd0.connect(normalUser).mint(normalUser.address, amount),
        ).to.be.revertedWith('USDO: unauthorized');
        await usd0.connect(deployer).mint(normalUser.address, amount);

        usd0Balance = await usd0.balanceOf(normalUser.address);
        expect(usd0Balance.eq(amount)).to.be.true;

        await expect(
            usd0.connect(normalUser).burn(normalUser.address, amount),
        ).to.be.revertedWith('USDO: unauthorized');
        await usd0.connect(deployer).burn(normalUser.address, amount);
        usd0Balance = await usd0.balanceOf(normalUser.address);
        expect(usd0Balance.eq(0)).to.be.true;
    });

    it('should flashMint successfully', async () => {
        const { registerUsd0Contract, deployer, BN, weth, yieldBox } =
            await loadFixture(register);
        const { usd0 } = await registerUsd0Contract(
            '1',
            yieldBox.address,
            deployer.address,
        );

        //deploy flash borrower
        const flashBorrower = await (
            await ethers.getContractFactory('FlashBorrowerMock')
        ).deploy(usd0.address);
        await flashBorrower.deployed();

        //try to mint usd0
        const amount = BN(1e18).mul(1000);
        const flashFee = await usd0.flashFee(usd0.address, amount);
        await expect(
            flashBorrower.flashBorrow(usd0.address, amount),
        ).to.be.revertedWith('ERC20: burn amount exceeds balance');

        await usd0.connect(deployer).mint(deployer.address, flashFee);
        const deployerUsd0Balance = await usd0.balanceOf(deployer.address);
        expect(deployerUsd0Balance.gt(0)).to.be.true;

        //send for the fee
        await usd0.transfer(flashBorrower.address, flashFee);

        const supplyBefore = await usd0.totalSupply();

        await expect(flashBorrower.flashBorrow(usd0.address, amount)).not.to.be
            .reverted;
        const supplyAfter = await usd0.totalSupply();
        expect(supplyAfter.eq(supplyBefore.sub(flashFee))).to.be.true;
        const flashBorrwerUsd0Balance = await usd0.balanceOf(deployer.address);
        expect(flashBorrwerUsd0Balance.eq(0)).to.be.true;

        await expect(
            flashBorrower.flashBorrow(usd0.address, 0),
        ).to.be.revertedWith('USDO: amount not valid');

        const maxFlashMint = await usd0.maxFlashMint();
        await expect(
            flashBorrower.flashBorrow(usd0.address, maxFlashMint.add(1)),
        ).to.be.revertedWith('USDO: amount too big');

        await expect(
            flashBorrower.flashBorrow(weth.address, amount),
        ).to.be.revertedWith('USDO: token not valid');
    });

    it('should not flashMint for a malicious operator', async () => {
        const { registerUsd0Contract, deployer, BN, weth, yieldBox } =
            await loadFixture(register);
        const { usd0 } = await registerUsd0Contract(
            '1',
            yieldBox.address,
            deployer.address,
        );

        //deploy flash borrower
        const flashBorrower = await (
            await ethers.getContractFactory('FlashMaliciousBorrowerMock')
        ).deploy(usd0.address);
        await flashBorrower.deployed();

        const amount = BN(1e18).mul(1000);
        const flashFee = await usd0.flashFee(usd0.address, amount);

        await usd0.connect(deployer).mint(deployer.address, flashFee);
        const deployerUsd0Balance = await usd0.balanceOf(deployer.address);
        expect(deployerUsd0Balance.gt(0)).to.be.true;

        //send for the fee
        await usd0.transfer(flashBorrower.address, flashFee);
        await expect(
            flashBorrower.flashBorrow(usd0.address, amount),
        ).to.be.revertedWith('USDO: repay not approved');
    });
});

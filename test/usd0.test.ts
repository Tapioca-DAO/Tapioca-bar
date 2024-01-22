import { expect } from 'chai';
import hre, { ethers } from 'hardhat';

import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { BN, getERC20PermitSignature, register } from './test.utils';
import {
    FlashBorrowerMock__factory,
    FlashMaliciousBorrowerMock__factory,
} from '@tapioca-sdk/typechain/tapioca-mocks';

describe('USDO', () => {
    describe('views', () => {
        it('should test initial values', async () => {
            const { registerUsd0Contract, deployer, yieldBox, cluster } =
                await loadFixture(register);
            const { usd0 } = await registerUsd0Contract(
                '1',
                yieldBox.address,
                cluster.address,
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
    });

    describe('mint & burn', () => {
        it('should set minters and burners', async () => {
            const { registerUsd0Contract, deployer, yieldBox, cluster } =
                await loadFixture(register);
            const { usd0 } = await registerUsd0Contract(
                '1',
                yieldBox.address,
                cluster.address,
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
            const {
                registerUsd0Contract,
                deployer,
                BN,
                eoas,
                yieldBox,
                cluster,
            } = await loadFixture(register);
            const { usd0 } = await registerUsd0Contract(
                '1',
                yieldBox.address,
                cluster.address,
                deployer.address,
            );
            const normalUser = eoas[1];

            const amount = BN(1000).mul((1e18).toString());

            let usd0Balance = await usd0.balanceOf(normalUser.address);
            expect(usd0Balance.eq(0)).to.be.true;

            await expect(
                usd0.connect(normalUser).mint(normalUser.address, amount),
            ).to.be.reverted;
            await usd0.connect(deployer).mint(normalUser.address, amount);

            usd0Balance = await usd0.balanceOf(normalUser.address);
            expect(usd0Balance.eq(amount)).to.be.true;

            await expect(
                usd0.connect(normalUser).burn(normalUser.address, amount),
            ).to.be.reverted;
            await usd0.connect(deployer).burn(normalUser.address, amount);
            usd0Balance = await usd0.balanceOf(normalUser.address);
            expect(usd0Balance.eq(0)).to.be.true;
        });
    });

    describe('flashMint', () => {
        it('should flashMint successfully', async () => {
            const {
                registerUsd0Contract,
                deployer,
                BN,
                weth,
                yieldBox,
                cluster,
            } = await loadFixture(register);
            const { usd0, usd0Flashloan } = await registerUsd0Contract(
                '1',
                yieldBox.address,
                cluster.address,
                deployer.address,
            );

            await usd0.setFlashloanHelper(usd0Flashloan.address);
            expect(await usd0Flashloan.usdo()).eq(usd0.address);

            let maxLoan = await usd0Flashloan.maxFlashLoan(
                ethers.constants.AddressZero,
            );
            expect(maxLoan.eq(0)).to.be.true;

            const amount = BN(1e18).mul(1000);
            await usd0.mint(deployer.address, amount);
            maxLoan = await usd0Flashloan.maxFlashLoan(
                ethers.constants.AddressZero,
            );
            expect(maxLoan.eq(amount)).to.be.true;

            //deploy flash borrower
            const FlashBorrowerMock = new FlashBorrowerMock__factory(deployer);
            const flashBorrower = await FlashBorrowerMock.deploy(
                usd0Flashloan.address,
            );
            await flashBorrower.deployed();

            //try to mint usd0
            const flashFee = await usd0Flashloan.flashFee(usd0.address, amount);
            await expect(flashBorrower.flashBorrow(usd0.address, amount)).to.be
                .reverted;

            await usd0.connect(deployer).mint(deployer.address, flashFee);

            //send for the fee
            await usd0.transfer(flashBorrower.address, flashFee);

            const supplyBefore = await usd0.totalSupply();
            const usdoBalanceBefore = await usd0.balanceOf(usd0.address);

            await expect(flashBorrower.flashBorrow(usd0.address, amount)).not.to
                .be.reverted;
            const supplyAfter = await usd0.totalSupply();
            expect(supplyAfter.eq(supplyBefore)).to.be.true;
            const usdoBalanceAfter = await usd0.balanceOf(usd0.address);
            expect(usdoBalanceBefore.eq(usdoBalanceAfter.sub(flashFee))).to.be
                .true;
            const flashBorrwerUsd0Balance = await usd0.balanceOf(
                deployer.address,
            );
            expect(flashBorrwerUsd0Balance.eq(amount)).to.be.true;

            const maxFlashMint = await usd0Flashloan.maxFlashMint();
            await expect(
                flashBorrower.flashBorrow(usd0.address, maxFlashMint.add(1)),
            ).to.be.revertedWithoutReason;

            await expect(flashBorrower.flashBorrow(weth.address, amount)).to.be
                .reverted;
        });

        it('should not flashMint for a malicious operator', async () => {
            const {
                registerUsd0Contract,
                deployer,
                BN,
                weth,
                yieldBox,
                cluster,
            } = await loadFixture(register);
            const { usd0, usd0Flashloan } = await registerUsd0Contract(
                '1',
                yieldBox.address,
                cluster.address,
                deployer.address,
            );

            await usd0.setFlashloanHelper(usd0Flashloan.address);

            //deploy flash borrower
            const FlashMaliciousBorrowerMock =
                new FlashMaliciousBorrowerMock__factory(deployer);
            const flashBorrower = await FlashMaliciousBorrowerMock.deploy(
                usd0Flashloan.address,
            );
            await flashBorrower.deployed();

            const amount = BN(1e18).mul(1000);
            const flashFee = await usd0Flashloan.flashFee(usd0.address, amount);

            await usd0
                .connect(deployer)
                .mint(deployer.address, flashFee.add(amount));
            const deployerUsd0Balance = await usd0.balanceOf(deployer.address);
            expect(deployerUsd0Balance.gt(0)).to.be.true;

            //send for the fee
            await usd0.transfer(flashBorrower.address, flashFee);
            await expect(flashBorrower.flashBorrow(usd0.address, amount)).to.be
                .reverted;
        });
    });
});

import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { BN, register, setBalance } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { MockSwapper__factory } from '@tapioca-sdk/typechain/tapioca-mocks';

const { formatUnits } = ethers.utils;

// NOTE: WETH is the _asset_, and USDC the collateral in the pair from the big
// fixture. So in real life, this one would be used for shorting ETH.
// NOTE: WETH is not the actual "wrapped native" token; it's just another ERC20

function E(n: number | bigint, p: number | bigint = 18) {
    return BN(BigInt(n) * 10n ** BigInt(p));
}

describe('Singularity Leverage', () => {
    // Debugging only
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let g: (a: string, t: number, r: boolean) => Promise<any>;

    let getDebtAmount: (a: string) => Promise<any>;

    async function setUp() {
        const {
            penrose,
            weth,
            usdc,
            yieldBox,
            wethUsdcSingularity,
            wethUsdcOracle,
            multiSwapper,
            deployer,
            initContracts,
            __wethUsdcPrice,
            cluster,
            sglLeverageExecutor,
        } = await loadFixture(register);
        await initContracts();

        const wethId = await wethUsdcSingularity.assetId();
        const usdcId = await wethUsdcSingularity.collateralId();
        const oracle = await wethUsdcSingularity.oracle();

        // Confirm that the defaults from the main fixture are as expected
        expect(__wethUsdcPrice).to.equal(E(1000));
        expect(await yieldBox.toShare(usdcId, 1, true)).to.equal(1e8);
        expect(await yieldBox.toShare(wethId, 1, true)).to.equal(1e8);
        // Open fee is out of 100k, so 0.05% by default:
        expect(await wethUsdcSingularity.borrowOpeningFee()).to.equal(50);

        g = async (address, tokenId, roundUp = false) => {
            const share = await yieldBox.balanceOf(address, tokenId);
            const amount = await yieldBox.toAmount(tokenId, share, roundUp);
            return { share: formatUnits(share), amount: formatUnits(amount) };
        };

        getDebtAmount = async (address, roundUp = false) => {
            const part = await wethUsdcSingularity.userBorrowPart(address);
            if (part.eq(0)) {
                return part;
            }
            const total = await wethUsdcSingularity.totalBorrow();
            let el = total.elastic;
            if (roundUp) {
                el = el.add(total.base).sub(1);
            }
            return part.mul(el).div(total.base);
        };

        const MockSwapper = new MockSwapper__factory(deployer);
        const mockSwapper = await MockSwapper.deploy(yieldBox.address);
        await mockSwapper.deployed();
        await cluster.updateContract(0, mockSwapper.address, true);

        await sglLeverageExecutor.setSwapper(mockSwapper.address);

        const [alice, bob, carol] = [0, 0, 0].map(
            () =>
                new ethers.Wallet(
                    ethers.Wallet.createRandom().privateKey,
                    ethers.provider,
                ),
        );

        for (const signer of [alice, bob, carol, deployer]) {
            await setBalance(signer.address, 100000);
            await yieldBox
                .connect(signer)
                .setApprovalForAll(wethUsdcSingularity.address, true);
            await weth.connect(signer).freeMint(E(10));
            await usdc.connect(signer).freeMint(E(100_000));
        }

        // Bob wants to lend out 10 ETH
        await weth.connect(bob).approve(yieldBox.address, E(10));
        await yieldBox
            .connect(bob)
            .depositAsset(wethId, bob.address, bob.address, E(10), 0);

        await wethUsdcSingularity
            .connect(bob)
            .addAsset(bob.address, bob.address, false, E(10).mul(1e8));

        // Alice borrows 1 ETH against 2k USD
        await usdc.connect(alice).approve(yieldBox.address, E(2000));
        await yieldBox
            .connect(alice)
            .depositAsset(usdcId, alice.address, alice.address, E(2000), 0);
        await wethUsdcSingularity
            .connect(alice)
            .addCollateral(
                alice.address,
                alice.address,
                false,
                0,
                E(2000).mul(1e8),
            );
        await wethUsdcSingularity
            .connect(alice)
            .borrow(alice.address, alice.address, E(1));

        await cluster.updateContract(
            await penrose.hostLzChainId(),
            mockSwapper.address,
            true,
        );

        return {
            alice,
            bob,
            carol,
            deployer,
            mockSwapper,
            usdc,
            usdcId,
            weth,
            wethId,
            wethUsdcSingularity,
            yieldBox,
            cluster,
            penrose,
        };
    }

    describe.skip('lever down', () => {
        it('Should lever down by selling collateral', async () => {
            const {
                alice,
                bob,
                deployer,
                mockSwapper,
                usdc,
                weth,
                wethId,
                usdcId,
                yieldBox,
                wethUsdcSingularity,
                cluster,
                penrose,
            } = await loadFixture(setUp);

            await cluster.updateContract(
                hre.SDK.eChainId,
                mockSwapper.address,
                true,
            );
            await cluster.updateContract(
                hre.SDK.eChainId,
                wethUsdcSingularity.address,
                true,
            );
            // Alice now has a LTV ratio of a little over 50%; this equates to
            // 2x leverage (on a "USDC long", or "ETH short")
            // - $1000 worth of ETH (plus a little interest) borrowed, and
            // - $2000 worth of USDC deposited as collateral
            // Alice gets nervous, and wants to reduce this to 25% by selling
            // some collateral. Paying 2/3 of the debt, or $666.66.. worth, results
            // in -- up to a small amount of interest:
            // - $333.333.. worth of ETH owed
            // - $1333.333.. woth of USDC remaining

            // Alice is the first borrower and interest has not yet accrued
            expect(
                await wethUsdcSingularity.userBorrowPart(alice.address),
            ).to.equal(E(10_005).div(10_000));
            // expect(await yieldBox.balanceOf(alice.address, usdcId)).to.equal(0);

            // Populate the mock swapper with enough ETH:
            await weth.approve(yieldBox.address, E(666).div(1000));
            await weth.transfer(mockSwapper.address, E(666).div(1000));

            const encoder = new ethers.utils.AbiCoder();
            const leverageData = encoder.encode(
                ['uint256', 'bytes'],
                [E(666).div(1000), []],
            );
            // Sell some collateral
            await wethUsdcSingularity.connect(alice).sellCollateral(
                alice.address,
                E(666).mul(1e8), // USDC in YieldBox shares
                leverageData,
            );

            // Some interest will have accrued.. but otherwise we expect to have
            // 0.334 ETH of the original loan + 0.0005 ETH of the open fee left:
            const debt = await wethUsdcSingularity.userBorrowPart(
                alice.address,
            );
            const interest = debt.sub(E(3345).div(10_000));
            expect(interest).to.be.gte(0);
            expect(interest).to.be.lte(E(1).div(1_000_000));
        });

        it('Should send the excess if "levering down past 0"', async () => {
            const {
                alice,
                bob,
                deployer,
                mockSwapper,
                usdc,
                weth,
                wethId,
                usdcId,
                yieldBox,
                wethUsdcSingularity,
                penrose,
                cluster,
            } = await loadFixture(setUp);

            await cluster.updateContract(
                hre.SDK.eChainId,
                wethUsdcSingularity.address,
                true,
            );

            // Alice is the first borrower and interest has not yet accrued
            expect(
                await wethUsdcSingularity.userBorrowPart(alice.address),
            ).to.equal(E(10_005).div(10_000));
            expect(await yieldBox.balanceOf(alice.address, usdcId)).to.equal(0);

            // We are going to sell $1500 of collateral to pay off the $1000.50 of
            // debt, and we expect to get the rest back (minus some interest):

            // Populate the mock swapper with enough ETH:
            await weth.approve(yieldBox.address, E(1500).div(1000));
            await weth.transfer(mockSwapper.address, E(1500).div(1000));

            const encoder = new ethers.utils.AbiCoder();
            const leverageData = encoder.encode(
                ['uint256', 'bytes'],
                [E(1500).div(1000), []],
            );
            await wethUsdcSingularity.connect(alice).sellCollateral(
                alice.address,
                E(1500).mul(1e8), // USDC in YieldBox shares
                leverageData,
            );

            // The loan should be paid off:
            expect(
                await wethUsdcSingularity.userBorrowPart(alice.address),
            ).to.equal(0);

            // Alice owed 1.0005 ETH plus interest, which accrued before selling
            // the collateral. The sale was for 1.5 ETH, and the excess went to
            // Alice. This should be a little under 0.4995 to account for the
            // interest, together with the 1 ETH already borrowed:
            const upperBound = E(14995).div(10_000).mul(1e8); // in YieldBox shares
            const balance = await yieldBox.balanceOf(alice.address, wethId);
            const interest = upperBound.sub(balance);
            expect(upperBound).to.be.gte(balance);
            expect(interest).to.be.lte(E(1).mul(1e8).div(1_000_000)); // YB shares
        });
    });

    describe.skip('lever up', () => {
        it('Should lever up by buying collateral', async () => {
            const {
                alice,
                bob,
                deployer,
                mockSwapper,
                usdc,
                weth,
                wethId,
                usdcId,
                yieldBox,
                wethUsdcSingularity,
                cluster,
            } = await loadFixture(setUp);

            await cluster.updateContract(
                hre.SDK.eChainId,
                wethUsdcSingularity.address,
                true,
            );

            // Alice now has a LTV ratio of a little over 50%; this equates to
            // 2x leverage (on a "USDC long", or "ETH short")
            // - $1000 worth of ETH (plus a little interest) borrowed, and
            // - $2000 worth of USDC deposited as collateral
            // Alice feels lucky and wants to go to 3x leverage, by borrowing
            // another 1 ($1000 worth) ETH and "buying" USDC with it. The net
            // result will be that alice owes a little over $2000, against $3000
            // worth of collateral.
            expect(
                await wethUsdcSingularity.userBorrowPart(alice.address),
            ).to.equal(E(10_005).div(10_000));
            expect(await yieldBox.balanceOf(alice.address, wethId)).to.equal(
                E(1).mul(1e8),
            );

            // Populate the mock swapper with enough USDC:
            await usdc.approve(yieldBox.address, E(1000));
            await usdc.transfer(mockSwapper.address, E(1000));

            const encoder = new ethers.utils.AbiCoder();
            const leverageData = encoder.encode(
                ['uint256', 'bytes'],
                [E(1000), []],
            );
            // Buy more collateral
            await wethUsdcSingularity.connect(alice).buyCollateral(
                alice.address,
                E(1), // One ETH; in amount
                0, // No additional payment
                leverageData,
            );

            // Some interest will have accrued.. but otherwise we expect to have
            // 1 ETH for the original loan, 1 more for the new loan, and
            // 2 * 0.0005 = 0.0010 ETH of the open fee owed.
            const totalDebt = await wethUsdcSingularity.totalBorrow();
            const debt = (
                await wethUsdcSingularity.userBorrowPart(alice.address)
            )
                .mul(totalDebt.elastic)
                .div(totalDebt.base);
            const interest = debt.sub(E(2_001).div(1000));
            expect(interest).to.be.gte(0);
            expect(interest).to.be.lte(E(1).div(1_000_000));

            // No tokens went to Alice; they were used by the swapper to buy more
            // collateral:
            expect(await yieldBox.balanceOf(alice.address, wethId)).to.equal(
                E(1).mul(1e8),
            );
        });
    });

    describe.skip('down payment', () => {
        it('Should enter into a new position with a down payment', async () => {
            const {
                carol,
                deployer,
                mockSwapper,
                usdc,
                weth,
                wethId,
                usdcId,
                yieldBox,
                wethUsdcSingularity,
                cluster,
            } = await loadFixture(setUp);

            await cluster.updateContract(
                hre.SDK.eChainId,
                mockSwapper.address,
                true,
            );
            await cluster.updateContract(
                hre.SDK.eChainId,
                wethUsdcSingularity.address,
                true,
            );

            // Carol has no previous interactions with the protocol*, and wants to
            // go "long USDC" 2.5x: control $5000 of USDC by supplying $2000 of ETH
            // and borrowing the other $3000
            // *) Other than approving the Singularity pair in the YieldBox

            expect(await getDebtAmount(carol.address)).to.equal(0);
            expect(await yieldBox.balanceOf(carol.address, wethId)).to.equal(0);

            // Deposit $2000 into the YieldBox:
            await weth.connect(carol).approve(yieldBox.address, E(2));
            await yieldBox
                .connect(carol)
                .depositAsset(wethId, carol.address, carol.address, E(2), 0);

            // Populate the mock swapper with enough USDC:
            await usdc.approve(yieldBox.address, E(5000));
            await usdc.transfer(mockSwapper.address, E(5000));

            const encoder = new ethers.utils.AbiCoder();
            const leverageData = encoder.encode(
                ['uint256', 'bytes'],
                [E(5000), []],
            );
            // Borrow ETH and use it and the down payment to buy collateral:
            await wethUsdcSingularity.connect(carol).buyCollateral(
                carol.address,
                E(3), // Three ETH borrowedj; in amount
                E(2), // Two ETH supplied; in amount
                leverageData,
            );

            // Carol borrowed 3 ETH, plus a borrow fee. No accruals have taken
            // place since, therefore the debt should be exactly 3.0015 ETH:
            expect(await getDebtAmount(carol.address)).to.equal(
                E(30_015).div(10_000),
            );
        });
    });
});

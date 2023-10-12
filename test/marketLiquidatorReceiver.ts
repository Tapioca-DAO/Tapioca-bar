import hre, { ethers, network } from 'hardhat';
import { expect } from 'chai';
import { BN, register } from './test.utils';
import {
    loadFixture,
    setBalance,
} from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';
import { bigBang } from '../typechain/contracts/markets';
import { AbiCoder, defaultAbiCoder, formatUnits } from 'ethers/lib/utils';
import {
    ERC20Mock,
    MockSwapper__factory,
} from '../gitsub_tapioca-sdk/src/typechain/tapioca-mocks';
import { YieldBox } from '../gitsub_tapioca-sdk/src/typechain/YieldBox';
import { BigBang } from '../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';

describe('MarketLiquidatorReceiver test', () => {
    it('should perform a swap', async () => {
        const { usdc, weth, deployer, multiSwapper, wethUsdcOracle, eoa1 } =
            await loadFixture(register);

        const factory = await ethers.getContractFactory(
            'MarketLiquidatorReceiver',
        );
        const liquidator = await factory.deploy();
        await liquidator.deployed();

        const MockSwapper = new MockSwapper__factory(deployer);
        const swapper = await MockSwapper.deploy(ethers.constants.AddressZero);

        await liquidator.assignSwapper(usdc.address, swapper.address);

        await wethUsdcOracle.set(ethers.utils.parseEther('1'));
        await liquidator.assignOracle(
            usdc.address,
            wethUsdcOracle.address,
            ethers.utils.toUtf8Bytes(''),
            ethers.utils.parseEther('1'),
        );

        await weth.freeMint(ethers.utils.parseEther('10'));
        await usdc.freeMint(ethers.utils.parseEther('10'));

        await weth.transfer(swapper.address, ethers.utils.parseEther('10'));
        await usdc.transfer(liquidator.address, ethers.utils.parseEther('10'));

        await expect(
            liquidator
                .connect(eoa1)
                .onCollateralReceiver(
                    deployer.address,
                    usdc.address,
                    weth.address,
                    ethers.utils.parseEther('10'),
                    defaultAbiCoder.encode(['uint256'], [50]),
                ),
        ).to.be.revertedWith('MarketLiquidatorReceiver: sender not allowed');
        await liquidator.increaseAllowance(
            eoa1.address,
            usdc.address,
            ethers.utils.parseEther('5'),
        );
        await expect(
            liquidator
                .connect(eoa1)
                .onCollateralReceiver(
                    deployer.address,
                    usdc.address,
                    weth.address,
                    ethers.utils.parseEther('10'),
                    defaultAbiCoder.encode(['uint256'], [50]),
                ),
        ).to.be.revertedWith('MarketLiquidatorReceiver: sender not allowed');
        await liquidator.increaseAllowance(
            eoa1.address,
            usdc.address,
            ethers.utils.parseEther('5'),
        );

        let eoa1Balance = await weth.balanceOf(eoa1.address);
        expect(eoa1Balance.eq(0)).to.be.true;
        await expect(
            liquidator
                .connect(eoa1)
                .onCollateralReceiver(
                    deployer.address,
                    usdc.address,
                    weth.address,
                    ethers.utils.parseEther('10'),
                    defaultAbiCoder.encode(['uint256'], [0]),
                ),
        ).to.not.be.reverted;
        eoa1Balance = await weth.balanceOf(eoa1.address);
        expect(eoa1Balance.eq(ethers.utils.parseEther('10'))).to.be.true;
    });
});

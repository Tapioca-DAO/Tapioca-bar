import hre, { ethers, network } from 'hardhat';
import { expect } from 'chai';
import { BN, register } from './test.utils';
import {
    loadFixture,
    setBalance,
} from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';
import { bigBang } from '../typechain/contracts/markets';
import { AbiCoder, formatUnits } from 'ethers/lib/utils';
import {
    ERC20Mock,
    MockSwapper__factory,
} from '@tapioca-sdk/typechain/tapioca-mocks';
import { YieldBox } from '@tapioca-sdk/typechain/YieldBox';
import { Origins } from '../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';
import { Market } from '@tapioca-sdk//typechain/tapioca-penrose';

describe('Origins test', () => {
    it('should borrow and check values in time', async () => {
        const {
            registerOriginMarket,
            yieldBox,
            weth,
            wethAssetId,
            wethUsdcOracle,
            deployer,
            registerUsd0Contract,
            createTokenEmptyStrategy,
            cluster,
            __wethUsdcPrice,
            timeTravel,
            eoa1,
            penrose,
        } = await loadFixture(register);

        const chainId = hre.SDK.eChainId;
        const { usd0, lzEndpointContract, usd0Flashloan } =
            await registerUsd0Contract(
                chainId,
                yieldBox.address,
                cluster.address,
                deployer.address,
                false,
            );

        const usdoStrategy = await createTokenEmptyStrategy(
            yieldBox.address,
            usd0.address,
        );
        await yieldBox.registerAsset(1, usd0.address, usdoStrategy.address, 0);
        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            usdoStrategy.address,
            0,
        );

        const { origins } = await registerOriginMarket(
            deployer.address,
            yieldBox,
            weth,
            wethAssetId,
            usd0,
            usdoAssetId,
            wethUsdcOracle,
            (1e5).toString(),
            (1e18).toString(),
        );

        const savedCollateralizationRate =
            await origins.collateralizationRate();
        expect(savedCollateralizationRate.eq((1e5).toString())).to.be.true;

        await usd0.setMinterStatus(origins.address, true);
        await usd0.setBurnerStatus(origins.address, true);

        //mint collaterals
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        await weth.freeMint(wethMintVal);

        //deposit collateral amounts to yieldBox
        const wethCollateralShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );
        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.depositAsset(
            wethAssetId,
            deployer.address,
            deployer.address,
            0,
            wethCollateralShare,
        );

        //add collateral to markets
        await yieldBox.setApprovalForAll(origins.address, true);
        await origins.addCollateral(0, wethCollateralShare);
        await expect(
            origins.connect(eoa1).addCollateral(0, wethCollateralShare),
        ).to.be.revertedWithCustomError(origins, 'NotAuthorized');

        let colShare = await origins.userCollateralShare(deployer.address);
        expect(colShare.eq(wethCollateralShare)).to.be.true;

        //borrow
        //we assume weth usdc price is $1000; we borrow 10k usdo for 10 eth collateral
        const borrowVal = ethers.utils.parseEther((1e4).toString());
        await wethUsdcOracle.set('1000000000000000'); //0.001 =>  $1000

        await origins.borrow(borrowVal);

        let usdoSupply = await usd0.totalSupply();
        expect(usdoSupply.eq(borrowVal)).to.be.true; //no fees for this market

        let totalDebt = await penrose.viewTotalDebt();
        expect(totalDebt.eq(0)).to.be.true;

        totalDebt = totalDebt.add(borrowVal);
        expect(totalDebt.eq(usdoSupply)).to.be.true;

        //travel 10k days into the future
        await timeTravel(10000 * 86400);

        //repay
        await origins.repay(borrowVal); //nothing should change
        const borrowPart = await origins.userBorrowPart(deployer.address);
        expect(borrowPart.eq(0)).to.be.true;

        //remove collateral
        await origins.removeCollateral(wethCollateralShare);
        colShare = await origins.userCollateralShare(deployer.address);
        expect(colShare.eq(0)).to.be.true;

        usdoSupply = await usd0.totalSupply();
        expect(usdoSupply.eq(0)).to.be.true;
    });
});

// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";

// Tapioca
import {
    SGLLiquidation,
    SGLCollateral,
    Singularity,
    SGLLeverage,
    SGLCommon,
    SGLBorrow
} from "./singularity/Singularity.sol";
import {IMarketLiquidatorReceiver} from "tapioca-periph/interfaces/bar/IMarketLiquidatorReceiver.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {ISingularity} from "tapioca-periph/interfaces/bar/ISingularity.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {IMarket, Module} from "tapioca-periph/interfaces/bar/IMarket.sol";

contract MarketHelper {
    using RebaseLibrary for Rebase;

    uint256 internal constant FEE_PRECISION = 1e5;

    error ExchangeRateNotValid();
    error Solvent();
    error BadDebt();
    error InsufficientLiquidationBonus();
    error NotEnoughCollateral();

    /// @notice returns the maximum liquidatable amount for user
    /// @param market the SGL/BB address
    /// @param borrowPart amount borrowed
    /// @param collateralPartInAsset collateral's value in borrowed asset
    function computeClosingFactor(IMarket market, uint256 borrowPart, uint256 collateralPartInAsset)
        public
        view
        returns (uint256)
    {
        (uint128 totalBorrowElastic, uint128 totalBorrowBase) = market._totalBorrow();
        Rebase memory _totalBorrow = Rebase({elastic: totalBorrowElastic, base: totalBorrowBase});
        return _computeClosingFactor(
            borrowPart,
            collateralPartInAsset,
            FEE_PRECISION,
            market._liquidationCollateralizationRate(),
            market._liquidationMultiplier(),
            _totalBorrow
        );
    }
    function _computeClosingFactor(
        uint256 borrowPart,
        uint256 collateralPartInAsset,
        uint256 ratesPrecision,
        uint256 _liquidationCollateralizationRate,
        uint256 _liquidationMultiplier,
        Rebase memory _totalBorrow
    ) internal pure returns (uint256) {
        // Obviously it's not `borrowPart` anymore but `borrowAmount`
        borrowPart = (borrowPart * _totalBorrow.elastic) / _totalBorrow.base;

        //borrowPart and collateralPartInAsset should already be scaled due to the exchange rate computation
        uint256 liquidationStartsAt =
            (collateralPartInAsset * _liquidationCollateralizationRate) / (10 ** ratesPrecision);

        if (borrowPart < liquidationStartsAt) return 0;

        //compute numerator
        uint256 numerator = borrowPart - liquidationStartsAt;
        //compute denominator
        uint256 diff = (_liquidationCollateralizationRate * ((10 ** ratesPrecision) + _liquidationMultiplier))
            / (10 ** ratesPrecision);
        int256 denominator = (int256(10 ** ratesPrecision) - int256(diff)) * int256(1e13);

        //compute closing factor
        int256 x = (int256(numerator) * int256(1e18)) / denominator;
        int256 xPos = x < 0 ? -x : x;

        //assure closing factor validity
        if (uint256(xPos) > borrowPart) return borrowPart;

        return uint256(xPos);
    }

    /// @notice returns the solvency status of a market's position
    /// @param _market the BB or SGL market
    function isPositionSolvent(address _market, address _user, uint256 _exchangeRate, bool _forLiquidation) external view returns (bool) {
        IMarket market = IMarket(_market);

        uint256 borrowPart = market._userBorrowPart(_user);
        if (borrowPart == 0) return true;
        uint256 collateralShare = market._userCollateralShare(_user);
        if (collateralShare == 0) return false;

        IYieldBox yieldBox = IYieldBox(market._yieldBox());

        (uint128 totalBorrowElastic, uint128 totalBorrowBase) = market._totalBorrow();
        Rebase memory _totalBorrow = Rebase({elastic: totalBorrowElastic, base: totalBorrowBase});

        uint256 collateralAmount = yieldBox.toAmount(market._collateralId(), collateralShare, false);
        return collateralAmount * (market._exchangeRatePrecision() / FEE_PRECISION)
            * (_forLiquidation ? market._liquidationCollateralizationRate() : market._collateralizationRate())
        // Moved exchangeRate here instead of dividing the other side to preserve more precision
        >= (borrowPart * _totalBorrow.elastic * _exchangeRate) / _totalBorrow.base;
    }

    /// @notice transforms amount to shares for a market's permit operation
    /// @param amount the amount to transform
    /// @param tokenId the YieldBox asset id
    /// @return share amount transformed into shares
    function computeAllowedLendShare(address sglAddress, uint256 amount, uint256 tokenId)
        external
        view
        returns (uint256 share)
    {
        ISingularity sgl = ISingularity(sglAddress);

        IYieldBox yieldBox = IYieldBox(sgl._yieldBox());
        (uint128 totalAssetElastic, uint128 totalAssetBase) = sgl.totalAsset();
        (uint128 totalBorrowElastic,) = sgl._totalBorrow();

        uint256 allShare = totalAssetElastic + yieldBox.toShare(tokenId, totalBorrowElastic, true);
        share = (amount * allShare) / totalAssetBase;
    }

    /// @notice returns the collateral amount used in a liquidation
    /// @dev useful to compute minAmountOut for collateral to asset swap
    /// @param user the user to liquidate
    /// @param maxBorrowPart max borrow part for user
    /// @param minLiquidationBonus minimum liquidation bonus to accept
    /// @param exchangeRatePrecision the precision of the exchange rate. Typically 1e18
    /// @param feeDecimalsPrecision the precision of the fee decimals. Typically 1e5
    function getLiquidationCollateralAmount(
        address sglAddress,
        address user,
        uint256 maxBorrowPart,
        uint256 minLiquidationBonus,
        uint256 exchangeRatePrecision,
        uint256 feeDecimalsPrecision
    ) external view returns (uint256 collateralShare) {
        ISingularity sgl = ISingularity(sglAddress);

        (bool updated, uint256 _exchangeRate) = ITapiocaOracle(sgl._oracle()).peek(sgl._oracleData());
        if (!updated || _exchangeRate == 0) {
            _exchangeRate = sgl._exchangeRate(); //use stored rate
        }
        if (_exchangeRate == 0) revert ExchangeRateNotValid();

        (uint128 totalBorrowElastic, uint128 totalBorrowBase) = sgl._totalBorrow();

        _ViewLiquidationStruct memory data;
        {
            data.user = user;
            data.maxBorrowPart = maxBorrowPart;
            data.minLiquidationBonus = minLiquidationBonus;
            data.exchangeRate = _exchangeRate;
            data.yieldBox = IYieldBox(sgl._yieldBox());
            data.collateralId = sgl._collateralId();
            data.userCollateralShare = sgl._userCollateralShare(user);
            data.userBorrowPart = sgl._userBorrowPart(user);
            data.totalBorrow = Rebase({elastic: totalBorrowElastic, base: totalBorrowBase});
            data.liquidationBonusAmount = IMarket(sglAddress)._liquidationBonusAmount();
            data.liquidationCollateralizationRate = sgl._liquidationCollateralizationRate();
            data.liquidationMultiplier = sgl._liquidationMultiplier();
            data.exchangeRatePrecision = exchangeRatePrecision;
            data.feeDecimalsPrecision = feeDecimalsPrecision;
        }

        (,, collateralShare) = _viewLiqudationBorrowAndCollateralShare(data, sglAddress);
    }

    /// @notice Adds `collateral` from msg.sender to the account `to`.
    /// @param from Account to transfer shares from.
    /// @param to The receiver of the tokens.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    /// @param share The amount of shares to add for `to`.
    function addCollateral(address from, address to, bool skim, uint256 amount, uint256 share)
        external
        pure
        returns (Module[] memory modules, bytes[] memory calls)
    {
        modules = new Module[](1);
        calls = new bytes[](1);
        modules[0] = Module.Collateral;
        calls[0] = abi.encodeWithSelector(SGLCollateral.addCollateral.selector, from, to, skim, amount, share);
    }

    /// @notice Removes `share` amount of collateral and transfers it to `to`.
    /// @param from Account to debit collateral from.
    /// @param to The receiver of the shares.
    /// @param share Amount of shares to remove.
    function removeCollateral(address from, address to, uint256 share)
        external
        pure
        returns (Module[] memory modules, bytes[] memory calls)
    {
        modules = new Module[](1);
        calls = new bytes[](1);
        modules[0] = Module.Collateral;
        calls[0] = abi.encodeWithSelector(SGLCollateral.removeCollateral.selector, from, to, share);
    }

    /// @notice Sender borrows `amount` and transfers it to `to`.
    /// @param from Account to borrow for.
    /// @param to The receiver of borrowed tokens.
    /// @param amount Amount to borrow.
    function borrow(address from, address to, uint256 amount)
        external
        pure
        returns (Module[] memory modules, bytes[] memory calls)
    {
        modules = new Module[](1);
        calls = new bytes[](1);
        modules[0] = Module.Borrow;
        calls[0] = abi.encodeWithSelector(SGLBorrow.borrow.selector, from, to, amount);
    }

    /// @notice View the result of a borrow operation.
    function borrowView(bytes calldata result) external pure returns (uint256 part, uint256 share) {
        (part, share) = abi.decode(result, (uint256, uint256));
    }

    /// @notice Repays a loan.
    /// @param from Address to repay from.
    /// @param to Address of the user this payment should go.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    /// @param part The amount to repay. See `userBorrowPart`.
    function repay(address from, address to, bool skim, uint256 part)
        external
        pure
        returns (Module[] memory modules, bytes[] memory calls)
    {
        modules = new Module[](1);
        calls = new bytes[](1);
        modules[0] = Module.Borrow;
        calls[0] = abi.encodeWithSelector(SGLBorrow.repay.selector, from, to, skim, part);
    }

    /// @notice view the result of a repay operation.
    function repayView(bytes calldata result) external pure returns (uint256 amount) {
        amount = abi.decode(result, (uint256));
    }

    /// @notice Lever down: Sell collateral to repay debt; excess goes to YB
    /// @param from The user who sells
    /// @param share Collateral YieldBox-shares to sell
    /// @param data LeverageExecutor data
    function sellCollateral(address from, uint256 share, bytes calldata data)
        external
        pure
        returns (Module[] memory modules, bytes[] memory calls)
    {
        modules = new Module[](1);
        calls = new bytes[](1);
        modules[0] = Module.Leverage;
        calls[0] = abi.encodeWithSelector(SGLLeverage.sellCollateral.selector, from, share, data);
    }

    /// @notice view the result of a sellCollateral operation.
    function sellCollateralView(bytes calldata result) external pure returns (uint256 amountOut) {
        amountOut = abi.decode(result, (uint256));
    }

    /// @notice Lever up: Borrow more and buy collateral with it.
    /// @param from The user who buys
    /// @param borrowAmount Amount of extra asset borrowed
    /// @param supplyAmount Amount of asset supplied (down payment)
    /// @param data LeverageExecutor data
    function buyCollateral(address from, uint256 borrowAmount, uint256 supplyAmount, bytes calldata data)
        external
        pure
        returns (Module[] memory modules, bytes[] memory calls)
    {
        modules = new Module[](1);
        calls = new bytes[](1);
        modules[0] = Module.Leverage;
        calls[0] = abi.encodeWithSelector(SGLLeverage.buyCollateral.selector, from, borrowAmount, supplyAmount, data);
    }

    /// @notice view the result of a buyCollateral operation.
    function buyCollateralView(bytes calldata result) external pure returns (uint256 amountOut) {
        amountOut = abi.decode(result, (uint256));
    }

    /// @notice liquidates a position for which the collateral's value is less than the borrowed value
    /// @dev liquidation bonus is included in the computation
    /// @param user the address to liquidate
    /// @param from the address to extract from
    /// @param receiver the address which receives the output
    /// @param liquidatorReceiver the IMarketLiquidatorReceiver executor
    /// @param liquidatorReceiverData the IMarketLiquidatorReceiver executor data
    /// @param swapCollateral true/false
    function liquidateBadDebt(
        address user,
        address from,
        address receiver,
        IMarketLiquidatorReceiver liquidatorReceiver,
        bytes calldata liquidatorReceiverData,
        bool swapCollateral
    ) external pure returns (Module[] memory modules, bytes[] memory calls) {
        modules = new Module[](1);
        calls = new bytes[](1);
        modules[0] = Module.Liquidation;
        calls[0] = abi.encodeWithSelector(
            SGLLiquidation.liquidateBadDebt.selector,
            user,
            from,
            receiver,
            liquidatorReceiver,
            liquidatorReceiverData,
            swapCollateral
        );
    }

    /// @notice Entry point for liquidations.
    /// @dev Will call `closedLiquidation()` if not LQ exists or no LQ bid avail exists. Otherwise use LQ.
    /// @param users An array of user addresses.
    /// @param maxBorrowParts A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user
    /// @param minLiquidationBonuses minimum liquidation bonus acceptable
    /// @param liquidatorReceivers IMarketLiquidatorReceiver array
    /// @param liquidatorReceiverDatas IMarketLiquidatorReceiver datas
    function liquidate(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        uint256[] calldata minLiquidationBonuses,
        IMarketLiquidatorReceiver[] calldata liquidatorReceivers,
        bytes[] calldata liquidatorReceiverDatas
    ) external pure returns (Module[] memory modules, bytes[] memory calls) {
        modules = new Module[](1);
        calls = new bytes[](1);
        modules[0] = Module.Liquidation;
        calls[0] = abi.encodeWithSelector(
            SGLLiquidation.liquidate.selector,
            users,
            maxBorrowParts,
            minLiquidationBonuses,
            liquidatorReceivers,
            liquidatorReceiverDatas
        );
    }

    struct _ViewLiquidationStruct {
        address user;
        uint256 maxBorrowPart;
        uint256 minLiquidationBonus;
        uint256 exchangeRate;
        IYieldBox yieldBox;
        uint256 collateralId;
        uint256 userCollateralShare;
        uint256 userBorrowPart;
        Rebase totalBorrow;
        uint256 liquidationBonusAmount;
        uint256 liquidationCollateralizationRate;
        uint256 liquidationMultiplier;
        uint256 exchangeRatePrecision;
        uint256 feeDecimalsPrecision;
    }

    function _viewLiqudationBorrowAndCollateralShare(_ViewLiquidationStruct memory _data, address sglAddress)
        private
        view
        returns (uint256 borrowAmount, uint256 borrowPart, uint256 collateralShare)
    {
        IMarket market = IMarket(sglAddress);
        if (_data.exchangeRate == 0) revert ExchangeRateNotValid();

        // get collateral amount in asset's value
        uint256 collateralPartInAsset = (
            _data.yieldBox.toAmount(_data.collateralId, _data.userCollateralShare, false) * _data.exchangeRatePrecision
        ) / _data.exchangeRate;

        // compute closing factor (liquidatable amount)
        uint256 borrowPartWithBonus = computeClosingFactor(market, _data.userBorrowPart, collateralPartInAsset);

        // limit liquidable amount before bonus to the current debt
        uint256 userTotalBorrowAmount = _data.totalBorrow.toElastic(_data.userBorrowPart, true);
        borrowPartWithBonus = borrowPartWithBonus > userTotalBorrowAmount ? userTotalBorrowAmount : borrowPartWithBonus;

        // make sure liquidator cannot bypass bad debt handling
        if (collateralPartInAsset < borrowPartWithBonus) revert BadDebt();

        // check the amount to be repaid versus liquidator supplied limit
        borrowPartWithBonus = borrowPartWithBonus > _data.maxBorrowPart ? _data.maxBorrowPart : borrowPartWithBonus;
        borrowAmount = borrowPartWithBonus;

        // compute part units, preventing rounding dust when liquidation is full
        borrowPart = borrowAmount == userTotalBorrowAmount
            ? _data.userBorrowPart
            : _data.totalBorrow.toBase(borrowPartWithBonus, false);
        if (borrowPart == 0) revert Solvent();

        if (_data.liquidationBonusAmount > 0) {
            borrowPartWithBonus = borrowPartWithBonus + (borrowPartWithBonus * _data.liquidationBonusAmount) / FEE_PRECISION;
        }

        if (collateralPartInAsset < borrowPartWithBonus) {
            if (collateralPartInAsset <= userTotalBorrowAmount) {
                revert BadDebt();
            }
            // If current debt is covered by collateral fully
            // then there is some liquidation bonus,
            // so liquidation can proceed if liquidator's minimum is met
            if (_data.minLiquidationBonus > 0) {
                // `collateralPartInAsset > borrowAmount` as `borrowAmount <= userTotalBorrowAmount`
                uint256 effectiveBonus = ((collateralPartInAsset - borrowAmount) * FEE_PRECISION) / borrowAmount;
                if (effectiveBonus < _data.minLiquidationBonus) {
                    revert InsufficientLiquidationBonus();
                }
                collateralShare = _data.userCollateralShare;
            } else {
                revert InsufficientLiquidationBonus();
            }
        } else {
            collateralShare = _data.yieldBox.toShare(
                _data.collateralId, (borrowPartWithBonus * _data.exchangeRate) / _data.exchangeRatePrecision, false
            );
            if (collateralShare > _data.userCollateralShare) {
                revert NotEnoughCollateral();
            }
        }
    }
}

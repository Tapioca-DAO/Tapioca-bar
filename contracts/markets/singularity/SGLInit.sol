// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

// Tapioca
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {IPearlmit} from "tapioca-periph/interfaces/periph/IPearlmit.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {MarketStateView} from "../MarketStateView.sol";
import {SGLLiquidation} from "./SGLLiquidation.sol";
import {SGLCollateral} from "./SGLCollateral.sol";
import {MarketERC20} from "../MarketERC20.sol";
import {SGLLeverage} from "./SGLLeverage.sol";
import {SGLStorage} from "./SGLStorage.sol";
import {SGLCommon} from "./SGLCommon.sol";
import {SGLBorrow} from "./SGLBorrow.sol";

contract SGLInit is MarketStateView, SGLCommon {
    using SafeCast for uint256;
    using RebaseLibrary for Rebase;

    /// @notice returns the liquidation module
    SGLLiquidation public liquidationModule;
    /// @notice returns the borrow module
    SGLBorrow public borrowModule;
    /// @notice returns the collateral module
    SGLCollateral public collateralModule;
    /// @notice returns the leverage module
    SGLLeverage public leverageModule;

    // ************ //
    // *** VARS *** //
    // ************ //

    error NotValid();

    struct _InitMemoryData {
        IPenrose penrose_;
        ITapiocaOracle _oracle;
        uint256 _exchangeRatePrecision;
        uint256 _collateralizationRate;
        uint256 _liquidationCollateralizationRate;
        ILeverageExecutor _leverageExecutor;
    }

    struct _InitMemoryModulesData {
        address _liquidationModule;
        address _borrowModule;
        address _collateralModule;
        address _leverageModule;
    }

    struct _InitMemoryTokensData {
        IERC20 _asset;
        uint256 _assetId;
        IERC20 _collateral;
        uint256 _collateralId;
    }

    function totalSupply() public view override(MarketERC20, SGLStorage) returns (uint256) {
        return totalAsset.base;
    }

    /// @notice The init function that acts as a constructor
    function init(bytes calldata initData) external {
        (
            _InitMemoryModulesData memory _initMemoryModulesData,
            _InitMemoryTokensData memory _initMemoryTokensData,
            _InitMemoryData memory _initMemoryData
        ) = abi.decode(initData, (_InitMemoryModulesData, _InitMemoryTokensData, _InitMemoryData));

        penrose = _initMemoryData.penrose_;
        pearlmit = IPearlmit(_initMemoryData.penrose_.pearlmit());
        yieldBox = IYieldBox(_initMemoryData.penrose_.yieldBox());
        _transferOwnership(address(penrose));

        if (address(_initMemoryTokensData._collateral) == address(0)) {
            revert NotValid();
        }
        if (address(_initMemoryTokensData._asset) == address(0)) {
            revert NotValid();
        }
        if (address(_initMemoryData._oracle) == address(0)) revert NotValid();

        _initModules(
            _initMemoryModulesData._liquidationModule,
            _initMemoryModulesData._borrowModule,
            _initMemoryModulesData._collateralModule,
            _initMemoryModulesData._leverageModule
        );
        _initCoreStorage(
            _initMemoryTokensData._asset,
            _initMemoryTokensData._assetId,
            _initMemoryTokensData._collateral,
            _initMemoryTokensData._collateralId,
            _initMemoryData._oracle,
            _initMemoryData._leverageExecutor
        );
        _initDefaultValues(
            _initMemoryData._collateralizationRate,
            _initMemoryData._liquidationCollateralizationRate,
            _initMemoryData._exchangeRatePrecision
        );
    }

    function _initModules(
        address _liquidationModule,
        address _borrowModule,
        address _collateralModule,
        address _leverageModule
    ) private {
        if (_liquidationModule == address(0)) revert NotValid();
        if (_collateralModule == address(0)) revert NotValid();
        if (_borrowModule == address(0)) revert NotValid();
        if (_leverageModule == address(0)) revert NotValid();
        assembly {
            sstore(liquidationModule.slot, _liquidationModule)
            sstore(collateralModule.slot, _collateralModule)
            sstore(borrowModule.slot, _borrowModule)
            sstore(leverageModule.slot, _leverageModule)
        }
    }

    function _initCoreStorage(
        IERC20 _asset,
        uint256 _assetId,
        IERC20 _collateral,
        uint256 _collateralId,
        ITapiocaOracle _oracle,
        ILeverageExecutor _leverageExecutor
    ) private {
        assembly {
            // Store the values directly into their respective slots
            sstore(asset.slot, _asset)
            sstore(collateral.slot, _collateral)
            sstore(assetId.slot, _assetId)
            sstore(collateralId.slot, _collateralId)
            sstore(oracle.slot, _oracle)
            sstore(leverageExecutor.slot, _leverageExecutor)
        }
    }

    function _initDefaultValues(
        uint256 _collateralizationRate,
        uint256 _liquidationCollateralizationRate,
        uint256 _exchangeRatePrecision
    ) private {
        minBorrowAmount = 1e15;
        minLendAmount = 1e15;
        minCollateralAmount = 1e15;
        collateralizationRate = _collateralizationRate > 0 ? _collateralizationRate : 75000;
        liquidationCollateralizationRate =
            _liquidationCollateralizationRate > 0 ? _liquidationCollateralizationRate : 80000;
        require(
            liquidationCollateralizationRate > collateralizationRate, "SGL: liquidationCollateralizationRate not valid"
        );

        minimumInterestPerSecond = 951293760; // 3%
        maximumInterestPerSecond = 15854896000; // 50%
        interestElasticity = 3600e36; // Half or double in 3600 seconds (1 hours) if linear
        startingInterestPerSecond = minimumInterestPerSecond;
        accrueInfo.interestPerSecond = startingInterestPerSecond; // 1% APR, with 1e18 being 100%
        updateExchangeRate();
        assembly {
            //default fees
            sstore(protocolFee.slot, 10000) // 10%; used for accrual
            sstore(borrowOpeningFee.slot, 50) // 0.05%

            //liquidation
            sstore(liquidationMultiplier.slot, 12000) //12%
            sstore(minLiquidatorReward.slot, 88000) // 88e3
            sstore(maxLiquidatorReward.slot, 92500) // 925e2
            sstore(liquidationBonusAmount.slot, 10000) //1e4
            sstore(minimumTargetUtilization.slot, 600000000000000000) // 60%
            sstore(maximumTargetUtilization.slot, 700000000000000000) // 70%
            sstore(rateValidDuration.slot, 86400) //24 hours
        }

        EXCHANGE_RATE_PRECISION = _exchangeRatePrecision > 0 ? _exchangeRatePrecision : 1e18;
    }
}

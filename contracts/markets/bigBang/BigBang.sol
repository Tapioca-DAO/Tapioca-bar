// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {BoringERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";

// Tapioca
import {IMarketLiquidatorReceiver} from "tapioca-periph/interfaces/bar/IMarketLiquidatorReceiver.sol";
import {ILeverageExecutor} from "tapioca-periph/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";
import {SafeApprove} from "../../libraries/SafeApprove.sol";
import {BBLiquidation} from "./BBLiquidation.sol";
import {BBCollateral} from "./BBCollateral.sol";
import {BBLeverage} from "./BBLeverage.sol";
import {BBCommon} from "./BBCommon.sol";
import {BBBorrow} from "./BBBorrow.sol";

// solhint-disable max-line-length
/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract BigBang is BBCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;
    using SafeApprove for address;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error BadPair();
    error DebtRatesNotValid();
    error MaxDebtRateNotValid();
    error TransferFailed();
    error NotValid();
    error ModuleNotSet();

    // ************ //
    // *** VARS *** //
    // ************ //
    /// @notice enum representing each type of module associated with a Singularity market
    /// @dev modules are contracts that holds a portion of the market's logic
    enum Module {
        Base,
        Borrow,
        Collateral,
        Liquidation,
        Leverage
    }
    /// @notice returns the liquidation module

    BBLiquidation public liquidationModule;
    /// @notice returns the borrow module
    BBBorrow public borrowModule;
    /// @notice returns the collateral module
    BBCollateral public collateralModule;
    /// @notice returns the leverage module
    BBLeverage public leverageModule;

    struct _InitMemoryData {
        IPenrose _penrose;
        IERC20 _collateral;
        uint256 _collateralId;
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

    struct _InitMemoryDebtData {
        uint256 _debtRateAgainstEth;
        uint256 _debtRateMin;
        uint256 _debtRateMax;
    }

    /// @notice The init function that acts as a constructor
    function init(bytes calldata initData) external onlyOnce {
        (
            _InitMemoryModulesData memory initModulesData,
            _InitMemoryDebtData memory initDebtData,
            _InitMemoryData memory initMemoryData
        ) = abi.decode(initData, (_InitMemoryModulesData, _InitMemoryDebtData, _InitMemoryData));

        _initModules(
            initModulesData._liquidationModule,
            initModulesData._borrowModule,
            initModulesData._collateralModule,
            initModulesData._leverageModule
        );
        _initCoreStorage(
            initMemoryData._penrose,
            initMemoryData._collateral,
            initMemoryData._collateralId,
            initMemoryData._oracle,
            initMemoryData._exchangeRatePrecision,
            initMemoryData._collateralizationRate,
            initMemoryData._liquidationCollateralizationRate,
            initMemoryData._leverageExecutor
        );
        _initDebtStorage(initDebtData._debtRateAgainstEth, initDebtData._debtRateMin, initDebtData._debtRateMax);
    }

    function _initModules(
        address _liquidationModule,
        address _borrowModule,
        address _collateralModule,
        address _leverageModule
    ) private {
        liquidationModule = BBLiquidation(_liquidationModule);
        collateralModule = BBCollateral(_collateralModule);
        borrowModule = BBBorrow(_borrowModule);
        leverageModule = BBLeverage(_leverageModule);
    }

    function _initDebtStorage(uint256 _debtRateAgainstEth, uint256 _debtRateMin, uint256 _debtRateMax) private {
        isMainMarket = collateralId == penrose.mainAssetId();
        if (!isMainMarket) {
            if (minDebtRate != 0 && maxDebtRate != 0) {
                if (_debtRateMin >= _debtRateMax) revert DebtRatesNotValid();
                if (_debtRateMax > 1e18) revert MaxDebtRateNotValid();
            }
            debtRateAgainstEthMarket = _debtRateAgainstEth;
            maxDebtRate = _debtRateMax;
            minDebtRate = _debtRateMin;
        }
    }

    function _initCoreStorage(
        IPenrose _penrose,
        IERC20 _collateral,
        uint256 _collateralId,
        ITapiocaOracle _oracle,
        uint256 _exchangeRatePrecision,
        uint256 _collateralizationRate,
        uint256 _liquidationCollateralizationRate,
        ILeverageExecutor _leverageExecutor
    ) private {
        penrose = _penrose;
        yieldBox = IYieldBox(_penrose.yieldBox());

        address _asset = penrose.usdoToken();

        if (address(_collateral) == address(0)) revert BadPair();
        if (address(_asset) == address(0)) revert BadPair();
        if (address(_oracle) == address(0)) revert BadPair();
        if (_collateralizationRate > FEE_PRECISION) revert NotValid();
        if (_liquidationCollateralizationRate > FEE_PRECISION) {
            revert NotValid();
        }
        asset = IERC20(_asset);
        assetId = penrose.usdoAssetId();
        collateral = _collateral;
        collateralId = _collateralId;
        oracle = _oracle;
        updateExchangeRate();
        protocolFee = 10000; // 10%; used for accrual
        collateralizationRate = _collateralizationRate > 0 ? _collateralizationRate : 75000;
        liquidationCollateralizationRate =
            _liquidationCollateralizationRate > 0 ? _liquidationCollateralizationRate : 80000;

        if (liquidationCollateralizationRate < collateralizationRate) {
            revert NotValid();
        }

        EXCHANGE_RATE_PRECISION = _exchangeRatePrecision > 0 ? _exchangeRatePrecision : 1e18;

        minLiquidatorReward = 8e4;
        maxLiquidatorReward = 9e4;
        liquidationBonusAmount = 1e4;
        liquidationMultiplier = 12000; //12%

        rateValidDuration = 24 hours;
        minMintFee = 0;
        maxMintFee = 1000; // 1%
        maxMintFeeStart = 975000000000000000; // 0.975 *1e18
        minMintFeeStart = 1000000000000000000; // 1*1e18

        leverageExecutor = _leverageExecutor;

        _transferOwnership(address(penrose));
        conservator = address(penrose);
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice Allows batched call to BingBang.
    /// @param calls An array encoded call data.
    /// @param revertOnFail If True then reverts after a failed call and stops doing further calls.
    function execute(bytes[] calldata calls, bool revertOnFail)
        external
        nonReentrant
        returns (bool[] memory successes, string[] memory results)
    {
        successes = new bool[](calls.length);
        results = new string[](calls.length);
        for (uint256 i; i < calls.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(calls[i]);

            if (!success && revertOnFail) {
                revert(_getRevertMsg(result));
            }
            successes[i] = success;
            results[i] = _getRevertMsg(result);
        }
    }

    /// @notice Adds `collateral` from msg.sender to the account `to`.
    /// @param from Account to transfer shares from.
    /// @param to The receiver of the tokens.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    /// @param amount The amount to add for `to`.
    /// @param share The amount of shares to add for `to`.
    function addCollateral(address from, address to, bool skim, uint256 amount, uint256 share) external {
        _executeModule(
            Module.Collateral,
            abi.encodeWithSelector(BBCollateral.addCollateral.selector, from, to, skim, amount, share)
        );
    }

    /// @notice Removes `share` amount of collateral and transfers it to `to`.
    /// @param from Account to debit collateral from.
    /// @param to The receiver of the shares.
    /// @param share Amount of shares to remove.
    function removeCollateral(address from, address to, uint256 share) external {
        _executeModule(
            Module.Collateral, abi.encodeWithSelector(BBCollateral.removeCollateral.selector, from, to, share)
        );
    }

    /// @notice Sender borrows `amount` and transfers it to `to`.
    /// @param from Account to borrow for.
    /// @param to The receiver of borrowed tokens.
    /// @param amount Amount to borrow.
    /// @return part Total part of the debt held by borrowers.
    /// @return share Total amount in shares borrowed.
    function borrow(address from, address to, uint256 amount) external returns (uint256 part, uint256 share) {
        bytes memory result =
            _executeModule(Module.Borrow, abi.encodeWithSelector(BBBorrow.borrow.selector, from, to, amount));
        (part, share) = abi.decode(result, (uint256, uint256));
    }

    /// @notice Repays a loan.
    /// @dev The bool param is not used but we added it to respect the ISingularity interface for MarketsHelper compatibility
    /// @param from Address to repay from.
    /// @param to Address of the user this payment should go.
    /// @param part The amount to repay. See `userBorrowPart`.
    /// @return amount The total amount repayed.
    function repay(address from, address to, bool skim, uint256 part) external returns (uint256 amount) {
        bytes memory result =
            _executeModule(Module.Borrow, abi.encodeWithSelector(BBBorrow.repay.selector, from, to, skim, part));
        amount = abi.decode(result, (uint256));
    }

    /// @notice Lever down: Sell collateral to repay debt; excess goes to YB
    /// @param from The user who sells
    /// @param share Collateral YieldBox-shares to sell
    /// @param data LeverageExecutor data
    /// @return amountOut Actual asset amount received in the sale
    function sellCollateral(address from, uint256 share, bytes calldata data) external returns (uint256 amountOut) {
        bytes memory result = _executeModule(
            Module.Leverage, abi.encodeWithSelector(BBLeverage.sellCollateral.selector, from, share, data)
        );
        amountOut = abi.decode(result, (uint256));
    }

    /// @notice Lever up: Borrow more and buy collateral with it.
    /// @param from The user who buys
    /// @param borrowAmount Amount of extra asset borrowed
    /// @param supplyAmount Amount of asset supplied (down payment)
    /// @param data LeverageExecutor data
    /// @return amountOut Actual collateral amount purchased
    function buyCollateral(address from, uint256 borrowAmount, uint256 supplyAmount, bytes calldata data)
        external
        returns (uint256 amountOut)
    {
        bytes memory result = _executeModule(
            Module.Leverage,
            abi.encodeWithSelector(BBLeverage.buyCollateral.selector, from, borrowAmount, supplyAmount, data)
        );
        amountOut = abi.decode(result, (uint256));
    }

    /// @notice liquidates a position for which the collateral's value is less than the borrowed value
    /// @dev liquidation bonus is included in the computation
    /// @param user the address to liquidate
    /// @param from the address to extract funds from
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
    ) external {
        _executeModule(
            Module.Liquidation,
            abi.encodeWithSelector(
                BBLiquidation.liquidateBadDebt.selector,
                user,
                from,
                receiver,
                liquidatorReceiver,
                liquidatorReceiverData,
                swapCollateral
            )
        );
    }

    /// @notice Entry point for liquidations.
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
    ) external {
        _executeModule(
            Module.Liquidation,
            abi.encodeWithSelector(
                BBLiquidation.liquidate.selector,
                users,
                maxBorrowParts,
                minLiquidationBonuses,
                liquidatorReceivers,
                liquidatorReceiverDatas
            )
        );
    }

    function transfer(address, uint256) public pure override returns (bool) {
        revert("BB: not allowed");
    }

    function transferFrom(address, address, uint256) public pure override returns (bool) {
        revert("BB: not allowed");
    }

    // ************************* //
    // *** OWNER FUNCTIONS ***** //
    // ************************* //
    /// @notice updates the pause state of the contract
    /// @dev can only be called by the conservator
    /// @param val the new value
    function updatePause(PauseType _type, bool val) external {
        require(msg.sender == conservator, "Market: unauthorized");
        require(val != pauseOptions[_type], "Market: same state");
        emit PausedUpdated(_type, pauseOptions[_type], val);
        pauseOptions[_type] = val;
    }

    /// @notice updates the pause state of the contract for all types
    /// @param val the new val
    function updatePauseAll(bool val) external {
        require(msg.sender == conservator, "Market: unauthorized");

        pauseOptions[PauseType.Borrow] = val;
        pauseOptions[PauseType.Repay] = val;
        pauseOptions[PauseType.AddCollateral] = val;
        pauseOptions[PauseType.RemoveCollateral] = val;
        pauseOptions[PauseType.Liquidation] = val;
        pauseOptions[PauseType.LeverageBuy] = val;
        pauseOptions[PauseType.LeverageSell] = val;

        emit PausedUpdated(PauseType.Borrow, pauseOptions[PauseType.Borrow], val);
        emit PausedUpdated(PauseType.Repay, pauseOptions[PauseType.Repay], val);
        emit PausedUpdated(PauseType.AddCollateral, pauseOptions[PauseType.AddCollateral], val);
        emit PausedUpdated(PauseType.RemoveCollateral, pauseOptions[PauseType.RemoveCollateral], val);
        emit PausedUpdated(PauseType.Liquidation, pauseOptions[PauseType.Liquidation], val);
        emit PausedUpdated(PauseType.LeverageBuy, pauseOptions[PauseType.LeverageBuy], val);
        emit PausedUpdated(PauseType.LeverageSell, pauseOptions[PauseType.LeverageSell], val);
    }

    /// @notice sets min and max mint range
    /// @dev can only be called by the owner
    /// @param _min the new min start
    /// @param _max the new max start
    function setMinAndMaxMintRange(uint256 _min, uint256 _max) external onlyOwner {
        emit UpdateMinMaxMintRange(minMintFeeStart, _min, maxMintFeeStart, _max);
        minMintFeeStart = _min;
        maxMintFeeStart = _max;
    }

    /// @notice sets min and max mint fee
    /// @dev can only be called by the owner
    /// @param _min the new min fee
    /// @param _max the new max fee
    function setMinAndMaxMintFee(uint256 _min, uint256 _max) external onlyOwner {
        emit UpdateMinMaxMintFee(minMintFee, _min, maxMintFee, _max);
        minMintFee = _min;
        maxMintFee = _max;
    }

    /// @notice updates asset's oracle info
    /// @dev can only be called by the owner
    /// @param _oracle the new ITapiocaOracle address
    /// @param _oracleData the new ITapiocaOracle data
    function setAssetOracle(address _oracle, bytes calldata _oracleData) external onlyOwner {
        if (_oracle != address(0)) {
            emit AssetOracleUpdated(address(assetOracle), _oracle);
            assetOracle = ITapiocaOracle(_oracle);
        }
        if (_oracleData.length > 0) {
            assetOracleData = _oracleData;
            emit AssetOracleDataUpdated();
        }
    }

    /// @notice rescues unused ETH from the contract
    /// @param amount the amount to rescue
    /// @param to the recipient
    function rescueEth(uint256 amount, address to) external onlyOwner {
        (bool success,) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /// @notice Transfers fees to penrose
    /// @dev can only be called by the owner
    /// @return feeShares the amount of fees in shares withdrawn under Penrose
    function refreshPenroseFees() external onlyOwner returns (uint256 feeShares) {
        uint256 fees = asset.balanceOf(address(this));
        feeShares = yieldBox.toShare(assetId, fees, false);
        if (feeShares > 0) {
            address(asset).safeApprove(address(yieldBox), fees);
            yieldBox.depositAsset(assetId, address(this), msg.sender, 0, feeShares);
        }
    }

    /// @notice sets BigBang specific configuration
    /// @dev values are updated only if > 0 or not address(0)
    /// @param _minDebtRate the minimum debt rate (5000000000000000 is 0.5%)
    /// @param _maxDebtRate the maximum debt rate (50000000000000000 is 5%)
    /// @param _debtRateAgainstEthMarket the debt ratio against the main BB market (200000000000000000 is 20%)
    /// @param _liquidationMultiplier the liquidation bonus percentage (12000 is 12%)
    function setBigBangConfig(
        uint256 _minDebtRate,
        uint256 _maxDebtRate,
        uint256 _debtRateAgainstEthMarket,
        uint256 _liquidationMultiplier
    ) external onlyOwner {
        isMainMarket = collateralId == penrose.mainAssetId();

        if (!isMainMarket) {
            _accrue();
            if (_minDebtRate > 0) {
                if (_minDebtRate >= maxDebtRate) revert DebtRatesNotValid();
                emit MinDebtRateUpdated(minDebtRate, _minDebtRate);
                minDebtRate = _minDebtRate;
            }

            if (_maxDebtRate > 0) {
                if (_maxDebtRate <= minDebtRate) revert DebtRatesNotValid();
                if (_maxDebtRate > 1e18) revert DebtRatesNotValid();
                emit MaxDebtRateUpdated(maxDebtRate, _maxDebtRate);
                maxDebtRate = _maxDebtRate;
            }

            if (_debtRateAgainstEthMarket > 0) {
                emit DebtRateAgainstEthUpdated(debtRateAgainstEthMarket, _debtRateAgainstEthMarket);
                debtRateAgainstEthMarket = _debtRateAgainstEthMarket;
            }

            if (_liquidationMultiplier > 0) {
                if (_liquidationMultiplier >= FEE_PRECISION) revert NotValid();
                emit LiquidationMultiplierUpdated(liquidationMultiplier, _liquidationMultiplier);
                liquidationMultiplier = _liquidationMultiplier;
            }
        }
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _extractModule(Module _module) private view returns (address) {
        address module;
        if (_module == Module.Borrow) {
            module = address(borrowModule);
        } else if (_module == Module.Collateral) {
            module = address(collateralModule);
        } else if (_module == Module.Liquidation) {
            module = address(liquidationModule);
        } else if (_module == Module.Leverage) {
            module = address(leverageModule);
        }

        if (module == address(0)) revert ModuleNotSet();

        return module;
    }

    function _executeModule(Module _module, bytes memory _data) private returns (bytes memory returnData) {
        bool success = true;

        (success, returnData) = _extractModule(_module).delegatecall(_data);
        if (!success) {
            revert(_getRevertMsg(returnData));
        }
    }

    receive() external payable {}
}

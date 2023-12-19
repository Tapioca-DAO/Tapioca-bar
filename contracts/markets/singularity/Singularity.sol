// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// SGL modules
import "./SGLCommon.sol";
import "./SGLLiquidation.sol";
import "./SGLCollateral.sol";
import "./SGLBorrow.sol";
import "./SGLLeverage.sol";

import "tapioca-periph/contracts/interfaces/ISendFrom.sol";
import "tapioca-sdk/dist/contracts/libraries/LzLib.sol";

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// solhint-disable max-line-length

/*

__/\\\\\\\\\\\\\\\_____/\\\\\\\\\_____/\\\\\\\\\\\\\____/\\\\\\\\\\\_______/\\\\\_____________/\\\\\\\\\_____/\\\\\\\\\____        
 _\///////\\\/////____/\\\\\\\\\\\\\__\/\\\/////////\\\_\/////\\\///______/\\\///\\\________/\\\////////____/\\\\\\\\\\\\\__       
  _______\/\\\________/\\\/////////\\\_\/\\\_______\/\\\_____\/\\\_______/\\\/__\///\\\____/\\\/____________/\\\/////////\\\_      
   _______\/\\\_______\/\\\_______\/\\\_\/\\\\\\\\\\\\\/______\/\\\______/\\\______\//\\\__/\\\_____________\/\\\_______\/\\\_     
    _______\/\\\_______\/\\\\\\\\\\\\\\\_\/\\\/////////________\/\\\_____\/\\\_______\/\\\_\/\\\_____________\/\\\\\\\\\\\\\\\_    
     _______\/\\\_______\/\\\/////////\\\_\/\\\_________________\/\\\_____\//\\\______/\\\__\//\\\____________\/\\\/////////\\\_   
      _______\/\\\_______\/\\\_______\/\\\_\/\\\_________________\/\\\______\///\\\__/\\\_____\///\\\__________\/\\\_______\/\\\_  
       _______\/\\\_______\/\\\_______\/\\\_\/\\\______________/\\\\\\\\\\\____\///\\\\\/________\////\\\\\\\\\_\/\\\_______\/\\\_ 
        _______\///________\///________\///__\///______________\///////////_______\/////_____________\/////////__\///________\///__

*/

/// @title Tapioca market
contract Singularity is SGLCommon, ReentrancyGuard {
    using RebaseLibrary for Rebase;

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
    SGLLiquidation public liquidationModule;
    /// @notice returns the borrow module
    SGLBorrow public borrowModule;
    /// @notice returns the collateral module
    SGLCollateral public collateralModule;
    /// @notice returns the leverage module
    SGLLeverage public leverageModule;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error BadPair();
    error TransferFailed();
    error NotValid();
    error ModuleNotSet();

    /// @notice The init function that acts as a constructor
    function init(bytes calldata data) external onlyOnce {
        (
            address _liquidationModule,
            address _borrowModule,
            address _collateralModule,
            address _leverageModule,
            IPenrose tapiocaBar_,
            IERC20 _asset,
            uint256 _assetId,
            IERC20 _collateral,
            uint256 _collateralId,
            IOracle _oracle,
            uint256 _exchangeRatePrecision,
            uint256 _collateralizationRate,
            uint256 _liquidationCollateralizationRate,
            ILeverageExecutor _leverageExecutor
        ) = abi.decode(
                data,
                (
                    address,
                    address,
                    address,
                    address,
                    IPenrose,
                    IERC20,
                    uint256,
                    IERC20,
                    uint256,
                    IOracle,
                    uint256,
                    uint256,
                    uint256,
                    ILeverageExecutor
                )
            );

        penrose = tapiocaBar_;
        yieldBox = YieldBox(tapiocaBar_.yieldBox());
        owner = address(penrose);

        if (address(_collateral) == address(0)) revert BadPair();
        if (address(_asset) == address(0)) revert BadPair();
        if (address(_oracle) == address(0)) revert BadPair();

        _initModules(
            _liquidationModule,
            _borrowModule,
            _collateralModule,
            _leverageModule
        );
        _initCoreStorage(
            _asset,
            _assetId,
            _collateral,
            _collateralId,
            _oracle,
            _leverageExecutor
        );
        _initDefaultValues(
            _collateralizationRate,
            _liquidationCollateralizationRate,
            _exchangeRatePrecision
        );
    }

    function _initModules(
        address _liquidationModule,
        address _borrowModule,
        address _collateralModule,
        address _leverageModule
    ) private {
        liquidationModule = SGLLiquidation(_liquidationModule);
        collateralModule = SGLCollateral(_collateralModule);
        borrowModule = SGLBorrow(_borrowModule);
        leverageModule = SGLLeverage(_leverageModule);
    }

    function _initCoreStorage(
        IERC20 _asset,
        uint256 _assetId,
        IERC20 _collateral,
        uint256 _collateralId,
        IOracle _oracle,
        ILeverageExecutor _leverageExecutor
    ) private {
        asset = _asset;
        collateral = _collateral;
        assetId = _assetId;
        collateralId = _collateralId;
        oracle = _oracle;
        leverageExecutor = _leverageExecutor;
    }

    function _initDefaultValues(
        uint256 _collateralizationRate,
        uint256 _liquidationCollateralizationRate,
        uint256 _exchangeRatePrecision
    ) private {
        collateralizationRate = _collateralizationRate > 0
            ? _collateralizationRate
            : 75000;
        liquidationCollateralizationRate = _liquidationCollateralizationRate > 0
            ? _liquidationCollateralizationRate
            : 80000;
        require(
            liquidationCollateralizationRate > collateralizationRate,
            "SGL: liquidationCollateralizationRate not valid"
        );
        minimumInterestPerSecond = 158548960; // approx 0.5% APR
        maximumInterestPerSecond = 317097920000; // approx 1000% APR
        interestElasticity = 28800e36; // Half or double in 28800 seconds (8 hours) if linear
        startingInterestPerSecond = minimumInterestPerSecond;
        accrueInfo.interestPerSecond = startingInterestPerSecond; // 1% APR, with 1e18 being 100%
        updateExchangeRate();
        //default fees
        callerFee = 1000; // 1%
        protocolFee = 0; // 10%; used for accrual
        borrowOpeningFee = 50; // 0.05%
        //liquidation
        liquidationMultiplier = 12000; //12%
        lqCollateralizationRate = 25000;
        EXCHANGE_RATE_PRECISION = _exchangeRatePrecision > 0
            ? _exchangeRatePrecision
            : 1e18;
        minLiquidatorReward = 8e4;
        maxLiquidatorReward = 9e4;
        liquidationBonusAmount = 1e4;
        minimumTargetUtilization = 3e17;
        maximumTargetUtilization = 5e17;
        fullUtilizationMinusMax = FULL_UTILIZATION - maximumTargetUtilization;
        rateValidDuration = 24 hours;
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice transforms amount to shares for a market's permit operation
    /// @param amount the amount to transform
    /// @param tokenId the YieldBox asset id
    /// @return share amount transformed into shares
    function computeAllowedLendShare(
        uint256 amount,
        uint256 tokenId
    ) external view returns (uint256 share) {
        uint256 allShare = totalAsset.elastic +
            yieldBox.toShare(tokenId, totalBorrow.elastic, true);
        share = (amount * allShare) / totalAsset.base;
    }

    /// @notice returns Total yieldBox shares for user
    /// @param _user The user to check shares for
    /// @param _assetId The asset id to check shares for
    /// @return shares value
    function yieldBoxShares(
        address _user,
        uint256 _assetId
    ) external view returns (uint256) {
        bytes32 sig = _assetId == assetId ? ASSET_SIG : COLLATERAL_SIG;
        return
            yieldBox.balanceOf(_user, _assetId) + _yieldBoxShares[_user][sig];
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /// @notice Allows batched call to Singularity.
    /// @param calls An array encoded call data.
    /// @param revertOnFail If True then reverts after a failed call and stops doing further calls.
    /// @return successes count of successful operations
    /// @return results array of revert messages
    function execute(
        bytes[] calldata calls,
        bool revertOnFail
    )
        external
        nonReentrant
        returns (bool[] memory successes, string[] memory results)
    {
        successes = new bool[](calls.length);
        results = new string[](calls.length);
        unchecked {
            for (uint256 i; i < calls.length; i++) {
                (bool success, bytes memory result) = address(this)
                    .delegatecall(calls[i]);

                if (!success && revertOnFail) {
                    revert(_getRevertMsg(result));
                }
                successes[i] = success;
                results[i] = _getRevertMsg(result);
            }
        }
    }

    /// @notice Adds assets to the lending pair.
    /// @param from Address to add asset from.
    /// @param to The address of the user to receive the assets.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    /// @param share The amount of shares to add.
    /// @return fraction Total fractions added.
    function addAsset(
        address from,
        address to,
        bool skim,
        uint256 share
    )
        external
        optionNotPaused(PauseType.AddAsset)
        allowedLend(from, share)
        returns (uint256 fraction)
    {
        _accrue();
        fraction = _addAsset(from, to, skim, share);
    }

    /// @notice Removes an asset from msg.sender and transfers it to `to`.
    /// @param from Account to debit Assets from.
    /// @param to The user that receives the removed assets.
    /// @param fraction The amount/fraction of assets held to remove.
    /// @return share The amount of shares transferred to `to`.
    function removeAsset(
        address from,
        address to,
        uint256 fraction
    ) external optionNotPaused(PauseType.RemoveAsset) returns (uint256 share) {
        _accrue();
        share = _removeAsset(from, to, fraction, true);
        _allowedLend(from, share);
    }

    /// @notice Adds `collateral` from msg.sender to the account `to`.
    /// @param from Account to transfer shares from.
    /// @param to The receiver of the tokens.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    /// @param share The amount of shares to add for `to`.
    function addCollateral(
        address from,
        address to,
        bool skim,
        uint256 amount,
        uint256 share
    ) external {
        _executeModule(
            Module.Collateral,
            abi.encodeWithSelector(
                SGLCollateral.addCollateral.selector,
                from,
                to,
                skim,
                amount,
                share
            )
        );
    }

    /// @notice Removes `share` amount of collateral and transfers it to `to`.
    /// @param from Account to debit collateral from.
    /// @param to The receiver of the shares.
    /// @param share Amount of shares to remove.
    function removeCollateral(
        address from,
        address to,
        uint256 share
    ) external {
        _executeModule(
            Module.Collateral,
            abi.encodeWithSelector(
                SGLCollateral.removeCollateral.selector,
                from,
                to,
                share
            )
        );
    }

    /// @notice Sender borrows `amount` and transfers it to `to`.
    /// @param from Account to borrow for.
    /// @param to The receiver of borrowed tokens.
    /// @param amount Amount to borrow.
    /// @return part Total part of the debt held by borrowers.
    /// @return share Total amount in shares borrowed.
    function borrow(
        address from,
        address to,
        uint256 amount
    ) external returns (uint256 part, uint256 share) {
        bytes memory result = _executeModule(
            Module.Borrow,
            abi.encodeWithSelector(SGLBorrow.borrow.selector, from, to, amount)
        );
        (part, share) = abi.decode(result, (uint256, uint256));
    }

    /// @notice Repays a loan.
    /// @param from Address to repay from.
    /// @param to Address of the user this payment should go.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    /// @param part The amount to repay. See `userBorrowPart`.
    /// @return amount The total amount repayed.
    function repay(
        address from,
        address to,
        bool skim,
        uint256 part
    ) external returns (uint256 amount) {
        bytes memory result = _executeModule(
            Module.Borrow,
            abi.encodeWithSelector(
                SGLBorrow.repay.selector,
                from,
                to,
                skim,
                part
            )
        );
        amount = abi.decode(result, (uint256));
    }

    /// @notice Lever down: Sell collateral to repay debt; excess goes to YB
    /// @param from The user who sells
    /// @param share Collateral YieldBox-shares to sell
    /// @param data LeverageExecutor data
    /// @return amountOut Actual asset amount received in the sale
    function sellCollateral(
        address from,
        uint256 share,
        bytes calldata data
    ) external returns (uint256 amountOut) {
        bytes memory result = _executeModule(
            Module.Leverage,
            abi.encodeWithSelector(
                SGLLeverage.sellCollateral.selector,
                from,
                share,
                data
            )
        );
        amountOut = abi.decode(result, (uint256));
    }

    /// @notice Lever up: Borrow more and buy collateral with it.
    /// @param from The user who buys
    /// @param borrowAmount Amount of extra asset borrowed
    /// @param supplyAmount Amount of asset supplied (down payment)
    /// @param data LeverageExecutor data
    /// @return amountOut Actual collateral amount purchased
    function buyCollateral(
        address from,
        uint256 borrowAmount,
        uint256 supplyAmount,
        bytes calldata data
    ) external returns (uint256 amountOut) {
        bytes memory result = _executeModule(
            Module.Leverage,
            abi.encodeWithSelector(
                SGLLeverage.buyCollateral.selector,
                from,
                borrowAmount,
                supplyAmount,
                data
            )
        );
        amountOut = abi.decode(result, (uint256));
    }

    /// @notice liquidates a position where collateral value is less than the borrowed amount
    /// @param user to liquidate
    /// @param receiver funds receiver
    function liquidateBadDebt(
        address user,
        address receiver,
        IMarketLiquidatorReceiver liquidatorReceiver,
        bytes calldata liquidatorReceiverData
    ) external {
        _executeModule(
            Module.Liquidation,
            abi.encodeWithSelector(
                SGLLiquidation.liquidateBadDebt.selector,
                user,
                receiver,
                liquidatorReceiver,
                liquidatorReceiverData
            )
        );
    }

    /// @notice Entry point for liquidations.
    /// @param users An array of user addresses.
    /// @param maxBorrowParts A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user.
    function liquidate(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        IMarketLiquidatorReceiver[] calldata liquidatorReceivers,
        bytes[] calldata liquidatorReceiverDatas
    ) external {
        _executeModule(
            Module.Liquidation,
            abi.encodeWithSelector(
                SGLLiquidation.liquidate.selector,
                users,
                maxBorrowParts,
                liquidatorReceivers,
                liquidatorReceiverDatas
            )
        );
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    /// @notice rescues unused ETH from the contract
    /// @param amount the amount to rescue
    /// @param to the recipient
    function rescueEth(uint256 amount, address to) external onlyOwner {
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /// @notice Transfers fees to penrose
    /// @dev can only be called by the owner
    function refreshPenroseFees()
        external
        onlyOwner
        returns (uint256 feeShares)
    {
        address _feeTo = address(penrose);
        // withdraw the fees accumulated in `accrueInfo.feesEarnedFraction` to the balance of `feeTo`.
        if (accrueInfo.feesEarnedFraction > 0) {
            _accrue();
            uint256 _feesEarnedFraction = accrueInfo.feesEarnedFraction;
            balanceOf[_feeTo] += _feesEarnedFraction;
            emit Transfer(address(0), _feeTo, _feesEarnedFraction);
            accrueInfo.feesEarnedFraction = 0;
            emit LogWithdrawFees(_feeTo, _feesEarnedFraction);
        }

        feeShares = _removeAsset(_feeTo, msg.sender, balanceOf[_feeTo], false);
    }

    /// @notice sets Singularity specific configuration
    /// @dev values are updated only if > 0 or not address(0)
    ///     - borrowOpeningFee is always updated!
    function setSingularityConfig(
        uint256 _borrowOpeningFee,
        uint256 _lqCollateralizationRate,
        uint256 _liquidationMultiplier,
        uint256 _minimumTargetUtilization,
        uint256 _maximumTargetUtilization,
        uint64 _minimumInterestPerSecond,
        uint64 _maximumInterestPerSecond,
        uint256 _interestElasticity
    ) external onlyOwner {
        if (_borrowOpeningFee > FEE_PRECISION) revert NotValid();
        emit LogBorrowingFee(borrowOpeningFee, _borrowOpeningFee);
        borrowOpeningFee = _borrowOpeningFee;

        if (_minimumTargetUtilization > 0) {
            emit MinimumTargetUtilizationUpdated(
                minimumTargetUtilization,
                _minimumTargetUtilization
            );
            minimumTargetUtilization = _minimumTargetUtilization;
        }

        if (_maximumTargetUtilization > 0) {
            if (_maximumTargetUtilization >= FULL_UTILIZATION)
                revert NotValid();

            emit MaximumTargetUtilizationUpdated(
                maximumTargetUtilization,
                _maximumTargetUtilization
            );
            maximumTargetUtilization = _maximumTargetUtilization;
            fullUtilizationMinusMax =
                FULL_UTILIZATION -
                maximumTargetUtilization;
        }

        if (_minimumInterestPerSecond > 0) {
            if (_minimumInterestPerSecond >= maximumInterestPerSecond)
                revert NotValid();
            emit MinimumInterestPerSecondUpdated(
                minimumInterestPerSecond,
                _minimumInterestPerSecond
            );
            minimumInterestPerSecond = _minimumInterestPerSecond;
        }

        if (_maximumInterestPerSecond > 0) {
            if (_maximumInterestPerSecond <= minimumInterestPerSecond)
                revert NotValid();
            emit MaximumInterestPerSecondUpdated(
                maximumInterestPerSecond,
                _maximumInterestPerSecond
            );
            maximumInterestPerSecond = _maximumInterestPerSecond;
        }

        if (_interestElasticity > 0) {
            emit InterestElasticityUpdated(
                interestElasticity,
                _interestElasticity
            );
            interestElasticity = _interestElasticity;
        }

        if (_lqCollateralizationRate > 0) {
            if (_lqCollateralizationRate > FEE_PRECISION) revert NotValid();
            emit LqCollateralizationRateUpdated(
                lqCollateralizationRate,
                _lqCollateralizationRate
            );
            lqCollateralizationRate = _lqCollateralizationRate;
        }

        if (_liquidationMultiplier > 0) {
            if (_liquidationMultiplier > FEE_PRECISION) revert NotValid();
            emit LiquidationMultiplierUpdated(
                liquidationMultiplier,
                _liquidationMultiplier
            );
            liquidationMultiplier = _liquidationMultiplier;
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

    function _executeModule(
        Module _module,
        bytes memory _data
    ) private returns (bytes memory returnData) {
        bool success = true;

        (success, returnData) = _extractModule(_module).delegatecall(_data);
        if (!success) {
            revert(_getRevertMsg(returnData));
        }
    }

    receive() external payable {}
}

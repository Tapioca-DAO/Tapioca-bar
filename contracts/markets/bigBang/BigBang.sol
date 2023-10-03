// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// BB modules
import "./BBCommon.sol";
import "./BBLiquidation.sol";
import "./BBCollateral.sol";
import "./BBBorrow.sol";
import "./BBLeverage.sol";
import "tapioca-periph/contracts/interfaces/ISendFrom.sol";

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

contract BigBang is BBCommon {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

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

    /// @notice The init function that acts as a constructor
    function init(bytes calldata data) external onlyOnce {
        (
            address _liquidationModule,
            address _borrowModule,
            address _collateralModule,
            address _leverageModule,
            IPenrose penrose_,
            IERC20 _collateral,
            uint256 _collateralId,
            IOracle _oracle,
            uint256 _exchangeRatePrecision,
            uint256 _debtRateAgainstEth,
            uint256 _debtRateMin,
            uint256 _debtRateMax,
            uint256 _debtStartPoint,
            uint256 _collateralizationRate
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
                    IOracle,
                    uint256,
                    uint256,
                    uint256,
                    uint256,
                    uint256,
                    uint256
                )
            );
        _initModules(
            _liquidationModule,
            _borrowModule,
            _collateralModule,
            _leverageModule
        );
        _initCoreStorage(
            penrose_,
            _collateral,
            _collateralId,
            _oracle,
            _exchangeRatePrecision,
            _collateralizationRate
        );
        _initDebtStorage(
            _debtRateAgainstEth,
            _debtRateMin,
            _debtRateMax,
            _debtStartPoint
        );
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

    function _initDebtStorage(
        uint256 _debtRateAgainstEth,
        uint256 _debtRateMin,
        uint256 _debtRateMax,
        uint256 _debtStartPoint
    ) private {
        isMainMarket = collateralId == penrose.mainAssetId();
        if (!isMainMarket) {
            if (minDebtRate != 0 && maxDebtRate != 0) {
                require(
                    _debtRateMin < _debtRateMax,
                    "BB: debt rates not valid"
                );
                require(_debtRateMax <= 1e18, "BB: max debt rate not valid");
            }
            debtRateAgainstEthMarket = _debtRateAgainstEth;
            maxDebtRate = _debtRateMax;
            minDebtRate = _debtRateMin;
            debtStartPoint = _debtStartPoint;
        }
    }

    function _initCoreStorage(
        IPenrose _penrose,
        IERC20 _collateral,
        uint256 _collateralId,
        IOracle _oracle,
        uint256 _exchangeRatePrecision,
        uint256 _collateralizationRate
    ) private {
        penrose = _penrose;
        yieldBox = YieldBox(_penrose.yieldBox());
        owner = address(penrose);
        address _asset = penrose.usdoToken();
        require(
            address(_collateral) != address(0) &&
                address(_asset) != address(0) &&
                address(_oracle) != address(0),
            "BB: bad pair"
        );
        asset = IERC20(_asset);
        assetId = penrose.usdoAssetId();
        collateral = _collateral;
        collateralId = _collateralId;
        oracle = _oracle;
        updateExchangeRate();
        callerFee = 90000; // 90%
        protocolFee = 10000; // 10%
        collateralizationRate = _collateralizationRate > 0
            ? _collateralizationRate
            : 75000;
        EXCHANGE_RATE_PRECISION = _exchangeRatePrecision > 0
            ? _exchangeRatePrecision
            : 1e18;

        minLiquidatorReward = 1e3;
        maxLiquidatorReward = 1e4;
        liquidationBonusAmount = 1e4;
        borrowOpeningFee = 50; // 0.05%
        liquidationMultiplier = 12000; //12%
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice Allows batched call to BingBang.
    /// @param calls An array encoded call data.
    /// @param revertOnFail If True then reverts after a failed call and stops doing further calls.
    function execute(
        bytes[] calldata calls,
        bool revertOnFail
    ) external returns (bool[] memory successes, string[] memory results) {
        successes = new bool[](calls.length);
        results = new string[](calls.length);
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(
                calls[i]
            );

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
                BBCollateral.addCollateral.selector,
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
                BBCollateral.removeCollateral.selector,
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
            abi.encodeWithSelector(BBBorrow.borrow.selector, from, to, amount)
        );
        (part, share) = abi.decode(result, (uint256, uint256));
    }

    /// @notice Repays a loan.
    /// @dev The bool param is not used but we added it to respect the ISingularity interface for MarketsHelper compatibility
    /// @param from Address to repay from.
    /// @param to Address of the user this payment should go.
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
                BBBorrow.repay.selector,
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
    /// @param minAmountOut Minimal proceeds required for the sale
    /// @param swapper Swapper to execute the sale
    /// @param dexData Additional data to pass to the swapper
    /// @return amountOut Actual asset amount received in the sale
    function sellCollateral(
        address from,
        uint256 share,
        uint256 minAmountOut,
        ISwapper swapper,
        bytes calldata dexData
    ) external returns (uint256 amountOut) {
        bytes memory result = _executeModule(
            Module.Leverage,
            abi.encodeWithSelector(
                BBLeverage.sellCollateral.selector,
                from,
                share,
                minAmountOut,
                swapper,
                dexData
            )
        );
        amountOut = abi.decode(result, (uint256));
    }

    /// @notice Lever up: Borrow more and buy collateral with it.
    /// @param from The user who buys
    /// @param borrowAmount Amount of extra asset borrowed
    /// @param supplyAmount Amount of asset supplied (down payment)
    /// @param minAmountOut Minimal collateral amount to receive
    /// @param swapper Swapper to execute the purchase
    /// @param dexData Additional data to pass to the swapper
    /// @return amountOut Actual collateral amount purchased
    function buyCollateral(
        address from,
        uint256 borrowAmount,
        uint256 supplyAmount,
        uint256 minAmountOut,
        ISwapper swapper,
        bytes calldata dexData
    ) external returns (uint256 amountOut) {
        bytes memory result = _executeModule(
            Module.Leverage,
            abi.encodeWithSelector(
                BBLeverage.buyCollateral.selector,
                from,
                borrowAmount,
                supplyAmount,
                minAmountOut,
                swapper,
                dexData
            )
        );
        amountOut = abi.decode(result, (uint256));
    }

    function liquidateBadDebt(
        address user,
        address receiver,
        ISwapper swapper,
        bytes calldata collateralToAssetSwapData
    ) external {
        _executeModule(
            Module.Liquidation,
            abi.encodeWithSelector(
                BBLiquidation.liquidateBadDebt.selector,
                user,
                receiver,
                swapper,
                collateralToAssetSwapData
            )
        );
    }

    /// @notice Entry point for liquidations.
    /// @param users An array of user addresses.
    /// @param maxBorrowParts A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user.
    /// @param collateralToAssetSwapDatas Extra swap data
    /// @param swapper Contract address of the `MultiSwapper` implementation.
    function liquidate(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        bytes[] calldata collateralToAssetSwapDatas,
        ISwapper swapper
    ) external {
        _executeModule(
            Module.Liquidation,
            abi.encodeWithSelector(
                BBLiquidation.liquidate.selector,
                users,
                maxBorrowParts,
                collateralToAssetSwapDatas,
                swapper
            )
        );
    }

    function transfer(address, uint256) public pure override returns (bool) {
        revert("BB: not allowed");
    }

    function transferFrom(
        address,
        address,
        uint256
    ) public pure override returns (bool) {
        revert("BB: not allowed");
    }

    // ************************* //
    // *** OWNER FUNCTIONS ***** //
    // ************************* //

    /// @notice rescues unused ETH from the contract
    /// @param amount the amount to rescue
    /// @param to the recipient
    function rescueEth(uint256 amount, address to) external onlyOwner {
        (bool success, ) = to.call{value: amount}("");
        require(success, "BB: transfer failed.");
    }

    /// @notice Transfers fees to penrose
    function refreshPenroseFees()
        external
        onlyOwner
        returns (uint256 feeShares)
    {
        uint256 fees = asset.balanceOf(address(this));
        feeShares = yieldBox.toShare(assetId, fees, false);
        if (feeShares > 0) {
            asset.approve(address(yieldBox), fees);
            yieldBox.depositAsset(
                assetId,
                address(this),
                msg.sender,
                0,
                feeShares
            );
        }
    }

    /// @notice sets BigBang specific configuration
    /// @dev values are updated only if > 0 or not address(0)
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
                require(_minDebtRate < maxDebtRate, "BB: not valid");
                emit MinDebtRateUpdated(minDebtRate, _minDebtRate);
                minDebtRate = _minDebtRate;
            }

            if (_maxDebtRate > 0) {
                require(_maxDebtRate > minDebtRate, "BB: not valid");
                emit MaxDebtRateUpdated(maxDebtRate, _maxDebtRate);
                maxDebtRate = _maxDebtRate;
            }

            if (_debtRateAgainstEthMarket > 0) {
                emit DebtRateAgainstEthUpdated(
                    debtRateAgainstEthMarket,
                    _debtRateAgainstEthMarket
                );
                debtRateAgainstEthMarket = _debtRateAgainstEthMarket;
            }

            if (_liquidationMultiplier > 0) {
                require(
                    _liquidationMultiplier < FEE_PRECISION,
                    "BB: not valid"
                );
                emit LiquidationMultiplierUpdated(
                    liquidationMultiplier,
                    _liquidationMultiplier
                );
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
        if (module == address(0)) {
            revert("BB: module not set");
        }

        return module;
    }

    function _executeModule(
        Module _module,
        bytes memory _data
    ) private returns (bytes memory returnData) {
        bool success = true;
        address module = _extractModule(_module);

        (success, returnData) = module.delegatecall(_data);
        if (!success) {
            revert(_getRevertMsg(returnData));
        }
    }

    receive() external payable {}
}

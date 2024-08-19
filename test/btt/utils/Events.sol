// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

abstract contract Events {
    // ************** //
    // *** MARKET *** //
    // ************** //
   /// @notice event emitted when `leverageExecutor` is updated
    event LeverageExecutorSet(address oldVal, address newVal);
    /// @notice event emitted when `exchangeRate` validation duration is updated
    event ExchangeRateDurationUpdated(uint256 _oldVal, uint256 _newVal);
    /// @notice event emitted when conservator is updated
    event ConservatorUpdated(address old, address _new);
    /// @notice event emitted when cached exchange rate is updated
    event LogExchangeRate(uint256 rate);
    /// @notice event emitted when borrow cap is updated
    event LogBorrowCapUpdated(uint256 _oldVal, uint256 _newVal);
    /// @notice event emitted when oracle data is updated
    event OracleDataUpdated();
    /// @notice event emitted when oracle is updated
    event OracleUpdated(address newAddr);
    /// @notice event emitted when a position is liquidated
    event Liquidated(
        address indexed liquidator,
        address[] users,
        uint256 liquidatorReward,
        uint256 protocolReward,
        uint256 repayedAmount,
        uint256 collateralShareRemoved
    );
    /// @notice event emitted when the liquidation multiplier rate is updated
    event LiquidationMultiplierUpdated(uint256 oldVal, uint256 newVal);
    /// @notice event emitted on setMarketConfig updates
    event ValueUpdated(uint256 valType, uint256 _newVal);
    /// @notice event emitted when then liquidation max slippage is updated
    event LiquidationMaxSlippageUpdated(uint256 oldVal, uint256 newVal);

    // **************** //
    // *** BIG BANG *** //
    // **************** //
    /// @notice event emitted when accrue is called
    event LogAccrue(uint256 indexed accruedAmount, uint64 indexed rate);
    /// @notice event emitted when collateral is added
    event LogAddCollateral(address indexed from, address indexed to, uint256 indexed share);
    /// @notice event emitted when collateral is removed
    event LogRemoveCollateral(address indexed from, address indexed to, uint256 indexed share);
    /// @notice event emitted when borrow is performed
    event LogBorrow(address indexed from, address indexed to, uint256 indexed amount, uint256 feeAmount, uint256 part);
    /// @notice event emitted when a repay operation is performed
    event LogRepay(address indexed from, address indexed to, uint256 indexed amount, uint256 part);
    /// @notice event emitted when the minimum debt rate is updated
    event MinDebtRateUpdated(uint256 indexed oldVal, uint256 indexed newVal);
    /// @notice event emitted when the maximum debt rate is updated
    event MaxDebtRateUpdated(uint256 indexed oldVal, uint256 indexed newVal);
    /// @notice event emitted when the debt rate against the main market is updated
    event DebtRateAgainstEthUpdated(uint256 indexed oldVal, uint256 indexed newVal);
    /// @notice event emitted when the asset's Oracle is updated
    event AssetOracleUpdated(address indexed oldVal, address indexed newVal);
    /// @notice event emitted when the asset's Oracle data is updated
    event AssetOracleDataUpdated();
    /// @notice event emitted when min and max mint fees are updated
    event UpdateMinMaxMintFee(uint256 indexed oldMin, uint256 indexed newMin, uint256 indexed oldMax, uint256 newMax);
    /// @notice event emitted when min and max mint range values are updated
    event UpdateMinMaxMintRange(uint256 indexed oldMin, uint256 indexed newMin, uint256 indexed oldMax, uint256 newMax);
    /// @notice event emitted when debt rate helper is updated
    event DebtRateHelperUpdated(address indexed oldVal, address indexed newVal);

    // ******************* //
    // *** SINGULARITY *** //
    // ******************* //
}
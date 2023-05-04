// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./SGLCommon.sol";
import "./SGLLiquidation.sol";
import "./SGLLendingBorrowing.sol";

import "tapioca-periph/contracts/interfaces/ISendFrom.sol";
import "tapioca-sdk/dist/contracts/libraries/LzLib.sol";

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
contract Singularity is SGLCommon {
    using RebaseLibrary for Rebase;

    // ************ //
    // *** VARS *** //
    // ************ //
    /// @notice enum representing each type of module associated with a Singularity market
    /// @dev modules are contracts that holds a portion of the market's logic
    enum Module {
        Base,
        LendingBorrowing,
        Liquidation
    }
    /// @notice returns the liquidation module
    SGLLiquidation public liquidationModule;
    /// @notice returns the lending module
    SGLLendingBorrowing public lendingBorrowingModule;

    /// @notice The init function that acts as a constructor
    function init(bytes calldata data) external onlyOnce {
        (
            address _liquidationModule,
            address _lendingBorrowingModule,
            IPenrose tapiocaBar_,
            IERC20 _asset,
            uint256 _assetId,
            IERC20 _collateral,
            uint256 _collateralId,
            IOracle _oracle,
            uint256 _exchangeRatePrecision
        ) = abi.decode(
                data,
                (
                    address,
                    address,
                    IPenrose,
                    IERC20,
                    uint256,
                    IERC20,
                    uint256,
                    IOracle,
                    uint256
                )
            );

        liquidationModule = SGLLiquidation(_liquidationModule);
        lendingBorrowingModule = SGLLendingBorrowing(_lendingBorrowingModule);
        penrose = tapiocaBar_;
        yieldBox = YieldBox(tapiocaBar_.yieldBox());
        owner = address(penrose);

        require(
            address(_collateral) != address(0) &&
                address(_asset) != address(0) &&
                address(_oracle) != address(0),
            "SGL: bad pair"
        );
        asset = _asset;
        collateral = _collateral;
        assetId = _assetId;
        collateralId = _collateralId;
        oracle = _oracle;

        accrueInfo.interestPerSecond = uint64(STARTING_INTEREST_PER_SECOND); // 1% APR, with 1e18 being 100%

        updateExchangeRate();

        //default fees
        callerFee = 1000; // 1%
        protocolFee = 10000; // 10%
        borrowOpeningFee = 50; // 0.05%

        //liquidation
        liquidationMultiplier = 112000; //12%
        orderBookLiquidationMultiplier = 127000; //27%

        collateralizationRate = 75000;
        lqCollateralizationRate = 25000;
        EXCHANGE_RATE_PRECISION = _exchangeRatePrecision > 0
            ? _exchangeRatePrecision
            : 1e18;

        minLiquidatorReward = 1e3;
        maxLiquidatorReward = 1e4;
        liquidationBonusAmount = 1e4;
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
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
    ) external returns (bool[] memory successes, string[] memory results) {
        successes = new bool[](calls.length);
        results = new string[](calls.length);
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(
                calls[i]
            );
            require(success || !revertOnFail, _getRevertMsg(result));
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
        uint256 share
    ) public {
        _executeModule(
            Module.LendingBorrowing,
            abi.encodeWithSelector(
                SGLLendingBorrowing.addCollateral.selector,
                from,
                to,
                skim,
                share
            )
        );
    }

    /// @notice Removes `share` amount of collateral and transfers it to `to`.
    /// @param from Account to debit collateral from.
    /// @param to The receiver of the shares.
    /// @param share Amount of shares to remove.
    function removeCollateral(address from, address to, uint256 share) public {
        _executeModule(
            Module.LendingBorrowing,
            abi.encodeWithSelector(
                SGLLendingBorrowing.removeCollateral.selector,
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
    ) public returns (uint256 part, uint256 share) {
        bytes memory result = _executeModule(
            Module.LendingBorrowing,
            abi.encodeWithSelector(
                SGLLendingBorrowing.borrow.selector,
                from,
                to,
                amount
            )
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
    ) public returns (uint256 amount) {
        bytes memory result = _executeModule(
            Module.LendingBorrowing,
            abi.encodeWithSelector(
                SGLLendingBorrowing.repay.selector,
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
    /// @param minAmountOut Mininal proceeds required for the sale
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
            Module.LendingBorrowing,
            abi.encodeWithSelector(
                SGLLendingBorrowing.sellCollateral.selector,
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
    /// @param minAmountOut Mininal collateral amount to receive
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
            Module.LendingBorrowing,
            abi.encodeWithSelector(
                SGLLendingBorrowing.buyCollateral.selector,
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

    /// @notice Entry point for liquidations.
    /// @dev Will call `closedLiquidation()` if not LQ exists or no LQ bid avail exists. Otherwise use LQ.
    /// @param users An array of user addresses.
    /// @param maxBorrowParts A one-to-one mapping to `users`, contains maximum (partial) borrow amounts (to liquidate) of the respective user.
    ///        Ignore for `orderBookLiquidation()`
    /// @param swapper Contract address of the `MultiSwapper` implementation. See `setSwapper`.
    ///        Ignore for `orderBookLiquidation()`
    /// @param collateralToAssetSwapData Extra swap data
    ///        Ignore for `orderBookLiquidation()`
    /// @param usdoToBorrowedSwapData Extra swap data
    ///        Ignore for `closedLiquidation()`
    function liquidate(
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        ISwapper swapper,
        bytes calldata collateralToAssetSwapData,
        bytes calldata usdoToBorrowedSwapData
    ) external {
        _executeModule(
            Module.Liquidation,
            abi.encodeWithSelector(
                SGLLiquidation.liquidate.selector,
                users,
                maxBorrowParts,
                swapper,
                collateralToAssetSwapData,
                usdoToBorrowedSwapData
            )
        );
    }

    /// @notice Withdraw the fees accumulated in `accrueInfo.feesEarnedFraction` to the balance of `feeTo`.
    function withdrawFeesEarned() public {
        accrue();
        address _feeTo = penrose.feeTo();
        uint256 _feesEarnedFraction = accrueInfo.feesEarnedFraction;
        balanceOf[_feeTo] += _feesEarnedFraction;
        emit Transfer(address(0), _feeTo, _feesEarnedFraction);
        accrueInfo.feesEarnedFraction = 0;
        emit LogWithdrawFees(_feeTo, _feesEarnedFraction);
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    /// @notice Transfers fees to penrose
    /// @dev can only be called by the owner
    /// @param feeTo fees receiver
    function refreshPenroseFees(
        address feeTo
    ) external onlyOwner notPaused returns (uint256 feeShares) {
        if (accrueInfo.feesEarnedFraction > 0) {
            withdrawFeesEarned();
        }

        feeShares = _removeAsset(feeTo, msg.sender, balanceOf[feeTo], false);
    }

    /// @notice sets the collateralization rate used for LiquidationQueue type liquidations
    /// @dev can only be called by the owner
    /// @param _val the new value
    function setLqCollateralizationRate(uint256 _val) external onlyOwner {
        require(_val <= COLLATERALIZATION_RATE_PRECISION, "SGL: not valid");
        lqCollateralizationRate = _val;
    }

    /// @notice sets the liquidation multiplier
    /// @dev can only be called by the owner
    /// @param _val the new value
    function setLiquidationMultiplier(uint256 _val) external onlyOwner {
        liquidationMultiplier = _val;
    }

    /// @notice sets the order book multiplier
    /// @dev can only be called by the owner
    /// @param _val the new value
    function setOrderBookLiquidationMultiplier(
        uint256 _val
    ) external onlyOwner {
        orderBookLiquidationMultiplier = _val;
    }

    /// @notice sets the borrowing opening fee
    /// @dev can only be called by the owner
    /// @param _val the new value
    function setBorrowOpeningFee(uint256 _val) external onlyOwner {
        require(_val <= FEE_PRECISION, "SGL: not valid");
        borrowOpeningFee = _val;
    }

    /// @notice Set a new LiquidationQueue.
    /// @param _liquidationQueue The address of the new LiquidationQueue contract.
    function setLiquidationQueue(
        ILiquidationQueue _liquidationQueue
    ) public onlyOwner {
        require(_liquidationQueue.onlyOnce(), "SGL: LQ not initalized");
        liquidationQueue = _liquidationQueue;
    }

    /// @notice Execute an only owner function inside of the LiquidationQueue
    /// @param _swapper the new swapper address
    function updateLQExecutionSwapper(address _swapper) external onlyOwner {
        liquidationQueue.setBidExecutionSwapper(_swapper);
    }

    /// @notice Execute an only owner function inside of the LiquidationQueue
    /// @param _swapper the new swapper address
    function updateLQUsdoSwapper(address _swapper) external onlyOwner {
        liquidationQueue.setUsdoSwapper(_swapper);
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _extractModule(Module _module) private view returns (address) {
        address module;
        if (_module == Module.LendingBorrowing) {
            module = address(lendingBorrowingModule);
        } else if (_module == Module.Liquidation) {
            module = address(liquidationModule);
        }
        if (module == address(0)) {
            revert("SGL: module not set");
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

    function _executeViewModule(
        Module _module,
        bytes memory _data
    ) private view returns (bytes memory returnData) {
        bool success = true;
        address module = _extractModule(_module);

        (success, returnData) = module.staticcall(_data);
        if (!success) {
            revert(_getRevertMsg(returnData));
        }
    }

    receive() external payable {}
}

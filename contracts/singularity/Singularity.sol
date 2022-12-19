// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './SGLCommon.sol';
import './SGLLiquidation.sol';
import './SGLLendingBorrowing.sol';

import '../singularity/interfaces/ISendFrom.sol';

import 'hardhat/console.sol';

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
            IOracle _oracle
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
                    IOracle
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
            'SGL: bad pair'
        );
        asset = _asset;
        collateral = _collateral;
        assetId = _assetId;
        collateralId = _collateralId;
        oracle = _oracle;

        accrueInfo.interestPerSecond = uint64(STARTING_INTEREST_PER_SECOND); // 1% APR, with 1e18 being 100%

        updateExchangeRate();
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice returns Total yieldBox shares for user
    /// @param _user The user to check shares for
    /// @param _assetId The asset id to check shares for
    function yieldBoxShares(address _user, uint256 _assetId)
        external
        view
        returns (uint256)
    {
        return
            yieldBox.balanceOf(_user, _assetId) +
            _yieldBoxShares[_user][_assetId];
    }

    /// @notice Return the amount of collateral for a `user` to be solvent. Returns 0 if user already solvent.
    /// @dev We use a `CLOSED_COLLATERIZATION_RATE` that is a safety buffer when making the user solvent again,
    ///      To prevent from being liquidated. This function is valid only if user is not solvent by `_isSolvent()`.
    /// @param user The user to check solvency.
    /// @param _exchangeRate The exchange rate asset/collateral.
    /// @return amountToSolvency The amount of collateral to be solvent.
    function computeAssetAmountToSolvency(address user, uint256 _exchangeRate)
        public
        view
        returns (uint256 amountToSolvency)
    {
        bytes memory result = _executeViewModule(
            Module.Liquidation,
            abi.encodeWithSelector(
                SGLLiquidation.computeAssetAmountToSolvency.selector,
                user,
                _exchangeRate
            )
        );
        amountToSolvency = abi.decode(result, (uint256));
    }

    /// @notice Calculate the collateral amount off the shares.
    /// @param share The shares.
    /// @return amount The amount.
    function getCollateralAmountForShare(uint256 share)
        public
        view
        returns (uint256 amount)
    {
        return _getCollateralAmountForShare(share);
    }

    /// @notice Calculate the collateral shares that are needed for `borrowPart`,
    /// taking the current exchange rate into account.
    /// @param borrowPart The borrow part.
    /// @return collateralShares The collateral shares.
    function getCollateralSharesForBorrowPart(uint256 borrowPart)
        public
        view
        returns (uint256 collateralShares)
    {
        return _getCollateralSharesForBorrowPart(borrowPart);
    }

    /// @notice Compute the amount of `singularity.assetId` from `fraction`
    /// `fraction` can be `singularity.accrueInfo.feeFraction` or `singularity.balanceOf`
    /// @param fraction The fraction.
    /// @return amount The amount.
    function getAmountForAssetFraction(uint256 fraction)
        public
        view
        returns (uint256 amount)
    {
        return _getAmountForAssetFraction(fraction);
    }

    /// @notice Return the equivalent of borrow part in asset amount.
    /// @param borrowPart The amount of borrow part to convert.
    /// @return amount The equivalent of borrow part in asset amount.
    function getAmountForBorrowPart(uint256 borrowPart)
        public
        view
        returns (uint256 amount)
    {
        return _getAmountForBorrowPart(borrowPart);
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /// @notice Allows batched call to Singularity.
    /// @param calls An array encoded call data.
    /// @param revertOnFail If True then reverts after a failed call and stops doing further calls.
    function execute(bytes[] calldata calls, bool revertOnFail)
        external
        returns (bool[] memory successes, string[] memory results)
    {
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
    function removeCollateral(
        address from,
        address to,
        uint256 share
    ) public {
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

    /// @notice Flashloan ability.
    /// @dev The contract expect the `borrower` to have at the end of `onFlashLoan` `amount` + the incurred fees.
    /// The borrower is expected to `approve()` yieldBox for this number at the end of its `onFlashLoan()`.
    /// @param borrower The address of the contract that implements and conforms to `IFlashBorrower` and handles the flashloan.
    /// @param receiver Address of the token receiver.
    /// @param amount of the tokens to receive.
    /// @param data The calldata to pass to the `borrower` contract.
    function flashLoan(
        IFlashBorrower borrower,
        address receiver,
        uint256 amount,
        bytes memory data
    ) public {
        _executeModule(
            Module.LendingBorrowing,
            abi.encodeWithSelector(
                SGLLendingBorrowing.flashLoan.selector,
                borrower,
                receiver,
                amount,
                data
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

    /// @notice Withdraw the balance of `feeTo`, swap asset into TAP and deposit it to yieldBox of `feeTo`
    function depositFeesToYieldBox(
        ISwapper swapper,
        IPenrose.SwapData calldata swapData
    ) public {
        if (accrueInfo.feesEarnedFraction > 0) {
            withdrawFeesEarned();
        }
        require(penrose.swappers(swapper), 'SGL: Invalid swapper');
        address _feeTo = penrose.feeTo();
        address _feeVeTap = penrose.feeVeTap();

        uint256 feeShares = _removeAsset(
            _feeTo,
            address(this),
            balanceOf[_feeTo],
            false
        );
        if (feeShares == 0) return;

        yieldBox.transfer(address(this), address(swapper), assetId, feeShares);

        (uint256 ethAmount, ) = swapper.swap(
            assetId,
            collateralId,
            feeShares,
            _feeVeTap,
            swapData.minAssetAmount,
            abi.encode(_assetToCollateralSwapPath())
        );

        emit LogYieldBoxFeesDeposit(feeShares, ethAmount);
    }

    /// @notice Withdraw to another layer
    function withdrawTo(
        uint16 dstChainId,
        bytes memory receiver,
        uint256 amount,
        bytes calldata adapterParams,
        address payable refundAddress
    ) public payable {
        try
            IERC165(address(asset)).supportsInterface(
                type(ISendFrom).interfaceId
            )
        {} catch {
            return;
        }

        uint256 available = yieldBox.toAmount(
            assetId,
            yieldBox.balanceOf(msg.sender, assetId),
            false
        );
        require(available >= amount, 'SGL: not available');

        yieldBox.withdraw(assetId, msg.sender, address(this), amount, 0);
        ISendFrom(address(asset)).sendFrom{value: msg.value}(
            address(this),
            dstChainId,
            receiver,
            amount,
            refundAddress,
            msg.sender,
            adapterParams
        );
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    /// @notice Set a new LiquidationQueue.
    /// @param _liquidationQueue The address of the new LiquidationQueue contract.
    function setLiquidationQueue(ILiquidationQueue _liquidationQueue)
        public
        onlyOwner
    {
        require(_liquidationQueue.onlyOnce(), 'SGL: LQ not initalized');
        liquidationQueue = _liquidationQueue;
    }

    /// @notice Execute an only owner function inside of the LiquidationQueue
    function updateLQExecutionSwapper(address _swapper) external onlyOwner {
        liquidationQueue.setBidExecutionSwapper(_swapper);
    }

    /// @notice Execute an only owner function inside of the LiquidationQueue
    function updateLQUsdoSwapper(address _swapper) external onlyOwner {
        liquidationQueue.setUsdoSwapper(_swapper);
    }

    /// @notice sets max borrowable amount
    function setBorrowCap(uint256 _cap) external onlyOwner {
        emit LogBorrowCapUpdated(totalBorrowCap, _cap);
        totalBorrowCap = _cap;
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //

    function _getRevertMsg(bytes memory _returnData)
        private
        pure
        returns (string memory)
    {
        // If the _res length is less than 68, then the transaction failed silently (without a revert message)
        if (_returnData.length < 68) return 'SGL: no return data';
        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        return abi.decode(_returnData, (string)); // All that remains is the revert string
    }

    function _executeModule(Module _module, bytes memory _data)
        private
        returns (bytes memory returnData)
    {
        address module;
        bool success = true;

        if (_module == Module.LendingBorrowing) {
            module = address(lendingBorrowingModule);
        } else if (_module == Module.Liquidation) {
            module = address(liquidationModule);
        }

        if (module == address(0)) {
            revert('SGL: module not set');
        }

        (success, returnData) = module.delegatecall(_data);
        if (!success) {
            revert(_getRevertMsg(returnData));
        }
    }

    function _executeViewModule(Module _module, bytes memory _data)
        private
        view
        returns (bytes memory returnData)
    {
        address module;
        bool success = true;

        if (_module == Module.LendingBorrowing) {
            module = address(lendingBorrowingModule);
        } else if (_module == Module.Liquidation) {
            module = address(liquidationModule);
        }

        if (module == address(0)) {
            revert('SGL: module not set');
        }

        (success, returnData) = module.staticcall(_data);
        if (!success) {
            revert(_getRevertMsg(returnData));
        }
    }
}

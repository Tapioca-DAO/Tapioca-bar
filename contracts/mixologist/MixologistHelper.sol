// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/ERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol';

import './interfaces/IMixologist.sol';
import '../../yieldbox/contracts/YieldBox.sol';

/// @title Useful helper functions for `Mixologist`.
contract MixologistHelper {
    using RebaseLibrary for Rebase;

    struct MarketInfo {
        address collateral;
        address asset;
        IOracle oracle;
        bytes oracleData;
        uint256 totalCollateralShare;
        uint256 userCollateralShare;
        Rebase totalAsset;
        uint256 userAssetFraction;
        Rebase totalBorrow;
        uint256 userBorrowPart;
        uint256 currentExchangeRate;
        uint256 spotExchangeRate;
        uint256 oracleExchangeRate;
        IMixologist.AccrueInfo accrueInfo;
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    function marketsInfo(address who, IMixologist[] memory markets)
        external
        view
        returns (MarketInfo[] memory)
    {
        uint256 len = markets.length;
        MarketInfo[] memory result = new MarketInfo[](len);

        Rebase memory _totalAsset;
        Rebase memory _totalBorrowed;
        IMixologist.AccrueInfo memory _accrueInfo;
        for (uint256 i = 0; i < len; i++) {
            IMixologist mx = markets[i];

            result[i].collateral = mx.collateral();
            result[i].asset = mx.asset();
            result[i].oracle = mx.oracle();
            result[i].oracleData = mx.oracleData();
            result[i].totalCollateralShare = mx.totalCollateralShare();
            result[i].userCollateralShare = mx.userCollateralShare(who);
            (uint128 totalAssetElastic, uint128 totalAssetBase) = mx
                .totalAsset();
            _totalAsset = Rebase(totalAssetElastic, totalAssetBase);
            result[i].totalAsset = _totalAsset;
            result[i].userAssetFraction = mx.balanceOf(who);
            (uint128 totalBorrowElastic, uint128 totalBorrowBase) = mx
                .totalBorrow();
            _totalBorrowed = Rebase(totalBorrowElastic, totalBorrowBase);
            result[i].totalBorrow = _totalBorrowed;
            result[i].userBorrowPart = mx.userBorrowPart(who);

            result[i].currentExchangeRate = mx.exchangeRate();
            (, result[i].oracleExchangeRate) = mx.oracle().peek(
                mx.oracleData()
            );
            result[i].spotExchangeRate = mx.oracle().peekSpot(mx.oracleData());
            (
                uint64 interestPerSecond,
                uint64 lastBlockAccrued,
                uint128 feesEarnedFraction
            ) = mx.accrueInfo();
            _accrueInfo = IMixologist.AccrueInfo(
                interestPerSecond,
                lastBlockAccrued,
                feesEarnedFraction
            );
            result[i].accrueInfo = _accrueInfo;
        }

        return result;
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice deposits asset to YieldBox and lends it to Mixologist
    /// @param mixologist the mixologist address
    /// @param _amount the amount to lend
    function depositAndAddAsset(IMixologist mixologist, uint256 _amount)
        external
    {
        uint256 assetId = mixologist.assetId();
        YieldBox yieldBox = YieldBox(mixologist.yieldBox());

        (, address assetAddress, , ) = yieldBox.assets(assetId);
        _extractTokens(assetAddress, _amount);

        //deposit into the yieldbox
        uint256 _share = yieldBox.toShare(assetId, _amount, false);
        IERC20(assetAddress).approve(address(yieldBox), _amount);
        yieldBox.depositAsset(assetId, address(this), address(this), 0, _share);

        //add asset
        _setApprovalForYieldBox(mixologist, yieldBox);
        mixologist.addAsset(address(this), msg.sender, false, _share);
    }

    /// @notice deposts collateral to YieldBox, adds collateral to Mixologist, borrows and can withdraw to personal address
    /// @param mixologist the mixologist address
    /// @param _collateralAmount the collateral amount to add
    /// @param _borrowAmount the amount to borrow
    /// @param withdraw_ if true, withdraws from YieldBox to `msg.sender`
    /// @param _withdrawData custom withdraw data; ignore if you need to withdraw on the same chain
    function depositAddCollateralAndBorrow(
        IMixologist mixologist,
        uint256 _collateralAmount,
        uint256 _borrowAmount,
        bool withdraw_,
        bytes calldata _withdrawData
    ) external payable {
        YieldBox yieldBox = YieldBox(mixologist.yieldBox());

        uint256 collateralId = mixologist.collateralId();

        (, address collateralAddress, , ) = yieldBox.assets(collateralId);
        _extractTokens(collateralAddress, _collateralAmount);

        //deposit into the yieldbox
        uint256 _share = yieldBox.toShare(
            collateralId,
            _collateralAmount,
            false
        );
        IERC20(collateralAddress).approve(address(yieldBox), _collateralAmount);
        yieldBox.depositAsset(
            collateralId,
            address(this),
            address(this),
            0,
            _share
        );

        //add collateral
        _setApprovalForYieldBox(mixologist, yieldBox);
        mixologist.addCollateral(address(this), msg.sender, false, _share);

        //borrow
        address borrowReceiver = withdraw_ ? address(this) : msg.sender;
        mixologist.borrow(msg.sender, borrowReceiver, _borrowAmount);

        if (withdraw_) {
            _withdraw(_withdrawData, mixologist, yieldBox, _borrowAmount);
        }
    }

    /// @notice deposits to YieldBox and repays borrowed amount
    /// @param mixologist the mixologist address
    /// @param _depositAmount the amount to deposit
    /// @param _repayAmount the amount to be repayed
    function depositAndRepay(
        IMixologist mixologist,
        uint256 _depositAmount,
        uint256 _repayAmount
    ) public {
        uint256 assetId = mixologist.assetId();
        YieldBox yieldBox = YieldBox(mixologist.yieldBox());

        (, address assetAddress, , ) = yieldBox.assets(assetId);
        _extractTokens(assetAddress, _depositAmount);

        //deposit into the yieldbox
        IERC20(assetAddress).approve(address(yieldBox), _depositAmount);
        yieldBox.depositAsset(
            assetId,
            address(this),
            address(this),
            _depositAmount,
            0
        );

        //repay
        _setApprovalForYieldBox(mixologist, yieldBox);
        mixologist.repay(address(this), msg.sender, false, _repayAmount);
    }

    /// @notice deposits to YieldBox, repays borrowed amount and removes collateral
    /// @param mixologist the mixologist address
    /// @param _depositAmount the amount to deposit
    /// @param _repayAmount the amount to be repayed
    /// @param _collateralAmount collateral amount to be removed
    /// @param withdraw_ if true withdraws to sender address
    function depositRepayAndRemoveCollateral(
        IMixologist mixologist,
        uint256 _depositAmount,
        uint256 _repayAmount,
        uint256 _collateralAmount,
        bool withdraw_
    ) external {
        YieldBox yieldBox = YieldBox(mixologist.yieldBox());

        depositAndRepay(mixologist, _depositAmount, _repayAmount);

        //remove collateral
        address receiver = withdraw_ ? address(this) : msg.sender;
        uint256 collateralShare = yieldBox.toShare(
            mixologist.collateralId(),
            _collateralAmount,
            false
        );
        mixologist.removeCollateral(msg.sender, receiver, collateralShare);

        //withdraw
        if (withdraw_) {
            yieldBox.withdraw(
                mixologist.collateralId(),
                address(this),
                msg.sender,
                _collateralAmount,
                0
            );
        }
    }

    // ************************** //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _withdraw(
        bytes calldata _withdrawData,
        IMixologist mixologist,
        YieldBox yieldBox,
        uint256 _amount
    ) private {
        bool _otherChain;
        uint16 _destChain;
        bytes memory _receiver;
        bytes memory _adapterParams;
        if (_withdrawData.length > 0) {
            (_otherChain, _destChain, _receiver, _adapterParams) = abi.decode(
                _withdrawData,
                (bool, uint16, bytes, bytes)
            );
        }
        if (!_otherChain) {
            yieldBox.withdraw(
                mixologist.assetId(),
                address(this),
                msg.sender,
                _amount,
                0
            );
            return;
        }

        mixologist.withdrawTo{value: msg.value}(
            _destChain,
            _receiver,
            _amount,
            _adapterParams,
            payable(msg.sender)
        );
    }

    function _setApprovalForYieldBox(IMixologist mixologist, YieldBox yieldBox)
        private
    {
        bool isApproved = yieldBox.isApprovedForAll(
            address(this),
            address(mixologist)
        );
        if (!isApproved) {
            yieldBox.setApprovalForAll(address(mixologist), true);
        }
        isApproved = yieldBox.isApprovedForAll(
            address(this),
            address(mixologist)
        );
    }

    function _extractTokens(address _token, uint256 _amount) private {
        require(
            ERC20(_token).transferFrom(msg.sender, address(this), _amount),
            'transfer failed'
        );
    }
}

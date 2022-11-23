// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@boringcrypto/boring-solidity/contracts/ERC20.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol';

import './interfaces/ISingularity.sol';
import '../../yieldbox/contracts/YieldBox.sol';

/// @title Useful helper functions for `Singularity`.
contract SingularityHelper {
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
        ISingularity.AccrueInfo accrueInfo;
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    function marketsInfo(address who, ISingularity[] memory markets)
        external
        view
        returns (MarketInfo[] memory)
    {
        uint256 len = markets.length;
        MarketInfo[] memory result = new MarketInfo[](len);

        Rebase memory _totalAsset;
        Rebase memory _totalBorrowed;
        ISingularity.AccrueInfo memory _accrueInfo;
        for (uint256 i = 0; i < len; i++) {
            ISingularity sgl = markets[i];

            result[i].collateral = sgl.collateral();
            result[i].asset = sgl.asset();
            result[i].oracle = sgl.oracle();
            result[i].oracleData = sgl.oracleData();
            result[i].totalCollateralShare = sgl.totalCollateralShare();
            result[i].userCollateralShare = sgl.userCollateralShare(who);
            (uint128 totalAssetElastic, uint128 totalAssetBase) = sgl
                .totalAsset();
            _totalAsset = Rebase(totalAssetElastic, totalAssetBase);
            result[i].totalAsset = _totalAsset;
            result[i].userAssetFraction = sgl.balanceOf(who);
            (uint128 totalBorrowElastic, uint128 totalBorrowBase) = sgl
                .totalBorrow();
            _totalBorrowed = Rebase(totalBorrowElastic, totalBorrowBase);
            result[i].totalBorrow = _totalBorrowed;
            result[i].userBorrowPart = sgl.userBorrowPart(who);

            result[i].currentExchangeRate = sgl.exchangeRate();
            (, result[i].oracleExchangeRate) = sgl.oracle().peek(
                sgl.oracleData()
            );
            result[i].spotExchangeRate = sgl.oracle().peekSpot(
                sgl.oracleData()
            );
            (
                uint64 interestPerSecond,
                uint64 lastBlockAccrued,
                uint128 feesEarnedFraction
            ) = sgl.accrueInfo();
            _accrueInfo = ISingularity.AccrueInfo(
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

    /// @notice deposits asset to YieldBox and lends it to Singularity
    /// @param singularity the singularity address
    /// @param _amount the amount to lend
    function depositAndAddAsset(ISingularity singularity, uint256 _amount)
        external
    {
        uint256 assetId = singularity.assetId();
        YieldBox yieldBox = YieldBox(singularity.yieldBox());

        (, address assetAddress, , ) = yieldBox.assets(assetId);
        _extractTokens(assetAddress, _amount);

        //deposit into the yieldbox
        uint256 _share = yieldBox.toShare(assetId, _amount, false);
        IERC20(assetAddress).approve(address(yieldBox), _amount);
        yieldBox.depositAsset(assetId, address(this), address(this), 0, _share);

        //add asset
        _setApprovalForYieldBox(singularity, yieldBox);
        singularity.addAsset(address(this), msg.sender, false, _share);
    }

    /// @notice deposts collateral to YieldBox, adds collateral to Singularity, borrows and can withdraw to personal address
    /// @param singularity the singularity address
    /// @param _collateralAmount the collateral amount to add
    /// @param _borrowAmount the amount to borrow
    /// @param withdraw_ if true, withdraws from YieldBox to `msg.sender`
    /// @param _withdrawData custom withdraw data; ignore if you need to withdraw on the same chain
    function depositAddCollateralAndBorrow(
        ISingularity singularity,
        uint256 _collateralAmount,
        uint256 _borrowAmount,
        bool withdraw_,
        bytes calldata _withdrawData
    ) external payable {
        YieldBox yieldBox = YieldBox(singularity.yieldBox());

        uint256 collateralId = singularity.collateralId();

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
        _setApprovalForYieldBox(singularity, yieldBox);
        singularity.addCollateral(address(this), msg.sender, false, _share);

        //borrow
        address borrowReceiver = withdraw_ ? address(this) : msg.sender;
        singularity.borrow(msg.sender, borrowReceiver, _borrowAmount);

        if (withdraw_) {
            _withdraw(_withdrawData, singularity, yieldBox, _borrowAmount);
        }
    }

    /// @notice deposits to YieldBox and repays borrowed amount
    /// @param singularity the singularity address
    /// @param _depositAmount the amount to deposit
    /// @param _repayAmount the amount to be repayed
    function depositAndRepay(
        ISingularity singularity,
        uint256 _depositAmount,
        uint256 _repayAmount
    ) public {
        uint256 assetId = singularity.assetId();
        YieldBox yieldBox = YieldBox(singularity.yieldBox());

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
        _setApprovalForYieldBox(singularity, yieldBox);
        singularity.repay(address(this), msg.sender, false, _repayAmount);
    }

    /// @notice deposits to YieldBox, repays borrowed amount and removes collateral
    /// @param singularity the singularity address
    /// @param _depositAmount the amount to deposit
    /// @param _repayAmount the amount to be repayed
    /// @param _collateralAmount collateral amount to be removed
    /// @param withdraw_ if true withdraws to sender address
    function depositRepayAndRemoveCollateral(
        ISingularity singularity,
        uint256 _depositAmount,
        uint256 _repayAmount,
        uint256 _collateralAmount,
        bool withdraw_
    ) external {
        YieldBox yieldBox = YieldBox(singularity.yieldBox());

        depositAndRepay(singularity, _depositAmount, _repayAmount);

        //remove collateral
        address receiver = withdraw_ ? address(this) : msg.sender;
        uint256 collateralShare = yieldBox.toShare(
            singularity.collateralId(),
            _collateralAmount,
            false
        );
        singularity.removeCollateral(msg.sender, receiver, collateralShare);

        //withdraw
        if (withdraw_) {
            yieldBox.withdraw(
                singularity.collateralId(),
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
        ISingularity singularity,
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
                singularity.assetId(),
                address(this),
                msg.sender,
                _amount,
                0
            );
            return;
        }

        singularity.withdrawTo{value: msg.value}(
            _destChain,
            _receiver,
            _amount,
            _adapterParams,
            payable(msg.sender)
        );
    }

    function _setApprovalForYieldBox(ISingularity singularity, YieldBox yieldBox)
        private
    {
        bool isApproved = yieldBox.isApprovedForAll(
            address(this),
            address(singularity)
        );
        if (!isApproved) {
            yieldBox.setApprovalForAll(address(singularity), true);
        }
        isApproved = yieldBox.isApprovedForAll(
            address(this),
            address(singularity)
        );
    }

    function _extractTokens(address _token, uint256 _amount) private {
        require(
            ERC20(_token).transferFrom(msg.sender, address(this), _amount),
            'transfer failed'
        );
    }
}

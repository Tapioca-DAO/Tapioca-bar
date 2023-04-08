// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@boringcrypto/boring-solidity/contracts/ERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";

import "./interfaces/IMarket.sol";
import "./interfaces/IOracle.sol";
import "./usd0/interfaces/IBigBang.sol";
import "./singularity/interfaces/ISingularity.sol";
import "tapioca-sdk/dist/contracts/YieldBox/contracts/YieldBox.sol";
import "tapioca-sdk/dist/contracts/libraries/LzLib.sol";

/// @title Useful helper functions for `Singularity` and `BingBang`
contract MarketsHelper {
    using RebaseLibrary for Rebase;

    struct MarketInfo {
        address collateral;
        uint256 collateralId;
        address asset;
        uint256 assetId;
        IOracle oracle;
        bytes oracleData;
        uint256 totalCollateralShare;
        uint256 userCollateralShare;
        Rebase totalBorrow;
        uint256 userBorrowPart;
        uint256 currentExchangeRate;
        uint256 spotExchangeRate;
        uint256 oracleExchangeRate;
        uint256 totalBorrowCap;
    }
    struct SingularityInfo {
        MarketInfo market;
        Rebase totalAsset;
        uint256 userAssetFraction;
        ISingularity.AccrueInfo accrueInfo;
    }
    struct BigBangInfo {
        MarketInfo market;
        IBigBang.AccrueInfo accrueInfo;
    }

    function singularityMarketInfo(
        address who,
        ISingularity[] memory markets
    ) external view returns (SingularityInfo[] memory) {
        uint256 len = markets.length;
        SingularityInfo[] memory result = new SingularityInfo[](len);

        Rebase memory _totalAsset;
        ISingularity.AccrueInfo memory _accrueInfo;
        for (uint256 i = 0; i < len; i++) {
            ISingularity sgl = markets[i];

            result[i].market = _commonInfo(who, IMarket(address(sgl)));

            (uint128 totalAssetElastic, uint128 totalAssetBase) = sgl //
                .totalAsset(); //
            _totalAsset = Rebase(totalAssetElastic, totalAssetBase); //
            result[i].totalAsset = _totalAsset; //
            result[i].userAssetFraction = sgl.balanceOf(who); //

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

    function bigBangMarketInfo(
        address who,
        IBigBang[] memory markets
    ) external view returns (BigBangInfo[] memory) {
        uint256 len = markets.length;
        BigBangInfo[] memory result = new BigBangInfo[](len);

        IBigBang.AccrueInfo memory _accrueInfo;
        for (uint256 i = 0; i < len; i++) {
            IBigBang bigBang = markets[i];
            result[i].market = _commonInfo(who, IMarket(address(bigBang)));

            (uint64 debtRate, uint64 lastAccrued) = bigBang.accrueInfo();
            _accrueInfo = IBigBang.AccrueInfo(debtRate, lastAccrued);
            result[i].accrueInfo = _accrueInfo;
        }

        return result;
    }

    /// @notice Calculate the collateral amount off the shares.
    /// @param market the Singularity or BigBang address
    /// @param share The shares.
    /// @return amount The amount.
    function getCollateralAmountForShare(
        IMarket market,
        uint256 share
    ) public view returns (uint256 amount) {
        IYieldBox yieldBox = IYieldBox(market.yieldBox());
        return yieldBox.toAmount(market.collateralId(), share, false);
    }

    /// @notice Calculate the collateral shares that are needed for `borrowPart`,
    /// taking the current exchange rate into account.
    /// @param market the Singularity or BigBang address
    /// @param borrowPart The borrow part.
    /// @return collateralShares The collateral shares.
    function getCollateralSharesForBorrowPart(
        IMarket market,
        uint256 borrowPart,
        uint256 liquidationMultiplierPrecision,
        uint256 exchangeRatePrecision
    ) public view returns (uint256 collateralShares) {
        Rebase memory _totalBorrowed;
        (uint128 totalBorrowElastic, uint128 totalBorrowBase) = market
            .totalBorrow();
        _totalBorrowed = Rebase(totalBorrowElastic, totalBorrowBase);

        IYieldBox yieldBox = IYieldBox(market.yieldBox());
        uint256 borrowAmount = _totalBorrowed.toElastic(borrowPart, false);
        return
            yieldBox.toShare(
                market.collateralId(),
                (borrowAmount *
                    market.liquidationMultiplier() *
                    market.exchangeRate()) /
                    (liquidationMultiplierPrecision * exchangeRatePrecision),
                false
            );
    }

    /// @notice Return the equivalent of borrow part in asset amount.
    /// @param market the Singularity or BigBang address
    /// @param borrowPart The amount of borrow part to convert.
    /// @return amount The equivalent of borrow part in asset amount.
    function getAmountForBorrowPart(
        IMarket market,
        uint256 borrowPart
    ) public view returns (uint256 amount) {
        Rebase memory _totalBorrowed;
        (uint128 totalBorrowElastic, uint128 totalBorrowBase) = market
            .totalBorrow();
        _totalBorrowed = Rebase(totalBorrowElastic, totalBorrowBase);

        return _totalBorrowed.toElastic(borrowPart, false);
    }

    /// @notice Compute the amount of `singularity.assetId` from `fraction`
    /// `fraction` can be `singularity.accrueInfo.feeFraction` or `singularity.balanceOf`
    /// @param singularity the singularity address
    /// @param fraction The fraction.
    /// @return amount The amount.
    function getAmountForAssetFraction(
        ISingularity singularity,
        uint256 fraction
    ) public view returns (uint256 amount) {
        (uint128 totalAssetElastic, uint128 totalAssetBase) = singularity
            .totalAsset();

        IYieldBox yieldBox = IYieldBox(singularity.yieldBox());
        return
            yieldBox.toAmount(
                singularity.assetId(),
                (fraction * totalAssetElastic) / totalAssetBase,
                false
            );
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice deposits collateral to YieldBox, adds collateral to Singularity, borrows and can withdraw to personal address
    /// @param market the Singularity or BigBang address
    /// @param _user the address to deposit from and withdraw to
    /// @param _collateralAmount the collateral amount to add
    /// @param _borrowAmount the amount to borrow
    /// @param extractFromSender extracts tokens either from _user or from msg.sender
    /// @param deposit_ if true, deposits to YieldBox from `msg.sender`
    /// @param withdraw_ if true, withdraws from YieldBox to `msg.sender`
    /// @param _withdrawData custom withdraw data; ignore if you need to withdraw on the same chain
    function depositAddCollateralAndBorrow(
        IMarket market,
        address _user,
        uint256 _collateralAmount,
        uint256 _borrowAmount,
        bool extractFromSender,
        bool deposit_,
        bool withdraw_,
        bytes calldata _withdrawData
    ) external payable {
        YieldBox yieldBox = YieldBox(market.yieldBox());

        uint256 collateralId = market.collateralId();

        (, address collateralAddress, , ) = yieldBox.assets(collateralId);

        //deposit into the yieldbox
        uint256 _share = yieldBox.toShare(
            collateralId,
            _collateralAmount,
            false
        );
        if (deposit_) {
            _extractTokens(
                extractFromSender ? msg.sender : _user,
                collateralAddress,
                _collateralAmount
            );
            IERC20(collateralAddress).approve(
                address(yieldBox),
                _collateralAmount
            );
            yieldBox.depositAsset(
                collateralId,
                address(this),
                address(this),
                0,
                _share
            );
        }

        //add collateral
        _setApprovalForYieldBox(market, yieldBox);
        market.addCollateral(
            deposit_ ? address(this) : _user,
            _user,
            false,
            _share
        );

        //borrow
        address borrowReceiver = withdraw_ ? address(this) : _user;
        market.borrow(_user, borrowReceiver, _borrowAmount);

        if (withdraw_) {
            _withdraw(
                borrowReceiver,
                _withdrawData,
                market,
                yieldBox,
                _borrowAmount,
                0,
                false
            );
        }
    }

    /// @notice deposits to YieldBox and repays borrowed amount
    /// @param market the Singularity or BigBang address
    /// @param _depositAmount the amount to deposit
    /// @param _repayAmount the amount to be repayed
    function depositAndRepay(
        IMarket market,
        uint256 _depositAmount,
        uint256 _repayAmount,
        bool deposit_
    ) public {
        uint256 assetId = market.assetId();
        YieldBox yieldBox = YieldBox(market.yieldBox());

        (, address assetAddress, , ) = yieldBox.assets(assetId);

        //deposit into the yieldbox
        if (deposit_) {
            _extractTokens(msg.sender, assetAddress, _depositAmount);
            IERC20(assetAddress).approve(address(yieldBox), _depositAmount);
            yieldBox.depositAsset(
                assetId,
                address(this),
                address(this),
                _depositAmount,
                0
            );
        }

        //repay
        _setApprovalForYieldBox(market, yieldBox);
        market.repay(
            deposit_ ? address(this) : msg.sender,
            msg.sender,
            false,
            _repayAmount
        );
    }

    /// @notice deposits to YieldBox, repays borrowed amount and removes collateral
    /// @param market the Singularity or BigBang address
    /// @param _depositAmount the amount to deposit
    /// @param _repayAmount the amount to be repayed
    /// @param _collateralAmount collateral amount to be removed
    /// @param deposit_ if true deposits to YieldBox
    /// @param withdraw_ if true withdraws to sender address
    function depositRepayAndRemoveCollateral(
        IMarket market,
        uint256 _depositAmount,
        uint256 _repayAmount,
        uint256 _collateralAmount,
        bool deposit_,
        bool withdraw_
    ) external {
        YieldBox yieldBox = YieldBox(market.yieldBox());

        depositAndRepay(market, _depositAmount, _repayAmount, deposit_);

        //remove collateral
        address receiver = withdraw_ ? address(this) : msg.sender;
        uint256 collateralShare = yieldBox.toShare(
            market.collateralId(),
            _collateralAmount,
            false
        );
        market.removeCollateral(msg.sender, receiver, collateralShare);

        //withdraw
        if (withdraw_) {
            yieldBox.withdraw(
                market.collateralId(),
                address(this),
                msg.sender,
                _collateralAmount,
                0
            );
        }
    }

    /// @notice deposits asset to YieldBox and lends it to Singularity
    /// @param singularity the singularity address
    /// @param _user the address to deposit from and lend to
    /// @param _amount the amount to lend
    function depositAndAddAsset(
        ISingularity singularity,
        address _user,
        uint256 _amount,
        bool deposit_,
        bool extractFromSender
    ) external {
        uint256 assetId = singularity.assetId();
        YieldBox yieldBox = YieldBox(singularity.yieldBox());

        (, address assetAddress, , ) = yieldBox.assets(assetId);

        uint256 _share = yieldBox.toShare(assetId, _amount, false);
        if (deposit_) {
            //deposit into the yieldbox
            _extractTokens(
                extractFromSender ? msg.sender : _user,
                assetAddress,
                _amount
            );
            IERC20(assetAddress).approve(address(yieldBox), _amount);
            yieldBox.depositAsset(
                assetId,
                address(this),
                address(this),
                0,
                _share
            );
        }

        //add asset
        _setApprovalForYieldBox(singularity, yieldBox);
        singularity.addAsset(address(this), _user, false, _share);
    }

    /// @notice deposits asset to YieldBox, mints USDO and lends it to Singularity
    /// @param singularity the Singularity address
    /// @param bingBang the BingBang address
    /// @param _collateralAmount the amount added to BingBang as collateral
    /// @param _borrowAmount the borrowed amount from BingBang
    /// @param deposit_ if true deposits to YieldBox
    function mintAndLend(
        ISingularity singularity,
        IMarket bingBang,
        uint256 _collateralAmount,
        uint256 _borrowAmount,
        bool deposit_
    ) external {
        uint256 collateralId = bingBang.collateralId();
        YieldBox yieldBox = YieldBox(singularity.yieldBox());

        (, address collateralAddress, , ) = yieldBox.assets(collateralId);
        uint256 _share = yieldBox.toShare(
            collateralId,
            _collateralAmount,
            false
        );

        if (deposit_) {
            //deposit to YieldBox
            _extractTokens(msg.sender, collateralAddress, _collateralAmount);
            IERC20(collateralAddress).approve(
                address(yieldBox),
                _collateralAmount
            );
            yieldBox.depositAsset(
                collateralId,
                address(this),
                address(this),
                0,
                _share
            );
        }

        if (_collateralAmount > 0) {
            //add collateral to BingBang
            _setApprovalForYieldBox(bingBang, yieldBox);
            bingBang.addCollateral(address(this), msg.sender, false, _share);
        }

        //borrow from BingBang
        bingBang.borrow(msg.sender, msg.sender, _borrowAmount);

        //lend to Singularity
        uint256 assetId = singularity.assetId();
        uint256 borrowShare = yieldBox.toShare(assetId, _borrowAmount, false);
        _setApprovalForYieldBox(singularity, yieldBox);
        singularity.addAsset(msg.sender, msg.sender, false, borrowShare);
    }

    function removeAssetAndRepay(
        ISingularity singularity,
        IMarket bingBang,
        uint256 _removeShare, //slightly greater than _repayAmount to cover the interest
        uint256 _repayAmount,
        uint256 _collateralShare,
        bool withdraw_,
        bytes calldata withdrawData_
    ) external {
        YieldBox yieldBox = YieldBox(singularity.yieldBox());

        //remove asset
        uint256 bbAssetId = bingBang.assetId();
        uint256 _removeAmount = yieldBox.toAmount(
            bbAssetId,
            _removeShare,
            false
        );
        singularity.removeAsset(msg.sender, address(this), _removeShare);

        //repay
        uint256 repayed = bingBang.repay(
            address(this),
            msg.sender,
            false,
            _repayAmount
        );
        if (repayed < _removeAmount) {
            yieldBox.transfer(
                address(this),
                msg.sender,
                bbAssetId,
                yieldBox.toShare(bbAssetId, _removeAmount - repayed, false)
            );
        }

        //remove collateral
        bingBang.removeCollateral(
            msg.sender,
            withdraw_ ? address(this) : msg.sender,
            _collateralShare
        );

        //withdraw
        if (withdraw_) {
            _withdraw(
                address(this),
                withdrawData_,
                singularity,
                yieldBox,
                0,
                _collateralShare,
                true
            );
        }
    }

    // ************************** //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _commonInfo(
        address who,
        IMarket market
    ) private view returns (MarketInfo memory) {
        Rebase memory _totalBorrowed;
        MarketInfo memory info;

        info.collateral = market.collateral();
        info.asset = market.asset();
        info.oracle = market.oracle();
        info.oracleData = market.oracleData();
        info.totalCollateralShare = market.totalCollateralShare();
        info.userCollateralShare = market.userCollateralShare(who);

        (uint128 totalBorrowElastic, uint128 totalBorrowBase) = market
            .totalBorrow();
        _totalBorrowed = Rebase(totalBorrowElastic, totalBorrowBase);
        info.totalBorrow = _totalBorrowed;
        info.userBorrowPart = market.userBorrowPart(who);

        info.currentExchangeRate = market.exchangeRate();
        (, info.oracleExchangeRate) = market.oracle().peek(market.oracleData());
        info.spotExchangeRate = market.oracle().peekSpot(market.oracleData());
        info.totalBorrowCap = market.totalBorrowCap();
        info.assetId = market.assetId();
        info.collateralId = market.collateralId();
        return info;
    }

    function _withdraw(
        address _from,
        bytes calldata _withdrawData,
        IMarket market,
        YieldBox yieldBox,
        uint256 _amount,
        uint256 _share,
        bool _withdrawCollateral
    ) private {
        bool _otherChain;
        uint16 _destChain;
        bytes32 _receiver;
        bytes memory _adapterParams;
        require(
            _withdrawData.length > 0,
            "MarketHelper: withdrawData is empty"
        );

        (_otherChain, _destChain, _receiver, _adapterParams) = abi.decode(
            _withdrawData,
            (bool, uint16, bytes32, bytes)
        );
        if (!_otherChain) {
            yieldBox.withdraw(
                _withdrawCollateral ? market.collateralId() : market.assetId(),
                address(this),
                LzLib.bytes32ToAddress(_receiver),
                _amount,
                _share
            );
            return;
        }

        market.withdrawTo{
            value: msg.value > 0 ? msg.value : address(this).balance
        }(
            _from,
            _destChain,
            _receiver,
            _amount,
            _adapterParams,
            msg.value > 0 ? payable(msg.sender) : payable(this)
        );
    }

    function _setApprovalForYieldBox(
        IMarket market,
        YieldBox yieldBox
    ) private {
        bool isApproved = yieldBox.isApprovedForAll(
            address(this),
            address(market)
        );
        if (!isApproved) {
            yieldBox.setApprovalForAll(address(market), true);
        }
        isApproved = yieldBox.isApprovedForAll(address(this), address(market));
    }

    function _extractTokens(
        address _from,
        address _token,
        uint256 _amount
    ) private {
        require(
            ERC20(_token).transferFrom(_from, address(this), _amount),
            "transfer failed"
        );
    }

    receive() external payable {}
}

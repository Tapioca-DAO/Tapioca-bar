// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Tapioca
import {ICommonData} from "tapioca-periph/interfaces/common/ICommonData.sol";
import {ISingularity} from "tapioca-periph/interfaces/bar/ISingularity.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {IMagnetar} from "tapioca-periph/interfaces/periph/IMagnetar.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {IMarket} from "tapioca-periph/interfaces/bar/IMarket.sol";

/*
* @dev need this because of via-ir: true error on original Magnetar
**/
contract MagnetarMock {
    using SafeERC20 for IERC20;

    error MagnetarMock_NotAuthorized();
    error MagnetarMock_Failed();

    ICluster public cluster;

    constructor(address _cluster) {
        cluster = ICluster(_cluster);
    }

    function depositRepayAndRemoveCollateralFromMarket(
        IMagnetar.DepositRepayAndRemoveCollateralFromMarketData memory _data
    ) public payable {
        if (!cluster.isWhitelisted(cluster.lzChainId(), address(_data.market))) {
            revert MagnetarMock_NotAuthorized();
        }

        IYieldBox yieldBox = IYieldBox(IMarket(_data.market).yieldBox());

        uint256 assetId = IMarket(_data.market).assetId();
        (, address assetAddress,,) = yieldBox.assets(assetId);

        // deposit to YieldBox
        if (_data.depositAmount > 0) {
            _data.depositAmount =
                _extractTokens(_data.extractFromSender ? msg.sender : _data.user, assetAddress, _data.depositAmount);
            IERC20(assetAddress).approve(address(yieldBox), 0);
            IERC20(assetAddress).approve(address(yieldBox), _data.depositAmount);
            yieldBox.depositAsset(assetId, address(this), address(this), _data.depositAmount, 0);
        }

        // performs a repay operation for the specified market
        if (_data.repayAmount > 0) {
            yieldBox.setApprovalForAll(address(_data.market), true);
            IMarket(_data.market).repay(
                _data.depositAmount > 0 ? address(this) : _data.user, _data.user, false, _data.repayAmount
            );
            yieldBox.setApprovalForAll(address(_data.market), false);
        }

        // performs a removeCollateral operation on the market
        // if `withdrawCollateralParams.withdraw` it uses `withdrawTo` to withdraw collateral on the same chain or to another one
        if (_data.collateralAmount > 0) {
            address collateralWithdrawReceiver = _data.withdrawCollateralParams.withdraw ? address(this) : _data.user;
            uint256 collateralShare =
                yieldBox.toShare(IMarket(_data.market).collateralId(), _data.collateralAmount, false);
            IMarket(_data.market).removeCollateral(_data.user, collateralWithdrawReceiver, collateralShare);
        }
    }

    function mintFromBBAndLendOnSGL(IMagnetar.MintFromBBAndLendOnSGLData memory _data) external payable {
        // Check targets
        if (_data.externalContracts.bigBang != address(0)) {
            if (!cluster.isWhitelisted(cluster.lzChainId(), _data.externalContracts.bigBang)) {
                revert MagnetarMock_NotAuthorized();
            }
        }
        if (_data.externalContracts.singularity != address(0)) {
            if (!cluster.isWhitelisted(cluster.lzChainId(), _data.externalContracts.singularity)) {
                revert MagnetarMock_NotAuthorized();
            }
        }

        IMarket bigBang = IMarket(_data.externalContracts.bigBang);
        ISingularity singularity = ISingularity(_data.externalContracts.singularity);
        IYieldBox yieldBox = IYieldBox(singularity.yieldBox());

        if (address(singularity) != address(0)) {
            yieldBox.setApprovalForAll(address(singularity), true);
        }
        if (address(bigBang) != address(0)) {
            yieldBox.setApprovalForAll(address(bigBang), true);
        }

        // if `depositData.deposit`:
        //      - deposit SGL asset to YB for `_data.user`
        uint256 sglAssetId = singularity.assetId();
        (, address sglAssetAddress,,) = yieldBox.assets(sglAssetId);
        if (_data.depositData.deposit) {
            _data.depositData.amount = _extractTokens(
                _data.depositData.extractFromSender ? msg.sender : _data.user, sglAssetAddress, _data.depositData.amount
            );

            IERC20(sglAssetAddress).approve(address(yieldBox), 0);
            IERC20(sglAssetAddress).approve(address(yieldBox), _data.depositData.amount);
            yieldBox.depositAsset(sglAssetId, address(this), _data.user, _data.depositData.amount, 0);
        }

        // if `lendAmount` > 0:
        //      - add asset to SGL
        uint256 fraction = 0;
        if (_data.lendAmount == 0 && _data.depositData.deposit) {
            _data.lendAmount = _data.depositData.amount;
        }
        if (_data.lendAmount > 0) {
            uint256 lendShare = yieldBox.toShare(sglAssetId, _data.lendAmount, false);
            fraction = singularity.addAsset(_data.user, _data.user, false, lendShare);
        }

        if (address(singularity) != address(0)) {
            yieldBox.setApprovalForAll(address(singularity), false);
        }
        if (address(bigBang) != address(0)) {
            yieldBox.setApprovalForAll(address(bigBang), false);
        }
    }

    function exitPositionAndRemoveCollateral(IMagnetar.ExitPositionAndRemoveCollateralData memory _data)
        external
        payable
    {
        // Check whitelisted
        if (_data.externalData.bigBang != address(0)) {
            if (!cluster.isWhitelisted(cluster.lzChainId(), _data.externalData.bigBang)) {
                revert MagnetarMock_NotAuthorized();
            }
        }
        if (_data.externalData.singularity != address(0)) {
            if (!cluster.isWhitelisted(cluster.lzChainId(), _data.externalData.singularity)) {
                revert MagnetarMock_NotAuthorized();
            }
        }

        IMarket bigBang = IMarket(_data.externalData.bigBang);
        ISingularity singularity = ISingularity(_data.externalData.singularity);
        IYieldBox yieldBox = IYieldBox(singularity.yieldBox());

        uint256 _removeAmount = _data.removeAndRepayData.removeAmount;
        if (_data.removeAndRepayData.removeAssetFromSGL) {
            uint256 _assetId = singularity.assetId();
            uint256 share = yieldBox.toShare(_assetId, _removeAmount, false);

            address removeAssetTo = _data.removeAndRepayData.assetWithdrawData.withdraw
                || _data.removeAndRepayData.repayAssetOnBB ? address(this) : _data.user;

            singularity.removeAsset(_data.user, removeAssetTo, share);
        }

        if (_data.removeAndRepayData.removeCollateralFromBB) {
            uint256 _collateralId = bigBang.collateralId();
            uint256 collateralShare = yieldBox.toShare(_collateralId, _data.removeAndRepayData.collateralAmount, false);
            address removeCollateralTo =
                _data.removeAndRepayData.collateralWithdrawData.withdraw ? address(this) : _data.user;
            bigBang.removeCollateral(_data.user, removeCollateralTo, collateralShare);
        }

        yieldBox.setApprovalForAll(_data.externalData.singularity, false);
    }

    function depositAddCollateralAndBorrowFromMarket(IMagnetar.DepositAddCollateralAndBorrowFromMarketData memory _data)
        external
        payable
    {
        if (!cluster.isWhitelisted(cluster.lzChainId(), address(_data.market))) revert MagnetarMock_NotAuthorized();

        IYieldBox yieldBox = IYieldBox(IMarket(_data.market).yieldBox());

        uint256 collateralId = IMarket(_data.market).collateralId();
        (, address collateralAddress,,) = yieldBox.assets(collateralId);

        uint256 _share = yieldBox.toShare(collateralId, _data.collateralAmount, false);

        //deposit to YieldBox
        if (_data.deposit) {
            // transfers tokens from sender or from the user to this contract
            _data.collateralAmount = _extractTokens(
                _data.extractFromSender ? msg.sender : _data.user, collateralAddress, _data.collateralAmount
            );
            _share = yieldBox.toShare(collateralId, _data.collateralAmount, false);

            // deposit to YieldBox
            IERC20(collateralAddress).approve(address(yieldBox), 0);
            IERC20(collateralAddress).approve(address(yieldBox), _data.collateralAmount);
            yieldBox.depositAsset(collateralId, address(this), address(this), _data.collateralAmount, 0);
        }

        // performs .addCollateral on market
        if (_data.collateralAmount > 0) {
            yieldBox.setApprovalForAll(address(_data.market), true);
            IMarket(_data.market).addCollateral(
                _data.deposit ? address(this) : _data.user, _data.user, false, _data.collateralAmount, _share
            );
        }

        // performs .borrow on market
        // if `withdraw` it uses `withdrawTo` to withdraw assets on the same chain or to another one
        if (_data.borrowAmount > 0) {
            address borrowReceiver = _data.withdrawParams.withdraw ? address(this) : _data.user;
            IMarket(_data.market).borrow(_data.user, borrowReceiver, _data.borrowAmount);

            // if (withdrawParams.withdraw) {
            // bytes memory withdrawAssetBytes = abi.encode(
            //     withdrawParams.withdrawOnOtherChain,
            //     withdrawParams.withdrawLzChainId,
            //     LzLib.addressToBytes32(user),
            //     withdrawParams.withdrawAdapterParams
            // );
            // _withdraw(
            //     borrowReceiver,
            //     withdrawAssetBytes,
            //     market,
            //     yieldBox,
            //     borrowAmount,
            //     false,
            //     valueAmount,
            //     false,
            //     withdrawParams.refundAddress,
            //     withdrawParams.zroPaymentAddress
            // );
            // }
        }

        yieldBox.setApprovalForAll(address(_data.market), false);
    }

    function _extractTokens(address _from, address _token, uint256 _amount) private returns (uint256) {
        uint256 balanceBefore = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransferFrom(_from, address(this), _amount);
        uint256 balanceAfter = IERC20(_token).balanceOf(address(this));
        if (balanceAfter <= balanceBefore) revert MagnetarMock_Failed();
        return balanceAfter - balanceBefore;
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Tapioca
import {
    PrepareLzCallData,
    PrepareLzCallReturn,
    ComposeMsgData
} from "tap-utils/tapiocaOmnichainEngine/extension/TapiocaOmnichainEngineHelper.sol";
import {TapiocaOmnichainEngineHelper} from
    "tap-utils/tapiocaOmnichainEngine/extension/TapiocaOmnichainEngineHelper.sol";
import {MagnetarHelperMock_test} from "./MagnetarHelperMock_test.sol";
import {SafeApprove} from "tap-utils/libraries/SafeApprove.sol";

import {ITapiocaOptionLiquidityProvision} from
    "tap-utils/interfaces/tap-token/ITapiocaOptionLiquidityProvision.sol";
import {ITapiocaOptionBroker} from "tap-utils/interfaces/tap-token/ITapiocaOptionBroker.sol";
import {
    IMagnetar,
    DepositRepayAndRemoveCollateralFromMarketData,
    MintFromBBAndLendOnSGLData,
    ExitPositionAndRemoveCollateralData,
    DepositAddCollateralAndBorrowFromMarketData,
    MagnetarWithdrawData,
    MagnetarCall,
    MagnetarModule,
    MagnetarAction, 
    LockAndParticipateData,
    IRemoveAndRepay,
    ICommonExternalContracts
} from "tap-utils/interfaces/periph/IMagnetar.sol";
import {ITapiocaOmnichainEngine, LZSendParam} from "tap-utils/interfaces/periph/ITapiocaOmnichainEngine.sol";
import {IYieldBox, IYieldBoxTokenType} from "tap-utils/interfaces/yieldbox/IYieldBox.sol";
import {PearlmitHandler, IPearlmit} from "tap-utils/pearlmit/PearlmitHandler.sol";
import {ITapiocaOption} from "tap-utils/interfaces/tap-token/ITapiocaOption.sol";
import {IMagnetarHelper} from "tap-utils/interfaces/periph/IMagnetarHelper.sol";
import {ISingularity, IMarket} from "tap-utils/interfaces/bar/ISingularity.sol";
import {ITapiocaOracle} from "tap-utils/interfaces/periph/ITapiocaOracle.sol";
import {IMarketHelper} from "tap-utils/interfaces/bar/IMarketHelper.sol";
import {ISingularity} from "tap-utils/interfaces/bar/ISingularity.sol";
import {IPermitAll} from "tap-utils/interfaces/common/IPermitAll.sol";
import {IMarket, Module} from "tap-utils/interfaces/bar/IMarket.sol";
import {IOftSender} from "tap-utils/interfaces/oft/IOftSender.sol";
import {ICluster} from "tap-utils/interfaces/periph/ICluster.sol";
import {IPermit} from "tap-utils/interfaces/common/IPermit.sol";
import {IPenrose} from "tap-utils/interfaces/bar/IPenrose.sol";
import {IBigBang} from "tap-utils/interfaces/bar/IBigBang.sol";
import {ITOFT} from "tap-utils/interfaces/oft/ITOFT.sol";


contract MagnetarMockInternal_test is PearlmitHandler {
    using SafeCast for uint256;
    using SafeERC20 for IERC20;
    using SafeApprove for address;

    error MagnetarMock_NotAuthorized(bytes role);
    error Magnetar_NotAuthorized(bytes role);
    error MagnetarMock_Failed();
    error MagnetarMock_TargetNotWhitelisted(address target);
    error MagnetarMock_GasMismatch(uint256 expected, uint256 received);
    error MagnetarMock_UnknownReason();
    error MagnetarMock_ActionNotValid(MagnetarAction action, bytes actionCalldata); // Burst did not find what to execute
    error Magnetar_MarketCallFailed(bytes call);
    error Magnetar_ExtractTokenFail();
    error Magnetar_tOLPTokenMismatch();
    error Magnetar_ActionParamsMismatch();
    error Magnetar_TargetNotWhitelisted(address target);
    error Magnetar__minDiscountOutMismatch(uint128 expected, uint128 received);
    error MagnetarCollateralModule_UnwrapNotAllowed();
    error Magnetar_WithdrawParamsMismatch();
    error Magnetar_TransferFailed();
    error Magnetar_ComposeMsgNotAllowed();

    ICluster public cluster;
    IMagnetarHelper public helper;

    constructor(address _cluster, IPearlmit _pearlmit) PearlmitHandler(_pearlmit) {
        cluster = ICluster(_cluster);
        MagnetarHelperMock_test _helper = new MagnetarHelperMock_test();
        helper = IMagnetarHelper(address(_helper));
    }
    /*
     -------------------- COLLATERAL MODULE -----------------------------
    */
    function _validateDepositAddCollateralAndBorrowFromMarket(DepositAddCollateralAndBorrowFromMarketData memory data)
        internal
        view
    {
        // Check sender
        _checkSender(data.user);

        // Check provided addresses
        _checkExternalData(data.market, data.marketHelper);

        // Check withdraw data
        _checkWithdrawData(data.withdrawParams, data.market);
    }

    function _validateDepositRepayAndRemoveCollateralFromMarketData(
        DepositRepayAndRemoveCollateralFromMarketData memory data
    ) internal view {
        // Check sender
        _checkSender(data.user);

        // Check provided addresses
        _checkExternalData(data.market, data.marketHelper);

        // Check withdraw data
        _checkDepositRepayAndRemoveCollateralFromMarketDataWithdrawData(data.withdrawCollateralParams, data.market);
    }
    function _checkDepositRepayAndRemoveCollateralFromMarketDataWithdrawData(
        MagnetarWithdrawData memory data,
        address market
    ) private view {
        if (data.withdraw) {
            if (data.assetId != IMarket(market)._collateralId()) revert Magnetar_WithdrawParamsMismatch();
            if (data.amount == 0) revert Magnetar_WithdrawParamsMismatch();
        }
    }
    /*
     -------------------- MINT MODULE -----------------------------
    */
    function _validatemintBBLendSGLLockTOLPData(MintFromBBAndLendOnSGLData memory data) internal view {
        // Check sender
        _checkSender(data.user);

        // Check provided addresses
        _checkWhitelisted(data.externalContracts.magnetar, "MAGNETAR_CALLEE");
        _checkWhitelisted(data.externalContracts.singularity, "MAGNETAR_MARKET_CALLEE");
        _checkWhitelisted(data.externalContracts.bigBang, "MAGNETAR_MARKET_CALLEE");
        _checkWhitelisted(data.externalContracts.marketHelper, "MAGNETAR_HELPER_CALLEE");
        _checkWhitelisted(data.lockData.target, "MAGNETAR_TAP_CALLEE");
        _checkWhitelisted(data.lockData.tAsset, "MAGNETAR_TAP_CALLEE");
        _checkWhitelisted(data.participateData.target, "MAGNETAR_TAP_CALLEE");
    }

     function _lockMintModule(MintFromBBAndLendOnSGLData memory data, uint256 fraction, bool participate)
        internal
        returns (uint256 tOLPTokenId)
    {
        IMarket _singularity = IMarket(data.externalContracts.singularity);
        IYieldBox _yieldBox = IYieldBox(_singularity._yieldBox());

        // use requested value
        if (data.lockData.fraction > 0) {
            fraction = data.lockData.fraction;
        }
        if (fraction == 0) revert Magnetar_ActionParamsMismatch();

        // retrieve and deposit SGLAssetId registered in tOLP
        (uint256 tOLPSglAssetId,,,) =
            ITapiocaOptionLiquidityProvision(data.lockData.target).activeSingularities(data.lockData.tAsset);

        // Extract SGL tokens
        fraction = _extractTokens(data.user, data.externalContracts.singularity, fraction);

        // Wrap SGL tokens into tSgl
        IERC20(address(_singularity)).approve(address(pearlmit), fraction);
        pearlmit.approve(
            20, address(_singularity), 0, data.lockData.tAsset, fraction.toUint200(), block.timestamp.toUint48()
        );
        uint256 wrapped = ITOFT(data.lockData.tAsset).wrap(address(this), address(this), fraction);

        // deposit YB and revoke approval
        (, uint256 obtainedShares) = _depositToYb(_yieldBox, address(this), tOLPSglAssetId, wrapped);
        IERC20(address(_singularity)).approve(address(pearlmit), 0);

        data.lockData.amount = obtainedShares.toUint128();
        _pearlmitApprove(address(_yieldBox), tOLPSglAssetId, data.lockData.target, data.lockData.amount);
        tOLPTokenId = ITapiocaOptionLiquidityProvision(data.lockData.target).lock(
            participate ? address(this) : data.user,
            data.lockData.tAsset,
            data.lockData.lockDuration,
            data.lockData.amount
        );
    }

    function _participateMintModule(MintFromBBAndLendOnSGLData memory data, uint256 tOLPTokenId, bool lock) internal {
        // validate token ids
        if (tOLPTokenId == 0 && data.participateData.tOLPTokenId == 0) revert Magnetar_ActionParamsMismatch();
        if (
            data.participateData.tOLPTokenId != tOLPTokenId && tOLPTokenId != 0 && data.participateData.tOLPTokenId != 0
        ) {
            revert Magnetar_tOLPTokenMismatch();
        }

        if (data.participateData.tOLPTokenId != 0) tOLPTokenId = data.participateData.tOLPTokenId;

        // transfer NFT here
        if (!lock) {
            bool isErr = pearlmit.transferFromERC721(data.user, address(this), data.lockData.target, tOLPTokenId);
            if (isErr) revert Magnetar_ExtractTokenFail();
        }

        pearlmit.approve(
            721, data.lockData.target, tOLPTokenId, data.participateData.target, 1, block.timestamp.toUint48()
        );
        IERC721(data.lockData.target).approve(address(pearlmit), tOLPTokenId);
        uint256 oTAPTokenId = ITapiocaOptionBroker(data.participateData.target).participate(tOLPTokenId);

        // Check for the discount slippage
        address oTapAddress = ITapiocaOptionBroker(data.participateData.target).oTAP();
        (, ITapiocaOption.TapOption memory oTapAttributes) = ITapiocaOption(oTapAddress).attributes(oTAPTokenId);
        if (oTapAttributes.discount < data.lockData.minDiscountOut.toUint128()) {
            revert Magnetar__minDiscountOutMismatch(uint128(data.lockData.minDiscountOut), oTapAttributes.discount);
        }

        IERC721(oTapAddress).safeTransferFrom(address(this), data.user, oTAPTokenId);
    }


    function _depositAddCollateralAndMintFromBigBang(MintFromBBAndLendOnSGLData memory data) internal {
        IMarket _bigBang = IMarket(data.externalContracts.bigBang);
        IYieldBox _yieldBox = IYieldBox(_bigBang._yieldBox());

        uint256 bbCollateralId = _bigBang._collateralId();
        uint256 _share = _yieldBox.toShare(bbCollateralId, data.mintData.collateralDepositData.amount, false);

        /**
         * @dev try deposit to YieldBox
         */
        if (data.mintData.collateralDepositData.deposit) {
            (, address bbCollateralAddress,,) = _yieldBox.assets(bbCollateralId);

            data.mintData.collateralDepositData.amount =
                _extractTokens(data.user, bbCollateralAddress, data.mintData.collateralDepositData.amount);
            _depositToYb(_yieldBox, data.user, bbCollateralId, data.mintData.collateralDepositData.amount);
        }

        /**
         * @dev try to add collateral
         *      `data.mintData.collateralDepositData.deposit` might be false and YieldBox deposit is skipped, but
         *          `data.mintData.collateralDepositData.amount` can be > 0, which assumes that an `.addCollateral` operation is performed
         */
        if (data.mintData.collateralDepositData.amount > 0) {
            _marketAddCollateral(_bigBang, data.externalContracts.marketHelper, _share, data.user, data.user);
        }

        /**
         * @dev try borrow from BigBang
         */
        if (data.mintData.mintAmount > 0) {
            uint256 _assetId = _bigBang._assetId();
            _share = _yieldBox.toShare(_assetId, data.mintData.mintAmount, false);

            _pearlmitApprove(address(_yieldBox), _assetId, address(_bigBang), _share);
            _marketBorrow(_bigBang, data.externalContracts.marketHelper, data.mintData.mintAmount, data.user, data.user);
        }
    }

    /*
     -------------------- OPTION MODULE -----------------------------
    */
    function _lockFromOptionModule(LockAndParticipateData memory data) internal returns (uint256 tOLPTokenId) {
        IYieldBox _yieldBox = IYieldBox(data.yieldBox);
        uint256 _fraction = data.lockData.fraction;

        // use requested value
        if (_fraction == 0) revert Magnetar_ActionParamsMismatch();

        // retrieve and deposit SGLAssetId registered in tOLP
        (uint256 tOLPSglAssetId,,,) =
            ITapiocaOptionLiquidityProvision(data.lockData.target).activeSingularities(data.tSglToken);

        _fraction = _extractTokens(data.user, data.tSglToken, _fraction);
        _depositToYb(_yieldBox, address(this), tOLPSglAssetId, _fraction);

        _pearlmitApprove(address(_yieldBox), tOLPSglAssetId, data.lockData.target, data.lockData.amount);
        _yieldBox.setApprovalForAll(address(pearlmit), true);

        tOLPTokenId = ITapiocaOptionLiquidityProvision(data.lockData.target).lock(
            data.participateData.participate ? address(this) : data.user,
            data.tSglToken,
            data.lockData.lockDuration,
            data.lockData.amount
        );

        _yieldBox.setApprovalForAll(address(pearlmit), false);
    }

    function _participateFromOptionModule(LockAndParticipateData memory data, uint256 tOLPTokenId) internal {
        // validate token ids
        if (tOLPTokenId == 0 && data.participateData.tOLPTokenId == 0) revert Magnetar_ActionParamsMismatch();
        if (
            data.participateData.tOLPTokenId != tOLPTokenId && tOLPTokenId != 0 && data.participateData.tOLPTokenId != 0
        ) {
            revert Magnetar_tOLPTokenMismatch();
        }

        if (data.participateData.tOLPTokenId != 0) tOLPTokenId = data.participateData.tOLPTokenId;

        // transfer NFT here in case `_lock` wasn't called
        // otherwise NFT should be already in Magnetar
        if (!data.lockData.lock) {
            bool isErr = pearlmit.transferFromERC721(data.user, address(this), data.lockData.target, tOLPTokenId);
            if (isErr) revert Magnetar_ExtractTokenFail();
        }

        pearlmit.approve(
            721, data.lockData.target, tOLPTokenId, data.participateData.target, 1, block.timestamp.toUint48()
        );
        IERC721(data.lockData.target).approve(address(pearlmit), tOLPTokenId);
        uint256 oTAPTokenId = ITapiocaOptionBroker(data.participateData.target).participate(tOLPTokenId);

        // Check for the discount slippage
        address oTapAddress = ITapiocaOptionBroker(data.participateData.target).oTAP();
        (, ITapiocaOption.TapOption memory oTapAttributes) = ITapiocaOption(oTapAddress).attributes(oTAPTokenId);
        if (oTapAttributes.discount < data.lockData.minDiscountOut.toUint128()) {
            revert Magnetar__minDiscountOutMismatch(uint128(data.lockData.minDiscountOut), oTapAttributes.discount);
        }

        IERC721(oTapAddress).safeTransferFrom(address(this), data.user, oTAPTokenId, "");
    }

    function _exitFromOptionModule(ExitPositionAndRemoveCollateralData memory data) internal returns (uint256 tOLPId) {
        address oTapAddress = ITapiocaOptionBroker(data.removeAndRepayData.exitData.target).oTAP();
        (, ITapiocaOption.TapOption memory oTAPPosition) =
            ITapiocaOption(oTapAddress).attributes(data.removeAndRepayData.exitData.oTAPTokenID);

        tOLPId = oTAPPosition.tOLP;

        // check ownership
        address ownerOfTapTokenId = IERC721(oTapAddress).ownerOf(data.removeAndRepayData.exitData.oTAPTokenID);
        if (ownerOfTapTokenId != data.user && ownerOfTapTokenId != address(this)) {
            revert Magnetar_ActionParamsMismatch();
        }

        // if not owner; get the oTAP token
        if (ownerOfTapTokenId == data.user) {
            bool isErr = pearlmit.transferFromERC721(
                data.user, address(this), oTapAddress, data.removeAndRepayData.exitData.oTAPTokenID
            );
            if (isErr) revert Magnetar_ExtractTokenFail();
        }

        // exit position
        _tOBExit(oTapAddress, data.removeAndRepayData.exitData.target, data.removeAndRepayData.exitData.oTAPTokenID);

        // if not unlock, trasfer tOLP to the user
        if (!data.removeAndRepayData.unlockData.unlock) {
            address tOLPContract = ITapiocaOptionBroker(data.removeAndRepayData.exitData.target).tOLP();

            //transfer tOLP to the data.user
            IERC721(tOLPContract).safeTransferFrom(address(this), data.user, tOLPId, "0x");
        }
    }

    function _unlockFromOptionModule(ExitPositionAndRemoveCollateralData memory data, uint256 tOLPId) internal {
        if (tOLPId == 0 && data.removeAndRepayData.unlockData.tokenId == 0) revert Magnetar_tOLPTokenMismatch();
        if (
            data.removeAndRepayData.unlockData.tokenId != 0 && tOLPId != 0
                && tOLPId != data.removeAndRepayData.unlockData.tokenId
        ) {
            revert Magnetar_tOLPTokenMismatch();
        }

        if (data.removeAndRepayData.unlockData.tokenId != 0) tOLPId = data.removeAndRepayData.unlockData.tokenId;

        // check ownership
        address ownerOfTOLP = IERC721(data.removeAndRepayData.unlockData.target).ownerOf(tOLPId);
        if (ownerOfTOLP != data.user && ownerOfTOLP != address(this)) revert Magnetar_ActionParamsMismatch();

        (uint128 sglAssetId, uint128 ybShares,,) =
            ITapiocaOptionLiquidityProvision(data.removeAndRepayData.unlockData.target).lockPositions(tOLPId);

        // will be sent to `data.user` or `address(this)`
        ITapiocaOptionLiquidityProvision(data.removeAndRepayData.unlockData.target).unlock(
            tOLPId, data.externalData.singularity
        );

        // in case owner is `address(this)`
        //    transfer unlocked position to the user
        if (ownerOfTOLP == address(this)) {
            IYieldBox _yieldBox =
                IYieldBox(ITapiocaOptionLiquidityProvision(data.removeAndRepayData.unlockData.target).yieldBox());
            _yieldBox.transfer(address(this), data.user, sglAssetId, ybShares);
        }
    }

    function _validateExitPositionAndRemoveCollateral(ExitPositionAndRemoveCollateralData memory data) internal view {
        // Check sender
        _checkSender(data.user);

        // Check provided addresses
        _checkExternalDataFromOptionModule(data.externalData);
        _checkRemoveAndRepayData(data.removeAndRepayData);
    }
    function _checkExternalDataFromOptionModule(ICommonExternalContracts memory data) private view {
        _checkWhitelisted(data.marketHelper, "MAGNETAR_HELPER_CALLEE");
        _checkWhitelisted(data.magnetar, "MAGNETAR_CALLEE");
        _checkWhitelisted(data.bigBang, "MAGNETAR_MARKET_CALLEE");
        _checkWhitelisted(data.singularity, "MAGNETAR_MARKET_CALLEE");
    }

    function _checkRemoveAndRepayData(IRemoveAndRepay memory data) private view {
        _checkWhitelisted(data.exitData.target, "MAGNETAR_TAP_CALLEE");
        _checkWhitelisted(data.unlockData.target, "MAGNETAR_TAP_CALLEE");

        if (data.exitData.exit) {
            if (data.exitData.oTAPTokenID == 0) revert Magnetar_ActionParamsMismatch();
        }

        if (data.assetWithdrawData.withdraw) {
            // assure unwrap is false because asset is not a TOFT
            if (data.assetWithdrawData.unwrap) revert Magnetar_ComposeMsgNotAllowed();
        }
    }

    function _validateLockAndParticipate(LockAndParticipateData memory data) internal view {
        // Check sender
        _checkSender(data.user);

        // Check provided addresses
        _checkWhitelisted(data.yieldBox, "MAGNETAR_YIELDBOX_CALLEE");
        _checkWhitelisted(data.tSglToken, "MAGNETAR_MARKET_CALLEE");
        _checkWhitelisted(data.magnetar, "MAGNETAR_CALLEE");
        if (data.lockData.lock) {
            _checkWhitelisted(data.lockData.target, "MAGNETAR_TAP_CALLEE");
            _checkWhitelisted(data.lockData.tAsset, "MAGNETAR_TAP_CALLEE");
        }
        if (data.participateData.participate) {
            _checkWhitelisted(data.participateData.target, "MAGNETAR_TAP_CALLEE");
        }
    }


    /*
     -------------------- YIELDBOX MODULE -----------------------------
    */
    
    function _withdrawToChain(MagnetarWithdrawData memory data) internal {
        if (!cluster.hasRole(address(data.yieldBox), "YIELDBOX_WITHDRAW")) {
            revert MagnetarMock_TargetNotWhitelisted(address(data.yieldBox));
        }

        _withdrawHere(data);
    }



     function _withdrawHere(MagnetarWithdrawData memory data) internal {
        _checkWhitelisted(data.yieldBox, "YIELDBOX_WITHDRAW");

        IYieldBox _yb = IYieldBox(data.yieldBox);

        if (data.extractFromSender) {
            uint256 _share = _yb.toShare(data.assetId, data.amount, false);
            
            // _yb.transfer(msg.sender, address(this), data.assetId, _share);
            bool isErr = pearlmit.transferFromERC1155(msg.sender, address(this), data.yieldBox, data.assetId, _share);
            if (isErr) {
                revert Magnetar_TransferFailed();
            }
        }

        if (data.unwrap) {
            _yb.withdraw(data.assetId, address(this), address(this), data.amount, 0);

            (, address assetAddress,,) = _yb.assets(data.assetId);
            ITOFT(assetAddress).unwrap(data.receiver, data.amount);
        } else {
            _yb.withdraw(data.assetId, address(this), data.receiver, data.amount, 0);
        }
    }

    /*
     -------------------- generic -----------------------------
    */
    function _checkExternalData(address market, address marketHelper) private view {
        _checkWhitelisted(market, "MAGNETAR_MARKET_CALLEE");
        _checkWhitelisted(marketHelper, "MAGNETAR_HELPER_CALLEE");
    }

    function _checkWithdrawData(MagnetarWithdrawData memory data, address market) private view {
        if (data.withdraw) {
            // USDO doesn't have unwrap
            if (data.unwrap) revert MagnetarCollateralModule_UnwrapNotAllowed();
            if (data.assetId != IMarket(market)._assetId()) revert Magnetar_WithdrawParamsMismatch();
            if (data.amount == 0) revert Magnetar_WithdrawParamsMismatch();
        }
    }
    /**
     * @dev Executes a call to an address, optionally reverting on failure. Make sure to sanitize prior to calling.
     */
    function _executeCall(address _target, bytes calldata _actionCalldata, uint256 _actionValue) internal {
        bool success;
        bytes memory returnData;

        if (_actionValue > 0) {
            (success, returnData) = _target.call{value: _actionValue}(_actionCalldata);
        } else {
            (success, returnData) = _target.call(_actionCalldata);
        }

        if (!success) {
            _getRevertMsg(returnData);
        }
    }

    function _checkSender(address _from) internal view {
        if (_from != msg.sender && !cluster.hasRole(msg.sender, keccak256("MAGNETAR_CALLER"))) {
            revert MagnetarMock_NotAuthorized("MAGNETAR_CALLER");
        }
    }

    function _extractTokens(address _from, address _token, uint256 _amount) internal returns (uint256) {
        uint256 balanceBefore = IERC20(_token).balanceOf(address(this));
        // IERC20(_token).safeTransferFrom(_from, address(this), _amount);
        bool isErr = pearlmit.transferFromERC20(_from, address(this), _token, _amount);
        if (isErr) revert MagnetarMock_NotAuthorized("");
        uint256 balanceAfter = IERC20(_token).balanceOf(address(this));
        if (balanceAfter <= balanceBefore) revert MagnetarMock_Failed();
        return balanceAfter - balanceBefore;
    }


    function _setApprovalForYieldBox(address _target, IYieldBox _yieldBox) internal {
        bool isApproved = _yieldBox.isApprovedForAll(address(this), _target);
        if (!isApproved) {
            _yieldBox.setApprovalForAll(_target, true);
        }
    }

    function _revertYieldBoxApproval(address _target, IYieldBox _yieldBox) internal {
        bool isApproved = _yieldBox.isApprovedForAll(address(this), _target);
        if (isApproved) {
            _yieldBox.setApprovalForAll(_target, false);
        }
    }

    function _pearlmitApprove(address _yieldBox, uint256 _tokenId, address _market, uint256 _amount) internal {
        pearlmit.approve(1155, _yieldBox, _tokenId, _market, _amount.toUint200(), block.timestamp.toUint48());
    }


    function _depositToYb(IYieldBox _yieldBox, address _user, uint256 _tokenId, uint256 _amount)
        internal
        returns (uint256 amountOut, uint256 shareOut)
    {
        (, address assetAddress,,) = _yieldBox.assets(_tokenId);
        assetAddress.safeApprove(address(_yieldBox), _amount);
        (amountOut, shareOut) = _yieldBox.depositAsset(_tokenId, address(this), _user, _amount, 0);
        assetAddress.safeApprove(address(_yieldBox), 0);
    }

    function _marketRepay(IMarket _market, address _marketHelper, uint256 _amount, address _from, address _to)
        internal
        returns (uint256 repayed)
    {
        _market.accrue();
        uint256 repayPart = helper.getBorrowPartForAmount(address(_market), _amount, true); // RoundUp happen in market repay
        (Module[] memory modules, bytes[] memory calls) =
            IMarketHelper(_marketHelper).repay(_from, _to, false, repayPart);

        (bool[] memory successes, bytes[] memory results) = _market.execute(modules, calls, true);
        if (!successes[0]) revert Magnetar_MarketCallFailed(calls[0]);

        repayed = IMarketHelper(_marketHelper).repayView(results[0]);
    }

    function _marketBorrow(IMarket _market, address _marketHelper, uint256 _amount, address _from, address _to)
        internal
    {
        (Module[] memory modules, bytes[] memory calls) = IMarketHelper(_marketHelper).borrow(_from, _to, _amount);

        (bool[] memory successes,) = _market.execute(modules, calls, true);
        if (!successes[0]) revert Magnetar_MarketCallFailed(calls[0]);
    }

    function _marketAddCollateral(
        IMarket _market,
        address _marketHelper,
        uint256 _collateralShare,
        address _from,
        address _to
    ) internal {
        (Module[] memory modules, bytes[] memory calls) =
            IMarketHelper(_marketHelper).addCollateral(_from, _to, false, 0, _collateralShare);
        (bool[] memory successes,) = _market.execute(modules, calls, true);
        if (!successes[0]) revert Magnetar_MarketCallFailed(calls[0]);
    }

    function _marketRemoveCollateral(
        IMarket _market,
        address _marketHelper,
        uint256 _collateralShare,
        address _from,
        address _to
    ) internal {
        (Module[] memory modules, bytes[] memory calls) =
            IMarketHelper(_marketHelper).removeCollateral(_from, _to, _collateralShare);
        (bool[] memory successes,) = _market.execute(modules, calls, true);
        if (!successes[0]) revert Magnetar_MarketCallFailed(calls[0]);
    }

    function _singularityAddAsset(ISingularity _singularity, uint256 _amount, address _from, address _to)
        internal
        returns (uint256 fraction)
    {
        IYieldBox _yieldBox = IYieldBox(_singularity._yieldBox());
        uint256 lendShare = _yieldBox.toShare(_singularity._assetId(), _amount, false);

        fraction = _singularity.addAsset(_from, _to, false, lendShare);
    }

    function _singularityRemoveAsset(ISingularity _singularity, uint256 _amount, address _from, address _to)
        internal
        returns (uint256 share)
    {
        _singularity.accrue();
        uint256 fraction = helper.getFractionForAmount(_singularity, _amount, true);
        share = _singularity.removeAsset(_from, _to, fraction);
    }

    function _tOBExit(address oTapAddress, address tOB, uint256 id) internal {
        IERC721(oTapAddress).approve(tOB, id);
        ITapiocaOptionBroker(tOB).exitPosition(id);
    }


    
    function _executeModule(MagnetarModule, bytes memory _data) internal returns (bytes memory returnData) {
        bool success = true;

        (success, returnData) = address(this).delegatecall(_data);
        if (!success) {
            _getRevertMsg(returnData);
        }
    }

    function _getRevertMsg(bytes memory _returnData) internal pure {
        // If the _res length is less than 68, then
        // the transaction failed with custom error or silently (without a revert message)
        if (_returnData.length < 68) revert MagnetarMock_UnknownReason();

        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        revert(abi.decode(_returnData, (string))); // All that remains is the revert string
    }

    function _processYieldBoxApprovalsOptionModule(address bigBang, address singularity, bool approve) internal {
        if (bigBang == address(0) && singularity == address(0)) return;

        // YieldBox should be the same for all markets
        IYieldBox _yieldBox = bigBang != address(0)
            ? IYieldBox(IMarket(bigBang)._yieldBox())
            : IYieldBox(IMarket(singularity)._yieldBox());

        if (approve) {
            if (bigBang != address(0)) _setApprovalForYieldBox(bigBang, _yieldBox);
            if (singularity != address(0)) _setApprovalForYieldBox(singularity, _yieldBox);
            _setApprovalForYieldBox(address(pearlmit), _yieldBox);
        } else {
            if (bigBang != address(0)) _revertYieldBoxApproval(bigBang, _yieldBox);
            if (singularity != address(0)) _revertYieldBoxApproval(singularity, _yieldBox);
            _revertYieldBoxApproval(address(pearlmit), _yieldBox);
        }
    }

    function _processYieldBoxApprovalsCollateralModule(IYieldBox _yieldBox, address market, bool approve) internal {
        if (market == address(0)) return;

        if (approve) {
            _setApprovalForYieldBox(market, _yieldBox);
            _setApprovalForYieldBox(address(pearlmit), _yieldBox);
        } else {
            _revertYieldBoxApproval(market, _yieldBox);
            _revertYieldBoxApproval(address(pearlmit), _yieldBox);
        }
    }

     function _processYieldBoxApprovalsMintModule(address bigBang, address singularity, address lockTarget, bool approve)
        internal
    {
        if (bigBang == address(0) && singularity == address(0)) return;

        // YieldBox should be the same for all markets
        IYieldBox _yieldBox = bigBang != address(0)
            ? IYieldBox(IMarket(bigBang)._yieldBox())
            : IYieldBox(IMarket(singularity)._yieldBox());

        if (approve) {
            if (bigBang != address(0)) _setApprovalForYieldBox(bigBang, _yieldBox);
            if (singularity != address(0)) _setApprovalForYieldBox(singularity, _yieldBox);
            if (lockTarget != address(0)) _setApprovalForYieldBox(lockTarget, _yieldBox);
            _setApprovalForYieldBox(address(pearlmit), _yieldBox);
        } else {
            if (bigBang != address(0)) _revertYieldBoxApproval(bigBang, _yieldBox);
            if (singularity != address(0)) _revertYieldBoxApproval(singularity, _yieldBox);
            if (lockTarget != address(0)) _revertYieldBoxApproval(lockTarget, _yieldBox);
            _revertYieldBoxApproval(address(pearlmit), _yieldBox);
        }
    }

    function _checkWhitelisted(address addy, bytes memory role) internal view {
        if (addy != address(0)) {
            // if (!cluster.isWhitelisted(0, addy)) {
            if (!cluster.hasRole(addy, keccak256(role))) {
                revert Magnetar_TargetNotWhitelisted(addy);
            }
        }
    }

    /*
     -------------------- LZ generic -----------------------------
    */
    function _lzWithdraw(address _asset, LZSendParam memory _lzSendParam, uint128 _lzSendGas, uint128 _lzSendVal)
        internal
    {
        PrepareLzCallReturn memory prepareLzCallReturn = _prepareLzSend(_asset, _lzSendParam, _lzSendGas, _lzSendVal);

        if (msg.value < prepareLzCallReturn.msgFee.nativeFee) {
            revert MagnetarMock_GasMismatch(prepareLzCallReturn.msgFee.nativeFee, msg.value);
        }

        IOftSender(_asset).sendPacket{value: prepareLzCallReturn.msgFee.nativeFee}(
            prepareLzCallReturn.lzSendParam, prepareLzCallReturn.composeMsg
        );
    }

    function _lzCustomWithdraw(
        address _asset,
        LZSendParam memory _lzSendParam,
        uint128 _lzSendGas,
        uint128 _lzSendVal,
        uint128 _lzComposeGas,
        uint128 _lzComposeVal,
        uint16 _lzComposeMsgType
    ) internal {
        PrepareLzCallReturn memory prepareLzCallReturn = _prepareLzSend(_asset, _lzSendParam, _lzSendGas, _lzSendVal);

        TapiocaOmnichainEngineHelper _toeHelper = new TapiocaOmnichainEngineHelper();
        PrepareLzCallReturn memory prepareLzCallReturn2 = _toeHelper.prepareLzCall(
            ITapiocaOmnichainEngine(_asset),
            PrepareLzCallData({
                dstEid: _lzSendParam.sendParam.dstEid,
                recipient: _lzSendParam.sendParam.to,
                amountToSendLD: 0,
                minAmountToCreditLD: 0,
                msgType: _lzComposeMsgType,
                composeMsgData: ComposeMsgData({
                    index: 0,
                    gas: _lzComposeGas,
                    value: prepareLzCallReturn.msgFee.nativeFee.toUint128(),
                    data: _lzSendParam.sendParam.composeMsg,
                    prevData: bytes(""),
                    prevOptionsData: bytes("")
                }),
                lzReceiveGas: _lzSendGas + _lzComposeGas,
                lzReceiveValue: _lzComposeVal,
                refundAddress: address(this)
            })
        );

        if (msg.value < prepareLzCallReturn2.msgFee.nativeFee) {
            revert MagnetarMock_GasMismatch(prepareLzCallReturn2.msgFee.nativeFee, msg.value);
        }

        IOftSender(_asset).sendPacket{value: prepareLzCallReturn2.msgFee.nativeFee}(
            prepareLzCallReturn2.lzSendParam, prepareLzCallReturn2.composeMsg
        );
    }

    function _prepareLzSend(address _asset, LZSendParam memory _lzSendParam, uint128 _lzSendGas, uint128 _lzSendVal)
        internal
        returns (PrepareLzCallReturn memory prepareLzCallReturn)
    {
        TapiocaOmnichainEngineHelper _toeHelper = new TapiocaOmnichainEngineHelper();
        prepareLzCallReturn = _toeHelper.prepareLzCall(
            ITapiocaOmnichainEngine(_asset),
            PrepareLzCallData({
                dstEid: _lzSendParam.sendParam.dstEid,
                recipient: _lzSendParam.sendParam.to,
                amountToSendLD: _lzSendParam.sendParam.amountLD,
                minAmountToCreditLD: _lzSendParam.sendParam.minAmountLD,
                msgType: 1, // SEND
                composeMsgData: ComposeMsgData({
                    index: 0,
                    gas: 0,
                    value: 0,
                    data: bytes(""),
                    prevData: bytes(""),
                    prevOptionsData: bytes("")
                }),
                lzReceiveGas: _lzSendGas,
                lzReceiveValue: _lzSendVal,
                refundAddress: address(this)
            })
        );
    }
    

}
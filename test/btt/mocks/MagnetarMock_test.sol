// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
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
    LockAndParticipateData
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

import {MagnetarMockInternal_test} from "./MagnetarMockInternal_test.sol";

contract MagnetarMock_test is MagnetarMockInternal_test, ERC1155Holder, IERC721Receiver {
    using SafeCast for uint256;
    using SafeERC20 for IERC20;
    using SafeApprove for address;
    constructor(address _cluster, IPearlmit _pearlmit)  MagnetarMockInternal_test(_cluster, _pearlmit){
    }

   function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }
    
    function burst(MagnetarCall[] calldata calls) external payable {
        uint256 valAccumulator;

        uint256 length = calls.length;

        for (uint256 i; i < length; i++) {
            MagnetarCall calldata _action = calls[i];

            valAccumulator += _action.value;

            /// @dev Permit on YB, or an SGL/BB market
            if (_action.id == uint8(MagnetarAction.Permit)) {
                _processPermitOperation(_action.target, _action.call);
                continue; // skip the rest of the loop
            }

            /// @dev Wrap/unwrap singular operations
            if (_action.id == uint8(MagnetarAction.Wrap)) {
                continue; // skip the rest of the loop
            }

            /// @dev Market singular operations
            if (_action.id == uint8(MagnetarAction.Market)) {
                continue; // skip the rest of the loop
            }

            // /// @dev Tap singular operations
            // if (_action.id == MagnetarAction.TapToken) {
            //     continue; // skip the rest of the loop
            // }

            /// @dev Modules will not return result data.
            if (_action.id == uint8(MagnetarAction.CollateralModule)) {
                _executeModule(MagnetarModule.CollateralModule, _action.call);
                continue; // skip the rest of the loop
            }

            /// @dev Modules will not return result data.
            if (_action.id == uint8(MagnetarAction.MintModule)) {
                _executeModule(MagnetarModule.MintModule, _action.call);
                continue; // skip the rest of the loop
            }

            /// @dev Modules will not return result data.
            if (_action.id == uint8(MagnetarAction.OptionModule)) {
                _executeModule(MagnetarModule.OptionModule, _action.call);
                continue; // skip the rest of the loop
            }

            /// @dev Modules will not return result data.
            if (_action.id == uint8(MagnetarAction.YieldBoxModule)) {
                _executeModule(MagnetarModule.YieldBoxModule, _action.call);
                continue; // skip the rest of the loop
            }
        }
    }

    /**
     * @dev Process a permit operation, will only execute if the selector is allowed.
     * @dev !!! WARNING !!! Make sure to check the Owner param and check that function definition didn't change.
     *
     * @param _target The contract address to call.
     * @param _actionCalldata The calldata to send to the target.
     */
    function _processPermitOperation(address _target, bytes calldata _actionCalldata) private {
        /// @dev owner address should always be first param.
        // permitAction(bytes,uint16)
        // permit(address owner...)
        // revoke(address owner...)
        // permitAll(address from,..)
        // permit(address from,...)
        // setApprovalForAll(address from,...)
        // setApprovalForAsset(address from,...)
        bytes4 funcSig = bytes4(_actionCalldata[:4]);
        if (
            funcSig == IPermitAll.permitAll.selector || funcSig == IPermitAll.revokeAll.selector
                || funcSig == IPermit.permit.selector || funcSig == IPermit.revoke.selector
                || funcSig == IYieldBox.setApprovalForAll.selector || funcSig == IYieldBox.setApprovalForAsset.selector
        ) {
            /// @dev Owner param check. See Warning above.
            _checkSender(abi.decode(_actionCalldata[4:36], (address)));
            // No need to send value on permit
            _executeCall(_target, _actionCalldata, 0);
            return;
        }
        revert MagnetarMock_ActionNotValid(MagnetarAction.Permit, _actionCalldata);
    }

    /*
     -------------------- COLLATERAL MODULE -----------------------------
    */

    function depositAddCollateralAndBorrowFromMarket(DepositAddCollateralAndBorrowFromMarketData memory data)
        external
        payable
    {
        /**
         * @dev validate data
         */
        _validateDepositAddCollateralAndBorrowFromMarket(data);

        IMarket _market = IMarket(data.market);
        IYieldBox _yieldBox = IYieldBox(_market._yieldBox());

        /**
         * @dev YieldBox approvals
         */
        _processYieldBoxApprovalsCollateralModule(_yieldBox, data.market, true);

        uint256 collateralId = _market._collateralId();
        uint256 _share = _yieldBox.toShare(collateralId, data.collateralAmount, false);

        /**
         * @dev deposit to YieldBox
         */
        if (data.deposit && data.collateralAmount > 0) {
            (, address collateralAddress,,) = _yieldBox.assets(collateralId);
            data.collateralAmount = _extractTokens(data.user, collateralAddress, data.collateralAmount);
            _depositToYb(_yieldBox, data.user, collateralId, data.collateralAmount);
        }

        /**
         * @dev performs .addCollateral on data.market
         */
        if (data.collateralAmount > 0) {
            _pearlmitApprove(address(_yieldBox), collateralId, address(_market), _share);
            _marketAddCollateral(_market, data.marketHelper, _share, data.user, data.user);
        }

        /**
         * @dev performs .borrow on data.market
         *      if `withdraw` it uses `_withdrawHere` to withdraw assets on the same chain
         */
        if (data.borrowAmount > 0) {
            uint256 borrowShare = _yieldBox.toShare(_market._assetId(), data.borrowAmount, false);
            _pearlmitApprove(address(_yieldBox), _market._assetId(), address(_market), borrowShare);
            _marketBorrow(
                _market,
                data.marketHelper,
                data.borrowAmount,
                data.user,
                data.withdrawParams.withdraw ? address(this) : data.user
            );

            // data validated in `_validateDepositAddCollateralAndBorrowFromMarket`
            if (data.withdrawParams.withdraw) _withdrawHere(data.withdrawParams);
        }

        /**
         * @dev YieldBox reverts
         */
        _processYieldBoxApprovalsCollateralModule(_yieldBox, data.market, false);
    }


    function depositRepayAndRemoveCollateralFromMarket(DepositRepayAndRemoveCollateralFromMarketData memory data)
        public
        payable
    {
        /**
         * @dev validate data
         */
        _validateDepositRepayAndRemoveCollateralFromMarketData(data);

        IMarket _market = IMarket(data.market);
        IYieldBox _yieldBox = IYieldBox(_market._yieldBox());

        /**
         * @dev YieldBox approvals
         */
        _processYieldBoxApprovalsCollateralModule(_yieldBox, data.market, true);

        /**
         * @dev deposit `market._assetId()` to YieldBox
         */
        if (data.depositAmount > 0) {
            uint256 assetId = _market._assetId();
            (, address assetAddress,,) = _yieldBox.assets(assetId);
            data.depositAmount = _extractTokens(data.user, assetAddress, data.depositAmount);
            _depositToYb(_yieldBox, data.user, assetId, data.depositAmount);
        }

        /**
         * @dev performs a repay operation for the specified market
         */
        if (data.repayAmount > 0) {
            _marketRepay(_market, data.marketHelper, data.repayAmount, data.user, data.user);
        }

        /**
         * @dev performs a remove collateral market operation;
         *       also withdraws if requested.
         */
        if (data.collateralAmount > 0) {
            uint256 collateralShare = _yieldBox.toShare(_market._collateralId(), data.collateralAmount, true);
            _pearlmitApprove(address(_yieldBox), _market._collateralId(), address(_market), collateralShare);
            _marketRemoveCollateral(
                _market,
                data.marketHelper,
                collateralShare,
                data.user,
                data.withdrawCollateralParams.withdraw ? address(this) : data.user
            );

            if (data.withdrawCollateralParams.withdraw) {
                /**
                 * @dev re-calculate amount after `removeCollateral` operation
                 */
                if (collateralShare > 0) {
                    uint256 computedCollateral = _yieldBox.toAmount(_market._collateralId(), collateralShare, false);
                    if (computedCollateral == 0) revert Magnetar_WithdrawParamsMismatch();

                    _withdrawHere(data.withdrawCollateralParams);
                }
            }
        }

        /**
         * @dev YieldBox reverts
         */
        _processYieldBoxApprovalsCollateralModule(_yieldBox, data.market, false);
    }


    /*
     -------------------- MINT MODULE -----------------------------
    */

    function mintBBLendSGLLockTOLP(MintFromBBAndLendOnSGLData memory data) external payable {
        /**
         * @dev validate data
         */
        _validatemintBBLendSGLLockTOLPData(data);

        /**
         * @dev YieldBox approvals
         */
        _processYieldBoxApprovalsMintModule(
            data.externalContracts.bigBang, data.externalContracts.singularity, data.lockData.target, true
        );

        /**
         * @dev if `mint` was requested the following actions are performed:
         *      - extracts & deposits collateral to YB
         *      - performs bigBang_.addCollateral
         *      - performs bigBang_.borrow
         */
        if (data.mintData.mint && data.externalContracts.bigBang != address(0)) {
            _depositAddCollateralAndMintFromBigBang(data);
        }

        /**
         * @dev if `depositData.deposit`:
         *          - deposit SGL asset to YB for `data.user`
         *      Note: if mint (first step), assets are already in YieldBox
         */
        if (data.depositData.deposit) {
            IMarket _singularity = IMarket(data.externalContracts.singularity);
            IYieldBox _yieldBox = IYieldBox(_singularity._yieldBox());

            uint256 sglAssetId = _singularity._assetId();
            (, address sglAssetAddress,,) = _yieldBox.assets(sglAssetId);

            data.depositData.amount = _extractTokens(data.user, sglAssetAddress, data.depositData.amount);
            _depositToYb(_yieldBox, data.user, sglAssetId, data.depositData.amount);
        }

        /**
         * @dev if `lendAmount` > 0:
         *          - add asset to SGL
         */
        uint256 fraction;
        if (data.lendAmount > 0) {
            fraction = _singularityAddAsset(
                ISingularity(data.externalContracts.singularity), data.lendAmount, data.user, data.user
            );
        }

        /**
         * @dev if `lockData.lock`:
         *          - transfer `fraction` from data.user to `address(this)
         *          - deposits `fraction` to YB for `address(this)`
         *          - performs tOLP.lock
         */
        uint256 tOLPTokenId;
        if (data.lockData.lock) {
            tOLPTokenId = _lockMintModule(data, fraction, data.participateData.participate);
        }

        /**
         * @dev if `participateData.participate`:
         *          - verify tOLPTokenId
         *          - performs tOB.participate
         *          - transfer `oTAPTokenId` to data.user
         */
        if (data.participateData.participate) {
            _participateMintModule(data, tOLPTokenId, data.lockData.lock);
        }

        /**
         * @dev YieldBox reverts
         */
        _processYieldBoxApprovalsMintModule(
            data.externalContracts.bigBang, data.externalContracts.singularity, data.lockData.target, false
        );
    }


    /*
     -------------------- OPTION MODULE -----------------------------
    */

    function exitPositionAndRemoveCollateral(ExitPositionAndRemoveCollateralData memory data) external payable {
        /**
         * @dev validate data
         */
        _validateExitPositionAndRemoveCollateral(data);

        /**
         * @dev YieldBox approvals
         */
        _processYieldBoxApprovalsOptionModule(data.externalData.bigBang, data.externalData.singularity, true);

        /**
         * @dev if `removeAndRepayData.exitData.exit` the following operations are performed
         *          - if ownerOfTapTokenId is user, transfers the oTAP token id to this contract
         *          - tOB.exitPosition
         *          - if `!removeAndRepayData.unlockData.unlock`, transfer the obtained tokenId to the user
         */
        uint256 tOLPId = 0;
        if (data.removeAndRepayData.exitData.exit) {
            tOLPId = _exitFromOptionModule(data);
        }

        /**
         * @dev performs a tOLP.unlock operation
         */
        if (data.removeAndRepayData.unlockData.unlock) {
            _unlockFromOptionModule(data, tOLPId);
        }

        /**
         * @dev if `data.removeAndRepayData.removeAssetFromSGL` performs the follow operations:
         *          - removeAsset from SGL
         *          - if `data.removeAndRepayData.assetWithdrawData.withdraw` withdraws by using the `withdrawTo` operation
         */
        if (data.removeAndRepayData.removeAssetFromSGL) {
            ISingularity _singularity = ISingularity(data.externalData.singularity);

            // remove asset from SGL
            _singularityRemoveAsset(
                _singularity,
                data.removeAndRepayData.removeAmount,
                data.user,
                data.removeAndRepayData.assetWithdrawData.withdraw ? address(this) : data.user
            );

            //withdraw
            if (data.removeAndRepayData.assetWithdrawData.withdraw) {
                _withdrawHere(data.removeAndRepayData.assetWithdrawData);
            }
        }

        /**
         * @dev performs a BigBang repay operation
         */
        if (!data.removeAndRepayData.assetWithdrawData.withdraw && data.removeAndRepayData.repayAssetOnBB) {
            _marketRepay(
                IMarket(data.externalData.bigBang),
                data.externalData.marketHelper,
                data.removeAndRepayData.repayAmount,
                data.user,
                data.user
            );
        }

        /**
         * @dev performs a BigBang removeCollateral operation and withdrawal if requested
         */
        if (data.removeAndRepayData.removeCollateralFromBB) {
            IMarket _bigBang = IMarket(data.externalData.bigBang);
            IYieldBox _yieldBox = IYieldBox(_bigBang._yieldBox());

            // remove collateral
            _marketRemoveCollateral(
                _bigBang,
                data.externalData.marketHelper,
                _yieldBox.toShare(_bigBang._collateralId(), data.removeAndRepayData.collateralAmount, true),
                data.user,
                data.removeAndRepayData.collateralWithdrawData.withdraw ? address(this) : data.user
            );

            //withdraw
            if (data.removeAndRepayData.collateralWithdrawData.withdraw) {
                _withdrawHere(data.removeAndRepayData.collateralWithdrawData);
            }
        }

        /**
         * @dev YieldBox reverts
         */
        _processYieldBoxApprovalsOptionModule(data.externalData.bigBang, data.externalData.singularity, false);
    }

    function lockAndParticipate(LockAndParticipateData memory data) public payable {
        /**
         * @dev validate data
         */
        _validateLockAndParticipate(data);

        /**
         * @dev if `lockData.lock`:
         *          - transfer `fraction` from data.user to `address(this)
         *          - deposits `fraction` to YB for `address(this)`
         *          - performs tOLP.lock
         */
        uint256 tOLPTokenId;
        if (data.lockData.lock) {
            tOLPTokenId = _lockFromOptionModule(data);
        }

        /**
         * @dev if `participateData.participate`:
         *          - verify tOLPTokenId
         *          - performs tOB.participate
         *          - transfer `oTAPTokenId` to data.user
         */
        if (data.participateData.participate) {
            _participateFromOptionModule(data, tOLPTokenId);
        }
    }

    /*
     -------------------- YIELDBOX MODULE -----------------------------
    */
    function withdrawToChain(MagnetarWithdrawData memory data) external payable {
        _withdrawToChain(data);
    }


}

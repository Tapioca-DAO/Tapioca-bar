// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//LZ
import "tapioca-sdk/dist/contracts/token/oft/v2/OFTV2.sol";

//OZ
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

//TAPIOCA
import "tapioca-periph/contracts/interfaces/IYieldBoxBase.sol";
import {IUSDOBase} from "tapioca-periph/contracts/interfaces/IUSDO.sol";
import "tapioca-periph/contracts/interfaces/ICommonData.sol";

import "./BaseUSDOStorage.sol";
import "./modules/USDOLeverageModule.sol";
import "./modules/USDOMarketModule.sol";
import "./modules/USDOOptionsModule.sol";

//
//                 .(%%%%%%%%%%%%*       *
//             #%%%%%%%%%%%%%%%%%%%%*  ####*
//          #%%%%%%%%%%%%%%%%%%%%%#  /####
//       ,%%%%%%%%%%%%%%%%%%%%%%%   ####.  %
//                                #####
//                              #####
//   #####%#####              *####*  ####%#####*
//  (#########(              #####     ##########.
//  ##########             #####.      .##########
//                       ,####/
//                      #####
//  %%%%%%%%%%        (####.           *%%%%%%%%%#
//  .%%%%%%%%%%     *####(            .%%%%%%%%%%
//   *%%%%%%%%%%   #####             #%%%%%%%%%%
//               (####.
//      ,((((  ,####(          /(((((((((((((
//        *,  #####  ,(((((((((((((((((((((
//          (####   ((((((((((((((((((((/
//         ####*  (((((((((((((((((((
//                     ,**//*,.

contract BaseUSDO is BaseUSDOStorage, ERC20Permit {
    using SafeERC20 for IERC20;
    using BytesLib for bytes;
    // ************ //
    // *** VARS *** //
    // ************ //
    enum Module {
        Leverage,
        Market,
        Options
    }

    /// @notice returns the leverage module
    USDOLeverageModule public leverageModule;

    /// @notice returns the market module
    USDOMarketModule public marketModule;

    /// @notice returns the options module
    USDOOptionsModule public optionsModule;

    constructor(
        address _lzEndpoint,
        IYieldBoxBase _yieldBox,
        address _owner,
        address payable _leverageModule,
        address payable _marketModule,
        address payable _optionsModule
    ) BaseUSDOStorage(_lzEndpoint, _yieldBox) ERC20Permit("USDO") {
        leverageModule = USDOLeverageModule(_leverageModule);
        marketModule = USDOMarketModule(_marketModule);
        optionsModule = USDOOptionsModule(_optionsModule);

        transferOwnership(_owner);
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    /// @notice set the max allowed USDO mintable through flashloan
    /// @dev can only be called by the owner
    /// @param _val the new amount
    function setMaxFlashMintable(uint256 _val) external onlyOwner {
        emit MaxFlashMintUpdated(maxFlashMint, _val);
        maxFlashMint = _val;
    }

    /// @notice set the flashloan fee
    /// @dev can only be called by the owner
    /// @param _val the new fee
    function setFlashMintFee(uint256 _val) external onlyOwner {
        require(_val < FLASH_MINT_FEE_PRECISION, "USDO: fee too big");
        emit FlashMintFeeUpdated(flashMintFee, _val);
        flashMintFee = _val;
    }

    /// @notice set the Conservator address
    /// @dev conservator can pause the contract
    /// @param _conservator the new address
    function setConservator(address _conservator) external onlyOwner {
        require(_conservator != address(0), "USDO: address not valid");
        emit ConservatorUpdated(conservator, _conservator);
        conservator = _conservator;
    }

    /// @notice updates the pause state of the contract
    /// @dev can only be called by the conservator
    /// @param val the new value
    function updatePause(bool val) external {
        require(msg.sender == conservator, "USDO: unauthorized");
        require(val != paused, "USDO: same state");
        emit PausedUpdated(paused, val);
        paused = val;
    }

    /// @notice sets/unsets address as minter
    /// @dev can only be called by the owner
    /// @param _for role receiver
    /// @param _status true/false
    function setMinterStatus(address _for, bool _status) external onlyOwner {
        allowedMinter[_getChainId()][_for] = _status;
        emit SetMinterStatus(_for, _status);
    }

    /// @notice sets/unsets address as burner
    /// @dev can only be called by the owner
    /// @param _for role receiver
    /// @param _status true/false
    function setBurnerStatus(address _for, bool _status) external onlyOwner {
        allowedBurner[_getChainId()][_for] = _status;
        emit SetBurnerStatus(_for, _status);
    }

    // ************************ //
    // *** VIEW FUNCTIONS *** //
    // ************************ //
    /// @notice returns token's decimals
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice triggers a sendFrom to another layer from destination
    /// @param lzDstChainId LZ destination id
    /// @param airdropAdapterParams airdrop params
    /// @param zroPaymentAddress ZRO payment address
    /// @param amount amount to send back
    /// @param sendFromData data needed to trigger sendFrom on destination
    /// @param approvals approvals array
    function triggerSendFrom(
        uint16 lzDstChainId,
        bytes calldata airdropAdapterParams,
        address zroPaymentAddress,
        uint256 amount,
        ISendFrom.LzCallParams calldata sendFromData,
        ICommonData.IApproval[] calldata approvals
    ) external payable {
        _executeModule(
            Module.Options,
            abi.encodeWithSelector(
                USDOOptionsModule.triggerSendFrom.selector,
                lzDstChainId,
                airdropAdapterParams,
                zroPaymentAddress,
                amount,
                sendFromData,
                approvals
            ),
            false
        );
    }

    /// @notice Exercise an oTAP position
    /// @param optionsData oTap exerciseOptions data
    /// @param lzData data needed for the cross chain transer
    /// @param tapSendData needed for withdrawing Tap token
    /// @param approvals array
    function exerciseOption(
        ITapiocaOptionsBrokerCrossChain.IExerciseOptionsData
            calldata optionsData,
        ITapiocaOptionsBrokerCrossChain.IExerciseLZData calldata lzData,
        ITapiocaOptionsBrokerCrossChain.IExerciseLZSendTapData
            calldata tapSendData,
        ICommonData.IApproval[] calldata approvals
    ) external payable {
        _executeModule(
            Module.Options,
            abi.encodeWithSelector(
                USDOOptionsModule.exerciseOption.selector,
                optionsData,
                lzData,
                tapSendData,
                approvals
            ),
            false
        );
    }

    /// @notice inits multiHopBuyCollateral
    /// @param from The user who sells
    /// @param collateralAmount Extra collateral to be added
    /// @param borrowAmount Borrowed amount that will be swapped into collateral
    /// @param swapData Swap data used on destination chain for swapping USDO to the underlying TOFT token
    /// @param lzData LayerZero specific data
    /// @param externalData External contracts used for the cross chain operation
    /// @param approvals array
    function initMultiHopBuy(
        address from,
        uint256 collateralAmount,
        uint256 borrowAmount,
        IUSDOBase.ILeverageSwapData calldata swapData,
        IUSDOBase.ILeverageLZData calldata lzData,
        IUSDOBase.ILeverageExternalContractsData calldata externalData,
        bytes calldata airdropAdapterParams,
        ICommonData.IApproval[] memory approvals
    ) external payable {
        _executeModule(
            Module.Leverage,
            abi.encodeWithSelector(
                USDOLeverageModule.initMultiHopBuy.selector,
                from,
                collateralAmount,
                borrowAmount,
                swapData,
                lzData,
                externalData,
                airdropAdapterParams,
                approvals
            ),
            false
        );
    }

    /// @notice calls removeAssetAndRepay on Magnetar from the destination layer
    /// @param from sending address
    /// @param to receiver address
    /// @param lzDstChainId LayerZero destination chain id
    /// @param zroPaymentAddress ZRO payment address
    /// @param adapterParams LZ adapter params
    /// @param externalData external addresses needed for the operation
    /// @param removeAndRepayData removeAssetAndRepay params
    /// @param approvals approvals params
    function removeAsset(
        address from,
        address to,
        uint16 lzDstChainId,
        address zroPaymentAddress,
        bytes calldata adapterParams,
        IUSDOBase.IRemoveAndRepayExternalContracts calldata externalData,
        IUSDOBase.IRemoveAndRepay calldata removeAndRepayData,
        ICommonData.IApproval[] calldata approvals
    ) external payable {
        _executeModule(
            Module.Market,
            abi.encodeWithSelector(
                USDOMarketModule.removeAsset.selector,
                from,
                to,
                lzDstChainId,
                zroPaymentAddress,
                adapterParams,
                externalData,
                removeAndRepayData,
                approvals
            ),
            false
        );
    }

    /// @notice sends USDO to a specific chain and performs a leverage up operation
    /// @param amount the amount to use
    /// @param leverageFor the receiver address
    /// @param lzData LZ specific data
    /// @param swapData ISwapper specific data
    /// @param externalData external contracts used for the flow
    function sendForLeverage(
        uint256 amount,
        address leverageFor,
        IUSDOBase.ILeverageLZData calldata lzData,
        IUSDOBase.ILeverageSwapData calldata swapData,
        IUSDOBase.ILeverageExternalContractsData calldata externalData
    ) external payable {
        _executeModule(
            Module.Leverage,
            abi.encodeWithSelector(
                USDOLeverageModule.sendForLeverage.selector,
                amount,
                leverageFor,
                lzData,
                swapData,
                externalData
            ),
            false
        );
    }

    /// @notice sends to YieldBox over layer and lends asset to market
    /// @param _from sending address
    /// @param _to receiver address
    /// @param lzDstChainId LayerZero destination chain id
    /// @param lendParams lend specific params
    /// @param approvals approvals specific params
    /// @param withdrawParams parameter to withdraw the SGL collateral
    /// @param adapterParams adapter params of the withdrawn collateral
    function sendAndLendOrRepay(
        address _from,
        address _to,
        uint16 lzDstChainId,
        address zroPaymentAddress,
        IUSDOBase.ILendOrRepayParams calldata lendParams,
        ICommonData.IApproval[] calldata approvals,
        ICommonData.IWithdrawParams calldata withdrawParams,
        bytes calldata adapterParams
    ) external payable {
        _executeModule(
            Module.Market,
            abi.encodeWithSelector(
                USDOMarketModule.sendAndLendOrRepay.selector,
                _from,
                _to,
                lzDstChainId,
                zroPaymentAddress,
                lendParams,
                approvals,
                withdrawParams,
                adapterParams
            ),
            false
        );
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //

    function _extractModule(Module _module) private view returns (address) {
        address module;
        if (_module == Module.Leverage) {
            module = address(leverageModule);
        } else if (_module == Module.Market) {
            module = address(marketModule);
        } else if (_module == Module.Options) {
            module = address(optionsModule);
        }

        if (module == address(0)) {
            revert("USDO: module not found");
        }

        return module;
    }

    function _executeModule(
        Module _module,
        bytes memory _data,
        bool _forwardRevert
    ) private returns (bool success, bytes memory returnData) {
        success = true;
        address module = _extractModule(_module);

        (success, returnData) = module.delegatecall(_data);
        if (!success && !_forwardRevert) {
            revert(_getRevertMsg(returnData));
        }
    }

    function _executeOnDestination(
        Module _module,
        bytes memory _data,
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) private {
        (bool success, bytes memory returnData) = _executeModule(
            _module,
            _data,
            true
        );
        if (!success) {
            _storeFailedMessage(
                _srcChainId,
                _srcAddress,
                _nonce,
                _payload,
                returnData
            );
        }
    }

    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal virtual override {
        uint256 packetType = _payload.toUint256(0);

        if (packetType == PT_YB_SEND_SGL_LEND_OR_REPAY) {
            _executeOnDestination(
                Module.Market,
                abi.encodeWithSelector(
                    USDOMarketModule.lend.selector,
                    marketModule,
                    _srcChainId,
                    _srcAddress,
                    _nonce,
                    _payload
                ),
                _srcChainId,
                _srcAddress,
                _nonce,
                _payload
            );
        } else if (packetType == PT_LEVERAGE_MARKET_UP) {
            _executeOnDestination(
                Module.Leverage,
                abi.encodeWithSelector(
                    USDOLeverageModule.leverageUp.selector,
                    leverageModule,
                    _srcChainId,
                    _srcAddress,
                    _nonce,
                    _payload
                ),
                _srcChainId,
                _srcAddress,
                _nonce,
                _payload
            );
        } else if (packetType == PT_MARKET_REMOVE_ASSET) {
            _executeOnDestination(
                Module.Market,
                abi.encodeWithSelector(
                    USDOMarketModule.remove.selector,
                    _payload
                ),
                _srcChainId,
                _srcAddress,
                _nonce,
                _payload
            );
        } else if (packetType == PT_MARKET_MULTIHOP_BUY) {
            _executeOnDestination(
                Module.Leverage,
                abi.encodeWithSelector(
                    USDOLeverageModule.multiHop.selector,
                    _payload
                ),
                _srcChainId,
                _srcAddress,
                _nonce,
                _payload
            );
        } else if (packetType == PT_TAP_EXERCISE) {
            _executeOnDestination(
                Module.Options,
                abi.encodeWithSelector(
                    USDOOptionsModule.exercise.selector,
                    optionsModule,
                    _srcChainId,
                    _srcAddress,
                    _nonce,
                    _payload
                ),
                _srcChainId,
                _srcAddress,
                _nonce,
                _payload
            );
        } else if (packetType == PT_SEND_FROM) {
            _executeOnDestination(
                Module.Options,
                abi.encodeWithSelector(
                    USDOOptionsModule.sendFromDestination.selector,
                    _payload
                ),
                _srcChainId,
                _srcAddress,
                _nonce,
                _payload
            );
        } else {
            packetType = _payload.toUint8(0);
            if (packetType == PT_SEND) {
                _sendAck(_srcChainId, _srcAddress, _nonce, _payload);
            } else if (packetType == PT_SEND_AND_CALL) {
                _sendAndCallAck(_srcChainId, _srcAddress, _nonce, _payload);
            } else {
                revert("OFTCoreV2: unknown packet type");
            }
        }
    }
}

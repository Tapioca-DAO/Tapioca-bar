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

import "./BaseUSDOStorage.sol";
import "./modules/USDOLeverageModule.sol";
import "./modules/USDOMarketModule.sol";

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
        Market
    }

    /// @notice returns the leverage module
    USDOLeverageModule public leverageModule;

    /// @notice returns the market module
    USDOMarketModule public marketModule;

    constructor(
        address _lzEndpoint,
        IYieldBoxBase _yieldBox,
        address _owner,
        address payable _leverageModule,
        address payable _marketModule
    ) BaseUSDOStorage(_lzEndpoint, _yieldBox) ERC20Permit("USDO") {
        leverageModule = USDOLeverageModule(_leverageModule);
        marketModule = USDOMarketModule(_marketModule);

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
    /// @notice calls removeAsset on another layer
    /// @param from sending address
    /// @param to receiver address
    /// @param lzDstChainId LayerZero destination chain id
    /// @param withdrawParams withdrawTo specific params
    /// @param options send specific params
    /// @param removeParams removeAsset specific params
    /// @param approvals approvals specific params
    function removeAsset(
        address from,
        address to,
        uint16 lzDstChainId,
        ITapiocaOFT.IWithdrawParams calldata withdrawParams,
        IUSDOBase.ISendOptions calldata options,
        IUSDOBase.IRemoveParams calldata removeParams,
        IUSDOBase.IApproval[] calldata approvals,
        bytes calldata adapterParams
    ) external payable {
        _executeModule(
            Module.Market,
            abi.encodeWithSelector(
                USDOMarketModule.removeAsset.selector,
                from,
                to,
                lzDstChainId,
                withdrawParams,
                options,
                removeParams,
                approvals,
                adapterParams
            )
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
            )
        );
    }

    /// @notice sends to YieldBox over layer and lends asset to market
    /// @param from sending address
    /// @param to receiver address
    /// @param lzDstChainId LayerZero destination chain id
    /// @param lendParams lend specific params
    /// @param options send specific params
    /// @param approvals approvals specific params
    function sendAndLendOrRepay(
        address from,
        address to,
        uint16 lzDstChainId,
        IUSDOBase.ILendParams calldata lendParams,
        IUSDOBase.ISendOptions calldata options,
        IUSDOBase.IApproval[] calldata approvals
    ) external payable {
        _executeModule(
            Module.Market,
            abi.encodeWithSelector(
                USDOMarketModule.sendAndLendOrRepay.selector,
                from,
                to,
                lzDstChainId,
                lendParams,
                options,
                approvals
            )
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
        }

        if (module == address(0)) {
            revert("USDO: module not found");
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

    function _getRevertMsg(
        bytes memory _returnData
    ) internal pure returns (string memory) {
        // If the _res length is less than 68, then the transaction failed silently (without a revert message)
        if (_returnData.length < 68) return "USDO: no return data";
        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        return abi.decode(_returnData, (string)); // All that remains is the revert string
    }

    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal virtual override {
        uint256 packetType = _payload.toUint256(0);

        if (packetType == PT_YB_SEND_SGL_LEND_OR_REPAY) {
            _executeModule(
                Module.Market,
                abi.encodeWithSelector(
                    USDOMarketModule.lend.selector,
                    _srcChainId,
                    _payload
                )
            );
        } else if (packetType == PT_LEVERAGE_MARKET_UP) {
            _executeModule(
                Module.Leverage,
                abi.encodeWithSelector(
                    USDOLeverageModule.leverageUp.selector,
                    _srcChainId,
                    _payload
                )
            );
        } else if (packetType == PT_MARKET_REMOVE_ASSET) {
            _executeModule(
                Module.Market,
                abi.encodeWithSelector(
                    USDOMarketModule.remove.selector,
                    _payload
                )
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

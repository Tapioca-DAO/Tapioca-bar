// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// External
import {BoringERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import {BoringOwnable} from "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/ERC20.sol";

// Tapioca
import {IMarketLiquidatorReceiver} from "tapioca-periph/interfaces/bar/IMarketLiquidatorReceiver.sol";
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {ISwapper} from "tapioca-periph/interfaces/periph/ISwapper.sol";

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

contract MarketLiquidatorReceiver is IMarketLiquidatorReceiver, BoringOwnable {
    using BoringERC20 for IERC20;

    struct OracleInfo {
        bytes data;
        address target;
        uint256 precision;
    }

    mapping(address tokenIn => OracleInfo oracleInfo) public oracles;
    mapping(address oracle => uint256 rate) public cachedRates;
    mapping(address tokenIn => address swapper) public swappers;

    mapping(address sender => mapping(address tokenIn => uint256 allowance)) public allowances;

    uint256 private _entered;

    event OracleAssigned(address indexed tokenIn, address indexed oracle);
    event SwapperAssigned(address indexed tokenIn, address indexed swapper);

    error ExchangeRateNotValid();
    error NotAuthorized();
    error NotEnough();
    error Reentrancy();
    error NoOracleAssigned();
    error NoSwapperAssigned();
    error NotValid();
    error SwapFailed();

    constructor() {
        owner = msg.sender;
    }

    /// @notice action performed during the liquidation process
    /// @param tokenIn received token
    /// @param tokenOut output token
    /// @param collateralAmount received amount
    /// @param data action data
    function onCollateralReceiver(
        address initiator,
        address tokenIn,
        address tokenOut,
        uint256 collateralAmount,
        bytes calldata data
    ) external returns (bool) {
        if (_entered != 0) revert Reentrancy();
        _entered = 1;

        if (initiator != owner) revert NotAuthorized();

        uint256 collateralBalance = IERC20(tokenIn).balanceOf(address(this));
        if (collateralBalance < collateralAmount) revert NotEnough();

        if (oracles[tokenIn].target == address(0)) revert NoOracleAssigned();
        if (swappers[tokenIn] == address(0)) revert NoSwapperAssigned();

        if (msg.sender != initiator) {
            if (allowances[msg.sender][tokenIn] < collateralAmount) {
                revert NotAuthorized();
            }
            allowances[msg.sender][tokenIn] -= collateralAmount;
        }

        uint256 minTokenOutAmount = abi.decode(data, (uint256));

        if (minTokenOutAmount == 0) revert NotValid();

        ISwapper.SwapData memory swapData =
            ISwapper(swappers[tokenIn]).buildSwapData(tokenIn, tokenOut, collateralAmount, 0);
        (, uint256 returnedShare) = ISwapper(swappers[tokenIn]).swap(swapData, minTokenOutAmount, msg.sender, "");
        if (returnedShare == 0) revert SwapFailed();
        _entered = 0;
        return true;
    }

    /// @notice updates cached rates
    /// @param _tokens array list of tokens to update the oracle rate for
    function updateRates(address[] calldata _tokens) external onlyOwner {
        uint256 _len = _tokens.length;
        for (uint256 i; i < _len; i++) {
            ITapiocaOracle oracle = ITapiocaOracle(oracles[_tokens[i]].target);
            (bool updated, uint256 rate) = oracle.get(oracles[_tokens[i]].data);
            if (updated && rate > 0) {
                cachedRates[address(oracle)] = rate;
            }
        }
    }

    /// @notice assigns oracle for token
    /// @param _tokenIn token to assign the oracle for
    /// @param _oracle the oracle address
    /// @param _data the oracle data
    /// @param _precision oracle precision
    function assignOracle(address _tokenIn, address _oracle, bytes memory _data, uint256 _precision)
        external
        onlyOwner
    {
        oracles[_tokenIn] = OracleInfo({data: _data, target: _oracle, precision: _precision});
        emit OracleAssigned(_tokenIn, _oracle);
    }

    /// @notice assigns swapper for token
    /// @param _tokenIn token to assign the swapper for
    /// @param _swapper the swapper address
    function assignSwapper(address _tokenIn, address _swapper) external onlyOwner {
        swappers[_tokenIn] = _swapper;
        emit SwapperAssigned(_tokenIn, _swapper);
    }

    /// @notice increases allowance for sender
    /// @param sender the sender address
    /// @param tokenIn token to increase allowance for
    /// @param amount increase allowance by amount
    function increaseAllowance(address sender, address tokenIn, uint256 amount) external onlyOwner {
        allowances[sender][tokenIn] += amount;
    }

    /// @notice decreases allowance for sender
    /// @param sender the sender address
    /// @param tokenIn token to decrease allowance for
    /// @param amount decrease allowance by amount
    function decreaseAllowance(address sender, address tokenIn, uint256 amount) external onlyOwner {
        allowances[sender][tokenIn] -= amount;
    }
}

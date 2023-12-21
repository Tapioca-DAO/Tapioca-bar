// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "tapioca-periph/contracts/interfaces/ISwapper.sol";
import "tapioca-periph/contracts/interfaces/IOracle.sol";
import "tapioca-periph/contracts/interfaces/IMarketLiquidatorReceiver.sol";

import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

contract MarketLiquidatorReceiver is IMarketLiquidatorReceiver, BoringOwnable {
    using BoringERC20 for IERC20;

    struct OracleInfo {
        bytes data;
        address target;
        uint256 precision;
    }

    mapping(address tokenIn => OracleInfo oracleInfo) public oracles;
    mapping(address tokenIn => address swapper) public swappers;

    event OracleAssigned(address indexed tokenIn, address indexed oracle);
    event SwapperAssigned(address indexed tokenIn, address indexed swapper);

    mapping(address sender => mapping(address tokenIn => uint256 allowance))
        public allowances;

    uint256 private _entered;

    constructor() {
        owner = msg.sender;
    }

    function onCollateralReceiver(
        address initiator,
        address tokenIn,
        address tokenOut,
        uint256 collateralAmount,
        bytes calldata data
    ) external returns (bool) {
        require(_entered == 0, "MarketLiquidatorReceiver: reentrancy");
        _entered = 1;

        require(initiator == owner, "MarketLiquidatorReceiver: not authorized");

        uint256 collateralBalance = IERC20(tokenIn).balanceOf(address(this));
        require(
            collateralBalance >= collateralAmount,
            "MarketLiquidatorReceiver: not enough"
        );

        require(
            oracles[tokenIn].target != address(0),
            "MarketLiquidatorReceiver: no oracle assigned"
        );
        require(
            swappers[tokenIn] != address(0),
            "MarketLiquidatorReceiver: no swapper assigned"
        );
        if (msg.sender != initiator) {
            require(
                allowances[msg.sender][tokenIn] >= collateralAmount,
                "MarketLiquidatorReceiver: sender not allowed"
            );
            allowances[msg.sender][tokenIn] -= collateralAmount;
        }

        uint256 _slippage = abi.decode(data, (uint256));
        uint256 minTokenOutAmount = _getMinAmount(
            tokenIn,
            collateralAmount,
            _slippage
        );
        require(
            minTokenOutAmount > 0,
            "MarketLiquidatorReceiver: min amount not valid"
        );

        ISwapper.SwapData memory swapData = ISwapper(swappers[tokenIn])
            .buildSwapData(tokenIn, tokenOut, collateralAmount, 0);
        (, uint256 returnedShare) = ISwapper(swappers[tokenIn]).swap(
            swapData,
            minTokenOutAmount,
            msg.sender,
            ""
        );
        require(returnedShare > 0, "MarketLiquidatorReceiver: Swap failed");
        _entered = 0;
        return true;
    }

    function assignOracle(
        address _tokenIn,
        address _oracle,
        bytes memory _data,
        uint256 _precision
    ) external onlyOwner {
        oracles[_tokenIn] = OracleInfo({
            data: _data,
            target: _oracle,
            precision: _precision
        });
        emit OracleAssigned(_tokenIn, _oracle);
    }

    function assignSwapper(
        address _tokenIn,
        address _swapper
    ) external onlyOwner {
        swappers[_tokenIn] = _swapper;
        emit SwapperAssigned(_tokenIn, _swapper);
    }

    function increaseAllowance(
        address sender,
        address tokenIn,
        uint256 amount
    ) external onlyOwner {
        allowances[sender][tokenIn] += amount;
    }

    function decreaseAllowance(
        address sender,
        address tokenIn,
        uint256 amount
    ) external onlyOwner {
        allowances[sender][tokenIn] -= amount;
    }

    function _getMinAmount(
        address _tokenIn,
        uint256 tokenInAmount,
        uint256 _slippage
    ) private returns (uint256 minTokenOutAmount) {
        IOracle oracle = IOracle(oracles[_tokenIn].target);
        (bool updated, uint256 rate) = oracle.get(oracles[_tokenIn].data);
        require(updated, "MarketLiquidatorReceiver: oracle called failed");
        require(rate > 0, "MarketLiquidatorReceiver: rate not valid");

        uint256 tokenOutAmount = (tokenInAmount * rate) /
            oracles[_tokenIn].precision;
        return tokenOutAmount - ((tokenOutAmount * _slippage) / 10_000); //50 is 0.5%
    }
}

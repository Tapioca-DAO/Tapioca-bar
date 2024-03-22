// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract GmxMarketMock is ERC20 {
    using SafeERC20 for IERC20;

    struct CreateDepositParams {
        address receiver;
        address callbackContract;
        address uiFeeReceiver;
        address market;
        address initialLongToken;
        address initialShortToken;
        address[] longTokenSwapPath;
        address[] shortTokenSwapPath;
        uint256 minMarketTokens;
        bool shouldUnwrapNativeToken;
        uint256 executionFee;
        uint256 callbackGasLimit;
    }

    struct CreateWithdrawalParams {
        address receiver;
        address callbackContract;
        address uiFeeReceiver;
        address market;
        address[] longTokenSwapPath;
        address[] shortTokenSwapPath;
        uint256 minLongTokenAmount;
        uint256 minShortTokenAmount;
        bool shouldUnwrapNativeToken;
        uint256 executionFee;
        uint256 callbackGasLimit;
    }

    address public weth;
    address public usdc;
    address public lp;
    address public glp;

    constructor(address _weth, address _usdc, address _lp) ERC20("SGLP", "SGLP") {
        weth = _weth;
        usdc = _usdc;
        lp = _lp;
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function sendWnt(address receiver, uint256 amount) external payable {}

    function sendTokens(address token, address receiver, uint256 amount) external payable {
        IERC20(token).safeTransferFrom(msg.sender, receiver, amount);
    }

    function createDeposit(CreateDepositParams calldata params) external payable returns (bytes32) {
        IERC20(lp).safeTransfer(params.receiver, params.minMarketTokens);
        return "0x";
    }

    function createWithdrawal(CreateWithdrawalParams calldata params) external payable returns (bytes32) {
        IERC20(weth).safeTransfer(params.receiver, params.minLongTokenAmount);
        IERC20(usdc).safeTransfer(params.receiver, params.minShortTokenAmount);
        IERC20(lp).safeTransferFrom(msg.sender, address(this), balanceOf(msg.sender));
        return "0x";
    }

    function multicall(bytes[] calldata data) external payable returns (bytes[] memory results) {
        results = new bytes[](data.length);

        for (uint256 i; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);

            require(success, _getRevertMsg(result));

            results[i] = result;
        }

        return results;
    }

    function _getRevertMsg(bytes memory _returnData) internal pure returns (string memory) {
        if (_returnData.length > 1000) return "reason too long";
        // If the _res length is less than 68, then the transaction failed silently (without a revert message)
        if (_returnData.length < 68) return "no return data";
        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        return abi.decode(_returnData, (string)); // All that remains is the revert string
    }

    //router mocks
    function setGlp(address _glp) external {
        glp = _glp;
    }

    function mintAndStakeGlp(address _token, uint256 _amount, uint256, uint256) external returns (uint256) {
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        IERC20(glp).safeTransfer(msg.sender, _amount);
        return _amount;
    }

    function unstakeAndRedeemGlp(address _tokenOut, uint256 _glpAmount, uint256, address _receiver)
        external
        returns (uint256)
    {
        IERC20(glp).safeTransferFrom(msg.sender, address(this), _glpAmount);
        IERC20(_tokenOut).safeTransfer(_receiver, _glpAmount);
        return _glpAmount;
    }

    function glpManager() external view returns (address) {
        return address(this); //in a production env you need to approve glpManager address
    }
}

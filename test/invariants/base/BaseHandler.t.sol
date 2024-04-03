// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ERC20Mock} from "test/ERC20Mock.sol";
import "forge-std/console.sol";

// Contracts
import {Actor} from "../utils/Actor.sol";
import {HookAggregator} from "../hooks/HookAggregator.t.sol";

// Interfaces
import {IMarket} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {Module} from "tapioca-periph/interfaces/bar/IMarket.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title BaseHandler
/// @notice Contains common logic for all handlers
/// @dev inherits all suite assertions since per-action assertions are implemented in the handlers
contract BaseHandler is HookAggregator {
    using EnumerableSet for EnumerableSet.AddressSet;

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                       SHARED VARAIBLES                                    //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /// @notice Track total deposit amount
    uint256 ghost_totalCollateralShare;
    /// @notice Track total deposit amount per user
    mapping(address => uint256) ghost_userCollateralShare;

    /// @notice Track total borrow amount
    uint256 ghost_totalBorrowBase;
    /// @notice Track total borrow part per user
    mapping(address => uint256) ghost_userBorrowPart;

    /// @notice Track total asset amount
    uint256 ghost_totalAssetBase;
    /// @notice Track total asset amount per user
    mapping(address => uint256) ghost_userAssetBase;



    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                         HELPERS                                           //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /// @notice Customized proxy call to execute a list of modules and calls using the MarketHelper
    function _proxyCall(Module[] memory modules, bytes[] memory calls) internal returns (bool success, bytes memory returnData) {
        /// @dev call to before hook
        _before();
        
        /// @dev proxy call to the target
        (success, returnData) =
            actor.proxy(target, abi.encodeWithSelector(IMarket.execute.selector, modules, calls, true));
    }

    /// @notice Customized proxy call to execute a list of modules and calls using the MarketHelper
    function _proxyCallClear(Module[] memory modules, bytes[] memory calls) internal returns (bool success, bytes memory returnData) {
        /// @dev proxy call to the target
        (success, returnData) =
            actor.proxy(target, abi.encodeWithSelector(IMarket.execute.selector, modules, calls, true));
    }

    /// @notice Helper function to randomize a uint256 seed with a string salt
    function _randomize(uint256 seed, string memory salt) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(seed, salt)));
    }

    function _getRandomValue(uint256 modulus) internal view returns (uint256) {
        uint256 randomNumber = uint256(keccak256(abi.encode(block.timestamp, block.prevrandao, msg.sender)));
        return randomNumber % modulus; // Adjust the modulus to the desired range
    }

    function _getRandomBaseAsset(uint256 i) internal view returns (address) {
        uint256 randomValue = _randomize(i, "randomBaseAsset");
        return baseAssets[randomValue % baseAssets.length];
    }


    function _getRandomYieldBoxAssetId(uint256 i) internal view returns (uint256) {
        uint256 randomValue = _randomize(i, "randomBaseAsset");
        return assetIds[yieldboxAssets[randomValue % yieldboxAssets.length]];
    }

    /// @notice Helper function to approve an amount of tokens to a spender, a proxy Actor
    function _approve(address token, Actor actor_, address spender, uint256 amount) internal {
        bool success;
        bytes memory returnData;
        (success, returnData) = actor_.proxy(token, abi.encodeWithSelector(0x095ea7b3, spender, amount));
        require(success, string(returnData));
    }

    /// @notice Helper function to safely approve an amount of tokens to a spender
    function _approve(address token, address owner, address spender, uint256 amount) internal {
        vm.prank(owner);
        _safeApprove(token, spender, 0);
        vm.prank(owner);
        _safeApprove(token, spender, amount);
    }

    function _safeApprove(address token, address spender, uint256 amount) internal {
        (bool success, bytes memory retdata) =
            token.call(abi.encodeWithSelector(IERC20.approve.selector, spender, amount));
        assert(success);
        if (retdata.length > 0) assert(abi.decode(retdata, (bool)));
    }

    function _mint(address token, address receiver, uint256 amount) internal {
        ERC20Mock(token).mint(receiver, amount);
    }

    function _mintAndApprove(address token, address owner, address spender, uint256 amount) internal {
        _mint(token, owner, amount);
        _approve(token, owner, spender, amount);
    }

    function _increaseGhostShares(address user, uint256 amount) internal {
        ghost_userCollateralShare[user] += amount;
        ghost_totalCollateralShare += amount;
    }

    function _decreaseGhostShares(address user, uint256 amount) internal {
        ghost_userCollateralShare[user] -= amount;
        ghost_totalCollateralShare -= amount;
    }

    function _increaseGhostBorrow(address user, uint256 amount) internal {
        ghost_userBorrowPart[user] += amount;
        ghost_totalBorrowBase += amount;
    }

    function _decreaseGhostBorrow(address user, uint256 amount) internal {
        ghost_userBorrowPart[user] -= amount;
        ghost_totalBorrowBase -= amount;
    }

    function _increaseGhostAsset(address user, uint256 amount) internal {
        ghost_userAssetBase[user] += amount;
        ghost_totalAssetBase += amount;

    }

    function _decreaseGhostAsset(address user, uint256 amount) internal {
        ghost_userAssetBase[user] -= amount;
        ghost_totalAssetBase -= amount;
    }

    function _getShares(uint256 amount, uint256 share) internal view returns (uint256) {
        if (share == 0) {
            share = yieldbox.toShare(assetIds[address(erc20Mock)], amount, false);
        }
        return share;
    }

    function _getAssetFraction(uint256 share, bool roundUp) internal view returns (uint256 fraction) {
        (uint256 elastic,) = singularity.totalBorrow();
        (uint256 totalAssetElastic, uint256 base) = singularity.totalAsset();
        uint256 allShare = totalAssetElastic + yieldbox.toShare(assetIds[address(erc20Mock)], elastic, roundUp);
        fraction = allShare == 0 ? share : (share * base) / allShare;
        if (base + fraction < 1000) {
            fraction = 0;
        }

    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Contracts
import {Market} from "contracts/markets/Market.sol";

// Libraries
import {Vm} from "forge-std/Base.sol";
import {StdUtils} from "forge-std/StdUtils.sol";
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";


// Utils
import {Actor} from "../utils/Actor.sol";
import {PropertiesConstants} from "../utils/PropertiesConstants.sol";
import {StdAsserts} from "../utils/StdAsserts.sol";
import "forge-std/console.sol";

// Base
import {BaseStorage} from "./BaseStorage.t.sol";

/// @notice Base contract for all test contracts extends BaseStorage
/// @dev Provides setup modifier and cheat code setup
/// @dev inherits Storage, Testing constants assertions and utils needed for testing
abstract contract BaseTest is BaseStorage, PropertiesConstants, StdAsserts, StdUtils {
    bool public IS_TEST = true;

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                   ACTOR PROXY MECHANISM                                   //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /// @dev Actor proxy mechanism
    modifier setup() virtual {
        actor = actors[msg.sender];
        _;
        actor = Actor(payable(address(0)));
    }

    /// @dev Selector for the market type
    modifier onlyTargetMarket(MarketType _type) {
        if (targetType == _type){
            _;
        }
    }

        /// @dev Solves medusa backward time warp issue
    modifier monotonicTimestamp() virtual {
        (, uint64 lastAccrued) = ITarget(target).accrueInfo();
        if (block.timestamp < lastAccrued) {
            vm.warp(lastAccrued);
        }
        _;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                     CHEAT CODE SETUP                                      //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /// @dev Cheat code address, 0x7109709ECfa91a80626fF3989D68f67F5b1DD12D.
    address internal constant VM_ADDRESS = address(uint160(uint256(keccak256("hevm cheat code"))));

    Vm internal constant vm = Vm(VM_ADDRESS);

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                          HELPERS                                          //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function _makeAddr(string memory name) internal pure returns (address addr) {
        uint256 privateKey = uint256(keccak256(abi.encodePacked(name)));
        addr = vm.addr(privateKey);
    }

    function _getRandomActor(uint256 _i) internal view returns (address) {
        uint256 _actorIndex = _i % NUMBER_OF_ACTORS;
        return actorAddresses[_actorIndex];
    }

    function _getElasticDebtOf(address _actor, bool _roundUp) internal view returns (uint256) {
        Rebase memory _totalBorrow = ITarget(target).totalBorrow();
        return RebaseLibrary.toElastic(_totalBorrow, Market(target).userBorrowPart(_actor), _roundUp);
    }

    function _toElastic(uint256 _base, bool _roundUp) internal view returns (uint256) {
        Rebase memory _totalBorrow = ITarget(target).totalBorrow();
        return RebaseLibrary.toElastic(_totalBorrow, _base, _roundUp);
    }

    /// @notice returns the value in USD locked in the system: debt + collateral
    function _getTotalSystemValueBigBang() internal view returns (uint256) {
        uint256 debt = bigBang.getTotalDebt();
        uint256 debtValue = debt;

        uint256 collateralAmount = yieldbox.toAmount(assetIds[address(erc20Mock)], bigBang.totalCollateralShare(), false);
        (, uint256 quote) = oracle.get("");
        uint256 collateralValue = collateralAmount * (1e18 / quote);

        return collateralValue - debtValue;
    }
}

/// @notice Helper interface for the accrueInfo function 
interface ITarget {
    function accrueInfo() external view returns (uint64, uint64);

    function totalBorrow() external view returns (Rebase memory);
}
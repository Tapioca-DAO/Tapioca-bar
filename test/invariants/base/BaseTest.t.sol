// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Contracts
import {MarketStateView as Market} from "contracts/markets/MarketStateView.sol";
import {ERC20WithoutStrategy, IStrategy} from "yieldbox/strategies/ERC20WithoutStrategy.sol";

// Libraries
import {Vm} from "forge-std/Base.sol";
import {StdUtils} from "forge-std/StdUtils.sol";
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

// Utils
import {Actor} from "../utils/Actor.sol";
import {PropertiesConstants} from "../utils/PropertiesConstants.sol";
import {StdAsserts} from "../utils/StdAsserts.sol";
import {TokenType} from "yieldbox/enums/YieldBoxTokenType.sol";
import "forge-std/console.sol";

// Interfaces
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";
import {ITarget} from "test/invariants/base/BaseStorage.t.sol";

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
        (, uint64 lastAccrued) = targetContract.accrueInfo();
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
        Rebase memory _totalBorrow = targetContract._totalBorrow();
        return RebaseLibrary.toElastic(_totalBorrow, Market(target)._userBorrowPart(_actor), _roundUp);
    }

    function _toElastic(uint256 _base, bool _roundUp) internal view returns (uint256) {
        Rebase memory _totalBorrow = targetContract._totalBorrow();
        console.log("totalBorrow.elastic: %s", _totalBorrow.elastic);
        console.log("totalBorrow.base: %s", _totalBorrow.base);
        return RebaseLibrary.toElastic(_totalBorrow, _base, _roundUp);
    }

    /// @notice returns the value in USD locked in the system: debt + collateral
    function _getTotalSystemValueBigBang() internal view returns (uint256) {
        uint256 debt = bigBang.getTotalDebt();
        uint256 debtValue = debt;        

        uint256 collateralAmount = yieldbox.toAmount(bigBang._collateralId(), bigBang._totalCollateralShare(), false);
        (, uint256 quote) = oracle.get("");
        uint256 collateralValue = collateralAmount * (1e18 / quote);

        if (debtValue > collateralValue) {
            return 0;
        } else {
           return collateralValue - debtValue;//TODO make this a int
        }
    }

    function _updatedExchangeRate() internal returns (uint256 rate) {
        (, rate) = ITapiocaOracle(Market(target)._oracle()).get("");
    }

    /// @notice helper function to determine if a user is solvent
    function _isSolvent(address user, uint256 _exchangeRate, bool _liquidation) internal view returns (bool) {
        // accrue must have already been called!
        uint256 borrowPart = Market(target)._userBorrowPart(user);
        if (borrowPart == 0) return true;
        uint256 collateralShare = Market(target)._userCollateralShare(user);
        if (collateralShare == 0) return false;

        Rebase memory _totalBorrow = targetContract._totalBorrow();

        uint256 collateralAmount = yieldbox.toAmount(Market(target)._collateralId(), collateralShare, false);
        uint256 collateral = collateralAmount * (1e18 / 1e5)
            * (_liquidation ? Market(target)._liquidationCollateralizationRate() : Market(target)._collateralizationRate());
        
        // Moved exchangeRate here instead of dividing the other side to preserve more precision
        uint256 liability = (borrowPart * _totalBorrow.elastic * _exchangeRate) / _totalBorrow.base;

        console.log("collateral: %s", collateral);

        return collateral >= liability;
    }


    function _createYieldBoxEmptyStrategy(address _yieldBox, address _erc20) internal returns (ERC20WithoutStrategy) {
        return new ERC20WithoutStrategy(IYieldBox(_yieldBox), IERC20(_erc20));
    }

    function _registerYieldBoxAsset(address _yieldBox, address _token, address _strategy) public returns (uint256) {
        return IYieldBox(_yieldBox).registerAsset(TokenType.ERC20, _token, _strategy, 0);
    }

    function _setUpYieldBoxAsset(address _yieldBox, address _token) public returns (uint256 _assetId) {
        address _strategy = address(_createYieldBoxEmptyStrategy(_yieldBox, _token));
        _assetId = _registerYieldBoxAsset(_yieldBox, _token, _strategy);
        yieldboxAssets.push(_token);
    }
}
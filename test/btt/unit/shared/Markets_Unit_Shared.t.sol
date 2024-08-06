// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// mocks
import {OracleMock_test} from "../../mocks/OracleMock_test.sol";
import {ERC20Mock_test} from "../../mocks/ERC20Mock_test.sol";

// Tapioca
import {MarketHelper} from "contracts/markets/MarketHelper.sol";
import {TokenType} from "yieldbox/enums/YieldBoxTokenType.sol";

import {IStrategy} from "yieldbox/interfaces/IStrategy.sol";

// tests
import {Base_Test} from "../../Base_Test.t.sol";

abstract contract Markets_Unit_Shared is Base_Test {
    // ************ //
    // *** VARS *** //
    // ************ //
    ERC20Mock_test randomCollateral;
    uint256 randomCollateralId;

    OracleMock_test oracle; // main markets oracle

    MarketHelper public marketHelper;

    // ************* //
    // *** SETUP *** //
    // ************* //
    function setUp() public virtual override {
        super.setUp();

        marketHelper = new MarketHelper();

        // create default markets oracle
        oracle = _createOracle("Default oracle");

        // create random collateral token
        randomCollateral = _createToken("RandomCollateral");
        // create YieldBox id for random token mock
        randomCollateralId = yieldBox.registerAsset(
            TokenType.ERC20,
            address(randomCollateral),
            IStrategy(address(_createEmptyStrategy(address(yieldBox), address(randomCollateral)))),
            0
        );
    }
}

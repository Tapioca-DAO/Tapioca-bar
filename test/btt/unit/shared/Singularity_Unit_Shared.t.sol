// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca
import {SGLLiquidation} from "contracts/markets/singularity/SGLLiquidation.sol";
import {SGLCollateral} from "contracts/markets/singularity/SGLCollateral.sol";
import {SGLLeverage} from "contracts/markets/singularity/SGLLeverage.sol";
import {Singularity} from "contracts/markets/singularity/Singularity.sol";
import {SGLBorrow} from "contracts/markets/singularity/SGLBorrow.sol";

import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";

// tests
import {Markets_Unit_Shared} from "./Markets_Unit_Shared.t.sol";

abstract contract Singularity_Unit_Shared is Markets_Unit_Shared {
    // ************* //
    // *** SETUP *** //
    // ************* //
    function setUp() public virtual override {
        super.setUp();
    }

    // **************** //
    // *** INTERNAL *** //
    // **************** //
    function _getSingularityInitData(SingularityInitData memory _sgl, address _penrose)
        internal
        returns (
            Singularity._InitMemoryModulesData memory modulesData,
            Singularity._InitMemoryTokensData memory tokensData,
            Singularity._InitMemoryData memory data
        )
    {
        SGLLiquidation sglLiq = new SGLLiquidation();
        SGLBorrow sglBorrow = new SGLBorrow();
        SGLCollateral sglCollateral = new SGLCollateral();
        SGLLeverage sglLev = new SGLLeverage();

        modulesData = Singularity._InitMemoryModulesData(
            address(sglLiq), address(sglBorrow), address(sglCollateral), address(sglLev)
        );

        tokensData = Singularity._InitMemoryTokensData(_sgl.asset, _sgl.assetId, _sgl.collateral, _sgl.collateralId);

        data = Singularity._InitMemoryData(
            IPenrose(_penrose), ITapiocaOracle(address(_sgl.oracle)), 0, 75000, 80000, _sgl.leverageExecutor
        );
    }
}

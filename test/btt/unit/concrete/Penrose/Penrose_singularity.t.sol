// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

// dependencies
import {ILeverageExecutor} from "tap-utils/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tap-utils/interfaces/periph/ITapiocaOracle.sol";

import {Singularity} from "contracts/markets/singularity/Singularity.sol";

import {Singularity_Unit_Shared} from "../../shared/Singularity_Unit_Shared.t.sol";
import {IPenrose} from "tap-utils/interfaces/bar/IPenrose.sol";

contract Penrose_singularity is Singularity_Unit_Shared {
    function test_RevertWhen_RegisterSingularityIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");
        penrose.registerSingularityMasterContract(rndAddr, IPenrose.ContractType.lowRisk);

        vm.startPrank(userA);
        vm.expectRevert();
        penrose.registerSingularity(rndAddr, "0x", false);
        vm.stopPrank();
    }

    function test_RevertWhen_RegisterSingularityIsCalledFromOwnerForNon_registeredMasterContract() external {
        address rndAddr = makeAddr("rndAddress");
        vm.expectRevert();
        penrose.registerSingularity(rndAddr, "0x", false);
    }

    function test_RevertWhen_RegisterSingularityIsCalledFromOwnerForAddress0() external {
        address rndAddr = makeAddr("rndAddress");
        penrose.registerSingularityMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
        vm.expectRevert();
        penrose.registerSingularity(address(0), "0x", false);
    }

    function test_WhenRegisterSingularityIsCalledFromOwnerForNewContract() external {
        address rndAddr = makeAddr("rndAddress");
        penrose.registerSingularityMasterContract(rndAddr, IPenrose.ContractType.lowRisk);

        (
            Singularity._InitMemoryModulesData memory modulesData,
            Singularity._InitMemoryTokensData memory tokensData,
            Singularity._InitMemoryData memory data
        ) = _getSingularityInitData(
            SingularityInitData(
                address(penrose),
                IERC20(address(mainToken)), //asset
                mainTokenId,
                IERC20(address(usdo)), //collateral
                usdoId,
                ITapiocaOracle(address(rndAddr)),
                ILeverageExecutor(address(rndAddr))
            ),
            address(penrose)
        );
        address _contract = penrose.registerSingularity(rndAddr, abi.encode(modulesData, tokensData, data), true);
        assertTrue(penrose.isMarketRegistered(_contract));
    }

    function test_RevertWhen_AddSingularityIsCalledFromNon_owner() external {
        address rndAddr = makeAddr("rndAddress");
        penrose.registerSingularityMasterContract(rndAddr, IPenrose.ContractType.lowRisk);

        vm.startPrank(userA);
        vm.expectRevert();
        penrose.addSingularity(rndAddr, rndAddr);
        vm.stopPrank();
    }

    function test_RevertWhen_AddSingularityIsCalledFromOwnerForNon_registeredMasterContract() external {
        address rndAddr = makeAddr("rndAddress");
        vm.expectRevert();
        penrose.addSingularity(rndAddr, rndAddr);
    }

    function test_RevertWhen_AddSingularityIsCalledFromOwnerForAlreadyRegisteredContract() external {
        address rndAddr = makeAddr("rndAddress");
        penrose.registerSingularityMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
        penrose.addSingularity(rndAddr, rndAddr);
        vm.expectRevert();
        penrose.addSingularity(rndAddr, rndAddr);
    }

    function test_WhenAddSingularityIsCalledFromOwnerForNewContract() external {
        address rndAddr = makeAddr("rndAddress");
        penrose.registerSingularityMasterContract(rndAddr, IPenrose.ContractType.lowRisk);
        penrose.addSingularity(rndAddr, rndAddr);
        assertTrue(penrose.isMarketRegistered(rndAddr));
    }
}

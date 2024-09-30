// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.22;

import "forge-std/Test.sol";

// Tapioca
import {ICluster} from "tap-utils/interfaces/periph/ICluster.sol";
import {Cluster} from "tap-utils/Cluster/Cluster.sol";

import {EpochManager} from "contracts/EpochManager.sol";


contract EpochManagerTest is Test {
    Cluster cluster;
    EpochManager epochCtr;

    uint256 randomnessFactor;

    function setUp() public {
        randomnessFactor = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao)));

        cluster = new Cluster(1, address(this));

        epochCtr = new EpochManager(ICluster(address(cluster)), address(this));
    }

    function test_Brackets_EpochManager() public {
        uint256 epochLength = 10;

        for (uint256 i; i < epochLength; i++) {
            uint256 participation = _getRandomAmount(100, 100_000_000);
            _logEpochInfo(participation);
            epochCtr.participate(address(this), participation, epochCtr.lockDurationBracket2());
            vm.roll(100);
            epochCtr.updateEpoch();
        }

    }

    function _logEpochInfo(uint256 lockThisEpoch) private view {
        // Log the current epoch and bracket information

        uint256 prev = (epochCtr.totalForPreviousEpoch()) /1e18;
        uint256 crt = lockThisEpoch /1e18;
        bool willDecay = crt < prev;
        console.log("------------------------------------");
        console.log("|Epoch: %d", epochCtr.currentEpochNumber());
        console.log("|  >prev total:     %d ", prev);
        console.log("|  >current total:  %s ", crt);
        console.log("|  >it will decay?: %s ",  willDecay ? "YES": "NO");
        console.log("------------------------------------");
        console.log("[25%% bracket ]  -> need to lock for [%d] epochs", epochCtr.lockDurationBracket1());
        console.log("[50%% bracket ]  -> need to lock for [%d] epochs", epochCtr.lockDurationBracket2());
        console.log("[75%% bracket ]  -> need to lock for [%d] epochs", epochCtr.lockDurationBracket3());
        console.log("[100%% bracket]  -> need to lock for [%d] epochs", epochCtr.lockDurationBracket4());
        console.log("\n\n");
    }

    function _getRandomAmount(uint256 minAmount, uint256 maxAmount) private returns (uint256) {
        randomnessFactor = uint256(keccak256(abi.encodePacked(randomnessFactor, block.timestamp, block.prevrandao)));
        uint256 randomAmount = minAmount + (randomnessFactor % (maxAmount - minAmount + 1));
        return randomAmount * 1e18;
    }

}
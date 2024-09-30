// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Tapioca
import {ICluster} from "tap-utils/interfaces/periph/ICluster.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract EpochManager is Ownable {
    // ************ //
    // *** VARS *** //
    // ************ //

    ICluster public cluster;

    // Keeps track of the current epoch
    uint256 public currentEpochNumber;

    // Epoch floor values for different brackets
    uint256 public epochFloorBracket1 = 1;
    uint256 public epochFloorBracket2 = 2;
    uint256 public epochFloorBracket3 = 3;
    uint256 public epochFloorBracket4 = 4;

    // Epoch ceiling values for different brackets
    uint256 public epochCeilingBracket1 = 16;
    uint256 public epochCeilingBracket2 = 25;
    uint256 public epochCeilingBracket3 = 36;
    uint256 public epochCeilingBracket4 = 52;

    // Growth rates for epoch durations in different brackets
    uint256 public growthRateBracket1 = 1;
    uint256 public growthRateBracket2 = 2;
    uint256 public growthRateBracket3 = 3;
    uint256 public growthRateBracket4 = 4;

    // Decay rate
    uint256 public epochDecayValue = 1;

    // Current lock durations
    uint256 public lockDurationBracket1;
    uint256 public lockDurationBracket2;
    uint256 public lockDurationBracket3;
    uint256 public lockDurationBracket4;

    // Total amounts for previous and current epochs
    uint256 public totalForPreviousEpoch = 0;
    uint256 public totalForCurrentEpoch = 0;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    event DecayValueUpdated(uint256 previousDecay, uint256 newDecay);
    event CeilingValueUpdated(uint256 previousCeiling, uint256 newCeiling);
    event FloorValueUpdated(uint256 previousFloor, uint256 newFloor);
    event EpochUpdated(uint256 previousEpoch, uint256 newEpoch);
    event GrowthRateBracketUpdated(uint256 bracket, uint256 previousRate, uint256 newRate);
    event EpochDecayValueUpdated(uint256 previousValue, uint256 newValue);
    event EpochFloorBracketUpdated(uint256 bracket, uint256 previousFloor, uint256 newFloor);
    event EpochCeilingBracketUpdated(uint256 bracket, uint256 previousCeiling, uint256 newCeiling);
    event NewEpoch(uint256 _totalCurrentEpoch, uint256 _prevEpochTotal, bool isDecay);

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error NotAuthorized();
    error InvalidEpochFloorValue();
    error InvalidEpochCeilingValue();
    error InvalidGrowthRateValue();
    error InvalidEpochDecayValue();

    constructor(ICluster _cluster, address _owner) {
        if (_owner == address(0)) revert NotAuthorized();

        lockDurationBracket1 = growthRateBracket1;
        lockDurationBracket2 = growthRateBracket2;
        lockDurationBracket3 = growthRateBracket3;
        lockDurationBracket4 = growthRateBracket4;

        currentEpochNumber = 1;

        cluster = _cluster;

        _transferOwnership(_owner);
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    function participate(address, uint256 _amount, uint256) external virtual {
        totalForCurrentEpoch += _amount;
    }

    function updateEpoch() external {
        // if (msg.sender != owner() && !cluster.hasRole(msg.sender, keccak256("NEW_EPOCH"))) revert NotAuthorized();

        currentEpochNumber++;

        uint256 _prevEpochTotal = totalForPreviousEpoch;
        uint256 _currentEpochTotal = totalForCurrentEpoch;
        bool isDecayActive = _currentEpochTotal < _prevEpochTotal;

        totalForPreviousEpoch = _currentEpochTotal;
        totalForCurrentEpoch = 0;

        if (isDecayActive) {
            lockDurationBracket1 = _applyDecay(lockDurationBracket1, epochDecayValue, epochFloorBracket1);
            lockDurationBracket2 = _applyDecay(lockDurationBracket2, epochDecayValue, epochFloorBracket2);
            lockDurationBracket3 = _applyDecay(lockDurationBracket3, epochDecayValue, epochFloorBracket3);
            lockDurationBracket4 = _applyDecay(lockDurationBracket4, epochDecayValue, epochFloorBracket4);
        } else {
            lockDurationBracket1 = _applyGrowth(lockDurationBracket1, growthRateBracket1, epochCeilingBracket1);
            lockDurationBracket2 = _applyGrowth(lockDurationBracket2, growthRateBracket2, epochCeilingBracket2);
            lockDurationBracket3 = _applyGrowth(lockDurationBracket3, growthRateBracket3, epochCeilingBracket3);
            lockDurationBracket4 = _applyGrowth(lockDurationBracket4, growthRateBracket4, epochCeilingBracket4);
        }

        emit NewEpoch(_currentEpochTotal, _prevEpochTotal, isDecayActive);
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    function setGrowthRateBracket1(uint256 _rate) external onlyOwner {
        if (_rate == 0) revert InvalidGrowthRateValue();
        uint256 previousRate = growthRateBracket1;
        growthRateBracket1 = _rate;
        emit GrowthRateBracketUpdated(1, previousRate, _rate);
    }

    function setGrowthRateBracket2(uint256 _rate) external onlyOwner {
        if (_rate == 0) revert InvalidGrowthRateValue();
        uint256 previousRate = growthRateBracket2;
        growthRateBracket2 = _rate;
        emit GrowthRateBracketUpdated(2, previousRate, _rate);
    }

    function setGrowthRateBracket3(uint256 _rate) external onlyOwner {
        if (_rate == 0) revert InvalidGrowthRateValue();
        uint256 previousRate = growthRateBracket3;
        growthRateBracket3 = _rate;
        emit GrowthRateBracketUpdated(3, previousRate, _rate);
    }

    function setGrowthRateBracket4(uint256 _rate) external onlyOwner {
        if (_rate == 0) revert InvalidGrowthRateValue();
        uint256 previousRate = growthRateBracket4;
        growthRateBracket4 = _rate;
        emit GrowthRateBracketUpdated(4, previousRate, _rate);
    }

    function setEpochDecayValue(uint256 _value) external onlyOwner {
        if (_value == 0) revert InvalidEpochDecayValue();
        uint256 previousValue = epochDecayValue;
        epochDecayValue = _value;
        emit EpochDecayValueUpdated(previousValue, _value);
    }

    // sets the floor value for bracket 1
    function setEpochFloorBracket1(uint256 _floor) external onlyOwner {
        if (_floor == 0) revert InvalidEpochFloorValue();
        uint256 previousFloor = epochFloorBracket1;
        epochFloorBracket1 = _floor;
        emit EpochFloorBracketUpdated(1, previousFloor, _floor);
    }

    // sets the floor value for bracket 2
    function setEpochFloorBracket2(uint256 _floor) external onlyOwner {
        if (_floor == 0) revert InvalidEpochFloorValue();
        uint256 previousFloor = epochFloorBracket2;
        epochFloorBracket2 = _floor;
        emit EpochFloorBracketUpdated(2, previousFloor, _floor);
    }

    // sets the floor value for bracket 3
    function setEpochFloorBracket3(uint256 _floor) external onlyOwner {
        if (_floor == 0) revert InvalidEpochFloorValue();
        uint256 previousFloor = epochFloorBracket3;
        epochFloorBracket3 = _floor;
        emit EpochFloorBracketUpdated(3, previousFloor, _floor);
    }

    // sets the floor value for bracket 4
    function setEpochFloorBracket4(uint256 _floor) external onlyOwner {
        if (_floor == 0) revert InvalidEpochFloorValue();
        uint256 previousFloor = epochFloorBracket4;
        epochFloorBracket4 = _floor;
        emit EpochFloorBracketUpdated(4, previousFloor, _floor);
    }

    // sets the ceiling value for bracket 1
    function setEpochCeilingBracket1(uint256 _ceiling) external onlyOwner {
        if (_ceiling == 0) revert InvalidEpochCeilingValue();
        uint256 previousCeiling = epochCeilingBracket1;
        epochCeilingBracket1 = _ceiling;
        emit EpochCeilingBracketUpdated(1, previousCeiling, _ceiling);
    }

    // sets the ceiling value for bracket 2
    function setEpochCeilingBracket2(uint256 _ceiling) external onlyOwner {
        if (_ceiling == 0) revert InvalidEpochCeilingValue();
        uint256 previousCeiling = epochCeilingBracket2;
        epochCeilingBracket2 = _ceiling;
        emit EpochCeilingBracketUpdated(2, previousCeiling, _ceiling);
    }

    // sets the ceiling value for bracket 3
    function setEpochCeilingBracket3(uint256 _ceiling) external onlyOwner {
        if (_ceiling == 0) revert InvalidEpochCeilingValue();
        uint256 previousCeiling = epochCeilingBracket3;
        epochCeilingBracket3 = _ceiling;
        emit EpochCeilingBracketUpdated(3, previousCeiling, _ceiling);
    }

    // sets the ceiling value for bracket 4
    function setEpochCeilingBracket4(uint256 _ceiling) external onlyOwner {
        if (_ceiling == 0) revert InvalidEpochCeilingValue();
        uint256 previousCeiling = epochCeilingBracket4;
        epochCeilingBracket4 = _ceiling;
        emit EpochCeilingBracketUpdated(4, previousCeiling, _ceiling);
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _applyDecay(uint256 duration, uint256 decayValue, uint256 floor) private pure returns (uint256) {
        return duration > floor ? duration - decayValue : floor;
    }

    // Internal function to apply growth
    function _applyGrowth(uint256 duration, uint256 growthRate, uint256 ceiling) private pure returns (uint256) {
        return duration < ceiling ? duration + growthRate : ceiling;
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

contract CounterTest is Test {

  uint256 counter;
    function setUp() public {
       counter = 0;
    }

    function testIncrement() public {
      counter += 123;
    }

    function testSetNumber(uint256 x) public {

    }
}
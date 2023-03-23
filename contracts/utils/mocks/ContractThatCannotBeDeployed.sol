// SPDX-License-Identifier: UNLICENSED
pragma solidity >0.8.0;

contract ContractThatCannotBeDeployed {
    string public revertStr = "This method reverted. So awesome!";

    constructor() {
        revert(revertStr);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICurveMinter {
    // solhint-disable-next-line var-name-mixedcase
    function mint(address _gauge_addr) external;
}

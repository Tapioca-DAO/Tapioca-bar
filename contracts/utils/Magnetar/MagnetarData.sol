// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

abstract contract MagnetarData {
    uint16 internal constant PERMIT_ALL = 1;
    uint16 internal constant PERMIT = 2;
    uint16 internal constant YB_DEPOSIT_ASSET = 3;
    uint16 internal constant YB_WITHDRAW_ASSET = 4;
    uint16 internal constant SGL_ADD_COLLATERAL = 5;
    uint16 internal constant SGL_BORROW = 6;
    uint16 internal constant SGL_WITHDRAW_TO = 7;
    uint16 internal constant SGL_LEND = 8;
    uint16 internal constant SGL_REPAY = 9;
    uint16 internal constant TOFT_WRAP = 10;
    uint16 internal constant TOFT_SEND_FROM = 11;
    uint16 internal constant TOFT_SEND_APPROVAL = 12;
    uint16 internal constant TOFT_SEND_AND_BORROW = 13;
    uint16 internal constant TOFT_SEND_AND_LEND = 14;
    uint16 internal constant TOFT_SEND_YB = 15;
    uint16 internal constant TOFT_RETRIEVE_YB = 16;
    uint16 internal constant HELPER_LEND = 17;
    uint16 internal constant HELPER_BORROW = 18;

    struct Call {
        uint16 id;
        address target;
        uint256 value;
        bool allowFailure;
        bytes call;
    }

    struct Result {
        bool success;
        bytes returnData;
    }
}

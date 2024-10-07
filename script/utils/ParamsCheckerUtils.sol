// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

abstract contract ParamsCheckerUtils {
    address public constant EXPECTED_CLUSTER = address(0);
    address public constant EXPECTED_YIELDBOX = address(0);
    address public constant EXPECTED_TAP = address(0);
    address public constant EXPECTED_USDO = address(0);

    function addressToString(address x) internal pure returns (string memory) {
        bytes memory data = abi.encodePacked(x);
        bytes memory characters = "0123456789abcdef";
        bytes memory result = new bytes(2 + data.length * 2);
        result[0] = "0";
        result[1] = "x";
        for (uint256 i = 0; i < data.length; i++) {
            result[2 + i * 2] = characters[uint256(uint8(data[i] >> 4))];
            result[3 + i * 2] = characters[uint256(uint8(data[i] & 0x0f))];
        }
        return string(result);
    }

    function uintToString(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len - 1;
        while (_i != 0) {
            bstr[k--] = bytes1(uint8(48 + _i % 10));
            _i /= 10;
        }
        return string(bstr);
    }
}

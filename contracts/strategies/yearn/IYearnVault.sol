// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IYearnVault {
    function pricePerShare() external view returns (uint256);

    function deposit(uint256 _amount, address _recipient)
        external
        returns (uint256);

    function withdraw(
        uint256 _maxShares,
        address _recipient,
        uint256 _maxLoss
    ) external returns (uint256);

    function balanceOf(address _recipient) external view returns (uint256);

    function token() external view returns (address);

    function decimals() external view returns (uint256);

    function governance() external view returns (address);

    function management() external view returns (address);

    function guardian() external view returns (address);

    function emergencyShutdown() external view returns (bool);

    function depositLimit() external view returns (uint256);
}

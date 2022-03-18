// SPDX-License-Identifier: UNLICENSED

// Copyright (c) 2021, 2022 BoringCrypto - All rights reserved
// Twitter: @Boring_Crypto

pragma solidity 0.8.9;
pragma abicoder v2;
import './interfaces/IWrappedNative.sol';
import './interfaces/IStrategy.sol';
import '@boringcrypto/boring-solidity/contracts/interfaces/IERC1155.sol';
import '@boringcrypto/boring-solidity/contracts/libraries/Base64.sol';
import '@boringcrypto/boring-solidity/contracts/Domain.sol';
import './ERC1155TokenReceiver.sol';
import './ERC1155.sol';
import '@boringcrypto/boring-solidity/contracts/BoringBatchable.sol';
import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';
import '@openzeppelin/contracts/utils/Strings.sol';
import './AssetRegister.sol';
import './NativeTokenFactory.sol';
import './YieldBoxRebase.sol';
import './YieldBoxURIBuilder.sol';

// solhint-disable no-empty-blocks

/// @title BeachBar
/// @author BoringCrypto, Keno
/// @notice The BeachBar is a vault for tokens. The stored tokens can assigned to strategies.
/// Yield from this will go to the token depositors.
/// Any funds transfered directly onto the BeachBar will be lost, use the deposit function instead.
contract BeachBar is BoringBatchable, NativeTokenFactory, ERC1155TokenReceiver {
    using BoringAddress for address;
    using BoringERC20 for IERC20;
    using BoringERC20 for IWrappedNative;
    using YieldBoxRebase for uint256;

    // ************** //
    // *** EVENTS *** //
    // ************** //

    // TODO: Add events

    // ******************* //
    // *** CONSTRUCTOR *** //
    // ******************* //

    IWrappedNative public immutable wrappedNative;
    YieldBoxURIBuilder public immutable uriBuilder;

    constructor(IWrappedNative wrappedNative_, YieldBoxURIBuilder uriBuilder_) {
        wrappedNative = wrappedNative_;
        uriBuilder_.setYieldBox();
        uriBuilder = uriBuilder_;
    }

    // ************************** //
    // *** INTERNAL FUNCTIONS *** //
    // ************************** //

    /// @dev Returns the total balance of `token` this contracts holds,
    /// plus the total amount this contract thinks the strategy holds.
    function _tokenBalanceOf(Asset storage asset) internal view returns (uint256 amount) {
        if (asset.strategy == NO_STRATEGY) {
            if (asset.tokenType == TokenType.ERC20) {
                return IERC20(asset.contractAddress).safeBalanceOf(address(this));
            } else {
                return IERC1155(asset.contractAddress).balanceOf(address(this), asset.tokenId);
            }
        } else {
            return asset.strategy.currentBalance();
        }
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice Deposit an amount of `token` represented in either `amount` or `share`.
    /// @param assetId The id of the asset.
    /// @param from which account to pull the tokens.
    /// @param to which account to push the tokens.
    /// @param amount Token amount in native representation to deposit.
    /// @param share Token amount represented in shares to deposit. Takes precedence over `amount`.
    /// @return amountOut The amount deposited.
    /// @return shareOut The deposited amount repesented in shares.
    function depositAsset(
        uint256 assetId,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) public allowed(from) returns (uint256 amountOut, uint256 shareOut) {
        // Checks
        Asset storage asset = assets[assetId];
        require(asset.tokenType != TokenType.Native, "BeachBar: can't deposit Native");

        // Effects
        uint256 totalAmount = _tokenBalanceOf(asset);
        if (share == 0) {
            // value of the share may be lower than the amount due to rounding, that's ok
            share = amount._toShares(totalSupply[assetId], totalAmount, false);
        } else {
            // amount may be lower than the value of share due to rounding, in that case, add 1 to amount (Always round up)
            amount = share._toAmount(totalSupply[assetId], totalAmount, true);
        }

        _mint(to, assetId, share);

        address destination = asset.strategy == NO_STRATEGY ? address(this) : address(asset.strategy);

        // Interactions
        if (asset.tokenType == TokenType.ERC20) {
            IERC20(asset.contractAddress).safeTransferFrom(from, destination, amount);
        } else {
            // ERC1155
            // When depositing BeachBar tokens into the BeachBar, things can be simplified
            if (asset.contractAddress == address(this)) {
                _transferSingle(from, destination, asset.tokenId, amount);
            } else {
                IERC1155(asset.contractAddress).safeTransferFrom(from, destination, asset.tokenId, amount, '');
            }
        }

        if (asset.strategy != NO_STRATEGY) {
            asset.strategy.deposited(amount);
        }

        return (amount, share);
    }

    function depositETHAsset(
        uint256 assetId,
        address to,
        uint256 amount
    )
        public
        payable
        returns (
            // TODO: allow shares with refund?
            uint256 amountOut,
            uint256 shareOut
        )
    {
        // Checks
        Asset storage asset = assets[assetId];
        require(asset.tokenType == TokenType.ERC20 && asset.contractAddress == address(wrappedNative), 'BeachBar: not wrappedNative');

        // Effects
        uint256 share = amount._toShares(totalSupply[assetId], _tokenBalanceOf(asset), false);

        _mint(to, assetId, share);

        // Interactions
        wrappedNative.deposit{value: amount}();
        if (asset.strategy != NO_STRATEGY) {
            // Strategies always receive wrappedNative (supporting both wrapped and raw native tokens adds too much complexity)
            wrappedNative.safeTransfer(address(asset.strategy), amount);
        }

        if (asset.strategy != NO_STRATEGY) {
            asset.strategy.deposited(amount);
        }

        return (amount, share);
    }

    /// @notice Withdraws an amount of `token` from a user account.
    /// @param assetId The id of the asset.
    /// @param from which user to pull the tokens.
    /// @param to which user to push the tokens.
    /// @param amount of tokens. Either one of `amount` or `share` needs to be supplied.
    /// @param share Like above, but `share` takes precedence over `amount`.
    function withdraw(
        uint256 assetId,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) public allowed(from) returns (uint256 amountOut, uint256 shareOut) {
        // Checks
        Asset storage asset = assets[assetId];
        require(asset.tokenType != TokenType.Native, "BeachBar: can't withdraw Native");

        // Effects
        uint256 totalAmount = _tokenBalanceOf(asset);
        if (share == 0) {
            // value of the share paid could be lower than the amount paid due to rounding, in that case, add a share (Always round up)
            share = amount._toShares(totalSupply[assetId], totalAmount, true);
        } else {
            // amount may be lower than the value of share due to rounding, that's ok
            amount = share._toAmount(totalSupply[assetId], totalAmount, false);
        }

        _burn(from, assetId, share);

        // Interactions
        if (asset.strategy == NO_STRATEGY) {
            if (asset.tokenType == TokenType.ERC20) {
                // Native tokens are always unwrapped when withdrawn
                if (asset.contractAddress == address(wrappedNative)) {
                    wrappedNative.withdraw(amount);
                    to.sendNative(amount);
                } else {
                    IERC20(asset.contractAddress).safeTransfer(to, amount);
                }
            } else {
                // IERC1155
                IERC1155(asset.contractAddress).safeTransferFrom(address(this), to, asset.tokenId, amount, '');
            }
        } else {
            asset.strategy.withdraw(to, amount);
        }

        return (amount, share);
    }

    function _requireTransferAllowed(address from) internal view override allowed(from) {}

    /// @notice Transfer shares from a user account to another one.
    /// @param from which user to pull the tokens.
    /// @param to which user to push the tokens.
    /// @param assetId The id of the asset.
    /// @param share The amount of `token` in shares.
    function transfer(
        address from,
        address to,
        uint256 assetId,
        uint256 share
    ) public allowed(from) {
        _transferSingle(from, to, assetId, share);
    }

    function batchTransfer(
        address from,
        address to,
        uint256[] calldata assetIds_,
        uint256[] calldata shares_
    ) public allowed(from) {
        _transferBatch(from, to, assetIds_, shares_);
    }

    /// @notice Transfer shares from a user account to multiple other ones.
    /// @param assetId The id of the asset.
    /// @param from which user to pull the tokens.
    /// @param tos The receivers of the tokens.
    /// @param shares The amount of `token` in shares for each receiver in `tos`.
    function transferMultiple(
        address from,
        address[] calldata tos,
        uint256 assetId,
        uint256[] calldata shares
    ) public allowed(from) {
        // Checks
        uint256 len = tos.length;
        for (uint256 i = 0; i < len; i++) {
            require(tos[i] != address(0), 'BeachBar: to not set'); // To avoid a bad UI from burning funds
        }

        // Effects
        uint256 totalAmount;
        for (uint256 i = 0; i < len; i++) {
            address to = tos[i];
            uint256 share_ = shares[i];
            balanceOf[to][assetId] += share_;
            totalAmount += share_;
            emit TransferSingle(msg.sender, from, to, assetId, share_);
        }
        balanceOf[from][assetId] -= totalAmount;
    }

    function setApprovalForAll(address operator, bool approved) external override {
        // Checks
        require(operator != address(0), 'BeachBar: operator not set'); // Important for security
        require(masterContractOf[msg.sender] == address(0), 'BeachBar: user is clone');
        require(operator != address(this), "BeachBar: can't approve BeachBar");

        // Effects
        isApprovedForAll[msg.sender][operator] = approved;

        emit ApprovalForAll(msg.sender, operator, approved);
    }

    // This functionality has been split off into a separate contract. This is only a view function, so gas usage isn't a huge issue.
    // This keeps the BeachBar contract smaller, so it can be optimized more.
    function uri(uint256 assetId) external view override returns (string memory) {
        return uriBuilder.uri(assetId);
    }

    function name(uint256 assetId) external view returns (string memory) {
        return uriBuilder.name(assetId);
    }

    function symbol(uint256 assetId) external view returns (string memory) {
        return uriBuilder.symbol(assetId);
    }

    function decimals(uint256 assetId) external view returns (uint8) {
        return uriBuilder.decimals(assetId);
    }

    // Included to support unwrapping wrapped native tokens such as WETH
    receive() external payable {}

    // Helper functions

    /// @dev Helper function to represent an `amount` of `token` in shares.
    /// @param assetId The id of the asset.
    /// @param amount The `token` amount.
    /// @param roundUp If the result `share` should be rounded up.
    /// @return share The token amount represented in shares.
    function toShare(
        uint256 assetId,
        uint256 amount,
        bool roundUp
    ) external view returns (uint256 share) {
        if (assets[assetId].tokenType == TokenType.Native) {
            share = amount;
        } else {
            share = amount._toShares(totalSupply[assetId], _tokenBalanceOf(assets[assetId]), roundUp);
        }
    }

    /// @dev Helper function represent shares back into the `token` amount.
    /// @param assetId The id of the asset.
    /// @param share The amount of shares.
    /// @param roundUp If the result should be rounded up.
    /// @return amount The share amount back into native representation.
    function toAmount(
        uint256 assetId,
        uint256 share,
        bool roundUp
    ) external view returns (uint256 amount) {
        if (assets[assetId].tokenType == TokenType.Native) {
            amount = share;
        } else {
            amount = share._toAmount(totalSupply[assetId], _tokenBalanceOf(assets[assetId]), roundUp);
        }
    }

    /// @dev Helper function represent the balance in `token` amount for a `user` for an `asset`.
    /// @param user The `user` to get the amount for.
    /// @param assetId The id of the asset.
    function amountOf(address user, uint256 assetId) external view returns (uint256 amount) {
        if (assets[assetId].tokenType == TokenType.Native) {
            amount = balanceOf[user][assetId];
        } else {
            amount = balanceOf[user][assetId]._toAmount(totalSupply[assetId], _tokenBalanceOf(assets[assetId]), false);
        }
    }

    function deposit(
        TokenType tokenType,
        address contractAddress,
        IStrategy strategy,
        uint256 tokenId,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) public returns (uint256 amountOut, uint256 shareOut) {
        if (tokenType == TokenType.Native) {
            // If native token, register it as an ERC1155 asset (as that's what it is)
            return depositAsset(registerAsset(TokenType.ERC1155, address(this), strategy, tokenId), from, to, amount, share);
        } else {
            return depositAsset(registerAsset(tokenType, contractAddress, strategy, tokenId), from, to, amount, share);
        }
    }

    function depositETH(
        IStrategy strategy,
        address to,
        uint256 amount
    ) public payable returns (uint256 amountOut, uint256 shareOut) {
        return depositETHAsset(registerAsset(TokenType.ERC20, address(wrappedNative), strategy, 0), to, amount);
    }
}

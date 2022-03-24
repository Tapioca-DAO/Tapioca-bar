// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import './AssetRegister.sol';
import '@boringcrypto/boring-solidity/contracts/BoringFactory.sol';

struct NativeToken {
    string name;
    string symbol;
    uint8 decimals;
}

/// @title NativeTokenFactory
/// @author BoringCrypto (@Boring_Crypto)
/// @notice The NativeTokenFactory is a token factory to create ERC1155 tokens. This is used by YieldBox to create
/// native tokens in YieldBox. These have many benefits:
/// - low and predictable gas usage
/// - simplified approval
/// - no hidden features, all these tokens behave the same
/// TODO: MintBatch? BurnBatch?
contract NativeTokenFactory is AssetRegister, BoringFactory {
    mapping(uint256 => NativeToken) public nativeTokens;
    mapping(uint256 => address) public tokenOwner;
    mapping(uint256 => address) public pendingTokenOwner;

    event TokenCreated(address indexed creator, string name, string symbol, uint8 decimals, uint256 tokenId);
    event OwnershipTransferred(uint256 indexed tokenId, address indexed previousTokenOwner, address indexed newTokenOwner);

    // ***************** //
    // *** MODIFIERS *** //
    // ***************** //

    /// Modifier to check if the msg.sender is allowed to use funds belonging to the 'from' address.
    /// If 'from' is msg.sender, it's allowed.
    /// If 'msg.sender' is an address (an operator) that is approved by 'from', it's allowed.
    /// If 'msg.sender' is a clone of a masterContract that is approved by 'from', it's allowed.
    modifier allowed(address from) virtual {
        if (from != msg.sender && !isApprovedForAll[from][msg.sender]) {
            address masterContract = masterContractOf[msg.sender];
            require(masterContract != address(0) && isApprovedForAll[from][masterContract], 'YieldBox: Not approved');
        }
        _;
    }

    /// @notice Only allows the `owner` to execute the function.
    /// @param tokenId The `tokenId` that the sender has to be owner of.
    modifier onlyTokenOwner(uint256 tokenId) {
        require(msg.sender == tokenOwner[tokenId], 'NTF: caller is not the owner');
        _;
    }

    /// @notice Transfers ownership to `newTokenOwner`. Either directly or claimable by the new pending tokenOwner.
    /// Can only be invoked by the current `tokenOwner`.
    /// @param tokenId The `tokenId` of the token that ownership whose ownership will be transferred/renounced.
    /// @param newTokenOwner Address of the new tokenOwner.
    /// @param direct True if `newTokenOwner` should be set immediately. False if `newTokenOwner` needs to use `claimOwnership`.
    /// @param renounce Allows the `newTokenOwner` to be `address(0)` if `direct` and `renounce` is True. Has no effect otherwise.
    function transferOwnership(
        uint256 tokenId,
        address newTokenOwner,
        bool direct,
        bool renounce
    ) public onlyTokenOwner(tokenId) {
        if (direct) {
            // Checks
            require(newTokenOwner != address(0) || renounce, 'NTF: zero address');

            // Effects
            emit OwnershipTransferred(tokenId, tokenOwner[tokenId], newTokenOwner);
            tokenOwner[tokenId] = newTokenOwner;
            pendingTokenOwner[tokenId] = address(0);
        } else {
            // Effects
            pendingTokenOwner[tokenId] = newTokenOwner;
        }
    }

    /// @notice Needs to be called by `pendingTokenOwner` to claim ownership.
    /// @param tokenId The `tokenId` of the token that ownership is claimed for.
    function claimOwnership(uint256 tokenId) public {
        address _pendingTokenOwner = pendingTokenOwner[tokenId];

        // Checks
        require(msg.sender == _pendingTokenOwner, 'NTF: caller != pending owner');

        // Effects
        emit OwnershipTransferred(tokenId, tokenOwner[tokenId], _pendingTokenOwner);
        tokenOwner[tokenId] = _pendingTokenOwner;
        pendingTokenOwner[tokenId] = address(0);
    }

    /// @notice Create a new native token. This will be an ERC1155 token. If later it's needed as an ERC20 token it can
    /// be wrapped into an ERC20 token. Native support for ERC1155 tokens is growing though.
    /// @param name The name of the token.
    /// @param symbol The symbol of the token.
    /// @param decimals The number of decimals of the token (this is just for display purposes). Should be set to 18 in normal cases.
    function createToken(
        string calldata name,
        string calldata symbol,
        uint8 decimals
    ) public returns (uint256 tokenId) {
        // To keep each Token unique in the AssetRegister, we use the assetId as the tokenId. So for native assets, the tokenId is always equal to the assetId.
        tokenId = assets.length;
        _registerAsset(TokenType.Native, address(0), NO_STRATEGY, tokenId);
        // Initial supply is 0, use owner can mint. For a fixed supply the owner can mint and revoke ownership.
        // The msg.sender is the initial owner, can be changed after.
        nativeTokens[tokenId] = NativeToken(name, symbol, decimals);
        tokenOwner[tokenId] = msg.sender;

        emit TokenCreated(msg.sender, name, symbol, decimals, tokenId);
        emit TransferSingle(msg.sender, address(0), address(0), tokenId, 0);
        emit OwnershipTransferred(tokenId, address(0), msg.sender);
    }

    /// @notice The `tokenOwner` can mint tokens. If a fixed supply is needed, the `tokenOwner` should mint the totalSupply and renounce ownership.
    /// @param tokenId The token to be minted.
    /// @param to The account to transfer the minted tokens to.
    /// @param amount The amount of tokens to mint.
    function mint(
        uint256 tokenId,
        address to,
        uint256 amount
    ) public onlyTokenOwner(tokenId) {
        _mint(to, tokenId, amount);
    }

    /// @notice Burns tokens. Only the holder of tokens can burn them.
    /// @param tokenId The token to be burned.
    /// @param amount The amount of tokens to burn.
    function burn(
        uint256 tokenId,
        address from,
        uint256 amount
    ) public allowed(from) {
        require(assets[tokenId].tokenType == TokenType.Native, 'NTF: Not native');
        _burn(msg.sender, tokenId, amount);
    }
}

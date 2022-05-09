// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.9;

import './YieldBox.sol';
import './interfaces/IWrappedNative.sol';
import './interfaces/IStrategy.sol';
import './enums/YieldBoxTokenType.sol';
import '../swappers/MultiSwapper.sol';
import '../mixologist/interfaces/IMixologist.sol';
import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';

enum ContractType {
    lowRisk,
    mediumRisk,
    highRisk
}

struct MasterContract {
    address location;
    ContractType risk;
}

// TODO: AddAsset with ERC20 id
// TODO: Permissionless market deployment
///     + asset registration? (toggle to renounce ownership so users can call)
contract BeachBar is BoringOwnable, YieldBox {
    using BoringAddress for address;
    using BoringERC20 for IERC20;
    using BoringERC20 for IWrappedNative;
    using YieldBoxRebase for uint256;

    IERC20 public immutable tapToken;
    uint256 public immutable tapAssetId;

    MasterContract[] masterContracts;

    // Used to check if a master contract is registered to be used as a Mixologist template
    mapping(address => bool) isMasterContractRegistered;

    address public feeTo; // Protocol
    address public feeVeTap; // TAP distributors

    mapping(MultiSwapper => bool) public swappers;

    constructor(
        IWrappedNative wrappedNative_,
        YieldBoxURIBuilder uriBuilder_,
        IERC20 tapToken_
    ) YieldBox(wrappedNative_, uriBuilder_) {
        tapToken = tapToken_;
        tapAssetId = uint96(
            registerAsset(
                TokenType.ERC20,
                address(tapToken_),
                IStrategy(address(0)),
                0
            )
        );
    }

    // ************************** //
    // *** OVERRIDE MODIFIERS *** //
    // ************************** //

    /// Allows a whitelisted MultiSwapper from an existing MasterContract to have access to
    /// a Mixologist funds
    /// Or an approved sender to access From funds
    /// @inheritdoc NativeTokenFactory
    modifier allowed(address from) override {
        if ((from != msg.sender && !isApprovedForAll[from][msg.sender])) {
            address masterContractSender = masterContractOf[msg.sender];
            bool isSenderApprovedMixologist = masterContractSender !=
                address(0) &&
                isApprovedForAll[from][masterContractSender];

            address masterContractFrom = masterContractOf[from];
            // Careful of what MultiSwapper can do
            bool isSenderSwapperAndFromMixologist = swappers[
                MultiSwapper(msg.sender)
            ] && masterContractFrom != address(0);
            require(
                isSenderApprovedMixologist || isSenderSwapperAndFromMixologist,
                'YieldBox: Not approved'
            );
        }
        _;
    }

    // ******************//
    // *** MODIFIERS *** //
    // ***************** //

    modifier registeredMasterContract(address mc) {
        require(
            isMasterContractRegistered[mc] == true,
            'BeachBar: MC not registered'
        );
        _;
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice Uses `assetId` to call `YieldBox.deposit()`
    function deposit(
        uint256 assetId,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) public returns (uint256 amountOut, uint256 shareOut) {
        return depositAsset(assetId, from, to, amount, share);
    }

    /// @notice Uses `assetId` to call `YieldBox.depositETH()`
    function depositETH(
        uint256 assetId,
        address to,
        uint256 amount
    ) public payable returns (uint256 amountOut, uint256 shareOut) {
        return depositETHAsset(assetId, to, amount);
    }

    // TODO: Add parameter to choose to convert fees to TAP or get it as is.
    /// @notice Loop through the master contracts and call `depositFeesToBeachBar()` to each one of their clones.
    /// @dev `swappers_` can have one element that'll be used for all clones. Or one swapper per MasterContract.
    /// @param swappers_ One or more swappers to convert the asset to TAP.
    function withdrawAllProtocolFees(MultiSwapper[] calldata swappers_) public {
        require(address(swappers_[0]) != address(0), 'BeachBar: zero address');

        uint256 masterContractLength = masterContracts.length;
        bool singleSwapper = swappers_.length != masterContractLength;

        address[] memory clonesOf_;
        // Loop through master contracts.
        for (uint256 i = 0; i < masterContractLength; ) {
            clonesOf_ = clonesOf[address(masterContracts[i].location)];
            // Loop through clones of the current MC.
            for (uint256 j = 0; j < clonesOf_.length; ) {
                IMixologist(clonesOf_[j]).depositFeesToBeachBar(
                    singleSwapper ? swappers_[0] : swappers_[i]
                );
                ++j;
            }
            ++i;
        }
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //

    /// @notice Register a master contract
    /// @param mcAddress The address of the contract
    /// @param contractType_ The risk type of the contract
    function registerMasterContract(
        address mcAddress,
        ContractType contractType_
    ) external onlyOwner {
        require(
            isMasterContractRegistered[mcAddress] == false,
            'BeachBar: MC registered'
        );

        MasterContract memory mc;
        mc.location = mcAddress;
        mc.risk = contractType_;
        masterContracts.push(mc);
        isMasterContractRegistered[mcAddress] = true;
    }

    /// @notice Register a Mixologist
    /// @param mc The address of the master contract which must be already registered
    /// @param data The init data of the Mixologist
    /// @param useCreate2 Whether to use create2 or not
    function registerMixologist(
        address mc,
        bytes calldata data,
        bool useCreate2
    ) external payable onlyOwner registeredMasterContract(mc) {
        deploy(mc, data, useCreate2);
    }

    /// @notice Execute an only owner function inside of a Mixologist market
    function executeMixologistFn(address[] calldata mc, bytes[] memory data)
        external
        onlyOwner
        returns (bool[] memory success, bytes[] memory result)
    {
        uint256 len = mc.length;
        success = new bool[](len);
        result = new bytes[](len);
        for (uint256 i = 0; i < len; ) {
            require(
                isMasterContractRegistered[masterContractOf[mc[i]]],
                'BeachBar: MC not registered'
            );
            (success[i], result[i]) = mc[i].call(data[i]);
            ++i;
        }
    }

    function setFeeTo(address feeTo_) external onlyOwner {
        feeTo = feeTo_;
    }

    function setFeeVeTap(address feeVeTap_) external onlyOwner {
        feeVeTap = feeVeTap_;
    }

    /// @notice Used to register and enable or disable swapper contracts used in closed liquidations.
    /// MasterContract Only Admin function.
    /// @param swapper The address of the swapper contract that conforms to `ISwapper`.
    /// @param enable True to enable the swapper. To disable use False.
    function setSwapper(MultiSwapper swapper, bool enable) public onlyOwner {
        swappers[swapper] = enable;
    }

    // ************************** //
    // *** OVERRIDE FUNCTIONS *** //
    // ************************** //

    /// @notice Override of `AssetRegister._registerAsset()`
    function _registerAsset(
        TokenType tokenType,
        address contractAddress,
        IStrategy strategy,
        uint256 tokenId
    ) internal override returns (uint256 assetId) {
        // Checks
        assetId = ids[tokenType][contractAddress][strategy][tokenId];

        // If assetId is 0, this is a new asset that needs to be registered
        if (assetId == 0) {
            require(
                strategy == NO_STRATEGY ||
                    (tokenType == strategy.tokenType() &&
                        contractAddress == strategy.contractAddress() &&
                        tokenId == strategy.tokenId()),
                'YieldBox: Strategy mismatch'
            );
            // If a new token gets added, the isContract checks that this is a deployed contract. Needed for security.
            // Prevents getting shares for a future token whose address is known in advance. For instance a token that will be deployed with CREATE2 in the future or while the contract creation is
            // in the mempool
            require(
                (tokenType == TokenType.Native &&
                    contractAddress == address(0)) ||
                    contractAddress.isContract(),
                'YieldBox: Not a token'
            );

            // Effects
            assetId = assets.length;
            assets.push(Asset(tokenType, contractAddress, strategy, tokenId));
            ids[tokenType][contractAddress][strategy][tokenId] = assetId;

            // The actual URI isn't emitted here as per EIP1155, because that would make this call super expensive.
            emit URI('', assetId);
            emit AssetRegistered(
                tokenType,
                contractAddress,
                strategy,
                tokenId,
                assetId
            );
        }
    }

    /// @notice Withdraws an amount of `token` from a user account.
    /// @dev Same as `YieldBox.withdraw()` except for `withdrawNative()` addition.
    /// @param assetId The id of the asset.
    /// @param from which user to pull the tokens.
    /// @param to which user to push the tokens.
    /// @param amount of tokens. Either one of `amount` or `share` needs to be supplied.
    /// @param share Like above, but `share` takes precedence over `amount`.
    /// @param withdrawNative Specifies if the wrapped native should be withdrawn as is or unwrapped native.
    function withdraw(
        uint256 assetId,
        address from,
        address to,
        uint256 amount,
        uint256 share,
        bool withdrawNative
    ) public allowed(from) returns (uint256 amountOut, uint256 shareOut) {
        // Checks
        Asset storage asset = assets[assetId];
        require(
            asset.tokenType != TokenType.Native,
            "YieldBox: can't withdraw Native"
        );

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
                if (
                    asset.contractAddress == address(wrappedNative) &&
                    withdrawNative
                ) {
                    wrappedNative.withdraw(amount);
                    to.sendNative(amount);
                } else {
                    IERC20(asset.contractAddress).safeTransfer(to, amount);
                }
            } else {
                // IERC1155
                IERC1155(asset.contractAddress).safeTransferFrom(
                    address(this),
                    to,
                    asset.tokenId,
                    amount,
                    ''
                );
            }
        } else {
            asset.strategy.withdraw(to, amount);
        }

        return (amount, share);
    }
}

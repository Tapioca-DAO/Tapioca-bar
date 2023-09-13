// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";
import "@boringcrypto/boring-solidity/contracts/BoringFactory.sol";

import "tapioca-sdk/dist/contracts/YieldBox/contracts/YieldBox.sol";
import "tapioca-sdk/dist/contracts/YieldBox/contracts/interfaces/IYieldBox.sol";
import "tapioca-sdk/dist/contracts/YieldBox/contracts/strategies/ERC20WithoutStrategy.sol";
import "tapioca-periph/contracts/interfaces/ISingularity.sol";
import "tapioca-periph/contracts/interfaces/IPenrose.sol";
import "tapioca-periph/contracts/interfaces/ITwTap.sol";
import "tapioca-periph/contracts/interfaces/ICluster.sol";

// TODO: Permissionless market deployment
///     + asset registration? (toggle to renounce ownership so users can call)
/// @title Global market registry
/// @notice Singularity management
contract Penrose is BoringOwnable, BoringFactory {
    // ************ //
    // *** VARS *** //
    // ************ //
    /// @notice returns the Conservator address
    address public conservator;
    /// @notice returns the pause state of the contract
    bool public paused;
    /// @notice returns the Cluster contract
    ICluster public cluster;
    /// @notice returns the YieldBox contract
    YieldBox public immutable yieldBox;
    /// @notice returns the TAP contract
    IERC20 public immutable tapToken;
    /// @notice returns TAP asset id registered in the YieldBox contract
    uint256 public immutable tapAssetId;
    /// @notice returns USDO contract
    IERC20 public usdoToken;
    /// @notice returns USDO asset id registered in the YieldBox contract
    uint256 public usdoAssetId;
    /// @notice returns the WETH/main contract
    IERC20 public immutable mainToken;
    /// @notice returns WETH/main asset id registered in the YieldBox contract
    uint256 public immutable mainAssetId;

    /// @notice Singularity master contracts
    IPenrose.MasterContract[] public singularityMasterContracts;
    /// @notice BigBang master contracts
    IPenrose.MasterContract[] public bigbangMasterContracts;

    // Used to check if a Singularity master contract is registered
    mapping(address => bool) public isSingularityMasterContractRegistered;
    // Used to check if a BigBang master contract is registered
    mapping(address => bool) public isBigBangMasterContractRegistered;
    // Used to check if a SGL/BB is a real market
    mapping(address => bool) public isMarketRegistered;
    /// @notice default LZ Chain id
    uint16 public hostLzChainId;

    /// @notice BigBang ETH market addressf
    address public bigBangEthMarket;
    /// @notice BigBang ETH market debt rate
    uint256 public bigBangEthDebtRate;

    /// @notice registered empty strategies
    mapping(address => IStrategy) public emptyStrategies;

    /// @notice creates a Penrose contract
    /// @param _yieldBox YieldBox contract address
    /// @param _cluster Cluster contract address
    /// @param tapToken_ TapOFT contract address
    /// @param mainToken_ WETH contract address
    /// @param _hostLzChainId the default protocol's LZ chain id
    /// @param _owner owner address
    constructor(
        YieldBox _yieldBox,
        ICluster _cluster,
        IERC20 tapToken_,
        IERC20 mainToken_,
        uint16 _hostLzChainId,
        address _owner
    ) {
        yieldBox = _yieldBox;
        cluster = _cluster;
        tapToken = tapToken_;
        owner = _owner;

        emptyStrategies[address(tapToken_)] = IStrategy(
            address(
                new ERC20WithoutStrategy(
                    IYieldBox(address(_yieldBox)),
                    tapToken_
                )
            )
        );
        tapAssetId = uint96(
            _yieldBox.registerAsset(
                TokenType.ERC20,
                address(tapToken_),
                emptyStrategies[address(tapToken_)],
                0
            )
        );

        mainToken = mainToken_;
        emptyStrategies[address(mainToken_)] = IStrategy(
            address(
                new ERC20WithoutStrategy(
                    IYieldBox(address(_yieldBox)),
                    mainToken_
                )
            )
        );
        mainAssetId = uint96(
            _yieldBox.registerAsset(
                TokenType.ERC20,
                address(mainToken_),
                emptyStrategies[address(mainToken_)],
                0
            )
        );

        bigBangEthDebtRate = 5e15;
        hostLzChainId = _hostLzChainId;
    }

    // **************//
    // *** EVENTS *** //
    // ************** //
    /// @notice event emitted when fees are extracted
    event ProtocolWithdrawal(IMarket[] markets, uint256 timestamp);
    /// @notice event emitted when Singularity master contract is registered
    event RegisterSingularityMasterContract(
        address indexed location,
        IPenrose.ContractType risk
    );
    /// @notice event emitted when BigBang master contract is registered
    event RegisterBigBangMasterContract(
        address indexed location,
        IPenrose.ContractType risk
    );
    /// @notice event emitted when Singularity is registered
    event RegisterSingularity(
        address indexed location,
        address indexed masterContract
    );
    /// @notice event emitted when BigBang is registered
    event RegisterBigBang(
        address indexed location,
        address indexed masterContract
    );
    /// @notice event emitted when ISwapper address is updated
    event SwapperUpdate(
        address indexed swapper,
        uint16 indexed id,
        bool isRegistered
    );
    /// @notice event emitted when USDO address is updated
    event UsdoTokenUpdated(address indexed usdoToken, uint256 assetId);
    /// @notice event emitted when conservator is updated
    event ConservatorUpdated(address indexed old, address indexed _new);
    /// @notice event emitted when pause state is updated
    event PausedUpdated(bool oldState, bool newState);
    /// @notice event emitted when BigBang ETH market address is updated
    event BigBangEthMarketSet(address indexed _newAddress);
    /// @notice event emitted when BigBang ETH market debt rate is updated
    event BigBangEthMarketDebtRate(uint256 _rate);
    /// @notice event emitted when fees are deposited to twTap
    event LogTwTapFeesDeposit(uint256 feeShares, uint256 ethAmount);

    // ******************//
    // *** MODIFIERS *** //
    // ***************** //
    modifier registeredSingularityMasterContract(address mc) {
        require(
            isSingularityMasterContractRegistered[mc] == true,
            "Penrose: MC not registered"
        );
        _;
    }

    modifier registeredBigBangMasterContract(address mc) {
        require(
            isBigBangMasterContractRegistered[mc] == true,
            "Penrose: MC not registered"
        );
        _;
    }

    modifier notPaused() {
        require(!paused, "Penrose: paused");
        _;
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice Get all the Singularity contract addresses
    /// @return markets list of available markets
    function singularityMarkets()
        external
        view
        returns (address[] memory markets)
    {
        markets = _getMasterContractLength(singularityMasterContracts);
    }

    /// @notice Get all the BigBang contract addresses
    /// @return markets list of available markets
    function bigBangMarkets() external view returns (address[] memory markets) {
        markets = _getMasterContractLength(bigbangMasterContracts);
    }

    /// @notice Get the length of `singularityMasterContracts`
    function singularityMasterContractLength() external view returns (uint256) {
        return singularityMasterContracts.length;
    }

    /// @notice Get the length of `bigbangMasterContracts`
    function bigBangMasterContractLength() external view returns (uint256) {
        return bigbangMasterContracts.length;
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /// @notice Loop through the master contracts and call `_depositFeesToYieldBox()` to each one of their clones.
    /// @param markets_ Singularity &/ BigBang markets array
    /// @param twTap the TwTap contract
    function withdrawAllMarketFees(
        IMarket[] calldata markets_,
        ITwTap twTap
    ) external onlyOwner notPaused {
        require(address(twTap) != address(0), "Penrose: twTap not valid");

        uint256 length = markets_.length;
        unchecked {
            for (uint256 i = 0; i < length; ) {
                _depositFeesToTwTap(markets_[i], twTap);
                ++i;
            }
        }

        emit ProtocolWithdrawal(markets_, block.timestamp);
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    /// @notice sets the main BigBang market debt rate
    /// @dev can only be called by the owner
    /// @param _rate the new rate
    function setBigBangEthMarketDebtRate(uint256 _rate) external onlyOwner {
        bigBangEthDebtRate = _rate;
        emit BigBangEthMarketDebtRate(_rate);
    }

    /// @notice sets the main BigBang market
    /// @dev needed for the variable debt computation
    function setBigBangEthMarket(address _market) external onlyOwner {
        bigBangEthMarket = _market;
        emit BigBangEthMarketSet(_market);
    }

    /// @notice updates the pause state of the contract
    /// @dev can only be called by the conservator
    /// @param val the new value
    function updatePause(bool val) external {
        require(msg.sender == conservator, "Penrose: unauthorized");
        require(val != paused, "Penrose: same state");
        emit PausedUpdated(paused, val);
        paused = val;
    }

    /// @notice Set the Conservator address
    /// @dev Conservator can pause the contract
    /// @param _conservator The new address
    function setConservator(address _conservator) external onlyOwner {
        require(_conservator != address(0), "Penrose: address not valid");
        emit ConservatorUpdated(conservator, _conservator);
        conservator = _conservator;
    }

    /// @notice Set the USDO token
    /// @dev sets usdoToken and usdoAssetId
    ///      can only by called by the owner
    /// @param _usdoToken the USDO token address
    function setUsdoToken(address _usdoToken) external onlyOwner {
        usdoToken = IERC20(_usdoToken);

        emptyStrategies[_usdoToken] = IStrategy(
            address(
                new ERC20WithoutStrategy(
                    IYieldBox(address(yieldBox)),
                    IERC20(_usdoToken)
                )
            )
        );
        usdoAssetId = uint96(
            yieldBox.registerAsset(
                TokenType.ERC20,
                _usdoToken,
                emptyStrategies[_usdoToken],
                0
            )
        );
        emit UsdoTokenUpdated(_usdoToken, usdoAssetId);
    }

    /// @notice Register a Singularity master contract
    /// @dev can only be called by the owner
    /// @param mcAddress The address of the contract
    /// @param contractType_ The risk type of the contract
    function registerSingularityMasterContract(
        address mcAddress,
        IPenrose.ContractType contractType_
    ) external onlyOwner {
        require(
            isSingularityMasterContractRegistered[mcAddress] == false,
            "Penrose: MC registered"
        );

        IPenrose.MasterContract memory mc;
        mc.location = mcAddress;
        mc.risk = contractType_;
        singularityMasterContracts.push(mc);
        isSingularityMasterContractRegistered[mcAddress] = true;

        emit RegisterSingularityMasterContract(mcAddress, contractType_);
    }

    /// @notice Register a BigBang master contract
    /// @dev can only be called by the owner
    /// @param mcAddress The address of the contract
    /// @param contractType_ The risk type of the contract
    function registerBigBangMasterContract(
        address mcAddress,
        IPenrose.ContractType contractType_
    ) external onlyOwner {
        require(
            isBigBangMasterContractRegistered[mcAddress] == false,
            "Penrose: MC registered"
        );

        IPenrose.MasterContract memory mc;
        mc.location = mcAddress;
        mc.risk = contractType_;
        bigbangMasterContracts.push(mc);
        isBigBangMasterContractRegistered[mcAddress] = true;

        emit RegisterBigBangMasterContract(mcAddress, contractType_);
    }

    /// @notice Registers a Singularity market
    /// @dev can only be called by the owner
    /// @param mc The address of the master contract which must be already registered
    /// @param data The init data of the Singularity
    /// @param useCreate2 Whether to use create2 or not
    function registerSingularity(
        address mc,
        bytes calldata data,
        bool useCreate2
    )
        external
        payable
        onlyOwner
        registeredSingularityMasterContract(mc)
        returns (address _contract)
    {
        _contract = deploy(mc, data, useCreate2);
        require(_contract != address(0), "Penrose: zero address");
        require(_contract.code.length > 0, "Penrose: deployment failed");
        isMarketRegistered[_contract] = true;
        emit RegisterSingularity(_contract, mc);
    }

    /// @notice Registers an existing Singularity market (without deployment)
    /// @dev can only be called by the owner
    /// @param mc The address of the master contract which must be already registered
    function addSingularity(
        address mc,
        address _contract
    ) external onlyOwner registeredSingularityMasterContract(mc) {
        isMarketRegistered[_contract] = true;
        clonesOf[mc].push(_contract);
        masterContractOf[_contract] = mc;
        emit RegisterSingularity(_contract, mc);
    }

    /// @notice Registers a BigBang market
    /// @dev can only be called by the owner
    /// @param mc The address of the master contract which must be already registered
    /// @param data The init data of the BigBang contract
    /// @param useCreate2 Whether to use create2 or not
    function registerBigBang(
        address mc,
        bytes calldata data,
        bool useCreate2
    )
        external
        payable
        onlyOwner
        registeredBigBangMasterContract(mc)
        returns (address _contract)
    {
        _contract = deploy(mc, data, useCreate2);
        require(_contract != address(0), "Penrose: zero address");
        require(_contract.code.length > 0, "Penrose: deployment failed");
        isMarketRegistered[_contract] = true;
        emit RegisterBigBang(_contract, mc);
    }

    /// @notice Registers an existing BigBang market (without deployment)
    /// @dev can only be called by the owner
    /// @param mc The address of the master contract which must be already registered
    function addBigBang(
        address mc,
        address _contract
    ) external onlyOwner registeredBigBangMasterContract(mc) {
        isMarketRegistered[_contract] = true;
        clonesOf[mc].push(_contract);
        masterContractOf[_contract] = mc;
        emit RegisterBigBang(_contract, mc);
    }

    /// @notice Execute an only owner function inside of a Singularity or a BigBang market
    function executeMarketFn(
        address[] calldata mc,
        bytes[] memory data,
        bool forceSuccess
    )
        external
        onlyOwner
        notPaused
        returns (bool[] memory success, bytes[] memory result)
    {
        uint256 len = mc.length;
        require(len == data.length, "Penrose: length mismatch");
        success = new bool[](len);
        result = new bytes[](len);
        for (uint256 i = 0; i < len; ) {
            require(
                isSingularityMasterContractRegistered[
                    masterContractOf[mc[i]]
                ] || isBigBangMasterContractRegistered[masterContractOf[mc[i]]],
                "Penrose: MC not registered"
            );
            require(address(mc[i]).code.length > 0, "Penrose: no contract");
            (success[i], result[i]) = mc[i].call(data[i]);
            if (forceSuccess) {
                require(success[i], _getRevertMsg(result[i]));
            }
            ++i;
        }
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _getRevertMsg(
        bytes memory _returnData
    ) private pure returns (string memory) {
        if (_returnData.length > 1000) return "SGL: reason too long";

        // If the _res length is less than 68, then the transaction failed silently (without a revert message)
        if (_returnData.length < 68) return "SGL: no return data";
        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        return abi.decode(_returnData, (string)); // All that remains is the revert string
    }

    function _depositFeesToTwTap(IMarket market, ITwTap twTap) private {
        require(isMarketRegistered[address(market)], "Penrose: Invalid market");

        uint256 feeShares = market.refreshPenroseFees();
        if (feeShares == 0) return;

        address _asset = market.asset();
        uint256 _assetId = market.assetId();
        yieldBox.withdraw(_assetId, address(this), address(this), 0, feeShares);

        //TODO: call twTap.distributeRewards
        uint256 rewardTokenId = twTap.rewardTokenIndex(_asset);
        uint256 feeAmount = yieldBox.toAmount(_assetId, feeShares, false);
        IERC20(_asset).approve(address(twTap), 0);
        IERC20(_asset).approve(address(twTap), feeAmount);
        twTap.distributeReward(rewardTokenId, feeAmount);
        emit LogTwTapFeesDeposit(feeShares, feeAmount);
    }

    function _getMasterContractLength(
        IPenrose.MasterContract[] memory array
    ) public view returns (address[] memory markets) {
        uint256 _masterContractLength = array.length;
        uint256 marketsLength = 0;

        unchecked {
            // We first compute the length of the markets array
            for (uint256 i = 0; i < _masterContractLength; ) {
                marketsLength += clonesOfCount(array[i].location);

                ++i;
            }
        }

        markets = new address[](marketsLength);

        uint256 marketIndex;
        uint256 clonesOfLength;

        unchecked {
            // We populate the array
            for (uint256 i = 0; i < _masterContractLength; ) {
                address mcLocation = array[i].location;
                clonesOfLength = clonesOfCount(mcLocation);

                // Loop through clones of the current MC.
                for (uint256 j = 0; j < clonesOfLength; ) {
                    markets[marketIndex] = clonesOf[mcLocation][j];
                    ++marketIndex;
                    ++j;
                }
                ++i;
            }
        }
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {IMasterContract} from "@boringcrypto/boring-solidity/contracts/interfaces/IMasterContract.sol";
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// Tapioca
import {
    ERC20WithoutStrategy, IStrategy, IYieldBox as IBoringYieldBox
} from "yieldbox/strategies/ERC20WithoutStrategy.sol";
import {PearlmitHandler, IPearlmit} from "tapioca-periph/pearlmit/PearlmitHandler.sol";
import {RevertMsgDecoder} from "./usdo/libraries/RevertMsgDecoder.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {IMarket} from "tapioca-periph/interfaces/bar/ISingularity.sol";
import {ITwTap} from "tapioca-periph/interfaces/tap-token/ITwTap.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";
import {IBigBang} from "tapioca-periph/interfaces/bar/IBigBang.sol";
import {TokenType} from "yieldbox/enums/YieldBoxTokenType.sol";
import {IUsdo} from "tapioca-periph/interfaces/oft/IUsdo.sol";
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";
import {SafeApprove} from "./libraries/SafeApprove.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

/// @title Global market registry
/// @notice Singularity management
contract Penrose is Ownable, PearlmitHandler {
    using SafeApprove for address;

    error AddressNotValid();

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
    IYieldBox public immutable yieldBox;
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

    /// @notice Used to check if a Singularity master contract is registered
    mapping(address => bool) public isSingularityMasterContractRegistered;
    /// @notice Used to check if a BigBang master contract is registered
    mapping(address => bool) public isBigBangMasterContractRegistered;
    /// @notice Used to check if a SGL/BB is a real market
    mapping(address => bool) public isMarketRegistered;

    /// @notice BigBang ETH market address
    address public bigBangEthMarket;
    /// @notice BigBang ETH market debt rate
    uint256 public bigBangEthDebtRate;

    address[] public allBigBangMarkets;

    mapping(address => bool) public isOriginRegistered;
    address[] public allOriginsMarkets;

    /// @notice Mapping from clone contracts to their masterContract.
    mapping(address => address) public masterContractOf;

    /// @notice Mapping from masterContract to an array of all clones
    /// On mainnet events can be used to get this list, but events aren't always easy to retrieve and
    /// barely work on sidechains. While this adds gas, it makes enumerating all clones much easier.
    mapping(address => address[]) public clonesOf;

    /// @notice creates a Penrose contract
    /// @param _yieldBox YieldBox contract address
    /// @param _cluster Cluster contract address
    /// @param tapToken_ TapOFT contract address
    /// @param mainToken_ WETH contract address
    /// @param _owner owner address
    constructor(
        IYieldBox _yieldBox,
        ICluster _cluster,
        IERC20 tapToken_,
        IERC20 mainToken_,
        IPearlmit _pearlmit,
        uint256 _tapAssetId,
        uint256 _mainAssetId,
        address _owner
    ) PearlmitHandler(_pearlmit) {
        if (address(_yieldBox) == address(0)) revert AddressNotValid();
        if (address(_cluster) == address(0)) revert AddressNotValid();
        if (address(tapToken_) == address(0)) revert AddressNotValid();
        if (address(_pearlmit) == address(0)) revert AddressNotValid();
        if (address(_owner) == address(0)) revert AddressNotValid();
        if (_tapAssetId == 0) revert NotValid();
        if (_mainAssetId == 0) revert NotValid();

        yieldBox = _yieldBox;
        cluster = _cluster;
        tapToken = tapToken_;
        mainToken = mainToken_;

        tapAssetId = _tapAssetId;
        mainAssetId = _mainAssetId;

        bigBangEthDebtRate = 5e15;

        _transferOwnership(_owner);
    }

    // **************//
    // *** EVENTS *** //
    // ************** //
    /// @notice event emitted when fees are extracted
    event ProtocolWithdrawal(IMarket[] markets, uint256 indexed timestamp);
    /// @notice event emitted when Singularity master contract is registered
    event RegisterSingularityMasterContract(address indexed location, IPenrose.ContractType indexed risk);
    /// @notice event emitted when BigBang master contract is registered
    event RegisterBigBangMasterContract(address indexed location, IPenrose.ContractType indexed risk);
    /// @notice event emitted when Singularity is registered
    event RegisterSingularity(address indexed location, address indexed masterContract);
    /// @notice event emitted when BigBang is registered
    event RegisterBigBang(address indexed location, address indexed masterContract);
    /// @notice event emitted when Origins is registered
    event RegisterOrigins(address indexed location);
    /// @notice event emitted when USDO address is updated
    event UsdoTokenUpdated(address indexed usdoToken, uint256 indexed assetId);
    /// @notice event emitted when conservator is updated
    event ConservatorUpdated(address indexed old, address indexed _new);
    /// @notice event emitted when pause state is updated
    event PausedUpdated(bool indexed oldState, bool indexed newState);
    /// @notice event emitted when BigBang ETH market address is updated
    event BigBangEthMarketUpdated(address indexed _oldAddress, address indexed _newAddress);
    /// @notice event emitted when BigBang ETH market debt rate is updated
    event BigBangEthMarketDebtRateUpdated(uint256 indexed _oldRate, uint256 indexed _newRate);
    /// @notice event emitted when fees are deposited to twTap
    event LogTwTapFeesDeposit(uint256 indexed amount);
    /// @notice event emitted when Cluster is set
    event ClusterSet(address indexed old, address indexed _new);
    /// @notice event emitted when total BB markets debt is computed
    event TotalUsdoDebt(uint256 indexed amount);
    /// @notice event emitted when markets are re-accrued
    event ReaccruedMarkets(bool indexed mainMarketIncluded);
    event LogDeploy(address indexed masterContract, bytes data, address indexed cloneAddress);
    event UnregisterContract(address indexed bb);

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error NotRegistered();
    error NotValid();
    error Paused();
    error NotAuthorized();
    error Registered();
    error ZeroAddress();
    error Failed();
    error AlreadyAdded();
    error LengthMismatch();

    // ******************//
    // *** MODIFIERS *** //
    // ***************** //
    modifier registeredSingularityMasterContract(address mc) {
        if (!isSingularityMasterContractRegistered[mc]) revert NotRegistered();
        _;
    }

    modifier registeredBigBangMasterContract(address mc) {
        if (!isBigBangMasterContractRegistered[mc]) revert NotRegistered();
        _;
    }

    modifier notPaused() {
        if (paused) revert Paused();
        _;
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice Get all the Singularity contract addresses
    /// @return markets list of available markets
    function singularityMarkets() external view returns (address[] memory markets) {
        markets = getAllMasterContractClones(singularityMasterContracts);
    }

    /// @notice Get all the BigBang contract addresses
    /// @return markets list of available markets
    function bigBangMarkets() external view returns (address[] memory markets) {
        markets = getAllMasterContractClones(bigbangMasterContracts);
    }

    /// @notice Get the length of `singularityMasterContracts`
    function singularityMasterContractLength() external view returns (uint256) {
        return singularityMasterContracts.length;
    }

    /// @notice Get the length of `bigbangMasterContracts`
    function bigBangMasterContractLength() external view returns (uint256) {
        return bigbangMasterContracts.length;
    }

    /// @notice Returns total markets debt
    /// @dev does not include Origins markets
    function viewTotalDebt() public view returns (uint256) {
        uint256 _totalUsdoDebt = 0;

        uint256 len = allBigBangMarkets.length;
        for (uint256 i; i < len; i++) {
            IBigBang market = IBigBang(allBigBangMarkets[i]);
            if (isMarketRegistered[address(market)]) {
                _totalUsdoDebt += market.openInterestDebt();
            }
        }

        return _totalUsdoDebt;
    }

    /// @notice Returns the count of clones that exists for a specific masterContract
    /// @param masterContract The address of the master contract.
    /// @return cloneCount total number of clones for the masterContract.
    function clonesOfCount(address masterContract) public view returns (uint256 cloneCount) {
        cloneCount = clonesOf[masterContract].length;
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    /// @notice Deploys a given master Contract as a clone.
    /// Any ETH transferred with this call is forwarded to the new clone.
    /// Emits `LogDeploy`.
    /// @param masterContract The address of the contract to clone.
    /// @param data Additional abi encoded calldata that is passed to the new clone via `IMasterContract.init`.
    /// @param useCreate2 Creates the clone by using the CREATE2 opcode, in this case `data` will be used as salt.
    /// @return cloneAddress Address of the created clone contract.
    function deploy(address masterContract, bytes calldata data, bool useCreate2)
        public
        payable
        onlyOwner
        returns (address cloneAddress)
    {
        require(masterContract != address(0), "BoringFactory: No masterContract");
        bytes20 targetBytes = bytes20(masterContract); // Takes the first 20 bytes of the masterContract's address

        if (useCreate2) {
            // each masterContract has different code already. So clones are distinguished by their data only.
            bytes32 salt = keccak256(data);

            // Creates clone, more info here: https://blog.openzeppelin.com/deep-dive-into-the-minimal-proxy-contract/
            assembly {
                let clone := mload(0x40)
                mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
                mstore(add(clone, 0x14), targetBytes)
                mstore(add(clone, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
                cloneAddress := create2(0, clone, 0x37, salt)
            }
        } else {
            assembly {
                let clone := mload(0x40)
                mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
                mstore(add(clone, 0x14), targetBytes)
                mstore(add(clone, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
                cloneAddress := create(0, clone, 0x37)
            }
        }
        masterContractOf[cloneAddress] = masterContract;
        clonesOf[masterContract].push(cloneAddress);

        IMasterContract(cloneAddress).init{value: msg.value}(data);

        emit LogDeploy(masterContract, data, cloneAddress);
    }

    /// @notice Loop through the master contracts and call `_depositFeesToTwTap()` to each one of their clones.
    /// @param markets_ Singularity &/ BigBang markets array
    /// @param twTap the TwTap contract
    function withdrawAllMarketFees(IMarket[] calldata markets_, ITwTap twTap) external onlyOwner notPaused {
        if (address(twTap) == address(0)) revert ZeroAddress();

        uint256 length = markets_.length;
        unchecked {
            for (uint256 i; i < length;) {
                _depositFeesToTwTap(markets_[i], twTap);
                ++i;
            }
        }

        emit ProtocolWithdrawal(markets_, block.timestamp);
    }

    /// @notice mints USDO based on current open interest
    /// @dev Penrose should be an allowed minter for USDO
    /// @param twTap the twTap contract address
    function mintOpenInterestDebt(address twTap) external onlyOwner {
        uint256 sum;
        // compute mintable debt for all BB markets
        // Origins do not produce debt
        uint256 len = allBigBangMarkets.length;
        for (uint256 i; i < len; i++) {
            IBigBang market = IBigBang(allBigBangMarkets[i]);
            if (isMarketRegistered[address(market)]) {
                sum += market.consumeMintableOpenInterestDebt();
            }
        }

        if (sum > 0) {
            //mint against the open interest; supply should be fully minted now
            IUsdo(address(usdoToken)).mint(address(this), sum);

            //send it to twTap
            uint256 rewardTokenId = ITwTap(twTap).rewardTokenIndex(address(usdoToken));
            _distributeOnTwTap(sum, rewardTokenId, address(usdoToken), ITwTap(twTap));
        }
    }

    /// @notice sets the Cluster address
    /// @dev can only be called by the owner
    /// @param _newCluster the new address
    function setCluster(address _newCluster) external onlyOwner {
        if (_newCluster == address(0)) revert ZeroAddress();
        emit ClusterSet(address(cluster), _newCluster);
        cluster = ICluster(_newCluster);
    }

    /// @notice sets the main BigBang market debt rate
    /// @dev can only be called by the owner
    /// @param _rate the new rate
    function setBigBangEthMarketDebtRate(uint256 _rate) external onlyOwner {
        if (bigBangEthMarket != address(0)) {
            IBigBang(bigBangEthMarket).accrue();
        }
        bigBangEthDebtRate = _rate;
        emit BigBangEthMarketDebtRateUpdated(bigBangEthDebtRate, _rate);
    }

    /// @notice sets the main BigBang market
    /// @dev needed for the variable debt computation
    /// @param _market the new market address
    function setBigBangEthMarket(address _market) external onlyOwner {
        if (_market == address(0)) revert ZeroAddress();

        if (bigBangEthMarket != address(0)) {
            uint256 len = allBigBangMarkets.length;
            address[] memory markets = allBigBangMarkets;
            for (uint256 i = 0; i < len; i++) {
                address market = markets[i];
                if (market != bigBangEthMarket && isMarketRegistered[market]) {
                    IBigBang(market).accrue();
                }
            }
        }

        emit BigBangEthMarketUpdated(bigBangEthMarket, _market);
        bigBangEthMarket = _market;
    }

    /// @notice updates the pause state of the contract
    /// @dev can only be called by the conservator
    /// @param val the new value
    function updatePause(bool val) external {
        if (msg.sender != conservator) revert NotAuthorized();
        if (val == paused) revert NotValid();
        emit PausedUpdated(paused, val);
        paused = val;
    }

    /// @notice Set the Conservator address
    /// @dev Conservator can pause the contract
    /// @param _conservator The new address
    function setConservator(address _conservator) external onlyOwner {
        if (_conservator == address(0)) revert ZeroAddress();
        emit ConservatorUpdated(conservator, _conservator);
        conservator = _conservator;
    }

    /// @notice Set the USDO token
    /// @dev sets usdoToken and usdoAssetId
    ///      can only by called by the owner
    /// @param _usdoToken the USDO token address
    /// @param _usdoAssetId the USDO asset id
    function setUsdoToken(address _usdoToken, uint256 _usdoAssetId) external onlyOwner {
        if (_usdoToken == address(0)) revert ZeroAddress();
        if (_usdoAssetId == 0) revert NotValid();

        usdoToken = IERC20(_usdoToken);
        usdoAssetId = _usdoAssetId;

        emit UsdoTokenUpdated(_usdoToken, _usdoAssetId);
    }

    /// @notice Register a Singularity master contract
    /// @dev can only be called by the owner
    /// @param mcAddress The address of the contract
    /// @param contractType_ The risk type of the contract
    function registerSingularityMasterContract(address mcAddress, IPenrose.ContractType contractType_)
        external
        onlyOwner
    {
        if (isSingularityMasterContractRegistered[mcAddress]) {
            revert Registered();
        }

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
    function registerBigBangMasterContract(address mcAddress, IPenrose.ContractType contractType_) external onlyOwner {
        if (isBigBangMasterContractRegistered[mcAddress]) revert Registered();

        IPenrose.MasterContract memory mc;
        mc.location = mcAddress;
        mc.risk = contractType_;
        bigbangMasterContracts.push(mc);
        isBigBangMasterContractRegistered[mcAddress] = true;

        emit RegisterBigBangMasterContract(mcAddress, contractType_);
    }

    /// @notice removes a registered SGL/BB/Origin market
    /// @param mkt the market address
    /// @param marketType 0 - SGL, 1 - BB, 2 - Origins

    function unregisterContract(address mkt, uint256 marketType) external onlyOwner {
        address _mc = masterContractOf[mkt];

        // set `isMarketRegistered` to false and remove `masterContractOf`
        isMarketRegistered[mkt] = false;
        delete masterContractOf[mkt];

        // remove it from `allBigBangMarkets` or `allOriginsMarkets`
        uint256 index;
        if (marketType == 1) {
            index = _findBigBangIndex(allBigBangMarkets, mkt);
            allBigBangMarkets[index] = allBigBangMarkets[allBigBangMarkets.length - 1];
            allBigBangMarkets.pop();
        } else if (marketType == 2) {
            index = _findBigBangIndex(allOriginsMarkets, mkt);
            allOriginsMarkets[index] = allOriginsMarkets[allOriginsMarkets.length - 1];
            allOriginsMarkets.pop();
        }

        // remove it from clonesOf
        index = _findBigBangIndex(clonesOf[_mc], mkt);
        clonesOf[_mc][index] = clonesOf[_mc][clonesOf[_mc].length - 1];
        clonesOf[_mc].pop();

        emit UnregisterContract(mkt);
    }

    /// @notice Registers a Singularity market
    /// @dev can only be called by the owner
    /// @param mc The address of the master contract which must be already registered
    /// @param data The init data of the Singularity
    /// @param useCreate2 Whether to use create2 or not
    /// @return _contract the created contract
    function registerSingularity(address mc, bytes calldata data, bool useCreate2)
        external
        payable
        onlyOwner
        registeredSingularityMasterContract(mc)
        returns (address _contract)
    {
        _contract = deploy(mc, data, useCreate2);
        if (_contract == address(0)) revert ZeroAddress();
        if (_contract.code.length == 0) revert Failed();
        isMarketRegistered[_contract] = true;
        emit RegisterSingularity(_contract, mc);
    }

    /// @notice Registers an existing Singularity market (without deployment)
    /// @dev can only be called by the owner
    /// @param mc The address of the master contract which must be already registered
    /// @param _contract The address of SGL
    function addSingularity(address mc, address _contract) external onlyOwner registeredSingularityMasterContract(mc) {
        if (isMarketRegistered[_contract]) revert AlreadyAdded();
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
    /// @return _contract the created contract
    function registerBigBang(address mc, bytes calldata data, bool useCreate2)
        external
        payable
        onlyOwner
        registeredBigBangMasterContract(mc)
        returns (address _contract)
    {
        _contract = deploy(mc, data, useCreate2);
        if (_contract == address(0)) revert ZeroAddress();
        if (_contract.code.length == 0) revert Failed();
        isMarketRegistered[_contract] = true;
        allBigBangMarkets.push(_contract);
        emit RegisterBigBang(_contract, mc);
    }

    /// @notice Registers an existing BigBang market (without deployment)
    /// @dev can only be called by the owner
    /// @param mc The address of the master contract which must be already registered
    /// @param _contract The address of BB
    function addBigBang(address mc, address _contract) external onlyOwner registeredBigBangMasterContract(mc) {
        if (isMarketRegistered[_contract]) revert AlreadyAdded();
        isMarketRegistered[_contract] = true;
        clonesOf[mc].push(_contract);
        masterContractOf[_contract] = mc;
        allBigBangMarkets.push(_contract);
        emit RegisterBigBang(_contract, mc);
    }

    function addOriginsMarket(address _contract) external onlyOwner {
        if (isOriginRegistered[_contract]) revert AlreadyAdded();
        isOriginRegistered[_contract] = true;
        allOriginsMarkets.push(_contract);
        emit RegisterOrigins(_contract);
    }

    /// @notice Execute an only owner function inside of a Singularity or a BigBang market
    /// @param mc Markets contracts array
    /// @param data array
    /// @param forceSuccess if true, method reverts in case of an unsuccessful execution
    function executeMarketFn(address[] calldata mc, bytes[] memory data, bool forceSuccess)
        external
        onlyOwner
        returns (bool[] memory success, bytes[] memory result)
    {
        uint256 len = mc.length;
        if (len != data.length) revert LengthMismatch();
        success = new bool[](len);
        result = new bytes[](len);
        for (uint256 i; i < len;) {
            if (
                !isSingularityMasterContractRegistered[masterContractOf[mc[i]]]
                    && !isBigBangMasterContractRegistered[masterContractOf[mc[i]]]
            ) revert NotAuthorized();
            if (address(mc[i]).code.length == 0) revert NotValid();
            (success[i], result[i]) = mc[i].call(data[i]);
            if (forceSuccess) {
                require(success[i], RevertMsgDecoder._getRevertMsg(result[i]));
            }
            ++i;
        }
    }

    /// @dev might be used as a setter for storage slots
    function executeTargetFn(address target, bytes memory data)
        external
        onlyOwner
        returns (bool success, bytes memory returnData)
    {
        if (!cluster.isWhitelisted(0, target)) revert NotAuthorized();
        (success, returnData) = target.delegatecall(data);
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice Calls `accrue()` on all BigBang registered markets
    /// @dev callable by BigBang ETH market only
    function reAccrueBigBangMarkets() external notPaused {
        if (msg.sender == bigBangEthMarket) {
            _reAccrueMarkets(false);
        }
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _findBigBangIndex(address[] memory _arr, address _address) internal pure returns (uint256) {
        uint256 len = _arr.length;
        for (uint256 i; i < len; i++) {
            if (_arr[i] == _address) {
                return i;
            }
        }
        revert AddressNotValid();
    }

    function _reAccrueMarkets(bool includeMainMarket) private {
        uint256 len = allBigBangMarkets.length;
        address[] memory markets = allBigBangMarkets;
        for (uint256 i; i < len; i++) {
            address market = markets[i];
            if (isMarketRegistered[market]) {
                if (includeMainMarket || market != bigBangEthMarket) {
                    IBigBang(market).accrue();
                }
            }
        }

        emit ReaccruedMarkets(includeMainMarket);
    }

    function _depositFeesToTwTap(IMarket market, ITwTap twTap) private {
        if (!isMarketRegistered[address(market)]) revert NotValid();

        uint256 feeShares = market.refreshPenroseFees();
        if (feeShares == 0) return;

        address _asset = market._asset();
        uint256 _assetId = market._assetId();

        uint256 feeAmount = yieldBox.toAmount(_assetId, feeShares, false);

        yieldBox.withdraw(_assetId, address(this), address(this), 0, feeShares);

        uint256 rewardTokenId = twTap.rewardTokenIndex(_asset);
        _distributeOnTwTap(feeAmount, rewardTokenId, _asset, twTap);
    }

    function _distributeOnTwTap(uint256 amount, uint256 rewardTokenId, address _asset, ITwTap twTap) private {
        _asset.safeApprove(address(twTap), amount);
        twTap.distributeReward(rewardTokenId, amount);
        _asset.safeApprove(address(twTap), 0);
        emit LogTwTapFeesDeposit(amount);
    }

    function getAllMasterContractClones(IPenrose.MasterContract[] memory array)
        public
        view
        returns (address[] memory markets)
    {
        uint256 _masterContractLength = array.length;
        uint256 marketsLength = 0;

        unchecked {
            // We first compute the length of the markets array
            for (uint256 i; i < _masterContractLength;) {
                marketsLength += clonesOfCount(array[i].location);

                ++i;
            }
        }

        markets = new address[](marketsLength);

        uint256 marketIndex;
        uint256 clonesOfLength;

        unchecked {
            // We populate the array
            for (uint256 i; i < _masterContractLength;) {
                address mcLocation = array[i].location;
                clonesOfLength = clonesOfCount(mcLocation);

                // Loop through clones of the current MC.
                for (uint256 j = 0; j < clonesOfLength;) {
                    markets[marketIndex] = clonesOf[mcLocation][j];
                    ++marketIndex;
                    ++j;
                }
                ++i;
            }
        }
    }
}

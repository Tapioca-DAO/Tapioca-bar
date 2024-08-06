// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {IERC20, IStrictERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

// utils
import {Constants} from "./Constants.sol";

// tapioca
import {ERC20WithoutStrategy} from "yieldbox/strategies/ERC20WithoutStrategy.sol";
import {IPearlmit, Pearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {IWrappedNative} from "yieldbox/interfaces/IWrappedNative.sol";
import {YieldBoxURIBuilder} from "yieldbox/YieldBoxURIBuilder.sol";
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";
import {Cluster} from "tapioca-periph/Cluster/Cluster.sol";
import {YieldBox} from "yieldbox/YieldBox.sol";
import {Penrose} from "contracts/Penrose.sol";

// tests
import {OracleMock_test} from "../mocks/OracleMock_test.sol";
import {ERC20Mock_test} from "../mocks/ERC20Mock_test.sol";
import {Test} from "forge-std/Test.sol";

/// @notice Helper contract containing utilities.
abstract contract Utils is Test, Constants {
    // ************************ //
    // *** GENERAL: HELPERS *** //
    // ************************ //
    /// @dev Stops the active prank and sets a new one.
    function _resetPrank(address msgSender) internal {
        vm.stopPrank();
        vm.startPrank(msgSender);
    }

    // ********************** //
    // *** DEPLOY HELPERS *** //
    // ********************** //
    // ERC20Mock_test
    function _createToken(string memory _name) internal returns (ERC20Mock_test) {
        ERC20Mock_test _token = new ERC20Mock_test(_name, _name);
        vm.label(address(_token), _name);
        return _token;
    }

    // OracleMock_test; allows changing the current rate to simulate multiple situations
    function _createOracle(string memory _name) internal returns (OracleMock_test) {
        OracleMock_test _oracle = new OracleMock_test(_name, _name, 1 ether);
        vm.label(address(_oracle), _name);
        return _oracle;
    }

    // Creates user from Private key
    function _createUser(uint256 _key, string memory _name) internal returns (address) {
        address _user = vm.addr(_key);
        vm.deal(_user, LARGE_AMOUNT);
        vm.label(_user, _name);
        return _user;
    }

    // Creates YieldBox ERC20WithoutStrategy
    function _createEmptyStrategy(address yb, address asset) internal returns (ERC20WithoutStrategy) {
        ERC20WithoutStrategy strat = new ERC20WithoutStrategy(IYieldBox(yb), IERC20(asset));
        vm.label(address(strat), string.concat("ERC20WithoutStrategy_", IStrictERC20(asset).name()));
        return strat;
    }

    // Creates real Pearlmit
    function _createPearlmit(address _owner) internal returns (Pearlmit) {
        Pearlmit pearlmit = new Pearlmit("Pearlmit Test", "1", _owner, 0);
        vm.label(address(pearlmit), "Pearlmit Test");
        return pearlmit;
    }

    // Creates real YieldBox
    function _createYieldBox(address _owner, Pearlmit _pearlmit) internal returns (YieldBox) {
        YieldBoxURIBuilder uriBuilder = new YieldBoxURIBuilder();
        YieldBox yieldBox = new YieldBox(IWrappedNative(address(0)), uriBuilder, _pearlmit, _owner);
        return yieldBox;
    }

    // Creates real Cluster
    function _createCluster(address _owner) internal returns (Cluster) {
        Cluster cluster = new Cluster(0, _owner);
        vm.label(address(cluster), "Cluster Test");
        return cluster;
    }

    // Creates real Penrose
    function _createPenrose(
        address _yieldBox,
        address _cluster,
        address _tapToken,
        uint256 _tapId,
        address _mainToken,
        uint256 _mainTokenId,
        address _pearlmit,
        address _owner
    ) internal returns (Penrose) {
        Penrose penrose = new Penrose(
            IYieldBox(_yieldBox),
            ICluster(_cluster),
            IERC20(_tapToken),
            IERC20(_mainToken),
            IPearlmit(_pearlmit),
            _tapId,
            _mainTokenId,
            _owner
        );
        vm.label(address(penrose), "Penrose");
        return penrose;
    }

    // ************************ //
    // *** APPROVAL HELPERS *** //
    // ************************ //
    function _approveViaERC20(address token, address from, address operator, uint256 amount) internal {
        _resetPrank({msgSender: from});
        IERC20(token).approve(address(operator), amount);
    }

    function _approveViaPearlmit(
        address token,
        IPearlmit pearlmit,
        address from,
        address operator,
        uint256 amount,
        uint256 expiration,
        uint256 tokenId
    ) internal {
        // Reset prank
        _resetPrank({msgSender: from});

        // Set approvals to pearlmit
        IERC20(token).approve(address(pearlmit), amount);

        // Approve via pearlmit
        pearlmit.approve(TOKEN_TYPE_ERC20, token, tokenId, operator, uint200(amount), uint48(expiration));
    }

    function _approveYieldBoxAssetId(YieldBox yieldBox, address from, address operator, uint256 assetId) internal {
        _resetPrank({msgSender: from});
        yieldBox.setApprovalForAsset(operator, assetId, true);
    }

    function _approveYieldBoxForAll(YieldBox yieldBox, address from, address operator) internal {
        _resetPrank({msgSender: from});
        yieldBox.setApprovalForAll(operator, true);
    }
}

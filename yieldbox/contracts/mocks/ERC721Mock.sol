// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ERC721Mock is ERC721 {
     constructor() ERC721("ERC721Mock", "ERCM") {}
    
    function mint(
        address to,
        uint256 id
    ) public {
        _mint(to, id);
    }
}

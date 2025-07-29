
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.1/contracts/token/ERC721/IERC721.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.1/contracts/token/ERC721/IERC721Receiver.sol";


contract NftVault {
    
    event NftLocked(
        address indexed sender,
        address indexed nftContract,
        uint256 indexed tokenId, 
        bytes32 solanaRecipient
    );
    function lock(
        address _nftContract,
        uint256 _tokenId,
        bytes32 _solanaRecipient
    ) public {
        require(_solanaRecipient != bytes32(0), "Solana recipient cannot be empty");

        IERC721 nft = IERC721(_nftContract);

        
        require(nft.ownerOf(_tokenId) == msg.sender, "Caller is not the owner of the NFT");

        
        nft.transferFrom(msg.sender, address(this), _tokenId);
        // Emit the event
        emit NftLocked(msg.sender, _nftContract, _tokenId, _solanaRecipient);
    }
}

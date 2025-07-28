const { ethers } = require("ethers");

const PROVIDER_URL = "https://sepolia.infura.io/v3/299b4d4b1ab74852bfce181bc4a0e62c";



const VAULT_CONTRACT_ADDRESS = "0xf10f170071d495b9e2da7683568fe77cfab63161"; 

const VAULT_CONTRACT_ABI = [
    "event NftLocked(address indexed sender, address indexed nftContract, uint256 indexed tokenId, bytes32 solanaRecipient)"
];

async function main() {
    console.log("Connecting to Ethereum via JSON-RPC...");
    
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    
    const vaultContract = new ethers.Contract(
        VAULT_CONTRACT_ADDRESS,
        VAULT_CONTRACT_ABI,
        provider
    );

    console.log(`Listening for NftLocked events on contract: ${VAULT_CONTRACT_ADDRESS}`);
    
    vaultContract.on("NftLocked", (sender, nftContract, tokenId, solanaRecipient, event) => {
        console.log(" New NftLocked Event Received!");
        console.log(`  Sender (on Ethereum): ${sender}`);
        console.log(`  NFT Contract: ${nftContract}`);
        console.log(`  Token ID: ${tokenId.toString()}`);
        console.log(`  Solana Recipient Pubkey (bytes32): ${solanaRecipient}`);
        console.log(`  Block Number: ${event.blockNumber}`);
        //
        // TODO: Your logic to trigger the Solana mint would go here.
        //
    });
}

main().catch((error) => {
    console.error("An error occurred:", error);
    process.exit(1);
});

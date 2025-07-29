Simple ETH → SOL NFT Bridge
This project demonstrates a foundational, decentralized bridge for transferring Non-Fungible Tokens (NFTs) from the Ethereum network to the Solana network. It uses a "Lock-and-Mint" pattern where an NFT is locked in a smart contract on Ethereum, and a corresponding "wrapped" version is minted on Solana after cryptographic verification.

The entire process is orchestrated by a user-facing React frontend, which guides the user through the two-chain workflow without a centralized backend relayer.

Project Architecture
The bridge consists of three core components:

Ethereum Vault Contract (NftVault.sol): A Solidity smart contract deployed on an Ethereum-compatible network (e.g., Sepolia testnet). Its sole responsibility is to securely lock ERC-721 tokens and emit an event as a public proof-of-lock.

Solana Minter Program (nft_bridge_minter): An Anchor smart contract deployed on the Solana network (e.g., Devnet). This program verifies the proof-of-lock from Ethereum by checking a user's cryptographic signature and, upon success, mints a new SPL token representing the locked NFT.

React Frontend (BridgeComponent.jsx): A user interface built with React, Ethers.js, and Anchor. It connects to the user's MetaMask (Ethereum) and Phantom (Solana) wallets to guide them through the two-step bridging process.

How It Works
The bridging process is atomic from the user's perspective but involves a sequence of transactions across two chains.

Bridging from Ethereum → Solana
Connect Wallets: The user connects both their MetaMask and Phantom wallets to the frontend application.

Approve: The user initiates the lock process. The frontend first sends an approve transaction to the original NFT contract, giving the NftVault contract permission to manage that specific NFT.

Lock: Immediately after approval, the frontend sends a lock transaction to the NftVault contract. The NFT is transferred into the vault for safekeeping, and the contract emits an NftLocked event.

Sign Proof: The frontend constructs a unique, human-readable message (e.g., "Bridge NFT with Token ID 123 from contract 0x... to Solana address ...abc"). The user signs this message with their MetaMask wallet. This signature is the unforgeable proof that the owner authorized the bridge.

Verify & Mint: The frontend sends a transaction to the Solana Minter program, including the signed proof. The Solana program then performs the verification and minting.

The secp256k1 Verification
The security of this entire bridge relies on the cryptographic verification performed on Solana. This is made possible by the secp256k1 elliptic curve, which is the standard used by both Ethereum and Bitcoin.

Signing on Ethereum: When a user signs a message with MetaMask, the wallet uses the user's private key and the message hash to produce a unique digital signature. The formula is essentially:
private key + message hash → signature

Recovering on Solana: The Solana program uses a special, highly efficient instruction called secp256k1_recover. This function performs the reverse operation. It takes the signature and the exact same message hash to mathematically recover the public key of the account that must have created it. The formula is:
signature + message hash → public key

The Solana program then simply checks if the recovered public key matches the Ethereum address the user claimed to be. If they match, the proof is valid. This process is secure because without the original private key, it is computationally impossible to create a valid signature that would recover the correct public key.

How to Set Up and Run
Prerequisites
Node.js (v18 or higher)

Yarn or npm

Rust and Cargo

Solana CLI tool suite

Anchor CLI (avm install latest, avm use latest)

MetaMask browser extension

Phantom browser extension

Step 1: Deploy the Ethereum Contract
Open the NftVault.sol contract in an IDE like Remix.

Compile the contract with Solidity compiler version ^0.8.20.

Connect your MetaMask to an Ethereum testnet (e.g., Sepolia).

Deploy the contract.

Copy the deployed contract address. You will need this for the frontend.

Step 2: Deploy the Solana Program
Navigate to the Solana program directory: programs/nft_bridge_minter/.

Crucially, open Cargo.toml and add the secp256k1-program feature flag if it's not already there:

[features]
secp256k1-program = []

From the project root, run anchor build. This will compile the program and generate its IDL (Interface Definition Language).

Run anchor deploy.

Copy the Program ID from the deployment output.

Copy the generated IDL file from target/idl/nft_bridge_minter.json into your frontend's src/lib/ directory.

Step 3: Configure and Run the Frontend
Navigate to the frontend/ directory.

Install dependencies: npm install.

In your BridgeComponent.jsx or a config file, update the following constants:

NFT_VAULT_ADDRESS: The Ethereum contract address from Step 1.

SOLANA_PROGRAM_ID: The Solana Program ID from Step 2.

WRAPPED_NFT_MINT_PUBKEY: The public key of the SPL Token Mint you created on Solana to represent the wrapped NFT collection.

Start the React development server: npm run dev.

Open your browser to http://localhost:5173 (or the specified port) to use the bridge.

Key Technologies
Solidity: For the Ethereum smart contract.

Rust: For the Solana smart contract.

Anchor Framework: For rapid development on Solana.

React: For the frontend user interface.

Ethers.js: For interacting with the Ethereum blockchain.

@solana/wallet-adapter: For seamless integration with Solana wallets like Phantom.

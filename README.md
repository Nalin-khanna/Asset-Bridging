# 🪄 NFT Bridge Minter (Solana Program)

This Solana Anchor-based smart contract allows minting **wrapped NFTs** on Solana after verifying an **Ethereum ECDSA signature**. It acts as a trustless bridge for NFTs from Ethereum to Solana.

---

## ⚙️ Features

-  Verifies Ethereum signatures using `secp256k1_recover`
-  Ensures the message was signed by the rightful Ethereum address
-  Mints a wrapped NFT to a Solana wallet
-  Uses deterministic PDAs for mint & authority
-  The Ethereum contract locks the NFT in an escrow.

---

##  Structure

- **Main Instruction:** `mint_wrapped_nft`
- **Accounts:**
  - `wrapped_asset_mint`: The mint account for the wrapped NFT
  - `mint_authority`: PDA with mint authority
  - `recipient_token_account`: Token account receiving the wrapped NFT
  - `recipient_owner`: Solana wallet receiving the NFT
  - `payer`: The transaction fee payer

---

##  How it Works

1. Ethereum signs a message , locks the NFT
2. This message is verified using Ethereum's ECDSA via secp256k1.
3. If verified, a wrapped NFT is minted to the provided Solana wallet.

##  Instruction: `mint_wrapped_nft`

```rust
pub fn mint_wrapped_nft(
 ctx: Context<MintWrappedNft>,
 eth_address: [u8; 20],
 original_token_id: String,
 original_nft_contract_info : String, 
 signature_r: [u8; 32],
 signature_s: [u8; 32],
 recovery_id: u8,
) -> Result<()>
```

4. Signature Verification
We reconstruct the Ethereum-signed message and hash it using Keccak-256. The recovered public key is then converted to an Ethereum address and matched against the provided one


## Build & Test
anchor build
anchor test

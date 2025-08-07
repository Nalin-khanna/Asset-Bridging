import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { expect } from "chai";
import { ethers } from "ethers";
import secp256k1 from "secp256k1";
import { keccak256 } from "ethers";

describe("NFT Bridge Minter", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.nftBridgeMinter as any;
  
  // Token program constants
  const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
  
  // Helper function to get associated token address
  function getAssociatedTokenAddressSync(mint: PublicKey, owner: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [
        owner.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];
  }

  // Test accounts
  let payer: Keypair;
  let recipientOwner: Keypair;
  let ethPrivateKey: Uint8Array;
  let ethAddress: Uint8Array;

  // Test data
  const originalTokenId = "12345";
  const originalNftContractInfo = "0x1234567890abcdef1234567890abcdef12345678";

  before(async () => {
    // Initialize test accounts
    payer = Keypair.generate();
    recipientOwner = Keypair.generate();

    // Airdrop SOL to test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(recipientOwner.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
    );

    // Generate Ethereum test keys
    ethPrivateKey = new Uint8Array(32);
    ethPrivateKey.fill(1); // Simple test private key
    const ethPublicKey = secp256k1.publicKeyCreate(ethPrivateKey, false).slice(1); // Remove 0x04 prefix
    const publicKeyHash = keccak256(ethPublicKey);
    ethAddress = new Uint8Array(Buffer.from(publicKeyHash.slice(2), 'hex').slice(-20)); // Last 20 bytes
  });

  // Helper function to create Ethereum-style signature
  async function createEthereumSignature(
    message: string,
    privateKey: Uint8Array
  ): Promise<{ r: Uint8Array; s: Uint8Array; recoveryId: number }> {
    const ethMessage = `\x19Ethereum Signed Message:\n${message.length}${message}`;
    const messageHashHex = keccak256(Buffer.from(ethMessage, 'utf8'));
    const messageHash = new Uint8Array(Buffer.from(messageHashHex.slice(2), 'hex'));
    
    const signature = secp256k1.ecdsaSign(messageHash, privateKey);
    
    return {
      r: signature.signature.slice(0, 32),
      s: signature.signature.slice(32, 64),
      recoveryId: signature.recid
    };
  }

  // Helper function to derive PDAs
  function derivePDAs(tokenId: string, contractInfo: string) {
    const [mintAuthorityPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("wrapped_asset_mint_auth")],
      program.programId
    );

    const [wrappedAssetMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("wrapped_nft_mint"),
        Buffer.from(contractInfo).subarray(0, 10),
        Buffer.from(tokenId).subarray(0, 10)
      ],
      program.programId
    );

    return { mintAuthorityPDA, wrappedAssetMint };
  }

  describe("Successful NFT Minting", () => {
    it("Should successfully mint NFT with valid signature", async () => {
      const { mintAuthorityPDA, wrappedAssetMint } = derivePDAs(originalTokenId, originalNftContractInfo);
      
      const recipientTokenAccount = getAssociatedTokenAddressSync(
        wrappedAssetMint,
        recipientOwner.publicKey
      );

      // Create the message that would be signed on Ethereum
      const message = `Bridge NFT with Token ID ${originalTokenId} from contract ${originalNftContractInfo} to Solana address ${recipientOwner.publicKey.toString()}`;
      
      // Create signature
      const { r, s, recoveryId } = await createEthereumSignature(message, ethPrivateKey);

      // Execute the mint instruction
      const tx = await program.methods
        .mint(
          Array.from(ethAddress),
          originalTokenId,
          originalNftContractInfo,
          Array.from(r),
          Array.from(s),
          recoveryId
        )
        .accounts({
          wrappedAssetMint: wrappedAssetMint,
          mintAuthority: mintAuthorityPDA,
          recipientTokenAccount: recipientTokenAccount,
          recipientOwner: recipientOwner.publicKey,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([payer])
        .rpc();

      console.log("Mint transaction signature:", tx);

      // Verify the mint was created
      const mintInfo = await provider.connection.getAccountInfo(wrappedAssetMint);
      expect(mintInfo).to.not.be.null;

      // Verify the token account was created and has 1 token
      const tokenAccountInfo = await provider.connection.getTokenAccountBalance(recipientTokenAccount);
      expect(tokenAccountInfo.value.amount).to.equal("1");
      expect(tokenAccountInfo.value.decimals).to.equal(0);
    });
  });

  describe("Signature Verification Failures", () => {
    it("Should fail with invalid signature", async () => {
      const { mintAuthorityPDA, wrappedAssetMint } = derivePDAs("54321", originalNftContractInfo);
      
      const recipientTokenAccount = getAssociatedTokenAddressSync(
        wrappedAssetMint,
        recipientOwner.publicKey
      );

      // Create a different message than what we'll claim to sign
      const wrongMessage = `Wrong message content`;
      const { r, s, recoveryId } = await createEthereumSignature(wrongMessage, ethPrivateKey);

      try {
        await program.methods
          .mint(
            Array.from(ethAddress),
            "54321", // Different token ID
            originalNftContractInfo,
            Array.from(r),
            Array.from(s),
            recoveryId
          )
          .accounts({
            wrappedAssetMint: wrappedAssetMint,
            mintAuthority: mintAuthorityPDA,
            recipientTokenAccount: recipientTokenAccount,
            recipientOwner: recipientOwner.publicKey,
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .signers([payer])
          .rpc();
        
        expect.fail("Expected transaction to fail with invalid signature");
      } catch (error: any) {
        expect(error.message).to.include("SignatureVerificationFailed");
      }
    });

    it("Should fail with wrong Ethereum address", async () => {
      const { mintAuthorityPDA, wrappedAssetMint } = derivePDAs("67890", originalNftContractInfo);
      
      const recipientTokenAccount = getAssociatedTokenAddressSync(
        wrappedAssetMint,
        recipientOwner.publicKey
      );

      const message = `Bridge NFT with Token ID 67890 from contract ${originalNftContractInfo} to Solana address ${recipientOwner.publicKey.toString()}`;
      const { r, s, recoveryId } = await createEthereumSignature(message, ethPrivateKey);

      // Use a different Ethereum address
      const wrongEthAddress = new Uint8Array(20);
      wrongEthAddress.fill(255);

      try {
        await program.methods
          .mint(
            Array.from(wrongEthAddress), // Wrong address
            "67890",
            originalNftContractInfo,
            Array.from(r),
            Array.from(s),
            recoveryId
          )
          .accounts({
            wrappedAssetMint: wrappedAssetMint,
            mintAuthority: mintAuthorityPDA,
            recipientTokenAccount: recipientTokenAccount,
            recipientOwner: recipientOwner.publicKey,
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .signers([payer])
          .rpc();
        
        expect.fail("Expected transaction to fail with wrong Ethereum address");
      } catch (error: any) {
        expect(error.message).to.include("SignatureVerificationFailed");
      }
    });

    it("Should fail with invalid recovery ID", async () => {
      const { mintAuthorityPDA, wrappedAssetMint } = derivePDAs("11111", originalNftContractInfo);
      
      const recipientTokenAccount = getAssociatedTokenAddressSync(
        wrappedAssetMint,
        recipientOwner.publicKey
      );

      const message = `Bridge NFT with Token ID 11111 from contract ${originalNftContractInfo} to Solana address ${recipientOwner.publicKey.toString()}`;
      const { r, s } = await createEthereumSignature(message, ethPrivateKey);

      try {
        await program.methods
          .mint(
            Array.from(ethAddress),
            "11111",
            originalNftContractInfo,
            Array.from(r),
            Array.from(s),
            99 // Invalid recovery ID
          )
          .accounts({
            wrappedAssetMint: wrappedAssetMint,
            mintAuthority: mintAuthorityPDA,
            recipientTokenAccount: recipientTokenAccount,
            recipientOwner: recipientOwner.publicKey,
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .signers([payer])
          .rpc();
        
        expect.fail("Expected transaction to fail with invalid recovery ID");
      } catch (error: any) {
        expect(error.message).to.include("InvalidSignature");
      }
    });
  });

  describe("PDA Derivation", () => {
    it("Should derive correct PDAs for given inputs", async () => {
      const testTokenId = "test123";
      const testContract = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
      
      const { mintAuthorityPDA, wrappedAssetMint } = derivePDAs(testTokenId, testContract);

      // Verify mint authority PDA
      const [expectedMintAuthority, mintAuthorityBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("wrapped_asset_mint_auth")],
        program.programId
      );
      expect(mintAuthorityPDA.toString()).to.equal(expectedMintAuthority.toString());

      // Verify wrapped asset mint PDA
      const [expectedWrappedMint, wrappedMintBump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("wrapped_nft_mint"),
          Buffer.from(testContract).subarray(0, 10),
          Buffer.from(testTokenId).subarray(0, 10)
        ],
        program.programId
      );
      expect(wrappedAssetMint.toString()).to.equal(expectedWrappedMint.toString());
    });
  });

  describe("Duplicate Minting Prevention", () => {
    it("Should fail when trying to mint the same NFT twice", async () => {
      const duplicateTokenId = "duplicate123";
      const { mintAuthorityPDA, wrappedAssetMint } = derivePDAs(duplicateTokenId, originalNftContractInfo);
      
      const recipientTokenAccount = getAssociatedTokenAddressSync(
        wrappedAssetMint,
        recipientOwner.publicKey
      );

      const message = `Bridge NFT with Token ID ${duplicateTokenId} from contract ${originalNftContractInfo} to Solana address ${recipientOwner.publicKey.toString()}`;
      const { r, s, recoveryId } = await createEthereumSignature(message, ethPrivateKey);

      // First mint should succeed
      await program.methods
        .mint(
          Array.from(ethAddress),
          duplicateTokenId,
          originalNftContractInfo,
          Array.from(r),
          Array.from(s),
          recoveryId
        )
        .accounts({
          wrappedAssetMint: wrappedAssetMint,
          mintAuthority: mintAuthorityPDA,
          recipientTokenAccount: recipientTokenAccount,
          recipientOwner: recipientOwner.publicKey,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([payer])
        .rpc();

      // Second mint should fail because the mint account already exists
      try {
        await program.methods
          .mint(
            Array.from(ethAddress),
            duplicateTokenId,
            originalNftContractInfo,
            Array.from(r),
            Array.from(s),
            recoveryId
          )
          .accounts({
            wrappedAssetMint: wrappedAssetMint,
            mintAuthority: mintAuthorityPDA,
            recipientTokenAccount: recipientTokenAccount,
            recipientOwner: recipientOwner.publicKey,
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .signers([payer])
          .rpc();
        
        expect.fail("Expected transaction to fail due to duplicate mint");
      } catch (error: any) {
        // The error should be about the account already existing
        expect(error.message).to.include("already in use");
      }
    });
  });

  describe("Edge Cases", () => {
    it("Should handle very long token IDs and contract addresses", async () => {
      const longTokenId = "a".repeat(100); // Very long token ID
      const longContractInfo = "0x" + "1".repeat(80); // Very long contract address
      
      const { mintAuthorityPDA, wrappedAssetMint } = derivePDAs(longTokenId, longContractInfo);
      
      const recipientTokenAccount = getAssociatedTokenAddressSync(
        wrappedAssetMint,
        recipientOwner.publicKey
      );

      const message = `Bridge NFT with Token ID ${longTokenId} from contract ${longContractInfo} to Solana address ${recipientOwner.publicKey.toString()}`;
      const { r, s, recoveryId } = await createEthereumSignature(message, ethPrivateKey);

      const tx = await program.methods
        .mint(
          Array.from(ethAddress),
          longTokenId,
          longContractInfo,
          Array.from(r),
          Array.from(s),
          recoveryId
        )
        .accounts({
          wrappedAssetMint: wrappedAssetMint,
          mintAuthority: mintAuthorityPDA,
          recipientTokenAccount: recipientTokenAccount,
          recipientOwner: recipientOwner.publicKey,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([payer])
        .rpc();

      console.log("Long string mint transaction signature:", tx);

      // Verify the token was minted
      const tokenAccountInfo = await provider.connection.getTokenAccountBalance(recipientTokenAccount);
      expect(tokenAccountInfo.value.amount).to.equal("1");
    });

    it("Should handle empty token ID", async () => {
      const emptyTokenId = "";
      const { mintAuthorityPDA, wrappedAssetMint } = derivePDAs(emptyTokenId, originalNftContractInfo);
      
      const recipientTokenAccount = getAssociatedTokenAddressSync(
        wrappedAssetMint,
        recipientOwner.publicKey
      );

      const message = `Bridge NFT with Token ID ${emptyTokenId} from contract ${originalNftContractInfo} to Solana address ${recipientOwner.publicKey.toString()}`;
      const { r, s, recoveryId } = await createEthereumSignature(message, ethPrivateKey);

      const tx = await program.methods
        .mint(
          Array.from(ethAddress),
          emptyTokenId,
          originalNftContractInfo,
          Array.from(r),
          Array.from(s),
          recoveryId
        )
        .accounts({
          wrappedAssetMint: wrappedAssetMint,
          mintAuthority: mintAuthorityPDA,
          recipientTokenAccount: recipientTokenAccount,
          recipientOwner: recipientOwner.publicKey,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([payer])
        .rpc();

      console.log("Empty token ID mint transaction signature:", tx);
    });
  });
});

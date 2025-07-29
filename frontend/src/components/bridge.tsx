import React, { useState, useCallback, useEffect } from 'react';
import { useConnection, useAnchorWallet , useWallet } from '@solana/wallet-adapter-react';
import { ethers } from 'ethers';
import { NFT_VAULT_ABI } from '../lib/ABI.ts';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import idl from "../lib/IDL.json"
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Signature } from "ethers";
import type {NftBridgeMinter}  from '../types/nft_bridge';
import { getAssociatedTokenAddressSync , TOKEN_PROGRAM_ID , ASSOCIATED_TOKEN_PROGRAM_ID} from "@solana/spl-token";
import { PublicKey , SystemProgram } from "@solana/web3.js";
const BridgeComponent = () => {
    
    const { connection: solConnection } = useConnection();
    const wallet = useAnchorWallet();
    const [ethAccount, setEthAccount] = useState<string | null>(null);
    const [ethSigner, setEthSigner] = useState<ethers.Signer | null>(null);

   
    // State for Solana connection from the adapter
    
    const { publicKey: solPublicKey } = useWallet();

    // UI State
    const [nftContract, setNftContract] = useState('');
    const [tokenId, setTokenId] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    const log = useCallback((message : string) => {
        setLogs(prev => [message, ...prev]);
    }, []);

    const connectEthWallet = async () => {
    if (window.ethereum) {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const account = await signer.getAddress();
            setEthSigner(signer);
            setEthAccount(account);
            log(`Connected to MetaMask: ${account}`);
        } catch (error : any) {
            log(`Error connecting to MetaMask: ${error.message}`);
        }
    } else {
        log("MetaMask is not installed.");
    }
};

    const handleLock = async () => {
    // 0xEB6E6c629B37532927b10A26FB0E622771A7B35e
    const NFT_VAULT_ADDRESS = "0xeb6e6c629b37532927b10a26fb0e622771a7b35e";
    const ERC721_ABI = [ "function approve(address to, uint256 tokenId)", "function tokenURI(uint256 tokenId) view returns (string)"];

    setIsLoading(true);
    log('Starting lock...');

    try {
        const nft = new ethers.Contract(nftContract, ERC721_ABI, ethSigner);
        const vault = new ethers.Contract(NFT_VAULT_ADDRESS, NFT_VAULT_ABI, ethSigner);

        log(`1. Approving vault to transfer NFT ID: ${tokenId}...`);
        const approveTx = await nft.approve(NFT_VAULT_ADDRESS, tokenId);
        const receipt = await approveTx.wait();
        log('Approval successful.' );
        console.log(receipt);
        const tokenUri = await nft.tokenURI(tokenId);
        console.log("Token URI: ",tokenUri);
        const httpUri = tokenUri.replace("ipfs://", "https://ipfs.io/ipfs/");
        const metadata = await fetch(httpUri)
        const metadataJson = await metadata.json();
        console.log(metadataJson);        
        const imageIpfsUri = metadataJson.image;
        const imageHttpUri = imageIpfsUri.replace("ipfs://", "https://ipfs.io/ipfs/");
        

       
        
        log('2. Locking NFT in the vault...');
        const solanaAddressBytes32 = '0x' + solPublicKey!.toBuffer().toString('hex');
        console.log("Solana address as bytes32:", solanaAddressBytes32);
        console.log("NFT Contract:", nftContract , "Token ID:", tokenId);
        const lockTx = await vault.lock(nftContract, tokenId, solanaAddressBytes32);
        await lockTx.wait();
        log(`Lock successful! Tx: ${lockTx.hash}`);

        setIsLocked(true); // Enable the next step
    } catch (error : any) {
        log(`Error during lock: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
};

    const handleMint = async () => {
    setIsLoading(true);
    log('Starting mint...');

    try {
        // 1. Construct and sign the message
        const message = `Bridge NFT with Token ID ${tokenId} from contract ${nftContract} to Solana address ${solPublicKey?.toString()}`;
        log(`Signing message: "${message}"`);
        const signature = await ethSigner?.signMessage(message);

        
        const { r, s, v } = Signature.from(signature);
        const recoveryId = v - 27;
        console.log(`Signature R: ${r}, S: ${s}, Recovery ID: ${recoveryId}`);
        
        
        const provider = new anchor.AnchorProvider(solConnection , wallet!, { commitment: "confirmed" })
        anchor.setProvider(provider);
        const program = new Program(idl as NftBridgeMinter , provider)
        
        const [mintAuthorityPDA] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("wrapped_asset_mint_auth")],
            program.programId
        );
        const wrappedAssetMint = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("wrapped_asset_mint"), Buffer.from(nftContract), Buffer.from(tokenId)],
            program.programId
        )[0];

        const recipientTokenAccount = getAssociatedTokenAddressSync(
            wrappedAssetMint,
            solPublicKey!,
            false
        );
        const tx = await program.methods.mint(
            Array.from(ethers.getBytes(ethAccount!)),
            tokenId,
            nftContract,
            Array.from(ethers.getBytes(r)),
            Array.from(ethers.getBytes(s)),
            recoveryId
        ).accounts({
            wrapped_asset_mint: wrappedAssetMint,
            mint_authority : mintAuthorityPDA,
            recipient_token_account : recipientTokenAccount,
            recipient_owner : solPublicKey!,
            payer : solPublicKey!,
            system_program : SystemProgram.programId,
            token_program : TOKEN_PROGRAM_ID,
            associated_token_program : ASSOCIATED_TOKEN_PROGRAM_ID,
        }).signers([  
        ]).rpc();

        console.log("tx: ",tx);
        
        log(`Mint successful! Solana Tx: ${tx}`);
    } catch (error : any ) {
        log(`Error during mint: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
};

    return(
        <div className="bg-gray-800 text-white min-h-screen p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-center mb-8">Simple ETH → SOL NFT Bridge</h1>

                {/* Wallet Connection */}
                <div className="bg-gray-700 p-6 rounded-lg mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <button onClick={connectEthWallet} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                        {ethAccount ? `MetaMask: ${ethAccount.slice(0, 6)}...${ethAccount.slice(-4)}` : '1. Connect MetaMask'}
                    </button>
                    <WalletMultiButton style={{width: '100%', backgroundColor: '#8a2be2', transition: 'background-color 0.2s' }} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Step 1: Lock on Ethereum */}
                    <div className="bg-gray-700 p-6 rounded-lg space-y-4">
                        <h2 className="text-2xl font-bold">Step 1: Lock on Ethereum</h2>
                        <input
                            type="text"
                            placeholder="NFT Contract Address (e.g., 0x...)"
                            className="w-full p-3 bg-gray-800 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={(e) => setNftContract(e.target.value)}
                            value={nftContract}
                        />
                        <input
                            type="text"
                            placeholder="NFT Token ID (e.g., 1234)"
                            className="w-full p-3 bg-gray-800 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={(e) => setTokenId(e.target.value)}
                            value={tokenId}
                        />
                        <button 
                            onClick={handleLock} 
                            disabled={isLoading || !ethAccount || !solPublicKey || isLocked}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Processing...' : 'Approve & Lock NFT'}
                        </button>
                    </div>

                    {/* Step 2: Mint on Solana */}
                    <div className="bg-gray-700 p-6 rounded-lg space-y-4">
                        <h2 className="text-2xl font-bold">Step 2: Mint on Solana</h2>
                        <p className="text-gray-400 h-24">
                            {isLocked ? `Ready to mint NFT . Click below to sign the proof with MetaMask and complete the bridge.` : 'Complete Step 1 to enable this step.'}
                        </p>
                        <button 
                            onClick={handleMint} 
                            disabled={isLoading || !isLocked}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Processing...' : 'Sign Proof & Mint'}
                        </button>
                    </div>
                </div>

               
                <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-2">Logs</h3>
                    <pre className="bg-gray-900 p-4 rounded-lg h-64 overflow-y-auto text-sm text-gray-300">
                        {logs.join('\n')}
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default BridgeComponent;
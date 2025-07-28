import React, { useState, useCallback, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { ethers } from 'ethers';
import { NFT_VAULT_ABI } from '../lib/ABI.ts';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { Signature } from "ethers";

const BridgeComponent = () => {
    // Initialize UMI
    const { connection: solConnection } = useConnection();
    const wallet = useWallet();
    const umi = createUmi(solConnection.rpcEndpoint)
        .use(mplTokenMetadata())
        .use(walletAdapterIdentity(wallet));
    // State for Ethereum connection
    const [ethAccount, setEthAccount] = useState<string | null>(null);
    const [ethSigner, setEthSigner] = useState<ethers.Signer | null>(null);

   
    // State for Solana connection from the adapter
    
    const { publicKey: solPublicKey, sendTransaction } = useWallet();

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
    
    const NFT_VAULT_ADDRESS = "0xf10f170071d495b9e2da7683568fe77cfab63161";
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
        

       
        const metadata_for_solana = {
            "name": metadataJson.name,
            "description": metadataJson.description,
            "image": imageHttpUri,
            "external_url": "https://example.com/my-nft.json",
            "attributes": [
              {
                "trait_type": "trait1",
                "value": "value1"
              },
              {
                "trait_type": "trait2",
                "value": "value2"
              }
            ],
            "properties": {
              "files": [
                {
                  "uri": imageHttpUri,
                  "type": "image/png"
                }
              ],
              "category": "image"
            }
          }

        const metadataUri = await umi.uploader.uploadJson(metadata_for_solana).catch((err) => {
            throw new Error(err)
          })  
        console.log('Metadata URI: ', metadataUri)
        // log('2. Locking NFT in the vault...');
        // const solanaAddressBytes32 = '0x' + solPublicKey!.toBuffer().toString('hex');
        // const lockTx = await vault.lock(nftContract, tokenId, solanaAddressBytes32);
        // await lockTx.wait();
        // log(`Lock successful! Tx: ${lockTx.hash}`);

        // setIsLocked(true); // Enable the next step
    } catch (error : any) {
        log(`Error during lock: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
};

    const handleMint = async () => {
    // ... (Add your Solana program ID and IDL)
    // You would first need to modify your Solana program to accept a tokenId
    // instead of an amount. Let's assume you've done that.

    setIsLoading(true);
    log('Starting mint...');

    try {
        // 1. Construct and sign the message
        const message = `Bridge NFT with Token ID ${tokenId} from contract ${nftContract} to Solana address ${solPublicKey?.toString()}`;
        log(`Signing message: "${message}"`);
        const signature = await ethSigner?.signMessage(message);

        // 2. Prepare arguments for Anchor
        const { r, s, v } = Signature.from(signature);
        const recoveryId = v - 27;
        
        // ... (Setup Anchor provider and program)
        // const program = new anchor.Program(...)

        // 3. Call the mint_wrapped instruction (assuming it's modified for NFTs)
        // const tx = await program.methods.mintWrapped(
        //     Array.from(ethers.utils.arrayify(ethAccount)),
        //     new anchor.BN(tokenId), // Pass tokenId
        //     Array.from(r),
        //     Array.from(s),
        //     recoveryId
        // ).rpc();

        log(`Mint successful! Solana Tx: `);
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

                {/* Log Output */}
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
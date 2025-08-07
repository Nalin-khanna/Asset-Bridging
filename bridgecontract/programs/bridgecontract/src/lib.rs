use anchor_lang::prelude::*;
use anchor_spl::token::{self, MintTo, Token, TokenAccount, Mint , mint_to};
use anchor_lang::solana_program::{
    secp256k1_recover::secp256k1_recover,
    keccak,
};

 declare_id!("HZnbK4bXJC9LLCE7DJxrabmKgBqpB8JM4ySRbpnwYrfT");

#[program]
pub mod nft_bridge_minter {
    use super::*;
    pub fn mint(ctx : Context<MintWrappedNft> , eth_address: [u8; 20],
        original_token_id: String,
        original_nft_contract_info : String, 
        signature_r: [u8; 32],
        signature_s: [u8; 32],
        recovery_id: u8, ) -> Result<()>{
            
        ctx.accounts.mint_wrapped_nft(eth_address , 
            original_token_id, 
            original_nft_contract_info, 
            signature_r, 
            signature_s, 
            recovery_id, 
            &ctx.bumps)
    }
}

#[derive(Accounts)]
#[instruction(original_nft_contract_info : String , original_token_id : String)]
pub struct MintWrappedNft<'info> {
    #[account(
    init,
    payer = payer,
    seeds = [
        b"wrapped_nft_mint",
        &original_nft_contract_info.as_bytes()[..10],
        &original_token_id.as_bytes()[..10]
    ],
    bump,
    mint::decimals = 0,
    mint::authority = mint_authority,
    mint::freeze_authority = mint_authority,
   )]
    pub wrapped_asset_mint: Account<'info, Mint>,

    /// CHECK: This is the mint authority PDA that will be used to mint tokens
    #[account(
        seeds = [b"wrapped_asset_mint_auth"],
        bump
    )]
    pub mint_authority: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = wrapped_asset_mint,
        associated_token::authority = recipient_owner,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: This is the recipient owner
    pub recipient_owner: SystemAccount<'info>,
    

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    
}

impl <'info> MintWrappedNft <'info> {
    pub fn mint_wrapped_nft(
        & self,
        eth_address: [u8; 20],
        original_token_id: String,
        original_nft_contract_info : String, 
        signature_r: [u8; 32],
        signature_s: [u8; 32],
        recovery_id: u8,
        bumps : &MintWrappedNftBumps,
    ) -> Result<()> {

        let recipient_sol_addr_str = self.recipient_owner.key().to_string();

        let message_str = format!(
            "Bridge NFT with Token ID {} from contract {} to Solana address {}",
            original_token_id,
            original_nft_contract_info,
            recipient_sol_addr_str
        );
        
        

       
        let eth_message = format!("\x19Ethereum Signed Message:\n{}{}", message_str.len(), message_str);
        let message_hash = keccak::hash(eth_message.as_bytes());

        let mut signature = [0u8; 64];
            signature[0..32].copy_from_slice(&signature_r);
            signature[32..64].copy_from_slice(&signature_s);

            let recovered_pubkey = secp256k1_recover(
                &message_hash.to_bytes(),
                recovery_id,
                &signature,
            ).map_err(|_| BridgeError::InvalidSignature)?;

        
        let recovered_eth_address = &keccak::hash(&recovered_pubkey.to_bytes()).to_bytes()[12..];
        require!(
            recovered_eth_address == eth_address,
            BridgeError::SignatureVerificationFailed
        );

        msg!("Signature verification successful!");

        let cpi_accounts = MintTo {
            mint: self.wrapped_asset_mint.to_account_info(),
            to: self.recipient_token_account.to_account_info(),
            authority: self.mint_authority.to_account_info(),
        };
        let cpi_program = self.token_program.to_account_info();

        let seeds = b"wrapped_asset_mint_auth";
        let bump = bumps.mint_authority;
        let signer_seeds: &[&[&[u8]]] = &[&[seeds, &[bump]]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        
        token::mint_to(cpi_ctx, 1)?;
        
        msg!("Minted 1 wrapped NFT to {}", self.recipient_owner.key());

        Ok(())
    }
}

#[error_code]
pub enum BridgeError {
    #[msg("The Ethereum signature verification failed.")]
    SignatureVerificationFailed,
    #[msg("Invalid signature")]
    InvalidSignature
}




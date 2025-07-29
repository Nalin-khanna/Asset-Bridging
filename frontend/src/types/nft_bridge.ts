/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/nft_bridge_minter.json`.
 */
export type NftBridgeMinter = {
    "address": "HZnbK4bXJC9LLCE7DJxrabmKgBqpB8JM4ySRbpnwYrfT",
    "metadata": {
      "name": "nftBridgeMinter",
      "version": "0.1.0",
      "spec": "0.1.0",
      "description": "Created with Anchor"
    },
    "instructions": [
      {
        "name": "mint",
        "discriminator": [
          51,
          57,
          225,
          47,
          182,
          146,
          137,
          166
        ],
        "accounts": [
          {
            "name": "wrappedAssetMint",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    119,
                    114,
                    97,
                    112,
                    112,
                    101,
                    100,
                    95,
                    110,
                    102,
                    116,
                    95,
                    109,
                    105,
                    110,
                    116
                  ]
                },
                {
                  "kind": "arg",
                  "path": "originalNftContractInfo"
                },
                {
                  "kind": "arg",
                  "path": "originalTokenId"
                }
              ]
            }
          },
          {
            "name": "mintAuthority",
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    119,
                    114,
                    97,
                    112,
                    112,
                    101,
                    100,
                    95,
                    97,
                    115,
                    115,
                    101,
                    116,
                    95,
                    109,
                    105,
                    110,
                    116,
                    95,
                    97,
                    117,
                    116,
                    104
                  ]
                }
              ]
            }
          },
          {
            "name": "recipientTokenAccount",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "recipientOwner"
                },
                {
                  "kind": "const",
                  "value": [
                    6,
                    221,
                    246,
                    225,
                    215,
                    101,
                    161,
                    147,
                    217,
                    203,
                    225,
                    70,
                    206,
                    235,
                    121,
                    172,
                    28,
                    180,
                    133,
                    237,
                    95,
                    91,
                    55,
                    145,
                    58,
                    140,
                    245,
                    133,
                    126,
                    255,
                    0,
                    169
                  ]
                },
                {
                  "kind": "account",
                  "path": "wrappedAssetMint"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            }
          },
          {
            "name": "recipientOwner"
          },
          {
            "name": "payer",
            "writable": true,
            "signer": true
          },
          {
            "name": "systemProgram",
            "address": "11111111111111111111111111111111"
          },
          {
            "name": "tokenProgram",
            "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          },
          {
            "name": "associatedTokenProgram",
            "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
          }
        ],
        "args": [
          {
            "name": "ethAddress",
            "type": {
              "array": [
                "u8",
                20
              ]
            }
          },
          {
            "name": "originalTokenId",
            "type": "string"
          },
          {
            "name": "originalNftContractInfo",
            "type": "string"
          },
          {
            "name": "signatureR",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "signatureS",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "recoveryId",
            "type": "u8"
          }
        ]
      }
    ],
    "errors": [
      {
        "code": 6000,
        "name": "signatureVerificationFailed",
        "msg": "The Ethereum signature verification failed."
      },
      {
        "code": 6001,
        "name": "invalidSignature",
        "msg": "Invalid signature"
      }
    ]
  };
  
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Represents a UTXO commitment: who can spend it and whether it's used
struct Commitment {
    address owner; // authorized spender (via ECDSA)
    bool locked; // true if already locked in conditional spending
}

struct DepositCommitmentParams {
    uint256 poseidonHash;
    address owner;
    bytes encryptedData;
}

struct DepositParams {
    address token;
    uint256 total_deposit_amount;
    DepositCommitmentParams[3] depositCommitmentParams;
    uint256 fee;
    address feeRecipient;
}

struct OutputsOwners {
    address owner; // owner of new UTXO commitment
    uint8[] indexes; // positions in the outputsPoseidonHashes
}

struct Transaction {
    address token;
    uint256[] inputsPoseidonHashes; // UTXO commitments to consume
    uint256[] outputsPoseidonHashes; // New UTXO commitments to create
    bytes[] encryptedData; // encrypted data for each output
    OutputsOwners[] outputsOwners; // addresses for outputs
    uint240 fee; // for now will be always 0
    address feeRecipient; // address to receive the fee
}

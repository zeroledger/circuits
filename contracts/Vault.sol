// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import {PoseidonT3} from "poseidon-solidity/PoseidonT3.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {DepositVerifier} from "./DepositVerifier.sol";
import {Spend11Verifier} from "./Spend11Verifier.sol";
import {Spend12Verifier} from "./Spend12Verifier.sol";
import {Spend13Verifier} from "./Spend13Verifier.sol";
import {Spend21Verifier} from "./Spend21Verifier.sol";
import {Spend22Verifier} from "./Spend22Verifier.sol";
import {Spend23Verifier} from "./Spend23Verifier.sol";
import {Spend31Verifier} from "./Spend31Verifier.sol";
import {Spend32Verifier} from "./Spend32Verifier.sol";
import {Spend161Verifier} from "./Spend161Verifier.sol";
import {EncryptionRegistry} from "./Registry.sol";
import {Commitment, DepositCommitmentParams, DepositParams, OutputsOwners, Transaction} from "./Vault.types.sol";
import {InputsLib} from "./Inputs.lib.sol";

/**
 * @title Vault
 * @dev A contract that manages ERC20 tokens with commitments and ZK proofs for deposits, withdrawals, and spending
 */
contract Vault is ReentrancyGuard {
    // Mapping to track if a commitment hash has been deposited
    mapping(address => mapping(uint256 => Commitment)) public commitmentsMap;

    // DepositVerifier contract for ZK proof validation
    DepositVerifier public immutable depositVerifier;

    // Spend11Verifier contract for ZK proof validation
    Spend11Verifier public immutable spend11Verifier;

    // Spend12Verifier contract for ZK proof validation
    Spend12Verifier public immutable spend12Verifier;

    // Spend13Verifier contract for ZK proof validation
    Spend13Verifier public immutable spend13Verifier;

    // Spend21Verifier contract for ZK proof validation
    Spend21Verifier public immutable spend21Verifier;

    // Spend22Verifier contract for ZK proof validation
    Spend22Verifier public immutable spend22Verifier;

    // Spend23Verifier contract for ZK proof validation
    Spend23Verifier public immutable spend23Verifier;

    // Spend31Verifier contract for ZK proof validation
    Spend31Verifier public immutable spend31Verifier;

    // Spend32Verifier contract for ZK proof validation
    Spend32Verifier public immutable spend32Verifier;

    // Spend161Verifier contract for ZK proof validation
    Spend161Verifier public immutable spend161Verifier;

    // EncryptionRegistry contract for encryption key management
    EncryptionRegistry public immutable encryptionRegistry;

    // Events
    event TokenDeposited(address indexed user, address indexed token, uint256 total_deposit_amount, uint256 fee);
    event CommitmentCreated(address indexed owner, address indexed token, uint256 indexed poseidonHash);
    event EncryptedMetadata(uint256 indexed poseidonHash, bytes indexed encryptedData);
    event CommitmentRemoved(address indexed owner, address indexed token, uint256 indexed poseidonHash);
    event TransactionSpent(
        address indexed owner, address indexed token, uint256[] inputHashes, uint256[] outputHashes, uint256 fee
    );

    constructor(
        address _depositVerifier,
        address _spend11Verifier,
        address _spend12Verifier,
        address _spend13Verifier,
        address _spend21Verifier,
        address _spend22Verifier,
        address _spend23Verifier,
        address _spend31Verifier,
        address _spend32Verifier,
        address _spend161Verifier,
        address _encryptionRegistry
    ) {
        depositVerifier = DepositVerifier(_depositVerifier);
        spend11Verifier = Spend11Verifier(_spend11Verifier);
        spend12Verifier = Spend12Verifier(_spend12Verifier);
        spend13Verifier = Spend13Verifier(_spend13Verifier);
        spend21Verifier = Spend21Verifier(_spend21Verifier);
        spend22Verifier = Spend22Verifier(_spend22Verifier);
        spend23Verifier = Spend23Verifier(_spend23Verifier);
        spend31Verifier = Spend31Verifier(_spend31Verifier);
        spend32Verifier = Spend32Verifier(_spend32Verifier);
        spend161Verifier = Spend161Verifier(_spend161Verifier);
        encryptionRegistry = EncryptionRegistry(_encryptionRegistry);
    }

    /**
     * @dev Deposit tokens with commitments and ZK proof validation
     * @param depositParams The deposit parameters
     * @param proof ZK proof bytes
     */
    function deposit(DepositParams calldata depositParams, uint256[24] calldata proof) external nonReentrant {
        address token = depositParams.token;
        uint256 total_deposit_amount = depositParams.total_deposit_amount;
        DepositCommitmentParams[3] calldata depositCommitmentParams = depositParams.depositCommitmentParams;
        uint256 fee = depositParams.fee;
        address feeRecipient = depositParams.feeRecipient;
        require(token != address(0), "Vault: Invalid token address");
        require(total_deposit_amount > 0, "Vault: Amount must be greater than 0");
        // Check that no commitment has been used before
        for (uint256 i = 0; i < 3; i++) {
            require(
                commitmentsMap[token][depositCommitmentParams[i].poseidonHash].owner == address(0),
                "Vault: Commitment already used"
            );
        }

        // Verify ZK proof
        bool isValidProof =
            depositVerifier.verify(proof, InputsLib.depositInputs(depositCommitmentParams, total_deposit_amount));
        require(isValidProof, "Vault: Invalid ZK proof");

        // Assign commitments to addresses before external call
        for (uint256 i = 0; i < depositCommitmentParams.length; i++) {
            commitmentsMap[token][depositCommitmentParams[i].poseidonHash] =
                Commitment({owner: depositCommitmentParams[i].owner, locked: false});
            emit CommitmentCreated(depositCommitmentParams[i].owner, token, depositCommitmentParams[i].poseidonHash);
            emit EncryptedMetadata(depositCommitmentParams[i].poseidonHash, depositCommitmentParams[i].encryptedData);
        }

        // Transfer tokens from user to contract (external call)
        IERC20(token).transferFrom(msg.sender, address(this), total_deposit_amount);
        if (fee > 0) {
            IERC20(token).transferFrom(msg.sender, feeRecipient, fee);
        }
        emit TokenDeposited(msg.sender, token, total_deposit_amount, fee);
    }

    /**
     * @dev Validate that all input indexes are owned by the sender
     */
    function _validateInputIndexes(Transaction calldata transaction) internal view {
        for (uint256 i = 0; i < transaction.inputsPoseidonHashes.length; i++) {
            require(
                commitmentsMap[transaction.token][transaction.inputsPoseidonHashes[i]].owner == msg.sender,
                "Vault: Input commitment not found"
            );
        }
    }

    /**
     * @dev Delete input commitments and emit events
     */
    function _deleteInputCommitments(Transaction calldata transaction) internal {
        for (uint256 i = 0; i < transaction.inputsPoseidonHashes.length; i++) {
            uint256 inputHash = transaction.inputsPoseidonHashes[i];
            address inputOwner = commitmentsMap[transaction.token][inputHash].owner;
            delete commitmentsMap[transaction.token][inputHash];
            emit CommitmentRemoved(inputOwner, transaction.token, inputHash);
        }
    }

    /**
     * @dev Create output commitments using indexes from output witnesses
     */
    function _createOutputCommitments(Transaction calldata transaction) internal {
        for (uint256 i = 0; i < transaction.outputsOwners.length; i++) {
            OutputsOwners memory outputWitness = transaction.outputsOwners[i];
            address outputOwner = outputWitness.owner;

            for (uint256 j = 0; j < outputWitness.indexes.length; j++) {
                uint8 outputIndex = outputWitness.indexes[j];
                uint256 outputHash = transaction.outputsPoseidonHashes[outputIndex];
                commitmentsMap[transaction.token][outputHash] = Commitment({owner: outputOwner, locked: false});
                emit CommitmentCreated(outputOwner, transaction.token, outputHash);
                emit EncryptedMetadata(outputHash, transaction.encryptedData[outputIndex]);
            }
        }
    }

    /**
     * @dev Craft public inputs array for ZK proof verification
     * @param transaction The transaction data
     * @param publicInputs Array of public inputs in the format: [inputHashes..., outputHashes..., fee]
     */
    function _fillPublicInputs(Transaction calldata transaction, uint256[] memory publicInputs) internal pure {
        uint256 totalInputs = transaction.inputsPoseidonHashes.length;
        uint256 totalOutputs = transaction.outputsPoseidonHashes.length;

        // Fill input hashes
        for (uint256 i = 0; i < totalInputs; i++) {
            publicInputs[i] = transaction.inputsPoseidonHashes[i];
        }

        // Fill output hashes
        for (uint256 i = 0; i < totalOutputs; i++) {
            publicInputs[totalInputs + i] = transaction.outputsPoseidonHashes[i];
        }

        // Fill fee at the end
        publicInputs[totalInputs + totalOutputs] = uint256(transaction.fee);
    }

    /**
     * @dev Spend commitments by creating new ones (supports multiple inputs and outputs)
     * @param transaction The transaction data
     * @param proof ZK proof bytes
     */
    function spend(Transaction calldata transaction, uint256[24] calldata proof) external nonReentrant {
        require(transaction.token != address(0), "Vault: Invalid token address");
        require(transaction.inputsPoseidonHashes.length > 0, "Vault: No inputs provided");
        require(transaction.outputsPoseidonHashes.length > 0, "Vault: No outputs provided");

        // Validate indexes using separate methods to reduce stack size
        _validateInputIndexes(transaction);

        // Verify ZK proof based on input/output combination
        bool isValidProof = false;
        if (transaction.inputsPoseidonHashes.length == 1 && transaction.outputsPoseidonHashes.length == 1) {
            isValidProof = spend11Verifier.verify(proof, InputsLib.fillSpend3Inputs(transaction));
        } else if (transaction.inputsPoseidonHashes.length == 1 && transaction.outputsPoseidonHashes.length == 2) {
            isValidProof = spend12Verifier.verify(proof, InputsLib.fillSpend4Inputs(transaction));
        } else if (transaction.inputsPoseidonHashes.length == 1 && transaction.outputsPoseidonHashes.length == 3) {
            isValidProof = spend13Verifier.verify(proof, InputsLib.fillSpend5Inputs(transaction));
        } else if (transaction.inputsPoseidonHashes.length == 2 && transaction.outputsPoseidonHashes.length == 1) {
            isValidProof = spend21Verifier.verify(proof, InputsLib.fillSpend4Inputs(transaction));
        } else if (transaction.inputsPoseidonHashes.length == 2 && transaction.outputsPoseidonHashes.length == 2) {
            isValidProof = spend22Verifier.verify(proof, InputsLib.fillSpend5Inputs(transaction));
        } else if (transaction.inputsPoseidonHashes.length == 2 && transaction.outputsPoseidonHashes.length == 3) {
            isValidProof = spend23Verifier.verify(proof, InputsLib.fillSpend6Inputs(transaction));
        } else if (transaction.inputsPoseidonHashes.length == 3 && transaction.outputsPoseidonHashes.length == 1) {
            isValidProof = spend31Verifier.verify(proof, InputsLib.fillSpend5Inputs(transaction));
        } else if (transaction.inputsPoseidonHashes.length == 3 && transaction.outputsPoseidonHashes.length == 2) {
            isValidProof = spend32Verifier.verify(proof, InputsLib.fillSpend6Inputs(transaction));
        } else if (transaction.inputsPoseidonHashes.length == 16 && transaction.outputsPoseidonHashes.length == 1) {
            isValidProof = spend161Verifier.verify(proof, InputsLib.fillSpend18Inputs(transaction));
        }

        require(isValidProof, "Vault: Invalid ZK proof");

        // Delete all input commitments from storage (saves gas)
        _deleteInputCommitments(transaction);

        // Create new output commitments using the indexes from output witnesses
        _createOutputCommitments(transaction);

        // Transfer fee to fee recipient
        if (transaction.fee > 0) {
            IERC20(transaction.token).transfer(transaction.feeRecipient, transaction.fee);
        }

        // Emit single transaction event for the atomic operation
        emit TransactionSpent(
            msg.sender,
            transaction.token,
            transaction.inputsPoseidonHashes,
            transaction.outputsPoseidonHashes,
            transaction.fee
        );
    }

    /**
     * @dev Withdraw a commitment by providing amount and secret
     * @param token The ERC20 token address
     * @param amount The amount of tokens to withdraw
     * @param sValue The secret entropy used to create the commitment
     */
    function withdraw(address token, uint256 amount, bytes32 sValue) external nonReentrant {
        require(token != address(0), "Vault: Invalid token address");
        require(amount > 0, "Vault: Amount must be greater than 0");

        // Compute the Poseidon hash on-chain
        uint256 poseidonHash = computePoseidonHash(amount, sValue);

        // Get the commitment
        Commitment storage commitment = commitmentsMap[token][poseidonHash];
        require(commitment.owner != address(0), "Vault: Commitment not found");
        require(commitment.owner == msg.sender, "Vault: Only assigned address can withdraw");

        // Delete the commitment from storage (saves gas)
        delete commitmentsMap[token][poseidonHash];

        // Transfer tokens to the owner
        IERC20(token).transfer(msg.sender, amount);

        // Emit withdrawal event
        emit CommitmentRemoved(msg.sender, token, poseidonHash);
    }

    /**
     * @dev Compute Poseidon hash of amount and sValue on-chain
     * @param amount The amount field element
     * @param sValue The entropy field element
     * @return The computed Poseidon hash
     */
    function computePoseidonHash(uint256 amount, bytes32 sValue) public pure returns (uint256) {
        return PoseidonT3.hash([amount, uint256(sValue)]);
    }

    /**
     * @dev Get commitment details for a given token and poseidon hash
     * @param token The ERC20 token address
     * @param poseidonHash The poseidon hash to look up
     * @return owner The owner of the commitment
     * @return locked Whether the commitment has been locked
     */
    function getCommitment(address token, uint256 poseidonHash) external view returns (address owner, bool locked) {
        Commitment memory commitment = commitmentsMap[token][poseidonHash];
        return (commitment.owner, commitment.locked);
    }
}

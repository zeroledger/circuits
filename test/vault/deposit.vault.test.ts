import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { DepositParamsStruct } from "../../typechain-types/contracts/Vault";
import {
    DepositTestData,
    deployVaultFixture,
    generateCommitmentData,
    generateDepositProof,
    createDepositParams,
    approveTokens,
    getBalances,
    verifyCommitments,
    verifyDepositBalances,
    verifyDepositEvents,
    deposit,
} from "./vault.test.utils";

describe("Vault Deposit Tests", function () {
    describe("Successful Deposits", function () {
        it("should successfully deposit tokens with valid ZK proof", async function () {
            const { vault, mockToken, user, feeRecipient } = await loadFixture(
                deployVaultFixture
            );

            const initialBalances = await getBalances(
                user,
                feeRecipient,
                vault,
                mockToken
            );

            const { testData, receipt, commitmentData } = await deposit(
                user,
                feeRecipient,
                vault,
                mockToken,
                ethers.parseEther("5"),
                [
                    ethers.parseEther("30"),
                    ethers.parseEther("40"),
                    ethers.parseEther("60"),
                ]
            );

            // Assert
            const finalBalances = await getBalances(
                user,
                feeRecipient,
                vault,
                mockToken
            );
            verifyDepositBalances(initialBalances, finalBalances, testData);
            await verifyCommitments(
                commitmentData.hashes,
                testData.user.address,
                vault,
                mockToken
            );
            verifyDepositEvents(receipt);
        });
    });

    describe("Failure Cases", function () {
        it("should fail when trying to reuse a commitment", async function () {
            const { vault, mockToken, user, feeRecipient } = await loadFixture(
                deployVaultFixture
            );

            const { testData, depositParams, proofData } = await deposit(
                user,
                feeRecipient,
                vault,
                mockToken,
                ethers.parseEther("2"),
                [
                    ethers.parseEther("10"),
                    ethers.parseEther("0"),
                    ethers.parseEther("40"),
                ]
            );

            // Second deposit with same commitments should fail
            await expect(
                vault
                    .connect(testData.user)
                    .deposit(depositParams, proofData.calldata_proof)
            ).to.be.revertedWith("Vault: Commitment already used");
        });

        it("should fail with invalid ZK proof", async function () {
            const { vault, mockToken, user, feeRecipient } = await loadFixture(
                deployVaultFixture
            );

            // Arrange
            const testData: DepositTestData = {
                depositAmount: ethers.parseEther("50"),
                fee: ethers.parseEther("2"),
                individualAmounts: [
                    ethers.parseEther("10"),
                    ethers.parseEther("0"),
                    ethers.parseEther("40"),
                ],
                user,
                feeRecipient,
            };

            const commitmentData = await generateCommitmentData(
                testData.individualAmounts,
                testData.user.address
            );

            const proofData = await generateDepositProof(
                commitmentData.hashes,
                testData.depositAmount.toString(),
                commitmentData.amounts,
                commitmentData.sValues
            );

            // Create deposit params with mismatched amount
            const depositParams: DepositParamsStruct = {
                token: await mockToken.getAddress(),
                total_deposit_amount: testData.depositAmount - 10n,
                depositCommitmentParams: commitmentData.depositCommitmentParams,
                fee: testData.fee,
                feeRecipient: testData.feeRecipient.address,
            };

            const totalAmount = testData.depositAmount + testData.fee;
            await approveTokens(testData.user, totalAmount, vault, mockToken);

            // Act & Assert
            await expect(
                vault
                    .connect(testData.user)
                    .deposit(depositParams, proofData.calldata_proof)
            ).to.be.revertedWith("Vault: Invalid ZK proof");
        });

        it("should fail with zero amount", async function () {
            const { vault, mockToken, user, feeRecipient } = await loadFixture(
                deployVaultFixture
            );

            // Arrange
            const testData: DepositTestData = {
                depositAmount: 0n,
                fee: 0n,
                individualAmounts: [
                    ethers.parseEther("10"),
                    ethers.parseEther("20"),
                    ethers.parseEther("30"),
                ],
                user,
                feeRecipient,
            };

            const commitmentData = await generateCommitmentData(
                testData.individualAmounts,
                testData.user.address
            );

            const proofData = await generateDepositProof(
                commitmentData.hashes,
                (
                    testData.individualAmounts[0] +
                    testData.individualAmounts[1] +
                    testData.individualAmounts[2]
                ).toString(),
                commitmentData.amounts,
                commitmentData.sValues
            );

            const depositParams = await createDepositParams(
                testData,
                commitmentData,
                mockToken
            );
            const totalAmount = testData.depositAmount + testData.fee;

            await approveTokens(testData.user, totalAmount, vault, mockToken);

            // Act & Assert
            await expect(
                vault
                    .connect(testData.user)
                    .deposit(depositParams, proofData.calldata_proof)
            ).to.be.revertedWith("Vault: Amount must be greater than 0");
        });

        it("should fail with invalid token address", async function () {
            const { vault, mockToken, user, feeRecipient } = await loadFixture(
                deployVaultFixture
            );

            // Arrange
            const testData: DepositTestData = {
                depositAmount: ethers.parseEther("50"),
                fee: ethers.parseEther("2"),
                individualAmounts: [
                    ethers.parseEther("10"),
                    ethers.parseEther("0"),
                    ethers.parseEther("40"),
                ],
                user,
                feeRecipient,
            };

            const commitmentData = await generateCommitmentData(
                testData.individualAmounts,
                testData.user.address
            );

            const proofData = await generateDepositProof(
                commitmentData.hashes,
                testData.depositAmount.toString(),
                commitmentData.amounts,
                commitmentData.sValues
            );

            // Create deposit params with invalid token address
            const depositParams: DepositParamsStruct = {
                token: ethers.ZeroAddress,
                total_deposit_amount: testData.depositAmount,
                depositCommitmentParams: commitmentData.depositCommitmentParams,
                fee: testData.fee,
                feeRecipient: testData.feeRecipient.address,
            };

            const totalAmount = testData.depositAmount + testData.fee;
            await approveTokens(testData.user, totalAmount, vault, mockToken);

            // Act & Assert
            await expect(
                vault
                    .connect(testData.user)
                    .deposit(depositParams, proofData.calldata_proof)
            ).to.be.revertedWith("Vault: Invalid token address");
        });
    });
});

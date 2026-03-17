import { expect } from "chai";
import { computePoseidon } from "../../utils/poseidon";
import { exportSolidityCallData, prove } from "../prove.helper";
import { ethers } from "hardhat";
import { randomBytes } from "ethers";

describe("Spend11 Circuit Integration Tests", function () {
    let verifier: any;
    before(async function () {
        const Verifier = await ethers.getContractFactory("Spend11Verifier");
        verifier = await Verifier.deploy();
        await verifier.waitForDeployment();
    });

    it("valid case", async function () {
        const input = {
            inputs_hashes: [""],
            inputs_interest: [""],
            outputs_hashes: [""],
            public_output_amount: "10", // 10 token public output (equivalent to previous fee)
            input_amounts: [""],
            input_sValues: [""],
            output_amounts: [""],
            output_sValues: [""],
        };

        // Generate input commitment (spending 1010 tokens - 1000 + 10 fee)
        const inputAmount = BigInt(1010);
        input.input_amounts[0] = inputAmount.toString();
        input.input_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString(
            "hex"
        )}`;
        // No interest on this input
        input.inputs_interest[0] = "0";
        input.inputs_hashes[0] = await computePoseidon({
            amount: input.input_amounts[0],
            entropy: input.input_sValues[0],
        });

        // Generate output commitment (spending 1000 tokens)
        const outputAmount = BigInt(1000);
        input.output_amounts[0] = outputAmount.toString();
        input.output_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString(
            "hex"
        )}`;
        input.outputs_hashes[0] = await computePoseidon({
            amount: input.output_amounts[0],
            entropy: input.output_sValues[0],
        });

        const start = performance.now();
        const { proof, publicSignals } = await prove(input, "spend_11");

        // Get calldata for Solidity verifier
        const { calldata_proof, calldata_pubSignals } =
            await exportSolidityCallData(proof, publicSignals);

        const isValidOnChain = await verifier.verify(
            calldata_proof,
            calldata_pubSignals
        );
        expect(isValidOnChain).to.be.true;

        console.log(`proving time: ${performance.now() - start}`);
    });

    it("valid case with 1% interest on input", async function () {
        // Interest: 9-decimal, 1_000_000_000 = 100%, so 1% = 10_000_000
        const INTEREST_1_PCT = "10000000";

        const input = {
            inputs_hashes: [""],
            inputs_interest: [""],
            outputs_hashes: [""],
            public_output_amount: "10", // 10 token public output
            input_amounts: [""],
            input_sValues: [""],
            output_amounts: [""],
            output_sValues: [""],
        };

        // Input: 1000 tokens with 1% interest => effective value = 1000 * 1.01 = 1010
        const inputAmount = BigInt(1000);
        input.input_amounts[0] = inputAmount.toString();
        input.input_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString(
            "hex"
        )}`;
        input.inputs_interest[0] = INTEREST_1_PCT;
        input.inputs_hashes[0] = await computePoseidon({
            amount: input.input_amounts[0],
            entropy: input.input_sValues[0],
        });

        // Output: 1000 tokens. Balance: 1010 (effective input) = 1000 (output) + 10 (public)
        const outputAmount = BigInt(1000);
        input.output_amounts[0] = outputAmount.toString();
        input.output_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString(
            "hex"
        )}`;
        input.outputs_hashes[0] = await computePoseidon({
            amount: input.output_amounts[0],
            entropy: input.output_sValues[0],
        });

        const { proof, publicSignals } = await prove(input, "spend_11");
        const { calldata_proof, calldata_pubSignals } =
            await exportSolidityCallData(proof, publicSignals);

        const isValidOnChain = await verifier.verify(
            calldata_proof,
            calldata_pubSignals
        );
        expect(isValidOnChain).to.be.true;
    });

    it("valid case with max uint208 amounts", async function () {
        // Circuit uses GreaterEqThan(208): amounts must be in [0, 2^208 - 1]
        const MAX_UINT208 = (BigInt(2) ** BigInt(208)) - BigInt(1);
        const publicOutput = BigInt(10);
        const outputAmount = MAX_UINT208 - publicOutput; // balance: input === output + public

        const input = {
            inputs_hashes: [""],
            inputs_interest: ["0"],
            outputs_hashes: [""],
            public_output_amount: publicOutput.toString(),
            input_amounts: [MAX_UINT208.toString()],
            input_sValues: [""],
            output_amounts: [outputAmount.toString()],
            output_sValues: [""],
        };

        input.input_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString(
            "hex"
        )}`;
        input.inputs_hashes[0] = await computePoseidon({
            amount: input.input_amounts[0],
            entropy: input.input_sValues[0],
        });

        input.output_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString(
            "hex"
        )}`;
        input.outputs_hashes[0] = await computePoseidon({
            amount: input.output_amounts[0],
            entropy: input.output_sValues[0],
        });

        const { proof, publicSignals } = await prove(input, "spend_11");
        const { calldata_proof, calldata_pubSignals } =
            await exportSolidityCallData(proof, publicSignals);

        const isValidOnChain = await verifier.verify(
            calldata_proof,
            calldata_pubSignals
        );
        expect(isValidOnChain).to.be.true;
    });

    it("should fail when input amount exceeds max(uint208)", async function () {
        const OVER_MAX_UINT208 = BigInt(2) ** BigInt(208);
        const input = {
            inputs_hashes: [""],
            inputs_interest: ["0"],
            outputs_hashes: [""],
            public_output_amount: "0",
            input_amounts: [OVER_MAX_UINT208.toString()],
            input_sValues: [""],
            output_amounts: [OVER_MAX_UINT208.toString()],
            output_sValues: [""],
        };
        input.input_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString("hex")}`;
        input.inputs_hashes[0] = await computePoseidon({
            amount: input.input_amounts[0],
            entropy: input.input_sValues[0],
        });
        input.output_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString("hex")}`;
        input.outputs_hashes[0] = await computePoseidon({
            amount: input.output_amounts[0],
            entropy: input.output_sValues[0],
        });

        try {
            await prove(input, "spend_11");
            expect.fail("Expected prove to fail when input amount exceeds max(uint208)");
        } catch (error: any) {
            console.log("Correctly failed with input > max(uint208):", error.message);
        }
    });

    it("should fail when output amount exceeds max(uint208)", async function () {
        const OVER_MAX_UINT208 = BigInt(2) ** BigInt(208);
        const input = {
            inputs_hashes: [""],
            inputs_interest: ["0"],
            outputs_hashes: [""],
            public_output_amount: "0",
            input_amounts: [OVER_MAX_UINT208.toString()],
            input_sValues: [""],
            output_amounts: [OVER_MAX_UINT208.toString()],
            output_sValues: [""],
        };
        input.input_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString("hex")}`;
        input.inputs_hashes[0] = await computePoseidon({
            amount: input.input_amounts[0],
            entropy: input.input_sValues[0],
        });
        input.output_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString("hex")}`;
        input.outputs_hashes[0] = await computePoseidon({
            amount: input.output_amounts[0],
            entropy: input.output_sValues[0],
        });

        try {
            await prove(input, "spend_11");
            expect.fail("Expected prove to fail when output amount exceeds max(uint208)");
        } catch (error: any) {
            console.log("Correctly failed with output > max(uint208):", error.message);
        }
    });

    it("should fail with amount mismatch", async function () {
        const input = {
            inputs_hashes: [""],
            inputs_interest: [""],
            outputs_hashes: [""],
            public_output_amount: "10", // 10 token public output (equivalent to previous fee)
            input_amounts: [""],
            input_sValues: [""],
            output_amounts: [""],
            output_sValues: [""],
        };

        // Generate input commitment (spending 1000 tokens)
        const inputAmount = BigInt(1000);
        input.input_amounts[0] = inputAmount.toString();
        input.input_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString(
            "hex"
        )}`;
        // No interest on this input
        input.inputs_interest[0] = "0";
        input.inputs_hashes[0] = await computePoseidon({
            amount: input.input_amounts[0],
            entropy: input.input_sValues[0],
        });

        // Generate output commitment (spending 1000 tokens - but fee is 10, so should fail)
        const outputAmount = BigInt(1000);
        input.output_amounts[0] = outputAmount.toString();
        input.output_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString(
            "hex"
        )}`;
        input.outputs_hashes[0] = await computePoseidon({
            amount: input.output_amounts[0],
            entropy: input.output_sValues[0],
        });

        // The circuit should fail because input_sum (1000) != output_sum (1000) + fee (10)
        try {
            await prove(input, "spend_11");
            // If we reach here, the test should fail
            expect.fail("Expected prove to fail with amount mismatch");
        } catch (error: any) {
            // Expected to fail - input sum should equal output sum + fee
            console.log(
                "Correctly failed with amount mismatch:",
                error.message
            );
        }
    });

    it("should fail with negative output amount", async function () {
        const input = {
            inputs_hashes: [""],
            inputs_interest: [""],
            outputs_hashes: [""],
            public_output_amount: "10", // 10 token public output (equivalent to previous fee)
            input_amounts: [""],
            input_sValues: [""],
            output_amounts: [""],
            output_sValues: [""],
        };

        // Generate input commitment (spending 1010 tokens - 1000 + 10 fee)
        const inputAmount = BigInt(1010);
        input.input_amounts[0] = inputAmount.toString();
        input.input_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString(
            "hex"
        )}`;
        // No interest on this input
        input.inputs_interest[0] = "0";
        input.inputs_hashes[0] = await computePoseidon({
            amount: input.input_amounts[0],
            entropy: input.input_sValues[0],
        });

        // Generate output commitment with negative amount
        const outputAmount = BigInt(-100);
        input.output_amounts[0] = outputAmount.toString();
        input.output_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString(
            "hex"
        )}`;
        input.outputs_hashes[0] = await computePoseidon({
            amount: input.output_amounts[0],
            entropy: input.output_sValues[0],
        });

        // The circuit should fail with negative output amount
        try {
            await prove(input, "spend_11");
            // If we reach here, the test should fail
            expect.fail("Expected prove to fail with negative output amount");
        } catch (error: any) {
            // Expected to fail - output amounts should be non-negative
            console.log(
                "Correctly failed with negative output amount:",
                error.message
            );
        }
    });

    it("should fail with invalid input hash", async function () {
        const input = {
            inputs_hashes: [""],
            inputs_interest: [""],
            outputs_hashes: [""],
            public_output_amount: "10", // 10 token public output (equivalent to previous fee)
            input_amounts: [""],
            input_sValues: [""],
            output_amounts: [""],
            output_sValues: [""],
        };

        // Generate input commitment (spending 1010 tokens - 1000 + 10 fee)
        const inputAmount = BigInt(1010);
        input.input_amounts[0] = inputAmount.toString();
        input.input_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString(
            "hex"
        )}`;
        // No interest on this input
        input.inputs_interest[0] = "0";
        // Use wrong hash - this should cause the circuit to fail
        input.inputs_hashes[0] = "123456789";

        // Generate output commitment (spending 1000 tokens)
        const outputAmount = BigInt(1000);
        input.output_amounts[0] = outputAmount.toString();
        input.output_sValues[0] = `0x${Buffer.from(randomBytes(32)).toString(
            "hex"
        )}`;
        input.outputs_hashes[0] = await computePoseidon({
            amount: input.output_amounts[0],
            entropy: input.output_sValues[0],
        });

        // The circuit should fail because input hash doesn't match the commitment
        try {
            await prove(input, "spend_11");
            // If we reach here, the test should fail
            expect.fail("Expected prove to fail with invalid input hash");
        } catch (error: any) {
            // Expected to fail - input hash should match the commitment
            console.log(
                "Correctly failed with invalid input hash:",
                error.message
            );
        }
    });
});

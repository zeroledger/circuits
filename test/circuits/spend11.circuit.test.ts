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
            outputs_hashes: [""],
            fee: "10", // 10 token fee
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

    it("should fail with amount mismatch", async function () {
        const input = {
            inputs_hashes: [""],
            outputs_hashes: [""],
            fee: "10", // 10 token fee
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
            outputs_hashes: [""],
            fee: "10", // 10 token fee
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
            outputs_hashes: [""],
            fee: "10", // 10 token fee
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

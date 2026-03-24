import { expect } from "chai";
import { computePoseidon } from "../../utils/poseidon";
import { exportSolidityCallData, prove } from "../prove.helper";
import { ethers } from "hardhat";
import { randomBytes } from "ethers";

describe("Spend11 Circuit Integration Tests", function () {
    const MULTIPLIER_ONE = "1000000000";
    const MULTIPLIER_PLUS_ONE_PCT = "1010000000";

    let verifier: any;

    before(async function () {
        const Verifier = await ethers.getContractFactory("Spend11Verifier");
        verifier = await Verifier.deploy();
        await verifier.waitForDeployment();
    });

    function randomSValue(): string {
        return `0x${Buffer.from(randomBytes(32)).toString("hex")}`;
    }

    async function buildInput(
        inputAmount: bigint,
        interestMultiplier: string,
        outputAmount: bigint,
        publicOutputAmount: bigint
    ) {
        const input = {
            inputs_hashes: [""],
            inputs_interest_multiplier: [interestMultiplier],
            outputs_hashes: [""],
            public_output_amount: publicOutputAmount.toString(),
            input_amounts: [inputAmount.toString()],
            input_sValues: [""],
            output_amounts: [outputAmount.toString()],
            output_sValues: [""],
        };

        input.input_sValues[0] = randomSValue();
        input.inputs_hashes[0] = await computePoseidon({
            amount: input.input_amounts[0],
            entropy: input.input_sValues[0],
        });

        input.output_sValues[0] = randomSValue();
        input.outputs_hashes[0] = await computePoseidon({
            amount: input.output_amounts[0],
            entropy: input.output_sValues[0],
        });

        return input;
    }

    async function proveAndVerify(input: any) {
        const start = performance.now();
        const { proof, publicSignals } = await prove(input, "spend_11");
        expect(publicSignals).to.have.length(4);
        const { calldata_proof, calldata_pubSignals } =
            await exportSolidityCallData(proof, publicSignals);
        const isValidOnChain = await verifier.verify(
            calldata_proof,
            calldata_pubSignals
        );
        expect(isValidOnChain).to.be.true;
        console.log(`proving time: ${performance.now() - start}`);
    }

    async function expectProveToFail(input: any, message: string) {
        try {
            await prove(input, "spend_11");
            expect.fail(message);
        } catch (error: any) {
            console.log(`${message}:`, error.message);
        }
    }

    it("valid 1-1 with neutral multiplier", async function () {
        const input = await buildInput(
            BigInt(1010),
            MULTIPLIER_ONE,
            BigInt(1000),
            BigInt(10)
        );

        await proveAndVerify(input);
    });

    it("valid 1-1 with +1% multiplier", async function () {
        const input = await buildInput(
            BigInt(1000),
            MULTIPLIER_PLUS_ONE_PCT,
            BigInt(1000),
            BigInt(10)
        );

        await proveAndVerify(input);
    });

    it("valid 1-1 with 0 multiplier (-100% interest)", async function () {
        const input = await buildInput(BigInt(1000), "0", BigInt(0), BigInt(0));

        await proveAndVerify(input);
    });

    it("valid case with max uint208 amounts", async function () {
        // Circuit uses GreaterEqThan(208): amounts must be in [0, 2^208 - 1]
        const MAX_UINT208 = BigInt(2) ** BigInt(208) - BigInt(1);
        const publicOutput = BigInt(10);
        const outputAmount = MAX_UINT208 - publicOutput; // balance: input === output + public

        const input = {
            inputs_hashes: [""],
            inputs_interest_multiplier: [MULTIPLIER_ONE],
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
            inputs_interest_multiplier: [MULTIPLIER_ONE],
            outputs_hashes: [""],
            public_output_amount: "0",
            input_amounts: [OVER_MAX_UINT208.toString()],
            input_sValues: [""],
            output_amounts: [OVER_MAX_UINT208.toString()],
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

        await expectProveToFail(
            input,
            "Expected prove to fail when input amount exceeds max(uint208)"
        );
    });

    it("should fail when output amount exceeds max(uint208)", async function () {
        const OVER_MAX_UINT208 = BigInt(2) ** BigInt(208);
        const MAX_UINT208 = BigInt(2) ** BigInt(208) - BigInt(1);
        const input = {
            inputs_hashes: [""],
            inputs_interest_multiplier: [MULTIPLIER_ONE],
            outputs_hashes: [""],
            public_output_amount: "0",
            input_amounts: [MAX_UINT208.toString()],
            input_sValues: [""],
            output_amounts: [OVER_MAX_UINT208.toString()],
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

        await expectProveToFail(
            input,
            "Expected prove to fail when output amount exceeds max(uint208)"
        );
    });

    it("should fail with amount mismatch", async function () {
        const input = await buildInput(
            BigInt(1000),
            MULTIPLIER_ONE,
            BigInt(1000),
            BigInt(10)
        );

        await expectProveToFail(input, "Expected prove to fail with amount mismatch");
    });

    it("should fail with negative output amount", async function () {
        const input = await buildInput(
            BigInt(1010),
            MULTIPLIER_ONE,
            BigInt(-100),
            BigInt(10)
        );

        await expectProveToFail(
            input,
            "Expected prove to fail with negative output amount"
        );
    });

    it("should fail with invalid input hash", async function () {
        const input = await buildInput(
            BigInt(1010),
            MULTIPLIER_ONE,
            BigInt(1000),
            BigInt(10)
        );

        input.inputs_hashes[0] = "123456789";
        await expectProveToFail(input, "Expected prove to fail with invalid input hash");
    });
});

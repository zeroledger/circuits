import { expect } from "chai";
import { computePoseidon } from "../../utils/poseidon";
import { exportSolidityCallData, prove } from "../prove.helper";
import { ethers } from "hardhat";
import { randomBytes } from "ethers";

describe("Spend Circuits Performance Tests", function () {
    let verifiers: { [key: string]: any } = {};

    // Helper function to generate random s-value
    function generateSValue(): string {
        return `0x${Buffer.from(randomBytes(32)).toString("hex")}`;
    }

    // Helper function to create input commitment
    async function createCommitment(
        amount: bigint
    ): Promise<{ hash: string; sValue: string }> {
        const sValue = generateSValue();
        const hash = await computePoseidon({
            amount: amount.toString(),
            entropy: sValue,
        });
        return { hash, sValue };
    }

    // Helper function to generate spend input
    async function generateSpendInput(
        inputAmounts: bigint[],
        outputAmounts: bigint[],
        fee: bigint
    ): Promise<any> {
        const input = {
            inputs_hashes: Array(inputAmounts.length).fill(""),
            outputs_hashes: Array(outputAmounts.length).fill(""),
            fee: fee.toString(),
            input_amounts: Array(inputAmounts.length).fill(""),
            input_sValues: Array(inputAmounts.length).fill(""),
            output_amounts: Array(outputAmounts.length).fill(""),
            output_sValues: Array(outputAmounts.length).fill(""),
        };

        // Generate input commitments
        for (let i = 0; i < inputAmounts.length; i++) {
            const commitment = await createCommitment(inputAmounts[i]);
            input.input_amounts[i] = inputAmounts[i].toString();
            input.input_sValues[i] = commitment.sValue;
            input.inputs_hashes[i] = commitment.hash;
        }

        // Generate output commitments
        for (let i = 0; i < outputAmounts.length; i++) {
            const commitment = await createCommitment(outputAmounts[i]);
            input.output_amounts[i] = outputAmounts[i].toString();
            input.output_sValues[i] = commitment.sValue;
            input.outputs_hashes[i] = commitment.hash;
        }

        return input;
    }

    // Helper function to run spend test
    async function runSpendTest(
        circuitName: string,
        verifierName: string,
        inputAmounts: bigint[],
        outputAmounts: bigint[],
        fee: bigint
    ): Promise<number> {
        const input = await generateSpendInput(
            inputAmounts,
            outputAmounts,
            fee
        );

        const start = performance.now();
        const { proof, publicSignals } = await prove(input, circuitName);

        const { calldata_proof, calldata_pubSignals } =
            await exportSolidityCallData(proof, publicSignals);

        const isValidOnChain = await verifiers[verifierName].verify(
            calldata_proof,
            calldata_pubSignals
        );
        expect(isValidOnChain).to.be.true;

        const provingTime = performance.now() - start;
        console.log(`${verifierName} proving time: ${provingTime}ms`);

        return provingTime;
    }

    before(async function () {
        // Deploy all verifier contracts
        const verifierNames = [
            "Spend11Verifier",
            "Spend12Verifier",
            "Spend13Verifier",
            "Spend21Verifier",
            "Spend22Verifier",
            "Spend23Verifier",
            "Spend31Verifier",
            "Spend32Verifier",
            "Spend161Verifier",
        ];

        for (const name of verifierNames) {
            const Verifier = await ethers.getContractFactory(name);
            verifiers[name] = await Verifier.deploy();
            await verifiers[name].waitForDeployment();
        }
    });

    it("Spend11 - 1 input, 1 output", async function () {
        await runSpendTest(
            "spend_11",
            "Spend11Verifier",
            [BigInt(1010)], // 1000 + 10 fee
            [BigInt(1000)],
            BigInt(10)
        );
    });

    it("Spend12 - 1 input, 2 outputs", async function () {
        await runSpendTest(
            "spend_12",
            "Spend12Verifier",
            [BigInt(1010)], // 1000 + 10 fee
            [BigInt(600), BigInt(400)],
            BigInt(10)
        );
    });

    it("Spend13 - 1 input, 3 outputs", async function () {
        await runSpendTest(
            "spend_13",
            "Spend13Verifier",
            [BigInt(1010)], // 1000 + 10 fee
            [BigInt(400), BigInt(300), BigInt(300)],
            BigInt(10)
        );
    });

    it("Spend21 - 2 inputs, 1 output", async function () {
        await runSpendTest(
            "spend_21",
            "Spend21Verifier",
            [BigInt(600), BigInt(400)], // 1000 total
            [BigInt(990)], // 1000 - 10 fee
            BigInt(10)
        );
    });

    it("Spend22 - 2 inputs, 2 outputs", async function () {
        await runSpendTest(
            "spend_22",
            "Spend22Verifier",
            [BigInt(600), BigInt(400)], // 1000 total
            [BigInt(690), BigInt(300)], // 990 total (1000 - 10 fee)
            BigInt(10)
        );
    });

    it("Spend23 - 2 inputs, 3 outputs", async function () {
        await runSpendTest(
            "spend_23",
            "Spend23Verifier",
            [BigInt(600), BigInt(400)], // 1000 total
            [BigInt(390), BigInt(300), BigInt(300)], // 990 total (1000 - 10 fee)
            BigInt(10)
        );
    });

    it("Spend31 - 3 inputs, 1 output", async function () {
        await runSpendTest(
            "spend_31",
            "Spend31Verifier",
            [BigInt(400), BigInt(300), BigInt(300)], // 1000 total
            [BigInt(990)], // 1000 - 10 fee
            BigInt(10)
        );
    });

    it("Spend32 - 3 inputs, 2 outputs", async function () {
        await runSpendTest(
            "spend_32",
            "Spend32Verifier",
            [BigInt(400), BigInt(300), BigInt(300)], // 1000 total
            [BigInt(690), BigInt(300)], // 990 total (1000 - 10 fee)
            BigInt(10)
        );
    });

    it("Spend161 - 16 inputs, 1 output", async function () {
        // Generate 16 inputs of 62 tokens each, with the last one getting +8 to make 1000 total
        const inputAmounts = Array(16).fill(BigInt(62));
        inputAmounts[15] = BigInt(70); // Last input gets +8 to make total 1000

        await runSpendTest(
            "spend_161",
            "Spend161Verifier",
            inputAmounts, // 1000 total
            [BigInt(990)], // 1000 - 10 fee
            BigInt(10)
        );
    });
});

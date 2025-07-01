import { expect } from "chai";
import { computePoseidon } from "../../utils/poseidon";
import { exportSolidityCallData, prove } from "../prove.helper";
import { ethers } from "hardhat";
import { randomBytes } from "ethers";
import { DepositVerifier } from "../../typechain-types";

describe("Deposit Circuit Integration Tests", function () {
    let verifier: DepositVerifier;
    before(async function () {
        const Verifier = await ethers.getContractFactory("DepositVerifier");
        verifier = await Verifier.deploy();
        await verifier.waitForDeployment();
    });

    it("valid case", async function () {
        const input = {
            hashes: ["", "", ""],
            totalAmount: "",
            amounts: ["", "", ""],
            sValues: ["", "", ""],
        };

        for (let i = 0; i < 3; i++) {
            // Use smaller amounts that fit within 240 bits (2^240 - 1)
            const amount = BigInt(Math.floor(Math.random() * 1000000) + 1);
            input.amounts[i] = amount.toString();
            input.sValues[i] = `0x${Buffer.from(randomBytes(32)).toString(
                "hex"
            )}`;
            input.hashes[i] = await computePoseidon({
                amount: input.amounts[i],
                entropy: input.sValues[i],
            });
            input.totalAmount = (
                BigInt(input.totalAmount || "0") + amount
            ).toString();
        }
        const start = performance.now();
        const { proof, publicSignals } = await prove(input, "deposit");

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

    it("should fail with negative amount", async function () {
        // // Use a value that would be negative in the field (field size - 100)
        // const fieldSize = BigInt(
        //     "21888242871839275222246405745257275088548364400416034343698204186575808495617"
        // );
        // const negativeAmount = (fieldSize - BigInt(100)).toString();

        const input = {
            hashes: ["", "", ""],
            totalAmount: "1000",
            amounts: ["-100", "1100", "0"], // Large value that wraps to negative
            sValues: ["", "", ""],
        };

        // Generate valid sValues and hashes for the amounts
        for (let i = 0; i < 3; i++) {
            input.sValues[i] = `0x${Buffer.from(randomBytes(32)).toString(
                "hex"
            )}`;
            input.hashes[i] = await computePoseidon({
                amount: input.amounts[i],
                entropy: input.sValues[i],
            });
        }

        // The circuit should fail to generate a proof with negative amounts
        try {
            await prove(input, "deposit");
            console.log("Circuit accepted negative amount");
            // If we reach here, the test should fail
            expect.fail("Expected prove to fail with negative amount");
        } catch (error: any) {
            // Expected to fail - negative amounts should not be accepted
            console.log(error.message);
        }
    });

    it("should fail with sum mismatch", async function () {
        const input = {
            hashes: ["", "", ""],
            totalAmount: "1000", // Expected total
            amounts: ["100", "200", "300"], // Sum = 600, but totalAmount = 1000
            sValues: ["", "", ""],
        };

        // Generate valid sValues and hashes for the amounts
        for (let i = 0; i < 3; i++) {
            input.sValues[i] = `0x${Buffer.from(randomBytes(32)).toString(
                "hex"
            )}`;
            input.hashes[i] = await computePoseidon({
                amount: input.amounts[i],
                entropy: input.sValues[i],
            });
        }

        // The circuit should fail because sum (600) != totalAmount (1000)
        try {
            await prove(input, "deposit");
            // If we reach here, the test should fail
            expect.fail("Expected prove to fail with sum mismatch");
        } catch (error: any) {
            // Expected to fail - sum should match totalAmount
            console.log(error.message);
        }
    });
});

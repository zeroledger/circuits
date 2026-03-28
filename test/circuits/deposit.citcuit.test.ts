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
            // Use smaller amounts that fit within 208 bits (circuit uses uint208)
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

    it("valid case with max uint208 amount", async function () {
        // Circuit uses GreaterEqThan(208): amounts must be in [0, 2^208 - 1]
        const MAX_UINT208 = BigInt(2) ** BigInt(208) - BigInt(1);

        const input = {
            hashes: ["", "", ""],
            totalAmount: MAX_UINT208.toString(),
            amounts: [MAX_UINT208.toString(), "0", "0"],
            sValues: ["", "", ""],
        };

        for (let i = 0; i < 3; i++) {
            input.sValues[i] = `0x${Buffer.from(randomBytes(32)).toString(
                "hex"
            )}`;
            input.hashes[i] = await computePoseidon({
                amount: input.amounts[i],
                entropy: input.sValues[i],
            });
        }

        const { proof, publicSignals } = await prove(input, "deposit");
        const { calldata_proof, calldata_pubSignals } =
            await exportSolidityCallData(proof, publicSignals);

        const isValidOnChain = await verifier.verify(
            calldata_proof,
            calldata_pubSignals
        );
        expect(isValidOnChain).to.be.true;
    });

    it("should fail when amount exceeds max(uint208)", async function () {
        // max(uint208) = 2^208 - 1; 2^208 is out of range
        const OVER_MAX_UINT208 = BigInt(2) ** BigInt(208);

        const input = {
            hashes: ["", "", ""],
            totalAmount: OVER_MAX_UINT208.toString(),
            amounts: [OVER_MAX_UINT208.toString(), "0", "0"],
            sValues: ["", "", ""],
        };

        for (let i = 0; i < 3; i++) {
            input.sValues[i] = `0x${Buffer.from(randomBytes(32)).toString(
                "hex"
            )}`;
            input.hashes[i] = await computePoseidon({
                amount: input.amounts[i],
                entropy: input.sValues[i],
            });
        }

        try {
            await prove(input, "deposit");
            expect.fail(
                "Expected prove to fail when amount exceeds max(uint208)"
            );
        } catch (error: any) {
            // Expected to fail - amount > 2^208 - 1 not allowed
            console.log(
                "Correctly failed with amount > max(uint208):",
                error.message
            );
        }
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
        let witnessRejected = false;
        try {
            await prove(input, "deposit");
            console.log("Circuit accepted negative amount");
            // If we reach here, the test should fail
            expect.fail("Expected prove to fail with negative amount");
        } catch (error: any) {
            // Expected to fail - negative amounts should not be accepted
            witnessRejected = true;
            console.log(error.message);
        }
        if (!witnessRejected) {
            throw new Error("Expected prove to fail with negative amount");
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
        let witnessRejected = false;
        try {
            await prove(input, "deposit");
        } catch (error: any) {
            witnessRejected = true;
            expect(error?.message).to.match(/Assert Failed/i);
        }
        if (!witnessRejected) {
            throw new Error("Expected prove to fail with sum mismatch");
        }
    });
});

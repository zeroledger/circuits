// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import {PlonkVerifier as Spend13Verifier_} from "../circuits/spend_13/build/Verifier_spend_13.sol";

contract Spend13Verifier {
    Spend13Verifier_ public verifier = new Spend13Verifier_();

    function verify(uint256[24] calldata proof, uint256[5] calldata pubSignals) external view returns (bool) {
        return verifier.verifyProof(proof, pubSignals);
    }
}

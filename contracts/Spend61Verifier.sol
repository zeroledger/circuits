// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import {PlonkVerifier as Spend61Verifier_} from "../circuits/spend_61/build/Verifier_spend_61.sol";

contract Spend61Verifier {
    Spend61Verifier_ public verifier = new Spend61Verifier_();

    function verify(uint256[24] calldata proof, uint256[14] calldata pubSignals) external view returns (bool) {
        return verifier.verifyProof(proof, pubSignals);
    }
}

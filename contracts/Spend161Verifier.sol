// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import {PlonkVerifier as Spend161Verifier_} from "../circuits/spend_161/build/Verifier_spend_161.sol";

contract Spend161Verifier {
    Spend161Verifier_ public verifier = new Spend161Verifier_();

    function verify(uint256[24] calldata proof, uint256[18] calldata pubSignals) external view returns (bool) {
        return verifier.verifyProof(proof, pubSignals);
    }
}

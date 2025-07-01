// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import {PlonkVerifier as Spend31Verifier_} from "../circuits/spend_31/build/Verifier_spend_31.sol";

contract Spend31Verifier {
    Spend31Verifier_ public verifier = new Spend31Verifier_();

    function verify(uint256[24] calldata proof, uint256[5] calldata pubSignals) external view returns (bool) {
        return verifier.verifyProof(proof, pubSignals);
    }
}

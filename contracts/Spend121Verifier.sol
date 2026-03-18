// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import {PlonkVerifier as Spend121Verifier_} from "../circuits/spend_121/build/Verifier_spend_121.sol";

contract Spend121Verifier {
    Spend121Verifier_ public verifier = new Spend121Verifier_();

    function verify(uint256[24] calldata proof, uint256[26] calldata pubSignals) external view returns (bool) {
        return verifier.verifyProof(proof, pubSignals);
    }
}

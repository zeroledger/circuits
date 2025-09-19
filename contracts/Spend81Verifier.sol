// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import {PlonkVerifier as Spend81Verifier_} from "../circuits/spend_81/build/Verifier_spend_81.sol";

contract Spend81Verifier {
    Spend81Verifier_ public verifier = new Spend81Verifier_();

    function verify(uint256[24] calldata proof, uint256[10] calldata pubSignals) external view returns (bool) {
        return verifier.verifyProof(proof, pubSignals);
    }
}

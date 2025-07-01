// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import {PlonkVerifier as Spend11Verifier_} from "../circuits/spend_11/build/Verifier_spend_11.sol";

contract Spend11Verifier {
    Spend11Verifier_ public verifier = new Spend11Verifier_();

    function verify(uint256[24] calldata proof, uint256[3] calldata pubSignals) external view returns (bool) {
        return verifier.verifyProof(proof, pubSignals);
    }
}

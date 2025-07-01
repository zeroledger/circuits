// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import {PlonkVerifier as Spend22Verifier_} from "../circuits/spend_22/build/Verifier_spend_22.sol";

contract Spend22Verifier {
    Spend22Verifier_ public verifier = new Spend22Verifier_();

    function verify(uint256[24] calldata proof, uint256[5] calldata pubSignals) external view returns (bool) {
        return verifier.verifyProof(proof, pubSignals);
    }
}

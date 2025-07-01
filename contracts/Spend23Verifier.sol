// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import {PlonkVerifier as Spend23Verifier_} from "../circuits/spend_23/build/Verifier_spend_23.sol";

contract Spend23Verifier {
    Spend23Verifier_ public verifier = new Spend23Verifier_();

    function verify(uint256[24] calldata proof, uint256[6] calldata pubSignals) external view returns (bool) {
        return verifier.verifyProof(proof, pubSignals);
    }
}

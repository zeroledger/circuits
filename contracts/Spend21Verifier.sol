// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import {PlonkVerifier as Spend21Verifier_} from "../circuits/spend_21/build/Verifier_spend_21.sol";

contract Spend21Verifier {
    Spend21Verifier_ public verifier = new Spend21Verifier_();

    function verify(uint256[24] calldata proof, uint256[4] calldata pubSignals) external view returns (bool) {
        return verifier.verifyProof(proof, pubSignals);
    }
}

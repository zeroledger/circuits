// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import {PlonkVerifier as Spend12Verifier_} from "../circuits/spend_12/build/Verifier_spend_12.sol";

contract Spend12Verifier {
    Spend12Verifier_ public verifier = new Spend12Verifier_();

    function verify(uint256[24] calldata proof, uint256[4] calldata pubSignals) external view returns (bool) {
        return verifier.verifyProof(proof, pubSignals);
    }
}

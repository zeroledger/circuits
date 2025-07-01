// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import {PlonkVerifier as DepositVerifier_} from "../circuits/deposit/build/Verifier_deposit.sol";

contract DepositVerifier {
    DepositVerifier_ public verifier = new DepositVerifier_();

    function verify(uint256[24] calldata proof, uint256[4] calldata pubSignals) external view returns (bool) {
        return verifier.verifyProof(proof, pubSignals);
    }
}

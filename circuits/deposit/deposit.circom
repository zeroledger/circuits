pragma circom 2.1.4;

include "poseidon.circom";
include "comparators.circom";

/*
  Deposit circuit (Deposit(maxInputs))

  Goal:
  Prove that each private {amount[i], sValues[i]} opens the corresponding public commitment hashes[i]
  (Poseidon(2)), that all amounts are non-negative, and that the sum of all amounts equals totalAmount.

  Visual schema (per input i):

  amounts[i] (private) ----\
                             -> Poseidon(2) -> hashes[i] (public commitment)
  sValues[i] (private) ---/

  amounts[i] (private) -> non-negativity check: amounts[i] >= 0

  Main constraint:
    sum(amounts[i]) == totalAmount

  Public / Private inputs:
    Public:
      hashes[maxInputs] : Poseidon commitments of {amount, s}
      totalAmount       : expected sum of all amounts (uint208)
    Private:
      amounts[maxInputs] : individual deposit amounts (uint208)
      sValues[maxInputs]  : secret values used in the commitment
*/

template Deposit(maxInputs) {
    // Public inputs
    signal input hashes[maxInputs]; // poseidon hashes of {amount, s}
    signal input totalAmount; // uint208 total amount

    // Private inputs
    signal input amounts[maxInputs]; // uint208 amounts
    signal input sValues[maxInputs]; // bytes32 s values

    // Components
    component hashers[maxInputs]; // poseidon hashers
    component nonNegChecks[maxInputs]; // non-negativity checks

    // Sum (linear in signals -> constraint stays quadratic)
    var sum = 0;
    for (var i = 0; i < maxInputs; i++) {
        // 1. Validate hash[i] = poseidon_hash({amount[i], s[i]})
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== amounts[i];
        hashers[i].inputs[1] <== sValues[i];
        hashes[i] === hashers[i].out;

        // 2. Ensure amount >= 0 (non-negativity check)
        nonNegChecks[i] = GreaterEqThan(208);
        nonNegChecks[i].in[0] <== amounts[i];
        nonNegChecks[i].in[1] <== 0;
        nonNegChecks[i].out === 1; // amount >= 0

        // 3. Accumulate sum
        sum += amounts[i];
    }

    // Validate that the computed sum matches the expected total
    sum === totalAmount;
}

component main {public [hashes, totalAmount]} = Deposit(3);
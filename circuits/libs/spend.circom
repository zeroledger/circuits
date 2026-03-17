pragma circom 2.1.4;

include "poseidon.circom";
include "comparators.circom";

template Spend(maxInputs, maxOutputs) {
    // Public inputs
    signal input inputs_hashes[maxInputs]; // poseidon hashes of {amount, s}
    signal input inputs_interest[maxInputs]; // uint32, max 1_000_000_000 interest multiplier, 9 - decimal, 1000_000_000 = 1 (100%), 1 - 0.000000001 (0.0000001%) 
    signal input outputs_hashes[maxOutputs]; // poseidon hashes of {amount, s}
    signal input public_output_amount; // uint208 public output amount
    
    // Private inputs
    signal input input_amounts[maxInputs];
    signal input input_sValues[maxInputs];
    signal input output_amounts[maxOutputs];
    signal input output_sValues[maxOutputs];

    // Components
    component input_hashers[maxInputs]; // poseidon hashers
    component output_hashers[maxOutputs]; // poseidon hashers
    component nonNegChecks[maxOutputs]; // non-negativity checks
    
    // Scaled amounts (one constraint per product); sums accumulated linearly in vars
    signal input_scaled_amounts[maxInputs];
    var input_sum = 0;
    var output_sum = 0;

    // Validate each input
    for (var i = 0; i < maxInputs; i++) {
        // 1. Validate hash[i] = poseidon_hash({amount[i], s[i]})
        input_hashers[i] = Poseidon(2);
        input_hashers[i].inputs[0] <== input_amounts[i];
        input_hashers[i].inputs[1] <== input_sValues[i];
        inputs_hashes[i] === input_hashers[i].out;

        // 2. Per-input scaled amount: amount * (1e9 + interest)
        input_scaled_amounts[i] <== input_amounts[i] * (1000000000 + inputs_interest[i]);
        input_sum += input_scaled_amounts[i];
    }

    // Validate each output
    for (var i = 0; i < maxOutputs; i++) {
        // 1. Validate hash[i] = poseidon_hash({amount[i], s[i]})
        output_hashers[i] = Poseidon(2);
        output_hashers[i].inputs[0] <== output_amounts[i];
        output_hashers[i].inputs[1] <== output_sValues[i];
        outputs_hashes[i] === output_hashers[i].out;

        // 2. Ensure amount >= 0 (non-negativity check)
        nonNegChecks[i] = GreaterEqThan(208);
        nonNegChecks[i].in[0] <== output_amounts[i];
        nonNegChecks[i].in[1] <== 0;
        nonNegChecks[i].out === 1; // amount >= 0

        output_sum += output_amounts[i];
    }

    // Balance: sum_i amount_i * (1e9 + interest_i) == (output_sum + public_output_amount) * 1e9
    // (linear in input_scaled_amounts and output_amounts -> quadratic constraint)
    input_sum === (output_sum + public_output_amount) * 1000000000;
}
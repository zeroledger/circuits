pragma circom 2.1.4;

include "poseidon.circom";
include "comparators.circom";

/* 
    The spend circuit verifies that input amounts, scaled by per-input factors, balance the outputs
    (see the main balance constraint at the end of the template).
    Each input is described by three signals:
    1. Public: a Poseidon hash of {amount, secret}
    2. Private: amount
    3. Private: secret
    This binds the public commitment to the private amount and secret (the hash is indeed H(amount, secret)).
    Outputs follow the same pattern, except one output amount may be provided as a separate public signal.
    Each input also has an associated factor (public signal). The factor scales the input for interest
    accrued in the protocol.
    For non-negative interest: 1 * 10 ** decimals <= factor <= 2 * 10 ** decimals
    For negative interest: 0 <= factor <= 1 * 10 ** decimals
    Scaling by 10 ** decimals allows representing small interest changes, such as 0.00001%.

    Example instance (maxInputs = 1, maxOutputs = 2)
    ------------------
    | inputs | outputs
    ------------------
    |   3    |   1
    |        |   2
    ------------------
*/
template Spend(maxInputs, maxOutputs) {
    
    // Public inputs
    // poseidon hashes of {uint208 amount, bytes32 secret}
    signal input inputs_hashes[maxInputs];
    // uint32, max 2_000_000_000 (100% + 100%), min 0 (100% - 100%)
    // 9 - decimals, 1_000_000_000 = 1, meaning no interest
    // 2_000_000_001 = 2.000000001, or 0.000000001% interest
    signal input inputs_modifier[maxInputs];
    // poseidon hashes of {uint208 amount, bytes32 secret}
    signal input outputs_hashes[maxOutputs];
    // uint208 public output amount
    signal input public_output_amount;
    
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

        // 2. Per-input scaled amount: amount * interest_multiplier
        input_scaled_amounts[i] <== input_amounts[i] * inputs_modifier[i];
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
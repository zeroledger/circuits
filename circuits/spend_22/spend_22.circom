pragma circom 2.1.4;

include "../libs/spend.circom";

component main {public [inputs_hashes, inputs_interest_multiplier, outputs_hashes, public_output_amount]} = Spend(2, 2);
pragma circom 2.1.4;

include "../libs/spend.circom";

component main {public [inputs_hashes, inputs_interest, outputs_hashes, public_output_amount]} = Spend(12, 1);
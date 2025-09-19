#!/bin/bash

function compile_circuit {
  repo=circuits/$1

  mkdir -p $repo/build
  circom $repo/$1.circom -l node_modules/circomlib/circuits --output $repo/build --r1cs --wasm --sym --inspect --c;
  npx snarkjs plonk setup $repo/build/$1.r1cs plonk/pot14_final.ptau $repo/build/$1.zkey;
  npx snarkjs zkey export solidityverifier $repo/build/$1.zkey $repo/build/Verifier_$1.sol;
  npx snarkjs r1cs info $repo/build/$1.r1cs;
}

compile_circuit deposit
compile_circuit spend_11
compile_circuit spend_12
compile_circuit spend_13
compile_circuit spend_21
compile_circuit spend_22
compile_circuit spend_23
compile_circuit spend_31
compile_circuit spend_32
compile_circuit spend_33
compile_circuit spend_81
compile_circuit spend_161
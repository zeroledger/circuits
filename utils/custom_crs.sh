#!/bin/bash

# Universal CRS Setup for PLONK

set -e

echo "Generating Universal CRS for PLONK..."

mkdir -p plonk

# Generate universal CRS
npx snarkjs powersoftau new bn128 14 plonk/pot14_0000.ptau -v

# Contribute to the phase 1 of the ceremony
npx snarkjs powersoftau contribute plonk/pot14_0000.ptau plonk/pot14_0001.ptau --name="First contribution" -v

# Apply a random beacon
npx snarkjs powersoftau beacon plonk/pot14_0001.ptau plonk/pot14_beacon.ptau 8102185957ce821835ae85d6d4188c541298d95cb4528ff36764cf96c9c820721ee4d86e2e7f9796c4dfdf660669ae6c041e3502166f0c2a89271ef31fd21e37d8a08a9b53c2021ffd804efa92ccf39ccc547450644731d5cb41de39bbc00647 10 -n="Final Beacon"

# Phase 2 of the ceremony
npx snarkjs powersoftau prepare phase2 plonk/pot14_beacon.ptau plonk/pot14_final.ptau -v

echo "Verifying..."

npx snarkjs powersoftau verify plonk/pot14_final.ptau

echo "Universal CRS generated successfully!" 
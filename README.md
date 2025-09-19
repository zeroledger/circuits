# ZeroLedger Circuits

Zero-knowledge circuits for the ZeroLedger protocol, implementing privacy-preserving deposit and spend operations using PLONK proving system.

## What is this repository about?

This repository contains zero-knowledge circuits that enable private transactions in the ZeroLedger protocol. The circuits implement:

- **Deposit operations**: Private deposit of funds with commitment generation
- **Spend operations**: Private spending with various input/output configurations (1-1, 1-2, 1-3, 2-1, 2-2, 2-3, 3-1, 3-2, 3-3, 1-6-1, 8-1)
- **Poseidon hashing**: Efficient zero-knowledge friendly hash function
- **Commitment schemes**: Cryptographic commitments for privacy

## Structure & Tech Stack

### Repository Structure

```text
circuits/
├── circuits/          # Circom circuit definitions
│   ├── deposit/       # Deposit circuit
│   ├── spend_*/       # Various spend circuit configurations
│   └── libs/          # Shared circuit libraries
├── contracts/         # Solidity verifier contracts
├── artifacts/         # Compiled artifacts
├── test/             # Test suites
└── utils/            # Build and utility scripts
```

### Tech Stack

- **Circom 2.1.4**: Circuit definition language
- **PLONK**: Zero-knowledge proof system
- **Poseidon**: ZK-friendly hash function
- **Hardhat**: Ethereum development framework
- **TypeScript**: Development language
- **SnarkJS**: JavaScript library for zk-SNARKs

## How to Use or Develop

### Prerequisites

- Node.js (v16+)
- Circom compiler
- PLONK trusted setup files (automatically downloaded)

### Trusted Setup

This project uses the [PSE Perpetual Powers of Tau](https://github.com/privacy-ethereum/perpetualpowersoftau) trusted setup ceremony for PLONK proving. The trusted setup file is automatically downloaded from:

- **Source**: [PSE Perpetual Powers of Tau](https://github.com/privacy-ethereum/perpetualpowersoftau)
- **URL**: `https://pse-trusted-setup-ppot.s3.eu-central-1.amazonaws.com/pot28_0080/ppot_0080_14.ptau`
- **File**: `pot14_final.ptau` (2^14 constraints)

The trusted setup ceremony involves multiple participants contributing randomness to generate secure proving parameters. This particular setup (contribution 0080) provides a high level of security for circuits with up to 2^14 constraints.

### Installation

```bash
npm install
```

### Development Commands

#### Compile Circuits

```bash
npm run compile
```

Compiles all circuits and generates:

- R1CS constraint systems
- Witness generators (WASM)
- Proving keys (.zkey)
- Solidity verifiers

#### Run Tests

```bash
npm run test
```

Executes circuit tests and verifier contract tests.

#### Generate Commitments

```bash
npm run commitment
```

Generates Poseidon commitments for testing.

#### Linting

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

#### Deploy Contracts

```bash
npm run deploy
```

Deploys verifier contracts to the network.

### Circuit Development

1. **Add new circuits** in `circuits/` directory
2. **Use shared libraries** from `circuits/libs/`
3. **Follow naming convention**: `circuit_name.circom`
4. **Test thoroughly** with various input combinations
5. **Update build scripts** if needed

### Build Process

1. Circuit compilation with Circom
2. R1CS generation
3. Witness generation
4. Proving key generation
5. Solidity verifier generation

## How to Contribute

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Commit your changes: `git commit -m "Add your feature"`
7. Push to your fork: `git push origin feature/your-feature`
8. Create a Pull Request

### Reporting Issues

- Use GitHub Issues for bug reports
- Include reproduction steps
- Provide relevant logs and error messages
- Tag issues appropriately

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Support

For questions and support:

- Open an issue on GitHub
- Check existing documentation
- Review test cases for usage examples
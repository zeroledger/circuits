import "@nomicfoundation/hardhat-toolbox";
import "@dgma/hardhat-sol-bundler";
import deployments from "./deployment.config";

export default {
    solidity: {
        version: "0.8.28",
        settings: { optimizer: { enabled: true, runs: 100000000 } },
    },
    networks: {
        hardhat: {
            deployment: deployments.hardhat,
        },
    },
};

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    arbitrumSepolia: {
      url: process.env.BLOCKCHAIN_RPC_URL,
      accounts: [process.env.SCHOOL_WALLET_PRIVATE_KEY],
      chainId: 421614
    }
  }
};
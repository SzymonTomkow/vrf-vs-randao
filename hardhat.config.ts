import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  gasReporter: {
    enabled: false, // <--- TO JEST KLUCZOWA ZMIANA
  },
};

export default config;
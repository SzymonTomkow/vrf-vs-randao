import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Mechanizm Slashing (Kary)", function () {
  
  async function deploySlashingFixture() {
    const [deployer, Emilia, Maciej] = await ethers.getSigners();
    const entryFee = ethers.parseEther("1.0"); // 1 ETH
    
    const RandaoSlashing = await ethers.getContractFactory("RandaoSlashing");
    const contract = await RandaoSlashing.deploy(entryFee);

    return { contract, Emilia, Maciej, entryFee };
  }

  it("Powinien pozwolić Maciejowi zabrać kaucję Emili, jeśli ta nie ujawni liczby", async function () {
    const { contract, Emilia, Maciej, entryFee } = await loadFixture(deploySlashingFixture);   
    // 1. Emilia wchodzi do gry (Commit)
    const secret = 123;
    const hash = ethers.solidityPackedKeccak256(["uint256"], [secret]);
    await contract.connect(Emilia).commit(hash, { value: entryFee });

    // 2. Próbujemy ukarać ją od razu (Powinno się nie udać, bo ma czas)
    await expect(contract.connect(Maciej).slashParticipant(Emilia.address))
      .to.be.revertedWith("Jeszcze ma czas na ujawnienie");

    console.log("1. Emilia bezpieczna przed upływem czasu.");

    // 3. SYMULACJA CZASU (Time Travel)
    // Przesuwamy czas o 11 minut (limit to 10 minut)
    // Biblioteka 'time' z Hardhat pozwala nam manipulować zegarem blockchaina
    await time.increase(11 * 60); 

    console.log("2. Minęło 11 minut...");

    // 4. Maciej wykonuje egzekucję (Slash)
    // Sprawdzamy balans Macieja przed i po
    await expect(contract.connect(Maciej).slashParticipant(Emilia.address))
      .to.changeEtherBalances(
        [Emilia, Maciej],
        [0, entryFee] // Emilia nic nie dostaje (straciła przy wpłacie), Maciej dostaje +1 ETH
      );

    console.log("3. SUKCES: Maciej zabrał kaucję Emili!");
  });
});
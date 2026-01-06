import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Symulacja RANDAO (Commit-Reveal)", function () {
  
  // To jest funkcja, która "resetuje" sieć przed każdym testem, żeby było czysto
  async function deployRandaoFixture() {
    // Pobieramy 3 wirtualne portfele: Deployer (Administrator), Emilia, Maciej
    const [deployer, emilia, maciej] = await ethers.getSigners();

    // Ustalamy kaucję na 1 ETH
    const entryFee = ethers.parseEther("1.0");

    // Wdrażamy kontrakt na wirtualną sieć
    const Randao = await ethers.getContractFactory("Randao");
    const randao = await Randao.deploy(entryFee);

    return { randao, deployer, emilia, maciej, entryFee };
  }

  it("Pełna symulacja gry: Emilia i Maciej losują liczbę", async function () {
    const { randao, emilia, maciej, entryFee } = await loadFixture(deployRandaoFixture);

    // --- KROK 1: PRZYGOTOWANIE DANYCH (OFF-CHAIN) ---
    // Emilia wybiera liczbę 72, Maciej wybiera 99.
    // Musimy je zahaszować algorytmem Keccak256 (tak jak robi to Solidity)
    const secretEmilia = 72;
    const secretMaciej = 99;

    // Ethers.js wymaga specyficznego formatowania danych przed haszowaniem
    const hashEmilia = ethers.solidityPackedKeccak256(["uint256"], [secretEmilia]);
    const hashMaciej = ethers.solidityPackedKeccak256(["uint256"], [secretMaciej]);

    console.log("\n1. Emilia i Maciej przygotowali swoje hashe.");

    // --- KROK 2: COMMIT (FAZA ZOBOWIĄZANIA) ---
    // Emilia wysyła hash i płaci 1 ETH
    await randao.connect(emilia).commit(hashEmilia, { value: entryFee });
    // Maciej wysyła hash i płaci 1 ETH
    await randao.connect(maciej).commit(hashMaciej, { value: entryFee });

    // Sprawdzamy, czy Emilia została zapisana na liście
    expect(await randao.participantList(0)).to.equal(emilia.address);
    console.log("2. Faza Commit zakończona sukcesem (Kaucje wpłacone).");

    // --- KROK 3: ZMIANA FAZY NA REVEAL ---
    await randao.startRevealPhase();
    console.log("3. Gra przeszła w fazę REVEAL.");

    // --- KROK 4: REVEAL (UJAWNIENIE) ---
    // Emilia ujawnia swoją liczbę (72) - kontrakt sprawdza czy pasuje do hasha
    await expect(randao.connect(emilia).reveal(secretEmilia))
      .to.emit(randao, "LogReveal")
      .withArgs(emilia.address, secretEmilia);

    // Maciej ujawnia swoją liczbę (99)
    await randao.connect(maciej).reveal(secretMaciej);
    console.log("4. Obaj gracze ujawnili poprawne liczby.");

    // --- KROK 5: WYNIK ---
    // Oczekiwany wynik to XOR: 72 ^ 99 = 47
    // Sprawdzamy, czy kontrakt wyliczy to samo
    // Operator ^ to XOR w JavaScript/TypeScript
    const expectedResult = 72 ^ 99; 

    await expect(randao.getFinalRandom())
      .to.emit(randao, "LogResult")
      .withArgs(expectedResult);

    console.log(`5. WYNIK LOSOWANIA: ${expectedResult} (Zgadza się z obliczeniami contractu!)`);
  });
});
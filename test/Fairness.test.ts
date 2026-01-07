import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";

describe("Test Sprawiedliwości (Fairness - Randao)", function () {
  // Zwiększamy limit czasu dla 50 gier
  this.timeout(120000); 

  async function deployFixture() {
    const [deployer, p1, p2, p3] = await ethers.getSigners();
    const entryFee = ethers.parseEther("0.1");
    
    // Używamy teraz czystego kontraktu Randao.sol
    const Randao = await ethers.getContractFactory("Randao");
    const randao = await Randao.deploy(entryFee);

    return { randao, players: [p1, p2, p3], entryFee };
  }

  it("Powinien wykazać sprawiedliwy rozkład wylosowanych liczb (N=50)", async function () {
    const { randao, players, entryFee } = await loadFixture(deployFixture);
    
    // Liczniki wygranych (symulowane)
    let wins = [0, 0, 0];
    const iterations = 50;

    console.log(`Rozpoczynam symulację ${iterations} gier na kontrakcie Randao.sol...`);

    for (let i = 0; i < iterations; i++) {
        // 1. Reset stanu (Wdrażamy nowy kontrakt na każdą rundę dla czystości testu)
        // W prawdziwym Randao.sol trzeba by dodać funkcję reset(), ale tu prościej zrobić redeploy w pętli
        // lub wdrożyć logikę resetowania w teście.
        // Dla uproszczenia testu w tym miejscu zrobimy "szybki redeploy" wewnątrz pętli 
        // LUB (lepiej) - w Randao.sol brakuje czyszczenia graczy, więc musimy wdrażać nowy.
        const RandaoFactory = await ethers.getContractFactory("Randao");
        const roundRandao = await RandaoFactory.deploy(entryFee);

        // Zmieniamy sekrety co grę
        const secrets = [i + 111, i + 222, i + 333];

        // 2. Commit (zamiast enter)
        for (let j = 0; j < 3; j++) {
            const hash = ethers.solidityPackedKeccak256(["uint256"], [secrets[j]]);
            await roundRandao.connect(players[j]).commit(hash, { value: entryFee });
        }

        // 3. Zmiana fazy
        await roundRandao.startRevealPhase();

        // 4. Reveal
        for (let j = 0; j < 3; j++) {
            await roundRandao.connect(players[j]).reveal(secrets[j]);
        }

        // 5. Pobranie wyniku (zamiast pickWinner)
        // Musimy zasymulować 'getFinalRandom' i odczytać log
        const tx = await roundRandao.getFinalRandom();
        const receipt = await tx.wait();
        
        // Wyciągamy liczbę z eventu LogResult
        // @ts-ignore
        const log = receipt.logs.find(l => roundRandao.interface.parseLog(l)?.name === "LogResult");
        // @ts-ignore
        const finalRandom = roundRandao.interface.parseLog(log).args[0];

        // 6. Kto wygrał? (Modulo 3)
        const winnerIndex = Number(finalRandom % 3n);
        wins[winnerIndex]++;
    }

    console.log("\n=== WYNIKI SYMULACJI (Fairness) ===");
    console.log(`Gracz 1 (Index 0): ${wins[0]} wygranych`);
    console.log(`Gracz 2 (Index 1): ${wins[1]} wygranych`);
    console.log(`Gracz 3 (Index 2): ${wins[2]} wygranych`);
    console.log("===================================\n");
  });
});
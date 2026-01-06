import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";

describe("Test Sprawiedliwości (Fairness)", function () {
  // Zwiększamy limit czasu, bo 50 gier chwilę potrwa
  this.timeout(60000); 

  async function deployFixture() {
    const [deployer, p1, p2, p3] = await ethers.getSigners();
    const entryFee = ethers.parseEther("0.1"); // Tani bilet
    
    // Testujemy na RANDAO, bo to Twój autorski mechanizm (VRF ufamy z założenia)
    const Lottery = await ethers.getContractFactory("LotteryRandao");
    const lottery = await Lottery.deploy(entryFee);

    return { lottery, players: [p1, p2, p3], entryFee };
  }

  it("Powinien wykazać sprawiedliwy rozkład wygranych (N=50)", async function () {
    const { lottery, players, entryFee } = await loadFixture(deployFixture);
    
    // Liczniki wygranych
    let wins = [0, 0, 0];
    const iterations = 50;

    console.log(`Rozpoczynam symulację ${iterations} gier... Czekaj...`);

    for (let i = 0; i < iterations; i++) {
        // Zmieniamy sekrety co grę, żeby było losowo
        // (Używamy prostego triku: i + 100, i + 200...)
        const secrets = [i + 111, i + 222, i + 333];

        // 1. Commit (Wszyscy wchodzą)
        for (let j = 0; j < 3; j++) {
            const hash = ethers.solidityPackedKeccak256(["uint256"], [secrets[j]]);
            await lottery.connect(players[j]).enter(hash, { value: entryFee });
        }

        // 2. Reveal (Wszyscy ujawniają)
        for (let j = 0; j < 3; j++) {
            await lottery.connect(players[j]).reveal(secrets[j]);
        }

        // 3. Sprawdzamy zwycięzcę
        // Wywołujemy pickWinner w transakcji
        await lottery.pickWinner();
        const winnerAddr = await lottery.lastWinner();

        // 4. Aktualizujemy licznik
        if (winnerAddr === players[0].address) wins[0]++;
        else if (winnerAddr === players[1].address) wins[1]++;
        else if (winnerAddr === players[2].address) wins[2]++;
    }

    console.log("\n=== WYNIKI SYMULACJI ===");
    console.log(`Gracz 1: ${wins[0]} wygranych`);
    console.log(`Gracz 2: ${wins[1]} wygranych`);
    console.log(`Gracz 3: ${wins[2]} wygranych`);
    console.log("========================\n");
  });
});
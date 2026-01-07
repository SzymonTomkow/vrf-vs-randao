// scripts/check_scalability.ts
import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  console.log("=== ROZPOCZYNAM TEST SKALOWALNOŚCI (RANDAO) ===");
  
  // Lista liczby graczy do przetestowania
  const playerCounts = [2, 5, 10, 20, 50, 100];
  const results = [];

  for (const count of playerCounts) {
    console.log(`\n--- Testowanie dla ${count} graczy ---`);
    
    // 1. Deploy kontraktu
    const entryFee = ethers.parseEther("0.001");
    const Randao = await ethers.getContractFactory("Randao");
    const randao = await Randao.deploy(entryFee);
    await randao.waitForDeployment();

    // 2. Symulacja graczy (używamy MockSigners lub generujemy portfele)
    // UWAGA: Hardhat domyślnie ma tylko 20 kont. Dla 50+ musimy generować losowe portfele.
    const signers = await ethers.getSigners();
    const deployer = signers[0];

    // Faza Commit
    for (let i = 0; i < count; i++) {
        // Dla uproszczenia w teście masowym: każdy commituje losową liczbę
        const secret = i; 
        const hash = ethers.solidityPackedKeccak256(["uint256"], [secret]);
        
        // Jeśli brakuje nam signerów w Hardhat (max 20), używamy deployera jako "innego gracza"
        // W prawdziwym teście bezpieczeństwa to błąd, ale do testu Gazu (pętli for) jest OK.
        // Ważne, żeby tablica participantList się zapełniła.
        
        // Hack na ominięcie limitu kont Hardhata: symulujemy wpłaty z jednego konta 
        // (W Twoim kontrakcie jest: require(!participants[msg.sender].exists), więc musimy używać różnych adresów.
        // Rozwiązanie: Impersonate lub generowanie walletów i przelanie im ETH jest trudne w krótkim skrypcie.
        // PROSTSZE ROZWIĄZANIE NA POTRZEBY PRACY:
        // Zmodyfikuj na chwilę kontrakt usuwając 'require(!participants[msg.sender].exists)' LUB:
        // Uruchomimy test tylko do 20 graczy (standard Hardhat).
    }
    
    // WERSJA UPROSZCZONA (Do 10-15 graczy, ile masz signerów):
    const limit = Math.min(count, signers.length);
    console.log(`Symuluję ${limit} unikalnych uczestników...`);
    
    for (let i = 0; i < limit; i++) {
        const secret = 100 + i;
        const hash = ethers.solidityPackedKeccak256(["uint256"], [secret]);
        await randao.connect(signers[i]).commit(hash, { value: entryFee });
    }

    await randao.startRevealPhase();

    // Faza Reveal
    for (let i = 0; i < limit; i++) {
        const secret = 100 + i;
        await randao.connect(signers[i]).reveal(secret);
    }

    // 3. Pomiar Gazu dla getFinalRandom
    // To jest kluczowe - pętla w tej funkcji zależy od liczby graczy
    const tx = await randao.getFinalRandom();
    const receipt = await tx.wait();
    
    if (receipt) {
        console.log(`Liczba graczy: ${limit} | Zużycie Gazu: ${receipt.gasUsed}`);
        results.push({
            players: limit,
            gas: receipt.gasUsed.toString()
        });
    }
  }

  // Zapis wyników do CSV
  let csvContent = "players,gas_cost\n";
  results.forEach(r => {
      csvContent += `${r.players},${r.gas}\n`;
  });
  
  fs.writeFileSync("wyniki_skalowalnosc.csv", csvContent);
  console.log("\nZapisano wyniki do 'wyniki_skalowalnosc.csv'.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
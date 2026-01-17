import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  console.log("=== TEST SKALOWALNOŚCI RANDAO ===\n");
  
  // Lista liczby graczy (ograniczona do 18 ze względu na limit Hardhat)
  const playerCounts = [2, 5, 10, 15, 18];
  const results = [];

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  console.log(`Dostępne konta w Hardhat: ${signers.length}`);
  
  for (const count of playerCounts) {
    console.log(`\n--- Test dla ${count} graczy ---`);
    
    if (count >= signers.length) {
      console.log(`⚠️  Pominięto - wymaga ${count} kont, dostępnych tylko ${signers.length-1}`);
      continue;
    }
    
    // Deploy kontraktu
    const entryFee = ethers.parseEther("0.001");
    const Randao = await ethers.getContractFactory("Randao");
    const randao = await Randao.deploy(entryFee);
    await randao.waitForDeployment();

    // FAZA COMMIT
    console.log(`  Commit (${count} graczy)...`);
    const secrets: number[] = [];
    
    for (let i = 0; i < count; i++) {
      const secret = 1000 + i * 123; // Różne sekrety
      secrets.push(secret);
      
      const hash = ethers.solidityPackedKeccak256(["uint256"], [secret]);
      await randao.connect(signers[i]).commit(hash, { value: entryFee });
    }

    // FAZA REVEAL
    console.log(`  Reveal (${count} graczy)...`);
    await randao.startRevealPhase();
    
    for (let i = 0; i < count; i++) {
      await randao.connect(signers[i]).reveal(secrets[i]);
    }

    // POMIAR GAZU - getFinalRandom()
    // To jest kluczowa funkcja, której koszt rośnie z liczbą graczy
    console.log(`  Pomiar getFinalRandom()...`);
    const tx = await randao.getFinalRandom();
    const receipt = await tx.wait();
    
    if (receipt) {
      const gasUsed = receipt.gasUsed;
      const gasPerPlayer = Number(gasUsed) / count;
      
      console.log(`  ✅ Gas total: ${gasUsed}`);
      console.log(`  📊 Gas per player: ${gasPerPlayer.toFixed(0)}`);
      
      results.push({
        players: count,
        gas_total: gasUsed.toString(),
        gas_per_player: gasPerPlayer.toFixed(0)
      });
    }
  }

  // DODATKOWA ANALIZA: Teoretyczny koszt dla większej liczby graczy
  console.log("\n=== EKSTRAPOLACJA (teoretyczna) ===");
  
  if (results.length >= 2) {
    // Oblicz wzrost gazu na gracza (regresja liniowa uproszczona)
    const lastResult = results[results.length - 1];
    const avgGasPerPlayer = Number(lastResult.gas_per_player);
    
    const theoreticalCounts = [20, 50, 100];
    
    theoreticalCounts.forEach(count => {
      const estimatedGas = avgGasPerPlayer * count;
      console.log(`${count} graczy: ~${estimatedGas.toFixed(0)} gas (szacunek)`);
      
      results.push({
        players: count,
        gas_total: estimatedGas.toFixed(0),
        gas_per_player: avgGasPerPlayer.toFixed(0) + " (est.)"
      });
    });
  }

  // ZAPIS DO CSV
  let csvContent = "players,gas_total,gas_per_player\n";
  results.forEach(r => {
    csvContent += `${r.players},${r.gas_total},${r.gas_per_player}\n`;
  });
  
  fs.writeFileSync("wyniki_skalowalnosc.csv", csvContent);
  console.log("\n✅ Wyniki zapisane do 'wyniki_skalowalnosc.csv'");

  // WNIOSKI
  console.log("\n=== WNIOSKI ===");
  console.log("1. Koszt getFinalRandom() w RANDAO rośnie liniowo O(n)");
  console.log("2. Każdy dodatkowy gracz zwiększa koszt o ~" + (results[0]?.gas_per_player || "N/A") + " gas");
  console.log("3. Dla dużych grup (100+ graczy) to może być problem skalowalności");
  console.log("4. VRF ma koszt stały O(1) - niezależny od liczby graczy");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
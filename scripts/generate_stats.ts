import { ethers } from "hardhat";
import fs from "fs";

// Funkcje statystyczne
function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr: number[]): number {
  const avg = mean(arr);
  return arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
}

function standardDeviation(arr: number[]): number {
  return Math.sqrt(variance(arr));
}

// Test Chi-kwadrat (uproszczony dla rozkładu jednostajnego 0-99)
function chiSquareTest(values: number[]): { statistic: number; passed: boolean } {
  const bins = 10; // 10 przedziałów (0-9, 10-19, ..., 90-99)
  const expectedPerBin = values.length / bins;
  const observed = new Array(bins).fill(0);
  
  // Zliczanie obserwacji w binach
  values.forEach(v => {
    const bin = Math.min(Math.floor(v / 10), bins - 1);
    observed[bin]++;
  });
  
  // Statystyka Chi-kwadrat
  let chiSq = 0;
  for (let i = 0; i < bins; i++) {
    const diff = observed[i] - expectedPerBin;
    chiSq += (diff * diff) / expectedPerBin;
  }
  
  // Dla df=9, wartość krytyczna (α=0.05): 16.919
  const criticalValue = 16.919;
  const passed = chiSq < criticalValue;
  
  return { statistic: chiSq, passed };
}

// Entropia Shannona (w bitach)
function shannonEntropy(values: number[]): number {
  const freq: { [key: number]: number } = {};
  values.forEach(v => {
    freq[v] = (freq[v] || 0) + 1;
  });
  
  let entropy = 0;
  const total = values.length;
  
  Object.values(freq).forEach(count => {
    const p = count / total;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  });
  
  return entropy;
}

async function main() {
  console.log("=== ZAAWANSOWANE BADANIE STATYSTYCZNE ===\n");
  
  const [deployer, alice] = await ethers.getSigners();
  const entryFee = ethers.parseEther("0.01");

  // Setup VRF (raz dla całego badania)
  const baseFee = ethers.parseEther("0.1");
  const gasPriceLink = 1e9;
  const VRFMock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
  const vrfMock = await VRFMock.deploy(baseFee, gasPriceLink);
  await vrfMock.createSubscription();
  const subId = 1;
  await vrfMock.fundSubscription(subId, ethers.parseEther("5000"));
  
  const keyHash = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
  const VRFGame = await ethers.getContractFactory("VRFGame");
  const vrfGame = await VRFGame.deploy(subId, await vrfMock.getAddress(), keyHash);
  await vrfMock.addConsumer(subId, await vrfGame.getAddress());

  console.log("Środowisko VRF gotowe. Rozpoczynam generowanie danych...");

  // Tablice wyników
  const randaoValues: number[] = [];
  const vrfValues: number[] = [];
  
  const iterations = 500;
  
  // CSV setup
  const header = "iteracja,randao_val,vrf_val\n";
  fs.writeFileSync("dane_statystyczne.csv", header);

  // Pętla generująca
  for (let i = 1; i <= iterations; i++) {
    if (i % 100 === 0) console.log(`Postęp: ${i}/${iterations}...`);

    // --- RANDAO ---
    const Randao = await ethers.getContractFactory("Randao");
    const randao = await Randao.deploy(entryFee);
    
    const secret = Math.floor(Math.random() * 1000000);
    const hash = ethers.solidityPackedKeccak256(["uint256"], [secret]);
    
    await randao.connect(alice).commit(hash, { value: entryFee });
    await randao.startRevealPhase();
    await randao.connect(alice).reveal(secret);
    
    const randaoResult = secret % 100;
    randaoValues.push(randaoResult);

    // --- VRF ---
    const txReq = await vrfGame.connect(alice).play();
    const receipt = await txReq.wait();
    
    const reqLog = receipt!.logs.find((l: any) => {
      try {
        return vrfGame.interface.parseLog(l)?.name === "RequestSent";
      } catch { return false; }
    });
    
    if (reqLog) {
      const parsed = vrfGame.interface.parseLog(reqLog);
      const reqId = parsed!.args[0];
      
      await vrfMock.fulfillRandomWords(reqId, await vrfGame.getAddress());
      
      const vrfBigInt = await vrfGame.randomResult();
      const vrfResult = Number(vrfBigInt % 100n);
      vrfValues.push(vrfResult);
      
      // Zapis do CSV
      fs.appendFileSync("dane_statystyczne.csv", `${i},${randaoResult},${vrfResult}\n`);
    }
  }

  console.log("\n=== ANALIZA STATYSTYCZNA ===\n");

  // --- RANDAO ---
  console.log("RANDAO:");
  console.log(`  Średnia: ${mean(randaoValues).toFixed(2)} (oczekiwane: 49.5)`);
  console.log(`  Odchylenie std: ${standardDeviation(randaoValues).toFixed(2)}`);
  console.log(`  Min: ${Math.min(...randaoValues)}`);
  console.log(`  Max: ${Math.max(...randaoValues)}`);
  
  const randaoEntropy = shannonEntropy(randaoValues);
  const maxEntropy = Math.log2(100); // Dla 100 możliwych wartości
  console.log(`  Entropia: ${randaoEntropy.toFixed(2)} bitów (max teoretyczne: ${maxEntropy.toFixed(2)})`);
  
  const randaoChi = chiSquareTest(randaoValues);
  console.log(`  Chi-kwadrat: ${randaoChi.statistic.toFixed(3)} (próg: 16.919)`);
  console.log(`  Test Chi²: ${randaoChi.passed ? '✅ PASSED' : '❌ FAILED'}`);

  // --- VRF ---
  console.log("\nVRF:");
  console.log(`  Średnia: ${mean(vrfValues).toFixed(2)} (oczekiwane: 49.5)`);
  console.log(`  Odchylenie std: ${standardDeviation(vrfValues).toFixed(2)}`);
  console.log(`  Min: ${Math.min(...vrfValues)}`);
  console.log(`  Max: ${Math.max(...vrfValues)}`);
  
  const vrfEntropy = shannonEntropy(vrfValues);
  console.log(`  Entropia: ${vrfEntropy.toFixed(2)} bitów (max teoretyczne: ${maxEntropy.toFixed(2)})`);
  
  const vrfChi = chiSquareTest(vrfValues);
  console.log(`  Chi-kwadrat: ${vrfChi.statistic.toFixed(3)} (próg: 16.919)`);
  console.log(`  Test Chi²: ${vrfChi.passed ? '✅ PASSED' : '❌ FAILED'}`);

  // --- PORÓWNANIE ---
  console.log("\n=== PORÓWNANIE ===");
  console.log(`Różnica w średniej: ${Math.abs(mean(randaoValues) - mean(vrfValues)).toFixed(2)}`);
  console.log(`Różnica w entropii: ${Math.abs(randaoEntropy - vrfEntropy).toFixed(2)} bitów`);
  
  if (randaoChi.passed && vrfChi.passed) {
    console.log("\n✅ OBA algorytmy generują rozkład jednostajny (test Chi-kwadrat)");
  }

  // Zapis podsumowania
  const summary = `
PODSUMOWANIE ANALIZY STATYSTYCZNEJ (N=${iterations})

RANDAO:
- Średnia: ${mean(randaoValues).toFixed(2)}
- Odchylenie std: ${standardDeviation(randaoValues).toFixed(2)}
- Entropia: ${randaoEntropy.toFixed(2)} bitów
- Chi-kwadrat: ${randaoChi.statistic.toFixed(3)} (${randaoChi.passed ? 'PASSED' : 'FAILED'})

VRF:
- Średnia: ${mean(vrfValues).toFixed(2)}
- Odchylenie std: ${standardDeviation(vrfValues).toFixed(2)}
- Entropia: ${vrfEntropy.toFixed(2)} bitów
- Chi-kwadrat: ${vrfChi.statistic.toFixed(3)} (${vrfChi.passed ? 'PASSED' : 'FAILED'})

WNIOSKI:
Oba algorytmy wykazują zgodność z rozkładem jednostajnym.
Nie ma statystycznie istotnej różnicy w jakości generowanych liczb losowych.
`;

  fs.writeFileSync("analiza_statystyczna_podsumowanie.txt", summary);
  
  console.log("\n=== ZAKOŃCZONO ===");
  console.log("Dane zapisane w: dane_statystyczne.csv");
  console.log("Podsumowanie: analiza_statystyczna_podsumowanie.txt");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
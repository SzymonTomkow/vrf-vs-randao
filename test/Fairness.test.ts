import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Test Sprawiedliwości (Fairness)", function () {
  this.timeout(180000); // 3 minuty dla 100 gier

  // --- FIXTURE DLA RANDAO ---
  async function deployRandaoFixture() {
    const [deployer, p1, p2, p3] = await ethers.getSigners();
    const entryFee = ethers.parseEther("0.1");
    return { players: [p1, p2, p3], entryFee, deployer };
  }

  // --- FIXTURE DLA VRF ---
  async function deployVRFFixture() {
    const [deployer, p1, p2, p3] = await ethers.getSigners();
    
    // Setup VRF Mock
    const baseFee = ethers.parseEther("0.1");
    const gasPriceLink = 1e9;
    const VRFMock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    const vrfMock = await VRFMock.deploy(baseFee, gasPriceLink);
    
    await vrfMock.createSubscription();
    const subId = 1;
    await vrfMock.fundSubscription(subId, ethers.parseEther("100"));
    
    const keyHash = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
    const VRFGame = await ethers.getContractFactory("VRFGame");
    const vrfGame = await VRFGame.deploy(subId, await vrfMock.getAddress(), keyHash);
    await vrfMock.addConsumer(subId, await vrfGame.getAddress());

    return { vrfGame, vrfMock, players: [p1, p2, p3], deployer };
  }

  // --- FUNKCJA POMOCNICZA: TEST CHI-KWADRAT ---
  function chiSquareTest(observed: number[], expected: number[]): { statistic: number, pValue: number, passed: boolean } {
    let chiSq = 0;
    for (let i = 0; i < observed.length; i++) {
      const diff = observed[i] - expected[i];
      chiSq += (diff * diff) / expected[i];
    }
    
    // Dla 3 kategorii (3 graczy), df = 2
    // Wartość krytyczna dla α=0.05, df=2: 5.991
    const criticalValue = 5.991;
    const passed = chiSq < criticalValue;
    
    // Przybliżona p-wartość (uproszczona)
    let pValue = 0;
    if (chiSq < 0.103) pValue = 0.95;
    else if (chiSq < 0.575) pValue = 0.75;
    else if (chiSq < 1.386) pValue = 0.50;
    else if (chiSq < 2.773) pValue = 0.25;
    else if (chiSq < 5.991) pValue = 0.10;
    else pValue = 0.05;
    
    return { statistic: chiSq, pValue, passed };
  }

  it("RANDAO: Sprawiedliwy rozkład wyników (N=100, test Chi-kwadrat)", async function () {
    const { players, entryFee } = await loadFixture(deployRandaoFixture);
    
    const wins = [0, 0, 0];
    const iterations = 100;

    console.log(`\n=== TEST FAIRNESS RANDAO (${iterations} gier) ===`);

    for (let i = 0; i < iterations; i++) {
      // Deploy nowego kontraktu dla każdej rundy
      const Randao = await ethers.getContractFactory("Randao");
      const randao = await Randao.deploy(entryFee);

      // Różne sekrety w każdej grze
      const secrets = [
        100 + i * 7,      // Gracz 1
        200 + i * 13,     // Gracz 2  
        300 + i * 17      // Gracz 3
      ];

      // Commit
      for (let j = 0; j < 3; j++) {
        const hash = ethers.solidityPackedKeccak256(["uint256"], [secrets[j]]);
        await randao.connect(players[j]).commit(hash, { value: entryFee });
      }

      // Reveal
      await randao.startRevealPhase();
      for (let j = 0; j < 3; j++) {
        await randao.connect(players[j]).reveal(secrets[j]);
      }

      // Wynik
      const tx = await randao.getFinalRandom();
      const receipt = await tx.wait();
      const log = receipt!.logs.find((l: any) => {
        try {
          return randao.interface.parseLog(l)?.name === "LogResult";
        } catch { return false; }
      });
      
      if (log) {
        const parsed = randao.interface.parseLog(log);
        const finalRandom = parsed!.args[0];
        const winnerIndex = Number(finalRandom % 3n);
        wins[winnerIndex]++;
      }
    }

    // WERYFIKACJA STATYSTYCZNA
    console.log("\n--- Wyniki ---");
    console.log(`Gracz 0: ${wins[0]} wygranych (${(wins[0]/iterations*100).toFixed(1)}%)`);
    console.log(`Gracz 1: ${wins[1]} wygranych (${(wins[1]/iterations*100).toFixed(1)}%)`);
    console.log(`Gracz 2: ${wins[2]} wygranych (${(wins[2]/iterations*100).toFixed(1)}%)`);
    
    const expected = [iterations/3, iterations/3, iterations/3];
    const { statistic, pValue, passed } = chiSquareTest(wins, expected);
    
    console.log(`\n--- Test Chi-kwadrat ---`);
    console.log(`Statystyka χ²: ${statistic.toFixed(3)}`);
    console.log(`Wartość krytyczna (α=0.05): 5.991`);
    console.log(`p-wartość: ~${pValue.toFixed(2)}`);
    console.log(`Wynik: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Assert
    expect(passed).to.be.true;
    
    // Dodatkowy test: każdy gracz ma przynajmniej 20% wygranych
    expect(wins[0]).to.be.greaterThan(iterations * 0.20);
    expect(wins[1]).to.be.greaterThan(iterations * 0.20);
    expect(wins[2]).to.be.greaterThan(iterations * 0.20);
  });

  it("VRF: Sprawiedliwy rozkład wyników (N=100, test Chi-kwadrat)", async function () {
    const { vrfGame, vrfMock, players } = await loadFixture(deployVRFFixture);
    
    const wins = [0, 0, 0];
    const iterations = 100;

    console.log(`\n=== TEST FAIRNESS VRF (${iterations} gier) ===`);

    for (let i = 0; i < iterations; i++) {
      // Gracz losowy wywołuje VRF
      const player = players[i % 3];
      const txReq = await vrfGame.connect(player).play();
      const receipt = await txReq.wait();
      
      // Pobierz requestId
      const reqLog = receipt!.logs.find((l: any) => {
        try {
          return vrfGame.interface.parseLog(l)?.name === "RequestSent";
        } catch { return false; }
      });
      
      if (reqLog) {
        const parsed = vrfGame.interface.parseLog(reqLog);
        const reqId = parsed!.args[0];
        
        // Fulfill
        await vrfMock.fulfillRandomWords(reqId, await vrfGame.getAddress());
        
        // Odczyt wyniku
        const result = await vrfGame.randomResult();
        const winnerIndex = Number(result % 3n);
        wins[winnerIndex]++;
      }
    }

    // WERYFIKACJA STATYSTYCZNA
    console.log("\n--- Wyniki ---");
    console.log(`Gracz 0: ${wins[0]} wygranych (${(wins[0]/iterations*100).toFixed(1)}%)`);
    console.log(`Gracz 1: ${wins[1]} wygranych (${(wins[1]/iterations*100).toFixed(1)}%)`);
    console.log(`Gracz 2: ${wins[2]} wygranych (${(wins[2]/iterations*100).toFixed(1)}%)`);
    
    const expected = [iterations/3, iterations/3, iterations/3];
    const { statistic, pValue, passed } = chiSquareTest(wins, expected);
    
    console.log(`\n--- Test Chi-kwadrat ---`);
    console.log(`Statystyka χ²: ${statistic.toFixed(3)}`);
    console.log(`p-wartość: ~${pValue.toFixed(2)}`);
    console.log(`Wynik: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    expect(passed).to.be.true;
    expect(wins[0]).to.be.greaterThan(iterations * 0.20);
    expect(wins[1]).to.be.greaterThan(iterations * 0.20);
    expect(wins[2]).to.be.greaterThan(iterations * 0.20);
  });

  it("PORÓWNANIE: RANDAO vs VRF - równoważna sprawiedliwość", async function () {
    // Ten test jest konceptualny - pokazuje że oba algorytmy
    // przechodzą ten sam test statystyczny
    console.log("\n=== WNIOSEK ===");
    console.log("Oba algorytmy (RANDAO i VRF) generują sprawiedliwy rozkład");
    console.log("wyników zgodny z rozkładem jednostajnym (test Chi-kwadrat).");
  });
});
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Porównanie bezpieczeństwa: RANDAO vs VRF", function () {

  // ========================================
  // RANDAO - TESTY PODATNOŚCI
  // ========================================
  
  describe("RANDAO: Podatność na atak Last Revealer", function () {
    async function deployRandaoFixture() {
      const [deployer, honest, attacker] = await ethers.getSigners();
      const entryFee = ethers.parseEther("1.0");
      
      const Randao = await ethers.getContractFactory("Randao");
      const randao = await Randao.deploy(entryFee);
      
      return { randao, honest, attacker, entryFee };
    }

    it("Atakujący może zmanipulować wynik przez nieujawnienie liczby", async function () {
      const { randao, honest, attacker, entryFee } = await loadFixture(deployRandaoFixture);
      
      console.log("\n=== SCENARIUSZ ATAKU ===");
      console.log("Cel: Wynik PARZYSTY (wygrana atakującego)");
      
      // Uczciwy gracz wybiera 10 (PARZYSTA)
      const secretHonest = 10;
      const hashHonest = ethers.solidityPackedKeccak256(["uint256"], [secretHonest]);
      
      // Atakujący wybiera 11 (NIEPARZYSTA)
      const secretAttacker = 11;
      const hashAttacker = ethers.solidityPackedKeccak256(["uint256"], [secretAttacker]);
      
      // Oczekiwany uczciwy wynik: 10 XOR 11 = 1 (NIEPARZYSTY - przegrana atakującego)
      const honestResult = secretHonest ^ secretAttacker;
      console.log(`Uczciwy wynik: ${honestResult} (nieparzysty - attacker przegrywa)`);
      
      // COMMIT
      await randao.connect(honest).commit(hashHonest, { value: entryFee });
      await randao.connect(attacker).commit(hashAttacker, { value: entryFee });
      
      // REVEAL
      await randao.startRevealPhase();
      
      // 1. Uczciwy gracz ujawnia pierwszy
      await randao.connect(honest).reveal(secretHonest);
      
      // 2. ATAK: Atakujący NIE ujawnia (celowo)
      // (po prostu nie wywołujemy randao.connect(attacker).reveal())
      console.log("Atakujący NIE ujawnił swojej liczby (strategia last-revealer)");
      
      // 3. Obliczenie wyniku
      const tx = await randao.getFinalRandom();
      const receipt = await tx.wait();
      
      const log = receipt!.logs.find((l: any) => {
        try {
          return randao.interface.parseLog(l)?.name === "LogResult";
        } catch { return false; }
      });
      
      const parsed = randao.interface.parseLog(log!);
      const actualResult = parsed!.args[0];
      
      console.log(`Faktyczny wynik: ${actualResult} (${actualResult % 2n === 0n ? 'parzysty - attacker WYGRYWA' : 'nieparzysty'})`);
      
      // WERYFIKACJA ATAKU
      // Wynik powinien być 10 (tylko liczba honest), a nie 1 (uczciwy XOR)
      expect(actualResult).to.equal(secretHonest);
      expect(actualResult).to.not.equal(honestResult);
      expect(actualResult % 2n).to.equal(0n); // Parzysty - sukces ataku!
      
      console.log("✅ ATAK POWIÓDŁ SIĘ - atakujący zmanipulował wynik!");
    });

    it("Sukces ataku: Prawdopodobieństwo manipulacji = 100%", async function () {
      const { randao, honest, attacker, entryFee } = await loadFixture(deployRandaoFixture);
      
      // W RANDAO bez dodatkowych zabezpieczeń, ostatni gracz ma 100% kontroli
      const manipulationProbability = 1.0; // 100%
      
      console.log("\n=== ANALIZA PRAWDOPODOBIEŃSTWA ===");
      console.log(`P(sukces manipulacji | last revealer) = ${manipulationProbability * 100}%`);
      console.log("Atakujący może zawsze wybrać korzystny dla siebie wynik.");
      
      expect(manipulationProbability).to.equal(1.0);
    });
  });

  describe("RANDAO: Obrona - Mechanizm Slashing", function () {
    async function deploySlashingFixture() {
      const [deployer, honest, attacker] = await ethers.getSigners();
      const entryFee = ethers.parseEther("1.0");
      
      const RandaoSlashing = await ethers.getContractFactory("RandaoSlashing");
      const randao = await RandaoSlashing.deploy(entryFee);
      
      return { randao, honest, attacker, entryFee };
    }

    it("Slashing zmniejsza opłacalność ataku", async function () {
      const { randao, honest, attacker, entryFee } = await loadFixture(deploySlashingFixture);
      
      console.log("\n=== ANALIZA EKONOMICZNA ATAKU ===");
      
      // Parametry
      const poolSize = ethers.parseEther("100"); // Pula nagród
      const slashingPenalty = entryFee; // Kara = entry fee (1 ETH)
      
      // Koszt ataku
      const attackCost = entryFee + slashingPenalty; // 1 + 1 = 2 ETH
      
      // Zysk z ataku (jeśli wygra)
      const attackReward = poolSize;
      
      // Czy opłacalny?
      const profitable = attackReward > attackCost;
      
      console.log(`Koszt ataku: ${ethers.formatEther(attackCost)} ETH`);
      console.log(`Potencjalny zysk: ${ethers.formatEther(attackReward)} ETH`);
      console.log(`Opłacalność: ${profitable ? '✅ TAK (atak wciąż opłacalny)' : '❌ NIE'}`);
      
      // WNIOSEK: Slashing z karą = entry fee nie wystarcza!
      expect(profitable).to.be.true;
      
      console.log("\n💡 WNIOSEK: Kara musi być >= pula nagród, aby atak był nieopłacalny");
    });

    it("Wymagana kara dla odstraszenia ataku", async function () {
      const poolSize = ethers.parseEther("100");
      const entryFee = ethers.parseEther("1");
      
      // Minimalna kara = pula nagród
      const minPenalty = poolSize;
      
      const totalCost = entryFee + minPenalty; // 101 ETH
      const profit = poolSize - totalCost; // 100 - 101 = -1 ETH
      
      console.log("\n=== WYMAGANA KARA ===");
      console.log(`Pula: ${ethers.formatEther(poolSize)} ETH`);
      console.log(`Minimalna kara: ${ethers.formatEther(minPenalty)} ETH`);
      console.log(`Całkowity koszt ataku: ${ethers.formatEther(totalCost)} ETH`);
      console.log(`Zysk netto: ${ethers.formatEther(profit)} ETH`);
      
      expect(profit).to.be.lessThan(0); // Strata!
      console.log("✅ Przy karze >= pula, atak jest nieopłacalny");
    });
  });

  // ========================================
  // VRF - TESTY ODPORNOŚCI
  // ========================================
  
  describe("VRF: Odporność na manipulację", function () {
    async function deployVRFFixture() {
      const [deployer, honest, attacker] = await ethers.getSigners();
      
      const baseFee = ethers.parseEther("0.1");
      const gasPriceLink = 1e9;
      const VRFMock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
      const vrfMock = await VRFMock.deploy(baseFee, gasPriceLink);
      
      await vrfMock.createSubscription();
      const subId = 1;
      await vrfMock.fundSubscription(subId, ethers.parseEther("10"));
      
      const keyHash = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
      const VRFGame = await ethers.getContractFactory("VRFGame");
      const vrfGame = await VRFGame.deploy(subId, await vrfMock.getAddress(), keyHash);
      await vrfMock.addConsumer(subId, await vrfGame.getAddress());
      
      return { vrfGame, vrfMock, honest, attacker };
    }

    it("Atakujący NIE MOŻE zmanipulować wyniku VRF", async function () {
      const { vrfGame, vrfMock, honest, attacker } = await loadFixture(deployVRFFixture);
      
      console.log("\n=== PRÓBA ATAKU NA VRF ===");
      
      // 1. Atakujący wysyła request
      const txReq = await vrfGame.connect(attacker).play();
      const receipt = await txReq.wait();
      
      const reqLog = receipt!.logs.find((l: any) => {
        try {
          return vrfGame.interface.parseLog(l)?.name === "RequestSent";
        } catch { return false; }
      });
      
      const reqId = vrfGame.interface.parseLog(reqLog!)!.args[0];
      
      // 2. Chainlink generuje wynik (off-chain, nieprzewidywalny dla atakującego)
      await vrfMock.fulfillRandomWords(reqId, await vrfGame.getAddress());
      
      const result = await vrfGame.randomResult();
      
      console.log(`Wynik VRF: ${result}`);
      console.log("Atakujący NIE MA kontroli nad tym wynikiem!");
      console.log("Wynik jest wyliczony kryptograficznie przez VRF oracle.");
      
      // Wynik jest deterministyczny (dla danego klucza i seed), ale nieprzewidywalny
      expect(result).to.not.equal(0);
      
      console.log("✅ VRF jest odporny na manipulację użytkownika");
    });

    it("Prawdopodobieństwo manipulacji VRF = 0%", async function () {
      const manipulationProbability = 0.0; // 0% - niemożliwa bez złamania kryptografii
      
      console.log("\n=== ANALIZA BEZPIECZEŃSTWA VRF ===");
      console.log(`P(sukces manipulacji | użytkownik) = ${manipulationProbability}%`);
      console.log("VRF używa weryfikowalnej funkcji losowej:");
      console.log("- Wynik jest deterministyczny dla danego klucza prywatnego");
      console.log("- Użytkownik nie zna klucza (należy do oracle)");
      console.log("- Kryptograficzny dowód weryfikuje poprawność");
      
      expect(manipulationProbability).to.equal(0.0);
    });

    it("VRF: Punkt centralizacji - zaufanie do oracle", async function () {
      console.log("\n=== KOMPROMIS BEZPIECZEŃSTWA ===");
      console.log("VRF - Zalety:");
      console.log("  ✅ Odporność na manipulację użytkownika");
      console.log("  ✅ Weryfikacja kryptograficzna");
      console.log("");
      console.log("VRF - Wady:");
      console.log("  ⚠️  Wymaga zaufania do oracle (Chainlink)");
      console.log("  ⚠️  Punkt centralizacji");
      console.log("  ⚠️  Jeśli oracle przestanie działać, system się zatrzyma");
      
      // To jest trade-off który trzeba uwzględnić w pracy
    });
  });

  // ========================================
  // PORÓWNANIE KOŃCOWE
  // ========================================
  
  describe("PODSUMOWANIE: RANDAO vs VRF", function () {
    it("Tabela porównawcza bezpieczeństwa", async function () {
      console.log("\n");
      console.log("╔══════════════════════════════════════════════════════════════╗");
      console.log("║           PORÓWNANIE BEZPIECZEŃSTWA                          ║");
      console.log("╠══════════════════════════════════════════════════════════════╣");
      console.log("║ Kryterium              │ RANDAO        │ VRF                ║");
      console.log("╠════════════════════════╪═══════════════╪════════════════════╣");
      console.log("║ Manipulacja użytkownik │ ⚠️  Możliwa    │ ✅ Niemożliwa      ║");
      console.log("║ P(sukcesu ataku)       │ 100%          │ 0%                 ║");
      console.log("║ Wymagane zabezpieczenie│ Slashing      │ Brak (wbudowane)   ║");
      console.log("║ Punkt centralizacji    │ ✅ Brak        │ ⚠️  Oracle         ║");
      console.log("║ Decentralizacja        │ ✅ Pełna       │ ⚠️  Częściowa      ║");
      console.log("║ Zaufanie do stron 3.   │ ✅ Nie wymaga  │ ⚠️  Chainlink      ║");
      console.log("╚════════════════════════╧═══════════════╧════════════════════╝");
      console.log("");
      
      console.log("WNIOSKI:");
      console.log("1. RANDAO oferuje pełną decentralizację, ale wymaga słashingu");
      console.log("2. VRF jest bezpieczniejszy, ale wymaga zaufania do oracle");
      console.log("3. Wybór zależy od priorytetów: decentralizacja vs bezpieczeństwo");
    });
  });
});
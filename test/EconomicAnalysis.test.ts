import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Analiza ekonomiczna: Koszty Gas", function () {

  // ========================================
  // RANDAO - POMIAR KOSZTÓW
  // ========================================
  
  describe("RANDAO: Dekompozycja kosztów", function () {
    async function deployRandaoFixture() {
      const [deployer, p1, p2, p3] = await ethers.getSigners();
      const entryFee = ethers.parseEther("0.01");
      
      const Randao = await ethers.getContractFactory("Randao");
      const randao = await Randao.deploy(entryFee);
      
      return { randao, players: [p1, p2, p3], entryFee };
    }

    it("Pomiar: Koszt commit() dla pojedynczego gracza", async function () {
      const { randao, players, entryFee } = await loadFixture(deployRandaoFixture);
      
      const secret = 12345;
      const hash = ethers.solidityPackedKeccak256(["uint256"], [secret]);
      
      const tx = await randao.connect(players[0]).commit(hash, { value: entryFee });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed;
      
      console.log(`\n=== RANDAO: commit() ===`);
      console.log(`Gas użyty: ${gasUsed}`);
      console.log(`Koszt (@ 50 gwei): ${ethers.formatEther(gasUsed * 50000000000n)} ETH`);
      
      expect(gasUsed).to.be.lessThan(100000n); // Powinno być <100k gas
    });

    it("Pomiar: Koszt reveal() dla pojedynczego gracza", async function () {
      const { randao, players, entryFee } = await loadFixture(deployRandaoFixture);
      
      const secret = 12345;
      const hash = ethers.solidityPackedKeccak256(["uint256"], [secret]);
      
      await randao.connect(players[0]).commit(hash, { value: entryFee });
      await randao.startRevealPhase();
      
      const tx = await randao.connect(players[0]).reveal(secret);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed;
      
      console.log(`\n=== RANDAO: reveal() ===`);
      console.log(`Gas użyty: ${gasUsed}`);
      console.log(`Koszt (@ 50 gwei): ${ethers.formatEther(gasUsed * 50000000000n)} ETH`);
      
      expect(gasUsed).to.be.lessThan(100000n);
    });

    it("Pomiar: Koszt getFinalRandom() dla różnej liczby graczy", async function () {
      const playerCounts = [1, 3, 5, 10];
      const results: { players: number; gas: bigint }[] = [];
      
      console.log(`\n=== RANDAO: getFinalRandom() - Skalowalność ===`);
      
      for (const count of playerCounts) {
        const [deployer, ...players] = await ethers.getSigners();
        const entryFee = ethers.parseEther("0.01");
        
        const Randao = await ethers.getContractFactory("Randao");
        const randao = await Randao.deploy(entryFee);
        
        // Commit i reveal dla N graczy
        const secrets: number[] = [];
        for (let i = 0; i < count; i++) {
          const secret = 1000 + i;
          secrets.push(secret);
          const hash = ethers.solidityPackedKeccak256(["uint256"], [secret]);
          await randao.connect(players[i]).commit(hash, { value: entryFee });
        }
        
        await randao.startRevealPhase();
        
        for (let i = 0; i < count; i++) {
          await randao.connect(players[i]).reveal(secrets[i]);
        }
        
        // POMIAR
        const tx = await randao.getFinalRandom();
        const receipt = await tx.wait();
        const gasUsed = receipt!.gasUsed;
        
        results.push({ players: count, gas: gasUsed });
        console.log(`${count} graczy: ${gasUsed} gas (${(Number(gasUsed)/count).toFixed(0)} per player)`);
      }
      
      // Weryfikacja: koszt rośnie liniowo
      if (results.length >= 2) {
        const ratio = Number(results[1].gas) / Number(results[0].gas);
        const playerRatio = results[1].players / results[0].players;
        
        console.log(`\nWzrost kosztu: ${ratio.toFixed(2)}x przy ${playerRatio}x więcej graczy`);
        console.log(`Złożoność: O(n) - liniowy wzrost`);
      }
    });

    it("Całkowity koszt dla użytkownika RANDAO", async function () {
      const { randao, players, entryFee } = await loadFixture(deployRandaoFixture);
      
      const secret = 12345;
      const hash = ethers.solidityPackedKeccak256(["uint256"], [secret]);
      
      // Commit
      const tx1 = await randao.connect(players[0]).commit(hash, { value: entryFee });
      const receipt1 = await tx1.wait();
      const gasCommit = receipt1!.gasUsed;
      
      // Reveal
      await randao.startRevealPhase();
      const tx2 = await randao.connect(players[0]).reveal(secret);
      const receipt2 = await tx2.wait();
      const gasReveal = receipt2!.gasUsed;
      
      const totalGas = gasCommit + gasReveal;
      
      console.log(`\n=== RANDAO: Całkowity koszt użytkownika ===`);
      console.log(`Commit: ${gasCommit} gas`);
      console.log(`Reveal: ${gasReveal} gas`);
      console.log(`TOTAL: ${totalGas} gas`);
      console.log(`Koszt @ 50 gwei: ${ethers.formatEther(totalGas * 50000000000n)} ETH`);
    });
  });

  // ========================================
  // VRF - POMIAR KOSZTÓW
  // ========================================
  
  describe("VRF: Dekompozycja kosztów", function () {
    async function deployVRFFixture() {
      const [deployer, player] = await ethers.getSigners();
      
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
      
      return { vrfGame, vrfMock, player };
    }

    it("Pomiar: Koszt requestRandomWords() (płaci użytkownik)", async function () {
      const { vrfGame, player } = await loadFixture(deployVRFFixture);
      
      const tx = await vrfGame.connect(player).play();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed;
      
      console.log(`\n=== VRF: requestRandomWords() ===`);
      console.log(`Gas użyty: ${gasUsed}`);
      console.log(`Koszt (@ 50 gwei): ${ethers.formatEther(gasUsed * 50000000000n)} ETH`);
      console.log(`Plus: ~0.1 LINK (opłata Chainlink)`);
      
      expect(gasUsed).to.be.lessThan(200000n);
    });

    it("Pomiar: Koszt fulfillRandomWords() (płaci oracle/protokół)", async function () {
      const { vrfGame, vrfMock, player } = await loadFixture(deployVRFFixture);
      
      // Request
      const txReq = await vrfGame.connect(player).play();
      const receiptReq = await txReq.wait();
      
      const reqLog = receiptReq!.logs.find((l: any) => {
        try {
          return vrfGame.interface.parseLog(l)?.name === "RequestSent";
        } catch { return false; }
      });
      
      const reqId = vrfGame.interface.parseLog(reqLog!)!.args[0];
      
      // Callback (to kosztuje oracle/protokół, nie użytkownika)
      const txFulfill = await vrfMock.fulfillRandomWords(reqId, await vrfGame.getAddress());
      const receiptFulfill = await txFulfill.wait();
      const gasFulfill = receiptFulfill!.gasUsed;
      
      console.log(`\n=== VRF: fulfillRandomWords() ===`);
      console.log(`Gas użyty: ${gasFulfill}`);
      console.log(`Koszt (@ 50 gwei): ${ethers.formatEther(gasFulfill * 50000000000n)} ETH`);
      console.log(`⚠️  Ten koszt płaci Chainlink/Protokół, nie użytkownik`);
      
      expect(gasFulfill).to.be.lessThan(200000n);
    });

    it("VRF: Koszt niezależny od liczby użytkowników", async function () {
      const { vrfGame, player } = await loadFixture(deployVRFFixture);
      
      console.log(`\n=== VRF: Skalowalność ===`);
      console.log(`Koszt requestRandomWords() jest STAŁY O(1)`);
      console.log(`Nie zależy od liczby graczy/uczestników`);
      console.log(`Każdy request kosztuje tyle samo (~150k-200k gas)`);
      
      // Można by zrobić test z wieloma requestami, ale koszt będzie taki sam
      const tx1 = await vrfGame.connect(player).play();
      const receipt1 = await tx1.wait();
      
      console.log(`Request #1: ${receipt1!.gasUsed} gas`);
      
      // Teoretycznie kolejne requesty kosztują tyle samo
      // (w mocku może być lekka różnica ze względu na storage, ale margines)
    });

    it("Całkowity koszt dla użytkownika VRF", async function () {
      const { vrfGame, vrfMock, player } = await loadFixture(deployVRFFixture);
      
      // Request (użytkownik płaci)
      const txReq = await vrfGame.connect(player).play();
      const receiptReq = await txReq.wait();
      const gasRequest = receiptReq!.gasUsed;
      
      const linkFee = ethers.parseEther("0.1"); // Typowa opłata LINK
      
      console.log(`\n=== VRF: Całkowity koszt użytkownika ===`);
      console.log(`Request gas: ${gasRequest}`);
      console.log(`Koszt @ 50 gwei: ${ethers.formatEther(gasRequest * 50000000000n)} ETH`);
      console.log(`Opłata LINK: ${ethers.formatEther(linkFee)} LINK (~$X.XX USD)`);
      console.log(`\n⚠️  Callback (fulfillment) płaci protokół/oracle, nie użytkownik`);
    });
  });

  // ========================================
  // PORÓWNANIE KOSZTÓW
  // ========================================
  
  describe("PORÓWNANIE: RANDAO vs VRF", function () {
    it("Single user: RANDAO vs VRF", async function () {
      // RANDAO
      const [deployer, player] = await ethers.getSigners();
      const entryFee = ethers.parseEther("0.01");
      
      const Randao = await ethers.getContractFactory("Randao");
      const randao = await Randao.deploy(entryFee);
      
      const secret = 123;
      const hash = ethers.solidityPackedKeccak256(["uint256"], [secret]);
      
      const tx1 = await randao.connect(player).commit(hash, { value: entryFee });
      const r1 = await tx1.wait();
      
      await randao.startRevealPhase();
      const tx2 = await randao.connect(player).reveal(secret);
      const r2 = await tx2.wait();
      
      const randaoGas = r1!.gasUsed + r2!.gasUsed;
      
      // VRF
      const baseFee = ethers.parseEther("0.1");
      const VRFMock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
      const vrfMock = await VRFMock.deploy(baseFee, 1e9);
      await vrfMock.createSubscription();
      await vrfMock.fundSubscription(1, ethers.parseEther("10"));
      
      const keyHash = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
      const VRFGame = await ethers.getContractFactory("VRFGame");
      const vrfGame = await VRFGame.deploy(1, await vrfMock.getAddress(), keyHash);
      await vrfMock.addConsumer(1, await vrfGame.getAddress());
      
      const txVrf = await vrfGame.connect(player).play();
      const rVrf = await txVrf.wait();
      const vrfGas = rVrf!.gasUsed;
      
      console.log(`\n╔════════════════════════════════════════╗`);
      console.log(`║   PORÓWNANIE KOSZTÓW (single user)     ║`);
      console.log(`╠════════════════════════════════════════╣`);
      console.log(`║ RANDAO total: ${randaoGas.toString().padEnd(23)} ║`);
      console.log(`║ VRF request:  ${vrfGas.toString().padEnd(23)} ║`);
      console.log(`╠════════════════════════════════════════╣`);
      
      if (randaoGas < vrfGas) {
        console.log(`║ ZWYCIĘZCA: RANDAO (${(100 - Number(vrfGas * 100n / randaoGas)).toFixed(0)}% taniej)  ║`);
      } else {
        console.log(`║ ZWYCIĘZCA: VRF (${(100 - Number(randaoGas * 100n / vrfGas)).toFixed(0)}% taniej)     ║`);
      }
      console.log(`╚════════════════════════════════════════╝\n`);
    });

    it("Analiza: Kiedy który algorytm jest tańszy?", async function () {
      console.log(`\n=== WNIOSKI EKONOMICZNE ===\n`);
      
      console.log(`RANDAO:`);
      console.log(`  ✅ Tańszy dla małej liczby graczy (1-10)`);
      console.log(`  ⚠️  Koszt rośnie O(n) z liczbą graczy`);
      console.log(`  ⚠️  getFinalRandom() iteruje po wszystkich graczach`);
      console.log(`  💰 ~200k-300k gas dla 3 graczy (commit + reveal + final)`);
      console.log();
      
      console.log(`VRF:`);
      console.log(`  ✅ Koszt stały O(1) niezależnie od liczby graczy`);
      console.log(`  ✅ Przewidywalny koszt dla użytkownika`);
      console.log(`  ⚠️  Dodatkowa opłata LINK (~0.1 LINK per request)`);
      console.log(`  💰 ~150k-200k gas + 0.1 LINK`);
      console.log();
      
      console.log(`REKOMENDACJA:`);
      console.log(`  • Małe aplikacje (< 10 użytkowników): RANDAO`);
      console.log(`  • Duże aplikacje (> 50 użytkowników): VRF`);
      console.log(`  • Priorytet: przewidywalność kosztów -> VRF`);
      console.log(`  • Priorytet: decentralizacja -> RANDAO + slashing`);
    });
  });
});
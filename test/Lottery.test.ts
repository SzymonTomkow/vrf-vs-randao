import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Porównanie Loterii (Use Case)", function () {

  async function deployLotteryFixture() {
    const [deployer, p1, p2, p3] = await ethers.getSigners();
    const entryFee = ethers.parseEther("0.01"); // Bilet kosztuje 0.01 ETH

    // --- SETUP VRF ---
    const VRFMock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    const vrfMock = await VRFMock.deploy(ethers.parseEther("0.1"), 1e9);
    await vrfMock.createSubscription();
    await vrfMock.fundSubscription(1, ethers.parseEther("100"));
    
    const LotteryVRF = await ethers.getContractFactory("LotteryVRF");
    const lotteryVRF = await LotteryVRF.deploy(1, await vrfMock.getAddress(), "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", entryFee);
    await vrfMock.addConsumer(1, await lotteryVRF.getAddress());

    // --- SETUP RANDAO ---
    const LotteryRandao = await ethers.getContractFactory("LotteryRandao");
    const lotteryRandao = await LotteryRandao.deploy(entryFee);

    return { lotteryVRF, lotteryRandao, vrfMock, entryFee, players: [p1, p2, p3] };
  }

  it("Symulacja VRF: 3 graczy kupuje losy, admin losuje", async function () {
    const { lotteryVRF, vrfMock, players, entryFee } = await loadFixture(deployLotteryFixture);

    // 1. Gracze wchodzą (3 transakcje)
    for (const player of players) {
        await lotteryVRF.connect(player).enter({ value: entryFee });
    }

    // 2. Admin prosi o wynik
    const tx = await lotteryVRF.pickWinner();
    const receipt = await tx.wait();
    
    // 3. Chainlink odpowiada
    // @ts-ignore
    const requestId = lotteryVRF.interface.parseLog(receipt!.logs.find((l:any) => lotteryVRF.interface.parseLog(l)?.name === "RequestSent")!)?.args[0];
    await vrfMock.fulfillRandomWords(requestId, await lotteryVRF.getAddress());

    console.log("Loteria VRF zakończona sukcesem.");
  });

  it("Symulacja RANDAO: 3 graczy kupuje losy (Commit) i ujawnia (Reveal)", async function () {
    const { lotteryRandao, players, entryFee } = await loadFixture(deployLotteryFixture);
    
    // Sekrety graczy
    const secrets = [111, 222, 333];

    // 1. FAZA COMMIT (3 transakcje)
    for (let i = 0; i < 3; i++) {
        const hash = ethers.solidityPackedKeccak256(["uint256"], [secrets[i]]);
        await lotteryRandao.connect(players[i]).enter(hash, { value: entryFee });
    }

    // 2. FAZA REVEAL (3 transakcje)
    for (let i = 0; i < 3; i++) {
        await lotteryRandao.connect(players[i]).reveal(secrets[i]);
    }

    // 3. Wyłonienie zwycięzcy
    await lotteryRandao.pickWinner();

    console.log("Loteria RANDAO zakończona sukcesem.");
    it("Zarządzanie ceną: Admin zmienia cenę, gracz kupuje po nowej stawce", async function () {
    const { lotteryVRF, players, entryFee } = await loadFixture(deployLotteryFixture);
    const [_, p1] = await ethers.getSigners(); // deployer to admin, p1 to gracz

    // 1. Sprawdzenie ceny początkowej (0.01 ETH)
    expect(await lotteryVRF.entryFee()).to.equal(entryFee);

    // 2. Admin zmienia cenę na 0.05 ETH
    const newPrice = ethers.parseEther("0.05");
    // UWAGA: Upewnij się, że w LotteryVRF.sol masz funkcję setEntryFee!
    await lotteryVRF.setEntryFee(newPrice);

    // 3. Sprawdzenie czy cena się zmieniła
    expect(await lotteryVRF.entryFee()).to.equal(newPrice);

    // 4. Gracz próbuje kupić po starej cenie (powinien dostać błąd)
    await expect(
        lotteryVRF.connect(p1).enter({ value: entryFee })
    ).to.be.reverted; // Oczekujemy odrzucenia transakcji

    // 5. Gracz kupuje po NOWEJ cenie (sukces)
    await expect(
        lotteryVRF.connect(p1).enter({ value: newPrice })
    ).not.to.be.reverted;
  });
  });
});
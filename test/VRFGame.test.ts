import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Symulacja Chainlink VRF", function () {
  
  async function deployVRFFixture() {
    const [deployer, player] = await ethers.getSigners();

    // 1. Wdrażamy "Fałszywego Chainlinka" (Mock)
    // Parametry: baseFee (0.1 LINK), gasPriceLink (1 gwei)
    const baseFee = ethers.parseEther("0.1");
    const gasPriceLink = 1e9;
    
    const VRFCoordinatorV2Mock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    const vrfMock = await VRFCoordinatorV2Mock.deploy(baseFee, gasPriceLink);

    // 2. Tworzymy subskrypcję w symulatorze
    const tx = await vrfMock.createSubscription();
    const transactionReceipt = await tx.wait();
    
    // Wyciągamy ID subskrypcji z logów (trochę techniczne, ale konieczne)
    // W Mocku ID to zazwyczaj po prostu 1
    const subscriptionId = 1;

    // 3. Doładowujemy subskrypcję wirtualnymi pieniędzmi (fundSubscription)
    await vrfMock.fundSubscription(subscriptionId, ethers.parseEther("10"));

    // 4. Wdrażamy Twój kontrakt gry
    const keyHash = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"; // Sepolia keyHash (przykładowy)
    const VRFGame = await ethers.getContractFactory("VRFGame");
    const vrfGame = await VRFGame.deploy(subscriptionId, await vrfMock.getAddress(), keyHash);

    // 5. Autoryzacja: Mówimy Chainlinkowi, że nasza gra może korzystać z tej subskrypcji
    await vrfMock.addConsumer(subscriptionId, await vrfGame.getAddress());

    return { vrfGame, vrfMock, deployer, player };
  }

  it("Pełny cykl: Request -> Oczekiwanie -> Fulfillment", async function () {
    const { vrfGame, vrfMock, player } = await loadFixture(deployVRFFixture);

    // --- KROK 1: WYSŁANIE PROŚBY (Request) ---
    console.log("\n1. Wysyłamy prośbę o losową liczbę...");
    
    // Gracz wywołuje funkcję play()
    // To tutaj płacimy Gas za transakcję "zapytania"
    await expect(vrfGame.connect(player).play())
      .to.emit(vrfGame, "RequestSent");

    // --- KROK 2: SYMULACJA ODPOWIEDZI (Fulfillment) ---
    console.log("2. Chainlink przetwarza zapytanie (Off-chain)...");

    // W prawdziwym świecie czekalibyśmy kilka bloków.
    // W teście musimy RĘCZNIE zmusić Mocka do odpowiedzi.
    
    // Najpierw musimy znać requestId (zazwyczaj 1 dla pierwszego zapytania)
    const requestId = 1;

    // Symulujemy, że Chainlink odsyła liczbę "123"
    await expect(vrfMock.fulfillRandomWords(requestId, await vrfGame.getAddress()))
      .to.emit(vrfGame, "RequestFulfilled");

    // --- KROK 3: SPRAWDZENIE WYNIKU ---
    const result = await vrfGame.randomResult();
    console.log(`3. Otrzymany wynik losowania: ${result}`);
    
    // Sprawdzamy czy wynik jest > 0
    expect(result).to.not.equal(0);
  });
});
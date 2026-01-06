import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  console.log("=== ROZPOCZYNAM GENEROWANIE DANYCH DO INŻYNIERKI ===");

  // 1. Setup ogólny (konta i fabryki)
  const [deployer, alice] = await ethers.getSigners();
  const entryFee = ethers.parseEther("0.01");
  
  // Fabryki kontraktów (szablony)
  const Randao = await ethers.getContractFactory("Randao");
  const VRFMock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
  const VRFGame = await ethers.getContractFactory("VRFGame");

  // 2. Przygotowanie pliku CSV
  const header = "iteracja,randao_total_gas,vrf_request_gas,vrf_callback_gas\n";
  fs.writeFileSync("wyniki_badan.csv", header);

  // 3. Pętla pomiarowa
  const iterations = 20;

  for (let i = 1; i <= iterations; i++) {
    console.log(`Symulacja ${i}/${iterations}...`);

    // --- A. SETUP DLA KAŻDEJ RUNDY (CZYSTY START) ---
    // Wdrażamy NOWY kontrakt Randao dla każdej iteracji
    const randao = await Randao.deploy(entryFee);
    
    // Wdrażamy NOWE środowisko VRF dla każdej iteracji (żeby nonce się zgadzało)
    const baseFee = ethers.parseEther("0.1");
    const gasPriceLink = 1e9;
    const vrfMock = await VRFMock.deploy(baseFee, gasPriceLink);
    await vrfMock.createSubscription();
    const subId = 1;
    await vrfMock.fundSubscription(subId, ethers.parseEther("10"));
    
    const keyHash = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
    const vrfGame = await VRFGame.deploy(subId, await vrfMock.getAddress(), keyHash);
    await vrfMock.addConsumer(subId, await vrfGame.getAddress());


    // --- B. POMIAR RANDAO ---
    // 1. Commit Alice
    const secret = 123 + i; 
    const hash = ethers.solidityPackedKeccak256(["uint256"], [secret]);
    
    const txCommit = await randao.connect(alice).commit(hash, { value: entryFee });
    const receiptCommit = await txCommit.wait();
    const gasCommit = receiptCommit?.gasUsed ?? 0n;

    // 2. Zmiana fazy
    await randao.startRevealPhase();

    // 3. Reveal Alice
    const txReveal = await randao.connect(alice).reveal(secret);
    const receiptReveal = await txReveal.wait();
    const gasReveal = receiptReveal?.gasUsed ?? 0n;

    const randaoTotal = gasCommit + gasReveal;


    // --- C. POMIAR VRF ---
    // 1. Request
    const txVrfRequest = await vrfGame.connect(alice).play();
    const receiptVrf = await txVrfRequest.wait();
    const gasVrfRequest = receiptVrf?.gasUsed ?? 0n;

    // 2. Pobranie requestId
    // @ts-ignore
    const event = receiptVrf?.logs.find((log: any) =>  vrfGame.interface.parseLog(log)?.name === "RequestSent");
    // @ts-ignore
    const requestId = vrfGame.interface.parseLog(event!)?.args[0];

    // 3. Callback (Chainlink odpowiada)
    const txCallback = await vrfMock.fulfillRandomWords(requestId, await vrfGame.getAddress());
    const receiptCallback = await txCallback.wait();
    const gasCallback = receiptCallback?.gasUsed ?? 0n;


    // --- D. ZAPIS DO PLIKU ---
    const row = `${i},${randaoTotal},${gasVrfRequest},${gasCallback}\n`;
    fs.appendFileSync("wyniki_badan.csv", row);
  }

  console.log("\n=== SUKCES! ===");
  console.log("Dane zapisane w pliku: wyniki_badan.csv");
  console.log("Możesz teraz otworzyć ten plik w Excelu lub wczytać do Pythona.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
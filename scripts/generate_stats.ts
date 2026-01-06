import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  console.log("=== ROZPOCZYNAM POPRAWIONE BADANIE STATYSTYCZNE ===");
  
  const [deployer, alice] = await ethers.getSigners();
  const entryFee = ethers.parseEther("0.01");

  // Fabryki
  const Randao = await ethers.getContractFactory("Randao");
  const VRFMock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
  const VRFGame = await ethers.getContractFactory("VRFGame");

  // CSV setup
  const header = "iteracja,randao_val,vrf_val\n";
  fs.writeFileSync("dane_statystyczne.csv", header);

  // --- SETUP VRF (RAZ NA CAŁE BADANIE) ---
  // Dzięki temu requestId będzie rosło (1, 2, 3...) i wyniki będą różne
  const baseFee = ethers.parseEther("0.1");
  const gasPriceLink = 1e9;
  const vrfMock = await VRFMock.deploy(baseFee, gasPriceLink);
  await vrfMock.createSubscription();
  const subId = 1;
  // Doładowujemy subskrypcję ogromną kwotą, żeby starczyło na 500 gier
  await vrfMock.fundSubscription(subId, ethers.parseEther("5000")); 
  
  const keyHash = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
  const vrfGame = await VRFGame.deploy(subId, await vrfMock.getAddress(), keyHash);
  await vrfMock.addConsumer(subId, await vrfGame.getAddress());

  console.log("Środowisko VRF gotowe. Rozpoczynam pętlę...");

  // Pętla Generująca
  const iterations = 500; 

  for (let i = 1; i <= iterations; i++) {
    if (i % 50 === 0) console.log(`Postęp: ${i}/${iterations}...`);

    // --- A. RANDAO (Tu musimy resetować, bo Alicja może zagrać raz) ---
    const randao = await Randao.deploy(entryFee);
    
    // Alicja losuje w Randao
    const secret = Math.floor(Math.random() * 1000000); 
    const hash = ethers.solidityPackedKeccak256(["uint256"], [secret]);
    
    await randao.connect(alice).commit(hash, { value: entryFee });
    await randao.startRevealPhase();
    await randao.connect(alice).reveal(secret);
    const randaoResult = secret % 100;

    // --- B. VRF (Używamy ciągle tego samego kontraktu) ---
    const txReq = await vrfGame.connect(alice).play();
    const receipt = await txReq.wait();
    
    // Pobieramy requestId z logów
    // @ts-ignore
    const reqLog = receipt!.logs.find((l:any) => vrfGame.interface.parseLog(l)?.name === "RequestSent");
    // @ts-ignore
    const reqId = vrfGame.interface.parseLog(reqLog!)?.args[0];

    // Chainlink odpowiada
    await vrfMock.fulfillRandomWords(reqId, await vrfGame.getAddress());
    
    const vrfBigInt = await vrfGame.randomResult();
    const vrfResult = Number(vrfBigInt % 100n);

    // --- C. ZAPIS ---
    fs.appendFileSync("dane_statystyczne.csv", `${i},${randaoResult},${vrfResult}\n`);
  }

  console.log("=== ZAKOŃCZONO! ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
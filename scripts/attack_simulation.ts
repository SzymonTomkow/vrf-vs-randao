import { ethers } from "hardhat";

async function main() {
  console.log("\n=== SYMULACJA ATAKU 'LAST REVEALER' NA RANDAO ===\n");

  // 1. Aktorzy
  // Deployer to sędzia, Daria to uczciwy gracz, Filip to oszust.
  const [deployer, daria, filip] = await ethers.getSigners();
  
  // 2. Setup Gry
  const entryFee = ethers.parseEther("1.0"); // Stawka 1 ETH
  const Randao = await ethers.getContractFactory("Randao");
  const randao = await Randao.deploy(entryFee);
  await randao.waitForDeployment();

  console.log("Gra: Wygrywa wynik PARZYSTY.");
  console.log("Cel Filipa: Zmanipulować wynik, żeby był parzysty.\n");

  // --- PRZYGOTOWANIE DANYCH ---
  // Daria wybiera liczbę 10 (PARZYSTA)
  const secretDaria = 10; 
  const hashDaria = ethers.solidityPackedKeccak256(["uint256"], [secretDaria]);

  // Filip wybiera liczbę 11 (NIEPARZYSTA)
  const secretFilip = 11; 
  const hashFilip = ethers.solidityPackedKeccak256(["uint256"], [secretFilip]);

  console.log(`Sekret Darii: ${secretDaria}`);
  console.log(`Sekret Filipa: ${secretFilip}`);
  // Uczciwy wynik: 10 XOR 11 = 1. (Wynik NIEPARZYSTY -> Filip przegrywa)
  console.log(`Uczciwy wynik (gdyby oboje zagrali): ${secretDaria ^ secretFilip} (Nieparzysty)\n`);


  // --- FAZA 1: COMMIT (Obaj wpłacają kaucję) ---
  await randao.connect(daria).commit(hashDaria, { value: entryFee });
  await randao.connect(filip).commit(hashFilip, { value: entryFee });
  console.log("FAZA COMMIT: Obaj gracze wpłacili 1 ETH i wysłali hashe.\n");

  // Zmiana fazy
  await randao.startRevealPhase();
  console.log("--- PRZEJŚCIE DO FAZY REVEAL ---\n");


  // --- FAZA 2: REVEAL (Tu następuje atak) ---

  // 1. Daria (uczciwa) ujawnia pierwsza
  await randao.connect(daria).reveal(secretDaria);
  console.log("Krok 1: Daria uczciwie ujawniła liczbę: 10.");
  // 2. ATAK FILIPA (Off-chain decision)
  console.log("\n[ATAK] Krok 2: Filip analizuje sytuację...");

  // Filip widzi liczbę Darii (10). Wie, że ma 11.
  // Liczy w pamięci: 10 ^ 11 = 1.
  const calculatedResult = secretDaria ^ secretFilip;
  console.log(`[ATAK] Filip liczy na boku: 10 XOR 11 = ${calculatedResult}.`);

  // Decyzja: Czy wynik 1 jest parzysty?
  if (calculatedResult % 2 === 0) {
    console.log("[ATAK] Wynik jest parzysty (WYGRANA). Filip ujawnia liczbę.");
    await randao.connect(filip).reveal(secretFilip);
  } else {
    console.log("[ATAK] Wynik jest nieparzysty (PRZEGRANA).");
    console.log("[ATAK] DECYZJA: Filip NIE UJAWNIA swojej liczby i blokuje swój ruch!");
    // W kodzie po prostu nic nie robimy. Filip traci kaucję, ale... zaraz zobaczymy wynik.
  }

  console.log("\n--- KONIEC FAZY REVEAL ---\n");


  // --- FAZA 3: WYNIK KOŃCOWY NA BLOCKCHAINIE ---
  console.log("Sędzia wylicza finalny wynik w kontrakcie...");
  
  // Wywołujemy funkcję liczącą wynik
  const txFn = await randao.getFinalRandom();
  const receipt = await txFn.wait();
  
  // Wyciągamy wynik z logów zdarzenia 'LogResult'
  const event = receipt?.logs.find((log: any) => randao.interface.parseLog(log)?.name === "LogResult");
  // @ts-ignore
  const finalOnChainResult = randao.interface.parseLog(event!)?.args[0];

  console.log(`\n====== WYNIK KOŃCOWY ======`);
  console.log(`Wynik zapisany na blockchainie: ${finalOnChainResult}`);
  
  if (finalOnChainResult % 2n === 0n) {
    console.log("Werdykt: WYNIK PARZYSTY. Filip wygrał (dzięki oszustwu)!");
  } else {
    console.log("Werdykt: Wynik nieparzysty. Filip przegrał.");
  }
  console.log(`===========================\n`);

  // Wniosek do pracy:
  console.log("WNIOSEK DO PRACY INŻYNIERSKIEJ:");
  console.log("Gdyby Filip zagrał uczciwie, wynik byłby 1 (przegrana).");
  console.log("Przez nieujawnienie liczby, kontrakt policzył wynik tylko z liczby Darii (10).");
  console.log("Filip zmienił wynik z 1 na 10 i wygrał grę.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
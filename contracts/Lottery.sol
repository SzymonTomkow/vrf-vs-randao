// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

// --- KONTRAKT 1: LOTERIA OPARTA NA VRF (Poprawiona) ---
contract LotteryVRF is VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface COORDINATOR;
    uint64 s_subscriptionId;
    bytes32 keyHash;
    uint32 callbackGasLimit = 100000;
    
    address[] public players;
    uint256 public entryFee;
    address public lastWinner;

    event WinnerPicked(address winner, uint256 amount);
    event RequestSent(uint256 requestId); // <--- DODANE ZDARZENIE

    constructor(uint64 subscriptionId, address vrfCoordinator, bytes32 _keyHash, uint256 _fee)
        VRFConsumerBaseV2(vrfCoordinator)
    {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
        keyHash = _keyHash;
        entryFee = _fee;
    }

    // 1. Wejście do gry
    function enter() external payable {
        require(msg.value == entryFee, "Zla kwota wpisowego");
        players.push(msg.sender);
    }

    // 2. Rozstrzygnięcie
    function pickWinner() external {
        require(players.length > 0, "Brak graczy");
        // ZAPISUJEMY REQUEST ID I EMITUJEMY EVENT
        uint256 requestId = COORDINATOR.requestRandomWords(keyHash, s_subscriptionId, 3, callbackGasLimit, 1);
        emit RequestSent(requestId);
    }

    // 3. Callback
    function fulfillRandomWords(uint256, uint256[] memory randomWords) internal override {
        uint256 randomIndex = randomWords[0] % players.length;
        address winner = players[randomIndex];
        lastWinner = winner;
        
        payable(winner).transfer(address(this).balance);
        
        delete players;
        emit WinnerPicked(winner, randomWords[0]);
    }
}

// --- KONTRAKT 2: LOTERIA OPARTA NA RANDAO (Interaktywna) ---
contract LotteryRandao {
    uint256 public entryFee;
    address public lastWinner;
    
    struct Player {
        address addr;
        bytes32 commitment;
        uint256 secret;
        bool revealed;
    }

    Player[] public players;
    uint256 public revealedCount;
    uint256 public globalRandom; // Tu sumujemy XOR-em wyniki

    event WinnerPicked(address winner, uint256 randomness);

    constructor(uint256 _fee) {
        entryFee = _fee;
    }

    // 1. Wejście (Commit + Płatność)
    function enter(bytes32 _commitment) external payable {
        require(msg.value == entryFee, "Zla kwota");
        players.push(Player({
            addr: msg.sender,
            commitment: _commitment,
            secret: 0,
            revealed: false
        }));
    }

    // 2. Ujawnienie (Każdy gracz musi to zrobić)
    function reveal(uint256 _secret) external {
        // Szukamy gracza (uproszczona pętla, w produkcji użylibyśmy mapowania dla wydajności)
        for (uint i = 0; i < players.length; i++) {
            if (players[i].addr == msg.sender) {
                require(!players[i].revealed, "Juz ujawniles");
                require(keccak256(abi.encodePacked(_secret)) == players[i].commitment, "Zly sekret");
                
                players[i].revealed = true;
                players[i].secret = _secret;
                
                // Mieszamy losowość: GlobalRandom = GlobalRandom XOR Secret
                globalRandom = globalRandom ^ _secret;
                revealedCount++;
                break;
            }
        }
    }

    // 3. Wyłonienie zwycięzcy (Gdy wszyscy ujawnią)
    function pickWinner() external {
        require(players.length > 0, "Brak graczy");
        require(revealedCount == players.length, "Nie wszyscy ujawnili!");

        uint256 winnerIndex = globalRandom % players.length;
        address winner = players[winnerIndex].addr;
        lastWinner = winner;

        payable(winner).transfer(address(this).balance);
        
        // Reset (dla uproszczenia testu - w produkcji delete array jest drogie)
        delete players;
        revealedCount = 0;
        globalRandom = 0;

        emit WinnerPicked(winner, globalRandom);
    }
}
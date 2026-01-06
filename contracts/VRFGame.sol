// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Importujemy narzędzia od Chainlinka (zainstalowane przez npm)
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

// Autor: Szymon Tomków
// Temat: Implementacja VRF (Verifiable Random Function)

// Dziedziczymy po VRFConsumerBaseV2 - to daje nam funkcje do komunikacji
contract VRFGame is VRFConsumerBaseV2 {
    
    // === 1. KONFIGURACJA CHAINLINK ===
    VRFCoordinatorV2Interface COORDINATOR;
    
    uint64 s_subscriptionId; // ID subskrypcji (konto, z którego pobiera LINK)
    bytes32 keyHash;         // "Siła gazu" (określa jak dużo gazu chcemy zużyć)
    uint32 callbackGasLimit = 100000; // Limit gazu na odpowiedź
    uint16 requestConfirmations = 3;  // Ile bloków czekamy (bezpieczeństwo)
    uint32 numWords = 1;              // Ile liczb losowych chcemy (nam wystarczy 1)

    // === 2. WYNIK ===
    uint256 public randomResult;
    address public lastPlayer; // Kto poprosił o losowanie?

    // Eventy do wykresów
    event RequestSent(uint256 requestId, address roller);
    event RequestFulfilled(uint256 requestId, uint256 randomWord);

    // Konstruktor: Konfigurujemy adresy Chainlinka (inne dla testów, inne dla mainnetu)
    constructor(uint64 subscriptionId, address vrfCoordinator, bytes32 _keyHash)
        VRFConsumerBaseV2(vrfCoordinator)
    {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
        keyHash = _keyHash;
    }

    // === 3. FUNKCJE GRY ===

    // KROK A: Gracz prosi o losowanie
    function play() external returns (uint256 requestId) {
        // Wysyłamy prośbę do Koordynatora Chainlink
        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );

        lastPlayer = msg.sender;
        emit RequestSent(requestId, msg.sender);
        
        return requestId;
    }

    // KROK B: Chainlink odsyła wynik (Callback)
    // Tej funkcji nie może wywołać człowiek! Wywołuje ją tylko VRFCoordinator.
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        // Zapisujemy wynik (modulo 100, żeby mieć wynik 0-99, np. do rzutu kością)
        randomResult = randomWords[0];
        
        emit RequestFulfilled(requestId, randomResult);
    }
}
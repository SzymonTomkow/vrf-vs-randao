// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Randao {
    // === 1. KONFIGURACJA ===
    uint256 public entryFee;

    struct Participant {
        bytes32 commitment; 
        uint256 secret;     
        bool revealed;      
        bool exists;        
    }

    mapping(address => Participant) public participants;
    address[] public participantList;

    // === 2. STANY GRY ===
    enum GameState { COMMIT, REVEAL, FINISHED }
    GameState public currentState;

    // === 3. EVENTY ===
    event LogCommit(address indexed player, uint256 timestamp);
    event LogReveal(address indexed player, uint256 secret);
    event LogPhaseChange(GameState newState);
    event LogResult(uint256 finalRandomNumber);

    constructor(uint256 _fee) {
        entryFee = _fee;
        currentState = GameState.COMMIT;
    }

    // === 4. FUNKCJE ===

    // Faza 1: Zapisy
    function commit(bytes32 _commitment) external payable {
        require(currentState == GameState.COMMIT, "To nie jest faza Commit");
        require(msg.value == entryFee, "Zla wysokosc kaucji");
        require(!participants[msg.sender].exists, "Juz bierzesz udzial");

        participants[msg.sender] = Participant({
            commitment: _commitment,
            secret: 0,
            revealed: false,
            exists: true
        });

        participantList.push(msg.sender);
        emit LogCommit(msg.sender, block.timestamp);
    }

    // Funkcja pomocnicza: Przelacz gre w tryb ujawniania
    // (W prawdziwej wersji byloby to oparte o czas block.timestamp)
    function startRevealPhase() external {
        require(currentState == GameState.COMMIT, "Gra nie jest w fazie Commit");
        currentState = GameState.REVEAL;
        emit LogPhaseChange(GameState.REVEAL);
    }

    // Faza 2: Ujawnianie
    function reveal(uint256 _secret) external {
        require(currentState == GameState.REVEAL, "To nie jest faza Reveal");
        
        Participant storage p = participants[msg.sender];
        require(p.exists, "Nie grasz w tej rundzie");
        require(!p.revealed, "Juz ujawniles liczbe");

        // WERYFIKACJA KRYPTOGRAFICZNA
        // Sprawdzamy czy hash z ujawnionej liczby pasuje do tego zadeklarowanego wczesniej
        require(keccak256(abi.encodePacked(_secret)) == p.commitment, "Oszustwo: Liczba nie pasuje do hasha");

        p.secret = _secret;
        p.revealed = true;

        // Opcjonalnie: Tu mozna zwrocic kaucje (msg.sender.transfer(entryFee))
        // Ale w modelu RANDAO czesto kaucja wraca dopiero po zakonczeniu calej rundy.
        
        emit LogReveal(msg.sender, _secret);
    }

    // Faza 3: Wyliczenie wyniku (XOR)
    function getFinalRandom() external {
        require(currentState == GameState.REVEAL, "Za wczesnie na wynik");
        
        uint256 finalRandom = 0;
        
        // Iterujemy po wszystkich graczach
        for (uint256 i = 0; i < participantList.length; i++) {
            address playerAddr = participantList[i];
            Participant memory p = participants[playerAddr];

            // Jesli gracz ujawnil liczbe, dodajemy ja do puli (XOR)
            if (p.revealed) {
                finalRandom = finalRandom ^ p.secret;
            }
            // UWAGA DO PRACY: Tutaj widac podatnosc na atak. 
            // Jesli ktos nie ujawnil (p.revealed == false), jego liczba jest pomijana.
            // Ostatni gracz moze to wykorzystac!
        }

        currentState = GameState.FINISHED;
        emit LogResult(finalRandom);
    }
}
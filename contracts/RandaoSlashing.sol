// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RandaoSlashing {
    uint256 public entryFee;
    uint256 public revealDuration = 10 minutes; // Czas na ujawnienie

    struct Participant {
        bytes32 commitment;
        uint256 secret;
        bool revealed;
        bool exists;
        uint256 revealDeadline; // DO KIEDY musi ujawnić
    }

    mapping(address => Participant) public participants;
    address[] public participantList;

    event LogCommit(address indexed player, uint256 deadline);
    event LogReveal(address indexed player, uint256 secret);
    event LogSlashed(address indexed victim, address indexed reporter);

    constructor(uint256 _fee) {
        entryFee = _fee;
    }

    // 1. COMMIT (Zapisujemy czas!)
    function commit(bytes32 _commitment) external payable {
        require(msg.value == entryFee, "Zla kaucja");
        require(!participants[msg.sender].exists, "Juz grasz");

        participants[msg.sender] = Participant({
            commitment: _commitment,
            secret: 0,
            revealed: false,
            exists: true,
            // Ustawiamy deadline: Teraz + 10 minut
            revealDeadline: block.timestamp + revealDuration 
        });

        participantList.push(msg.sender);
        emit LogCommit(msg.sender, block.timestamp + revealDuration);
    }

    // 2. REVEAL (Standardowy)
    function reveal(uint256 _secret) external {
        Participant storage p = participants[msg.sender];
        require(p.exists, "Nie grasz");
        require(!p.revealed, "Juz ujawniles");
        
        // Sprawdzamy hash
        require(keccak256(abi.encodePacked(_secret)) == p.commitment, "Zly sekret");

        p.secret = _secret;
        p.revealed = true;
        
        // Oddajemy kaucję uczciwemu graczowi
        payable(msg.sender).transfer(entryFee);
        
        emit LogReveal(msg.sender, _secret);
    }

    // 3. SLASH (Nowość - Kara dla oszusta)
    // Każdy może wywołać tę funkcję, podając adres oszusta
    function slashParticipant(address _victim) external {
        Participant storage p = participants[_victim];

        require(p.exists, "Taki gracz nie istnieje");
        require(!p.revealed, "Gracz juz ujawnil liczbe (jest uczciwy)");
        
        // Czy minął czas?
        require(block.timestamp > p.revealDeadline, "Jeszcze ma czas na ujawnienie");

        // KARA:
        // 1. Usuwamy gracza z gry (lub oznaczamy jako revealed=true z losową wartością, tu upraszczamy)
        p.revealed = true; // Traktujemy jakby zakończył, ale bez zwrotu kaucji
        
        // 2. Nagroda dla zgłaszającego (msg.sender dostaje kaucję ofiary)
        payable(msg.sender).transfer(entryFee);

        emit LogSlashed(_victim, msg.sender);
    }
}
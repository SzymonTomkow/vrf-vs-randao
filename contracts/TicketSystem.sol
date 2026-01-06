// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Importujemy gotowy, sprawdzony kod do zarządzania uprawnieniami (Ownable)
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketSystem is Ownable {
    
    // Cena biletu wyrażona w Wei (najmniejsza jednostka ETH)
    uint256 public ticketPrice;
    
    // Prosta mapa przechowująca liczbę biletów dla danego adresu
    mapping(address => uint256) public tickets;

    // Wydarzenie emitowane po zakupie (ważne dla front-endu!)
    event TicketPurchased(address indexed buyer, uint256 amount);
    // Wydarzenie po zmianie ceny
    event PriceChanged(uint256 newPrice);

    // Konstruktor: ustawia początkową cenę i właściciela kontraktu
    // Ownable(msg.sender) ustawia osobę wdrażającą jako "owner"
    constructor(uint256 _initialPrice) Ownable(msg.sender) {
        ticketPrice = _initialPrice;
    }

    // Funkcja zakupu biletu
    function buyTicket() public payable {
        // 1. Sprawdzenie czy użytkownik wysłał wystarczająco ETH
        require(msg.value >= ticketPrice, "Za malo ETH na bilet");

        // 2. Logika biznesowa (dodanie biletu)
        tickets[msg.sender] += 1;

        // 3. Emitowanie zdarzenia (logu)
        emit TicketPurchased(msg.sender, msg.value);
        
        // Opcjonalnie: Zwracanie nadmiaru ETH (reszty), jeśli ktoś wysłał za dużo
        if (msg.value > ticketPrice) {
            payable(msg.sender).transfer(msg.value - ticketPrice);
        }
    }

    // Funkcja zmiany ceny - DOSTĘPNA TYLKO DLA WŁAŚCICIELA
    // Słowo kluczowe 'onlyOwner' to modyfikator z biblioteki OpenZeppelin
    function setTicketPrice(uint256 _newPrice) public onlyOwner {
        ticketPrice = _newPrice;
        emit PriceChanged(_newPrice);
    }

    // Funkcja do wypłaty zarobionych środków (bardzo ważne!)
    // Bez tego ETH utknęłoby w kontrakcie na zawsze
    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
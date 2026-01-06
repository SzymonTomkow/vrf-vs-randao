import matplotlib.pyplot as plt
import numpy as np

def save_fairness_chart():
    # --- 1. WPISZ TUTAJ WYNIKI Z KONSOLI ---
    # Przykład: [15, 18, 17] - podmień na swoje liczby z testu Hardhat!
    wins = [12, 17, 21]  # Liczba wygranych dla każdego gracza 
    
    players = ['Gracz A', 'Gracz B', 'Gracz C']
    total_games = sum(wins)
    ideal_value = total_games / 3  # Idealny podział (np. 16.66)

    # --- 2. RYSOWANIE ---
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Rysujemy słupki
    bars = ax.bar(players, wins, color=['#3498db', '#e74c3c', '#2ecc71'], alpha=0.8, edgecolor='black', width=0.6)
    
    # Dodajemy linię idealną (średnią)
    ax.axhline(y=ideal_value, color='red', linestyle='--', linewidth=2, label=f'Idealny rozkład (~{ideal_value:.1f})')

    # Podpisy nad słupkami
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + 0.5,
                f'{int(height)}',
                ha='center', va='bottom', fontsize=12, fontweight='bold')

    # Stylizacja
    ax.set_ylabel('Liczba wygranych', fontsize=12)
    ax.set_title(f'Analiza sprawiedliwości algorytmu RANDAO\n(Symulacja N={total_games} gier)', fontsize=14, weight='bold', pad=20)
    ax.legend()
    ax.set_ylim(0, max(wins) + 5) # Trochę miejsca nad słupkami
    ax.grid(axis='y', linestyle='--', alpha=0.3)

    plt.savefig('wykres_fairness.png', bbox_inches='tight', dpi=300)
    print("Wygenerowano: wykres_fairness.png")
    plt.close()

if __name__ == "__main__":
    save_fairness_chart()
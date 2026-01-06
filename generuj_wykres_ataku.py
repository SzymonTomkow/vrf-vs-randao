import matplotlib.pyplot as plt
import numpy as np

def save_attack_chart():
    # Zakres wartości puli/stawki (np. od 0 do 10 ETH)
    x = np.linspace(0, 10, 100)
    
    # Linia graniczna: Kaucja = Wartość ataku (y = x)
    # To jest nasz "Próg opłacalności"
    y = x 

    fig, ax = plt.subplots(figsize=(10, 6))

    # Rysujemy linię graniczną
    ax.plot(x, y, color='black', linestyle='--', linewidth=2, label='Próg opłacalności (Gain = Penalty)')

    # ZIELONA STREFA (Bezpieczna)
    # Tam, gdzie Kaucja (Y) > Zysk z ataku (X)
    # Wypełniamy obszar powyżej linii
    ax.fill_between(x, y, 10, color='#2ecc71', alpha=0.3, label='Strefa Bezpieczna (Nieopłacalny atak)')

    # CZERWONA STREFA (Niebezpieczna)
    # Tam, gdzie Kaucja (Y) < Zysk z ataku (X)
    ax.fill_between(x, 0, y, color='#e74c3c', alpha=0.3, label='Strefa Podatna na Atak (Opłacalne oszustwo)')

    # --- PUNKT PRACY TWOJEGO SYSTEMU ---
    # Załóżmy dla przykładu, że w Twoim kontrakcie:
    # Stawka gracza (Entry) = 0.1 ETH (To co chce "uratować" oszukując)
    # Kaucja (Deposit) = 0.2 ETH (Tak się często ustawia, np. 2x stawka)
    
    current_stake = 2.0  # Przykładowa stawka gracza na wykresie
    current_deposit = 4.0 # Przykładowa kaucja (bezpieczna, bo wyższa)

    ax.scatter([current_stake], [current_deposit], color='blue', s=150, zorder=5, edgecolors='black', label='Konfiguracja Systemu (Przykładowa)')
    
    # Strzałka i opis punktu
    ax.annotate('Twój System\n(Kaucja > Stawka)', 
                xy=(current_stake, current_deposit), 
                xytext=(current_stake + 1, current_deposit - 0.5),
                arrowprops=dict(facecolor='black', shrink=0.05))

    # Opisy osi
    ax.set_xlabel('Potencjalna korzyść z ataku (np. Stawka gracza) [ETH]', fontsize=12)
    ax.set_ylabel('Wymagana Kaucja (Deposit) [ETH]', fontsize=12)
    ax.set_title('Analiza progu opłacalności ataku (Security Threshold)', fontsize=14, weight='bold', pad=20)
    
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.grid(True, linestyle='--', alpha=0.5)
    ax.legend(loc='upper left')

    plt.savefig('wykres_progu_ataku.png', bbox_inches='tight', dpi=300)
    print("Wygenerowano: wykres_progu_ataku.png")
    plt.close()

if __name__ == "__main__":
    save_attack_chart()
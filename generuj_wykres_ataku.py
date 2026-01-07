import matplotlib.pyplot as plt
import numpy as np

def save_attack_chart():
    # Ustawienia wykresu
    plt.style.use('seaborn-v0_8-whitegrid')
    
    # Zakres wartości puli (od 0 do 10 ETH)
    x = np.linspace(0, 10, 100)
    
    # Linia graniczna: Wymagana Kaucja = Potencjalny Zysk
    # To jest próg, powyżej którego atak jest nieopłacalny ekonomicznie
    y = x 

    fig, ax = plt.subplots(figsize=(10, 7))

    # 1. Rysujemy linię graniczną (Próg opłacalności)
    ax.plot(x, y, color='#34495e', linestyle='--', linewidth=2.5, label='Próg opłacalności (Kaucja = Wygrana)')

    # 2. ZIELONA STREFA (Bezpieczna)
    # Kaucja > Wygrana -> Atakujący traci więcej niż może zyskać
    ax.fill_between(x, y, 12, color='#27ae60', alpha=0.2, label='Strefa Bezpieczeństwa (Nieopłacalny atak)')
    # Dodatkowy tekst w strefie
    ax.text(2, 8, "BEZPIECZEŃSTWO\n(Kaucja > Wygrana)", color='#1e8449', fontsize=12, fontweight='bold', ha='center')

    # 3. CZERWONA STREFA (Niebezpieczna)
    # Kaucja < Wygrana -> Opłaca się poświęcić kaucję, by zgarnąć pulę
    ax.fill_between(x, -2, y, color='#c0392b', alpha=0.2, label='Strefa Podatności (Opłacalne oszustwo)')
    # Dodatkowy tekst w strefie
    ax.text(8, 2, "RYZYKO ATAKU\n(Wygrana > Kaucja)", color='#922b21', fontsize=12, fontweight='bold', ha='center')

    # --- PUNKT PRACY TWOJEGO SYSTEMU (Przykładowy) ---
    # Załóżmy: Pula do wygrania = 1.0 ETH, Kaucja w systemie = 2.0 ETH
    current_pot = 2.0  
    current_deposit = 4.0 

    ax.scatter([current_pot], [current_deposit], color='#2980b9', s=200, zorder=5, edgecolors='white', linewidth=2, label='Twój System (Przykładowa Konfiguracja)')
    
    # Strzałka wskazująca punkt
    ax.annotate('Twój System\n(Bezpieczny zapas)', 
                xy=(current_pot, current_deposit), 
                xytext=(current_pot + 1.5, current_deposit - 0.5),
                fontsize=11,
                arrowprops=dict(facecolor='black', shrink=0.05, width=1.5))

    # Opisy i formatowanie
    ax.set_xlabel('Maksymalna możliwa wygrana (Pula Nagród) [ETH]', fontsize=12, labelpad=10)
    ax.set_ylabel('Wymagana Kaucja (Deposit) [ETH]', fontsize=12, labelpad=10)
    ax.set_title('Ekonomiczna analiza bezpieczeństwa protokołu RANDAO', fontsize=14, weight='bold', pad=20)
    
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.legend(loc='upper left', frameon=True, framealpha=0.9, shadow=True)
    
    # Zapis
    filename = 'wykres_progu_ataku.png'
    plt.savefig(filename, bbox_inches='tight', dpi=300)
    print(f"Sukces! Wygenerowano poprawiony wykres: {filename}")
    plt.close()

if __name__ == "__main__":
    save_attack_chart()
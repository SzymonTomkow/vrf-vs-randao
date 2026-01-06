import pandas as pd
import matplotlib.pyplot as plt

def save_economic_table_fix():
    # --- 1. DANE RYNKOWE (06.01.2026) ---
    eth_price = 3280.45
    link_price = 13.90
    usd_pln = 3.60
    gas_price_gwei = 0.90
    chainlink_fee = 0.25

    def calculate_gas_cost_usd(gas_amount):
        eth_cost = gas_amount * gas_price_gwei * 0.000000001
        return eth_cost * eth_price

    # --- 2. DANE Z BADAŃ ---
    randao_gas = 175156
    vrf_gas = 176285

    # --- 3. OBLICZENIA ---
    cost_randao_usd = calculate_gas_cost_usd(randao_gas)
    cost_randao_pln = cost_randao_usd * usd_pln

    cost_vrf_gas_usd = calculate_gas_cost_usd(vrf_gas)
    cost_vrf_fee_usd = chainlink_fee * link_price
    total_vrf_usd = cost_vrf_gas_usd + cost_vrf_fee_usd
    total_vrf_pln = total_vrf_usd * usd_pln

    # --- 4. PRZYGOTOWANIE TABELI ---
    data = {
        'Składnik Kosztu': [
            '1. Koszt Gazu (ETH)', 
            '2. Opłata Premium (LINK)', 
            'SUMA (USD)',
            'SUMA (PLN)'
        ],
        'RANDAO (Algorytm Autorski)': [
            f"${cost_randao_usd:.2f}",
            "$0.00",
            f"${cost_randao_usd:.2f}",
            f"{cost_randao_pln:.2f} PLN"
        ],
        'Chainlink VRF (Rozwiązanie Komercyjne)': [
            f"${cost_vrf_gas_usd:.2f}",
            f"${cost_vrf_fee_usd:.2f} (0.25 LINK)",
            f"${total_vrf_usd:.2f}",
            f"{total_vrf_pln:.2f} PLN"
        ]
    }
    df = pd.DataFrame(data)

    # --- 5. RYSOWANIE Z POPRAWKAMI (FIX) ---
    
    # Zwiększamy szerokość obrazka na 16 cali (było 10)
    fig, ax = plt.subplots(figsize=(16, 6)) 
    ax.axis('tight')
    ax.axis('off')
    
    # Definiujemy szerokości kolumn:
    # 1. Opis (20%)
    # 2. RANDAO (40%)
    # 3. VRF (40%) - muszą być szerokie przez długie nagłówki
    widths = [0.20, 0.40, 0.40]

    table = ax.table(
        cellText=df.values, 
        colLabels=df.columns, 
        cellLoc='center', 
        loc='center',
        colWidths=widths # <--- Aplikujemy szerokości
    )
    
    # Stylizacja
    table.auto_set_font_size(False)
    table.set_fontsize(11)
    table.scale(1.0, 2.5) # Wysokość wierszy
    
    # Kolorowanie
    for (row, col), cell in table.get_celld().items():
        if row == 0:
            cell.set_text_props(weight='bold')
            cell.set_facecolor('#d9edf7')
        elif row == 3: # Suma USD
            cell.set_text_props(weight='bold')
            cell.set_facecolor('#ffffcc') 
        elif row == 4: # Suma PLN
            cell.set_text_props(weight='bold')
            cell.set_facecolor('#ccffcc')

    # ZMIANA: Dodajemy backslash przed $ (\$) żeby matplotlib nie myślał że to matematyka
    plt.title(f'Symulacja kosztów rzeczywistych (Data: 06.01.2026)\nETH = {eth_price:,.0f} USD, LINK = {link_price} USD, Gas = {gas_price_gwei} gwei', 
              fontsize=14, weight='bold', pad=20)
    
    filename = 'tabela_koszty_2026_fix.png'
    plt.savefig(filename, bbox_inches='tight', dpi=300)
    print(f"Naprawiono! Zobacz plik: {filename}")
    plt.close()

if __name__ == "__main__":
    save_economic_table_fix()
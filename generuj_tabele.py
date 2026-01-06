import pandas as pd
import matplotlib.pyplot as plt

# --- FUNKCJA RYSUJĄCA (Z obsługą szerokości kolumn) ---
def save_table_as_image(df, title, filename, col_widths=None):
    # Szeroki obrazek (18 cali), żeby zmieściły się nowe kolumny
    fig, ax = plt.subplots(figsize=(18, 5)) 
    ax.axis('tight')
    ax.axis('off')
    
    # Tworzenie tabeli
    table = ax.table(
        cellText=df.values, 
        colLabels=df.columns, 
        cellLoc='center', 
        loc='center',
        colWidths=col_widths # Ustawiamy szerokości
    )
    
    # Stylizacja
    table.auto_set_font_size(False)
    table.set_fontsize(11)
    table.scale(1.0, 2.5) # Wysokość wierszy
    
    # Kolorowanie nagłówków i wierszy
    for (row, col), cell in table.get_celld().items():
        if row == 0:
            cell.set_text_props(weight='bold')
            cell.set_facecolor('#d9edf7') # Niebieski nagłówek
        else:
            # Paski (Zebra) dla czytelności
            if row % 2 == 0:
                cell.set_facecolor('#f9f9f9')
            else:
                cell.set_facecolor('#ffffff')

    plt.title(title, fontsize=14, weight='bold', pad=20)
    plt.savefig(filename, bbox_inches='tight', dpi=300)
    print(f"Wygenerowano: {filename}")
    plt.close()

# ==========================================
# CZĘŚĆ 1: TABELA KOSZTÓW GŁÓWNYCH (z CSV)
# ==========================================
try:
    df_raw = pd.read_csv('wyniki_badan.csv')
    
    # Obliczenia statystyk (bez zmian)
    r_min = df_raw['randao_total_gas'].min()
    r_max = df_raw['randao_total_gas'].max()
    r_avg = df_raw['randao_total_gas'].mean()
    
    v_min = df_raw['vrf_request_gas'].min()
    v_max = df_raw['vrf_request_gas'].max()
    v_avg = df_raw['vrf_request_gas'].mean()
    
    vt_min = df_raw['vrf_request_gas'].min() + df_raw['vrf_callback_gas'].min()
    vt_max = df_raw['vrf_request_gas'].max() + df_raw['vrf_callback_gas'].max()
    vt_avg = df_raw['vrf_request_gas'].mean() + df_raw['vrf_callback_gas'].mean()

    data_koszty = {
        'Metoda / Funkcja': [
            'RANDAO (Commit + Reveal)', 
            'Chainlink VRF (Koszt Gracza)', 
            'Chainlink VRF (Koszt Całkowity)'
        ],
        'Min Gas': [f"{r_min:,.0f}", f"{v_min:,.0f}", f"{vt_min:,.0f}"],
        'Max Gas': [f"{r_max:,.0f}", f"{v_max:,.0f}", f"{vt_max:,.0f}"],
        'Średnia (Avg)': [f"{r_avg:,.0f}", f"{v_avg:,.0f}", f"{vt_avg:,.0f}"]
    }
    
    df_koszty = pd.DataFrame(data_koszty)
    # Tabela 1 jest prosta, nie potrzebuje col_widths
    save_table_as_image(df_koszty, 'Zestawienie kosztów gazu (Wyniki zbiorcze)', 'tabela_koszty.png')

except FileNotFoundError:
    print("Ostrzeżenie: Brak pliku wyniki_badan.csv - pomijam pierwszą tabelę.")


# ==========================================
# CZĘŚĆ 2: TABELA SLASHING (Zaktualizowana do 0.9 gwei)
# ==========================================

# 1. Dane wejściowe (Takie same jak w analizie ekonomicznej)
gas_price_gwei = 0.90   # Milk Road
eth_price = 3292.41     # Cena ETH
usd_pln = 3.60          # Kurs dolara

# 2. Zużycie gazu (z Twoich testów)
gas_commit = 142171
gas_slash = 40109

# 3. Obliczenia automatyczne (zamiast wpisywania ręcznie)
eth_commit = gas_commit * gas_price_gwei * 0.000000001
pln_commit = eth_commit * eth_price * usd_pln

eth_slash = gas_slash * gas_price_gwei * 0.000000001
pln_slash = eth_slash * eth_price * usd_pln

# 4. Tworzenie danych
data_slashing = {
    'Funkcja kontraktu': [
        'commit (z TimeLock)', 
        'slashParticipant (Egzekucja kary)'
    ],
    'Koszt Gazu (Avg)': [
        '142,171', 
        '40,109'
    ],
    'Koszt w ETH (0.9 gwei)': [
        f"{eth_commit:.6f} ETH",  # 6 miejsc po przecinku, bo małe liczby
        f"{eth_slash:.6f} ETH"
    ],
    'Koszt w PLN': [
        f"~{pln_commit:.2f} PLN",
        f"~{pln_slash:.2f} PLN"    # Tu wyjdzie około 40 groszy
    ],
    'Opis działania': [
        'Zablokowanie kaucji + znacznik czasu', 
        'Przejęcie kaucji oszusta'
    ]
}

df_slashing = pd.DataFrame(data_slashing)

# 5. Definiujemy szerokości kolumn (dla 5 kolumn)
# [Funkcja, Gas, ETH, PLN, Opis]
widths = [0.20, 0.15, 0.15, 0.15, 0.35]

save_table_as_image(
    df_slashing, 
    'Analiza kosztów mechanizmu Slashing (Zaktualizowana do 0.9 gwei)', 
    'tabela_slashing.png',
    col_widths=widths
)
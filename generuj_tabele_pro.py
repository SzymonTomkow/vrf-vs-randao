import pandas as pd
import matplotlib.pyplot as plt

def save_table_as_image(df, title, filename):
    # POPRAWKA 1: Wyższy obrazek (figsize height zmieniłem z 3 na 6)
    fig, ax = plt.subplots(figsize=(12, 6)) 
    ax.axis('tight')
    ax.axis('off')
    
    # Tworzenie tabeli
    table = ax.table(cellText=df.values, colLabels=df.columns, cellLoc='center', loc='center')
    
    # Stylizacja
    table.auto_set_font_size(False)
    table.set_fontsize(11)
    # Skalowanie komórek (szerokość, wysokość)
    table.scale(1.2, 2.0) 
    
    # Kolorowanie nagłówka
    for (row, col), cell in table.get_celld().items():
        if row == 0:
            cell.set_text_props(weight='bold')
            cell.set_facecolor('#d9edf7') # Jasnoniebieski

    # POPRAWKA 2: Duży odstęp tytułu od tabeli (pad=40)
    plt.title(title, fontsize=14, weight='bold', pad=40)
    
    plt.savefig(filename, bbox_inches='tight', dpi=300)
    print(f"Wygenerowano: {filename}")
    plt.close()

# --- 1. WCZYTANIE DANYCH ---
try:
    df = pd.read_csv('wyniki_badan.csv')
    print(f"Wczytano {len(df)} wierszy danych.")

    # --- 2. STATYSTYKA SZCZEGÓŁOWA ---
    def get_stats(series):
        return {
            'Min': f"{series.min():,.0f}",
            'Max': f"{series.max():,.0f}",
            'Średnia': f"{series.mean():,.0f}",
            'Mediana': f"{series.median():,.0f}",
            'Odch. Std': f"{series.std():,.2f}"
        }

    stats_randao = get_stats(df['randao_total_gas'])
    stats_vrf_user = get_stats(df['vrf_request_gas'])
    
    series_vrf_total = df['vrf_request_gas'] + df['vrf_callback_gas']
    stats_vrf_total = get_stats(series_vrf_total)

    data = {
        'Metoda': ['RANDAO', 'VRF (User)', 'VRF (System)'],
        'Min': [stats_randao['Min'], stats_vrf_user['Min'], stats_vrf_total['Min']],
        'Max': [stats_randao['Max'], stats_vrf_user['Max'], stats_vrf_total['Max']],
        'Średnia': [stats_randao['Średnia'], stats_vrf_user['Średnia'], stats_vrf_total['Średnia']],
        'Mediana': [stats_randao['Mediana'], stats_vrf_user['Mediana'], stats_vrf_total['Mediana']],
        'Odchylenie Std.': [stats_randao['Odch. Std'], stats_vrf_user['Odch. Std'], stats_vrf_total['Odch. Std']]
    }

    df_summary = pd.DataFrame(data)
    save_table_as_image(df_summary, 'Szczegółowa statystyka kosztów gazu', 'tabela_statystyka_pro.png')


    # --- 3. TABELA ZAŁĄCZNIK (Inteligentna próbka) ---
    # Jeśli danych jest dużo (>15), robimy ucięcie z kropkami
    if len(df) > 15:
        head = df.head(5)
        tail = df.tail(5)
        dots = pd.DataFrame([['...', '...', '...', '...']], columns=df.columns)
        df_sample = pd.concat([head, dots, tail])
    else:
        # Jeśli danych jest mało (np. 20), pokazujemy całość lub po prostu pierwsze 10
        df_sample = df.head(20) 
    
    save_table_as_image(df_sample, 'Fragment danych pomiarowych (Załącznik)', 'tabela_zalacznik.png')

except FileNotFoundError:
    print("Brak pliku wyniki_badan.csv")
import pandas as pd
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt

# Symulacja danych (jeśli nie masz jeszcze dużego pliku z wynikami losowań)
# W pracy użyj prawdziwych danych z blockchaina/symulacji!
np.random.seed(42)
# Generujemy 1000 losowych liczb (0-255, jak bajt)
data_randao = np.random.randint(0, 256, 1000) 
data_vrf = np.random.randint(0, 256, 1000)

print("=== ANALIZA STATYSTYCZNA (Entropia i Chi-Square) ===\n")

def analyze_randomness(name, data):
    print(f"--- Algorytm: {name} ---")
    
    # 1. Entropia Shannona
    # Idealna entropia dla zakresu 0-255 (8 bitów) to 8.0
    counts = pd.Series(data).value_counts()
    entropy = stats.entropy(counts, base=2)
    print(f"Entropia Shannona: {entropy:.4f} (Idealna: ~8.0 dla pełnego bajtu)")

    # 2. Test Chi-Kwadrat (Test równomierności)
    # H0: Rozkład jest równomierny. p-value < 0.05 odrzuca hipotezę (czyli liczby NIE są losowe)
    # Oczekujemy p-value > 0.05
    chisq, p_value = stats.chisquare(counts)
    print(f"Test Chi-Square: statistic={chisq:.2f}, p-value={p_value:.4f}")
    
    if p_value > 0.05:
        print("WNIOSEK: Nie ma podstaw do odrzucenia hipotezy o równomierności (Dobra losowość).")
    else:
        print("WNIOSEK: Rozkład NIE jest równomierny (Podejrzana losowość).")
    print("")

analyze_randomness("RANDAO", data_randao)
analyze_randomness("Chainlink VRF", data_vrf)
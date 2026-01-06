import pandas as pd
import matplotlib.pyplot as plt
import scipy.stats as stats
import numpy as np

# Funkcja do obliczania Entropii Shannona
def calculate_entropy(series):
    p_data = series.value_counts() / len(series) # Prawdopodobieństwo wystąpienia każdej liczby
    entropy = -sum(p_data * np.log2(p_data))
    return entropy

# 1. Wczytanie danych
try:
    df = pd.read_csv('dane_statystyczne.csv')
    print("Wczytano dane.")
except FileNotFoundError:
    print("Brak pliku dane_statystyczne.csv")
    exit()

# 2. Obliczenia
entropy_randao = calculate_entropy(df['randao_val'])
entropy_vrf = calculate_entropy(df['vrf_val'])

# Maksymalna możliwa entropia dla 100 wartości (0-99) to log2(100) ≈ 6.64
max_entropy = np.log2(100)

print(f"\n=== WYNIKI BADANIA JAKOŚCI LOSOWOŚCI ===")
print(f"Liczba próbek: {len(df)}")
print(f"Max możliwa entropia: {max_entropy:.4f}")
print(f"Entropia RANDAO: {entropy_randao:.4f} (Jakość: {entropy_randao/max_entropy:.2%})")
print(f"Entropia VRF:    {entropy_vrf:.4f} (Jakość: {entropy_vrf/max_entropy:.2%})")

# 3. WIZUALIZACJA (Histogramy)
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

# Wykres RANDAO
ax1.hist(df['randao_val'], bins=20, range=(0,100), color='#ff9999', edgecolor='black', alpha=0.7)
ax1.set_title(f'Rozkład wyników RANDAO\nEntropia: {entropy_randao:.3f}')
ax1.set_xlabel('Wylosowana liczba (0-99)')
ax1.set_ylabel('Liczba wystąpień')
ax1.axhline(y=len(df)/20, color='r', linestyle='--', label='Rozkład idealny') # Linia idealna
ax1.legend()

# Wykres VRF
ax2.hist(df['vrf_val'], bins=20, range=(0,100), color='#66b3ff', edgecolor='black', alpha=0.7)
ax2.set_title(f'Rozkład wyników Chainlink VRF\nEntropia: {entropy_vrf:.3f}')
ax2.set_xlabel('Wylosowana liczba (0-99)')
ax2.axhline(y=len(df)/20, color='r', linestyle='--', label='Rozkład idealny')
ax2.legend()

plt.tight_layout()
plt.savefig('wykres_rozklad_entropia.png')
print("\nZapisano wykres: wykes_rozklad_entropia.png")
plt.show()
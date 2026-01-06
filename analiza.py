import pandas as pd
import matplotlib.pyplot as plt

# 1. Wczytanie danych
try:
    df = pd.read_csv('wyniki_badan.csv')
    print("Sukces! Wczytano dane.")
except FileNotFoundError:
    print("BŁĄD: Nie znaleziono pliku 'wyniki_badan.csv'. Upewnij się, że jest w tym samym folderze.")
    exit()

# 2. Obliczenia (Statystyka opisowa do pracy)
avg_randao = df['randao_total_gas'].mean()
avg_vrf_user = df['vrf_request_gas'].mean()
# VRF Całkowity = Request (płaci user) + Callback (płaci Chainlink, ale wlicza w cenę)
avg_vrf_total = df['vrf_request_gas'].mean() + df['vrf_callback_gas'].mean()

print("\n=== WYNIKI ANALIZY (Do skopiowania do pracy) ===")
print(f"Średni koszt RANDAO (User): {avg_randao:.2f} Gas")
print(f"Średni koszt VRF (Tylko User): {avg_vrf_user:.2f} Gas")
print(f"Średni koszt VRF (Systemowy): {avg_vrf_total:.2f} Gas")

# 3. WYKRES 1: Porównanie średnich kosztów (Słupkowy)
plt.figure(figsize=(10, 6))
methods = ['RANDAO\n(Commit+Reveal)', 'VRF\n(Koszt Gracza)', 'VRF\n(Koszt Całkowity)']
costs = [avg_randao, avg_vrf_user, avg_vrf_total]
colors = ['#ff9999', '#66b3ff', '#99ff99']

bars = plt.bar(methods, costs, color=colors, edgecolor='black')

# Dodanie liczb nad słupkami
for bar in bars:
    yval = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2, yval + 2000, f'{int(yval)}', ha='center', va='bottom', fontweight='bold')

plt.title('Porównanie średniego zużycia Gazu: RANDAO vs VRF', fontsize=14)
plt.ylabel('Zużycie Gazu (Gas Units)', fontsize=12)
plt.grid(axis='y', linestyle='--', alpha=0.7)

# Zapisanie wykresu do pliku
plt.savefig('wykres_sredni_koszt.png')
print("\nZapisano wykres: wykres_sredni_koszt.png")
plt.show() # Wyświetl okno z wykresem

# 4. WYKRES 2: Stabilność w czasie (Liniowy)
plt.figure(figsize=(10, 6))

plt.plot(df['iteracja'], df['randao_total_gas'], label='RANDAO (Suma)', marker='o', linestyle='-')
plt.plot(df['iteracja'], df['vrf_request_gas'], label='VRF (Request)', marker='s', linestyle='--')

plt.title('Stabilność kosztów transakcyjnych w kolejnych próbach', fontsize=14)
plt.xlabel('Numer Próby (Iteracja)', fontsize=12)
plt.ylabel('Zużycie Gazu', fontsize=12)
plt.legend()
plt.grid(True, linestyle=':', alpha=0.6)

# Ustawienie osi X na liczby całkowite
plt.xticks(df['iteracja'])

plt.savefig('wykres_stabilnosc.png')
print("Zapisano wykres: wykres_stabilnosc.png")
plt.show()
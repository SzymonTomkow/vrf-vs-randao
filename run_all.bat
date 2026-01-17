@echo off
echo ============================================
echo VRF vs RANDAO - Quick Run
echo (pomijam kompilacje - juz skompilowane)
echo ============================================
echo.

echo [1/3] Generowanie danych - Koszty (20 iteracji)...
npx hardhat run scripts/simulation.ts
echo.

echo [2/3] Dane statystyczne (500 probek - moze potrzebowac 5-10 min)...
echo Mozesz przerwac Ctrl+C jesli chcesz tylko dashboard bez nowych danych
timeout /t 5
npx hardhat run scripts/generate_stats.ts
echo.

echo [3/3] Test skalowalnosci...
npx hardhat run scripts/check_scalability.ts
echo.

echo ============================================
echo Sprawdzam pliki CSV...
echo ============================================

if exist wyniki_badan.csv (
    echo [OK] wyniki_badan.csv
) else (
    echo [BRAK] wyniki_badan.csv
)

if exist dane_statystyczne.csv (
    echo [OK] dane_statystyczne.csv
) else (
    echo [BRAK] dane_statystyczne.csv
)

if exist wyniki_skalowalnosc.csv (
    echo [OK] wyniki_skalowalnosc.csv
) else (
    echo [BRAK] wyniki_skalowalnosc.csv
)
echo.

echo ============================================
echo URUCHAMIAM DASHBOARD
echo ============================================
echo.
echo Dashboard otworzy sie w przegladarce na http://localhost:8501
echo Nacisnij Ctrl+C aby zatrzymac
echo.
timeout /t 3

streamlit run app.py
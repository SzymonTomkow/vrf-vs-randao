# Automatyczny workflow dla Windows PowerShell

Write-Host "============================================" -ForegroundColor Blue
Write-Host "  Automatyczny workflow: Testy -> Analiza -> Dashboard" -ForegroundColor Blue
Write-Host "  Praca inzynierska: VRF vs RANDAO" -ForegroundColor Blue
Write-Host "============================================" -ForegroundColor Blue
Write-Host ""

# Sprawdzenie zależności
Write-Host "[1/6] Sprawdzanie zależności..." -ForegroundColor Yellow

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js/npm nie zainstalowane!" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python nie zainstalowany!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Zależności OK" -ForegroundColor Green
Write-Host ""

# Kompilacja
Write-Host "[2/6] Kompilacja smart contractów..." -ForegroundColor Yellow
npx hardhat compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Błąd kompilacji!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Kompilacja zakończona" -ForegroundColor Green
Write-Host ""

# Testy
Write-Host "[3/6] Uruchamianie testów..." -ForegroundColor Yellow
Write-Host "  -> Testy jednostkowe..." -ForegroundColor Cyan
npx hardhat test test/Randao.test.ts | Out-Null
npx hardhat test test/VRFGame.test.ts | Out-Null
npx hardhat test test/Slashing.test.ts | Out-Null

Write-Host "  -> Test sprawiedliwosci (2-3 min)..." -ForegroundColor Cyan
npx hardhat test test/Fairness.test.ts | Out-Null

Write-Host "  -> Test bezpieczenstwa..." -ForegroundColor Cyan
npx hardhat test test/SecurityComparison.test.ts | Out-Null

Write-Host "  -> Test ekonomiczny..." -ForegroundColor Cyan
npx hardhat test test/EconomicAnalysis.test.ts | Out-Null

Write-Host "✅ Testy zakończone" -ForegroundColor Green
Write-Host ""

# Generowanie danych
Write-Host "[4/6] Generowanie danych badawczych..." -ForegroundColor Yellow

Write-Host "  -> Symulacja ataku..." -ForegroundColor Cyan
npx hardhat run scripts/attack_simulation.ts | Out-Null

Write-Host "  -> Pomiar kosztow (20 iteracji)..." -ForegroundColor Cyan
npx hardhat run scripts/simulation.ts | Out-Null

Write-Host "  -> Dane statystyczne (500 probek - 5-10 min)..." -ForegroundColor Cyan
npx hardhat run scripts/generate_stats.ts | Out-Null

Write-Host "  -> Test skalowalno¶ci..." -ForegroundColor Cyan
npx hardhat run scripts/check_scalability.ts | Out-Null

Write-Host "✅ Dane wygenerowane" -ForegroundColor Green
Write-Host ""

# Weryfikacja plików
Write-Host "[5/6] Weryfikacja plików wynikowych..." -ForegroundColor Yellow

$files = @("wyniki_badan.csv", "dane_statystyczne.csv", "wyniki_skalowalnosc.csv")
$missing = 0

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file (brak)" -ForegroundColor Red
        $missing++
    }
}

if ($missing -gt 0) {
    Write-Host "Ostrzezenie: Brakuje $missing plikow, ale kontynuuje..." -ForegroundColor Yellow
}
Write-Host ""

# Wykresy Python
Write-Host "[6/6] Generowanie wykresów (Python)..." -ForegroundColor Yellow

if (Test-Path "analiza_statystyczna_pro.py") {
    Write-Host "  -> Analiza statystyczna..." -ForegroundColor Cyan
    python analiza_statystyczna_pro.py | Out-Null
}

if (Test-Path "generuj_koszty_ekonomiczne.py") {
    Write-Host "  -> Wykresy kosztow..." -ForegroundColor Cyan
    python generuj_koszty_ekonomiczne.py | Out-Null
}

if (Test-Path "generuj_wykres_ataku.py") {
    Write-Host "  -> Wykres ataku..." -ForegroundColor Cyan
    python generuj_wykres_ataku.py | Out-Null
}

if (Test-Path "generuj_wykres_fairness.py") {
    Write-Host "  -> Wykres fairness..." -ForegroundColor Cyan
    python generuj_wykres_fairness.py | Out-Null
}

Write-Host "✅ Wykresy wygenerowane" -ForegroundColor Green
Write-Host ""

# Podsumowanie
Write-Host "============================================" -ForegroundColor Green
Write-Host "  WSZYSTKO GOTOWE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

Write-Host "Pliki CSV:" -ForegroundColor Blue
Get-ChildItem *.csv -ErrorAction SilentlyContinue | ForEach-Object {
    $sizeKB = [math]::Round($_.Length/1KB, 2)
    Write-Host "  - $($_.Name) ($sizeKB KB)"
}
Write-Host ""

Write-Host "Wykresy PNG:" -ForegroundColor Blue
Get-ChildItem *.png -ErrorAction SilentlyContinue | ForEach-Object {
    $sizeKB = [math]::Round($_.Length/1KB, 2)
    Write-Host "  - $($_.Name) ($sizeKB KB)"
}
Write-Host ""

Write-Host "Uruchom dashboard:" -ForegroundColor Yellow
Write-Host "   streamlit run app.py" -ForegroundColor Green
Write-Host ""

Write-Host "Wskazowka:" -ForegroundColor Blue
Write-Host "   Dashboard otworzy sie automatycznie w przegladarce."
Write-Host "   Jesli nie, przejdz do: http://localhost:8501" -ForegroundColor Green
Write-Host ""

# Pytanie o uruchomienie
$response = Read-Host "Czy uruchomic dashboard teraz? (y/n)"
if (($response -eq "y") -or ($response -eq "Y")) {
    Write-Host "Uruchamiam dashboard..." -ForegroundColor Green
    streamlit run app.py
}
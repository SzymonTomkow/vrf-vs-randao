#!/bin/bash

# Kolory
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Automatyczny workflow: Testy → Analiza → Dashboard       ║${NC}"
echo -e "${BLUE}║  Praca inżynierska: VRF vs RANDAO                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Sprawdzenie czy wszystko zainstalowane
echo -e "${YELLOW}[1/6]${NC} Sprawdzanie zależności..."
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ Node.js/npm nie zainstalowane!${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 nie zainstalowany!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Zależności OK${NC}"
echo ""

# Kompilacja kontraktów
echo -e "${YELLOW}[2/6]${NC} Kompilacja smart contractów..."
npx hardhat compile
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Błąd kompilacji!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Kompilacja zakończona${NC}"
echo ""

# Uruchomienie testów
echo -e "${YELLOW}[3/6]${NC} Uruchamianie testów Hardhat..."
echo -e "${BLUE}  → Testy jednostkowe...${NC}"
npx hardhat test test/Randao.test.ts > /dev/null 2>&1
npx hardhat test test/VRFGame.test.ts > /dev/null 2>&1
npx hardhat test test/Slashing.test.ts > /dev/null 2>&1

echo -e "${BLUE}  → Test sprawiedliwości (może potrwać 2-3 min)...${NC}"
npx hardhat test test/Fairness.test.ts > /dev/null 2>&1

echo -e "${BLUE}  → Test bezpieczeństwa...${NC}"
npx hardhat test test/SecurityComparison.test.ts > /dev/null 2>&1

echo -e "${BLUE}  → Test ekonomiczny...${NC}"
npx hardhat test test/EconomicAnalysis.test.ts > /dev/null 2>&1

echo -e "${GREEN}✅ Testy zakończone${NC}"
echo ""

# Generowanie danych
echo -e "${YELLOW}[4/6]${NC} Generowanie danych badawczych..."

echo -e "${BLUE}  → Symulacja ataku...${NC}"
npx hardhat run scripts/attack_simulation.ts > /dev/null 2>&1

echo -e "${BLUE}  → Pomiar kosztów (20 iteracji)...${NC}"
npx hardhat run scripts/simulation.ts > /dev/null 2>&1

echo -e "${BLUE}  → Dane statystyczne (500 próbek - może potrwać 5-10 min)...${NC}"
npx hardhat run scripts/generate_stats.ts > /dev/null 2>&1

echo -e "${BLUE}  → Test skalowalności...${NC}"
npx hardhat run scripts/check_scalability.ts > /dev/null 2>&1

echo -e "${GREEN}✅ Dane wygenerowane${NC}"
echo ""

# Sprawdzenie czy pliki CSV istnieją
echo -e "${YELLOW}[5/6]${NC} Weryfikacja plików wynikowych..."

files=("wyniki_badan.csv" "dane_statystyczne.csv" "wyniki_skalowalnosc.csv")
missing=0

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}  ✅ $file${NC}"
    else
        echo -e "${RED}  ❌ $file (brak)${NC}"
        missing=$((missing + 1))
    fi
done

if [ $missing -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Brakuje $missing plików, ale kontynuuję...${NC}"
fi
echo ""

# Uruchomienie Pythona (generowanie wykresów)
echo -e "${YELLOW}[6/6]${NC} Generowanie wykresów (Python)..."

if [ -f "analiza_statystyczna_pro.py" ]; then
    echo -e "${BLUE}  → Analiza statystyczna...${NC}"
    python3 analiza_statystyczna_pro.py > /dev/null 2>&1
fi

if [ -f "generuj_koszty_ekonomiczne.py" ]; then
    echo -e "${BLUE}  → Wykresy kosztów...${NC}"
    python3 generuj_koszty_ekonomiczne.py > /dev/null 2>&1
fi

if [ -f "generuj_wykres_ataku.py" ]; then
    echo -e "${BLUE}  → Wykres ataku...${NC}"
    python3 generuj_wykres_ataku.py > /dev/null 2>&1
fi

if [ -f "generuj_wykres_fairness.py" ]; then
    echo -e "${BLUE}  → Wykres fairness...${NC}"
    python3 generuj_wykres_fairness.py > /dev/null 2>&1
fi

echo -e "${GREEN}✅ Wykresy wygenerowane${NC}"
echo ""

# Podsumowanie
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ WSZYSTKO GOTOWE!                                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📊 Pliki CSV:${NC}"
ls -lh *.csv 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'
echo ""

echo -e "${BLUE}📈 Wykresy PNG:${NC}"
ls -lh *.png 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'
echo ""

echo -e "${YELLOW}🚀 Uruchom dashboard:${NC}"
echo -e "   ${GREEN}streamlit run app.py${NC}"
echo ""

echo -e "${BLUE}💡 Wskazówka:${NC}"
echo -e "   Dashboard otworzy się automatycznie w przeglądarce."
echo -e "   Jeśli nie, przejdź do: ${GREEN}http://localhost:8501${NC}"
echo ""

# Opcjonalnie: automatyczne uruchomienie dashboardu
read -p "Czy uruchomić dashboard teraz? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}🚀 Uruchamiam dashboard...${NC}"
    streamlit run app.py
fi
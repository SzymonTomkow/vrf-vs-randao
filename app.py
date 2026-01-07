import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import os

# Konfiguracja strony
st.set_page_config(page_title="Dashboard Inżynierski: VRF vs RANDAO", layout="wide")

st.title("🛡️ Analiza Porównawcza: VRF vs RANDAO")
st.markdown("Dashboard interaktywny do pracy inżynierskiej. Wizualizacja kosztów i losowości.")

# --- FUNKCJE POMOCNICZE ---
def load_data(filename):
    """Próbuje załadować plik automatycznie, a jak nie ma, to prosi o upload."""
    if os.path.exists(filename):
        return pd.read_csv(filename)
    else:
        uploaded = st.sidebar.file_uploader(f"Brak pliku {filename}. Wgraj go ręcznie:", type="csv")
        if uploaded:
            return pd.read_csv(uploaded)
    return None

# --- WIDOK GŁÓWNY (ZAKŁADKI) ---
tab1, tab2, tab3 = st.tabs(["💰 Analiza Kosztów (Gas)", "🎲 Analiza Losowości (Entropia)", "⚠️ Symulacja Ataku"])

# === ZAKŁADKA 1: KOSZTY ===
with tab1:
    st.header("Porównanie kosztów operacyjnych")
    df_costs = load_data("wyniki_badan.csv")
    
    if df_costs is not None:
        # Sprawdzenie czy mamy dobre kolumny
        if 'randao_total_gas' in df_costs.columns:
            # Metryki
            avg_randao = df_costs['randao_total_gas'].mean()
            avg_vrf = df_costs['vrf_request_gas'].mean() + df_costs['vrf_callback_gas'].mean()
            
            c1, c2, c3 = st.columns(3)
            c1.metric("Średni koszt RANDAO", f"{int(avg_randao)} gas")
            c2.metric("Średni koszt VRF", f"{int(avg_vrf)} gas")
            diff = ((avg_vrf - avg_randao) / avg_randao) * 100
            c3.metric("Różnica (VRF vs RANDAO)", f"{int(avg_vrf - avg_randao)} gas", f"{diff:.1f}%")
            
            # Wykres
            st.subheader("Przebieg kosztów w kolejnych próbach")
            fig, ax = plt.subplots(figsize=(10, 4))
            ax.plot(df_costs['iteracja'], df_costs['randao_total_gas'], label='RANDAO', marker='o')
            ax.plot(df_costs['iteracja'], df_costs['vrf_request_gas'] + df_costs['vrf_callback_gas'], label='VRF Total', marker='s')
            ax.set_xlabel("Numer próby")
            ax.set_ylabel("Zużycie gazu (wei)")
            ax.legend()
            ax.grid(True, alpha=0.3)
            st.pyplot(fig)
        else:
            st.error("Błąd: Plik wyniki_badan.csv ma złe kolumny. Sprawdź czy to właściwy plik.")
    else:
        st.warning("Nie znaleziono pliku 'wyniki_badan.csv'.")

# === ZAKŁADKA 2: LOSOWOŚĆ ===
with tab2:
    st.header("Analiza rozkładu liczb losowych")
    df_stats = load_data("dane_statystyczne.csv")
    
    if df_stats is not None:
        if 'randao_val' in df_stats.columns:
            st.write("Histogram pokazuje, czy liczby są równomiernie rozłożone (Idealnie: płaski wykres).")
            
            fig2, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
            
            # Randao
            ax1.hist(df_stats['randao_val'], bins=20, color='blue', alpha=0.7)
            ax1.set_title("Histogram RANDAO")
            ax1.set_xlabel("Wylosowana wartość")
            
            # VRF
            ax2.hist(df_stats['vrf_val'], bins=20, color='green', alpha=0.7)
            ax2.set_title("Histogram VRF")
            ax2.set_xlabel("Wylosowana wartość")
            
            st.pyplot(fig2)
            
            # Tabela statystyk
            st.subheader("Podstawowe statystyki")
            st.table(df_stats[['randao_val', 'vrf_val']].describe())
        else:
            st.error("Błąd: Plik dane_statystyczne.csv ma złe kolumny.")
    else:
        st.warning("Nie znaleziono pliku 'dane_statystyczne.csv'.")

# === ZAKŁADKA 3: ATAK (Statyczna) ===
with tab3:
    st.header("Symulacja Ataku Last Revealer")
    st.markdown("""
    W tej sekcji prezentujemy wyniki symulacji ataku (z pliku `attack_simulation.ts`).
    Wykres pokazuje, jak zmienia się opłacalność ataku wraz ze wzrostem kaucji.
    """)
    
    # Jeśli masz wygenerowany obraz, wyświetl go. Jeśli nie - placeholder.
    if os.path.exists("wykres_progu_ataku.png"):
        st.image("wykres_progu_ataku.png", caption="Próg opłacalności ataku")
    else:
        st.info("Uruchom skrypt `generuj_wykres_ataku.py`, aby wygenerować wykres opłacalności.")
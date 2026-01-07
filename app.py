# app.py
import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt

st.set_page_config(page_title="Analiza Blockchain VRF vs RANDAO", layout="wide")

st.title("📊 Analiza generatorów losowości: VRF vs RANDAO")
st.markdown("Dashboard do pracy inżynierskiej. Autor: Szymon Tomków")

# 1. Wczytanie danych
st.sidebar.header("Konfiguracja")
uploaded_file = st.sidebar.file_uploader("Wgraj plik wyniki_badan.csv", type=["csv"])

if uploaded_file is not None:
    df = pd.read_csv(uploaded_file)
    st.success("Plik wczytany pomyślnie!")
    
    # Sekcja 1: Statystyki ogólne
    col1, col2, col3 = st.columns(3)
    avg_randao = df['randao_total_gas'].mean()
    avg_vrf = df['vrf_request_gas'].mean() + df['vrf_callback_gas'].mean()
    
    col1.metric("Średni koszt RANDAO", f"{int(avg_randao)} Gas")
    col2.metric("Średni koszt VRF (Total)", f"{int(avg_vrf)} Gas")
    col3.metric("Różnica", f"{int(avg_vrf - avg_randao)} Gas", delta_color="inverse")

    # Sekcja 2: Wykresy
    st.subheader("Porównanie kosztów w czasie")
    
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(df['iteracja'], df['randao_total_gas'], label='RANDAO', marker='o')
    ax.plot(df['iteracja'], df['vrf_request_gas'] + df['vrf_callback_gas'], label='VRF Total', marker='s')
    ax.set_xlabel("Numer próby")
    ax.set_ylabel("Gas")
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    st.pyplot(fig)

    # Sekcja 3: Tabela danych
    with st.expander("Pokaż surowe dane"):
        st.dataframe(df)

else:
    st.info("Oczekiwanie na plik CSV (wygeneruj go skryptem generate_stats.ts).")
    
    # Przykładowy widok (jeśli nie ma pliku)
    st.markdown("---")
    st.markdown("*Tutaj pojawi się analiza po wgraniu danych.*")
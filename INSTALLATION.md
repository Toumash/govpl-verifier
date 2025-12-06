# Instrukcja instalacji - Weryfikacja GOV.PL

## Szybki start

### Krok 1: Załaduj rozszerzenie do Chrome

1. Otwórz Chrome i wpisz w pasku adresu:
   ```
   chrome://extensions/
   ```

2. Włącz **"Tryb dewelopera"** (przełącznik w prawym górnym rogu)

3. Kliknij **"Załaduj rozpakowane"**

4. Wybierz folder **`dist`** z tego projektu:
   ```
   C:\repo\govpl\gov-pl-verifier\dist
   ```

5. Rozszerzenie jest załadowane! Powinieneś zobaczyć:
   - Nazwę: "Weryfikacja GOV.PL"
   - Ikonę rozszerzenia w pasku narzędzi
   - Status: Włączone

### Krok 2: Przetestuj rozszerzenie

#### Test 1: Strona bezpieczna (gov.pl)

1. Otwórz nową kartę i przejdź do:
   ```
   https://www.gov.pl
   ```

2. Sprawdź ikonę rozszerzenia - powinna pokazywać zielony badge "✓"

3. Kliknij ikonę rozszerzenia - zobaczysz:
   - Zielony nagłówek
   - "Strona zweryfikowana ✓"
   - Szczegóły weryfikacji (domena, HTTPS)
   - Przycisk "Zweryfikuj w mObywatel"

4. Na stronie pojawi się floating button **"🛡️ Weryfikuj"** (prawy dolny róg)

5. Kliknij floating button - pojawi się modal z kodem QR

#### Test 2: Strona ostrzeżenie (gov.pl bez HTTPS)

1. Jeśli znajdziesz stronę gov.pl bez HTTPS, zobaczysz:
   - Żółty badge "!"
   - Ostrzeżenie o braku szyfrowania

#### Test 3: Strona niebezpieczna (nie gov.pl)

1. Otwórz dowolną stronę spoza gov.pl, np.:
   ```
   https://www.google.com
   ```

2. Sprawdź ikonę rozszerzenia - powinna pokazywać czerwony badge "✗"

3. Kliknij ikonę rozszerzenia - zobaczysz:
   - Czerwony nagłówek
   - "OSTRZEŻENIE ✗"
   - "To NIE jest strona GOV.PL!"
   - Przycisk "Zgłoś podejrzaną stronę"

### Krok 3: Testowanie funkcji QR Code

1. Wejdź na `https://www.gov.pl`

2. Kliknij floating button **"🛡️ Weryfikuj"**

3. Zobaczysz modal z:
   - Kodem QR (256x256 px)
   - URL weryfikowanej strony
   - Ostrzeżeniem o ważności kodu (5 min)
   - Linkiem do pobrania mObywatel

4. Kod QR zawiera JSON z danymi weryfikacyjnymi:
   ```json
   {
     "version": "1.0",
     "type": "gov_pl_verification",
     "url": "https://www.gov.pl",
     "hostname": "www.gov.pl",
     "nonce": "abc123...",
     "timestamp": 1701234567890
   }
   ```

### Krok 4: Testowanie w różnych scenariuszach

#### Scenariusz A: Oficjalna strona gov.pl

| Strona | Oczekiwany wynik |
|--------|------------------|
| https://www.gov.pl | ✓ Zielony - Bezpieczne |
| https://obywatel.gov.pl | ✓ Zielony - Bezpieczne |
| https://biznes.gov.pl | ✓ Zielony - Bezpieczne |

#### Scenariusz B: Phishing (symulacja)

| Strona | Oczekiwany wynik |
|--------|------------------|
| https://gov-pl.com | ✗ Czerwony - Niebezpieczne |
| https://www.govpl.com | ✗ Czerwony - Niebezpieczne |
| https://gov.com.pl | ✗ Czerwony - Niebezpieczne |

## Troubleshooting

### Problem: Rozszerzenie się nie ładuje

**Rozwiązanie:**
1. Sprawdź czy wybrałeś folder `dist`, a nie główny folder projektu
2. Upewnij się, że build się powiódł: `npm run build`
3. Sprawdź czy w folderze `dist` jest plik `manifest.json`

### Problem: Brak ikon

**Rozwiązanie:**
1. Wygeneruj ikony ponownie: `node scripts/generate-icons.cjs`
2. Przebuduj projekt: `npm run build`
3. Przeładuj rozszerzenie w `chrome://extensions/`

### Problem: QR Code się nie generuje

**Rozwiązanie:**
1. Sprawdź konsolę (F12) czy są błędy
2. Upewnij się, że zainstalowano `qrcode`: `npm install qrcode`
3. Przebuduj projekt: `npm run build`

### Problem: Floating button nie pojawia się na stronie

**Rozwiązanie:**
1. Upewnij się, że jesteś na stronie *.gov.pl
2. Odśwież stronę (F5)
3. Sprawdź czy content script jest załadowany (konsola → Sources)

## Aktualizacja rozszerzenia

Po wprowadzeniu zmian w kodzie:

```bash
# 1. Przebuduj projekt
npm run build

# 2. Wejdź na chrome://extensions/

# 3. Kliknij ikonę odświeżania przy rozszerzeniu

# 4. Gotowe!
```

## Tryb deweloperski (hot reload)

Jeśli pracujesz nad rozszerzeniem:

```bash
# Uruchom dev mode
npm run dev

# CRXJS będzie automatycznie przebudowywać przy zmianach
# Nadal musisz ręcznie odświeżyć rozszerzenie w Chrome
```

## Przydatne komendy

```bash
# Instalacja zależności
npm install

# Build produkcyjny
npm run build

# Dev mode
npm run dev

# Generowanie ikon
node scripts/generate-icons.cjs

# Czyszczenie
rm -rf dist node_modules
npm install
npm run build
```

## Zgłaszanie błędów

Jeśli napotkasz problem:

1. Otwórz konsolę Chrome (F12)
2. Sprawdź zakładkę Console
3. Skopiuj błędy
4. Zgłoś na GitHub Issues

## Wsparcie

- GitHub: [link]
- Discord: [kanał]
- Dokumentacja: README.md

---

**Powodzenia z testowaniem!** 🛡️

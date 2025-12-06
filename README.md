# Weryfikacja GOV.PL - Chrome Extension

Rozszerzenie Chrome do weryfikacji autentyczności stron gov.pl za pomocą aplikacji mobilnej mObywatel.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Chrome](https://img.shields.io/badge/Chrome-Extension-green.svg)

## Opis projektu

To rozszerzenie Chrome zostało stworzone w odpowiedzi na rosnącą liczbę ataków phishingowych wymierzonych w obywateli Polski, które wykorzystują strony stylizowane na witryny rządowe. Rozwiązanie umożliwia szybką i prostą weryfikację autentyczności stron w domenie gov.pl przy użyciu aplikacji mObywatel.

## Funkcje

### 1. Automatyczna weryfikacja bezpieczeństwa

Po zainstalowaniu rozszerzenie automatycznie sprawdza każdą odwiedzaną stronę pod kątem:

- Przynależności do domeny `.gov.pl`
- Zabezpieczenia połączenia (HTTPS/HTTP)
- Wyświetla badge z wynikiem weryfikacji na ikonie rozszerzenia

### 2. Szczegółowy popup weryfikacyjny

Kliknięcie ikony rozszerzenia pokazuje szczegółowe informacje:

- **Status bezpieczeństwa** - zielony (bezpieczne), żółty (ostrzeżenie), czerwony (niebezpieczne)
- **Domena** - czy strona należy do gov.pl
- **Protokół** - czy połączenie jest szyfrowane (HTTPS)
- **Przycisk weryfikacji** - możliwość zweryfikowania przez mObywatel
- **Link do zgłoszenia** - dla podejrzanych stron

### 3. Weryfikacja QR Code przez mObywatel

Na oficjalnych stronach gov.pl dostępny jest floating button "Weryfikuj":

- Wyświetla modal z kodem QR
- Kod zawiera:
  - URL weryfikowanej strony
  - Jednorazowy nonce (zabezpieczenie przed ponownym użyciem)
  - Timestamp (ważność 5 minut)
- Użytkownik skanuje kod aplikacją mObywatel
- Aplikacja potwierdza autentyczność strony

### 4. Mechanizmy bezpieczeństwa

- **Kryptograficznie bezpieczny nonce** - 32-bajtowy losowy ciąg generowany przez `crypto.getRandomValues()`
- **Timeout weryfikacji** - kod QR wygasa po 5 minutach
- **Jednorazowe użycie** - każdy kod może być użyty tylko raz
- **Walidacja domeny** - sprawdzanie przeciwko oficjalnym domenom
- **Szyfrowane połączenie** - wymóg HTTPS dla pełnej weryfikacji

## Instalacja

### Dla użytkowników

#### Załadowanie w trybie deweloperskim:

1. Pobierz i rozpakuj projekt
2. Zainstaluj zależności i zbuduj:
   ```bash
   npm install
   npm run build
   ```
3. Otwórz Chrome i przejdź do `chrome://extensions/`
4. Włącz "Tryb dewelopera" (prawy górny róg)
5. Kliknij "Załaduj rozpakowane"
6. Wybierz folder `dist` z projektu
7. Rozszerzenie jest gotowe do użycia!

### Dla deweloperów

#### Wymagania:

- Node.js 18+
- npm
- Chrome/Edge/Brave

#### Kroki:

```bash
# Sklonuj repozytorium
git clone <repo-url>
cd gov-pl-verifier

# Zainstaluj zależności
npm install

# Tryb deweloperski (hot reload)
npm run dev

# Build produkcyjny
npm run build

# Generowanie ikon (jeśli potrzebne)
node scripts/generate-icons.cjs
```

## Struktura projektu

```
gov-pl-verifier/
├── manifest.json              # Manifest rozszerzenia Chrome (Manifest V3)
├── vite.config.js            # Konfiguracja Vite + CRXJS
├── package.json              # Zależności projektu
├── public/
│   └── icons/                # Ikony (PNG 16x16, 48x48, 128x128)
├── scripts/
│   └── generate-icons.cjs    # Generator ikon
└── src/
    ├── popup.js              # Logika popup (główny interfejs)
    ├── style.css             # Style popup
    ├── content.js            # Content script (floating button + QR modal)
    ├── content.css           # Style dla elementów na stronie
    ├── background.js         # Service worker (weryfikacja w tle)
    └── utils.js              # Funkcje pomocnicze
```

## Technologie

- **[CRXJS](https://crxjs.dev/)** - Framework do tworzenia rozszerzeń Chrome z Vite
- **[Vite](https://vitejs.dev/)** - Szybki build tool i dev server
- **[QRCode.js](https://github.com/soldair/node-qrcode)** - Generowanie kodów QR
- **[Sharp](https://sharp.pixelplumbing.com/)** - Generowanie ikon PNG
- **Chrome Extension API Manifest V3** - Najnowsza wersja API
- **Vanilla JavaScript** - Bez frameworków (lekkie i szybkie)

## Użytkowanie

### Scenariusz pozytywny (strona bezpieczna):

1. Użytkownik odwiedza `https://www.gov.pl`
2. Rozszerzenie pokazuje zieloną ikonę z checkmarkiem ✓
3. Po kliknięciu widzi: "Strona zweryfikowana ✓"
4. Może dodatkowo zweryfikować przez mObywatel klikając przycisk
5. Pojawia się floating button na stronie "Weryfikuj"
6. Po kliknięciu wyświetla się QR code
7. Skanuje kodem przez aplikację mObywatel
8. Aplikacja potwierdza autentyczność

### Scenariusz negatywny (strona phishingowa):

1. Użytkownik odwiedza `https://gov-pl-dopłaty.com`
2. Rozszerzenie pokazuje czerwoną ikonę z X ✗
3. Po kliknięciu widzi: "OSTRZEŻENIE ✗ - To NIE jest strona GOV.PL!"
4. Komunikat: "Nie wprowadzaj żadnych danych osobowych"
5. Przycisk "Zgłoś podejrzaną stronę"
6. Po kliknięciu użytkownik trafia do CERT Polska

## Integracja z mObywatel

### Format danych QR:

```json
{
  "version": "1.0",
  "type": "gov_pl_verification",
  "url": "https://www.gov.pl/web/gov",
  "hostname": "www.gov.pl",
  "nonce": "a1b2c3d4e5f6...",
  "timestamp": 1701234567890
}
```

### Flow weryfikacji:

```
1. Użytkownik → Klik "Weryfikuj"
2. Rozszerzenie → Generuje nonce + tworzy dane weryfikacyjne
3. Rozszerzenie → Generuje QR code
4. Użytkownik → Skanuje QR przez mObywatel
5. mObywatel → Dekoduje dane, sprawdza nonce
6. mObywatel → Weryfikuje domenę w bazie oficjalnych stron
7. mObywatel → Sprawdza certyfikat SSL
8. mObywatel → Wysyła wynik do serwera
9. Rozszerzenie → Odpytuje status (polling)
10. Rozszerzenie → Wyświetla wynik użytkownikowi
```

**Uwaga:** W obecnej wersji prototypowej brakuje backendu do obsługi weryfikacji. W produkcji wymagany jest serwer API do komunikacji między rozszerzeniem a aplikacją mObywatel.

## Bezpieczeństwo

### Zaimplementowane mechanizmy:

✅ **Nonce (Number Once)**

- 32-bajtowy kryptograficznie bezpieczny nonce
- Generowany przez `crypto.getRandomValues()`
- Unikalny dla każdej sesji
- Zapobiega replay attacks

✅ **Timeout**

- Kod QR ważny tylko 5 minut
- Automatyczne wygaśnięcie sesji

✅ **Walidacja domen**

- Sprawdzanie końcówki `.gov.pl`
- Możliwość rozszerzenia o whitelist oficjalnych domen

✅ **HTTPS Only**

- Wymóg HTTPS dla pełnej weryfikacji
- Ostrzeżenia dla HTTP

✅ **Content Security Policy**

- Ograniczenie źródeł skryptów przez Manifest V3
- Zapobieganie XSS

### Co należy dodać w produkcji:

⚠️ **Podpis cyfrowy** - Kody QR powinny być podpisane cyfrowo
⚠️ **Szyfrowanie end-to-end** - Dane weryfikacyjne powinny być szyfrowane
⚠️ **Backend API** - Serwer do zarządzania sesjami i komunikacji z mObywatel
⚠️ **Lista oficjalnych domen** - JSON z whitelist domén gov.pl
⚠️ **Rate limiting** - Ograniczenie liczby requestów
⚠️ **Logging i monitoring** - Śledzenie prób oszustw

## Kryteria hackathonu

### Związek z wyzwaniem (25%)

✅ Bezpośrednie rozwiązanie problemu phishingu stron gov.pl
✅ Integracja z aplikacją mObywatel
✅ Mechanizm weryfikacji QR code

### Wdrożeniowy potencjał (25%)

✅ Gotowy prototyp działający w Chrome
✅ Możliwość rozszerzenia na Firefox, Edge
✅ Jasna ścieżka integracji z systemami rządowymi
✅ Możliwość wdrożenia jako oficjalne rozszerzenie

### Walidacja i bezpieczeństwo (20%)

✅ Weryfikacja domeny i HTTPS
✅ Kryptograficznie bezpieczny nonce
✅ Timeout i jednorazowe kody
✅ Walidacja wejścia

### UX i ergonomia (15%)

✅ Intuicyjny interfejs popup
✅ Floating button nieprzeszkadzający w przeglądaniu
✅ Jasne komunikaty dla użytkownika nietchnicznego
✅ Responsywny design

### Innowacyjność (15%)

✅ Połączenie rozszerzenia przeglądarki z aplikacją mobilną
✅ QR code jako medium weryfikacji
✅ Proaktywna ochrona zamiast reaktywnej

## TODO / Roadmap

### MVP (Completed) ✅

- [x] Podstawowa weryfikacja domeny
- [x] Sprawdzanie HTTPS
- [x] Generowanie kodów QR z nonce
- [x] Popup z informacjami
- [x] Floating button
- [x] Background service worker
- [x] Ikony rozszerzenia (PNG)

### Wersja 1.1 (Production Ready)

- [ ] Backend API do zarządzania sesjami
- [ ] Lista oficjalnych domen (JSON resource)
- [ ] Podpis cyfrowy kodów QR
- [ ] Integracja z prawdziwą aplikacją mObywatel
- [ ] Weryfikacja certyfikatów SSL (szczegółowa)
- [ ] Testy jednostkowe i integracyjne
- [ ] Audyt bezpieczeństwa

### Wersja 2.0 (Extended)

- [ ] Wsparcie Firefox i Edge
- [ ] Historia weryfikacji
- [ ] Statystyki zagrożeń
- [ ] Panel administracyjny
- [ ] Machine learning do wykrywania phishingu
- [ ] Współpraca z CERT Polska

## Materiały prezentacyjne

### Struktura prezentacji (max 10 slajdów):

1. **Tytuł** - Weryfikacja GOV.PL
2. **Problem** - Phishing stron rządowych
3. **Rozwiązanie** - Rozszerzenie + mObywatel
4. **Architektura** - Diagram flow
5. **Funkcje** - Zrzuty ekranu
6. **Scenariusze** - Pozytywny i negatywny
7. **Bezpieczeństwo** - Mechanizmy ochrony
8. **Technologie** - Stack techniczny
9. **Wdrożenie** - Plan implementacji
10. **Podsumowanie** - Impact i przyszłość

### Film demo (max 3 minuty):

1. Intro (15s) - Problem phishingu
2. Demo pozytywne (60s) - Weryfikacja prawdziwej strony
3. Demo negatywne (60s) - Wykrycie phishingu
4. Funkcje (30s) - QR code + mObywatel
5. Outro (15s) - Call to action

## Licencja

MIT

## Kontakt

- GitHub Issues: [link]
- Discord: [kanał projektu]
- Email: [kontakt]

---

**Projekt stworzony na hackathon GOV.PL 2025**

_To jest wersja prototypowa. Do wdrożenia produkcyjnego wymagane są: backend API, audyt bezpieczeństwa, oficjalna integracja z mObywatel oraz lista oficjalnych domen gov.pl._



## Roadmapa

- [ ] mobywatel - deeplink do zglos zlosliwa domene
- [ ] roadmapa mobywatel - https://info.mobywatel.gov.pl/rozwoj-aplikacji
- [ ] zlosliwe strony - przestrzegajmy jak antywirusy - https://cert.pl/lista-ostrzezen/ - - [ ] https://hole.cert.pl/domains/v2/domains.txt
- [x] zgłaszanie incydentu - https://incydent.cert.pl/domena#!/lang=pl
- [ ] zgłaszanie podejrzanej strony - mobywatel - bezpieczni w sieci - zgłoś
- [x] dodatkowa weryfikacja - lista stron rządowych https://www.dns.pl/lista_gov_pl_z_www.csv
- [ ] weryfikacja na telefonie z telefonu - BLIK kod, ewentualnie SHARE menu -> mobywatel
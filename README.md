# GONO BASE64

Fresh-Finance-Edition mit hellem Design und unveränderter Konvertierungslogik.

Eine kleine, komplett lokale PWA zum **Kodieren und Dekodieren von Base64**. Text einfügen, Ergebnis erscheint sofort. Die App erkennt automatisch, ob die Eingabe Klartext oder Base64 ist. Es gibt keine Server-Kommunikation, keine externen Bibliotheken und keine CDNs.

---

## Inhaltsverzeichnis

- [Benutzung](#benutzung)
  - [Starten](#starten)
  - [Installieren und offline nutzen](#installieren-und-offline-nutzen)
  - [Bedienung](#bedienung)
  - [Auto-Erkennung](#auto-erkennung)
  - [Was bedeutet „URL-sicher“?](#was-bedeutet-url-sicher)
- [Technische Basis](#technische-basis)
  - [Dateien](#dateien)
  - [Base64-Kodierung und -Dekodierung](#base64-kodierung-und--dekodierung)
  - [Erkennungslogik](#erkennungslogik)
  - [Service Worker & Offline-Betrieb](#service-worker--offline-betrieb)
  - [App-Manifest und Icons](#app-manifest-und-icons)
  - [Sicherheit und Datenschutz](#sicherheit-und-datenschutz)
  - [Updates](#updates)
- [Tests](#tests)
- [Grenzen](#grenzen)

---

## Benutzung

### Starten

Die App besteht nur aus statischen Dateien – es gibt keinen Build-Schritt und keine Paketinstallation. Da Service Worker und PWA-Installation einen **sicheren Kontext** (`https://` oder `localhost`) voraussetzen, einfach im Projektordner einen lokalen Server starten:

```bash
cd neonbase64-main
python3 -m http.server 8080
```

Danach `http://localhost:8080` im Browser öffnen. Für einen echten Deployment einfach den Ordner auf einen beliebigen statischen Webserver oder HTTPS-Host legen.

### Installieren und offline nutzen

- In Chrome/Edge erscheint nach dem Laden ein Button **„Installieren“** in der Kopfzeile. Er nutzt das `beforeinstallprompt`-Event und startet die Browser-Installation.
- In Safari/iOS bzw. Browsern ohne dieses Event erscheint ein Hinweis: **Teilen → Zum Home-Bildschirm hinzufügen**.
- Nach dem ersten Laden sind alle Dateien im Cache. Die installierte App startet und funktioniert **ohne Internetverbindung**. Die Statuszeile zeigt dann „Offline · 100 % lokal im Browser“.

### Bedienung

| Element | Funktion |
| --- | --- |
| **Eingabe** | Text oder Base64 eintippen/einfügen. Die Umwandlung läuft bei jeder Eingabe sofort (live). |
| **Ausgabe** | Zeigt das Ergebnis. Schreibgeschützt, damit nichts versehentlich verändert wird. |
| **Modus: Auto** | Standard. Erkennt selbst die Richtung (siehe unten). |
| **Modus: Text → Base64** | Erzwingt das Kodieren, auch wenn der Text wie Base64 aussieht. |
| **Modus: Base64 → Text** | Erzwingt das Dekodieren und zeigt Fehler bei ungültigem Base64 an. |
| **URL-sicher** | Schalter für die Ausgabe im base64url-Format (siehe nächster Abschnitt). Beim Dekodieren werden beide Varianten akzeptiert. |
| **Tauschen** | Übernimmt das Ergebnis wieder als Eingabe – praktisch für den Rückweg. Im Auto-Modus dreht sich die Erkennung automatically um. |
| **Leeren** | Eingabe löschen und Fokus zurücksetzen. |
| **Kopieren** | Ergebnis in die Zwischenablage. Falls die Clipboard-API nicht verfügbar ist, gibt es einen Fallback über `execCommand('copy')`. |
| **Zähler / Statuszeile** | Zeichenanzahl, Byte-Anzahl (`UTF-8-Eingabe → UTF-8-Ausgabe`) und aktueller Zustand. |

Tastenkürzel:

- `Strg/Cmd + K` – Fokus in das Eingabefeld
- `Strg/Cmd + Enter` – Ergebnis kopieren

Mehrzeilige Base64-Eingaben (mit Leerzeichen, Tabulatoren oder Zeilenumbrüchen) werden beim Dekodieren automatisch bereinigt.

### Auto-Erkennung

Der Auto-Modus prüft die Eingabe in zwei Schritten:

1. **Struktur:** Besteht der Text (nach Entfernen von Whitespace) nur aus Base64-Zeichen, inklusive URL-sicherer Zeichen `-` und `_`, und ist die Länge gültig?
2. **Inhalt:** Lässt sich daraus gültiges UTF-8 decodieren, das wie lesbarer Text aussieht (keine Steuerzeichen, kein Ersatzzeichen)?

Wenn beides zutrifft, wird **dekodiert**, sonst **kodiert**. Die Richtungsanzeige zwischen den Feldern zeigt „AUTO · ERKANNT“ und die erkannte Richtung.

Beispiele:

| Eingabe | Erkennung | Ausgabe |
| --- | --- | --- |
| `dGVzdA==` | Base64 erkannt | `test` |
| `Hallo Welt 🌈` | Klartext erkannt | `SGFsbG8gV2VsdCDwn4yI` |
| `test` | Klartext erkannt (wäre zwar Base64-Zeichen, ergäbe aber keinen lesbaren Text) | `dGVzdA==` |
| `NeonBase64` | Klartext erkannt | `TmVvbkJhc2U2NA==` |

Base64 ist eine *Kodierung*, keine Erkennung von „Semantik“. Manche Zeichenfolgen sind zwangsläufig mehrdeutig: `QUJD` ist gültiges Base64 für `ABC`, könnte aber auch ein Klartext sein, den man kodieren möchte. In solchen Fällen einfach den Modus manuell auf **Text → Base64** oder **Base64 → Text** stellen.

### Was bedeutet „URL-sicher“?

Standard-Base64 (RFC 4648, Alphabet A–Z, a–z, 0–9, `+`, `/`, `=`) ist für Dateien gut geeignet, problematisch aber in URLs:

- `+` wird in Query-Strings oft als **Leerzeichen** interpretiert.
- `/` ist in URLs ein **Pfad-Trennzeichen**.
- `=` ist in Query-Parametern ein **Trennzeichen** zwischen Key und Value und muss maskiert werden.

**URL-sicheres Base64** („base64url“, RFC 4648 Abschnitt 5) vermeidet das:

| Standard-Base64 | URL-sicher |
| --- | --- |
| `+` → | `-` |
| `/` → | `_` |
| `=`-Padding → | wird weggelassen |

Beispiel: Der Text `??>>` ergibt als Standard-Base64 `Pz8+Pg==`, als URL-sichere Variante `Pz8-Pg`. Letzteres kann direkt in einen Pfad oder einen Query-Parameter eingebaut werden, ohne percent-encodiert zu werden:

```text
https://beispiel.de/api/token/Pz8-Pg?wert=Pz8-Pg
```

In dieser App:

- Der Schalter **URL-sicher** wirkt nur auf die **Ausgabe** beim Kodieren (`-`, `_`, ohne `=`).
- Der **Dekodierer akzeptiert beide Varianten** – auch gemischt – und ergänzt fehlendes Padding automatisch.
- Auch normales Base64 mit Zeilenumbrüchen wird akzeptiert.

Wichtig: URL-sicher ist **keine Verschlüsselung oder Sicherheitsfunktion**. Es ist nur eine andere Zeichenauswahl, damit die Kodierung in URLs unbeschädigt ankommt. Wer Daten geheim halten will, braucht echte Verschlüsselung.

---

## Technische Basis

### Dateien

| Datei | Zweck |
| --- | --- |
| `index.html` | Markup, Sprachattribut `de`, CSP-Meta-Tag, Manifest- und Icon-Links |
| `styles.css` | Fresh-Finance-Design: Türkis, Petrol, Apricot, Kapselform-Buttons, Responsive Layout, `prefers-reduced-motion` |
| `base64.js` | Reine Konvertierungslogik (`encode`, `decode`, `detectDirection`, `convert`), auch in Node testbar |
| `app.js` | UI-Verdrahtung, Modi, Kopieren, Tastenkürzel, Installations-Workflow, Service-Worker-Registrierung |
| `sw.js` | Service Worker mit Precache und Offline-Fallback |
| `manifest.webmanifest` | PWA-Metadaten, `display: standalone`, Icons |
| `icons/` | Lokale PNG-Icons (192/512, `any` und `maskable`) sowie `favicon.svg` |
| `scripts/make_icons.py` | Erzeugt die Icons neu (benötigt Pillow) |
| `tests/` | Logik-Test und Browser-Offline-Test |

Es gibt **kein Framework, keinen Bundler und keine externen Assets**. Alle Skripte sind klassische `<script>`-Tags, damit auch `file://`-Ähnliches ohne Modul-CORS funktioniert (offiziell unterstützt wird jedoch `localhost`/HTTPS wegen des Service Workers).

### Base64-Kodierung und -Dekodierung

- **Text → Bytes:** `TextEncoder` (UTF-8).
- **Bytes → Base64:** `btoa()` auf einem Binary-String, in Blöcken von 32 KiB, um Argumentlisten-Limits zu vermeiden.
- **Base64 → Bytes:** `atob()` nach Normalisierung (Whitespace entfernen, `-`/`_` zu `+`/`/`, Padding ergänzen).
- **Bytes → Text:** `TextDecoder('utf-8', { fatal: true })`. Ungültiges UTF-8 führt zu einer klaren Fehlermeldung statt zu stillen Ersatzzeichen.
- Alle Berechnungen finden ausschließlich im Browser statt. `base64.js` hat keine Abhängigkeiten und ist über `module.exports` auch in Node testbar.

### Erkennungslogik

`detectDirection()` gibt bei manuellem Modus direkt `encode` oder `decode` zurück. Im Auto-Modus ruft es `looksLikeBase64()` auf:

1. Whitespace entfernen, Mindestlänge und gültige Restlänge prüfen.
2. Regex auf `A–Z a–z 0–9 + / - _` mit optionalem `=`-Padding.
3. Dekodieren und prüfen, ob das Ergebnis lesbarer Text ist: keine C0/C1-Steuerzeichen (außer Tab, LF, CR) und kein U+FFFD.

Nur wenn alle Prüfungen bestehen, wird die Eingabe als Base64 behandelt.

### Service Worker & Offline-Betrieb

- Bei der **Installation** werden alle App-Dateien (HTML, CSS, JS, Manifest, Icons) in den Cache `neon-base64-fresh-v2` gelegt. Danach wird der Worker sofort aktiv (`skipWaiting`) und übernimmt bestehende Tabs (`clients.claim`).
- Bei **Navigationen** wird immer `index.html` aus dem Cache ausgeliefert (App-Shell-Fallback).
- Für alle anderen GET-Requests gilt **Cache-first**: bei Treffer aus dem Cache, sonst aus dem Netz laden und in einen Runtime-Cache schreiben.
- Cross-Origin-Requests werden vom Service Worker ignoriert – es gibt ohnehin keine.
- Beim **Aktivieren** werden alte Cache-Versionen gelöscht.

Der Offline-Betrieb wurde im Headless-Browser geprüft: Service Worker `activated`, Netz simuliert offline, Reload erfolgreich, Live-Konvertierung liefert weiterhin `test` aus `dGVzdA==`.

### App-Manifest und Icons

`manifest.webmanifest` definiert Name, Beschreibung, `start_url`, `scope`, `display: standalone`, Theme-Farben und vier PNG-Icons plus SVG-Favicon. Die `maskable`-Icons sind mit einer Sicherheitszone versehen, damit Android sie in jede Maskenform schneiden kann, ohne dass „64“ abgeschnitten wird.

### Sicherheit und Datenschutz

- Content-Security-Policy: `default-src 'self'`, `connect-src 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'none'`. Skripte und Styles dürfen nur von derselben Quelle kommen; JavaScript kann **keine** Netzwerkverbindung öffnen.
- Kein Tracking, kein Analytics, kein CDN, keine externen Fonts (es wird eine lokale Font-Stack-Fallbackkette verwendet).
- Die Eingabe wird nur im DOM gehalten und nie gespeichert oder gesendet.

### Updates

Wenn sich Dateien ändern, die im Cache liegen, die Versionsnamen in `sw.js` erhöhen:

```js
const CACHE = 'neon-base64-v2';
const RUNTIME = 'neon-base64-runtime-v2';
```

Der neue Worker wird installiert, alte Caches werden beim Aktivieren entfernt. Für sofortige Übernahme im laufenden Tab ggf. die Seite einmal neu laden.

---

## Tests

```bash
# Reine Logik (Node)
node tests/logic.test.js

# Syntax prüfen
node --check app.js
node --check sw.js
python3 -m json.tool manifest.webmanifest > /dev/null
```

Der Browser-Test benötigt einen lokalen Server auf Port 8899 und Chromium mit Remote-Debugging auf Port 9222:

```bash
python3 -m http.server 8899 --bind 127.0.0.1
chromium --headless --no-sandbox --remote-debugging-port=9222 --user-data-dir=/tmp/opencode/chrome-cdp about:blank
node tests/browser.test.js
```

Er prüft Service-Worker-Registrierung, Cache, Offline-Reload und die Live-Konvertierung.

---

## Grenzen

- Die App verarbeitet **Text**, keine Binärdaten. Base64 von z. B. PNG-Dateien lässt sich im Modus „Base64 → Text“ nicht sinnvoll darstellen; die UTF-8-Prüfung meldet dann einen Fehler.
- Die Auto-Erkennung ist eine Heuristik und bei kurzen, mehrdeutigen Zeichenfolgen nicht eindeutig – der manuelle Modus löst das.
- PWA-Installation und Service Worker funktionieren nur über `https://` oder `localhost`, nicht über eine normale `http://`-Domain.

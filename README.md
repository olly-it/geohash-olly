# geohash-olly

Visualizzatore di geohash su mappa (HTML + JS, nessuna build). Permette di selezionare una geohash e muoversi tra i limitrofi della stessa precisione, anche quando cambia il padre.

## Avvio

Usa ES modules, quindi va servito via HTTP:

```sh
python3 -m http.server 8000
```

Poi apri http://localhost:8000 (si può passare una geohash nell'URL, es. `http://localhost:8000/#u0nd9`).

## Funzionalità

- Selezione: click sulla mappa (alla precisione corrente) o digitando il codice.
- Precisione 1–12 tramite slider o tasti `+` / `-`.
- Gli 8 vicini sono disegnati sulla mappa e in una griglia 3×3 nel pannello:
  - rosso: selezionata
  - blu: vicino con lo stesso padre
  - arancione: vicino con padre diverso (nel pannello è evidenziata la parte di codice che cambia)
  - tratteggiato: padre
- Navigazione: frecce / WASD, `Q` `E` `Z` `C` per le diagonali, oppure click su un vicino.
- Opzione "Griglia nella vista" per vedere tutte le celle della precisione corrente.
- Gestione antimeridiano (wrap della longitudine); oltre i poli non ci sono vicini.

## File

- [index.html](index.html): layout e caricamento di Leaflet da CDN
- [app.js](app.js): mappa, rendering, interazione
- [geohash.js](geohash.js): encode / decode / bounds / vicini
- [style.css](style.css): stili

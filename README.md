# Lab Rosa eFootball

App statica per gestire la mia rosa eFootball: simulatore di build (punti progressione) e gestore delle abilità extra con magazzino delle abilità salvate.
Nessun server, nessuna dipendenza: HTML, CSS e JavaScript.

## Avvio
- **Locale**: apri `index.html` nel browser.
- **GitHub Pages**: Settings → Pages → Deploy from a branch → `main` / root. L'app sarà su `https://<utente>.github.io/<repo>/`.

## Struttura
| File | Contenuto |
|---|---|
| `index.html`, `styles.css`, `app.js` | L'app |
| `data/roster.js` | Dati iniziali: 30 carte (statistiche, stili, abilità base da pesdb.net; booster, abilità extra e note dal file Excel) |
| `data/skills.js` | Dizionario abilità: nome inglese (pesdb) → nome italiano, categoria, speciale |
| `data/config.js` | Regole di progressione, profili di ruolo (pesi e abilità prioritarie), ruoli iniziali |
| `img/` | Immagini delle carte (dal file Excel) |

## Salvataggio
Le modifiche restano nel `localStorage` del browser. Da **Impostazioni → Esporta dati** scarichi un JSON che puoi committare nel repo e reimportare su un altro dispositivo.

## Da verificare in gioco
- Quali statistiche alza ogni categoria di progressione e il costo dei livelli (`data/config.js`).
- Le statistiche alzate da ogni booster: si impostano una volta nell'app (tab Build e booster).
- Punti progressione di Luis Suárez (pesdb non li riporta).
- Versione esatta della carta di Virgil van Dijk.

## Aggiungere una carta
1. Trova la carta su pesdb.net e copia ID, statistiche e abilità.
2. Aggiungi un oggetto in `data/roster.js` seguendo il formato degli altri.
3. In alternativa chiedi a Claude di farlo partendo dal link pesdb o da uno screenshot del gioco.

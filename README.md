# MVK PES Builder

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

## Obiettivo build
Nel tab Build scrivi cosa vuoi (es. "velocità, dribbling e tiro a giro, velocità almeno 90"). Un interprete a parole chiave (nessuna AI, regole in `data/config.js` → `goalKeywords`) lo trasforma in statistiche con importanza e minimi, che puoi correggere a mano. "Calcola build per l'obiettivo" prima raggiunge i minimi, poi spende i punti rimasti dove l'obiettivo guadagna di più per punto. Il riquadro risultato mostra statistiche prima/dopo, abilità consigliate (con disponibilità in magazzino) e booster adatti (se la libreria booster è compilata).

## Dati: export e import
Sezione **Dati**:
- **Esporta Excel**: fogli Carte, Magazzino, Booster, Abilità (dizionario IT/EN), Legenda.
- **Esporta CSV**: solo le carte, separatore `;` (si apre in Excel italiano).
- **Importa**: .xlsx, .csv o backup .json. Righe con ID esistente = aggiornamento (solo celle compilate); righe senza ID = carta nuova.
- **Template**: `data/template-import-lab-rosa.xlsx` e `.csv`. La riga il cui nome inizia con ESEMPIO viene ignorata.

Così si possono aggiungere carte a mano, senza AI: si copiano le statistiche da pesdb.net o dal gioco nel template e si importa.

## Salvataggio
Le modifiche restano nel `localStorage` del browser. Fai export (Excel o backup .json) per tenerle nel repo o spostarle su un altro dispositivo.

## Librerie
`lib/xlsx.mini.min.js`: SheetJS Community Edition 0.20.3 (Apache 2.0, licenza in `lib/`). Inclusa nel repo, quindi l'app funziona anche offline.

## Regole verificate in gioco
- Costo livelli e statistiche per categoria: verificati su Conceição (build 9/3/8/8/10 = 60 punti, tutte le statistiche coincidono con efootballhub).
- Booster verificati: Gestione del pallone, Calci di punizione, Duelli. Gli altri si impostano in Impostazioni → Libreria booster.
- Allenatori: 9 allenatori della rosa (booster e competenze per stile, da efootballhub). Bonus di competenza verificato su 3 schermate (Conceição con Conte e Koeman, Gattuso con Conte): bonus = floor(valore allenato × 3,6%), tetto 99 su allenato + bonus, poi booster carta e allenatore oltre il tetto. Tutte le statistiche coincidono. Sotto competenza 88 da verificare (`proficiencyBoost` in `data/config.js`).

## Da verificare in gioco
- Le statistiche degli altri booster.
- Punti progressione di Luis Suárez (pesdb non li riporta).
- Versione esatta della carta di Virgil van Dijk.

## Aggiungere una carta
1. Trova la carta su pesdb.net e copia ID, statistiche e abilità.
2. Aggiungi un oggetto in `data/roster.js` seguendo il formato degli altri.
3. In alternativa chiedi a Claude di farlo partendo dal link pesdb o da uno screenshot del gioco.

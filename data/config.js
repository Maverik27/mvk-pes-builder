// Regole di gioco e profili di ruolo. Tutto modificabile: se il gioco cambia, si aggiorna qui.
window.CONFIG = {
  // Nomi statistiche (come su pesdb) -> etichetta italiana
  stats: {
    "Attacking Awareness": "Comportamento offensivo",
    "Ball Control": "Controllo palla",
    "Dribbling": "Dribbling",
    "Tight Possession": "Possesso stretto",
    "Low Pass": "Passaggio rasoterra",
    "Lofted Pass": "Passaggio alto",
    "Finishing": "Finalizzazione",
    "Heading": "Colpo di testa",
    "Set Piece Taking": "Calci da fermo",
    "Curl": "Tiro a giro",
    "Defensive Awareness": "Comportamento difensivo",
    "Tackling": "Contrasto",
    "Aggression": "Aggressività",
    "Defensive Engagement": "Coinvolgimento difensivo",
    "GK Awareness": "Comportamento PT",
    "GK Catching": "Presa PT",
    "GK Parrying": "Parata PT",
    "GK Reflexes": "Riflessi PT",
    "GK Reach": "Estensione PT",
    "Speed": "Velocità",
    "Acceleration": "Accelerazione",
    "Kicking Power": "Potenza di tiro",
    "Jumping": "Salto",
    "Physical Contact": "Contatto fisico",
    "Balance": "Controllo corpo",
    "Stamina": "Resistenza"
  },
  statGroups: [
    { name: "Attacco", stats: ["Attacking Awareness", "Ball Control", "Dribbling", "Tight Possession", "Low Pass", "Lofted Pass", "Finishing", "Heading", "Set Piece Taking", "Curl"] },
    { name: "Difesa", stats: ["Defensive Awareness", "Tackling", "Aggression", "Defensive Engagement"] },
    { name: "Fisico", stats: ["Speed", "Acceleration", "Kicking Power", "Jumping", "Physical Contact", "Balance", "Stamina"] },
    { name: "Portiere", stats: ["GK Awareness", "GK Catching", "GK Parrying", "GK Reflexes", "GK Reach"] }
  ],

  // Categorie dei punti progressione. Verificate il 9/10/2026 su Conceição (build 9/3/8/8/10 = 60 punti, tutte le statistiche coincidono).
  categories: [
    { key: "shooting", name: "Tiro", short: "TIR", stats: ["Finishing", "Set Piece Taking", "Curl"] },
    { key: "passing", short: "PAS", name: "Passaggio", stats: ["Low Pass", "Lofted Pass"] },
    { key: "dribbling", short: "DRI", name: "Dribbling", stats: ["Ball Control", "Dribbling", "Tight Possession"] },
    { key: "dexterity", short: "DES", name: "Destrezza", stats: ["Attacking Awareness", "Acceleration", "Balance"] },
    { key: "lowerBody", short: "GAM", name: "Forza arti inferiori", stats: ["Speed", "Kicking Power", "Stamina"] },
    { key: "aerial", short: "AER", name: "Forza aerea", stats: ["Heading", "Jumping", "Physical Contact"] },
    { key: "defending", short: "DIF", name: "Difesa", stats: ["Defensive Awareness", "Tackling", "Aggression", "Defensive Engagement"] },
    { key: "gk1", short: "PT1", name: "Portiere 1", stats: ["GK Awareness"] },
    { key: "gk2", short: "PT2", name: "Portiere 2", stats: ["GK Catching", "GK Parrying"] },
    { key: "gk3", short: "PT3", name: "Portiere 3", stats: ["GK Reflexes", "GK Reach"] }
  ],
  // Costo del livello n: livelli 1-4 = 1 punto, 5-8 = 2, 9-12 = 3, e così via.
  levelBlock: 4,
  statCap: 99,

  // Statistiche alzate dai booster. Verificate in gioco: Gestione del pallone, Calci di punizione (Conceição), Duelli (Gattuso).
  // Le altre si aggiungono da Impostazioni > Libreria booster.
  boosterDefsSeed: {
    "Gestione del pallone": ["Dribbling", "Tight Possession", "Speed", "Balance"],
    "Calci di punizione": ["Finishing", "Set Piece Taking", "Curl", "Kicking Power"],
    "Duelli": ["Defensive Awareness", "Tackling", "Speed", "Stamina"]
  },
  // Stili di gioco di squadra (ordine come su efootballhub)
  teamStyles: ["Possesso palla", "Contrattacco", "Contropiede veloce", "Passaggio lungo", "Vie laterali", "Pressing totale"],
  // Bonus alle statistiche in base alla competenza dell'allenatore nello stile scelto.
  // Verificato su 3 schermate efootballhub (Conceição con Conte 90 e Koeman 88, Gattuso con Conte):
  // bonus = floor(valore allenato * 3,6%), tetto 99 su allenato + bonus, poi booster carta e allenatore.
  // Sotto 88 non ancora verificato.
  proficiencyBoost: [{ min: 88, pct: 3.6 }],
  // Allenatori della rosa (da efootballhub, 9/10/2026). prof = competenza per stile, nello stesso ordine di teamStyles.
  managers: [
    { id: "conte", name: "Antonio Conte", add: { "Defensive Awareness": 1, "Kicking Power": 1 }, prof: [68, 73, 90, 68, 89, 69],
      links: ["Passaggio in profondità alto C: Sviluppo (DC) → Ala prolifica (ESA, EDA)", "1-2 Cut-in B: Ala prolifica (ESA, EDA) → Rapace d'area (P)"] },
    { id: "fabregas", name: "Cesc Fàbregas", add: { "Lofted Pass": 1, "Defensive Engagement": 1 }, prof: [89, 56, 65, 57, 68, 56],
      links: ["Passaggio in profondità alto A: Tra le linee (MED) → Opportunista (P)"] },
    { id: "koeman", name: "Ronald Koeman", add: { "Low Pass": 1, "Heading": 1 }, prof: [89, 55, 88, 61, 68, 55],
      links: ["Cross aggressivo A: Specialista di cross (CLS, CLD) → Rapace d'area (P)"] },
    { id: "southgate", name: "G. Southgate", add: { "Acceleration": 1 }, prof: [44, 87, 86, 32, 69, 32], links: [] },
    { id: "gattuso", name: "Gennaro Gattuso", add: { "Tackling": 1, "Lofted Pass": 1 }, prof: [53, 57, 65, 71, 89, 53],
      links: ["Passaggio lungo diagonale A: Regista creativo (TRQ) → Giocatore chiave (CLS, CLD)"] },
    { id: "alonso", name: "Xabi Alonso", add: { "Acceleration": 1 }, prof: [72, 35, 88, 28, 51, 28], links: [] },
    { id: "amorim", name: "Ruben Amorim", add: { "Physical Contact": 1, "Lofted Pass": 1 }, prof: [62, 54, 81, 46, 89, 46],
      links: ["Cross aggressivo A: Specialista di cross (CLS, CLD) → Rapace d'area (P)"] },
    { id: "lampard", name: "Frank Lampard", add: { "Low Pass": 1, "Defensive Engagement": 1 }, prof: [75, 58, 60, 89, 69, 89],
      links: ["1-2 con inserimento A: Regista creativo (CLS, CLD) → Rapace d'area (P)"] },
    { id: "deschamps", name: "D. Deschamps", add: { "Speed": 1 }, prof: [69, 88, 62, 67, 75, 62], links: [] }
  ],

  // Profili di ruolo: pesi delle statistiche (per l'ottimizzatore) e abilità prioritarie (per il gestore).
  // I pesi sono una base di partenza ragionata, non dati ufficiali.
  roles: {
    "PT": {
      weights: { "GK Awareness": 3, "GK Reflexes": 3, "GK Reach": 3, "GK Catching": 2, "GK Parrying": 2, "Jumping": 1, "Low Pass": 1, "Lofted Pass": 1 },
      skills: ["GK Low Punt", "GK Long Throw", "GK High Punt", "GK Penalty Saver", "One-touch Pass", "Low Lofted Pass"]
    },
    "DC incontrista": {
      weights: { "Defensive Awareness": 3, "Tackling": 3, "Aggression": 3, "Defensive Engagement": 2, "Speed": 2, "Acceleration": 2, "Physical Contact": 2, "Jumping": 2, "Heading": 1, "Balance": 1, "Stamina": 1 },
      skills: ["Interception", "Blocker", "Aerial Superiority", "Acrobatic Clearance", "Man Marking", "Sliding Tackle", "One-touch Pass", "Fighting Spirit"]
    },
    "DC costruttore": {
      weights: { "Defensive Awareness": 3, "Defensive Engagement": 3, "Tackling": 2, "Aggression": 1, "Speed": 2, "Acceleration": 1, "Physical Contact": 2, "Jumping": 2, "Low Pass": 2, "Lofted Pass": 2, "Ball Control": 1 },
      skills: ["Interception", "Blocker", "Aerial Superiority", "Acrobatic Clearance", "Man Marking", "Sliding Tackle", "One-touch Pass", "Low Lofted Pass", "Weighted Pass"]
    },
    "Terzo DC (braccetto)": {
      weights: { "Defensive Awareness": 3, "Tackling": 2, "Defensive Engagement": 2, "Aggression": 1, "Speed": 2, "Acceleration": 2, "Low Pass": 2, "Lofted Pass": 2, "Stamina": 1, "Physical Contact": 1 },
      skills: ["Interception", "Blocker", "Man Marking", "Acrobatic Clearance", "Aerial Superiority", "Sliding Tackle", "One-touch Pass", "Low Lofted Pass", "Track Back"]
    },
    "Terzino difensivo": {
      weights: { "Defensive Awareness": 3, "Defensive Engagement": 3, "Tackling": 2, "Aggression": 1, "Speed": 3, "Acceleration": 2, "Stamina": 2, "Physical Contact": 1, "Low Pass": 1, "Lofted Pass": 1 },
      skills: ["Man Marking", "Interception", "Blocker", "Acrobatic Clearance", "Aerial Superiority", "Sliding Tackle", "One-touch Pass", "Low Lofted Pass", "Track Back"]
    },
    "Terzino offensivo": {
      weights: { "Speed": 3, "Acceleration": 3, "Stamina": 3, "Lofted Pass": 2, "Low Pass": 1, "Curl": 1, "Dribbling": 1, "Defensive Awareness": 2, "Tackling": 1, "Defensive Engagement": 2 },
      skills: ["Track Back", "Interception", "Man Marking", "Blocker", "Pinpoint Crossing", "One-touch Pass", "Through Passing", "Sliding Tackle"]
    },
    "MED collante": {
      weights: { "Defensive Awareness": 3, "Defensive Engagement": 3, "Tackling": 2, "Aggression": 2, "Low Pass": 2, "Lofted Pass": 2, "Physical Contact": 2, "Stamina": 2, "Jumping": 1, "Speed": 1 },
      skills: ["Interception", "Blocker", "Man Marking", "Aerial Superiority", "Sliding Tackle", "Acrobatic Clearance", "One-touch Pass", "Low Lofted Pass", "Through Passing"]
    },
    "Mediano incontrista": {
      weights: { "Tackling": 3, "Aggression": 3, "Defensive Engagement": 3, "Defensive Awareness": 2, "Stamina": 2, "Acceleration": 2, "Physical Contact": 2, "Speed": 1 },
      skills: ["Interception", "Blocker", "Man Marking", "Sliding Tackle", "Track Back", "Aerial Superiority", "Acrobatic Clearance", "One-touch Pass"]
    },
    "CC box-to-box": {
      weights: { "Stamina": 3, "Low Pass": 2, "Lofted Pass": 1, "Ball Control": 2, "Defensive Awareness": 2, "Tackling": 2, "Defensive Engagement": 2, "Aggression": 1, "Physical Contact": 2, "Speed": 1, "Acceleration": 1, "Finishing": 1, "Kicking Power": 1 },
      skills: ["One-touch Pass", "Through Passing", "Interception", "Track Back", "Blocker", "Man Marking", "Long-range Shooting", "Double Touch"]
    },
    "Regista / TRQ creativo": {
      weights: { "Low Pass": 3, "Lofted Pass": 3, "Ball Control": 3, "Dribbling": 2, "Tight Possession": 2, "Attacking Awareness": 2, "Acceleration": 2, "Balance": 2, "Curl": 1, "Finishing": 1, "Kicking Power": 1 },
      skills: ["One-touch Pass", "Through Passing", "Double Touch", "Long-range Curler", "Sole Control", "Cut Behind & Turn", "First-time Shot", "Outside Curler", "Track Back"]
    },
    "Ala da tiro a giro": {
      weights: { "Curl": 3, "Dribbling": 3, "Acceleration": 3, "Finishing": 2, "Kicking Power": 2, "Ball Control": 2, "Tight Possession": 2, "Speed": 2, "Balance": 2, "Attacking Awareness": 2, "Set Piece Taking": 1 },
      skills: ["Long-range Curler", "Double Touch", "Cut Behind & Turn", "Sole Control", "First-time Shot", "Acrobatic Finishing", "Track Back", "Outside Curler", "Gamesmanship", "Fighting Spirit"]
    },
    "Opportunista": {
      weights: { "Attacking Awareness": 3, "Finishing": 3, "Acceleration": 3, "Speed": 3, "Ball Control": 2, "Dribbling": 2, "Balance": 2, "Kicking Power": 2, "Curl": 1 },
      skills: ["First-time Shot", "Acrobatic Finishing", "Long-range Curler", "Double Touch", "Sole Control", "Chip Shot Control", "Rising Shot", "Fighting Spirit"]
    },
    "Rapace d'area": {
      weights: { "Attacking Awareness": 3, "Finishing": 3, "Heading": 3, "Physical Contact": 3, "Jumping": 2, "Ball Control": 2, "Kicking Power": 2, "Acceleration": 2, "Speed": 1, "Balance": 1 },
      skills: ["First-time Shot", "Heading", "Acrobatic Finishing", "Aerial Superiority", "Long-range Curler", "Cut Behind & Turn", "Sole Control", "Fighting Spirit"]
    }
  },
  // Ruolo iniziale suggerito per ogni carta (modificabile nell'app)
  defaultRoles: {
    "Oliver Kahn": "PT", "Alessandro Costacurta": "Terzino difensivo", "Fabio Cannavaro": "DC incontrista",
    "Massimo Oddo": "Terzo DC (braccetto)", "Frank Rijkaard": "MED collante", "Kevin De Bruyne": "Regista / TRQ creativo",
    "Antoine Griezmann": "Regista / TRQ creativo", "Alessandro Del Piero": "Ala da tiro a giro", "Francisco Conceição": "Ala da tiro a giro",
    "Marco van Basten": "Rapace d'area", "Alessandro Bastoni": "DC costruttore", "Virgil van Dijk": "DC costruttore",
    "Manuel Akanji": "DC incontrista", "Dean Huijsen": "DC costruttore", "Ezri Konsa": "DC costruttore", "Marquinhos": "DC costruttore",
    "Franz Beckenbauer": "DC costruttore", "Cafu": "Terzino offensivo", "Gennaro Gattuso": "Mediano incontrista",
    "Steven Gerrard": "CC box-to-box", "Mark van Bommel": "MED collante", "Dani Olmo": "Regista / TRQ creativo",
    "Adrien Rabiot": "CC box-to-box", "Jude Bellingham": "CC box-to-box", "Neymar Jr": "Ala da tiro a giro",
    "Andriy Shevchenko": "Opportunista", "Alexandre Pato": "Opportunista", "Kaká": "Regista / TRQ creativo",
    "Gareth Bale": "Ala da tiro a giro", "Luis Suárez": "Rapace d'area"
  },

  // Interprete delle richieste in linguaggio naturale (senza AI): parole chiave -> statistiche e peso.
  // Peso 3 = statistica principale della richiesta, 2 = di supporto.
  goalKeywords: [
    { re: "tiro a giro|a giro|giro|effetto|curl", w: { "Curl": 3, "Finishing": 2, "Kicking Power": 2 } },
    { re: "velocit|veloce|rapid", w: { "Speed": 3, "Acceleration": 2 } },
    { re: "scatt|accelera|esplosiv|brucian", w: { "Acceleration": 3, "Speed": 2 } },
    { re: "dribbl|dribbling|saltare l.uomo|salta l.uomo|uno contro uno|1v1|conduzion", w: { "Dribbling": 3, "Ball Control": 2, "Tight Possession": 2, "Balance": 2 } },
    { re: "controllo|possesso|protezione palla", w: { "Ball Control": 3, "Tight Possession": 2 } },
    { re: "finalizz|tiro(?! a giro)|gol|segnare|bomber", w: { "Finishing": 3, "Kicking Power": 2, "Attacking Awareness": 2 } },
    { re: "potenza|sassat|da fuori|dalla distanza", w: { "Kicking Power": 3, "Finishing": 2 } },
    { re: "passagg|regia|assist|filtrant", w: { "Low Pass": 3, "Lofted Pass": 2 } },
    { re: "lanci|lancio|cross", w: { "Lofted Pass": 3, "Curl": 1 } },
    { re: "testa|aere|colpo di testa|palle alte", w: { "Heading": 3, "Jumping": 3, "Physical Contact": 2 } },
    { re: "fisic|forza|contatto|spalla", w: { "Physical Contact": 3, "Balance": 2 } },
    { re: "equilibrio|stabilit|controllo corpo", w: { "Balance": 3 } },
    { re: "resisten|fiato|stamina|corsa|box.to.box", w: { "Stamina": 3 } },
    { re: "inseriment|smarcament|movimento|senza palla|istinto", w: { "Attacking Awareness": 3, "Acceleration": 1 } },
    { re: "difes|marcatur|copertura", w: { "Defensive Awareness": 3, "Defensive Engagement": 3, "Tackling": 2 } },
    { re: "contrast|tackle|recupero palla|rubapalla", w: { "Tackling": 3, "Aggression": 2 } },
    { re: "aggressiv|pressing", w: { "Aggression": 3, "Defensive Engagement": 2, "Stamina": 1 } },
    { re: "punizion|calci piazzati|calcio piazzato", w: { "Set Piece Taking": 3, "Curl": 3 } },
    { re: "parat|riflessi|portiere", w: { "GK Reflexes": 3, "GK Reach": 3, "GK Awareness": 3, "GK Catching": 2, "GK Parrying": 2 } }
  ],
  // Abilità allenabili collegate a ciascuna statistica (per i consigli dell'obiettivo)
  statSkills: {
    "Curl": ["Long-range Curler", "Outside Curler"],
    "Finishing": ["First-time Shot", "Acrobatic Finishing", "Rising Shot", "Dipping Shot"],
    "Kicking Power": ["Long-range Shooting", "Rising Shot", "Knuckle Shot"],
    "Dribbling": ["Double Touch", "Cut Behind & Turn", "Scissors Feint", "Chop Turn"],
    "Ball Control": ["Sole Control", "Double Touch", "Cut Behind & Turn"],
    "Tight Possession": ["Sole Control", "Double Touch", "Gamesmanship"],
    "Balance": ["Gamesmanship"],
    "Attacking Awareness": ["First-time Shot", "Acrobatic Finishing"],
    "Low Pass": ["One-touch Pass", "Through Passing"],
    "Lofted Pass": ["Weighted Pass", "Low Lofted Pass", "Pinpoint Crossing"],
    "Heading": ["Heading", "Aerial Superiority"],
    "Jumping": ["Aerial Superiority"],
    "Physical Contact": ["Fighting Spirit"],
    "Stamina": ["Track Back"],
    "Defensive Awareness": ["Interception", "Man Marking", "Blocker"],
    "Tackling": ["Sliding Tackle", "Blocker"],
    "Defensive Engagement": ["Man Marking", "Track Back", "Acrobatic Clearance"],
    "Aggression": ["Track Back", "Interception"],
    "Set Piece Taking": ["Knuckle Shot", "Dipping Shot"],
    "GK Reflexes": ["GK Penalty Saver"],
    "GK Awareness": ["GK Low Punt", "GK Long Throw"]
  },
  // Abilità quasi sempre a basso impatto: candidate alla sostituzione (a meno che tu non le blocchi)
  lowValueSkills: ["Rabona", "No Look Pass", "Sombrero", "Heel Trick", "Long Throw"]
};

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

  // Posizioni in campo (sigle del gioco). Pesi provvisori per "Auto" e per la stima, finché non c'è la formula esatta dell'OV.
  // Le abilità sono quelle prioritarie per la posizione.
  posFromCard: { GK: "PT", CB: "DC", LB: "TS", RB: "TD", DMF: "MED", CMF: "CC", LMF: "CLS", RMF: "CLD", AMF: "TRQ", LWF: "ESA", RWF: "EDA", SS: "SP", CF: "P" },
  roles: {
    "PT": {
      weights: { "GK Awareness": 3, "GK Reflexes": 3, "GK Reach": 3, "GK Catching": 2, "GK Parrying": 2, "Jumping": 1, "Low Pass": 1, "Lofted Pass": 1 },
      skills: ["GK Low Punt", "GK Long Throw", "GK High Punt", "GK Penalty Saver", "One-touch Pass", "Low Lofted Pass"]
    },
    "DC": {
      weights: { "Defensive Awareness": 3, "Tackling": 3, "Defensive Engagement": 2, "Aggression": 2, "Heading": 2, "Jumping": 2, "Physical Contact": 2, "Speed": 2, "Acceleration": 1, "Low Pass": 1, "Lofted Pass": 1 },
      skills: ["Interception", "Blocker", "Aerial Superiority", "Acrobatic Clearance", "Man Marking", "Sliding Tackle", "One-touch Pass", "Low Lofted Pass", "Fighting Spirit"]
    },
    "TS": {
      weights: { "Defensive Awareness": 2, "Defensive Engagement": 2, "Tackling": 2, "Aggression": 1, "Speed": 3, "Acceleration": 3, "Stamina": 3, "Lofted Pass": 2, "Low Pass": 1, "Ball Control": 1, "Dribbling": 1, "Physical Contact": 1 },
      skills: ["Track Back", "Interception", "Man Marking", "Blocker", "Pinpoint Crossing", "One-touch Pass", "Low Lofted Pass", "Sliding Tackle"]
    },
    "MED": {
      weights: { "Defensive Awareness": 3, "Tackling": 3, "Defensive Engagement": 3, "Aggression": 2, "Low Pass": 2, "Lofted Pass": 2, "Physical Contact": 2, "Stamina": 2, "Ball Control": 1, "Speed": 1, "Acceleration": 1, "Jumping": 1 },
      skills: ["Interception", "Blocker", "Man Marking", "Sliding Tackle", "Track Back", "Aerial Superiority", "Acrobatic Clearance", "One-touch Pass", "Low Lofted Pass"]
    },
    "CC": {
      weights: { "Low Pass": 3, "Ball Control": 2, "Lofted Pass": 2, "Stamina": 2, "Tight Possession": 1, "Dribbling": 1, "Defensive Awareness": 2, "Tackling": 1, "Defensive Engagement": 1, "Physical Contact": 1, "Acceleration": 1, "Attacking Awareness": 1, "Kicking Power": 1 },
      skills: ["One-touch Pass", "Through Passing", "Interception", "Track Back", "Blocker", "Man Marking", "Long-range Shooting", "Double Touch"]
    },
    "CLS": {
      weights: { "Stamina": 3, "Speed": 2, "Acceleration": 2, "Lofted Pass": 2, "Low Pass": 2, "Ball Control": 2, "Dribbling": 2, "Curl": 1, "Defensive Awareness": 1, "Defensive Engagement": 1 },
      skills: ["Pinpoint Crossing", "Track Back", "One-touch Pass", "Through Passing", "Double Touch", "Interception"]
    },
    "TRQ": {
      weights: { "Low Pass": 3, "Ball Control": 3, "Lofted Pass": 2, "Dribbling": 2, "Tight Possession": 2, "Attacking Awareness": 2, "Acceleration": 2, "Balance": 2, "Curl": 1, "Finishing": 1, "Kicking Power": 1 },
      skills: ["One-touch Pass", "Through Passing", "Double Touch", "Long-range Curler", "Sole Control", "Cut Behind & Turn", "First-time Shot", "Outside Curler", "Track Back"]
    },
    "ESA": {
      weights: { "Dribbling": 3, "Acceleration": 3, "Speed": 3, "Ball Control": 2, "Tight Possession": 2, "Curl": 2, "Finishing": 2, "Attacking Awareness": 2, "Balance": 2, "Kicking Power": 1, "Lofted Pass": 1 },
      skills: ["Long-range Curler", "Double Touch", "Cut Behind & Turn", "Sole Control", "First-time Shot", "Acrobatic Finishing", "Track Back", "Outside Curler", "Gamesmanship", "Fighting Spirit"]
    },
    "SP": {
      weights: { "Attacking Awareness": 3, "Ball Control": 3, "Dribbling": 2, "Tight Possession": 2, "Finishing": 2, "Acceleration": 2, "Balance": 2, "Low Pass": 2, "Curl": 1, "Kicking Power": 1, "Speed": 1 },
      skills: ["First-time Shot", "Double Touch", "Long-range Curler", "One-touch Pass", "Through Passing", "Sole Control", "Cut Behind & Turn", "Fighting Spirit"]
    },
    "P": {
      weights: { "Attacking Awareness": 3, "Finishing": 3, "Ball Control": 2, "Kicking Power": 2, "Acceleration": 2, "Speed": 2, "Heading": 2, "Physical Contact": 2, "Jumping": 1, "Dribbling": 1, "Balance": 1 },
      skills: ["First-time Shot", "Acrobatic Finishing", "Heading", "Long-range Curler", "Double Touch", "Sole Control", "Chip Shot Control", "Rising Shot", "Fighting Spirit"]
    }
  },
  // Ordine delle posizioni nei menu; quelle speculari usano gli stessi pesi
  positions: ["PT", "DC", "TS", "TD", "MED", "CC", "CLS", "CLD", "TRQ", "ESA", "EDA", "SP", "P"],
  posAlias: { TD: "TS", CLD: "CLS", EDA: "ESA" },

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

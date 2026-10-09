/* MVK PES Builder - build, booster e abilità della rosa eFootball. Nessun server, nessuna dipendenza esterna. */
(function () {
  "use strict";
  const C = window.CONFIG, SK = window.SKILLS, SEED = window.SEED;
  const KEY = "lab-rosa-efootball-v1";
  const STAT_KEYS = Object.keys(C.stats);
  const MAX_EXTRA = 5;
  const GROUPS = ["Titolari", "Ballottaggio DC", "Panchina"];
  const TABS = [["build", "Build"], ["skills", "Abilità"], ["goal", "Obiettivo"], ["card", "Scheda"]];

  // ---------- posizioni ----------
  // Posizione iniziale: la prima indicata nel tuo Excel (es. "MED/CC" -> MED), altrimenti quella principale della carta
  function defaultPos(p) {
    const sp = SEED.players.find(x => x.id === p.id) || p;
    const first = String(sp.role || "").split(/[\/\s]+/)[0].toUpperCase();
    if (C.positions.includes(first)) return first;
    return C.posFromCard[(p.card || {}).pos] || "CC";
  }
  const prof = p => C.roles[C.posAlias[p.role] || p.role] || C.roles.CC;

  // ---------- stato ----------
  function freshState() {
    const s = JSON.parse(JSON.stringify(SEED));
    s.players.forEach(p => { p.role = defaultPos(p); p.build = p.build || {}; p.pointsOverride = null; });
    s.boosterDefs = {};
    s.captainId = (s.players.find(p => p.name === "Oliver Kahn") || {}).id || null;
    s.returnRemoved = false;
    s.ui = {};
    return migrate(s);
  }
  // Aggiornamenti dei dati salvati nel browser, ognuno applicato una sola volta
  function migrate(s) {
    s.mig = s.mig || [];
    const once = (id, fn) => { if (!s.mig.includes(id)) { fn(); s.mig.push(id); } };
    s.boosterDefs = s.boosterDefs || {};
    Object.entries(C.boosterDefsSeed || {}).forEach(([n, st]) => { if (!(s.boosterDefs[n] || []).length) s.boosterDefs[n] = st.slice(); });
    once("conceicao-build-v1", () => {
      const sp = SEED.players.find(p => p.name.startsWith("Francisco")), p = sp && s.players.find(x => x.id === sp.id);
      if (p) { if (!Object.keys(p.build || {}).length) p.build = Object.assign({}, sp.build); if (!(p.extraSkills || []).length) p.extraSkills = sp.extraSkills.slice(); }
    });
    once("gattuso-build-v1", () => {
      const sp = SEED.players.find(p => p.name === "Gennaro Gattuso"), p = sp && s.players.find(x => x.id === sp.id);
      if (p && !Object.keys(p.build || {}).length) p.build = Object.assign({}, sp.build);
    });
    // Build reali inserite da Albe: sovrascrivono quelle calcolate in automatico
    once("real-builds-v2", () => {
      ["Gennaro Gattuso", "Francisco"].forEach(n => {
        const sp = SEED.players.find(p => p.name.startsWith(n)), p = sp && s.players.find(x => x.id === sp.id);
        if (p && sp.build) p.build = Object.assign({}, sp.build);
      });
    });
    // Dal ruolo tattico alla posizione in campo (sigle del gioco)
    once("positions-v1", () => { s.players.forEach(p => { p.role = defaultPos(p); }); });
    once("managers-v1", () => {
      s.managers = JSON.parse(JSON.stringify(C.managers));
      s.mgrId = "conte"; s.teamStyle = "Contropiede veloce"; s.mgrOn = s.manager ? s.manager.on !== false : true;
      delete s.manager;
    });
    s.ui = Object.assign({ view: "player", playerId: s.players[0].id, tab: "build", mode: "mgr", sheet: null, q: "" }, s.ui || {});
    if (!["player", "stock", "data", "settings"].includes(s.ui.view)) s.ui.view = "player";
    if (!TABS.some(t => t[0] === s.ui.tab)) s.ui.tab = "build";
    s.ui.sheet = null;
    return s;
  }
  let S;
  try { const raw = JSON.parse(localStorage.getItem(KEY)); S = raw ? migrate(raw) : freshState(); } catch (e) { S = freshState(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage non disponibile */ } }

  // Allenatore attivo: booster fissi + bonus da competenza nello stile di squadra scelto
  function mgrInfo(m) {
    const i = C.teamStyles.indexOf(S.teamStyle), prof = m && i >= 0 ? m.prof[i] : 0;
    const rule = C.proficiencyBoost.slice().sort((a, b) => b.min - a.min).find(r => prof >= r.min);
    return { prof, pct: rule ? rule.pct : 0 };
  }
  function activeMgr() {
    if (!S.mgrOn) return null;
    const m = S.managers.find(x => x.id === S.mgrId); if (!m) return null;
    return Object.assign({ name: m.name, add: m.add }, mgrInfo(m));
  }
  // ---------- utilità ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const it = k => (SK[k] ? SK[k].it : k);
  const isSpecial = k => !!(SK[k] && SK[k].special);
  const player = id => S.players.find(p => p.id === id);
  const cur = () => player(S.ui.playerId) || S.players[0];
  const band = v => v >= 90 ? "b90" : v >= 80 ? "b80" : v >= 70 ? "b70" : "b0";
  const WF = { "Almost Never": "Quasi mai", "Rarely": "Raramente", "Occasionally": "Sporadicamente", "Regularly": "Regolarmente", "Medium": "Media", "High": "Alta", "Very High": "Molto alta", "Low": "Bassa" };
  const FORM = { "Unwavering": "Incrollabile", "Standard": "Normale", "Inconsistent": "Incostante" };
  const STYLE = { "Goal Poacher": "Opportunista", "Fox in the Box": "Rapace d'area", "Prolific Winger": "Ala prolifica", "Hole Player": "Giocatore chiave", "Creative Playmaker": "Regista creativo", "Box-to-Box": "Onnipresente", "Anchor Man": "Collante", "Build Up": "Sviluppo", "Attacking Full-back": "Terzino offensivo", "Defensive Full-back": "Terzino difensivo", "Defensive GK": "PT difensivo", "The Destroyer": "Incontrista", "Covering Role": "Ruolo di copertura", "Front Line Pressure": "Pressione in attacco", "Attack Outlet": "Fulcro dell'attacco", "All-action Defender": "Difensore instancabile", "Orchestrator": "Regista", "Basic": "Base" };
  const tr = (m, v) => m[v] || v || "-";
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2000); }

  // ---------- build ----------
  const levelCost = n => Math.ceil(n / C.levelBlock);
  const catCost = L => { let c = 0; for (let i = 1; i <= L; i++) c += levelCost(i); return c; };
  const totalPoints = p => (p.pointsOverride != null ? p.pointsOverride : p.card.points);
  const spentOf = b => C.categories.reduce((a, c) => a + catCost(b[c.key] || 0), 0);
  const spent = p => spentOf(p.build);
  const isTrending = p => p.card.cardType === "Trending";
  const canTrain = p => !isTrending(p);
  const catOf = k => C.categories.find(c => c.stats.includes(k));
  const visibleCats = p => C.categories.filter(c => p.role === "PT" ? !["shooting", "dribbling", "defending"].includes(c.key) : !c.key.startsWith("gk"));

  function trainedStats(p, build = p.build) {
    const st = {};
    STAT_KEYS.forEach(k => st[k] = p.card.stats[k]);
    C.categories.forEach(c => { const L = build[c.key] || 0; c.stats.forEach(k => st[k] = Math.min(C.statCap, st[k] + L)); });
    return st;
  }
  function boosterAdds(p) {
    const add = {};
    (p.boosters || []).forEach(b => (S.boosterDefs[b.name] || []).forEach(k => add[k] = (add[k] || 0) + b.value));
    return add;
  }
  // mode: "base" = carta, "build" = build + booster, "mgr" = build + booster + allenatore
  function statsFor(p, mode = S.ui.mode, build = p.build) {
    const out = {};
    if (mode === "base") { STAT_KEYS.forEach(k => out[k] = p.card.stats[k]); return out; }
    const tr0 = trainedStats(p, build), add = boosterAdds(p), m = activeMgr();
    // Modello verificato su 3 schermate (Conceição con Conte e Koeman, Gattuso con Conte):
    // bonus competenza = floor(valore allenato * pct%), tetto 99 su allenato + bonus, poi booster carta e booster allenatore oltre il tetto
    STAT_KEYS.forEach(k => {
      let v = tr0[k];
      if (mode === "mgr" && m) v = Math.min(C.statCap, v + Math.floor(v * Math.round(m.pct * 10) / 1000));
      out[k] = v + (add[k] || 0) + (mode === "mgr" && m ? (m.add[k] || 0) : 0);
    });
    return out;
  }
  function weightedScore(stats, w) {
    let a = 0, t = 0;
    Object.entries(w).forEach(([k, v]) => { a += v * stats[k]; t += v; });
    return t ? a / t : 0;
  }
  // Ottimizzatore: 1) raggiunge i minimi richiesti, 2) spende il resto dove il peso guadagnato per punto è massimo
  const marginal = v => v >= C.statCap ? 0 : v >= 95 ? 0.15 : v >= 90 ? 0.35 : v >= 85 ? 0.6 : v >= 80 ? 0.8 : 1;
  function optimize(p, fromZero, w = prof(p).weights, mins = {}) {
    const b = fromZero ? {} : Object.assign({}, p.build);
    let left = totalPoints(p) - spentOf(b);
    Object.entries(mins).filter(([, v]) => v > 0).sort((x, y) => (w[y[0]] || 0) - (w[x[0]] || 0)).forEach(([k, v]) => {
      const c = catOf(k); if (!c) return;
      for (;;) {
        if (statsFor(p, "build", b)[k] >= v || trainedStats(p, b)[k] >= C.statCap) break;
        const cost = levelCost((b[c.key] || 0) + 1);
        if (cost > left) break;
        b[c.key] = (b[c.key] || 0) + 1; left -= cost;
      }
    });
    for (;;) {
      const st = trainedStats(p, b);
      let best = null;
      C.categories.forEach(c => {
        const cost = levelCost((b[c.key] || 0) + 1);
        if (cost > left) return;
        // rendimento decrescente: oltre 80 ogni punto vale meno, a 99 zero (evita build tipo Difesa 20)
        const gain = c.stats.reduce((a, k) => a + (w[k] || 0) * marginal(st[k]), 0);
        if (gain <= 0) return;
        const r = gain / cost;
        if (!best || r > best.r) best = { k: c.key, r, cost };
      });
      if (!best) break;
      b[best.k] = (b[best.k] || 0) + 1; left -= best.cost;
    }
    return b;
  }

  // ---------- obiettivo ----------
  const goalOf = p => (p.goal = p.goal || { text: "", weights: {}, mins: {}, blend: true });
  const goalKeys = p => Object.keys(goalOf(p).weights).filter(k => goalOf(p).weights[k] > 0);
  function parseGoal(text) {
    const t = " " + text.toLowerCase() + " ", w = {}, mins = {};
    C.goalKeywords.forEach(g => { if (new RegExp(g.re).test(t)) Object.entries(g.w).forEach(([k, v]) => { w[k] = Math.max(w[k] || 0, v); }); });
    C.goalKeywords.forEach(g => {
      const m = t.match(new RegExp("(?:" + g.re + ")[^0-9,;.]{0,14}(\\d{2,3})"));
      if (m) { const main = Object.entries(g.w).sort((a, b) => b[1] - a[1])[0][0]; mins[main] = Number(m[1]); }
    });
    return { w, mins };
  }
  function goalWeights(p) {
    const g = goalOf(p), w = {};
    Object.entries(g.weights).forEach(([k, v]) => { if (v > 0) w[k] = v; });
    if (g.blend) Object.entries(prof(p).weights).forEach(([k, v]) => { w[k] = (w[k] || 0) + v / 3; });
    return w;
  }
  function goalSkills(p) {
    const g = goalOf(p), own = owned(p), score = {};
    Object.entries(g.weights).forEach(([k, v]) => (C.statSkills[k] || []).forEach(s => { if (!own.has(s) && !isSpecial(s)) score[s] = (score[s] || 0) + v; }));
    return Object.entries(score).sort((a, b) => b[1] - a[1]).map(x => x[0]).slice(0, 6);
  }
  const boosterFit = (name, w) => (S.boosterDefs[name] || []).reduce((a, k) => a + (w[k] || 0), 0);

  // ---------- abilità ----------
  const owned = p => new Set([...p.baseSkills, ...p.extraSkills]);
  function skillValue(p, k) {
    if ((p.lockedExtras || []).includes(k)) return "lock";
    const role = prof(p);
    if (role.skills.includes(k)) return "key";
    if (k === "Super-sub") return p.group === "Panchina" ? "key" : "weak";
    if (k === "Captaincy") return p.id === S.captainId ? "key" : "weak";
    if (C.lowValueSkills.includes(k)) return "weak";
    const cat = SK[k] && SK[k].cat;
    if (["DC", "TS", "TD", "MED"].includes(p.role) && (cat === "dri" || cat === "sho")) return "weak";
    if (p.role === "PT" && cat !== "gk" && cat !== "pas") return "weak";
    return "neutral";
  }
  function warnings(p) {
    const w = [], all = owned(p);
    if (all.has("Super-sub") && p.group === "Titolari") w.push("Ha Riserva di lusso ma è titolare: l'abilità funziona solo se entra dalla panchina nel secondo tempo.");
    if (all.has("Captaincy") && p.id !== S.captainId) w.push("Ha Leader ma non è il capitano: conta solo sul capitano (Impostazioni).");
    return w;
  }

  // ---------- render ----------
  function render() {
    document.querySelectorAll("[data-view]").forEach(b => b.setAttribute("aria-current", String(b.dataset.view === S.ui.view)));
    const m = $("#main");
    if (S.ui.view === "stock") m.innerHTML = viewStock();
    else if (S.ui.view === "settings") m.innerHTML = viewSettings();
    else if (S.ui.view === "data") m.innerHTML = viewData();
    else m.innerHTML = viewPlayer(cur());
    renderSheet();
    save();
  }

  // Scheda in basso (bottom sheet) per scelte lunghe: giocatore, slot abilità
  function renderSheet() {
    const el = $("#sheet"), s = S.ui.sheet;
    if (!s) { el.hidden = true; el.innerHTML = ""; document.body.classList.remove("noscroll"); return; }
    el.hidden = false; document.body.classList.add("noscroll");
    el.innerHTML = `<div class="sheet-bg" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true">${s.type === "players" ? sheetPlayers() : sheetSlot(cur(), s.i)}</div>`;
    const f = el.querySelector("[data-autofocus]"); if (f) f.focus();
  }
  function sheetPlayers() {
    const q = (S.ui.q || "").toLowerCase();
    let h = `<div class="sh-head"><h3>Scegli giocatore</h3><button class="x" data-act="closeSheet" aria-label="Chiudi">×</button></div>
      <input type="search" class="search" placeholder="Cerca per nome" value="${esc(S.ui.q)}" data-act="search" aria-label="Cerca giocatore">`;
    GROUPS.forEach(g => {
      const list = S.players.filter(p => p.group === g && p.name.toLowerCase().includes(q));
      if (!list.length) return;
      h += `<h4>${g}</h4><div class="plist">${list.map(p => `<button class="prow" data-act="pick" data-id="${p.id}" aria-current="${p.id === S.ui.playerId}">
        ${p.img ? `<img src="${p.img}" alt="" loading="lazy">` : `<span class="noimg"></span>`}
        <span class="pinfo"><b>${esc(p.name)}</b><small>${esc(p.role)}</small></span>
        ${p.weekForm ? `<span class="tf f${esc(p.weekForm)}">${esc(p.weekForm)}</span>` : ""}</button>`).join("")}</div>`;
    });
    return h;
  }
  function sheetSlot(p, i) {
    const k = p.extraSkills[i], role = prof(p), own = owned(p);
    const avail = Object.entries(S.stock).filter(([s, q]) => q > 0 && !own.has(s));
    const rec = avail.filter(([s]) => role.skills.includes(s)), other = avail.filter(([s]) => !role.skills.includes(s));
    const opt = ([s, q]) => `<button class="opt" data-act="pickSkill" data-k="${esc(s)}"><span>${esc(it(s))}</span><small>${q} in magazzino</small></button>`;
    let h = `<div class="sh-head"><h3>${k ? esc(it(k)) : `Slot ${i + 1} libero`}</h3><button class="x" data-act="closeSheet" aria-label="Chiudi">×</button></div>`;
    if (k) {
      const locked = (p.lockedExtras || []).includes(k);
      h += `<div class="acts"><button class="btn" data-act="lock" data-k="${esc(k)}">${locked ? "Sblocca" : "Blocca (la tengo)"}</button>${locked ? "" : `<button class="btn danger" data-act="remove" data-i="${i}">Elimina</button>`}</div>`;
      if (locked) return h + `<p class="muted">Abilità bloccata: sbloccala per sostituirla.</p>`;
      h += `<p class="muted">Oppure sostituiscila con:</p>`;
    }
    if (!avail.length) return h + `<p class="muted">Magazzino vuoto: aggiungi copie nella sezione Abilità.</p>`;
    if (rec.length) h += `<h4>Consigliate per ${esc(p.role)}</h4><div class="opts">${rec.map(opt).join("")}</div>`;
    if (other.length) h += `<h4>Altre in magazzino</h4><div class="opts">${other.sort((a, b) => it(a[0]).localeCompare(it(b[0]))).map(opt).join("")}</div>`;
    return h;
  }

  function viewPlayer(p) {
    const idx = S.players.indexOf(p), n = S.players.length;
    const prev = S.players[(idx - 1 + n) % n], next = S.players[(idx + 1) % n];
    const tab = S.ui.tab;
    const head = `<div class="phead">
      <button class="nav-arrow" data-act="pick" data-id="${prev.id}" aria-label="Giocatore precedente: ${esc(prev.name)}">‹</button>
      <button class="who-btn" data-act="openPlayers" aria-label="Cambia giocatore">
        ${p.img ? `<img src="${p.img}" alt="">` : `<span class="noimg"></span>`}
        <span class="who-txt"><b>${esc(p.name)}</b><small><span class="st att">${esc(tr(STYLE, p.card.attStyle))}</span> <span class="st def">${esc(tr(STYLE, p.card.defStyle))}</span></small></span>
        <span class="chev">▾</span></button>
      <button class="nav-arrow" data-act="pick" data-id="${next.id}" aria-label="Giocatore successivo: ${esc(next.name)}">›</button>
    </div>
    <div class="ptabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" data-act="tab" data-t="${k}" aria-selected="${tab === k}">${l}${k === "goal" && goalKeys(p).length ? " •" : ""}</button>`).join("")}</div>`;
    const body = tab === "skills" ? viewSkills(p) : tab === "goal" ? viewGoal(p) : tab === "card" ? viewCard(p) : viewBuild(p);
    return `<div class="sticky">${head}</div>${body}`;
  }

  function mgrBar() {
    const m = activeMgr();
    return `<div class="mgrbar">
      <label class="mgrsel"><span>Allenatore</span><select data-act="mgr" aria-label="Allenatore">
        <option value="" ${S.mgrOn ? "" : "selected"}>Nessuno</option>
        ${S.managers.map(x => `<option value="${x.id}" ${S.mgrOn && x.id === S.mgrId ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
      <label class="mgrsel"><span>Stile di squadra</span><select data-act="teamStyle" aria-label="Stile di squadra">${C.teamStyles.map(t => `<option ${t === S.teamStyle ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      ${m ? `<div class="mgrfx">${Object.entries(m.add).map(([k, v]) => `<span class="pill">${esc(C.stats[k])} +${v}</span>`).join("")}<span class="pill ${m.pct ? "ok" : "ko"}">Competenza ${m.prof}${m.pct ? ` → +${String(m.pct).replace(".", ",")}%` : " → nessun bonus"}</span></div>` : ""}
    </div>`;
  }

  function viewBuild(p) {
    const tot = totalPoints(p), sp = spent(p), mode = S.ui.mode;
    let h = `<section class="panel">
      <div class="boosters">${p.boosters.length ? p.boosters.map(b => `<span class="bchip" title="${b.condition ? esc(b.condition.text) : ""}"><i></i>${esc(b.name)} +${b.value}${b.condition ? ` <em>cond.</em>` : ""}</span>`).join("") : `<span class="bchip none"><i></i>Nessun booster</span>`}</div>
      ${mgrBar()}`;
    if (isTrending(p)) h += `<p class="muted">Carta Trending: livello fisso, nessun punto da distribuire.</p>`;
    else {
      h += `<div class="pts"><span class="ptsn"><b class="${tot != null && tot - sp > 0 ? "gold" : ""}">${tot == null ? "?" : tot - sp}</b> punti liberi su ${tot ?? "?"}</span>
        <span class="acts"><button class="btn small" data-act="opt" data-zero="1" ${tot == null ? "disabled" : ""}>Auto per posizione</button><button class="btn small ghost" data-act="reset">Azzera</button></span></div>
        <div class="levels">${visibleCats(p).map(c => {
          const L = p.build[c.key] || 0, nc = levelCost(L + 1), can = tot != null && tot - sp >= nc;
          return `<div class="lv"><span class="ln">${esc(c.name)}</span>
            <div class="lctl"><button data-act="lv" data-k="${c.key}" data-d="-1" ${L ? "" : "disabled"} aria-label="Togli un livello a ${esc(c.name)}">−</button>
            <b>${L}</b><button data-act="lv" data-k="${c.key}" data-d="1" ${can ? "" : "disabled"} aria-label="Aggiungi un livello a ${esc(c.name)}">+</button></div>
            <span class="nx">${c.stats.map(k => esc(C.stats[k])).join(" · ")}</span></div>`;
        }).join("")}</div>`;
      if (tot == null) h += `<p class="warn">Punti progressione non noti: inseriscili nella tab Scheda.</p>`;
    }
    h += `</section>`;
    const st = statsFor(p, mode), base = p.card.stats, gk = goalKeys(p), w = prof(p).weights;
    const score = weightedScore(st, w), sBase = weightedScore(base, w);
    const cols = [
      { n: "Attacco", s: C.statGroups[0].stats },
      { n: "Difesa", s: p.role === "PT" ? C.statGroups[1].stats.concat(C.statGroups[3].stats) : C.statGroups[1].stats },
      { n: "Fisico", s: C.statGroups[2].stats }
    ];
    const m = activeMgr();
    h += `<section class="panel">
      <div class="shead"><div class="seg small" role="tablist" aria-label="Valori mostrati">
        ${[["base", "Carta"], ["build", "Build"], ["mgr", m ? "+ " + m.name.split(" ").pop() : "+ allenatore"]].map(([k, l]) => `<button role="tab" data-act="mode" data-m="${k}" aria-selected="${mode === k}" ${k === "mgr" && !m ? "disabled" : ""}>${esc(l)}</button>`).join("")}</div>
        <div class="score" title="Stima provvisoria: media pesata delle statistiche che contano in questa posizione. Diventerà l'OV esatto quando avremo la formula."><b>${score.toFixed(1)}</b> stima ${esc(p.role)} (non ancora OV)${mode !== "base" && score - sBase >= 0.05 ? ` <span class="gold">+${(score - sBase).toFixed(1)}</span>` : ""}</div></div>
      <div class="scols">${cols.map(col => `<div class="scol">${col.s.map(k => {
        const v = st[k], d = v - base[k];
        return `<div class="srow ${band(v)}"><span class="sl">${esc(C.stats[k])}</span>${gk.includes(k) ? `<i class="dot" title="nel tuo obiettivo"></i>` : ""}${d > 0 ? `<small>+${d}</small>` : ""}<b class="badge ${band(v)}">${v}</b></div>`;
      }).join("")}</div>`).join("")}</div>
    </section>`;
    return h;
  }

  const WLABEL = { 3: "Principale", 2: "Importante", 1: "Utile" };
  function viewGoal(p) {
    const g = goalOf(p), keys = goalKeys(p);
    const fin = statsFor(p, "build"), base = p.card.stats;
    let h = `<section class="panel"><h3>Cosa vuoi da ${esc(p.name.split(" ").pop())}?</h3>
      <div class="gin"><input type="text" data-act="goalText" value="${esc(g.text)}" placeholder="es. velocità, dribbling e tiro a giro, velocità almeno 90" aria-label="Obiettivo">
      <button class="btn primary" data-act="goalParse">Interpreta</button></div>
      <p class="muted">Riconosce parole come velocità, scatto, dribbling, tiro a giro, finalizzazione, passaggi, testa, fisico, difesa, punizioni. Un numero dopo la parola diventa il minimo.</p>`;
    if (keys.length) {
      h += `<div class="grows">` + keys.sort((a, b) => g.weights[b] - g.weights[a]).map(k => {
        const mn = g.mins[k], ok = !mn || fin[k] >= mn;
        return `<div class="grow"><span class="gl">${esc(C.stats[k])}</span>
          <span class="gv"><b class="badge sm ${band(base[k])}">${base[k]}</b>→<b class="badge sm ${band(fin[k])}">${fin[k]}</b></span>
          <select data-act="goalW" data-k="${k}" aria-label="Importanza di ${esc(C.stats[k])}">${[3, 2, 1].map(v => `<option value="${v}" ${g.weights[k] === v ? "selected" : ""}>${WLABEL[v]}</option>`).join("")}</select>
          <input type="number" inputmode="numeric" min="0" max="120" placeholder="min" value="${mn || ""}" data-act="goalMin" data-k="${k}" aria-label="Minimo per ${esc(C.stats[k])}" class="${ok ? "" : "ko"}">
          <button class="x" data-act="goalDel" data-k="${k}" aria-label="Togli ${esc(C.stats[k])}">×</button></div>`;
      }).join("") + `</div>`;
    }
    h += `<div class="gopts"><select data-act="goalAdd" aria-label="Aggiungi statistica"><option value="">+ aggiungi statistica</option>${STAT_KEYS.filter(k => !g.weights[k]).map(k => `<option value="${k}">${esc(C.stats[k])}</option>`).join("")}</select>
      <label class="chk"><input type="checkbox" data-act="goalBlend" ${g.blend ? "checked" : ""}> considera anche la posizione</label></div>`;
    if (!isTrending(p)) h += `<div class="acts"><button class="btn primary big" data-act="optGoal" ${keys.length && totalPoints(p) != null ? "" : "disabled"}>Calcola la build</button>${keys.length ? `<button class="btn ghost" data-act="goalClear">Svuota</button>` : ""}</div>`;
    h += `</section>`;
    if (keys.length) {
      const sk = canTrain(p) ? goalSkills(p) : [], w = goalWeights(p);
      const lib = Object.keys(S.boosterDefs).filter(n => (S.boosterDefs[n] || []).length).map(n => [n, boosterFit(n, w)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const mg = S.managers.map(x => [x, Object.keys(x.add).reduce((a, k) => a + (w[k] || 0), 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
      h += `<section class="panel"><h3>Consigli per questo obiettivo</h3>
        <h4>Abilità</h4>${sk.length ? `<div class="chips">${sk.map(k => { const q = S.stock[k] || 0; return `<span class="chip ${q ? "avail" : ""}">${esc(it(k))}<small>${q ? `${q} in magazzino` : "da recuperare"}</small></span>`; }).join("")}</div>` : `<p class="muted">${canTrain(p) ? "Ha già quelle collegate." : "Trending: niente abilità extra."}</p>`}
        <h4>Allenatori che aiutano</h4>${mg.length ? `<div class="chips">${mg.map(([x]) => `<span class="chip">${esc(x.name)}<small>${Object.entries(x.add).map(([k, v]) => `${esc(C.stats[k])} +${v}`).join(", ")}</small></span>`).join("")}</div>` : `<p class="muted">Nessuno dei tuoi allenatori tocca queste statistiche.</p>`}
        <h4>Booster</h4>${lib.length ? `<div class="chips">${lib.map(x => `<span class="chip">${esc(x[0])}</span>`).join("")}</div><p class="muted">Contano solo dove puoi scegliere il 2° booster.</p>` : `<p class="muted">Nessun booster in libreria tocca queste statistiche.</p>`}
      </section>`;
    }
    return h;
  }

  function viewSkills(p) {
    const role = prof(p), own = owned(p);
    let h = `<section class="panel"><h3>Abilità della carta</h3><div class="chips">${p.baseSkills.map(k => `<span class="chip ${isSpecial(k) ? "sp" : ""}" title="${esc(k)}">${esc(it(k))}</span>`).join("")}</div></section>
      <section class="panel"><h3>Competenze aggiuntive <span class="muted">${p.extraSkills.length}/${MAX_EXTRA}</span></h3>`;
    if (!canTrain(p)) h += `<p class="muted">Carta Trending: non può imparare abilità extra.</p>`;
    else {
      h += `<div class="slots">`;
      for (let i = 0; i < MAX_EXTRA; i++) {
        const k = p.extraSkills[i];
        if (k) {
          const v = skillValue(p, k);
          h += `<button class="slot ${v}" data-act="openSlot" data-i="${i}"><span class="sname">${esc(it(k))}</span><span class="stag">${v === "key" ? "utile in " + esc(p.role) : v === "weak" ? "poco utile qui" : v === "lock" ? "bloccata" : ""}</span><span class="chev">›</span></button>`;
        } else h += `<button class="slot empty" data-act="openSlot" data-i="${i}"><span class="sname">+ Aggiungi abilità</span><span class="chev">›</span></button>`;
      }
      h += `</div><p class="muted">Tocca uno slot per aggiungere, sostituire, bloccare o eliminare.</p>`;
    }
    warnings(p).forEach(x => h += `<p class="warn">${esc(x)}</p>`);
    h += `</section>`;
    const missing = role.skills.filter(k => !own.has(k));
    h += `<section class="panel"><h3>Mancano per ${esc(p.role)}</h3>${missing.length ? `<div class="chips">${missing.map(k => { const q = S.stock[k] || 0; return `<span class="chip ${q ? "avail" : ""}">${esc(it(k))}<small>${q ? `${q} in magazzino` : "da recuperare"}</small></span>`; }).join("")}</div>` : `<p class="muted">Ha già tutte le abilità prioritarie per la posizione.</p>`}
      ${p.group === "Panchina" && !own.has("Super-sub") && canTrain(p) ? `<p class="note">Se entra quasi sempre nel secondo tempo, valuta Riserva di lusso (${S.stock["Super-sub"] || 0} in magazzino).</p>` : ""}</section>`;
    return h;
  }

  function viewCard(p) {
    const c = p.card, forms = ["", "A", "B", "C", "D", "E"];
    return `<section class="panel cardview">
      <div class="cv-img">${p.img ? `<img src="${p.img}" alt="Carta di ${esc(p.name)}">` : `<div class="noimg">Nessuna immagine</div>`}</div>
      <div class="cv-info"><h3>${esc(c.cardType)}</h3><p class="muted">${esc(c.pack)}</p>
        <div class="tiles">
          <div class="tile"><span>Altezza</span><b>${c.height ?? "-"} cm</b></div>
          <div class="tile"><span>Peso</span><b>${c.weight ?? "-"} kg</b></div>
          <div class="tile"><span>Piede</span><b>${c.foot === "L" ? "Sinistro" : "Destro"}</b></div>
          <div class="tile"><span>Posizioni</span><b>${esc(c.positions.join(" "))}</b></div>
        </div>
        <div class="attrs">
          <div><span>Frequenza piede debole</span><b>${esc(tr(WF, c.wfUsage))}</b></div>
          <div><span>Precisione piede debole</span><b>${esc(tr(WF, c.wfAcc))}</b></div>
          <div><span>Forma</span><b>${esc(tr(FORM, c.form))}</b></div>
          <div><span>Resistenza infortuni</span><b class="${c.injury === "Low" ? "red" : ""}">${esc(tr(WF, c.injury))}</b></div>
        </div></div>
    </section>
    <section class="panel"><h3>Impostazioni carta</h3>
      <div class="ctrls">
        <label>Posizione<select data-act="role">${C.positions.map(r => `<option ${r === p.role ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></label>
        <label>Gruppo<select data-act="setGroup">${GROUPS.map(g => `<option ${g === p.group ? "selected" : ""}>${g}</option>`).join("")}</select></label>
        <label>Forma settimana${p.formType === "fissa" ? `<b class="fixed">B fissa</b>` : `<select data-act="form">${forms.map(f => `<option value="${f}" ${f === p.weekForm ? "selected" : ""}>${f || "-"}</option>`).join("")}</select>`}</label>
        ${isTrending(p) ? "" : `<label>Punti progressione<input type="number" inputmode="numeric" min="0" max="200" value="${totalPoints(p) ?? ""}" data-act="points"></label>`}
      </div>
      <p><a href="${esc(c.pesdbUrl)}" target="_blank" rel="noopener">Apri la scheda su pesdb</a></p></section>
    ${p.boosters.length ? `<section class="panel"><h3>Cosa alzano i booster</h3>${p.boosters.map(b => boosterEditor(b.name) + (b.condition ? `<p class="warn">${esc(b.condition.text)}</p>` : "")).join("")}</section>` : ""}`;
  }

  function boosterEditor(n) {
    const d = S.boosterDefs[n] || [];
    return `<details class="bdef"><summary><b>${esc(n)}</b> <span class="muted">${d.length ? d.map(k => esc(C.stats[k])).join(", ") : "statistiche da impostare"}</span></summary>
      <div class="statpick">${STAT_KEYS.map(k => `<label><input type="checkbox" data-act="bdef" data-b="${esc(n)}" data-k="${k}" ${d.includes(k) ? "checked" : ""}> ${esc(C.stats[k])}</label>`).join("")}</div></details>`;
  }

  function viewStock() {
    const keys = Object.keys(SK).filter(k => !SK[k].special && SK[k].cat !== "gk").concat(Object.keys(S.stock).filter(k => !SK[k]));
    const uniq = [...new Set(keys)].sort((a, b) => (S.stock[b] || 0) - (S.stock[a] || 0) || it(a).localeCompare(it(b)));
    return `<section class="panel"><h2 class="ptitle">Magazzino abilità</h2><p class="muted">Copie salvate e giocatori a cui servirebbero nella loro posizione. ● = ha slot liberi.</p>
    <div class="stock">${uniq.map(k => {
      const q = S.stock[k] || 0;
      const who = S.players.filter(p => canTrain(p) && !owned(p).has(k) && (prof(p).skills.includes(k) || (k === "Super-sub" && p.group === "Panchina")))
        .sort((a, b) => (b.extraSkills.length < MAX_EXTRA) - (a.extraSkills.length < MAX_EXTRA) || (a.group === "Titolari" ? -1 : 1));
      return `<div class="srec ${q ? "" : "zero"}"><div class="sr1"><b>${esc(it(k))}</b><span class="lctl"><button data-act="stock" data-k="${esc(k)}" data-d="-1" ${q ? "" : "disabled"} aria-label="Togli una copia">−</button><b>${q}</b><button data-act="stock" data-k="${esc(k)}" data-d="1" aria-label="Aggiungi una copia">+</button></span></div>
        ${who.length ? `<div class="who">${who.slice(0, 8).map(p => `<button class="link" data-act="goto" data-id="${p.id}">${esc(p.name)}${p.extraSkills.length < MAX_EXTRA ? " ●" : ""}</button>`).join("")}</div>` : ""}</div>`;
    }).join("")}</div></section>`;
  }

  function allBoosterNames() {
    const s = new Set(Object.keys(S.boosterDefs));
    S.players.forEach(p => (p.boosters || []).forEach(b => s.add(b.name)));
    return [...s].sort((a, b) => a.localeCompare(b));
  }

  function viewSettings() {
    return `<section class="panel"><h2 class="ptitle">Allenatori</h2><p class="muted">Competenza per stile di squadra e booster, da efootballhub. Il bonus si applica se la competenza nello stile scelto è almeno ${C.proficiencyBoost[0].min}.</p>
      <div class="mgrs">${S.managers.map(m => `<div class="mcard ${m.id === S.mgrId && S.mgrOn ? "on" : ""}">
        <div class="mh"><b>${esc(m.name)}</b>${m.id === S.mgrId && S.mgrOn ? `<span class="pill ok">attivo</span>` : `<button class="btn small" data-act="setMgr" data-id="${m.id}">Usa</button>`}</div>
        <div class="mfx">${Object.entries(m.add).map(([k, v]) => `<span class="pill">${esc(C.stats[k])} +${v}</span>`).join("")}</div>
        <div class="mprof">${C.teamStyles.map((t, i) => `<div class="${t === S.teamStyle ? "cur" : ""}"><b class="badge sm ${band(m.prof[i])}">${m.prof[i]}</b><span>${t}</span></div>`).join("")}</div>
        ${m.links.length ? `<ul class="links">${m.links.map(l => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}</div>`).join("")}</div></section>
    <section class="panel"><h2 class="ptitle">Capitano</h2><p class="muted">Leader funziona solo sul capitano.</p>
      <select data-act="captain">${S.players.map(p => `<option value="${p.id}" ${p.id === S.captainId ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></section>
    <section class="panel"><h2 class="ptitle">Libreria booster</h2><p class="muted">Statistiche alzate da ogni booster (le vedi nel gioco toccando il booster).</p>
      ${allBoosterNames().map(boosterEditor).join("")}
      <div class="ctrls"><input type="text" data-act="newBooster" placeholder="Nome nuovo booster" aria-label="Nome nuovo booster"><button class="btn small" data-act="addBooster">Aggiungi</button></div></section>
    <section class="panel"><h2 class="ptitle">Abilità tolte</h2>
      <label class="chk"><input type="checkbox" data-act="returnRemoved" ${S.returnRemoved ? "checked" : ""}> Quando sostituisco o elimino un'abilità extra, rimettila in magazzino</label></section>
    <section class="panel"><h2 class="ptitle">Versione</h2><p class="muted">Build 202610091040. Se non vedi le novità, chiudi e riapri la pagina.</p></section>
    <section class="panel"><h2 class="ptitle">Regole di progressione</h2>
      <p class="muted">Livelli 1-${C.levelBlock} = 1 punto, poi +1 ogni ${C.levelBlock} livelli. Tetto ${C.statCap}. Verificate in gioco su Conceição.</p>
      <table class="rules">${C.categories.map(c => `<tr><td>${esc(c.name)}</td><td>${c.stats.map(k => esc(C.stats[k])).join(", ")}</td></tr>`).join("")}</table></section>`;
  }

  // ---------- dati: export / import ----------
  const LIST_SEP = " | ";
  const skillFromName = n => {
    const x = String(n).trim(); if (!x) return null;
    if (SK[x]) return x;
    const low = x.toLowerCase().replace("no-look", "no look");
    return Object.keys(SK).find(k => SK[k].it.toLowerCase() === low || k.toLowerCase() === low) || x;
  };
  const splitList = v => String(v ?? "").split(/\s*[|;]\s*/).map(s => s.trim()).filter(Boolean);
  const fmtBooster = b => b ? `${b.name} +${b.value}` : "";
  const parseBooster = v => { const m = String(v ?? "").trim().match(/^(.+?)\s*\(?\+(\d+)\)?$/); return m ? { name: m[1].trim(), value: Number(m[2]) } : null; };
  const COLS = [
    ["ID", p => p.id, (p, v) => { p.id = String(v); }],
    ["Nome", p => p.name, (p, v) => { p.name = v; }],
    ["Gruppo", p => p.group, (p, v) => { p.group = v; }],
    ["Posizione", p => p.role, (p, v) => { const x = String(v).split(/[\/\s]+/)[0].toUpperCase(); if (C.positions.includes(x)) p.role = x; else return `posizione "${v}" sconosciuta`; }],
    ["Tipo carta", p => p.card.cardType, (p, v) => { p.card.cardType = v; }],
    ["Pack", p => p.card.pack, (p, v) => { p.card.pack = v; }],
    ["Link pesdb", p => p.card.pesdbUrl, (p, v) => { p.card.pesdbUrl = v; }],
    ["Posizioni", p => p.card.positions.join(LIST_SEP), (p, v) => { p.card.positions = splitList(v); }],
    ["Stile attacco", p => p.card.attStyle, (p, v) => { p.card.attStyle = v; }],
    ["Stile difesa", p => p.card.defStyle, (p, v) => { p.card.defStyle = v; }],
    ["Altezza", p => p.card.height, (p, v) => { p.card.height = Number(v); }],
    ["Peso", p => p.card.weight, (p, v) => { p.card.weight = Number(v); }],
    ["Piede (D/S)", p => p.card.foot === "L" ? "S" : "D", (p, v) => { p.card.foot = /^s|^l/i.test(v) ? "L" : "R"; }],
    ["Uso piede debole", p => p.card.wfUsage, (p, v) => { p.card.wfUsage = v; }],
    ["Precisione piede debole", p => p.card.wfAcc, (p, v) => { p.card.wfAcc = v; }],
    ["Forma carta", p => p.card.form, (p, v) => { p.card.form = v; }],
    ["Resistenza infortuni", p => p.card.injury, (p, v) => { p.card.injury = v; }],
    ["Tipo forma (fissa/variabile)", p => p.formType, (p, v) => { p.formType = /fiss/i.test(v) ? "fissa" : "variabile"; if (p.formType === "fissa") p.weekForm = "B"; }],
    ["Forma settimana", p => p.weekForm, (p, v) => { p.weekForm = String(v).toUpperCase(); }],
    ["Punti progressione", p => totalPoints(p) ?? "", (p, v) => { p.card.points = Number(v); p.pointsOverride = null; }],
    ...STAT_KEYS.map(k => [C.stats[k], p => p.card.stats[k], (p, v) => { const n = Number(v); if (!Number.isFinite(n)) return `${C.stats[k]} non è un numero`; p.card.stats[k] = n; }]),
    ["Abilità base", p => p.baseSkills.map(it).join(LIST_SEP), (p, v) => { p.baseSkills = splitList(v).map(skillFromName); }],
    ["Abilità extra", p => p.extraSkills.map(it).join(LIST_SEP), (p, v) => { p.extraSkills = splitList(v).map(skillFromName).slice(0, MAX_EXTRA); }],
    ["Abilità bloccate", p => (p.lockedExtras || []).map(it).join(LIST_SEP), (p, v) => { p.lockedExtras = splitList(v).map(skillFromName); }],
    ["Booster 1", p => fmtBooster(p.boosters[0]), (p, v) => { const b = parseBooster(v); if (!b) return `Booster 1 "${v}" non leggibile (formato: Nome +3)`; p.boosters[0] = Object.assign(p.boosters[0] || {}, b); }],
    ["Booster 2", p => fmtBooster(p.boosters[1]), (p, v) => { const b = parseBooster(v); if (!b) return `Booster 2 "${v}" non leggibile (formato: Nome +1)`; p.boosters[1] = b; }],
    ["Condizione booster", p => (p.boosters[0] && p.boosters[0].condition ? p.boosters[0].condition.text : ""), (p, v) => { if (p.boosters[0]) p.boosters[0].condition = { type: /live/i.test(v) ? "live" : "nation", text: v }; }],
    ...C.categories.map(c => ["Lv " + c.name, p => p.build[c.key] || 0, (p, v) => { p.build[c.key] = Math.max(0, Number(v) || 0); }]),
    ["Immagine", p => p.img || "", (p, v) => { p.img = v; }],
    ["Note", p => p.status || "", (p, v) => { p.status = v; }]
  ];
  const HEAD = COLS.map(c => c[0]);
  const rowOf = p => COLS.map(c => c[1](p));
  function legendSheet() {
    return [["Campo", "Valori ammessi / note"],
      ["Liste (Posizioni, Abilità)", "Separa i valori con | oppure ;"],
      ["Abilità", "Nome italiano o inglese, come nel foglio Abilità"],
      ["Booster 1 / 2", "Formato: Nome +valore, per esempio Duelli +3"],
      ["Posizione", C.positions.join(", ")],
      ["Gruppo", GROUPS.join(", ")],
      ["Tipo carta", "Epic, Big Time, Show Time, Featured, Trending, Highlight"],
      ["Tipo forma", "fissa (Epiche e Big Time) oppure variabile"],
      ["ID", "Vuoto = carta nuova. ID esistente = aggiorna quella carta"],
      ["Riga ESEMPIO", "Le righe il cui Nome inizia con ESEMPIO vengono ignorate"],
      ["Magazzino / Booster", "Se compili questi fogli, i valori importati sostituiscono quelli attuali"],
      ["Statistiche", "Valori base della carta senza punti progressione (pesdb o gioco)"],
      ["Lv categorie", "Livelli dei punti progressione già spesi (facoltativo)"]];
  }
  const skillsSheet = () => [["Nome italiano", "Nome inglese", "Tipo"]].concat(Object.keys(SK).map(k => [SK[k].it, k, SK[k].special ? "speciale (non allenabile)" : "allenabile"]));
  function downloadWorkbook(sheets, file) {
    const wb = XLSX.utils.book_new();
    sheets.forEach(([name, aoa]) => { const ws = XLSX.utils.aoa_to_sheet(aoa); ws["!cols"] = aoa[0].map(() => ({ wch: 18 })); XLSX.utils.book_append_sheet(wb, ws, name); });
    XLSX.writeFile(wb, file);
  }
  function downloadText(text, file, type) {
    const u = URL.createObjectURL(new Blob([text], { type })), l = document.createElement("a");
    l.href = u; l.download = file; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 500);
  }
  const today = () => new Date().toISOString().slice(0, 10);
  function exportXlsx() {
    downloadWorkbook([
      ["Carte", [HEAD].concat(S.players.map(rowOf))],
      ["Magazzino", [["Abilità", "Copie"]].concat(Object.entries(S.stock).map(([k, q]) => [it(k), q]))],
      ["Booster", [["Booster", "Statistiche"]].concat(allBoosterNames().map(n => [n, (S.boosterDefs[n] || []).map(k => C.stats[k]).join(LIST_SEP)]))],
      ["Abilità", skillsSheet()], ["Legenda", legendSheet()]
    ], `mvk-pes-builder-${today()}.xlsx`);
  }
  function exportCsv() {
    const ws = XLSX.utils.aoa_to_sheet([HEAD].concat(S.players.map(rowOf)));
    downloadText("﻿" + XLSX.utils.sheet_to_csv(ws, { FS: ";" }), `mvk-pes-builder-carte-${today()}.csv`, "text/csv");
  }
  function exportTemplate() {
    const ex = S.players.find(p => p.name === "Alessandro Del Piero") || S.players[0];
    const sample = rowOf(ex); sample[0] = ""; sample[1] = "ESEMPIO " + ex.name;
    downloadWorkbook([["Carte", [HEAD, sample]], ["Magazzino", [["Abilità", "Copie"]]], ["Booster", [["Booster", "Statistiche"]]], ["Abilità", skillsSheet()], ["Legenda", legendSheet()]], "template-import-lab-rosa.xlsx");
  }
  function importWorkbook(wb) {
    const rep = { added: [], updated: [], errors: [], stock: 0, boosters: 0 };
    const sheet = wb.Sheets["Carte"] || wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
    const labelToKey = {}; STAT_KEYS.forEach(k => { labelToKey[k.toLowerCase()] = C.stats[k]; });
    rows.forEach((r, i) => {
      const n = i + 2, norm = {};
      Object.entries(r).forEach(([h, v]) => { const key = labelToKey[h.trim().toLowerCase()] || h.trim(); norm[key] = v; });
      const name = String(norm["Nome"] || "").trim();
      if (!name || /^ESEMPIO\b/i.test(name)) return;
      let id = String(norm["ID"] || "").trim();
      let p = id && player(id);
      const isNew = !p;
      if (isNew) {
        id = id || ("c-" + (name + "-" + (norm["Pack"] || "")).toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
        p = player(id) || { id, name, group: "Panchina", role: "CC", status: "", webTier: "", formType: "variabile", weekForm: "", boosters: [], baseSkills: [], extraSkills: [], lockedExtras: [], img: null, build: {}, pointsOverride: null,
          card: { pesdbId: "", pesdbUrl: "", pack: "", cardType: "", ovr: null, maxOvr: null, pos: "", positions: [], attStyle: "", defStyle: "", height: null, weight: null, foot: "R", wfUsage: "", wfAcc: "", form: "", injury: "", stats: {}, points: null } };
      }
      const errs = [];
      COLS.forEach(([h, , set]) => {
        if (h === "ID") return;
        const v = norm[h] ?? (h === "Posizione" ? norm.Ruolo : undefined);
        if (v === undefined || String(v).trim() === "") return;
        const e = set(p, String(v).trim()); if (e) errs.push(e);
      });
      p.boosters = p.boosters.filter(Boolean);
      if (isNew && !player(id)) {
        const miss = STAT_KEYS.filter(k => !Number.isFinite(p.card.stats[k]));
        if (miss.length) { rep.errors.push(`Riga ${n} (${name}): mancano ${miss.length} statistiche, carta non importata`); return; }
        S.players.push(p);
      }
      const unk = [...p.baseSkills, ...p.extraSkills].filter(k => !SK[k]);
      if (unk.length) errs.push(`abilità non riconosciute: ${unk.join(", ")}`);
      errs.forEach(e => rep.errors.push(`Riga ${n} (${name}): ${e}`));
      (isNew ? rep.added : rep.updated).push(name);
    });
    if (wb.Sheets["Magazzino"]) XLSX.utils.sheet_to_json(wb.Sheets["Magazzino"], { defval: "" }).forEach(r => {
      const k = skillFromName(r["Abilità"]); if (!k) return; S.stock[k] = Math.max(0, Number(r["Copie"]) || 0); rep.stock++;
    });
    if (wb.Sheets["Booster"]) XLSX.utils.sheet_to_json(wb.Sheets["Booster"], { defval: "" }).forEach(r => {
      const n = String(r["Booster"] || "").trim(); if (!n) return;
      const st = splitList(r["Statistiche"]).map(l => STAT_KEYS.find(k => C.stats[k].toLowerCase() === l.toLowerCase() || k.toLowerCase() === l.toLowerCase())).filter(Boolean);
      S.boosterDefs[n] = st; rep.boosters++;
    });
    return rep;
  }
  function viewData() {
    const r = S.ui.report;
    return `<section class="panel"><h2 class="ptitle">Esporta</h2>
      <p class="muted">Excel con carte, magazzino, libreria booster, dizionario abilità e legenda. Si reimporta così com'è.</p>
      <div class="acts"><button class="btn primary" data-act="exportXlsx">Esporta Excel</button><button class="btn" data-act="exportCsv">Carte in CSV</button><button class="btn ghost" data-act="export">Backup .json</button></div></section>
    <section class="panel"><h2 class="ptitle">Importa</h2>
      <p class="muted">Excel, CSV (separatore ; o ,) o backup .json. Riga con ID esistente = aggiornamento delle sole celle compilate. Riga senza ID = carta nuova.</p>
      <div class="acts"><label class="btn primary">Scegli file<input type="file" accept=".xlsx,.xls,.csv,.json" data-act="importAny" hidden></label><button class="btn" data-act="template">Scarica template</button></div>
      ${r ? `<p class="note">Import completato. Nuove: ${r.added.length}${r.added.length ? " (" + esc(r.added.join(", ")) + ")" : ""}. Aggiornate: ${r.updated.length}. Magazzino: ${r.stock}. Booster: ${r.boosters}.</p>${r.errors.map(e => `<p class="warn">${esc(e)}</p>`).join("")}` : ""}</section>
    <section class="panel"><h2 class="ptitle">Aggiungere una carta a mano</h2>
      <p class="muted">Scarica il template, compila una riga nel foglio Carte (nome, tipo, stili, piede, punti, le 26 statistiche base, abilità con i nomi del foglio Abilità) e importalo.</p></section>
    <section class="panel"><h2 class="ptitle">Ripristina</h2><div class="acts"><button class="btn ghost" data-act="wipe">Torna ai dati iniziali</button></div></section>`;
  }

  // ---------- eventi ----------
  function setBuild(p, b) { p.build = b; render(); }
  function assignSkill(p, i, k) {
    if (p.extraSkills[i]) { const old = p.extraSkills[i]; if (S.returnRemoved) S.stock[old] = (S.stock[old] || 0) + 1; p.extraSkills[i] = k; }
    else p.extraSkills.push(k);
    S.stock[k] = Math.max(0, (S.stock[k] || 0) - 1);
    S.ui.sheet = null; toast(`${it(k)} assegnata a ${p.name}`); render();
  }
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-act],[data-view]");
    if (!t || t.tagName === "SELECT" || t.tagName === "INPUT") return;
    if (t.dataset.view) { S.ui.view = t.dataset.view; S.ui.sheet = null; render(); window.scrollTo(0, 0); return; }
    const p = cur(), a = t.dataset.act;
    if (a === "pick" || a === "goto") { S.ui.playerId = t.dataset.id; S.ui.view = "player"; S.ui.sheet = null; if (a === "goto") S.ui.tab = "skills"; render(); window.scrollTo(0, 0); }
    else if (a === "openPlayers") { S.ui.sheet = { type: "players" }; render(); }
    else if (a === "openSlot") { S.ui.sheet = { type: "slot", i: Number(t.dataset.i) }; render(); }
    else if (a === "closeSheet") { S.ui.sheet = null; render(); }
    else if (a === "pickSkill") assignSkill(p, S.ui.sheet.i, t.dataset.k);
    else if (a === "tab") { S.ui.tab = t.dataset.t; render(); }
    else if (a === "mode") { S.ui.mode = t.dataset.m; render(); }
    else if (a === "lv") {
      const k = t.dataset.k, b = Object.assign({}, p.build, { [k]: Math.max(0, (p.build[k] || 0) + Number(t.dataset.d)) });
      if (spentOf(b) <= totalPoints(p)) setBuild(p, b);
    }
    else if (a === "opt") { setBuild(p, optimize(p, true)); toast("Build automatica per " + p.role); }
    else if (a === "reset") setBuild(p, {});
    else if (a === "lock") { const k = t.dataset.k; p.lockedExtras = (p.lockedExtras || []).includes(k) ? p.lockedExtras.filter(x => x !== k) : (p.lockedExtras || []).concat(k); render(); }
    else if (a === "remove") { const k = p.extraSkills.splice(Number(t.dataset.i), 1)[0]; if (S.returnRemoved) S.stock[k] = (S.stock[k] || 0) + 1; S.ui.sheet = null; toast(`${it(k)} eliminata`); render(); }
    else if (a === "stock") { const k = t.dataset.k; S.stock[k] = Math.max(0, (S.stock[k] || 0) + Number(t.dataset.d)); render(); }
    else if (a === "setMgr") { S.mgrId = t.dataset.id; S.mgrOn = true; render(); toast("Allenatore attivo cambiato"); }
    else if (a === "goalParse") {
      const g = goalOf(p), inp = $("[data-act=goalText]"); g.text = inp ? inp.value : g.text;
      const r = parseGoal(g.text);
      if (!Object.keys(r.w).length) { toast("Nessuna statistica riconosciuta: aggiungila dall'elenco"); return; }
      g.weights = r.w; g.mins = r.mins; render(); toast("Obiettivo impostato: ora premi Calcola la build");
    }
    else if (a === "goalDel") { const g = goalOf(p); delete g.weights[t.dataset.k]; delete g.mins[t.dataset.k]; render(); }
    else if (a === "goalClear") { p.goal = { text: "", weights: {}, mins: {}, blend: true }; render(); }
    else if (a === "optGoal") {
      const g = goalOf(p);
      p.build = optimize(p, true, goalWeights(p), g.mins);
      const st = statsFor(p, "build");
      const miss = Object.entries(g.mins).filter(([k, v]) => v && st[k] < v).map(([k]) => C.stats[k]);
      S.ui.tab = "build"; render(); window.scrollTo(0, 0);
      toast(miss.length ? "Minimi non raggiungibili: " + miss.join(", ") : "Build calcolata: eccola applicata");
    }
    else if (a === "exportXlsx") exportXlsx();
    else if (a === "exportCsv") exportCsv();
    else if (a === "template") exportTemplate();
    else if (a === "export") downloadText(JSON.stringify(Object.assign({}, S, { ui: undefined }), null, 1), `mvk-pes-builder-${today()}.json`, "application/json");
    else if (a === "addBooster") { const i = $("[data-act=newBooster]"), n = i && i.value.trim(); if (n) { S.boosterDefs[n] = S.boosterDefs[n] || []; render(); } }
    else if (a === "wipe") { if (confirm("Tornare ai dati iniziali? Le modifiche non esportate andranno perse.")) { S = freshState(); render(); } }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && S.ui.sheet) { S.ui.sheet = null; render(); } });
  document.addEventListener("input", e => {
    if (e.target.dataset.act === "search") {
      S.ui.q = e.target.value; renderSheet();
      const s = $("#sheet .search"); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    }
  });
  document.addEventListener("change", e => {
    const t = e.target, a = t.dataset.act; if (!a) return;
    const p = cur();
    if (a === "role") { p.role = t.value; render(); }
    else if (a === "setGroup") { p.group = t.value; render(); }
    else if (a === "form") { p.weekForm = t.value; render(); }
    else if (a === "points") { const v = t.value === "" ? null : Math.max(0, Number(t.value)); p.pointsOverride = v; if (v != null && spent(p) > v) p.build = {}; render(); }
    else if (a === "mgr") { if (t.value) { S.mgrId = t.value; S.mgrOn = true; } else { S.mgrOn = false; if (S.ui.mode === "mgr") S.ui.mode = "build"; } render(); }
    else if (a === "teamStyle") { S.teamStyle = t.value; render(); }
    else if (a === "bdef") {
      const b = t.dataset.b, k = t.dataset.k, l = new Set(S.boosterDefs[b] || []);
      t.checked ? l.add(k) : l.delete(k); S.boosterDefs[b] = [...l]; render();
      document.querySelectorAll("details.bdef").forEach(x => { const s = x.querySelector("summary b"); if (s && s.textContent === b) x.open = true; });
    }
    else if (a === "goalText") goalOf(p).text = t.value;
    else if (a === "goalW") { goalOf(p).weights[t.dataset.k] = Number(t.value); render(); }
    else if (a === "goalMin") { const g = goalOf(p), v = Number(t.value); if (v > 0) g.mins[t.dataset.k] = v; else delete g.mins[t.dataset.k]; render(); }
    else if (a === "goalAdd") { if (t.value) { goalOf(p).weights[t.value] = 2; render(); } }
    else if (a === "goalBlend") { goalOf(p).blend = t.checked; render(); }
    else if (a === "captain") { S.captainId = t.value; render(); }
    else if (a === "returnRemoved") { S.returnRemoved = t.checked; render(); }
    else if (a === "importAny") {
      const f = t.files[0]; if (!f) return;
      const done = rep => { S.ui.report = rep; render(); toast("Import completato"); };
      if (/\.json$/i.test(f.name)) {
        f.text().then(txt => {
          const d = JSON.parse(txt);
          if (!Array.isArray(d.players) || !d.stock) throw new Error("formato");
          d.ui = { view: "data", playerId: d.players[0].id };
          S = migrate(d); done({ added: [], updated: d.players.map(x => x.name), errors: [], stock: Object.keys(d.stock).length, boosters: Object.keys(d.boosterDefs || {}).length });
        }).catch(() => toast("File .json non valido: serve un backup di questa app"));
      } else {
        f.arrayBuffer().then(buf => {
          const wb = /\.csv$/i.test(f.name) ? XLSX.read(new TextDecoder("utf-8").decode(buf).replace(/^﻿/, ""), { type: "string" }) : XLSX.read(buf, { type: "array" });
          done(importWorkbook(wb));
        }).catch(err => toast("File non leggibile: " + err.message));
      }
      t.value = "";
    }
  });

  render();
})();

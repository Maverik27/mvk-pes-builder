/* MVK PES Builder - build, booster e abilità della rosa eFootball. Nessun server, nessuna dipendenza esterna. */
(function () {
  "use strict";
  const C = window.CONFIG, SK = window.SKILLS, SEED = window.SEED;
  const KEY = "lab-rosa-efootball-v1";
  const STAT_KEYS = Object.keys(C.stats);
  const MAX_EXTRA = 5;
  const GROUPS = ["Titolari", "Ballottaggio DC", "Panchina"];

  // ---------- stato ----------
  function freshState() {
    const s = JSON.parse(JSON.stringify(SEED));
    s.players.forEach(p => { p.role = C.defaultRoles[p.name] || Object.keys(C.roles)[0]; p.build = p.build || {}; p.pointsOverride = null; });
    s.boosterDefs = {};
    s.captainId = (s.players.find(p => p.name === "Oliver Kahn") || {}).id || null;
    s.returnRemoved = false;
    s.ui = { view: "player", playerId: s.players[0].id, group: "Titolari" };
    return migrate(s);
  }
  // Aggiorna i dati salvati nel browser quando l'app introduce nuove informazioni
  function migrate(s) {
    s.boosterDefs = s.boosterDefs || {};
    Object.entries(C.boosterDefsSeed || {}).forEach(([n, st]) => { if (!(s.boosterDefs[n] || []).length) s.boosterDefs[n] = st.slice(); });
    if (!s.manager) s.manager = JSON.parse(JSON.stringify(C.managerDefault));
    const seedById = {}; SEED.players.forEach(p => seedById[p.id] = p);
    s.players.forEach(p => {
      const sp = seedById[p.id];
      if (sp && sp.build && Object.keys(sp.build).length && !Object.keys(p.build || {}).length) p.build = Object.assign({}, sp.build);
      if (sp && sp.extraSkills.length && !(p.extraSkills || []).length) p.extraSkills = sp.extraSkills.slice();
    });
    s.ui = Object.assign({ view: "player", playerId: s.players[0].id, group: "Titolari", mode: "mgr", openGoal: false }, s.ui || {});
    if (!["player", "stock", "data", "settings"].includes(s.ui.view)) s.ui.view = "player";
    return s;
  }
  let S;
  try { const raw = JSON.parse(localStorage.getItem(KEY)); S = raw ? migrate(raw) : freshState(); } catch (e) { S = freshState(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage non disponibile */ } }

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
    const tr0 = trainedStats(p, build), add = boosterAdds(p), m = S.manager;
    STAT_KEYS.forEach(k => {
      let v = tr0[k] + (add[k] || 0);
      if (mode === "mgr" && m && m.on) { v += (m.add[k] || 0); v += Math.floor(v * m.pct / 100 + 0.45); }
      out[k] = v;
    });
    return out;
  }
  function weightedScore(stats, w) {
    let a = 0, t = 0;
    Object.entries(w).forEach(([k, v]) => { a += v * stats[k]; t += v; });
    return t ? a / t : 0;
  }
  // Ottimizzatore: 1) raggiunge i minimi richiesti, 2) spende il resto dove il peso guadagnato per punto è massimo
  function optimize(p, fromZero, w = C.roles[p.role].weights, mins = {}) {
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
        const gain = c.stats.reduce((a, k) => a + (st[k] < C.statCap ? (w[k] || 0) : 0), 0);
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
    if (g.blend) Object.entries(C.roles[p.role].weights).forEach(([k, v]) => { w[k] = (w[k] || 0) + v / 3; });
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
    const role = C.roles[p.role] || { skills: [] };
    if (role.skills.includes(k)) return "key";
    if (k === "Super-sub") return p.group === "Panchina" ? "key" : "weak";
    if (k === "Captaincy") return p.id === S.captainId ? "key" : "weak";
    if (C.lowValueSkills.includes(k)) return "weak";
    const cat = SK[k] && SK[k].cat;
    if (/DC|Terzino|MED|Mediano/.test(p.role) && (cat === "dri" || cat === "sho")) return "weak";
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
    else m.innerHTML = viewPicker() + viewPlayer(cur());
    save();
  }

  function viewPicker() {
    const list = S.players.filter(p => p.group === S.ui.group);
    return `<section class="picker" aria-label="Scegli giocatore">
      <div class="seg" role="tablist">${GROUPS.map(g => `<button role="tab" data-act="group" data-g="${g}" aria-selected="${g === S.ui.group}">${g} <span>${S.players.filter(p => p.group === g).length}</span></button>`).join("")}</div>
      <div class="strip">${list.map(p => `<button class="thumb" data-act="pick" data-id="${p.id}" aria-current="${p.id === S.ui.playerId}" title="${esc(p.name)}">
        ${p.img ? `<img src="${p.img}" alt="" loading="lazy">` : `<span class="noimg">${esc(p.name.split(" ").pop())}</span>`}
        <span class="tn">${esc(p.name.split(" ").pop())}</span>${p.weekForm ? `<span class="tf f${esc(p.weekForm)}">${esc(p.weekForm)}</span>` : ""}</button>`).join("")}</div>
    </section>`;
  }

  function viewPlayer(p) {
    return viewHero(p) + viewBuildBar(p) + viewStats(p) + viewGoal(p) + viewSkills(p) + viewBoosterDefs(p);
  }

  function viewHero(p) {
    const c = p.card, m = S.manager;
    const forms = ["", "A", "B", "C", "D", "E"];
    return `<section class="panel hero">
      <div class="hhead">
        <div><h2 class="pname">${esc(p.name)}</h2>
          <div class="styles"><span class="st att">${esc(tr(STYLE, c.attStyle))}</span><span class="st def">${esc(tr(STYLE, c.defStyle))}</span></div></div>
        <div class="tag">${esc(c.cardType)}<br><small>${esc(c.pack)}</small></div>
      </div>
      <div class="hgrid">
        <div class="cardimg">${p.img ? `<img src="${p.img}" alt="Carta di ${esc(p.name)}">` : `<div class="noimg">Nessuna immagine</div>`}</div>
        <div class="tiles">
          <div class="tile"><span>Altezza</span><b>${c.height ?? "-"} cm</b></div>
          <div class="tile"><span>Peso</span><b>${c.weight ?? "-"} kg</b></div>
          <div class="tile"><span>Piede</span><b>${c.foot === "L" ? "Sinistro" : "Destro"}</b></div>
          <div class="tile"><span>Punti</span><b>${totalPoints(p) ?? "?"}</b></div>
        </div>
        <div class="attrs">
          <div><span>Frequenza piede debole</span><b>${esc(tr(WF, c.wfUsage))}</b></div>
          <div><span>Precisione piede debole</span><b>${esc(tr(WF, c.wfAcc))}</b></div>
          <div><span>Forma</span><b>${esc(tr(FORM, c.form))}</b></div>
          <div><span>Resistenza infortuni</span><b class="${c.injury === "Low" ? "red" : ""}">${esc(tr(WF, c.injury))}</b></div>
        </div>
        <div class="mgr ${m.on ? "" : "off"}"><b>${esc(m.name)}</b><span>${m.on ? Object.entries(m.add).map(([k, v]) => `${esc(C.stats[k])} +${v}`).join(", ") + `, competenza +${m.pct}%` : "allenatore disattivato"}</span></div>
      </div>
      <div class="ctrls">
        <label>Ruolo<select data-act="role">${Object.keys(C.roles).map(r => `<option ${r === p.role ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></label>
        <label>Gruppo<select data-act="setGroup">${GROUPS.map(g => `<option ${g === p.group ? "selected" : ""}>${g}</option>`).join("")}</select></label>
        <label>Forma settimana${p.formType === "fissa" ? `<b class="fixed">B fissa</b>` : `<select data-act="form">${forms.map(f => `<option value="${f}" ${f === p.weekForm ? "selected" : ""}>${f || "-"}</option>`).join("")}</select>`}</label>
        <a class="ext" href="${esc(c.pesdbUrl)}" target="_blank" rel="noopener">Scheda pesdb</a>
      </div>
    </section>`;
  }

  function viewBuildBar(p) {
    const tot = totalPoints(p), sp = spent(p);
    let h = `<section class="panel bar">
      <div class="boosters">${p.boosters.length ? p.boosters.map(b => `<span class="bchip" title="${b.condition ? esc(b.condition.text) : ""}"><i></i>${esc(b.name)} +${b.value}${b.condition ? ` <em>cond.</em>` : ""}</span>`).join("") : `<span class="bchip none"><i></i>Nessun booster</span>`}</div>`;
    if (isTrending(p)) return h + `<p class="muted">Carta Trending: livello fisso, nessun punto da distribuire.</p></section>`;
    h += `<div class="pts"><span><b class="${tot != null && tot - sp === 0 ? "" : "gold"}">${tot == null ? "?" : tot - sp}</b> punti liberi su
      <input type="number" min="0" max="200" value="${tot ?? ""}" data-act="points" aria-label="Punti progressione totali"></span>
      <span class="acts"><button class="btn" data-act="opt" data-zero="1" ${tot == null ? "disabled" : ""}>Build per ruolo</button><button class="btn ghost" data-act="reset">Azzera</button></span></div>
      <div class="levels">${visibleCats(p).map(c => {
        const L = p.build[c.key] || 0, nc = levelCost(L + 1), can = tot != null && tot - sp >= nc;
        return `<div class="lv" title="${esc(c.name)}: ${c.stats.map(k => esc(C.stats[k])).join(", ")}">
          <span class="ln">${esc(c.name)}</span>
          <div class="lctl"><button data-act="lv" data-k="${c.key}" data-d="-1" ${L ? "" : "disabled"} aria-label="Togli un livello a ${esc(c.name)}">−</button>
          <b>${L}</b><button data-act="lv" data-k="${c.key}" data-d="1" ${can ? "" : "disabled"} aria-label="Aggiungi un livello a ${esc(c.name)}">+</button></div>
          <span class="nx">+1 = ${nc} pt</span></div>`;
      }).join("")}</div>`;
    if (tot == null) h += `<p class="warn">Punti progressione non noti per questa carta: inseriscili qui sopra.</p>`;
    return h + `</section>`;
  }

  function viewStats(p) {
    const mode = S.ui.mode, st = statsFor(p, mode), base = p.card.stats;
    const gk = goalKeys(p), w = C.roles[p.role].weights;
    const score = weightedScore(st, w), sBase = weightedScore(base, w);
    const cols = [
      { n: "Attacco", s: C.statGroups[0].stats },
      { n: "Difesa", s: p.role === "PT" ? C.statGroups[1].stats.concat(C.statGroups[3].stats) : C.statGroups[1].stats },
      { n: "Fisico", s: C.statGroups[2].stats }
    ];
    return `<section class="panel">
      <div class="shead"><div class="seg small" role="tablist" aria-label="Valori mostrati">
        ${[["base", "Carta base"], ["build", "Build"], ["mgr", "Build + " + S.manager.name.split(" ").pop()]].map(([k, l]) => `<button role="tab" data-act="mode" data-m="${k}" aria-selected="${mode === k}" ${k === "mgr" && !S.manager.on ? "disabled" : ""}>${esc(l)}</button>`).join("")}</div>
        <div class="score"><b>${score.toFixed(1)}</b> indice ${esc(p.role)}${mode !== "base" && score - sBase >= 0.05 ? ` <span class="gold">+${(score - sBase).toFixed(1)}</span>` : ""}</div></div>
      <div class="scols">${cols.map(col => `<div class="scol">${col.s.map(k => {
        const v = st[k], d = v - base[k];
        return `<div class="srow ${band(v)}"><span class="sl">${esc(C.stats[k])}</span>${gk.includes(k) ? `<i class="dot" title="obiettivo"></i>` : ""}${d > 0 ? `<small>+${d}</small>` : ""}<b class="badge ${band(v)}">${v}</b></div>`;
      }).join("")}</div>`).join("")}</div>
    </section>`;
  }

  const WLABEL = { 3: "Principale", 2: "Importante", 1: "Utile" };
  function viewGoal(p) {
    const g = goalOf(p), keys = goalKeys(p), open = S.ui.openGoal || keys.length;
    const fin = statsFor(p, "build"), base = p.card.stats;
    let h = `<section class="panel goal"><details ${open ? "open" : ""} data-act="goalToggle"><summary><h3>Obiettivo build</h3><span class="muted">${keys.length ? keys.map(k => esc(C.stats[k])).slice(0, 4).join(", ") + (keys.length > 4 ? "…" : "") : "dimmi cosa vuoi da questa carta"}</span></summary>
      <div class="gin"><input type="text" data-act="goalText" value="${esc(g.text)}" placeholder="es. velocità, dribbling e tiro a giro, velocità almeno 90" aria-label="Obiettivo">
      <button class="btn" data-act="goalParse">Interpreta</button></div>`;
    if (keys.length) {
      h += `<div class="grows">` + keys.sort((a, b) => g.weights[b] - g.weights[a]).map(k => {
        const mn = g.mins[k], ok = !mn || fin[k] >= mn;
        return `<div class="grow"><span class="gl">${esc(C.stats[k])}</span>
          <span class="gv"><b class="badge ${band(base[k])}">${base[k]}</b> → <b class="badge ${band(fin[k])}">${fin[k]}</b></span>
          <select data-act="goalW" data-k="${k}" aria-label="Importanza">${[3, 2, 1].map(v => `<option value="${v}" ${g.weights[k] === v ? "selected" : ""}>${WLABEL[v]}</option>`).join("")}</select>
          <input type="number" min="0" max="120" placeholder="min" value="${mn || ""}" data-act="goalMin" data-k="${k}" aria-label="Minimo" class="${ok ? "" : "ko"}">
          <button class="x" data-act="goalDel" data-k="${k}" aria-label="Togli ${esc(C.stats[k])}">×</button></div>`;
      }).join("") + `</div>`;
    }
    h += `<div class="gopts"><select data-act="goalAdd" aria-label="Aggiungi statistica"><option value="">+ statistica</option>${STAT_KEYS.filter(k => !g.weights[k]).map(k => `<option value="${k}">${esc(C.stats[k])}</option>`).join("")}</select>
      <label class="chk"><input type="checkbox" data-act="goalBlend" ${g.blend ? "checked" : ""}> considera anche il ruolo</label></div>`;
    if (!isTrending(p)) h += `<div class="acts"><button class="btn primary" data-act="optGoal" ${keys.length && totalPoints(p) != null ? "" : "disabled"}>Calcola build per l'obiettivo</button>${keys.length ? `<button class="btn ghost" data-act="goalClear">Svuota</button>` : ""}</div>`;
    if (keys.length) {
      const sk = canTrain(p) ? goalSkills(p) : [];
      const w = goalWeights(p);
      const lib = Object.keys(S.boosterDefs).filter(n => (S.boosterDefs[n] || []).length).map(n => [n, boosterFit(n, w)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
      h += `<div class="gsug"><div><h4>Abilità utili</h4>${sk.length ? `<div class="chips">${sk.map(k => { const q = S.stock[k] || 0; return `<span class="chip ${q ? "avail" : ""}">${esc(it(k))}<small>${q ? `magazzino ${q}` : "da recuperare"}</small></span>`; }).join("")}</div>` : `<p class="muted">${canTrain(p) ? "Ha già quelle collegate." : "Trending: niente abilità extra."}</p>`}</div>
        <div><h4>Booster adatti</h4>${lib.length ? `<div class="chips">${lib.map(x => `<span class="chip">${esc(x[0])}</span>`).join("")}</div><p class="muted">Contano solo dove puoi scegliere il 2° booster.</p>` : `<p class="muted">Compila la libreria booster in Impostazioni.</p>`}</div></div>`;
    }
    return h + `</details></section>`;
  }

  function viewSkills(p) {
    const role = C.roles[p.role], own = owned(p);
    let h = `<section class="panel"><h3>Abilità</h3><div class="chips">${p.baseSkills.map(k => `<span class="chip ${isSpecial(k) ? "sp" : ""}" title="${esc(k)}">${esc(it(k))}</span>`).join("")}</div>
      <h3>Competenze aggiuntive <span class="muted">${p.extraSkills.length}/${MAX_EXTRA}</span></h3>`;
    if (!canTrain(p)) h += `<p class="muted">Carta Trending: non può imparare abilità extra.</p>`;
    else {
      const avail = Object.entries(S.stock).filter(([k, q]) => q > 0 && !own.has(k))
        .sort((a, b) => (role.skills.includes(b[0]) - role.skills.includes(a[0])) || it(a[0]).localeCompare(it(b[0])));
      const opts = avail.map(([k, q]) => `<option value="${esc(k)}">${role.skills.includes(k) ? "★ " : ""}${esc(it(k))} (${q})</option>`).join("");
      h += `<div class="slots">`;
      for (let i = 0; i < MAX_EXTRA; i++) {
        const k = p.extraSkills[i];
        if (k) {
          const v = skillValue(p, k);
          h += `<div class="slot ${v}"><span class="sname">${esc(it(k))}</span><span class="stag">${v === "key" ? "utile al ruolo" : v === "weak" ? "poco utile qui" : v === "lock" ? "bloccata" : ""}</span>
            <span class="sacts"><button class="btn small ghost" data-act="lock" data-k="${esc(k)}">${v === "lock" ? "Sblocca" : "Blocca"}</button>
            ${v !== "lock" ? `${avail.length ? `<select data-act="replace" data-i="${i}" aria-label="Sostituisci ${esc(it(k))}"><option value="">Sostituisci…</option>${opts}</select>` : ""}<button class="btn small ghost" data-act="remove" data-i="${i}">Elimina</button>` : ""}</span></div>`;
        } else {
          h += `<div class="slot empty"><span class="sname">Slot libero</span><span class="sacts">${avail.length ? `<select data-act="add" aria-label="Aggiungi abilità"><option value="">Aggiungi dal magazzino…</option>${opts}</select>` : `<span class="muted">magazzino vuoto</span>`}</span></div>`;
        }
      }
      h += `</div>`;
    }
    warnings(p).forEach(x => h += `<p class="warn">${esc(x)}</p>`);
    const missing = role.skills.filter(k => !own.has(k));
    h += `<h3>Priorità per ${esc(p.role)}</h3>${missing.length ? `<div class="chips">${missing.map(k => { const q = S.stock[k] || 0; return `<span class="chip ${q ? "avail" : ""}">${esc(it(k))}<small>${q ? `magazzino ${q}` : "da recuperare"}</small></span>`; }).join("")}</div>` : `<p class="muted">Ha già tutte le abilità prioritarie del ruolo.</p>`}`;
    if (p.group === "Panchina" && !own.has("Super-sub") && canTrain(p)) h += `<p class="note">Se entra quasi sempre nel secondo tempo, valuta Riserva di lusso (magazzino: ${S.stock["Super-sub"] || 0}).</p>`;
    return h + `</section>`;
  }

  function boosterEditor(n) {
    const d = S.boosterDefs[n] || [];
    return `<details><summary>${esc(n)}: <span class="muted">${d.length ? d.map(k => esc(C.stats[k])).join(", ") : "statistiche da impostare"}</span></summary>
      <div class="statpick">${STAT_KEYS.map(k => `<label><input type="checkbox" data-act="bdef" data-b="${esc(n)}" data-k="${k}" ${d.includes(k) ? "checked" : ""}> ${esc(C.stats[k])}</label>`).join("")}</div></details>`;
  }
  function viewBoosterDefs(p) {
    if (!p.boosters.length) return "";
    return `<section class="panel"><h3>Cosa alzano i booster</h3>${p.boosters.map(b => boosterEditor(b.name) + (b.condition ? `<p class="warn">${esc(b.condition.text)}</p>` : "")).join("")}</section>`;
  }

  function viewStock() {
    const keys = Object.keys(SK).filter(k => !SK[k].special && SK[k].cat !== "gk").concat(Object.keys(S.stock).filter(k => !SK[k]));
    const uniq = [...new Set(keys)].sort((a, b) => (S.stock[b] || 0) - (S.stock[a] || 0) || it(a).localeCompare(it(b)));
    return `<section class="panel"><h2 class="ptitle">Magazzino abilità</h2><p class="muted">Copie salvate e giocatori a cui servirebbero per il loro ruolo (prima chi ha slot liberi).</p>
    <div class="stock">${uniq.map(k => {
      const q = S.stock[k] || 0;
      const who = S.players.filter(p => canTrain(p) && !owned(p).has(k) && (C.roles[p.role].skills.includes(k) || (k === "Super-sub" && p.group === "Panchina")))
        .sort((a, b) => (b.extraSkills.length < MAX_EXTRA) - (a.extraSkills.length < MAX_EXTRA) || (a.group === "Titolari" ? -1 : 1));
      return `<div class="srec ${q ? "" : "zero"}"><div class="sr1"><b>${esc(it(k))}</b><span class="lctl"><button data-act="stock" data-k="${esc(k)}" data-d="-1" ${q ? "" : "disabled"} aria-label="Togli una copia">−</button><b>${q}</b><button data-act="stock" data-k="${esc(k)}" data-d="1" aria-label="Aggiungi una copia">+</button></span></div>
        ${who.length ? `<div class="who">${who.slice(0, 8).map(p => `<button class="link" data-act="goto" data-id="${p.id}">${esc(p.name)}${p.extraSkills.length < MAX_EXTRA ? " ●" : ""}</button>`).join("")}</div>` : ""}</div>`;
    }).join("")}</div><p class="muted">● = ha slot extra liberi</p></section>`;
  }

  function allBoosterNames() {
    const s = new Set(Object.keys(S.boosterDefs));
    S.players.forEach(p => (p.boosters || []).forEach(b => s.add(b.name)));
    return [...s].sort((a, b) => a.localeCompare(b));
  }

  function viewSettings() {
    const m = S.manager;
    return `<section class="panel"><h2 class="ptitle">Allenatore</h2>
      <label class="chk"><input type="checkbox" data-act="mgrOn" ${m.on ? "checked" : ""}> Applica l'allenatore alle statistiche</label>
      <div class="ctrls"><label>Nome<input type="text" data-act="mgrName" value="${esc(m.name)}"></label>
      <label>Competenza %<input type="number" min="0" max="10" step="0.5" value="${m.pct}" data-act="mgrPct"></label></div>
      <p class="muted">Booster dell'allenatore (+1 su statistiche precise):</p>
      <div class="statpick">${STAT_KEYS.map(k => `<label><input type="checkbox" data-act="mgrAdd" data-k="${k}" ${m.add[k] ? "checked" : ""}> ${esc(C.stats[k])}</label>`).join("")}</div>
      <p class="muted">Calibrato su Conte con Conceição: +3% arrotondato, 22 statistiche su 22 coincidono con il gioco.</p></section>
    <section class="panel"><h2 class="ptitle">Capitano</h2><p class="muted">Leader funziona solo sul capitano.</p>
      <select data-act="captain">${S.players.map(p => `<option value="${p.id}" ${p.id === S.captainId ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></section>
    <section class="panel"><h2 class="ptitle">Libreria booster</h2><p class="muted">Statistiche alzate da ogni booster (le vedi nel gioco toccando il booster).</p>
      ${allBoosterNames().map(boosterEditor).join("")}
      <div class="ctrls"><input type="text" data-act="newBooster" placeholder="Nome nuovo booster" aria-label="Nome nuovo booster"><button class="btn small" data-act="addBooster">Aggiungi</button></div></section>
    <section class="panel"><h2 class="ptitle">Abilità tolte</h2>
      <label class="chk"><input type="checkbox" data-act="returnRemoved" ${S.returnRemoved ? "checked" : ""}> Quando sostituisco o elimino un'abilità extra, rimettila in magazzino</label></section>
    <section class="panel"><h2 class="ptitle">Regole di progressione</h2>
      <p class="muted">Livelli 1-${C.levelBlock} = 1 punto, poi +1 ogni ${C.levelBlock} livelli. Tetto statistica allenata ${C.statCap}. Verificate in gioco su Conceição.</p>
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
    ["Ruolo", p => p.role, (p, v) => { if (C.roles[v]) p.role = v; else return `ruolo "${v}" sconosciuto`; }],
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
      ["Ruolo", Object.keys(C.roles).join(", ")],
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
        p = player(id) || { id, name, group: "Panchina", role: C.defaultRoles[name] || Object.keys(C.roles)[0], status: "", webTier: "", formType: "variabile", weekForm: "", boosters: [], baseSkills: [], extraSkills: [], lockedExtras: [], img: null, build: {}, pointsOverride: null,
          card: { pesdbId: "", pesdbUrl: "", pack: "", cardType: "", ovr: null, maxOvr: null, pos: "", positions: [], attStyle: "", defStyle: "", height: null, weight: null, foot: "R", wfUsage: "", wfAcc: "", form: "", injury: "", stats: {}, points: null } };
      }
      const errs = [];
      COLS.forEach(([h, , set]) => {
        if (h === "ID") return;
        const v = norm[h];
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
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-act],[data-view]");
    if (!t || t.tagName === "SELECT" || t.tagName === "INPUT" || t.tagName === "DETAILS") return;
    if (t.dataset.view) { S.ui.view = t.dataset.view; render(); window.scrollTo(0, 0); return; }
    const p = cur(), a = t.dataset.act;
    if (a === "pick" || a === "goto") { const x = player(t.dataset.id); S.ui.playerId = x.id; S.ui.group = x.group; S.ui.view = "player"; render(); if (a === "goto") window.scrollTo(0, 0); }
    else if (a === "group") { S.ui.group = t.dataset.g; render(); }
    else if (a === "mode") { S.ui.mode = t.dataset.m; render(); }
    else if (a === "lv") {
      const k = t.dataset.k, b = Object.assign({}, p.build, { [k]: Math.max(0, (p.build[k] || 0) + Number(t.dataset.d)) });
      if (spentOf(b) <= totalPoints(p)) setBuild(p, b);
    }
    else if (a === "opt") { setBuild(p, optimize(p, !!t.dataset.zero)); toast("Build per il ruolo calcolata"); }
    else if (a === "reset") setBuild(p, {});
    else if (a === "lock") { const k = t.dataset.k; p.lockedExtras = (p.lockedExtras || []).includes(k) ? p.lockedExtras.filter(x => x !== k) : (p.lockedExtras || []).concat(k); render(); }
    else if (a === "remove") { const k = p.extraSkills.splice(Number(t.dataset.i), 1)[0]; if (S.returnRemoved) S.stock[k] = (S.stock[k] || 0) + 1; toast(`${it(k)} eliminata`); render(); }
    else if (a === "stock") { const k = t.dataset.k; S.stock[k] = Math.max(0, (S.stock[k] || 0) + Number(t.dataset.d)); render(); }
    else if (a === "goalParse") {
      const g = goalOf(p), inp = $("[data-act=goalText]"); g.text = inp ? inp.value : g.text;
      const r = parseGoal(g.text);
      if (!Object.keys(r.w).length) { toast("Nessuna statistica riconosciuta: aggiungila dall'elenco"); return; }
      g.weights = r.w; g.mins = r.mins; render(); toast("Obiettivo impostato");
    }
    else if (a === "goalDel") { const g = goalOf(p); delete g.weights[t.dataset.k]; delete g.mins[t.dataset.k]; render(); }
    else if (a === "goalClear") { p.goal = { text: "", weights: {}, mins: {}, blend: true }; render(); }
    else if (a === "optGoal") {
      const g = goalOf(p);
      setBuild(p, optimize(p, true, goalWeights(p), g.mins));
      const st = statsFor(p, "build");
      const miss = Object.entries(g.mins).filter(([k, v]) => v && st[k] < v).map(([k]) => C.stats[k]);
      toast(miss.length ? "Minimi non raggiungibili: " + miss.join(", ") : "Build calcolata per l'obiettivo");
    }
    else if (a === "exportXlsx") exportXlsx();
    else if (a === "exportCsv") exportCsv();
    else if (a === "template") exportTemplate();
    else if (a === "export") downloadText(JSON.stringify(Object.assign({}, S, { ui: undefined }), null, 1), `mvk-pes-builder-${today()}.json`, "application/json");
    else if (a === "addBooster") { const i = $("[data-act=newBooster]"), n = i && i.value.trim(); if (n) { S.boosterDefs[n] = S.boosterDefs[n] || []; render(); } }
    else if (a === "wipe") { if (confirm("Tornare ai dati iniziali? Le modifiche non esportate andranno perse.")) { S = freshState(); render(); } }
  });
  document.addEventListener("toggle", e => { if (e.target.dataset && e.target.dataset.act === "goalToggle") S.ui.openGoal = e.target.open; }, true);
  document.addEventListener("change", e => {
    const t = e.target, a = t.dataset.act; if (!a) return;
    const p = cur();
    if (a === "role") { p.role = t.value; render(); }
    else if (a === "setGroup") { p.group = t.value; S.ui.group = t.value; render(); }
    else if (a === "form") { p.weekForm = t.value; render(); }
    else if (a === "points") { const v = t.value === "" ? null : Math.max(0, Number(t.value)); p.pointsOverride = v; if (v != null && spent(p) > v) p.build = {}; render(); }
    else if (a === "bdef") {
      const b = t.dataset.b, k = t.dataset.k, l = new Set(S.boosterDefs[b] || []);
      t.checked ? l.add(k) : l.delete(k); S.boosterDefs[b] = [...l]; render();
      document.querySelectorAll("details").forEach(x => { const s = x.querySelector("summary"); if (s && s.textContent.startsWith(b + ":")) x.open = true; });
    }
    else if (a === "add" || a === "replace") {
      const k = t.value; if (!k) return;
      if (a === "add") p.extraSkills.push(k);
      else { const i = Number(t.dataset.i), old = p.extraSkills[i]; p.extraSkills[i] = k; if (S.returnRemoved) S.stock[old] = (S.stock[old] || 0) + 1; }
      S.stock[k] = Math.max(0, (S.stock[k] || 0) - 1);
      toast(`${it(k)} assegnata a ${p.name}`); render();
    }
    else if (a === "goalText") goalOf(p).text = t.value;
    else if (a === "goalW") { goalOf(p).weights[t.dataset.k] = Number(t.value); render(); }
    else if (a === "goalMin") { const g = goalOf(p), v = Number(t.value); if (v > 0) g.mins[t.dataset.k] = v; else delete g.mins[t.dataset.k]; render(); }
    else if (a === "goalAdd") { if (t.value) { goalOf(p).weights[t.value] = 2; S.ui.openGoal = true; render(); } }
    else if (a === "goalBlend") { goalOf(p).blend = t.checked; render(); }
    else if (a === "mgrOn") { S.manager.on = t.checked; if (!t.checked && S.ui.mode === "mgr") S.ui.mode = "build"; render(); }
    else if (a === "mgrName") { S.manager.name = t.value || "Allenatore"; render(); }
    else if (a === "mgrPct") { S.manager.pct = Math.max(0, Number(t.value) || 0); render(); }
    else if (a === "mgrAdd") { if (t.checked) S.manager.add[t.dataset.k] = 1; else delete S.manager.add[t.dataset.k]; render(); }
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

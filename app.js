/* Lab Rosa eFootball - simulatore di build e gestore abilità. Nessuna dipendenza, nessun server. */
(function () {
  "use strict";
  const C = window.CONFIG, SK = window.SKILLS, SEED = window.SEED;
  const KEY = "lab-rosa-efootball-v1";
  const STAT_KEYS = Object.keys(C.stats);
  const MAX_EXTRA = 5;

  // ---------- stato ----------
  function freshState() {
    const s = JSON.parse(JSON.stringify(SEED));
    s.players.forEach(p => {
      p.role = C.defaultRoles[p.name] || Object.keys(C.roles)[0];
      p.build = p.build || {};
      p.pointsOverride = null;
    });
    s.boosterDefs = {};
    s.captainId = (s.players.find(p => p.name === "Oliver Kahn") || {}).id || null;
    s.returnRemoved = false;
    s.ui = { view: "player", playerId: s.players[0].id, tab: "build", q: "" };
    return s;
  }
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || freshState(); } catch (e) { S = freshState(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage pieno o bloccato */ } }

  // ---------- utilità ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const it = k => (SK[k] ? SK[k].it : k);
  const isSpecial = k => !!(SK[k] && SK[k].special);
  const player = id => S.players.find(p => p.id === id);
  const cur = () => player(S.ui.playerId) || S.players[0];
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 1800); }

  // ---------- build ----------
  const levelCost = n => Math.ceil(n / C.levelBlock);
  const catCost = L => { let c = 0; for (let i = 1; i <= L; i++) c += levelCost(i); return c; };
  const totalPoints = p => (p.pointsOverride != null ? p.pointsOverride : p.card.points);
  const spent = p => C.categories.reduce((a, c) => a + catCost(p.build[c.key] || 0), 0);
  const canBuild = p => p.card.cardType !== "Trending" && totalPoints(p) != null;

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
  function roleScore(stats, role) {
    const w = (C.roles[role] || {}).weights || {};
    let a = 0, t = 0;
    Object.entries(w).forEach(([k, v]) => { a += v * stats[k]; t += v; });
    return t ? a / t : 0;
  }
  const catOf = k => C.categories.find(c => c.stats.includes(k));
  // Ottimizzatore: 1) raggiunge i minimi richiesti, 2) spende il resto dove il peso guadagnato per punto è massimo.
  function optimize(p, fromZero, w = C.roles[p.role].weights, mins = {}) {
    const b = fromZero ? {} : Object.assign({}, p.build);
    let left = totalPoints(p) - C.categories.reduce((a, c) => a + catCost(b[c.key] || 0), 0);
    const add = boosterAdds(p);
    Object.entries(mins).filter(([, v]) => v > 0).sort((x, y) => (w[y[0]] || 0) - (w[x[0]] || 0)).forEach(([k, v]) => {
      const c = catOf(k); if (!c) return;
      for (;;) {
        const st = trainedStats(p, b);
        if (st[k] + (add[k] || 0) >= v || st[k] >= C.statCap) break;
        const cost = levelCost((b[c.key] || 0) + 1);
        if (cost > left) break;
        b[c.key] = (b[c.key] || 0) + 1; left -= cost;
      }
    });
    for (;;) {
      const st = trainedStats(p, b);
      let best = null;
      C.categories.forEach(c => {
        const L = (b[c.key] || 0) + 1, cost = levelCost(L);
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

  // ---------- obiettivo personalizzato ----------
  const goalOf = p => (p.goal = p.goal || { text: "", weights: {}, mins: {}, blend: true });
  function parseGoal(text) {
    const t = " " + text.toLowerCase() + " ", w = {};
    C.goalKeywords.forEach(g => {
      if (new RegExp(g.re).test(t)) Object.entries(g.w).forEach(([k, v]) => { w[k] = Math.max(w[k] || 0, v); });
    });
    const mins = {};
    // "velocità 90", "dribbling almeno 92": numero dopo la parola chiave = minimo richiesto
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
    return Object.entries(score).sort((a, b) => b[1] - a[1]).map(x => x[0]).slice(0, 7);
  }
  function boosterFit(name, w) { return (S.boosterDefs[name] || []).reduce((a, k) => a + (w[k] || 0), 0); }

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
    const defRole = /DC|Terzino|MED|Mediano|PT/.test(p.role);
    if (defRole && (cat === "dri" || cat === "sho")) return "weak";
    if (p.role === "PT" && cat !== "gk" && cat !== "pas") return "weak";
    return "neutral";
  }
  function warnings(p) {
    const w = [];
    const all = owned(p);
    if (all.has("Super-sub") && p.group === "Titolari") w.push("Ha Riserva di lusso ma è tra i titolari: l'abilità funziona solo se entra dalla panchina nel secondo tempo.");
    if (all.has("Captaincy") && p.id !== S.captainId) w.push("Ha Leader ma non è il capitano: l'abilità conta solo sul capitano (lo scegli in Impostazioni).");
    if (p.extraSkills.length < MAX_EXTRA && canTrain(p)) w.push(`Ha ${MAX_EXTRA - p.extraSkills.length} slot extra liberi.`);
    return w;
  }
  const canTrain = p => p.card.cardType !== "Trending";

  // ---------- render ----------
  function render() {
    document.querySelectorAll(".navbtn").forEach(b => b.setAttribute("aria-current", String(b.dataset.view === S.ui.view)));
    renderRoster();
    const m = $("#main");
    if (S.ui.view === "stock") m.innerHTML = viewStock();
    else if (S.ui.view === "settings") m.innerHTML = viewSettings();
    else if (S.ui.view === "data") m.innerHTML = viewData();
    else m.innerHTML = viewPlayer(cur());
    save();
  }

  function renderRoster() {
    const q = (S.ui.q || "").toLowerCase();
    const groups = ["Titolari", "Ballottaggio DC", "Panchina"];
    let h = `<input class="search" type="text" placeholder="Cerca giocatore" value="${esc(S.ui.q)}" data-act="search" aria-label="Cerca giocatore">`;
    groups.forEach(g => {
      const list = S.players.filter(p => p.group === g && p.name.toLowerCase().includes(q));
      if (!list.length) return;
      h += `<div class="group-title">${g}</div>`;
      list.forEach(p => {
        const sel = S.ui.view === "player" && p.id === S.ui.playerId;
        h += `<button class="prow" data-act="pick" data-id="${p.id}" aria-current="${sel}">
          ${p.img ? `<img src="${p.img}" alt="" loading="lazy">` : `<span class="noimg"></span>`}
          <span><span class="pname">${esc(p.name)}</span><br><span class="prole">${esc(p.role)}</span></span>
          <span class="form ${esc(p.weekForm)}" title="Forma della settimana">${esc(p.weekForm || "–")}</span></button>`;
      });
    });
    $("#roster").innerHTML = h;
  }

  function mobilePicker(p) {
    return `<div class="mobile-pick"><select data-act="pickSel" aria-label="Scegli giocatore">${S.players.map(x => `<option value="${x.id}" ${x.id === p.id ? "selected" : ""}>${esc(x.name)} (${esc(x.group)})</option>`).join("")}</select></div>`;
  }

  function viewPlayer(p) {
    const c = p.card;
    const forms = ["", "A", "B", "C", "D", "E"];
    const tab = S.ui.tab;
    return `${mobilePicker(p)}
    <section class="phead">
      ${p.img ? `<img src="${p.img}" alt="Carta di ${esc(p.name)}">` : `<div class="noimg">Nessuna immagine nel file Excel</div>`}
      <div>
        <h2 class="pt">${esc(p.name)}</h2>
        <p class="meta">${esc(c.cardType)}, ${esc(c.pack)} - <a href="${c.pesdbUrl}" target="_blank" rel="noopener">scheda pesdb</a></p>
        <ul class="facts">
          <li><span>Stili</span> ${esc(c.attStyle)} / ${esc(c.defStyle)}</li>
          <li><span>Posizioni</span> ${esc(c.positions.join(", "))}</li>
          <li><span>Altezza</span> ${c.height} cm</li>
          <li><span>Piede</span> ${c.foot === "L" ? "sinistro" : "destro"}, debole ${esc(c.wfUsage)} / ${esc(c.wfAcc)}</li>
          <li><span>Forma</span> ${esc(c.form)}</li>
          <li><span>OV</span> ${c.ovr} → ${c.maxOvr} (file: ${esc(p.maxOvrExcel)})</li>
        </ul>
        <div class="controls">
          <label>Ruolo <select data-act="role">${Object.keys(C.roles).map(r => `<option ${r === p.role ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></label>
          <label>Gruppo <select data-act="group">${["Titolari", "Ballottaggio DC", "Panchina"].map(g => `<option ${g === p.group ? "selected" : ""}>${g}</option>`).join("")}</select></label>
          <label>Forma settimana ${p.formType === "fissa" ? `<strong>B (fissa)</strong>` : `<select data-act="form">${forms.map(f => `<option value="${f}" ${f === p.weekForm ? "selected" : ""}>${f || "–"}</option>`).join("")}</select>`}</label>
        </div>
      </div>
    </section>
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" data-act="tab" data-tab="build" aria-selected="${tab === "build"}">Build e booster</button>
      <button class="tab" role="tab" data-act="tab" data-tab="skills" aria-selected="${tab === "skills"}">Abilità</button>
    </div>
    ${tab === "skills" ? viewSkills(p) : viewBuild(p)}`;
  }

  function viewBuild(p) {
    const tot = totalPoints(p), sp = spent(p);
    const trained = trainedStats(p), add = boosterAdds(p);
    const final = {}; STAT_KEYS.forEach(k => final[k] = trained[k] + (add[k] || 0));
    const sBase = roleScore(p.card.stats, p.role), sFin = roleScore(final, p.role);
    const w = C.roles[p.role].weights;
    let left = "";
    if (p.card.cardType === "Trending") {
      left = `<p class="note">Carta Trending: livello fisso, nessun punto progressione da distribuire. Qui vedi statistiche e booster.</p>`;
    } else {
      if (tot == null) left += `<p class="warn">pesdb non riporta i punti progressione di questa carta. Inseriscili dal gioco qui sotto.</p>`;
      left += `<div class="budget"><div class="nums"><span><span class="big">${tot == null ? "?" : tot - sp}</span> punti liberi</span><span class="meta">${sp} usati su
        <input type="number" min="0" max="200" value="${tot ?? ""}" data-act="points" aria-label="Punti progressione totali"></span></div>
        <div class="bar"><i style="width:${tot ? Math.min(100, sp / tot * 100) : 0}%"></i></div></div>`;
      left += viewGoal(p, tot);
      left += `<h2 class="sec" style="margin-top:22px">Punti per categoria</h2>`;
      C.categories.forEach(c => {
        if (p.role !== "PT" && c.key.startsWith("gk")) return;
        if (p.role === "PT" && ["shooting", "dribbling", "defending"].includes(c.key)) return;
        const L = p.build[c.key] || 0, nc = levelCost(L + 1);
        const can = tot != null && tot - sp >= nc;
        left += `<div class="cat"><span class="cn">${esc(c.name)}</span>
          <span class="stepper"><button data-act="lv" data-k="${c.key}" data-d="-1" ${L ? "" : "disabled"} aria-label="Togli un livello a ${esc(c.name)}">−</button>
          <span class="lv">${L}</span>
          <button data-act="lv" data-k="${c.key}" data-d="1" ${can ? "" : "disabled"} aria-label="Aggiungi un livello a ${esc(c.name)}">+</button>
          <span class="nx">prossimo ${nc} pt</span></span>
          <span class="cs">${c.stats.map(k => esc(C.stats[k])).join(", ")}</span></div>`;
      });
      left += `<div class="actions">
        <button class="btn" data-act="opt" data-zero="1" ${tot == null ? "disabled" : ""}>Build per il ruolo</button>
        <button class="btn" data-act="opt" ${tot == null ? "disabled" : ""}>Completa i punti rimasti</button>
        <button class="btn ghost" data-act="reset">Azzera</button></div>
        <p class="meta">"Build per il ruolo" usa i pesi del profilo "${esc(p.role)}" (in <code>data/config.js</code>). "Completa" spende solo i punti rimasti senza toccare i livelli già messi.</p>`;
    }
    left += viewBoosters(p);

    let right = viewGoalResult(p, final) + `<div class="score"><span class="big">${sFin.toFixed(1)}</span><span>indice ruolo</span><span class="delta">${sFin - sBase >= 0.05 ? "+" + (sFin - sBase).toFixed(1) + " sulla carta base" : ""}</span></div>
      <div class="legend"><span><i style="background:var(--chalk)"></i>base</span><span><i style="background:var(--gold)"></i>build</span><span><i style="background:var(--steel)"></i>booster</span><span>• = conta per il ruolo</span></div>`;
    C.statGroups.forEach(g => {
      if (g.name === "Portiere" && p.role !== "PT") return;
      right += `<div class="sgroup"><h3>${g.name}</h3>`;
      g.stats.forEach(k => {
        const b0 = p.card.stats[k], b1 = trained[k] - b0, b2 = add[k] || 0;
        const pct = v => Math.max(0, Math.min(100, (v - 40) / (110 - 40) * 100));
        right += `<div class="srow ${w[k] ? "w" : ""}"><span class="sl">${esc(C.stats[k])}</span>
          <span class="track"><span class="b b0" style="left:0;width:${pct(b0)}%"></span>${b1 ? `<span class="b b1" style="left:${pct(b0)}%;width:${pct(b0 + b1) - pct(b0)}%"></span>` : ""}${b2 ? `<span class="b b2" style="left:${pct(b0 + b1)}%;width:${pct(b0 + b1 + b2) - pct(b0 + b1)}%"></span>` : ""}</span>
          <span class="sv">${b0 + b1 + b2}${b1 ? `<small>+${b1}</small>` : ""}${b2 ? `<small class="bo">+${b2}</small>` : ""}</span></div>`;
      });
      right += `</div>`;
    });
    return `<div class="buildgrid"><div>${left}</div><div>${right}</div></div>`;
  }

  const WLABEL = { 3: "Principale", 2: "Importante", 1: "Utile" };
  function viewGoal(p, tot) {
    const g = goalOf(p), keys = Object.keys(g.weights).filter(k => g.weights[k] > 0);
    let h = `<section class="goal"><h2 class="sec">Obiettivo build</h2>
      <p class="meta">Scrivi cosa vuoi da questa carta, per esempio "velocità, dribbling e tiro a giro" oppure "velocità almeno 90". Puoi anche aggiungere le statistiche a mano.</p>
      <div class="goalinput"><input type="text" data-act="goalText" value="${esc(g.text)}" placeholder="Cosa vuoi ottenere?" aria-label="Obiettivo della build">
      <button class="btn" data-act="goalParse">Interpreta</button></div>`;
    if (keys.length) {
      h += `<div class="goalrows">` + keys.sort((a, b) => g.weights[b] - g.weights[a]).map(k => `<div class="grow"><span>${esc(C.stats[k])}</span>
        <select data-act="goalW" data-k="${k}" aria-label="Importanza">${[3, 2, 1].map(v => `<option value="${v}" ${g.weights[k] === v ? "selected" : ""}>${WLABEL[v]}</option>`).join("")}</select>
        <input type="number" min="0" max="120" placeholder="min" value="${g.mins[k] || ""}" data-act="goalMin" data-k="${k}" aria-label="Valore minimo">
        <button class="btn small ghost" data-act="goalDel" data-k="${k}" aria-label="Togli ${esc(C.stats[k])}">Togli</button></div>`).join("") + `</div>`;
    }
    h += `<div class="controls" style="margin-top:8px"><select data-act="goalAdd" aria-label="Aggiungi statistica"><option value="">Aggiungi statistica…</option>${STAT_KEYS.filter(k => !g.weights[k]).map(k => `<option value="${k}">${esc(C.stats[k])}</option>`).join("")}</select>
      <label><input type="checkbox" data-act="goalBlend" ${g.blend ? "checked" : ""}> tieni conto anche del ruolo</label></div>`;
    if (tot !== null) h += `<div class="actions"><button class="btn primary" data-act="optGoal" ${keys.length && totalPoints(p) != null ? "" : "disabled"}>Calcola build per l'obiettivo</button>
      ${keys.length ? `<button class="btn ghost" data-act="goalClear">Svuota obiettivo</button>` : ""}</div>`;
    return h + `</section>`;
  }

  function viewGoalResult(p, final) {
    const g = goalOf(p), keys = Object.keys(g.weights).filter(k => g.weights[k] > 0);
    if (!keys.length) return "";
    const w = goalWeights(p);
    let h = `<section class="goalres"><h2 class="sec">Risultato per l'obiettivo</h2><table class="gtable"><thead><tr><th>Statistica</th><th>Carta</th><th>Con build e booster</th><th>Minimo</th></tr></thead><tbody>`;
    keys.sort((a, b) => g.weights[b] - g.weights[a]).forEach(k => {
      const m = g.mins[k], ok = !m || final[k] >= m;
      h += `<tr><td>${esc(C.stats[k])}</td><td>${p.card.stats[k]}</td><td><strong>${final[k]}</strong>${final[k] > p.card.stats[k] ? ` <small class="up">+${final[k] - p.card.stats[k]}</small>` : ""}</td><td>${m ? (ok ? `<span class="ok">${m} raggiunto</span>` : `<span class="ko">${m} non raggiunto</span>`) : "-"}</td></tr>`;
    });
    h += `</tbody></table>`;
    const sk = goalSkills(p);
    h += `<h3 class="sub">Abilità che aiutano questo obiettivo</h3>`;
    if (!canTrain(p)) h += `<p class="meta">Carta Trending: non può imparare abilità extra.</p>`;
    else if (!sk.length) h += `<p class="meta">Ha già le abilità allenabili collegate a queste statistiche.</p>`;
    else h += sk.map(k => { const q = S.stock[k] || 0; return `<div class="sug"><span>${esc(it(k))}</span><span class="q ${q ? "ok" : ""}">${q ? `in magazzino: ${q}` : "da recuperare"}</span></div>`; }).join("");
    h += `<h3 class="sub">Booster</h3>`;
    const cur = p.boosters.map(b => S.boosterDefs[b.name] ? `${esc(b.name)}: ${boosterFit(b.name, w) > 0 ? "aiuta l'obiettivo" : "non tocca queste statistiche"}` : `${esc(b.name)}: statistiche non impostate`).join("<br>");
    h += `<p>${cur || "Nessun booster."}</p>`;
    const lib = Object.keys(S.boosterDefs).filter(n => (S.boosterDefs[n] || []).length).map(n => [n, boosterFit(n, w)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
    h += lib.length ? `<p class="meta">Booster più adatti tra quelli in libreria: ${lib.map(x => esc(x[0])).join(", ")}. Contano solo dove il gioco ti lascia scegliere il 2° booster.</p>`
      : `<p class="meta">Per avere un consiglio sul booster, imposta le statistiche dei booster in Impostazioni → Libreria booster.</p>`;
    return h + `</section>`;
  }

  function viewBoosters(p) {
    let h = `<div class="boosters"><h2 class="sec">Booster</h2>`;
    if (!p.boosters.length) h += `<p class="meta">Nessun booster registrato.</p>`;
    p.boosters.forEach((b, i) => {
      const def = S.boosterDefs[b.name] || [];
      h += `<div class="booster"><div class="bh"><strong>${esc(b.name)} +${b.value}</strong>
        <span class="meta">${def.length ? def.map(k => esc(C.stats[k])).join(", ") : "statistiche non ancora impostate"}</span></div>
        ${b.condition ? `<div class="cond">${esc(b.condition.text)}</div>` : ""}
        <details><summary>Quali statistiche alza "${esc(b.name)}"</summary>
        <p class="meta">Le trovi nel gioco toccando il booster sulla carta. Le imposti una volta e valgono per tutte le carte con lo stesso booster.</p>
        <div class="statpick">${STAT_KEYS.map(k => `<label><input type="checkbox" data-act="bdef" data-b="${esc(b.name)}" data-k="${k}" ${def.includes(k) ? "checked" : ""}> ${esc(C.stats[k])}</label>`).join("")}</div>
        </details></div>`;
    });
    return h + `</div>`;
  }

  function viewSkills(p) {
    const role = C.roles[p.role];
    const own = owned(p);
    let left = `<h2 class="sec">Abilità della carta</h2><div class="chips">${p.baseSkills.map(k => `<span class="chip ${isSpecial(k) ? "sp" : ""}" title="${esc(k)}">${esc(it(k))}</span>`).join("")}</div>`;
    left += `<h2 class="sec" style="margin-top:22px">Slot extra</h2>`;
    if (!canTrain(p)) left += `<p class="note">Carta Trending: non può imparare abilità extra.</p>`;
    else {
      const avail = Object.entries(S.stock).filter(([k, q]) => q > 0 && !own.has(k))
        .sort((a, b) => (role.skills.includes(b[0]) - role.skills.includes(a[0])) || it(a[0]).localeCompare(it(b[0])));
      const opts = avail.map(([k, q]) => `<option value="${esc(k)}">${esc(it(k))} (${q})${role.skills.includes(k) ? " ★ ruolo" : ""}</option>`).join("");
      for (let i = 0; i < MAX_EXTRA; i++) {
        const k = p.extraSkills[i];
        if (k) {
          const v = skillValue(p, k);
          const tag = v === "key" ? `<span class="tag key">utile al ruolo</span>` : v === "weak" ? `<span class="tag weak">poco utile qui</span>` : v === "lock" ? `<span class="tag lock">bloccata</span>` : "";
          left += `<div class="slot"><span class="n">${i + 1}</span><span><span class="sn">${esc(it(k))}</span>${tag}</span>
            <span class="acts"><button class="btn small ghost" data-act="lock" data-k="${esc(k)}">${v === "lock" ? "Sblocca" : "Blocca"}</button>
            ${v !== "lock" && avail.length ? `<select data-act="replace" data-i="${i}" aria-label="Sostituisci ${esc(it(k))}"><option value="">Sostituisci con…</option>${opts}</select>` : ""}
            ${v !== "lock" ? `<button class="btn small ghost" data-act="remove" data-i="${i}">Elimina</button>` : ""}</span></div>`;
        } else {
          left += `<div class="slot empty"><span class="n">${i + 1}</span><span class="sn">Slot libero</span>
            <span class="acts">${avail.length ? `<select data-act="add" aria-label="Aggiungi abilità"><option value="">Aggiungi dal magazzino…</option>${opts}</select>` : `<span class="meta">magazzino vuoto</span>`}</span></div>`;
        }
      }
      left += `<p class="meta">"Blocca" protegge un'abilità che vuoi tenere anche se il ruolo non la richiede (per esempio quelle che usi in combinazione). Quando sostituisci o elimini, l'abilità tolta ${S.returnRemoved ? "torna" : "non torna"} in magazzino (lo cambi in Impostazioni).</p>`;
    }
    let right = "";
    warnings(p).forEach(x => right += `<p class="${x.startsWith("Ha ") && x.includes("slot extra liberi") ? "note" : "warn"}">${esc(x)}</p>`);
    right += `<h2 class="sec">Priorità per "${esc(p.role)}"</h2><p>Abilità che contano per il ruolo, in ordine. Quelle già possedute sono escluse.</p>`;
    const missing = role.skills.filter(k => !own.has(k));
    if (!missing.length) right += `<p class="note">Ha già tutte le abilità prioritarie del ruolo.</p>`;
    missing.forEach(k => {
      const q = S.stock[k] || 0;
      right += `<div class="sug"><span>${esc(it(k))}</span><span class="q ${q ? "ok" : ""}">${q ? `in magazzino: ${q}` : "da recuperare"}</span></div>`;
    });
    if (p.group === "Panchina" && !own.has("Super-sub")) right += `<p class="note">Se entra quasi sempre dalla panchina nel secondo tempo, valuta Riserva di lusso (in magazzino: ${S.stock["Super-sub"] || 0}).</p>`;
    return `<div class="skillsgrid"><div>${left}</div><div>${right}</div></div>`;
  }

  function viewStock() {
    const keys = Object.keys(SK).filter(k => !SK[k].special && SK[k].cat !== "gk").concat(Object.keys(S.stock).filter(k => !SK[k]));
    const uniq = [...new Set(keys)].sort((a, b) => (S.stock[b] || 0) - (S.stock[a] || 0) || it(a).localeCompare(it(b)));
    let h = `<h2 class="sec">Magazzino abilità</h2><p>Le abilità salvate che puoi insegnare. Accanto a ognuna, i giocatori della rosa a cui servirebbe per il loro ruolo (prima chi ha slot liberi).</p>
    <table class="stocktable"><thead><tr><th>Abilità</th><th>Copie</th><th>A chi serve</th></tr></thead><tbody>`;
    uniq.forEach(k => {
      const q = S.stock[k] || 0;
      const who = S.players.filter(p => canTrain(p) && !owned(p).has(k) && (C.roles[p.role].skills.includes(k) || (k === "Super-sub" && p.group === "Panchina")))
        .sort((a, b) => (b.extraSkills.length < MAX_EXTRA) - (a.extraSkills.length < MAX_EXTRA) || (a.group === "Titolari" ? -1 : 1));
      h += `<tr class="${q ? "" : "zero"}"><td>${esc(it(k))}</td>
        <td class="qty"><span class="stepper"><button data-act="stock" data-k="${esc(k)}" data-d="-1" ${q ? "" : "disabled"} aria-label="Togli una copia">−</button><span class="lv">${q}</span><button data-act="stock" data-k="${esc(k)}" data-d="1" aria-label="Aggiungi una copia">+</button></span></td>
        <td><span class="who">${who.slice(0, 8).map(p => `<button class="linkbtn" data-act="goto" data-id="${p.id}">${esc(p.name)}${p.extraSkills.length < MAX_EXTRA ? " (slot libero)" : ""}</button>`).join(" ") || `<span class="meta">nessuno</span>`}</span></td></tr>`;
    });
    return h + `</tbody></table>`;
  }

  function viewSettings() {
    return `<div class="settings">
    <section><h2 class="sec">Capitano</h2><p>Leader funziona solo sul capitano.</p>
      <select data-act="captain">${S.players.map(p => `<option value="${p.id}" ${p.id === S.captainId ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></section>
    <section><h2 class="sec">Abilità tolte</h2>
      <label><input type="checkbox" data-act="returnRemoved" ${S.returnRemoved ? "checked" : ""}> Quando sostituisco o elimino un'abilità extra, rimettila in magazzino</label></section>
    <section><h2 class="sec">Libreria booster</h2>
      <p>Per ogni booster, le statistiche che alza (le trovi nel gioco toccando il booster). Servono per le statistiche finali e per i consigli sull'obiettivo.</p>
      <table><thead><tr><th>Booster</th><th>Statistiche</th></tr></thead><tbody>
      ${allBoosterNames().map(n => { const d = S.boosterDefs[n] || []; return `<tr><td>${esc(n)}</td><td><details><summary>${d.length ? d.map(k => esc(C.stats[k])).join(", ") : "da impostare"}</summary><div class="statpick">${STAT_KEYS.map(k => `<label><input type="checkbox" data-act="bdef" data-b="${esc(n)}" data-k="${k}" ${d.includes(k) ? "checked" : ""}> ${esc(C.stats[k])}</label>`).join("")}</div></details></td></tr>`; }).join("")}
      </tbody></table>
      <div class="controls" style="margin-top:8px"><input type="text" data-act="newBooster" placeholder="Nome nuovo booster" aria-label="Nome nuovo booster"><button class="btn small" data-act="addBooster">Aggiungi booster</button></div></section>
    <section><h2 class="sec">Regole di progressione</h2>
      <p>Costo per livello: livelli 1-${C.levelBlock} = 1 punto, poi +1 ogni ${C.levelBlock} livelli. Tetto statistica allenata: ${C.statCap}. Si modificano in <code>data/config.js</code>.</p>
      <p class="warn">Da verificare in gioco: quali statistiche alza ogni categoria e il costo dei livelli. Confronta una build reale con quella dell'app prima di fidarti dei numeri.</p>
      <table><thead><tr><th>Categoria</th><th>Statistiche</th></tr></thead><tbody>${C.categories.map(c => `<tr><td>${esc(c.name)}</td><td>${c.stats.map(k => esc(C.stats[k])).join(", ")}</td></tr>`).join("")}</tbody></table></section>
    <section><h2 class="sec">Fonte dati</h2><p>Statistiche, stili e abilità base: pesdb.net (ottobre 2026). Booster, abilità extra e note: il tuo file Excel. Le 30 carte sono state abbinate confrontando le abilità base del file con quelle di pesdb.</p></section>
    </div>`;
  }

  function allBoosterNames() {
    const s = new Set(Object.keys(S.boosterDefs));
    S.players.forEach(p => (p.boosters || []).forEach(b => s.add(b.name)));
    return [...s].sort((a, b) => a.localeCompare(b));
  }

  // ---------- dati: export / import Excel e CSV ----------
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
  // Colonne del template: intestazione, lettura dal giocatore, scrittura sul giocatore
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
    const rows = [["Campo", "Valori ammessi / note"],
      ["Liste (Posizioni, Abilità)", "Separa i valori con | oppure ;"],
      ["Abilità", "Nome italiano o inglese, come nel foglio Abilità"],
      ["Booster 1 / 2", "Formato: Nome +valore, per esempio Duelli +3"],
      ["Ruolo", Object.keys(C.roles).join(", ")],
      ["Gruppo", "Titolari, Ballottaggio DC, Panchina"],
      ["Tipo carta", "Epic, Big Time, Show Time, Featured, Trending, Highlight"],
      ["Tipo forma", "fissa (Epiche e Big Time) oppure variabile"],
      ["ID", "Lascia vuoto per una carta nuova: l'app ne crea uno. Con un ID esistente la riga aggiorna quella carta"],
      ["Riga ESEMPIO", "Le righe il cui Nome inizia con ESEMPIO vengono ignorate: usala come traccia e poi cancellala"],
      ["Magazzino / Booster", "Se compili questi fogli, i valori importati sostituiscono quelli attuali"],
      ["Statistiche", "Valori base della carta a livello 1, come su pesdb o nel gioco senza punti progressione"],
      ["Lv categorie", "Livelli dei punti progressione già spesi in gioco (facoltativo)"]];
    return rows;
  }
  function skillsSheet() { return [["Nome italiano", "Nome inglese", "Tipo"]].concat(Object.keys(SK).map(k => [SK[k].it, k, SK[k].special ? "speciale (non allenabile)" : "allenabile"])); }

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
      ["Abilità", skillsSheet()],
      ["Legenda", legendSheet()]
    ], `lab-rosa-${today()}.xlsx`);
  }
  function exportCsv() {
    const ws = XLSX.utils.aoa_to_sheet([HEAD].concat(S.players.map(rowOf)));
    downloadText("﻿" + XLSX.utils.sheet_to_csv(ws, { FS: ";" }), `lab-rosa-carte-${today()}.csv`, "text/csv");
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
        if (player(id)) { p = player(id); }
        else p = { id, name, group: "Panchina", role: C.defaultRoles[name] || Object.keys(C.roles)[0], status: "", webTier: "", formType: "variabile", weekForm: "", boosters: [], baseSkills: [], extraSkills: [], lockedExtras: [], img: null, build: {}, pointsOverride: null,
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
      if (isNew) {
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
    return `<div class="settings">
    <section><h2 class="sec">Esporta</h2>
      <p>Il file Excel contiene tutte le carte (statistiche, abilità, booster, build), il magazzino abilità, la libreria booster e una legenda. Si reimporta così com'è.</p>
      <div class="actions"><button class="btn primary" data-act="exportXlsx">Esporta Excel</button>
      <button class="btn" data-act="exportCsv">Esporta carte in CSV</button>
      <button class="btn ghost" data-act="export">Backup completo (.json)</button></div></section>
    <section><h2 class="sec">Importa</h2>
      <p>Accetta lo stesso formato dell'export: Excel (.xlsx), CSV con separatore ; o , oppure un backup .json. Le righe con un ID esistente aggiornano quella carta, solo nelle celle compilate. Le righe senza ID diventano carte nuove.</p>
      <div class="actions"><label class="btn primary">Scegli file da importare<input type="file" accept=".xlsx,.xls,.csv,.json" data-act="importAny" hidden></label>
      <button class="btn" data-act="template">Scarica template vuoto</button></div>
      ${r ? `<div class="note"><strong>Import completato.</strong> Nuove: ${r.added.length}${r.added.length ? " (" + esc(r.added.join(", ")) + ")" : ""}. Aggiornate: ${r.updated.length}. Righe magazzino: ${r.stock}. Booster: ${r.boosters}.</div>${r.errors.map(e => `<p class="warn">${esc(e)}</p>`).join("")}` : ""}
    </section>
    <section><h2 class="sec">Aggiungere una carta senza AI</h2>
      <p>1. Scarica il template. 2. Nel foglio Carte compila una riga: nome, tipo carta, stili, piede, punti progressione, le 26 statistiche base e le abilità (nomi come nel foglio Abilità). 3. Importa il file. Le statistiche le prendi da pesdb.net o dalla schermata del giocatore nel gioco.</p></section>
    <section><h2 class="sec">Ripristina</h2>
      <div class="actions"><button class="btn ghost" data-act="wipe">Torna ai dati iniziali</button></div></section>
    </div>`;
  }

  // ---------- eventi ----------
  function setBuild(p, b) { p.build = b; render(); }
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-act],[data-view]");
    if (!t) return;
    if (t.dataset.view) { S.ui.view = t.dataset.view; return render(); }
    const p = cur(), a = t.dataset.act;
    if (a === "pick" || a === "goto") { S.ui.playerId = t.dataset.id; S.ui.view = "player"; if (a === "goto") S.ui.tab = "skills"; render(); window.scrollTo(0, 0); }
    else if (a === "tab") { S.ui.tab = t.dataset.tab; render(); }
    else if (a === "lv") {
      const k = t.dataset.k, L = (p.build[k] || 0) + Number(t.dataset.d);
      const b = Object.assign({}, p.build, { [k]: Math.max(0, L) });
      if (C.categories.reduce((s, c) => s + catCost(b[c.key] || 0), 0) <= totalPoints(p)) setBuild(p, b);
    }
    else if (a === "opt") { setBuild(p, optimize(p, !!t.dataset.zero)); toast("Build calcolata"); }
    else if (a === "reset") setBuild(p, {});
    else if (a === "lock") {
      const k = t.dataset.k; p.lockedExtras = p.lockedExtras || [];
      p.lockedExtras = p.lockedExtras.includes(k) ? p.lockedExtras.filter(x => x !== k) : p.lockedExtras.concat(k); render();
    }
    else if (a === "remove") {
      const k = p.extraSkills.splice(Number(t.dataset.i), 1)[0];
      if (S.returnRemoved) S.stock[k] = (S.stock[k] || 0) + 1;
      toast(`${it(k)} eliminata`); render();
    }
    else if (a === "stock") { const k = t.dataset.k; S.stock[k] = Math.max(0, (S.stock[k] || 0) + Number(t.dataset.d)); render(); }
    else if (a === "export") {
      downloadText(JSON.stringify(Object.assign({}, S, { ui: undefined }), null, 1), `lab-rosa-${today()}.json`, "application/json");
    }
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
      const add = boosterAdds(p), st = trainedStats(p);
      const miss = Object.entries(g.mins).filter(([k, v]) => v && st[k] + (add[k] || 0) < v).map(([k]) => C.stats[k]);
      toast(miss.length ? "Minimi non raggiungibili: " + miss.join(", ") : "Build calcolata per l'obiettivo");
    }
    else if (a === "exportXlsx") exportXlsx();
    else if (a === "exportCsv") exportCsv();
    else if (a === "template") exportTemplate();
    else if (a === "addBooster") { const i = $("[data-act=newBooster]"), n = i && i.value.trim(); if (n) { S.boosterDefs[n] = S.boosterDefs[n] || []; render(); } }
    else if (a === "wipe") { if (confirm("Ripristinare i dati iniziali? Le modifiche non esportate andranno perse.")) { S = freshState(); render(); } }
  });
  document.addEventListener("change", e => {
    const t = e.target, a = t.dataset.act; if (!a) return;
    const p = cur();
    if (a === "role") { p.role = t.value; render(); }
    else if (a === "group") { p.group = t.value; render(); }
    else if (a === "form") { p.weekForm = t.value; render(); }
    else if (a === "pickSel") { S.ui.playerId = t.value; render(); }
    else if (a === "points") { const v = t.value === "" ? null : Math.max(0, Number(t.value)); p.pointsOverride = v; if (v != null && spent(p) > v) p.build = {}; render(); }
    else if (a === "bdef") {
      const b = t.dataset.b, k = t.dataset.k, l = new Set(S.boosterDefs[b] || []);
      t.checked ? l.add(k) : l.delete(k); S.boosterDefs[b] = [...l]; render();
      const d = document.querySelectorAll(".booster details"); d.forEach(x => { if (x.textContent.includes(b)) x.open = true; });
    }
    else if (a === "add" || a === "replace") {
      const k = t.value; if (!k) return;
      if (a === "add") p.extraSkills.push(k);
      else { const i = Number(t.dataset.i), old = p.extraSkills[i]; p.extraSkills[i] = k; if (S.returnRemoved) S.stock[old] = (S.stock[old] || 0) + 1; }
      S.stock[k] = Math.max(0, (S.stock[k] || 0) - 1);
      toast(`${it(k)} assegnata a ${p.name}`); render();
    }
    else if (a === "goalText") { goalOf(p).text = t.value; }
    else if (a === "goalW") { goalOf(p).weights[t.dataset.k] = Number(t.value); render(); }
    else if (a === "goalMin") { const g = goalOf(p); const v = Number(t.value); if (v > 0) g.mins[t.dataset.k] = v; else delete g.mins[t.dataset.k]; render(); }
    else if (a === "goalAdd") { if (t.value) { goalOf(p).weights[t.value] = 2; render(); } }
    else if (a === "goalBlend") { goalOf(p).blend = t.checked; render(); }
    else if (a === "importAny") {
      const f = t.files[0]; if (!f) return;
      const done = rep => { S.ui.report = rep; render(); toast("Import completato"); };
      if (/\.json$/i.test(f.name)) {
        f.text().then(txt => {
          const d = JSON.parse(txt);
          if (!Array.isArray(d.players) || !d.stock) throw new Error("formato");
          d.ui = { view: "data", playerId: d.players[0].id, tab: "build", q: "" };
          S = d; done({ added: [], updated: d.players.map(x => x.name), errors: [], stock: Object.keys(d.stock).length, boosters: Object.keys(d.boosterDefs || {}).length });
        }).catch(() => toast("File .json non valido: serve un backup di questa app"));
      } else {
        f.arrayBuffer().then(buf => {
          const csv = /\.csv$/i.test(f.name);
          const wb = csv ? XLSX.read(new TextDecoder("utf-8").decode(buf).replace(/^\ufeff/, ""), { type: "string" }) : XLSX.read(buf, { type: "array" });
          done(importWorkbook(wb));
        }).catch(err => toast("File non leggibile: " + err.message));
      }
      t.value = "";
    }
    else if (a === "captain") { S.captainId = t.value; render(); }
    else if (a === "returnRemoved") { S.returnRemoved = t.checked; render(); }
  });
  document.addEventListener("input", e => {
    if (e.target.dataset.act === "search") {
      S.ui.q = e.target.value; renderRoster();
      const s = $(".search"); s.focus(); s.setSelectionRange(s.value.length, s.value.length);
    }
  });

  render();
})();

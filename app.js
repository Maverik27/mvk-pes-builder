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
  function optimize(p, fromZero) {
    const w = C.roles[p.role].weights;
    const b = fromZero ? {} : Object.assign({}, p.build);
    let left = totalPoints(p) - C.categories.reduce((a, c) => a + catCost(b[c.key] || 0), 0);
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
        <button class="btn primary" data-act="opt" data-zero="1" ${tot == null ? "disabled" : ""}>Build ottimale per il ruolo</button>
        <button class="btn" data-act="opt" ${tot == null ? "disabled" : ""}>Completa i punti rimasti</button>
        <button class="btn ghost" data-act="reset">Azzera</button></div>
        <p class="meta">L'ottimizzatore spende i punti dove il ruolo "${esc(p.role)}" guadagna di più per punto speso. Puoi partire dalla build ottimale e ritoccarla a mano.</p>`;
    }
    left += viewBoosters(p);

    let right = `<div class="score"><span class="big">${sFin.toFixed(1)}</span><span>indice ruolo</span><span class="delta">${sFin - sBase >= 0.05 ? "+" + (sFin - sBase).toFixed(1) + " sulla carta base" : ""}</span></div>
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
    <section><h2 class="sec">Salvataggio</h2>
      <p>I dati restano in questo browser. Esporta il file per tenerne una copia o per caricarlo nel repo (sostituisce i dati iniziali se lo importi).</p>
      <div class="actions"><button class="btn primary" data-act="export">Esporta dati (.json)</button>
      <label class="btn">Importa dati<input type="file" accept="application/json" data-act="import" hidden></label>
      <button class="btn ghost" data-act="wipe">Ripristina i dati iniziali</button></div></section>
    <section><h2 class="sec">Regole di progressione</h2>
      <p>Costo per livello: livelli 1-${C.levelBlock} = 1 punto, poi +1 ogni ${C.levelBlock} livelli. Tetto statistica allenata: ${C.statCap}. Si modificano in <code>data/config.js</code>.</p>
      <p class="warn">Da verificare in gioco: quali statistiche alza ogni categoria e il costo dei livelli. Confronta una build reale con quella dell'app prima di fidarti dei numeri.</p>
      <table><thead><tr><th>Categoria</th><th>Statistiche</th></tr></thead><tbody>${C.categories.map(c => `<tr><td>${esc(c.name)}</td><td>${c.stats.map(k => esc(C.stats[k])).join(", ")}</td></tr>`).join("")}</tbody></table></section>
    <section><h2 class="sec">Fonte dati</h2><p>Statistiche, stili e abilità base: pesdb.net (ottobre 2026). Booster, abilità extra e note: il tuo file Excel. Le 30 carte sono state abbinate confrontando le abilità base del file con quelle di pesdb.</p></section>
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
      const blob = new Blob([JSON.stringify(Object.assign({}, S, { ui: undefined }), null, 1)], { type: "application/json" });
      const u = URL.createObjectURL(blob), l = document.createElement("a");
      l.href = u; l.download = `lab-rosa-${new Date().toISOString().slice(0, 10)}.json`; l.click(); URL.revokeObjectURL(u);
    }
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
    else if (a === "captain") { S.captainId = t.value; render(); }
    else if (a === "returnRemoved") { S.returnRemoved = t.checked; render(); }
    else if (a === "import") {
      const f = t.files[0]; if (!f) return;
      f.text().then(txt => {
        const d = JSON.parse(txt);
        if (!Array.isArray(d.players) || !d.stock) throw new Error("formato");
        d.ui = { view: "player", playerId: d.players[0].id, tab: "build", q: "" };
        S = d; render(); toast("Dati importati");
      }).catch(() => toast("File non valido: serve un export di questa app"));
    }
  });
  document.addEventListener("input", e => {
    if (e.target.dataset.act === "search") {
      S.ui.q = e.target.value; renderRoster();
      const s = $(".search"); s.focus(); s.setSelectionRange(s.value.length, s.value.length);
    }
  });

  render();
})();

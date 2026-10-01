'use strict';

/* =========================================================
   Winter Arc — suivi quotidien (données 100 % locales)
   ========================================================= */

const STORE_KEY = 'winterarc-v1';

const TYPES = {
  muscu: { label: 'Muscu', icon: '🏋️', color: '#7cc7ff' },
  bad:   { label: 'Badminton', icon: '🏸', color: '#a78bfa' },
  frac:  { label: 'Fractionné', icon: '⚡', color: '#fbbf24' },
  foot:  { label: 'Footing', icon: '🏃', color: '#34d399' },
  autre: { label: 'Autre', icon: '➕', color: '#94a3b8' },
};

const SCROLL_ALTS = [
  '💪 20 pompes ou 30 squats, maintenant.',
  '📖 Lis 10 pages.',
  '🚶 Sors marcher 10 min, téléphone dans la poche.',
  '🧘 5 min d\'étirements ou de mobilité.',
  '🎯 Avance 25 min sur un truc important (minuteur, téléphone retourné).',
  '🧹 Range ton bureau ou ta chambre pendant 5 min.',
  '📞 Appelle ou écris à un proche.',
  '🎒 Prépare ton sac ou ta tenue pour demain.',
  '📵 Pose ton téléphone dans une autre pièce.',
  '✍️ Écris ta note du jour.',
  '💧 Bois un grand verre d\'eau.',
  '🚿 Douche froide de 30 secondes.',
];

const EXP_CATS = ['Courses', 'Fast-food / resto', 'Sorties', 'Shopping', 'Abonnements', 'Transport', 'Autre'];
const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DOW_LONG = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const QUOTES = [
  "Pas de zéro aujourd'hui.",
  "Tu ne te lèves pas pour aujourd'hui, tu te lèves pour le 31 décembre.",
  "La discipline, c'est choisir ce que tu veux le plus plutôt que ce que tu veux maintenant.",
  "L'envie passe. La fierté reste.",
  "Le confort est l'ennemi du progrès.",
  "Fais-le même sans motivation. Surtout sans motivation.",
  "Petites victoires, tous les jours.",
  "Ton futur toi te regarde.",
  "Personne ne viendra le faire à ta place.",
  "Chaque séance est un vote pour la personne que tu deviens.",
  "L'hiver forge. Le printemps révèle.",
  "Un jour raté n'est pas un arc raté. Deux jours, c'est une habitude : reprends demain.",
];

const SOS_ACTIONS = [
  ['🚶', 'Change de pièce / sors marcher 10 min'],
  ['💪', '20 pompes ou 30 squats, maintenant'],
  ['🚿', 'Douche froide'],
  ['📵', "Pose le téléphone dans une autre pièce"],
  ['💬', 'Écris à un pote'],
  ['💧', "Bois un grand verre d'eau"],
];

/* ---------------- dates ---------------- */
const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const todayKey = () => keyOf(new Date());
const dow = k => (parseKey(k).getDay() + 6) % 7; // 0 = lundi
const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
const weekStart = k => addDays(k, -dow(k));
const fmtDate = (k, opts) => parseKey(k).toLocaleDateString('fr-FR', opts || { weekday: 'long', day: 'numeric', month: 'long' });

/* ---------------- state ---------------- */
const DEFAULT_PLAN = [
  [{ t: 'bad', l: 'Entraînement badminton (soir)' }],
  [{ t: 'muscu', l: 'Push (pecs, épaules, triceps) (soir)' }],
  [{ t: 'frac', l: 'Fractionné court (midi)' }, { t: 'muscu', l: 'Pull (dos, biceps) (soir)' }],
  [{ t: 'bad', l: 'Entraînement badminton (soir)' }],
  [],
  [{ t: 'muscu', l: 'Legs (jambes)' }, { t: 'foot', l: 'Footing 20-30 min, très facile' }],
  [],
];

// Ancien planning par défaut : remplacé automatiquement s'il n'a pas été personnalisé.
const OLD_DEFAULT_PLAN = [
  [{ t: 'muscu', l: 'Jambes' }],
  [{ t: 'muscu', l: 'Push (pecs, épaules, triceps)' }],
  [{ t: 'bad', l: 'Entraînement badminton' }],
  [{ t: 'muscu', l: 'Pull (dos, biceps)' }, { t: 'foot', l: 'Footing 30-40 min, allure facile' }],
  [{ t: 'frac', l: 'Fractionné' }],
  [{ t: 'bad', l: 'Entraînement badminton' }, { t: 'muscu', l: 'Haut du corps / bras' }],
  [],
];

function defaultState() {
  const y = new Date().getFullYear();
  return {
    v: 1,
    settings: {
      start: `${y}-10-01`,
      end: `${y}-12-31`,
      waterGoal: 2.5,
      sleepGoal: 7,
      glass: 0.25,
      weeklyBudget: 100,
      freeMeals: 2,
      weightGoal: null,
      food: [
        'Pas de fast-food / junk food',
        'Pas de soda ni sucreries',
        'Protéines à chaque repas',
        'Fruits & légumes',
        "Pas d'alcool",
      ],
      reasons:
        "• Je veux être fier de moi le 31 décembre.\n" +
        "• Plus d'énergie, plus de focus, plus de confiance.\n" +
        "• C'est moi qui contrôle mes envies, pas l'inverse.\n" +
        "• Mon temps et mon énergie vont dans mes objectifs.",
      plan: structuredClone(DEFAULT_PLAN),
    },
    days: {},
    expenses: [],
    urges: [],
  };
}

function normalize(s) {
  const d = defaultState();
  if (!s || typeof s !== 'object') return d;
  const settings = { ...d.settings, ...(s.settings || {}) };
  if (JSON.stringify(settings.plan) === JSON.stringify(OLD_DEFAULT_PLAN)) settings.plan = structuredClone(DEFAULT_PLAN);
  return {
    v: 1,
    settings,
    days: s.days && typeof s.days === 'object' ? s.days : {},
    expenses: Array.isArray(s.expenses) ? s.expenses : [],
    urges: Array.isArray(s.urges) ? s.urges : [],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? normalize(JSON.parse(raw)) : defaultState();
  } catch {
    return defaultState();
  }
}

let S = load();

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch { toast('⚠️ Impossible de sauvegarder'); }
}

const ui = { scrollTip: null, tab: 'today', date: todayKey(), lastToday: todayKey(), week: null, bweek: null };
let modalState = null;
let deferredPrompt = null;

/* ---------------- domain helpers ---------------- */
const planFor = k => S.settings.plan[dow(k)] || [];

function getDay(k) {
  return S.days[k] || {
    sessions: planFor(k).map(s => ({ t: s.t, l: s.l, done: false })),
    water: 0, sleep: null, food: {}, clean: null, noScroll: null, noSpend: null, note: '',
  };
}
function touch(k) { return (S.days[k] = getDay(k)); }

const arcLen = () => diffDays(S.settings.start, S.settings.end) + 1;
const arcDay = k => diffDays(S.settings.start, k) + 1;
const freeMealsInWeek = k => {
  const ws = weekStart(k);
  return Array.from({ length: 7 }, (_, j) => addDays(ws, j)).filter(x => S.days[x]?.freeMeal).length;
};
const inArc = k => k >= S.settings.start && k <= S.settings.end;

function dayScore(k) {
  const d = getDay(k), st = S.settings, parts = [];
  if (d.sessions.length) parts.push(d.sessions.filter(s => s.done).length / d.sessions.length);
  parts.push(Math.min(1, (d.water * st.glass) / st.waterGoal));
  parts.push(d.sleep > 0 ? Math.min(1, d.sleep / st.sleepGoal) : 0);
  if (st.food.length) parts.push(st.food.filter(f => d.food[f]).length / st.food.length);
  parts.push(d.clean === true ? 1 : 0);
  parts.push(d.noScroll === true ? 1 : 0);
  parts.push(d.noSpend === true ? 1 : 0);
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}

function currentStreak(field) {
  const t = todayKey();
  if (S.days[t]?.[field] === false) return 0;
  let k = S.days[t]?.[field] === true ? t : addDays(t, -1), n = 0;
  while (S.days[k]?.[field] === true) { n++; k = addDays(k, -1); }
  return n;
}

function bestStreak(field) {
  const t = todayKey();
  let best = 0, cur = 0, prev = null;
  for (const k of Object.keys(S.days).filter(k => k <= t).sort()) {
    if (S.days[k][field] === true) {
      cur = prev && addDays(prev, 1) === k ? cur + 1 : 1;
      prev = k;
      best = Math.max(best, cur);
    } else { cur = 0; prev = null; }
  }
  return best;
}

function weightEntries() {
  return Object.keys(S.days)
    .filter(k => typeof S.days[k].weight === 'number')
    .sort()
    .map(k => ({ k, w: S.days[k].weight }));
}

const expBetween = (a, b) => S.expenses.filter(e => e.date >= a && e.date <= b);
const sumAmt = arr => arr.reduce((t, e) => t + e.amount, 0);
const urgesOn = k => S.urges.filter(u => u.date === k).length;

/* ---------------- formatting ---------------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = n => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const liters = n => (Math.round(n * 100) / 100).toLocaleString('fr-FR') + ' L';
const hours = n => `${Math.floor(n)} h${n % 1 ? ' ' + String(Math.round((n % 1) * 60)).padStart(2, '0') : ''}`;
const kg = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kg';
const signedKg = n => (n > 0.04 ? '+' : n < -0.04 ? '−' : '±') + kg(Math.abs(n));
const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);

function ring(p, label) {
  const r = 42, c = 2 * Math.PI * r, v = p ?? 0;
  const col = v >= 80 ? 'var(--ok)' : v >= 50 ? 'var(--accent)' : v > 0 ? 'var(--warn)' : 'transparent';
  return `<div class="ring"><svg viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="9"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(c * v) / 100} ${c}"/>
  </svg><div class="val"><div>${p == null ? '–' : v + '%'}<small>${label}</small></div></div></div>`;
}

function bar(p, cls = '') {
  return `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></div>`;
}

const typeOptions = sel => Object.entries(TYPES)
  .map(([k, t]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${t.icon} ${t.label}</option>`).join('');

/* =========================================================
   VUE : AUJOURD'HUI
   ========================================================= */
function viewToday() {
  const k = ui.date, d = getDay(k), st = S.settings, t = todayKey();
  const future = k > t;
  const n = arcDay(k);
  const dayLbl = inArc(k) ? `Jour ${n} / ${arcLen()}`
    : k < st.start ? `J-${diffDays(k, st.start)} avant l'arc` : 'Arc terminé';

  let banner = '';
  if (k === t && t < st.start) {
    const left = diffDays(t, st.start);
    banner = `<div class="banner">🔥 Le Winter Arc commence ${left === 1 ? 'demain' : `dans ${left} jours`}. Prépare ton sac, tes repas et ton mental.</div>`;
  } else if (future) {
    banner = `<div class="banner">⏳ Ce jour n'est pas encore arrivé. Tu vois ton programme, tu valideras le jour J.</div>`;
  }

  const score = future ? null : dayScore(k);
  const quote = QUOTES[((n % QUOTES.length) + QUOTES.length) % QUOTES.length];

  // sport
  const doneS = d.sessions.filter(s => s.done).length;
  const sessions = d.sessions.length
    ? d.sessions.map((s, i) => `
      <div class="item-wrap">
        <button class="check ${s.done ? 'on' : ''}" data-act="sess" data-i="${i}">
          <span class="ico">${TYPES[s.t]?.icon || '➕'}</span>
          <span class="lbl"><b>${esc(TYPES[s.t]?.label || 'Séance')}</b><small>${esc(s.l)}</small></span>
          <span class="tick"></span>
        </button>
        <button class="xbtn" data-act="sess-del" data-i="${i}" aria-label="Retirer la séance">✕</button>
      </div>`).join('')
    : `<p class="muted" style="margin:0">😴 Jour de repos. Étirements, marche, sommeil : la récup fait partie du plan.</p>`;

  // eau
  const nGlasses = Math.max(Math.round(st.waterGoal / st.glass), d.water);
  const drunk = d.water * st.glass;
  const glasses = Array.from({ length: nGlasses }, (_, i) => `<span class="glass ${i < d.water ? 'full' : ''}"></span>`).join('');

  // nutrition
  const foodDone = st.food.filter(f => d.food[f]).length;
  const food = st.food.map((f, i) => `
    <button class="check ${d.food[f] ? 'on' : ''}" data-act="food" data-i="${i}">
      <span class="lbl"><b>${esc(f)}</b></span><span class="tick"></span>
    </button>`).join('');

  // argent
  const ws = weekStart(k);
  const weekSpent = sumAmt(expBetween(ws, addDays(ws, 6)));
  const daySpent = sumAmt(expBetween(k, k));
  const rem = st.weeklyBudget - weekSpent;
  const bp = pct(weekSpent, st.weeklyBudget);

  const urges = urgesOn(k);

  // poids
  const wAll = weightEntries();
  const wPrev = wAll.filter(e => e.k < k).at(-1);
  const wLast = wAll.filter(e => e.k <= k).at(-1);
  let wInfo;
  if (typeof d.weight === 'number') {
    wInfo = wPrev ? `Enregistré ✓ · ${signedKg(d.weight - wPrev.w)} depuis la pesée du ${esc(fmtDate(wPrev.k, { day: 'numeric', month: 'short' }))}` : 'Enregistré ✓ · première pesée, ton point de départ.';
  } else if (wLast) {
    wInfo = `Dernière pesée : <b>${kg(wLast.w)}</b> le ${esc(fmtDate(wLast.k, { weekday: 'short', day: 'numeric', month: 'short' }))}.`;
  } else {
    wInfo = 'Pèse-toi le matin à jeun, 1 à 2 fois par semaine, toujours dans les mêmes conditions.';
  }
  const wDelta = wAll.length >= 2 && wLast ? wLast.w - wAll[0].w : null;

  return `
  <header class="top">
    <div class="brand">WINTER ARC</div>
    <div class="daynav">
      <button class="arrow" data-act="prev" aria-label="Jour précédent">‹</button>
      <button class="datebtn" data-act="gotoday">
        <span class="dname">${k === t ? "Aujourd'hui" : esc(fmtDate(k))}</span>
        <span class="dnum">${k === t ? esc(fmtDate(k)) + ' · ' : ''}${dayLbl}</span>
      </button>
      <button class="arrow" data-act="next" aria-label="Jour suivant">›</button>
    </div>
  </header>

  ${banner}

  <section class="card hero">
    ${ring(score, 'SCORE')}
    <div>
      <div class="hero-title">${score === 100 ? 'Journée parfaite ❄️' : score >= 80 ? 'Journée validée ✅' : 'Objectif : 80 % minimum'}</div>
      <div class="quote">« ${esc(quote)} »</div>
    </div>
  </section>

  <section class="card">
    <div class="card-h"><h2>🏋️ Sport</h2>${d.sessions.length ? `<span class="pill ${doneS === d.sessions.length ? 'ok' : ''}">${doneS}/${d.sessions.length}</span>` : '<span class="pill">Repos</span>'}</div>
    <div class="checklist">${sessions}</div>
    <details class="more">
      <summary>+ Ajouter / remplacer une séance</summary>
      <div class="row" style="margin-top:8px">
        <select id="add-type" class="grow">${typeOptions('muscu')}</select>
        <button class="btn" data-act="sess-add">Ajouter</button>
      </div>
    </details>
  </section>

  <section class="card">
    <div class="card-h"><h2>💧 Hydratation</h2><span class="pill ${drunk >= st.waterGoal ? 'ok' : ''}">${pct(drunk, st.waterGoal)}%</span></div>
    <div class="water-big">${liters(drunk)} <small class="muted">/ ${liters(st.waterGoal)}</small></div>
    <div class="glasses">${glasses}</div>
    <div class="row">
      <button class="btn" data-act="water-" aria-label="Retirer un verre">−</button>
      <button class="btn primary grow" data-act="water+">+ ${Math.round(st.glass * 1000)} ml</button>
    </div>
  </section>

  <section class="card">
    <div class="card-h"><h2>😴 Sommeil</h2><span class="pill ${d.sleep >= st.sleepGoal ? 'ok' : ''}">${d.sleep > 0 ? pct(d.sleep, st.sleepGoal) : 0}%</span></div>
    <div class="water-big">${d.sleep > 0 ? hours(d.sleep) : '–'} <small class="muted">/ ${hours(st.sleepGoal)}</small></div>
    <small>Nuit dernière · idéal : ${hours(st.sleepGoal)} à ${hours(st.sleepGoal + 1)}</small>
    <div class="row" style="margin-top:10px">
      <button class="btn" data-act="sleep-" aria-label="Retirer 30 minutes">− 30 min</button>
      <button class="btn primary grow" data-act="sleep+">${d.sleep > 0 ? '+ 30 min' : `J'ai dormi ${hours(st.sleepGoal)}`}</button>
    </div>
  </section>

  <section class="card">
    <div class="card-h"><h2>🥗 Nutrition</h2><span class="pill ${foodDone === st.food.length && st.food.length ? 'ok' : ''}">${foodDone}/${st.food.length}</span></div>
    <div class="checklist">${food || '<p class="muted" style="margin:0">Ajoute tes règles dans Réglages.</p>'}</div>
    <button class="btn block free-meal ${d.freeMeal ? 'on' : ''}" data-act="freemeal">
      <span>🍽️ ${d.freeMeal ? 'Repas libre ✓' : 'Repas libre'}</span>
      <span class="pill ${freeMealsInWeek(k) > st.freeMeals ? 'warn' : ''}">${freeMealsInWeek(k)}/${st.freeMeals} cette sem.</span>
    </button>
  </section>

  <section class="card">
    <div class="card-h"><h2>🛡️ Anti-luxure</h2>${urges ? `<span class="pill ok">${urges} envie${urges > 1 ? 's' : ''} résistée${urges > 1 ? 's' : ''}</span>` : ''}</div>
    <div class="streak"><span class="n">${currentStreak('clean')}</span><span class="t">jour${currentStreak('clean') > 1 ? 's' : ''} clean d'affilée<br><small>Record : ${bestStreak('clean')} j</small></span></div>
    <div class="seg">
      <button class="btn ${d.clean === true ? 'sel-ok' : ''}" data-act="clean" data-v="1">✅ Journée clean</button>
      <button class="btn ${d.clean === false ? 'sel-bad' : ''}" data-act="clean" data-v="0">Rechute</button>
    </div>
    <button class="btn sos" data-act="sos">🆘 Grosse envie ? Mode SOS</button>
  </section>

  <section class="card">
    <div class="card-h"><h2>📵 Pas de scroll</h2></div>
    <div class="streak"><span class="n">${currentStreak('noScroll')}</span><span class="t">jour${currentStreak('noScroll') > 1 ? 's' : ''} sans scroll d'affilée<br><small>Record : ${bestStreak('noScroll')} j</small></span></div>
    <div class="seg">
      <button class="btn ${d.noScroll === true ? 'sel-ok' : ''}" data-act="noscroll" data-v="1">✅ Journée sans scroll</button>
      <button class="btn ${d.noScroll === false ? 'sel-bad' : ''}" data-act="noscroll" data-v="0">😵‍💫 J'ai scrollé</button>
    </div>
    ${ui.scrollTip == null
      ? '<button class="btn block" data-act="scroll-tip">Envie de scroller ? Fais plutôt…</button>'
      : `<div class="scroll-tip"><b>${esc(SCROLL_ALTS[ui.scrollTip])}</b>
          <div class="row"><button class="btn grow" data-act="scroll-tip">🔄 Autre idée</button><button class="btn" data-act="scroll-tip-close" aria-label="Fermer">✕</button></div>
        </div>`}
  </section>

  <section class="card">
    <div class="card-h"><h2>💶 Dépenses</h2><span class="pill">${eur(daySpent)} ce jour</span></div>
    <div class="obj">
      <div class="row"><span>Cette semaine</span><b>${eur(weekSpent)} / ${eur(st.weeklyBudget)}</b></div>
      ${bar(bp, bp >= 100 ? 'bad' : bp >= 80 ? 'warn' : 'ok')}
      <small>${rem >= 0 ? `Il te reste ${eur(rem)} cette semaine` : `Budget dépassé de ${eur(-rem)}`}</small>
    </div>
    <div class="seg">
      <button class="btn ${d.noSpend === true ? 'sel-ok' : ''}" data-act="nospend" data-v="1">🧊 Zéro dépense inutile</button>
      <button class="btn ${d.noSpend === false ? 'sel-bad' : ''}" data-act="nospend" data-v="0">💸 Craqué</button>
    </div>
    <button class="btn block" data-act="exp-new">+ Ajouter une dépense</button>
  </section>

  <section class="card">
    <div class="card-h"><h2>⚖️ Poids</h2>${wDelta != null ? `<span class="pill">${signedKg(wDelta)} depuis le début</span>` : ''}</div>
    <div class="row">
      <input type="text" inputmode="decimal" id="weight" class="grow" autocomplete="off"
        placeholder="${wLast ? esc(String(wLast.w).replace('.', ',')) : 'ex : 75,0'}"
        value="${typeof d.weight === 'number' ? esc(String(d.weight).replace('.', ',')) : ''}" aria-label="Poids en kg">
      <span class="muted" style="font-weight:700">kg</span>
    </div>
    <small>${wInfo}</small>
  </section>

  <section class="card">
    <div class="card-h"><h2>📝 Note du jour</h2></div>
    <textarea id="note" placeholder="Victoires, difficultés, ce que tu retiens…">${esc(d.note)}</textarea>
  </section>`;
}

/* =========================================================
   VUE : SPORT
   ========================================================= */
function viewSport() {
  const st = S.settings, t = todayKey();
  const ws = ui.week || weekStart(t);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const weekNo = Math.floor(diffDays(weekStart(st.start), ws) / 7) + 1;

  const target = {}, done = {};
  for (const k of days.filter(inArc)) for (const s of getDay(k).sessions) {
    target[s.t] = (target[s.t] || 0) + 1;
    if (s.done) done[s.t] = (done[s.t] || 0) + 1;
  }
  const totalT = Object.values(target).reduce((a, b) => a + b, 0);
  const totalD = Object.values(done).reduce((a, b) => a + b, 0);

  const objectives = Object.entries(TYPES)
    .filter(([k]) => target[k] || done[k])
    .map(([k, ty]) => {
      const a = done[k] || 0, b = target[k] || 0;
      return `<div class="obj"><div class="row"><span>${ty.icon} ${ty.label}</span><b>${a} / ${b}</b></div>${bar(pct(a, b), a >= b ? 'ok' : '')}</div>`;
    }).join('');

  const list = days.map((k, i) => {
    const d = getDay(k);
    const chips = d.sessions.length
      ? d.sessions.map(s => `<span class="chip ${s.done ? 'done' : ''}" style="${s.done ? `background:${TYPES[s.t]?.color}` : ''}">${TYPES[s.t]?.icon || ''} ${esc(TYPES[s.t]?.label || 'Séance')}</span>`).join('')
      : '<span class="chip">Repos</span>';
    return `<button class="wday ${k === t ? 'today' : ''} ${inArc(k) ? '' : 'out'}" data-act="goto" data-k="${k}"><span class="d">${DOW[i]} ${parseKey(k).getDate()}</span><span class="chips">${chips}</span></button>`;
  }).join('');

  // totaux depuis le début de l'arc
  const last = t < st.end ? t : st.end;
  const tot = {};
  let planned = 0, did = 0;
  for (let k = st.start; k <= last; k = addDays(k, 1)) {
    for (const s of getDay(k).sessions) {
      planned++;
      if (s.done) { did++; tot[s.t] = (tot[s.t] || 0) + 1; }
    }
  }
  const totals = Object.entries(TYPES).filter(([k]) => k !== 'autre' || tot[k]).map(([k, ty]) =>
    `<div class="kpi"><div class="v">${tot[k] || 0}</div><div class="k">${ty.icon} ${ty.label}</div></div>`).join('');

  const planEditor = st.plan.map((sess, d) => `
    <div class="plan-day">
      <h3>${DOW_LONG[d]}${sess.length ? '' : ' <small>· repos</small>'}</h3>
      ${sess.map((s, j) => `
        <div class="plan-sess">
          <span class="ico">${TYPES[s.t]?.icon || '➕'}</span>
          <input type="text" value="${esc(s.l)}" data-plan-label data-d="${d}" data-j="${j}" aria-label="Intitulé de la séance">
          <button class="xbtn" data-act="plan-del" data-d="${d}" data-i="${j}" aria-label="Supprimer">✕</button>
        </div>`).join('')}
      <div class="row">
        <select id="plan-type-${d}" class="grow">${typeOptions('muscu')}</select>
        <button class="btn sm" data-act="plan-add" data-d="${d}">＋ Séance</button>
      </div>
    </div>`).join('');

  return `
  <header class="top">
    <div class="brand">WINTER ARC</div>
    <h1 class="page-title">Sport</h1>
  </header>

  <section class="card">
    <div class="daynav">
      <button class="arrow" data-act="week-prev" aria-label="Semaine précédente">‹</button>
      <div class="datebtn"><span class="dname">Semaine ${weekNo}</span><span class="dnum">${esc(fmtDate(ws, { day: 'numeric', month: 'short' }))} → ${esc(fmtDate(days[6], { day: 'numeric', month: 'short' }))}</span></div>
      <button class="arrow" data-act="week-next" aria-label="Semaine suivante">›</button>
    </div>
    <div class="obj"><div class="row"><b>Total semaine</b><b>${totalD} / ${totalT} séances</b></div>${bar(pct(totalD, totalT), totalD >= totalT && totalT ? 'ok' : '')}</div>
    ${objectives}
  </section>

  <section class="card">
    <div class="card-h"><h2>📅 La semaine</h2><small>Touche un jour pour le remplir</small></div>
    <div class="week">${list}</div>
  </section>

  <section class="card">
    <div class="card-h"><h2>🏆 Depuis le 1er jour</h2><span class="pill">${did} / ${planned}</span></div>
    <div class="kpis">${totals}</div>
  </section>

  <section class="card">
    <div class="card-h"><h2>🗓️ Mon planning type</h2></div>
    <small>Adapte-le à tes créneaux (ex : jours de badminton du club). Les jours déjà remplis gardent leurs séances.</small>
    ${planEditor}
  </section>`;
}

/* =========================================================
   VUE : BUDGET
   ========================================================= */
function viewBudget() {
  const st = S.settings, t = todayKey();
  const ws = ui.bweek || weekStart(t), we = addDays(ws, 6);
  const list = expBetween(ws, we).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const spent = sumAmt(list);
  const sup = sumAmt(list.filter(e => !e.need));
  const rem = st.weeklyBudget - spent;
  const bp = pct(spent, st.weeklyBudget);

  let rows = '', lastDate = null;
  for (const e of list) {
    if (e.date !== lastDate) { rows += `<div class="daylabel">${esc(fmtDate(e.date))}</div>`; lastDate = e.date; }
    rows += `<div class="exp">
      <div class="grow"><b>${esc(e.label || e.cat)}</b><small>${esc(e.cat)}</small></div>
      <span class="tag ${e.need ? 'ess' : 'sup'}">${e.need ? 'nécessaire' : 'superflu'}</span>
      <span class="amt">${eur(e.amount)}</span>
      <button class="xbtn" style="height:34px" data-act="exp-del" data-id="${esc(e.id)}" aria-label="Supprimer">✕</button>
    </div>`;
  }

  // arc
  const last = t < st.end ? t : st.end;
  const arcExp = expBetween(st.start, st.end);
  const arcTotal = sumAmt(arcExp);
  const arcSup = sumAmt(arcExp.filter(e => !e.need));
  const byCat = {};
  for (const e of arcExp) byCat[e.cat] = (byCat[e.cat] || 0) + e.amount;
  const maxCat = Math.max(1, ...Object.values(byCat));
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) =>
    `<div class="obj"><div class="row"><span>${esc(c)}</span><b>${eur(v)}</b></div>${bar((v / maxCat) * 100)}</div>`).join('');
  let noSpendDays = 0, elapsed = 0;
  for (let k = st.start; k <= last; k = addDays(k, 1)) { elapsed++; if (S.days[k]?.noSpend === true) noSpendDays++; }
  const weeks = Math.max(1, elapsed / 7);

  return `
  <header class="top">
    <div class="brand">WINTER ARC</div>
    <h1 class="page-title">Budget</h1>
  </header>

  <section class="card">
    <div class="daynav">
      <button class="arrow" data-act="bweek-prev" aria-label="Semaine précédente">‹</button>
      <div class="datebtn"><span class="dname">${eur(spent)} <small class="muted">/ ${eur(st.weeklyBudget)}</small></span><span class="dnum">${esc(fmtDate(ws, { day: 'numeric', month: 'short' }))} → ${esc(fmtDate(we, { day: 'numeric', month: 'short' }))}</span></div>
      <button class="arrow" data-act="bweek-next" aria-label="Semaine suivante">›</button>
    </div>
    ${bar(bp, bp >= 100 ? 'bad' : bp >= 80 ? 'warn' : 'ok')}
    <div class="row" style="justify-content:space-between">
      <small>${rem >= 0 ? `Reste <b style="color:var(--ok)">${eur(rem)}</b>` : `Dépassé de <b style="color:var(--bad)">${eur(-rem)}</b>`}</small>
      <small>dont superflu : <b style="color:var(--warn)">${eur(sup)}</b></small>
    </div>
    <button class="btn primary block" data-act="exp-new">+ Ajouter une dépense</button>
  </section>

  <section class="card">
    <div class="card-h"><h2>🧾 Dépenses de la semaine</h2><span class="pill">${list.length}</span></div>
    <div>${rows || '<p class="muted" style="margin:0">Aucune dépense cette semaine. 🧊</p>'}</div>
  </section>

  <section class="card">
    <div class="card-h"><h2>❄️ Sur tout l'arc</h2></div>
    <div class="kpis">
      <div class="kpi"><div class="v">${eur(arcTotal)}</div><div class="k">Total dépensé</div></div>
      <div class="kpi"><div class="v" style="color:var(--warn)">${eur(arcSup)}</div><div class="k">Superflu</div></div>
      <div class="kpi"><div class="v">${eur(arcTotal / weeks)}</div><div class="k">Moyenne / semaine</div></div>
      <div class="kpi"><div class="v">${noSpendDays}<small> / ${elapsed}</small></div><div class="k">Jours sans dépense inutile</div></div>
    </div>
    ${cats ? `<h3 style="font-size:14px;margin-top:4px">Par catégorie</h3>${cats}` : ''}
  </section>`;
}

/* =========================================================
   VUE : PROGRÈS
   ========================================================= */
function viewStats() {
  const st = S.settings, t = todayKey(), len = arcLen();
  const last = t < st.end ? t : st.end;
  let elapsed = 0, validated = 0, scoreSum = 0, water = 0, sleep = 0, sleepN = 0, sDone = 0, sPlan = 0, noSpend = 0, clean = 0, noScroll = 0, freeMeals = 0;
  for (let k = st.start; k <= last; k = addDays(k, 1)) {
    const d = getDay(k), sc = dayScore(k);
    elapsed++; scoreSum += sc; if (sc >= 80) validated++;
    water += d.water * st.glass;
    if (d.sleep > 0) { sleep += d.sleep; sleepN++; }
    sPlan += d.sessions.length; sDone += d.sessions.filter(s => s.done).length;
    if (d.noSpend === true) noSpend++;
    if (d.clean === true) clean++;
    if (d.noScroll === true) noScroll++;
    if (d.freeMeal) freeMeals++;
  }
  const avg = elapsed ? Math.round(scoreSum / elapsed) : 0;
  const p = pct(elapsed, len);

  // calendrier
  const months = [];
  for (let m = st.start.slice(0, 7) + '-01'; m <= st.end; ) {
    const md = parseKey(m);
    const next = keyOf(new Date(md.getFullYear(), md.getMonth() + 1, 1));
    let cells = DOW.map(x => `<div class="dh">${x[0]}</div>`).join('');
    cells += '<div></div>'.repeat(dow(m));
    for (let k = m; k < next; k = addDays(k, 1)) {
      const num = parseKey(k).getDate();
      if (!inArc(k)) { cells += `<div class="cell" style="opacity:.25">${num}</div>`; continue; }
      const fm = S.days[k]?.freeMeal ? '<span class="fm" aria-hidden="true">🍽️</span>' : '';
      if (k > t) { cells += `<div class="cell future">${num}${fm}</div>`; continue; }
      const sc = dayScore(k);
      const lv = sc >= 100 ? 4 : sc >= 80 ? 3 : sc >= 50 ? 2 : sc >= 20 ? 1 : 0;
      cells += `<button class="cell l${lv} ${k === t ? 'today' : ''}" data-act="goto" data-k="${k}" aria-label="${esc(fmtDate(k))} : ${sc}%${fm ? ', repas libre' : ''}">${num}${fm}</button>`;
    }
    months.push(`<div class="month"><h3>${esc(md.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))}</h3><div class="cal">${cells}</div></div>`);
    m = next;
  }

  // score par semaine
  const bars = [];
  for (let ws = weekStart(st.start), i = 1; ws <= st.end; ws = addDays(ws, 7), i++) {
    let s = 0, n = 0;
    for (let j = 0; j < 7; j++) {
      const k = addDays(ws, j);
      if (inArc(k) && k <= t) { s += dayScore(k); n++; }
    }
    const v = n ? Math.round(s / n) : null;
    bars.push(`<div class="wb"><div class="wb-track"><i style="height:${v ?? 0}%;background:${v == null ? 'transparent' : v >= 80 ? 'var(--ok)' : v >= 50 ? 'var(--accent)' : 'var(--warn)'}"></i></div><span>${v == null ? '' : v}</span><small>S${i}</small></div>`);
  }

  return `
  <header class="top">
    <div class="brand">WINTER ARC</div>
    <h1 class="page-title">Progrès</h1>
  </header>

  <section class="card">
    <div class="card-h"><h2>❄️ L'arc</h2><span class="pill">${elapsed} / ${len} jours</span></div>
    ${bar(p)}
    <small>${t < st.start ? `Départ le ${esc(fmtDate(st.start, { day: 'numeric', month: 'long' }))}.` : t > st.end ? 'Arc terminé. Respect. 🏔️' : `${len - elapsed} jours restants avant le ${esc(fmtDate(st.end, { day: 'numeric', month: 'long' }))}.`}</small>
  </section>

  <section class="kpis">
    <div class="kpi"><div class="v">${avg}%</div><div class="k">Score moyen</div></div>
    <div class="kpi"><div class="v">${validated}<small> / ${elapsed}</small></div><div class="k">Jours validés (≥ 80 %)</div></div>
    <div class="kpi"><div class="v" style="color:var(--accent)">${currentStreak('clean')} j</div><div class="k">Série clean · record ${bestStreak('clean')} j</div></div>
    <div class="kpi"><div class="v">${S.urges.length}</div><div class="k">Envies résistées (SOS)</div></div>
    <div class="kpi"><div class="v">${sDone}<small> / ${sPlan}</small></div><div class="k">Séances de sport</div></div>
    <div class="kpi"><div class="v">${elapsed ? liters(water / elapsed) : '–'}</div><div class="k">Eau / jour en moyenne</div></div>
    <div class="kpi"><div class="v">${sleepN ? hours(Math.round((sleep / sleepN) * 4) / 4) : '–'}</div><div class="k">Sommeil / nuit en moyenne</div></div>
    <div class="kpi"><div class="v">${clean}</div><div class="k">Jours clean au total</div></div>
    <div class="kpi"><div class="v">${noSpend}</div><div class="k">Jours sans dépense inutile</div></div>
    <div class="kpi"><div class="v" style="color:var(--accent)">${currentStreak('noScroll')} j</div><div class="k">Série sans scroll · record ${bestStreak('noScroll')} j</div></div>
    <div class="kpi"><div class="v">${noScroll}</div><div class="k">Jours sans scroll au total</div></div>
    <div class="kpi"><div class="v">${freeMeals}</div><div class="k">Repas libres · marge ${st.freeMeals}/semaine</div></div>
  </section>

  ${weightCard()}

  <section class="card">
    <div class="card-h"><h2>📊 Score par semaine</h2></div>
    <div class="wbars">${bars.join('')}</div>
  </section>

  <section class="card">
    <div class="card-h"><h2>🗓️ Calendrier</h2></div>
    <div class="legend">
      <span class="cell l0"></span>&lt;20 %
      <span class="cell l1"></span>20+
      <span class="cell l2"></span>50+
      <span class="cell l3"></span>80+
      <span class="cell l4"></span>100 %
      <span>🍽️ repas libre</span>
    </div>
    <div class="months">${months.join('')}</div>
  </section>`;
}

/* ---------------- poids : carte + courbe ---------------- */
function weightCard() {
  const pts = weightEntries(), goal = S.settings.weightGoal;
  if (!pts.length) {
    return `<section class="card"><div class="card-h"><h2>⚖️ Poids</h2></div>
      <p class="muted" style="margin:0">Aucune pesée pour l'instant. Entre ton poids dans l'onglet Jour.</p></section>`;
  }
  const first = pts[0], last = pts.at(-1);
  const rows = pts.slice().reverse().map((p, i, arr) => {
    const prev = arr[i + 1];
    return `<div class="exp">
      <div class="grow"><b>${esc(fmtDate(p.k, { weekday: 'short', day: 'numeric', month: 'long' }))}</b></div>
      <small>${prev ? signedKg(p.w - prev.w) : 'départ'}</small>
      <span class="amt">${kg(p.w)}</span>
      <button class="xbtn" style="height:34px" data-act="weight-del" data-k="${p.k}" aria-label="Supprimer la pesée">✕</button>
    </div>`;
  }).join('');
  return `
  <section class="card">
    <div class="card-h"><h2>⚖️ Poids</h2><span class="pill">${pts.length} pesée${pts.length > 1 ? 's' : ''}</span></div>
    <div class="kpis">
      <div class="kpi"><div class="v">${kg(first.w)}</div><div class="k">Départ · ${esc(fmtDate(first.k, { day: 'numeric', month: 'short' }))}</div></div>
      <div class="kpi"><div class="v">${kg(last.w)}</div><div class="k">Actuel · ${esc(fmtDate(last.k, { day: 'numeric', month: 'short' }))}</div></div>
      <div class="kpi"><div class="v">${pts.length > 1 ? signedKg(last.w - first.w) : '–'}</div><div class="k">Évolution</div></div>
      <div class="kpi"><div class="v">${goal ? kg(goal) : '–'}</div><div class="k">${goal ? (Math.abs(last.w - goal) < 0.05 ? 'Objectif atteint 🎯' : `Objectif · reste ${kg(Math.abs(last.w - goal))}`) : 'Objectif (Réglages)'}</div></div>
    </div>
    <div id="wchart" class="wchart"></div>
    <details class="more">
      <summary>Voir toutes les pesées (${pts.length})</summary>
      <div style="margin-top:6px">${rows}</div>
    </details>
  </section>`;
}

function drawWeightChart() {
  const box = document.getElementById('wchart');
  if (!box) return;
  const pts = weightEntries(), st = S.settings, goal = st.weightGoal;
  if (pts.length < 2) {
    box.innerHTML = '<p class="muted" style="margin:0">La courbe apparaîtra dès ta 2e pesée.</p>';
    return;
  }
  const W = box.clientWidth, H = 190, m = { l: 34, r: 14, t: 14, b: 24 };
  const x0 = pts[0].k < st.start ? pts[0].k : st.start;
  const x1 = pts.at(-1).k > st.end ? pts.at(-1).k : st.end;
  const span = Math.max(1, diffDays(x0, x1));
  const vals = pts.map(p => p.w).concat(goal ? [goal] : []);
  let lo = Math.min(...vals) - 0.5, hi = Math.max(...vals) + 0.5;
  const step = [0.5, 1, 2, 5, 10, 20].find(s => (hi - lo) / s <= 4) || 50;
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const X = k => m.l + (diffDays(x0, k) / span) * (W - m.l - m.r);
  const Y = v => m.t + ((hi - v) / (hi - lo)) * (H - m.t - m.b);
  const fmt = v => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

  let g = '';
  for (let v = lo; v <= hi + 1e-9; v += step) {
    g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" class="wc-grid"/>`;
    g += `<text x="${m.l - 6}" y="${Y(v) + 3.5}" text-anchor="end" class="wc-txt">${fmt(v)}</text>`;
  }
  const d0 = parseKey(x0);
  for (let k = keyOf(new Date(d0.getFullYear(), d0.getMonth() + (d0.getDate() > 1 ? 1 : 0), 1)); k <= x1;) {
    const md = parseKey(k);
    g += `<text x="${X(k)}" y="${H - 6}" text-anchor="middle" class="wc-txt">${esc(md.toLocaleDateString('fr-FR', { month: 'short' }))}</text>`;
    k = keyOf(new Date(md.getFullYear(), md.getMonth() + 1, 1));
  }
  if (goal) {
    g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(goal)}" y2="${Y(goal)}" class="wc-goal"/>`;
    g += `<text x="${W - m.r}" y="${Y(goal) - 5}" text-anchor="end" class="wc-txt">Objectif ${fmt(goal)}</text>`;
  }
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.k).toFixed(1)},${Y(p.w).toFixed(1)}`).join('');
  const last = pts.at(-1);
  const dots = pts.map(p => `<circle cx="${X(p.k)}" cy="${Y(p.w)}" r="4" class="wc-dot"/>`).join('');

  box.innerHTML = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" tabindex="0" role="img"
      aria-label="Courbe de poids : de ${kg(pts[0].w)} à ${kg(last.w)}">
      ${g}
      <line class="wc-cross" y1="${m.t}" y2="${H - m.b}" x1="0" x2="0" visibility="hidden"/>
      <path d="${path}" class="wc-line"/>
      ${dots}
      ${X(last.k) < W - 50
        ? `<text x="${X(last.k) + 9}" y="${Y(last.w) + 4}" class="wc-end">${fmt(last.w)}</text>`
        : `<text x="${X(last.k)}" y="${Y(last.w) - 11}" text-anchor="end" class="wc-end">${fmt(last.w)}</text>`}
      <rect x="${m.l}" y="0" width="${W - m.l - m.r}" height="${H}" fill="transparent"/>
    </svg>
    <div class="wtip" hidden><b></b><small></small></div>`;

  const svg = box.querySelector('svg'), cross = svg.querySelector('.wc-cross');
  const tip = box.querySelector('.wtip'), dotEls = svg.querySelectorAll('.wc-dot');
  let cur = -1;
  const show = i => {
    cur = i;
    const p = pts[i], x = X(p.k);
    cross.setAttribute('x1', x);
    cross.setAttribute('x2', x);
    cross.setAttribute('visibility', 'visible');
    dotEls.forEach((el, j) => el.classList.toggle('on', j === i));
    tip.querySelector('b').textContent = kg(p.w);
    tip.querySelector('small').textContent = fmtDate(p.k, { weekday: 'short', day: 'numeric', month: 'short' }) +
      (i ? ` · ${signedKg(p.w - pts[i - 1].w)}` : ' · départ');
    tip.hidden = false;
    const tw = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(W - tw, x - tw / 2)) + 'px';
    tip.style.top = Math.max(0, Y(p.w) - 58) + 'px';
  };
  const hide = () => {
    cur = -1;
    cross.setAttribute('visibility', 'hidden');
    tip.hidden = true;
    dotEls.forEach(el => el.classList.remove('on'));
  };
  const nearest = e => {
    const x = e.clientX - svg.getBoundingClientRect().left;
    let best = 0;
    pts.forEach((p, i) => { if (Math.abs(X(p.k) - x) < Math.abs(X(pts[best].k) - x)) best = i; });
    return best;
  };
  svg.addEventListener('pointermove', e => show(nearest(e)));
  svg.addEventListener('pointerdown', e => show(nearest(e)));
  svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hide(); });
  svg.addEventListener('focus', () => show(pts.length - 1));
  svg.addEventListener('blur', hide);
  svg.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { show(Math.max(0, cur - 1)); e.preventDefault(); }
    if (e.key === 'ArrowRight') { show(Math.min(pts.length - 1, cur + 1)); e.preventDefault(); }
  });
}

/* =========================================================
   VUE : RÉGLAGES
   ========================================================= */
function viewSettings() {
  const st = S.settings;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  const food = st.food.map((f, i) => `
    <div class="plan-sess">
      <input type="text" value="${esc(f)}" data-food-i="${i}" aria-label="Règle nutrition">
      <button class="xbtn" data-act="food-del" data-i="${i}" aria-label="Supprimer">✕</button>
    </div>`).join('');

  return `
  <header class="top">
    <div class="brand">WINTER ARC</div>
    <h1 class="page-title">Réglages</h1>
  </header>

  ${standalone ? '' : `
  <section class="card">
    <div class="card-h"><h2>📲 Installer l'app</h2></div>
    ${deferredPrompt ? `<button class="btn primary block" data-act="install">Installer sur l'écran d'accueil</button>` : ''}
    <small>${isIOS
      ? "Sur iPhone : dans Safari, touche <b>Partager</b> puis <b>Sur l'écran d'accueil</b>."
      : "Sur Android : dans Chrome, menu <b>⋮</b> puis <b>Installer l'application</b> (ou « Ajouter à l'écran d'accueil »)."}
    Une fois installée, elle marche hors ligne.</small>
  </section>`}

  <section class="card">
    <div class="card-h"><h2>🎯 Objectifs</h2></div>
    <label class="field">Eau par jour (litres)
      <input type="number" inputmode="decimal" step="0.25" min="0.5" value="${st.waterGoal}" data-set="waterGoal" data-num>
    </label>
    <label class="field">Sommeil par nuit (heures)
      <input type="number" inputmode="decimal" step="0.5" min="4" max="12" value="${st.sleepGoal}" data-set="sleepGoal" data-num>
    </label>
    <label class="field">Taille d'un verre
      <select data-set="glass" data-num>
        ${[0.2, 0.25, 0.33, 0.5].map(v => `<option value="${v}" ${v === st.glass ? 'selected' : ''}>${Math.round(v * 1000)} ml</option>`).join('')}
      </select>
    </label>
    <label class="field">Objectif de poids (kg, optionnel)
      <input type="text" inputmode="decimal" value="${st.weightGoal ? esc(String(st.weightGoal).replace('.', ',')) : ''}" data-set="weightGoal" data-num data-optional placeholder="ex : 72">
    </label>
    <label class="field">Repas libres par semaine (resto, sorties)
      <input type="number" inputmode="numeric" step="1" min="1" value="${st.freeMeals}" data-set="freeMeals" data-num>
    </label>
    <label class="field">Budget par semaine (€)
      <input type="number" inputmode="decimal" step="5" min="1" value="${st.weeklyBudget}" data-set="weeklyBudget" data-num>
    </label>
  </section>

  <section class="card">
    <div class="card-h"><h2>🥗 Mes règles nutrition</h2></div>
    ${food}
    <div class="row">
      <input type="text" id="food-new" class="grow" placeholder="Nouvelle règle (ex : 3 repas/jour)">
      <button class="btn sm" data-act="food-add">Ajouter</button>
    </div>
  </section>

  <section class="card">
    <div class="card-h"><h2>🔥 Mes raisons</h2></div>
    <small>Affichées dans le mode SOS. Écris pourquoi tu fais ça, avec tes mots.</small>
    <textarea id="set-reasons" rows="6">${esc(st.reasons)}</textarea>
  </section>

  <section class="card">
    <div class="card-h"><h2>📅 Dates de l'arc</h2></div>
    <div class="row">
      <label class="field grow">Début<input type="date" value="${st.start}" data-set="start"></label>
      <label class="field grow">Fin<input type="date" value="${st.end}" data-set="end"></label>
    </div>
  </section>

  <section class="card">
    <div class="card-h"><h2>💾 Sauvegarde</h2></div>
    <small>Tes données restent uniquement sur ce téléphone. Exporte une sauvegarde de temps en temps (ex : chaque dimanche).</small>
    <div class="seg">
      <button class="btn" data-act="export">⬇️ Exporter</button>
      <button class="btn" data-act="import">⬆️ Importer</button>
    </div>
    <input type="file" id="import-file" accept="application/json,.json" hidden>
    <button class="btn danger block" data-act="reset">Tout effacer</button>
  </section>`;
}

/* =========================================================
   MODALES
   ========================================================= */
const $view = document.getElementById('view');
const $modal = document.getElementById('modal');
const $toast = document.getElementById('toast');

let toastTimer;
function toast(msg) {
  $toast.textContent = msg;
  $toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($toast.hidden = true), 2200);
}

function openExpense() {
  modalState = { cat: EXP_CATS[0], need: null };
  $modal.innerHTML = `
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Nouvelle dépense">
    <h2>Nouvelle dépense</h2>
    <label class="field">Montant (€)<input id="e-amt" type="text" inputmode="decimal" placeholder="0,00" autocomplete="off"></label>
    <label class="field">C'était quoi ?<input id="e-lbl" type="text" placeholder="ex : kebab, place de ciné…" autocomplete="off"></label>
    <div class="field">Catégorie
      <div class="cats">${EXP_CATS.map(c => `<button class="btn sm ${c === modalState.cat ? 'sel' : ''}" data-act="e-cat" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    </div>
    <div class="field">Honnêtement, c'était nécessaire ?
      <div class="seg" id="e-need">
        <button class="btn" data-act="e-need" data-v="1">Nécessaire</button>
        <button class="btn" data-act="e-need" data-v="0">Superflu</button>
      </div>
    </div>
    <label class="field">Date<input id="e-date" type="date" value="${ui.date > todayKey() ? todayKey() : ui.date}"></label>
    <div class="seg">
      <button class="btn" data-act="modal-close">Annuler</button>
      <button class="btn primary" data-act="e-save">Enregistrer</button>
    </div>
  </div>`;
  $modal.hidden = false;
  setTimeout(() => document.getElementById('e-amt')?.focus(), 50);
}

function closeModal() { $modal.hidden = true; $modal.innerHTML = ''; modalState = null; }

function saveExpense() {
  const amount = parseFloat(document.getElementById('e-amt').value.replace(',', '.').replace(/\s/g, ''));
  const date = document.getElementById('e-date').value;
  const label = document.getElementById('e-lbl').value.trim();
  if (!(amount > 0)) return toast('Entre un montant valide');
  if (modalState.need === null) return toast('Nécessaire ou superflu ?');
  if (!date) return toast('Choisis une date');
  S.expenses.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date, amount: Math.round(amount * 100) / 100, cat: modalState.cat, label, need: modalState.need,
  });
  const need = modalState.need;
  if (!need) touch(date).noSpend = false;
  save();
  closeModal();
  render();
  toast(need ? 'Dépense enregistrée' : 'Dépense superflue notée 💸');
}

/* ---------------- SOS ---------------- */
let sosTimers = [];
function openSOS() {
  const el = document.createElement('div');
  el.className = 'sos-screen';
  el.id = 'sos';
  el.innerHTML = `
  <div class="sos-inner">
    <h1>Stop. Respire.</h1>
    <p class="sub">Une envie monte, atteint un pic puis redescend, souvent en quelques minutes. Ne négocie pas avec elle : bouge ton corps et laisse passer la vague.</p>
    <div class="breath-wrap"><div class="breath" id="breath">Inspire</div></div>
    <div class="timer" id="sos-timer">5:00</div>
    <div class="card">
      <h2>Fais un de ces trucs, maintenant</h2>
      <div class="checklist">
        ${SOS_ACTIONS.map(([i, a]) => `<button class="check" data-act="sos-act"><span class="ico">${i}</span><span class="lbl"><b>${esc(a)}</b></span><span class="tick"></span></button>`).join('')}
      </div>
    </div>
    <div class="card"><h2>🔥 Mes raisons</h2><div class="reasons">${esc(S.settings.reasons)}</div></div>
    <button class="btn ok block" data-act="sos-win">💪 J'ai tenu bon</button>
    <button class="btn block" data-act="sos-close">Fermer</button>
  </div>`;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';

  // respiration : 4 s inspire, 4 s bloque, 6 s expire
  const phases = [['Inspire', 4000, 1.7], ['Bloque', 4000, 1.7], ['Expire', 6000, 1]];
  let p = 0;
  const breath = el.querySelector('#breath');
  const step = () => {
    const [txt, ms, scale] = phases[p];
    breath.textContent = txt;
    breath.style.transitionDuration = ms + 'ms';
    breath.style.transform = `scale(${scale})`;
    p = (p + 1) % phases.length;
    sosTimers.push(setTimeout(step, ms));
  };
  step();

  let left = 300;
  const timerEl = el.querySelector('#sos-timer');
  sosTimers.push(setInterval(() => {
    left = Math.max(0, left - 1);
    timerEl.textContent = left ? `${Math.floor(left / 60)}:${pad(left % 60)}` : 'Tu as tenu 5 minutes 🔥';
  }, 1000));
}

function closeSOS() {
  sosTimers.forEach(id => { clearTimeout(id); clearInterval(id); });
  sosTimers = [];
  document.getElementById('sos')?.remove();
  document.body.style.overflow = '';
}

/* ---------------- sauvegarde ---------------- */
async function exportData() {
  const name = `winter-arc-sauvegarde-${todayKey()}.json`;
  const json = JSON.stringify(S, null, 2);
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Sauvegarde Winter Arc' }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function importData(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!data.settings || !data.days) throw new Error();
      if (!confirm('Remplacer toutes les données actuelles par cette sauvegarde ?')) return;
      S = normalize(data);
      save();
      render();
      toast('Sauvegarde importée ✅');
    } catch {
      toast('Fichier invalide');
    }
  };
  r.readAsText(file);
}

/* =========================================================
   RENDU + ÉVÉNEMENTS
   ========================================================= */
function render() {
  const views = { today: viewToday, sport: viewSport, budget: viewBudget, stats: viewStats, settings: viewSettings };
  $view.innerHTML = views[ui.tab]();
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === ui.tab));
  if (ui.tab === 'stats') drawWeightChart();
}

function editable(k) {
  if (k > todayKey()) { toast("Ce jour n'est pas encore arrivé ⏳"); return false; }
  return true;
}

// petit feedback quand un jour passe un cap
function celebrate(k, before) {
  const after = dayScore(k);
  if (after === 100 && before < 100) toast('Journée parfaite ❄️🔥');
  else if (after >= 80 && before < 80) toast('Journée validée ✅');
}

document.addEventListener('click', e => {
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) {
    ui.tab = tabBtn.dataset.tab;
    if (ui.tab === 'today') ui.date = todayKey();
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (e.target === $modal) return closeModal();

  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act, i = Number(el.dataset.i), k = ui.date;
  const st = S.settings;
  let before;

  switch (act) {
    case 'prev': ui.date = addDays(k, -1); break;
    case 'next': ui.date = addDays(k, 1); break;
    case 'gotoday': ui.date = todayKey(); break;
    case 'goto': ui.date = el.dataset.k; ui.tab = 'today'; render(); window.scrollTo(0, 0); return;

    case 'sess': {
      if (!editable(k)) return;
      before = dayScore(k);
      const s = touch(k).sessions[i];
      s.done = !s.done;
      save();
      if (s.done) toast(`${TYPES[s.t]?.icon || '✅'} Séance validée`);
      celebrate(k, before);
      break;
    }
    case 'sess-del':
      if (!editable(k)) return;
      if (!confirm('Retirer cette séance pour ce jour ?')) return;
      touch(k).sessions.splice(i, 1);
      save();
      break;
    case 'sess-add': {
      if (!editable(k)) return;
      const t = document.getElementById('add-type').value;
      touch(k).sessions.push({ t, l: 'Séance ajoutée', done: false });
      save();
      break;
    }

    case 'water+': case 'water-': {
      if (!editable(k)) return;
      before = dayScore(k);
      const d = touch(k);
      const wasOk = d.water * st.glass >= st.waterGoal;
      d.water = Math.max(0, d.water + (act === 'water+' ? 1 : -1));
      save();
      if (!wasOk && d.water * st.glass >= st.waterGoal) toast('Objectif hydratation atteint 💧');
      else celebrate(k, before);
      break;
    }

    case 'sleep+': case 'sleep-': {
      if (!editable(k)) return;
      before = dayScore(k);
      const d = touch(k);
      const wasOk = d.sleep >= st.sleepGoal;
      if (!(d.sleep > 0)) d.sleep = act === 'sleep+' ? st.sleepGoal : st.sleepGoal - 0.5;
      else d.sleep = Math.min(14, Math.max(0, d.sleep + (act === 'sleep+' ? 0.5 : -0.5)));
      if (d.sleep === 0) d.sleep = null;
      save();
      if (!wasOk && d.sleep >= st.sleepGoal) toast('Objectif sommeil atteint 😴');
      else celebrate(k, before);
      break;
    }

    case 'food': {
      if (!editable(k)) return;
      before = dayScore(k);
      const d = touch(k), f = st.food[i];
      d.food[f] = !d.food[f];
      save();
      celebrate(k, before);
      break;
    }

    case 'freemeal': {
      if (!editable(k)) return;
      const d = touch(k);
      d.freeMeal = !d.freeMeal;
      save();
      if (d.freeMeal) {
        const n = freeMealsInWeek(k);
        toast(n > st.freeMeals ? `⚠️ ${n} repas libres cette semaine (marge : ${st.freeMeals})` : `🍽️ Repas libre noté · ${n}/${st.freeMeals} cette semaine`);
      }
      break;
    }

    case 'clean': case 'nospend': case 'noscroll': {
      if (!editable(k)) return;
      before = dayScore(k);
      const field = { clean: 'clean', nospend: 'noSpend', noscroll: 'noScroll' }[act];
      const d = touch(k), v = el.dataset.v === '1';
      d[field] = d[field] === v ? null : v;
      save();
      if (field === 'clean' && d.clean === false) toast("Rechute notée. Ça n'efface pas ton travail : repars maintenant.");
      else if (field === 'clean' && d.clean === true) toast(`🛡️ ${currentStreak('clean')} jour(s) clean`);
      else if (field === 'noScroll' && d.noScroll === false) toast('Noté. Demain, téléphone loin du lit. 📵');
      else if (field === 'noScroll' && d.noScroll === true) toast(`📵 ${currentStreak('noScroll')} jour(s) sans scroll`);
      else celebrate(k, before);
      break;
    }

    case 'scroll-tip': {
      let i;
      do i = Math.floor(Math.random() * SCROLL_ALTS.length); while (i === ui.scrollTip);
      ui.scrollTip = i;
      break;
    }
    case 'scroll-tip-close': ui.scrollTip = null; break;

    case 'sos': openSOS(); return;
    case 'sos-act': el.classList.toggle('on'); return;
    case 'sos-win':
      S.urges.push({ ts: Date.now(), date: todayKey() });
      save();
      closeSOS();
      render();
      toast("Bien joué. L'envie est passée, toi tu es resté. 💪");
      return;
    case 'sos-close': closeSOS(); return;

    case 'exp-new': openExpense(); return;
    case 'e-cat':
      modalState.cat = el.dataset.v;
      $modal.querySelectorAll('[data-act="e-cat"]').forEach(b => b.classList.toggle('sel', b === el));
      return;
    case 'e-need':
      modalState.need = el.dataset.v === '1';
      $modal.querySelectorAll('[data-act="e-need"]').forEach(b => {
        b.classList.toggle('sel-ok', b === el && modalState.need);
        b.classList.toggle('sel-bad', b === el && !modalState.need);
      });
      return;
    case 'e-save': saveExpense(); return;
    case 'modal-close': closeModal(); return;
    case 'exp-del':
      if (!confirm('Supprimer cette dépense ?')) return;
      S.expenses = S.expenses.filter(x => x.id !== el.dataset.id);
      save();
      break;

    case 'weight-del':
      if (!confirm('Supprimer cette pesée ?')) return;
      delete S.days[el.dataset.k].weight;
      save();
      break;

    case 'week-prev': ui.week = addDays(ui.week || weekStart(todayKey()), -7); break;
    case 'week-next': ui.week = addDays(ui.week || weekStart(todayKey()), 7); break;
    case 'bweek-prev': ui.bweek = addDays(ui.bweek || weekStart(todayKey()), -7); break;
    case 'bweek-next': ui.bweek = addDays(ui.bweek || weekStart(todayKey()), 7); break;

    case 'plan-del':
      st.plan[Number(el.dataset.d)].splice(i, 1);
      save();
      break;
    case 'plan-add': {
      const d = Number(el.dataset.d);
      const t = document.getElementById('plan-type-' + d).value;
      st.plan[d].push({ t, l: TYPES[t].label });
      save();
      break;
    }

    case 'food-add': {
      const v = document.getElementById('food-new').value.trim();
      if (!v) return;
      if (st.food.includes(v)) return toast('Règle déjà présente');
      st.food.push(v);
      save();
      break;
    }
    case 'food-del':
      if (!confirm(`Supprimer « ${st.food[i]} » ?`)) return;
      st.food.splice(i, 1);
      save();
      break;

    case 'install':
      if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.finally(() => { deferredPrompt = null; render(); }); }
      return;
    case 'export': exportData(); return;
    case 'import': document.getElementById('import-file').click(); return;
    case 'reset':
      if (!confirm('Effacer TOUTES tes données Winter Arc ?')) return;
      if (!confirm('Vraiment ? Pense à exporter une sauvegarde avant. Cette action est définitive.')) return;
      S = defaultState();
      save();
      toast('Données effacées');
      break;
    default: return;
  }
  render();
});

document.addEventListener('change', e => {
  const t = e.target, st = S.settings;
  if (t.dataset.set) {
    const key = t.dataset.set;
    const v = 'num' in t.dataset ? parseFloat(String(t.value).replace(',', '.')) : t.value;
    if ('optional' in t.dataset && !String(t.value).trim()) { st[key] = null; save(); render(); toast('Objectif retiré'); return; }
    if ('num' in t.dataset && !(v > 0)) { toast('Valeur invalide'); render(); return; }
    if ((key === 'start' && v >= st.end) || (key === 'end' && v <= st.start) || !v) { toast('Dates invalides'); render(); return; }
    st[key] = v;
    save();
    render();
    toast('Enregistré');
  } else if ('planLabel' in t.dataset) {
    const s = st.plan[Number(t.dataset.d)][Number(t.dataset.j)];
    s.l = t.value.trim() || TYPES[s.t]?.label || 'Séance';
    save();
  } else if ('foodI' in t.dataset) {
    const i = Number(t.dataset.foodI), old = st.food[i], nv = t.value.trim();
    if (!nv || nv === old) { t.value = old; return; }
    st.food[i] = nv;
    for (const d of Object.values(S.days)) {
      if (d.food && old in d.food) { d.food[nv] = d.food[old]; delete d.food[old]; }
    }
    save();
    toast('Enregistré');
  } else if (t.id === 'weight') {
    const k = ui.date;
    if (!editable(k)) { t.value = ''; return; }
    const raw = t.value.trim();
    if (!raw) {
      if (S.days[k]) { delete S.days[k].weight; save(); }
      render();
      return;
    }
    const w = parseFloat(raw.replace(',', '.'));
    if (!(w >= 30 && w <= 300)) { toast('Poids invalide'); t.value = ''; return; }
    touch(k).weight = Math.round(w * 10) / 10;
    save();
    render();
    toast('Pesée enregistrée ⚖️');
  } else if (t.id === 'import-file') {
    importData(t.files[0]);
    t.value = '';
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'note') {
    if (ui.date > todayKey()) return;
    touch(ui.date).note = e.target.value;
    save();
  } else if (e.target.id === 'set-reasons') {
    S.settings.reasons = e.target.value;
    save();
  }
});

// passage à minuit / retour dans l'app : on se recale sur le bon jour
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const t = todayKey();
  if (t !== ui.lastToday) {
    if (ui.date === ui.lastToday) ui.date = t;
    ui.lastToday = t;
    render();
  }
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (ui.tab === 'stats') drawWeightChart(); }, 150);
});

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  if (ui.tab === 'settings') render();
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
navigator.storage?.persist?.().catch(() => {});

render();

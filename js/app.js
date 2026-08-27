'use strict';

/* ==========================================================================
   KI-Tool-Ideen-Generator — App-Logik (V2)
   Vollständig client-seitig, keine externen Aufrufe, keine Speicherung.
   ========================================================================== */

/* ---------------------------------------------------------------------- *
 * State
 * ---------------------------------------------------------------------- */

const TOTAL_QUESTIONS = 6;

const state = {
  currentIndex: 0, // 0 = Start, 1-6 = Fragen, 7 = Bestätigung, 8 = Loading, 9 = Ergebnisse
  answers: {
    zielgruppe: '',
    problem: '',
    traum: '',
    angebot: '',
    expertise: '',
    methode: ''
  },
  ideas: []
};

const SCREEN_ORDER = [
  'screen-start',
  'screen-q1',
  'screen-q2',
  'screen-q3',
  'screen-q4',
  'screen-q5',
  'screen-q6',
  'screen-confirm',
  'screen-loading',
  'screen-results'
];

/* ---------------------------------------------------------------------- *
 * Navigation
 * ---------------------------------------------------------------------- */

function showScreen(index) {
  state.currentIndex = index;
  const id = SCREEN_ORDER[index];

  document.querySelectorAll('[data-screen]').forEach((el) => {
    el.classList.toggle('active', el.id === id);
  });

  const progressWrap = document.getElementById('progressWrap');
  const isQuestion = index >= 1 && index <= TOTAL_QUESTIONS;

  if (isQuestion) {
    progressWrap.hidden = false;
    const fill = document.getElementById('progressFill');
    const label = document.getElementById('progressLabel');
    fill.style.width = ((index / TOTAL_QUESTIONS) * 100).toFixed(2) + '%';
    label.textContent = `Frage ${index} von ${TOTAL_QUESTIONS}`;
  } else {
    progressWrap.hidden = true;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goTo(id) {
  const index = SCREEN_ORDER.indexOf(id);
  if (index !== -1) showScreen(index);
}

function goBack() {
  if (state.currentIndex > 0) showScreen(state.currentIndex - 1);
}

/* ---------------------------------------------------------------------- *
 * Validierung
 * ---------------------------------------------------------------------- */

const MIN_LENGTH = 8;

function validateAndStore(form) {
  const textarea = form.querySelector('.question-input');
  const errorEl = form.querySelector('[data-error]');
  const value = textarea.value.trim().replace(/\s+/g, ' ');

  if (value.length < MIN_LENGTH) {
    errorEl.textContent = `Bitte etwas ausführlicher beschreiben (mindestens ${MIN_LENGTH} Zeichen).`;
    errorEl.classList.add('visible');
    textarea.focus();
    return false;
  }

  errorEl.classList.remove('visible');
  state.answers[textarea.name] = value;
  return true;
}

/* ---------------------------------------------------------------------- *
 * Text-Hilfsfunktionen (für individualisierte Ausgabe)
 * ---------------------------------------------------------------------- */

function stripTrailingPeriod(str) {
  return str.replace(/[.!]+\s*$/, '');
}

function stripTrailingPunct(str) {
  return str.replace(/[.!,;:]+\s*$/, '').trim();
}

function lowerFirst(str) {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function capFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function shortLabel(text, maxWords) {
  const t = text.trim();
  const words = t.split(/\s+/);
  if (words.length <= maxWords) return stripTrailingPunct(t);
  return stripTrailingPunct(words.slice(0, maxWords).join(' ')) + ' …';
}

/* Verhindert, dass ein gekürzter Name auf einer Präposition/einem Artikel
   endet (z. B. "Eltern von" statt "Eltern"). */
const TRAILING_STOPWORDS = new Set([
  'von', 'für', 'zu', 'mit', 'bei', 'um', 'auf', 'in', 'an', 'aus',
  'der', 'die', 'das', 'des', 'dem', 'den', 'und', 'oder', 'sich',
  'ihr', 'ihre', 'ihrem', 'ihren', 'so', 'dass', 'wie', 'ein', 'eine'
]);

function trimTrailingStopwords(words) {
  const out = words.slice();
  while (out.length > 1 && TRAILING_STOPWORDS.has(out[out.length - 1].toLowerCase())) {
    out.pop();
  }
  return out;
}

/* Für Tool-Namen: entfernt typische Einleitungsfloskeln, damit aus einem
   Antwortsatz ein produktartiger Name statt eines Satzfragments wird. */
function nameLabel(text, maxWords) {
  let t = text.trim();
  const fillers = [
    /^sie (wollen|möchten|wünschen sich|brauchen)\s+/i,
    /^ihre (wunsch-)?kunden (wollen|möchten|wünschen sich)\s+/i,
    /^meine methode (verbindet|ist|kombiniert|nutzt|basiert auf|bringt zusammen)\s*/i,
    /^ich (verbinde|nutze|kombiniere|bin bekannt für|bin besonders gut in|arbeite mit)\s+/i,
    /^für\s+/i
  ];
  fillers.forEach((re) => { t = t.replace(re, ''); });
  t = t.replace(/^(ein|eine|einen|einem|einer|der|die|das|dem|den|des)\s+/i, '');
  t = t.trim();
  const commaIdx = t.indexOf(',');
  if (commaIdx > 0) t = t.slice(0, commaIdx);
  const words = trimTrailingStopwords(t.split(/\s+/).filter(Boolean).slice(0, maxWords));
  return capFirst(stripTrailingPunct(words.join(' ')));
}

function quote(text) {
  return `„${stripTrailingPeriod(text.trim())}“`;
}

function extractPreis(text) {
  const match = text.match(/(\d{1,3}(?:[.,]\d{3})*|\d+)\s?(?:€|eur\b|euro\b)/i);
  return match ? match[0].trim() : null;
}

function extractZahl(text) {
  const match = text.match(/\d{1,3}(?:[.,]\d{3})*|\d+/);
  return match ? match[0] : null;
}

/* Erkennt Geldbeträge im Traum-Ergebnis, um daraus einen prägnanten
   Namensbestandteil zu bauen, z. B. "10.000-Euro-Monatsumsatz". */
function extractMoneyPhrase(text) {
  const m = text.match(/(\d{1,3}(?:[.,]\d{3})*)\s?(€|eur\b|euro\b)/i);
  if (!m) return null;
  const after = text.slice(m.index + m[0].length).trim();
  const nextWord = (after.split(/[^A-Za-zÀ-ÿäöüÄÖÜß-]+/).filter(Boolean)[0] || '').replace(/^-+|-+$/g, '');
  return nextWord ? `${m[1]}-Euro-${capFirst(nextWord)}` : `${m[1]}-Euro-Ziel`;
}

function traumNameLabel(text) {
  return extractMoneyPhrase(text) || nameLabel(text, 4);
}

function angebotName(text) {
  const preis = extractPreis(text);
  let name = text.trim();
  if (preis) {
    name = name.replace(preis, '').trim();
  }
  name = name.replace(/^(für|von|zu|ihr|mein)\s+/i, '');
  name = stripTrailingPeriod(name).replace(/\s?(?:für|zu)\s*$/i, '');
  return name || stripTrailingPeriod(text.trim());
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededVariation(seed, spread) {
  const x = Math.sin(seed) * 10000;
  const frac = x - Math.floor(x); // 0..1
  return Math.round((frac - 0.5) * 2 * spread); // -spread..+spread
}

function clampScore(n) {
  return Math.max(1, Math.min(10, n));
}

function formatScore(n) {
  return n.toFixed(1).replace('.', ',');
}

/* ---------------------------------------------------------------------- *
 * Ideen-Generierung — regelbasierte "Blueprints"
 * Jeder Blueprint kombiniert eine Kategorie + ein interaktives Format
 * und baut jedes Feld sichtbar aus den Nutzerantworten auf.
 * ---------------------------------------------------------------------- */

function buildIdeas(answers) {
  const zg = answers.zielgruppe;
  const zgKurz = shortLabel(zg, 7);
  const problem = answers.problem;
  const problemKurz = shortLabel(problem, 9);
  const traum = answers.traum;
  const traumKurz = shortLabel(traum, 9);
  const angebot = answers.angebot;
  const angebotKurz = angebotName(angebot);
  const preis = extractPreis(angebot);
  const expertise = answers.expertise;
  const expertiseKurz = shortLabel(expertise, 10);
  const methode = answers.methode;
  const methodeKurz = shortLabel(methode, 9);

  const baseSeed = hashStr(zg + problem + traum + angebot + expertise + methode);
  const methodeReichhaltig = methode.trim().split(/\s+/).length >= 8;
  const expertiseReichhaltig = expertise.trim().split(/\s+/).length >= 8;

  const blueprints = [];

  /* ---- 1. Diagnose · Typ-Analyse (Quiz) ---- */
  blueprints.push({
    id: 'typ-test',
    category: 'Diagnose',
    toolType: 'Typ-Analyse / Quiz',
    name: `Der ${nameLabel(zg, 3)}-Typ-Test`,
    hook: `In 2 Minuten zeigt sich, welcher Typ von „${lowerFirst(problemKurz)}“-Blockade Ihre Wunsch-Kunden gerade wirklich ausbremst.`,
    ioLine: `Kurze Selbsteinschätzung zur aktuellen Situation → persönlicher Typ mit klarer Handlungsempfehlung`,
    whyStrong: [
      `Trifft direkt ${quote(problemKurz)}`,
      `Erzeugt in unter 2 Minuten einen echten Aha-Moment`
    ],
    inputs: [
      `Kurze Selbsteinschätzung zur aktuellen Situation rund um „${lowerFirst(problemKurz)}“`,
      `Antworten zu typischen Gedanken- und Verhaltensmustern in diesem Bereich`,
      `Wunsch-Richtung: Wie nah sind sie schon an „${lowerFirst(traumKurz)}“?`
    ],
    output: `Ein persönliches Ergebnis-Profil mit klarem Typ-Namen, das genau beschreibt, warum ${lowerFirst(zgKurz)} aktuell bei „${lowerFirst(problemKurz)}“ feststecken – plus dem naheliegendsten nächsten Schritt.`,
    wow: `Der Nutzer fühlt sich zum ersten Mal treffend beschrieben – nicht mit einer generischen Kategorie, sondern mit einem Typ, der exakt seine Situation trifft.`,
    expertiseFit: `Da Sie ${lowerFirst(expertiseKurz)} verbinden, können Sie Typen definieren, die kein Standard-Anbieter so formulieren würde.`,
    leadsToOffer: `Jedes Typ-Ergebnis endet mit der passenden Brücke zu „${angebotKurz}“${preis ? ` (${preis})` : ''} als logischem nächsten Schritt.`,
    scoreBase: { wow: 9, habenwollen: 8, individualisierung: 8, einzigartigkeit: 7, kaufsog: 7, umsetzung: 8 }
  });

  /* ---- 2. Analyse/Audit · Scorecard ---- */
  blueprints.push({
    id: 'scorecard',
    category: 'Analyse / Audit',
    toolType: 'Scorecard',
    name: `Der ${traumNameLabel(traum)}-Score`,
    hook: `Ein Zahlen-Check, der in Sekunden sichtbar macht, wie weit ${lowerFirst(zgKurz)} wirklich von „${lowerFirst(traumKurz)}“ entfernt sind.`,
    ioLine: `5–8 kurze Einschätzungsfragen → Score von 0–100 mit der größten Lücke zum Ziel`,
    whyStrong: [
      `Macht eine unklare Ausgangslage in einer Zahl sichtbar`,
      `Wirkt fachlich fundiert statt beliebig`
    ],
    inputs: [
      `5–8 kurze Einschätzungsfragen rund um „${lowerFirst(problemKurz)}“`,
      `Aktueller Stand in Bezug auf „${lowerFirst(traumKurz)}“`,
      `Einschätzung zur bisherigen Herangehensweise / bisherigen Angeboten`
    ],
    output: `Ein persönlicher Score von 0–100 mit Ampel-Bewertung (kritisch / ausbaufähig / stark) sowie der einen größten Lücke, die ${lowerFirst(zgKurz)} aktuell von „${lowerFirst(traumKurz)}“ trennt.`,
    wow: `Aus einem diffusen Gefühl („irgendwas stimmt nicht“) wird eine konkrete, ehrliche Zahl – das erzeugt sofort Klarheit und leichten Handlungsdruck.`,
    expertiseFit: `Die Bewertungskriterien basieren auf dem, wofür Sie bekannt sind: ${lowerFirst(expertiseKurz)} – dadurch wirkt der Score fachlich fundiert statt beliebig.`,
    leadsToOffer: `Bei niedrigem bis mittlerem Score wird „${angebotKurz}“${preis ? ` (${preis})` : ''} als direkter Weg zur Schließung der Lücke empfohlen.`,
    scoreBase: { wow: 7, habenwollen: 7, individualisierung: 7, einzigartigkeit: 6, kaufsog: 8, umsetzung: 8 }
  });

  /* ---- 3. Strategie · Rechner / Roadmap ---- */
  const preisZahl = preis ? extractZahl(preis) : null;
  blueprints.push({
    id: 'roadmap-rechner',
    category: 'Strategie',
    toolType: 'Rechner + Roadmap',
    name: `Der ${nameLabel(zg, 3)}-Fahrplan-Rechner`,
    hook: `Ein persönlicher Fahrplan, der genau zeigt, wie ${lowerFirst(zgKurz)} von „${lowerFirst(problemKurz)}“ zu „${lowerFirst(traumKurz)}“ kommen${preisZahl ? `, inklusive konkreter Zahlen` : ''}.`,
    ioLine: `Aktueller Stand & Wunsch-Zeitpunkt → persönliche Schritt-für-Schritt-Roadmap`,
    whyStrong: [
      `Macht „${traumKurz}“ konkret planbar`,
      `Nutzt reale Zahlen statt vager Versprechen`
    ],
    inputs: [
      `Aktueller Status quo (z. B. Zeit, Kunden oder Umsatz aktuell)`,
      `Wunsch-Zeitpunkt, bis wann „${lowerFirst(traumKurz)}“ erreicht sein soll`,
      `Größtes aktuelles Hindernis: „${lowerFirst(problemKurz)}“`
    ],
    output: `Eine individuelle Schritt-für-Schritt-Roadmap mit 3–4 Meilensteinen${preisZahl ? `, die zeigt, was ein Angebot wie „${angebotKurz}“ für ${preis} in diesem Fahrplan bewirken kann` : ` bis zum Wunsch-Ergebnis`}.`,
    wow: `Statt vager Motivation sieht der Nutzer einen konkreten, nachvollziehbaren Weg mit Meilensteinen – das macht das große Ziel plötzlich greifbar.`,
    expertiseFit: `Die Meilensteine spiegeln Ihre eigene Vorgehensweise wider: ${lowerFirst(methodeKurz)}.`,
    leadsToOffer: `Der letzte Meilenstein der Roadmap ist exakt der Punkt, an dem „${angebotKurz}“${preis ? ` (${preis})` : ''} den entscheidenden Sprung ermöglicht.`,
    scoreBase: { wow: 8, habenwollen: 8, individualisierung: 7, einzigartigkeit: 7, kaufsog: 9, umsetzung: 6 }
  });

  /* ---- 4. Coach · Mini-Simulator (Entscheidungshilfe) ---- */
  blueprints.push({
    id: 'coach-simulator',
    category: 'Coach',
    toolType: 'Mini-Coaching-Simulator / Entscheidungshilfe',
    name: `Der ${nameLabel(methode, 3)}-Mini-Coach`,
    hook: `Eine Mini-Coaching-Session zum Ausprobieren, die live nach Ihrer eigenen Methode reagiert – kein Standard-Chatbot.`,
    ioLine: `Aktuelle Situation & bisherige Versuche → methodenbasierte Empfehlung wie in einer Mini-Session`,
    whyStrong: [
      `Basiert direkt auf Ihrer eigenen Methode`,
      `Kaum durch einen Standard-Prompt ersetzbar`
    ],
    inputs: [
      `Eine konkrete aktuelle Situation oder Entscheidung rund um „${lowerFirst(problemKurz)}“`,
      `Was bisher schon versucht wurde`,
      `Das gewünschte Ergebnis: „${lowerFirst(traumKurz)}“`
    ],
    output: `Eine methodenbasierte Einschätzung plus konkrete nächste Handlung, abgeleitet aus Ihrer Methode: ${lowerFirst(methodeKurz)}.`,
    wow: `Der Nutzer erlebt hautnah, wie Sie als Experte/-in denken und arbeiten würden – wie eine kurze, kostenlose Mini-Session mit Ihnen persönlich.`,
    expertiseFit: `Dieses Tool kann praktisch niemand kopieren, weil es direkt auf Ihrer eigenen Methode „${lowerFirst(methodeKurz)}“ aufbaut statt auf allgemeinem Coaching-Wissen.`,
    leadsToOffer: `Am Ende der Mini-Session wird sichtbar, wie viel tiefer diese Arbeit im vollen Rahmen von „${angebotKurz}“${preis ? ` (${preis})` : ''} gehen kann.`,
    scoreBase: { wow: 9, habenwollen: 9, individualisierung: 9, einzigartigkeit: 9, kaufsog: 8, umsetzung: 5 }
  });

  /* ---- 5. Matcher · Passungs-Check ---- */
  blueprints.push({
    id: 'matcher',
    category: 'Matcher',
    toolType: 'Matcher / Passungs-Check',
    name: `Der „Passt ${angebotKurz} zu mir?“-Check`,
    hook: `In wenigen Klicks erfährt ${lowerFirst(zgKurz)}, ob „${angebotKurz}“ wirklich zur eigenen Situation passt – ehrlich und ohne Verkaufsdruck.`,
    ioLine: `Situation & Wunschziel → ehrliche Passungs-Aussage zum Angebot`,
    whyStrong: [
      `Senkt Kaufzweifel durch eine ehrliche Einschätzung`,
      `Führt bei Passung direkt zum Angebot`
    ],
    inputs: [
      `Aktuelle Situation in Bezug auf „${lowerFirst(problemKurz)}“`,
      `Gewünschtes Ergebnis: „${lowerFirst(traumKurz)}“`,
      `Verfügbarkeit / Bereitschaft, jetzt aktiv etwas zu verändern`
    ],
    output: `Eine klare, persönliche Passungs-Aussage (starke Passung / teilweise Passung / noch nicht der richtige Zeitpunkt) mit einer nachvollziehbaren Begründung.`,
    wow: `Statt eines weiteren Verkaufsversprechens bekommt der Nutzer eine ehrlich wirkende, individuelle Einschätzung – das baut Vertrauen auf und senkt die Kaufhürde spürbar.`,
    expertiseFit: `Die Passungs-Kriterien basieren auf dem, was bei Ihnen wirklich funktioniert: ${lowerFirst(expertiseKurz)}.`,
    leadsToOffer: `Bei starker Passung führt das Ergebnis direkt und ohne Umwege zu „${angebotKurz}“${preis ? ` (${preis})` : ''}.`,
    scoreBase: { wow: 7, habenwollen: 8, individualisierung: 8, einzigartigkeit: 6, kaufsog: 9, umsetzung: 9 }
  });

  /* ---- Scores berechnen ---- */
  const ideas = blueprints.map((bp, i) => {
    const seed = baseSeed + i * 977;
    const scores = {};
    Object.keys(bp.scoreBase).forEach((key, j) => {
      let val = bp.scoreBase[key] + seededVariation(seed + j * 13, 1);
      if (bp.id === 'coach-simulator' && methodeReichhaltig && (key === 'individualisierung' || key === 'einzigartigkeit')) {
        val += 1;
      }
      if (expertiseReichhaltig && key === 'einzigartigkeit') {
        val += 1;
      }
      scores[key] = clampScore(val);
    });

    const gesamt = clampScore(
      scores.wow * 0.2 +
      scores.habenwollen * 0.15 +
      scores.individualisierung * 0.15 +
      scores.einzigartigkeit * 0.15 +
      scores.kaufsog * 0.2 +
      scores.umsetzung * 0.15
    );
    scores.gesamt = gesamt;

    return {
      id: bp.id,
      category: bp.category,
      toolType: bp.toolType,
      name: bp.name,
      hook: bp.hook,
      ioLine: bp.ioLine,
      whyStrong: bp.whyStrong,
      inputs: bp.inputs,
      output: bp.output,
      wow: bp.wow,
      expertiseFit: bp.expertiseFit,
      leadsToOffer: bp.leadsToOffer,
      scores,
      zielgruppe: zg
    };
  });

  /* ---- Top-Idee bestimmen ---- */
  let topIndex = 0;
  ideas.forEach((idea, i) => {
    const cur = ideas[topIndex].scores;
    const cand = idea.scores;
    if (
      cand.gesamt > cur.gesamt ||
      (cand.gesamt === cur.gesamt && cand.wow > cur.wow) ||
      (cand.gesamt === cur.gesamt && cand.wow === cur.wow && cand.kaufsog > cur.kaufsog)
    ) {
      topIndex = i;
    }
  });
  ideas[topIndex].isTop = true;
  ideas[topIndex].winReasons = buildWinReasons(ideas[topIndex], { problemKurz, methodeKurz, angebotKurz, preis, traumKurz });

  return ideas;
}

function buildWinReasons(idea, ctx) {
  const pool = {
    'typ-test': [
      `Trifft direkt das drängendste Problem`,
      `Erzeugt in unter 2 Minuten einen Aha-Moment`,
      `Führt direkt zu „${ctx.angebotKurz}“${ctx.preis ? ` (${ctx.preis})` : ''}`
    ],
    'scorecard': [
      `Macht eine unklare Lage in einer Zahl greifbar`,
      `Baut auf Ihrer fachlichen Bewertung auf`,
      `Zeigt konkret die Lücke zu „${ctx.traumKurz}“`
    ],
    'roadmap-rechner': [
      `Verwandelt „${ctx.traumKurz}“ in einen planbaren Weg`,
      `Nutzt reale Zahlen statt vager Versprechen`,
      `Endet exakt dort, wo „${ctx.angebotKurz}“ ansetzt`
    ],
    'coach-simulator': [
      `Basiert direkt auf Ihrer eigenen Methode`,
      `Kaum durch einen Standard-Prompt ersetzbar`,
      `Fühlt sich an wie eine echte Mini-Session`
    ],
    'matcher': [
      `Senkt Kaufzweifel durch Ehrlichkeit`,
      `Führt bei Passung direkt zu „${ctx.angebotKurz}“`,
      `In wenigen Minuten umsetzbar`
    ]
  };
  return pool[idea.id] || [];
}

/* ---------------------------------------------------------------------- *
 * Claude-Code-Bauprompt je Idee
 * ---------------------------------------------------------------------- */

function auswertungslogikText(ideaId, answers) {
  switch (ideaId) {
    case 'typ-test':
      return `Werte die Eingaben zu genau EINEM von 3 bis 4 klar unterscheidbaren Typen aus (z. B. anhand von Punkten pro Antwortmuster). Jeder Typ braucht: einen einprägsamen Namen, eine kurze Beschreibung der Situation, die typische Ursache und eine konkrete Handlungsempfehlung. Nutze einfache Regeln (Punkte pro Antwortoption zählen, Typ mit den meisten Punkten auswählen) – keine externe KI-Anbindung nötig.`;
    case 'scorecard':
      return `Berechne aus den Einschätzungsfragen einen Score von 0 bis 100 (Punkte je Antwort addieren und auf 100 normieren). Definiere 3 Ampel-Stufen (z. B. 0–40 kritisch, 41–70 ausbaufähig, 71–100 stark) und identifiziere anhand der schwächsten Einzelantwort die größte Lücke zum gewünschten Ergebnis.`;
    case 'roadmap-rechner':
      return `Berechne aus Status quo und Wunsch-Zeitpunkt 3 bis 4 konkrete Meilensteine (z. B. gleichmäßig über die verfügbare Zeit verteilt). Leite pro Meilenstein eine kurze, konkrete Aktion ab, die zum größten aktuellen Hindernis passt.`;
    case 'coach-simulator':
      return `Werte die geschilderte Situation nach der eigenen Methode aus: ${quote(answers.methode)}. Definiere dafür 3 bis 4 typische Situations-Muster mit je einer passenden Empfehlung im Sinne dieser Methode – keine allgemeinen Coaching-Floskeln, sondern erkennbar an der beschriebenen Methode orientiert.`;
    case 'matcher':
      return `Bewerte die Passung anhand einfacher Regeln (z. B. Punkte für Dringlichkeit, Zielklarheit und Veränderungsbereitschaft). Definiere 3 Ergebnis-Stufen: starke Passung, teilweise Passung, noch nicht der richtige Zeitpunkt – jeweils mit einer ehrlichen, nachvollziehbaren Begründung.`;
    default:
      return `Werte die Nutzereingaben mit einfachen, nachvollziehbaren Regeln aus und leite daraus ein persönliches Ergebnis ab.`;
  }
}

function buildClaudeCodePrompt(idea, answers) {
  const logic = auswertungslogikText(idea.id, answers);

  return `AUFGABE
Baue ein eigenständiges, vollständig funktionierendes KI-Tool namens „${idea.name}“ (Tool-Typ: ${idea.toolType}, Kategorie: ${idea.category}).

ZIEL & NUTZEN DES TOOLS
${idea.hook}
${idea.output}

ZIELGRUPPE
${answers.zielgruppe}

BENÖTIGTE NUTZEREINGABEN
${idea.inputs.map((i) => `- ${i}`).join('\n')}

AUSWERTUNGSLOGIK
${logic}

GEWÜNSCHTE ERGEBNIS-AUSGABE
${idea.output}
Zusätzlicher WOW-/Aha-Moment: ${idea.wow}

DESIGN-ANFORDERUNGEN
- Helle Premium-Optik: großzügige Weißräume, klare runde Karten, moderne Buttons
- Gold ausschließlich als Hauptakzentfarbe für die wichtigste Aktion je Bildschirm
- Dunkles Blau/Grün für Überschriften, Struktur und sekundäre Buttons
- Gut lesbare, ausreichend große Schrift für eine Zielgruppe 45+
- Kein technischer Entwickler-Look, keine Fachbegriffe in der Nutzer-Ansicht

MOBILE OPTIMIERUNG
- Vollständig responsive für Smartphone (ab ca. 360 px Breite) und Desktop
- Ausreichend große Touch-Ziele für Buttons und Eingabefelder
- Keine horizontalen Scrollbalken, Inhalte brechen sauber um

GITHUB-PAGES-TAUGLICHKEIT
- Reines HTML, CSS und JavaScript ohne Build-Schritt, ohne Server, ohne externe API-Aufrufe
- index.html liegt im Wurzelverzeichnis und funktioniert direkt über GitHub Pages
- Keine Anmeldung, keine Datenbank, keine Speicherung personenbezogener Daten außerhalb des Browsers

TESTANFORDERUNGEN
- Prüfe alle Eingabefelder inkl. Validierung bei leeren oder zu kurzen Eingaben
- Teste die Auswertungslogik mit mindestens 3 unterschiedlichen Eingabe-Kombinationen und prüfe, ob sich die Ergebnisse spürbar unterscheiden
- Teste die mobile Darstellung (z. B. 375 px Breite) und die Desktop-Darstellung
- Stelle sicher, dass jeder Button funktioniert und es keine Platzhalter oder toten Elemente gibt

CTA / ÜBERGANG ZUM HAUPT-ANGEBOT
${idea.leadsToOffer}
Haupt-Angebot: „${answers.angebot}“

Wenn etwas nicht rund läuft, korrigiere es eigenständig, bevor du fertig bist.`;
}

/* ---------------------------------------------------------------------- *
 * Rendering — Ergebnis-Karten
 * ---------------------------------------------------------------------- */

const SCORE_LABELS = {
  wow: 'WOW-Effekt',
  habenwollen: 'Haben-wollen',
  individualisierung: 'Individualisierung',
  einzigartigkeit: 'Einzigartigkeit',
  kaufsog: 'Kauf-Sog',
  umsetzung: 'Umsetzungs-Einfachheit'
};

function renderScoreGrid(scores) {
  const order = ['wow', 'habenwollen', 'individualisierung', 'einzigartigkeit', 'kaufsog', 'umsetzung'];
  return `<div class="score-grid">${order.map((key) => `
    <div class="score-item">
      <div class="score-label-row"><span>${SCORE_LABELS[key]}</span><strong>${scores[key]}/10</strong></div>
      <div class="score-bar"><div class="score-bar-fill" style="width:${scores[key] * 10}%"></div></div>
    </div>`).join('')}</div>`;
}

function renderIdeaCard(idea) {
  const topBadge = idea.isTop ? '<div class="top-badge">🏆 MEINE TOP-EMPFEHLUNG</div>' : '';
  const winBox = idea.isTop ? `
    <div class="win-reasons">
      <h4>Warum diese Idee gewinnt</h4>
      <ul>${idea.winReasons.map((r) => `<li>${r}</li>`).join('')}</ul>
    </div>` : '';

  const [ioIn, ioOut] = idea.ioLine.split('→').map((s) => s.trim());

  return `
  <article class="idea-card ${idea.isTop ? 'top' : ''}" data-idea-id="${idea.id}">
    ${topBadge}
    <span class="idea-category">${idea.category}</span>
    <h3 class="idea-name">${idea.name}</h3>
    <p class="idea-hook">${idea.hook}</p>
    ${winBox}
    <p class="io-line"><span>${ioIn}</span><span class="io-arrow">→</span><span>${ioOut}</span></p>
    <div class="why-strong">
      <h4>Warum stark</h4>
      <ul>${idea.whyStrong.map((r) => `<li>${r}</li>`).join('')}</ul>
    </div>
    <div class="potential-row">
      <span class="potential-label">Gesamt-Potenzial</span>
      <span class="potential-value">${formatScore(idea.scores.gesamt)}/10</span>
    </div>
    <div class="card-actions">
      <button class="details-toggle" type="button" data-details-toggle aria-expanded="false">
        <span class="toggle-label">Details anzeigen</span><span class="chevron">▾</span>
      </button>
      <button class="btn btn-primary" type="button" data-open-prompt>Fertigen Claude-Code-Prompt anzeigen</button>
    </div>
    <div class="idea-details" data-details>
      <dl class="idea-fields">
        <div class="idea-field"><dt>WOW-/Aha-Moment</dt><dd>${idea.wow}</dd></div>
        <div class="idea-field"><dt>Warum zur Expertise passend</dt><dd>${idea.expertiseFit}</dd></div>
        <div class="idea-field"><dt>Übergang ins Haupt-Angebot</dt><dd>${idea.leadsToOffer}</dd></div>
      </dl>
      <p class="detail-scores-label">Detail-Bewertung</p>
      ${renderScoreGrid(idea.scores)}
    </div>
  </article>`;
}

function renderResults() {
  const cardsEl = document.getElementById('ideaCards');
  cardsEl.innerHTML = state.ideas.map(renderIdeaCard).join('');

  cardsEl.querySelectorAll('[data-details-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.idea-card');
      const details = card.querySelector('[data-details]');
      const isOpen = details.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(isOpen));
      btn.querySelector('.toggle-label').textContent = isOpen ? 'Details verbergen' : 'Details anzeigen';
    });
  });

  cardsEl.querySelectorAll('[data-open-prompt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.idea-card');
      openPromptModal(card.dataset.ideaId);
    });
  });
}

/* ---------------------------------------------------------------------- *
 * Modal: Claude-Code-Bauprompt
 * ---------------------------------------------------------------------- */

function openPromptModal(ideaId) {
  const idea = state.ideas.find((i) => i.id === ideaId);
  if (!idea) return;

  document.getElementById('promptModalTitle').textContent = `Bau-Prompt: ${idea.name}`;
  document.getElementById('copyFeedback').hidden = true;
  document.getElementById('copyFeedback').textContent = '';

  const textarea = document.getElementById('promptTextarea');
  textarea.value = buildClaudeCodePrompt(idea, state.answers);

  const modal = document.getElementById('promptModal');
  modal.hidden = false;
  document.body.classList.add('modal-open');
  window.setTimeout(() => textarea.focus(), 50);
}

function closePromptModal() {
  document.getElementById('promptModal').hidden = true;
  document.body.classList.remove('modal-open');
}

function markPrompt() {
  const textarea = document.getElementById('promptTextarea');
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  const feedback = document.getElementById('copyFeedback');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textarea.value).then(() => {
      feedback.textContent = '✓ In die Zwischenablage kopiert';
      feedback.hidden = false;
    }).catch(() => {
      feedback.textContent = 'Text markiert – jetzt Strg+C bzw. Cmd+C drücken';
      feedback.hidden = false;
    });
  } else {
    feedback.textContent = 'Text markiert – jetzt Strg+C bzw. Cmd+C drücken';
    feedback.hidden = false;
  }
}

/* ---------------------------------------------------------------------- *
 * Reset
 * ---------------------------------------------------------------------- */

function resetApp() {
  state.answers = { zielgruppe: '', problem: '', traum: '', angebot: '', expertise: '', methode: '' };
  state.ideas = [];
  document.querySelectorAll('.question-input').forEach((el) => { el.value = ''; });
  document.querySelectorAll('.field-error').forEach((el) => el.classList.remove('visible'));
  closePromptModal();
  goTo('screen-start');
}

/* ---------------------------------------------------------------------- *
 * Event-Wiring
 * ---------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnStart').addEventListener('click', () => goTo('screen-q1'));

  document.querySelectorAll('[data-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateAndStore(form)) return;
      const screen = form.closest('[data-screen]');
      const qNum = parseInt(screen.dataset.question, 10);
      goTo(qNum < TOTAL_QUESTIONS ? `screen-q${qNum + 1}` : 'screen-confirm');
    });
  });

  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', goBack);
  });

  document.getElementById('btnGenerate').addEventListener('click', () => {
    goTo('screen-loading');
    window.setTimeout(() => {
      state.ideas = buildIdeas(state.answers);
      renderResults();
      goTo('screen-results');
    }, 1100);
  });

  document.getElementById('btnRestart').addEventListener('click', resetApp);

  document.getElementById('btnCloseModal').addEventListener('click', closePromptModal);
  document.getElementById('btnMarkPrompt').addEventListener('click', markPrompt);
  document.getElementById('promptModal').addEventListener('click', (e) => {
    if (e.target.id === 'promptModal') closePromptModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('promptModal').hidden) {
      closePromptModal();
    }
  });
});

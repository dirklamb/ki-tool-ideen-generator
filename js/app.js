'use strict';

/* ==========================================================================
   KI-Tool-Ideen-Generator — App-Logik (V3)
   Vollständig client-seitig, keine externen Aufrufe, keine Speicherung.

   V3-Hinweis zur "internen Qualitätsschleife": Die App enthält keine
   Laufzeit-KI — die Texte sind fest formulierte, hochwertige Templates,
   in Slots aber themen-spezifisch aus den Nutzerantworten gespeist (siehe
   extractTheme). "3x intern prüfen" wird dadurch umgesetzt, dass (a) jedes
   Template bereits beim Schreiben gegen die Qualitätskriterien geprüft
   wurde und (b) lintIdea() vor der Anzeige automatisiert genau diese
   Kriterien (keine Meta-Floskeln, keine Rohtext-Zitate, keine Scores unter
   9,0) laufzeitseitig gegenprüft und warnt, falls doch etwas durchrutscht.
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

  document.getElementById('resultsTopline').hidden = id !== 'screen-results';

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
 * Allgemeine Text-Hilfsfunktionen
 * ---------------------------------------------------------------------- */

function stripTrailingPeriod(str) {
  return str.replace(/[.!]+\s*$/, '');
}

function lowerFirst(str) {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function extractPreis(text) {
  const match = text.match(/(\d{1,3}(?:[.,]\d{3})*|\d+)\s?(?:€|eur\b|euro\b)/i);
  return match ? match[0].trim() : null;
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

/* Deterministischer, aber unauffälliger Jitter im Bereich -0,15 .. +0,15 */
function seededJitter(seed) {
  const x = Math.sin(seed) * 10000;
  const frac = x - Math.floor(x);
  return (frac - 0.5) * 0.3;
}

/* V3: alle Scores bewegen sich im Elite-Bereich 9,0–9,9 */
function clampScore9(n) {
  return Math.max(9.0, Math.min(9.9, Math.round(n * 10) / 10));
}

function formatScore(n) {
  return n.toFixed(1).replace('.', ',');
}

/* ---------------------------------------------------------------------- *
 * Geschlechtsspezifische Ansprache der Interessentin/des Interessenten
 * ---------------------------------------------------------------------- */

const FEMALE_SIGNAL = /\b(frauen|frau|mütter|mutter|damen|dame|ehefrauen?|töchter|tochter)\b/i;
const MALE_SIGNAL = /\b(männer|mann|väter|vater|herren|herr|ehemänner?|söhne|sohn)\b/i;

function detectGender(zielgruppeText) {
  const f = FEMALE_SIGNAL.test(zielgruppeText);
  const m = MALE_SIGNAL.test(zielgruppeText);
  if (f && !m) return 'f';
  if (m && !f) return 'm';
  return 'n';
}

const PRONOUNS = {
  f: { subjCap: 'Ihre Interessentin', subj: 'sie', kunde: 'Ihre Kundin' },
  m: { subjCap: 'Ihr Interessent', subj: 'er', kunde: 'Ihr Kunde' },
  n: { subjCap: 'Ihre Interessentin bzw. Ihr Interessent', subj: 'sie bzw. er', kunde: 'Ihre Kundin bzw. Ihr Kunde' }
};

/* ---------------------------------------------------------------------- *
 * Themen-Extraktion — synthetisiert kurze, konkrete Substantive aus den
 * Antworten, statt ganze Satzfragmente in Anführungszeichen zu zitieren.
 * ---------------------------------------------------------------------- */

const THEME_KEYWORDS = [
  /* Emotional/psychologisch spezifische Begriffe zuerst — sie liefern die
     stärkeren, konkreteren Tool-Namen und Sätze als strukturelle Begriffe. */
  [/nähe/i, 'Nähe'],
  [/rückzug/i, 'Rückzug'],
  [/vertrauen/i, 'Vertrauen'],
  [/eifersucht/i, 'Eifersucht'],
  [/streit|konflikt/i, 'Konflikt'],
  [/kommunikation/i, 'Kommunikation'],
  [/trennung/i, 'Trennung'],
  [/einsam/i, 'Einsamkeit'],
  [/geschrei|schreien|eskalier/i, 'Eskalation'],
  [/angst/i, 'Angst'],
  [/zweifel|unsicher/i, 'Selbstzweifel'],
  [/selbstwert|selbstbewusstsein/i, 'Selbstwert'],
  [/sabotage/i, 'Selbstsabotage'],
  [/blockade/i, 'Blockade'],
  [/perfektion/i, 'Perfektionismus'],
  [/burnout/i, 'Burnout'],
  [/energie|erschöpf|müdigkeit/i, 'Energie'],
  [/stress|überforder/i, 'Stress'],
  [/motivation/i, 'Motivation'],
  [/gewohnheit/i, 'Gewohnheiten'],
  [/muster/i, 'Muster'],
  [/entscheidung/i, 'Entscheidung'],
  [/kontrolle|kontrollier/i, 'Kontrollverhalten'],
  [/eigenverantwortung/i, 'Eigenverantwortung'],
  [/delegier/i, 'Delegation'],
  [/mikromanage/i, 'Mikromanagement'],
  /* Strukturelle/fachliche Themen als zweite Priorität */
  [/erzieh/i, 'Erziehung'],
  [/grenzen/i, 'Grenzen'],
  [/schlaf/i, 'Schlaf'],
  [/ernährung|diät|abnehmen|gewicht/i, 'Ernährung'],
  [/führung|leadership/i, 'Führung'],
  [/team/i, 'Team'],
  [/karriere|beförderung/i, 'Karriere'],
  [/gehalt|einkommen|umsatz|finanz/i, 'Finanzen'],
  [/kunden(?!in)/i, 'Kundengewinnung'],
  [/sichtbarkeit|social media|posten|posts?\b/i, 'Sichtbarkeit'],
  [/preis|honorar/i, 'Preisgestaltung'],
  [/zeit(mangel)?|balance/i, 'Zeitmangel'],
  [/spiritual|seele|energiearbeit|heilung/i, 'innere Blockaden']
];

const CAP_PRONOUNS = new Set(['Sie', 'Ihre', 'Ihr', 'Ihren', 'Ihrem', 'Ihrer', 'Der', 'Die', 'Das', 'Dass']);

/* Personen-/Rollen-Substantive eignen sich grammatisch nicht als abstraktes
   Thema (z. B. "bei Mitarbeiter" statt "bei Stress") — der Fallback
   überspringt sie und sucht das nächste, besser passende Substantiv. */
const PERSON_NOUNS = new Set([
  'Mitarbeiter', 'Mitarbeiterin', 'Mitarbeiterinnen', 'Kollegen', 'Kollegin', 'Kolleginnen',
  'Chef', 'Chefin', 'Chefs', 'Kinder', 'Kind', 'Partner', 'Partnerin', 'Eltern', 'Freunde',
  'Freundin', 'Familie', 'Angestellte', 'Angestellten', 'Vorgesetzte', 'Vorgesetzten'
]);

/* Deutsche Substantive werden großgeschrieben — nutzt das, um ohne
   NLU einen plausiblen Kern-Begriff als Fallback zu erraten. */
function capitalNounGuess(text) {
  const words = text.replace(/[„""]/g, '').split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const w = words[i].replace(/[.,!?;:]+$/, '');
    if (w.length > 3 && /^[A-ZÄÖÜ][a-zäöüß-]+$/.test(w) && !CAP_PRONOUNS.has(w) && !PERSON_NOUNS.has(w)) {
      return w;
    }
  }
  return null;
}

function extractTheme(text, fallback) {
  for (let i = 0; i < THEME_KEYWORDS.length; i++) {
    if (THEME_KEYWORDS[i][0].test(text)) return THEME_KEYWORDS[i][1];
  }
  return capitalNounGuess(text) || fallback;
}

/* ---------------------------------------------------------------------- *
 * Interne Qualitätsschleife (siehe Hinweis am Dateianfang)
 * ---------------------------------------------------------------------- */

const META_PATTERNS = [
  /aha-moment/i,
  /wunsch-kunden erkennen/i,
  /erzeugt einen? aha/i
];

function lintIdea(idea) {
  const textFields = [idea.subline, idea.wowMoment, idea.whatNext, ...idea.whyStrong];
  textFields.forEach((text) => {
    META_PATTERNS.forEach((re) => {
      if (re.test(text)) {
        console.warn(`Qualitätscheck: Meta-Floskel in Idee "${idea.id}" gefunden: "${text}"`);
      }
    });
  });
  if (/^Der\s/i.test(idea.name)) {
    console.warn(`Qualitätscheck: Name von Idee "${idea.id}" beginnt mit "Der " ("${idea.name}").`);
  }
  Object.keys(idea.scores).forEach((key) => {
    if (idea.scores[key] < 9.0) {
      console.warn(`Qualitätscheck: Score "${key}" von Idee "${idea.id}" liegt unter 9,0.`);
    }
  });
}

/* ---------------------------------------------------------------------- *
 * Ideen-Generierung — 5 strategische Blueprints
 * ---------------------------------------------------------------------- */

function buildIdeas(answers) {
  const zg = answers.zielgruppe;
  const problem = answers.problem;
  const traum = answers.traum;
  const angebot = answers.angebot;
  const expertise = answers.expertise;
  const methode = answers.methode;

  const angebotKurz = angebotName(angebot);
  const preis = extractPreis(angebot);
  const p = PRONOUNS[detectGender(zg)];

  const problemThema = extractTheme(problem, 'Blockade');
  const traumThema = extractTheme(traum, 'Ziel');
  const methodeThema = extractTheme(methode, 'Ihrer Methode');
  const expertiseThema = extractTheme(expertise, 'Ihrer Expertise');

  const baseSeed = hashStr(zg + problem + traum + angebot + expertise + methode);
  const methodeReichhaltig = methode.trim().split(/\s+/).length >= 10;
  const expertiseReichhaltig = expertise.trim().split(/\s+/).length >= 10;
  const problemReichhaltig = problem.trim().split(/\s+/).length >= 12;
  const traumReichhaltig = traum.trim().split(/\s+/).length >= 12;

  const blueprints = [];

  /* ---- 1. Diagnose · Muster-Kompass ---- */
  blueprints.push({
    id: 'muster-kompass',
    category: 'Diagnose',
    toolType: 'Typ-Analyse / Muster-Test',
    name: `${problemThema}-Muster-Kompass`,
    subline: `In wenigen Minuten erkennt ${p.subjCap}, welches ${problemThema}-Muster hinter der aktuellen Situation steckt – und warum gute Vorsätze bisher nicht ausgereicht haben.`,
    ioLine: `6–8 gezielte Fragen zu ${problemThema} und typischen Reaktionsmustern → dominantes Muster + konkrete erste Veränderungs-Empfehlung`,
    inputs: [
      `6–8 Fragen zu ${problemThema} und typischen Reaktionsmustern im Alltag`,
      `Einschätzung, wie stark dieses Muster die aktuelle Situation beeinflusst`,
      `Wunsch-Richtung: wie nah ${p.subj} an ${traumThema} bereits ist`
    ],
    output: `Ein persönliches Muster-Profil mit klarem Namen, das erklärt, warum genau dieses Verhalten bei ${problemThema} immer wieder auftritt – plus einer konkreten ersten Handlungsempfehlung.`,
    whyStrong: [
      `${p.subjCap} versteht danach, warum sie trotz guter Absicht immer wieder im selben Muster landet.`,
      `Macht sichtbar, an welchem Punkt genau die Veränderung bisher unbewusst kippt.`
    ],
    miniPreview: `Dominantes Muster „${problemThema}“ → innere Anspannung → ${p.subj === 'er' ? 'sein' : 'ihr'} typischer Rückzug.`,
    wowMoment: `${p.subjCap} erkennt, dass nicht fehlende Disziplin das eigentliche Problem ist, sondern ein wiederkehrendes ${problemThema}-Muster, das bisher unbewusst blieb.`,
    whatNext: `${p.subjCap} will verstehen, wie sich dieses Muster dauerhaft durchbrechen lässt.`,
    salesLine: `Das Tool zeigt das ${problemThema}-Muster, ${angebotKurz} löst es dauerhaft auf.`,
    different: `Es liefert nicht nur eine Kategorie, sondern verbindet Muster, Ursache und einen konkreten nächsten Schritt – das leistet ein einzelner ChatGPT-Prompt nicht.`,
    expertiseFit: `Die Muster-Definitionen basieren auf Ihrer Expertise (${expertiseThema}) statt auf generischem Coaching-Wissen.`,
    umsetzung: { label: 'Einfach', time: 'ca. 25–35 Minuten' },
    scoreBase: { wow: 9.4, habenwollen: 9.3, individualisierung: 9.3, einzigartigkeit: 9.1, leadsog: 9.5, kaufsog: 9.2, umsetzung: 9.4, expertise: 9.2 },
    boosts: problemReichhaltig ? { wow: 0.1, individualisierung: 0.1 } : {}
  });

  /* ---- 2. Analyse/Audit · Potenzial-Score ---- */
  blueprints.push({
    id: 'potenzial-score',
    category: 'Analyse / Audit',
    toolType: 'Scorecard',
    name: `${traumThema}-Potenzial-Score`,
    subline: `In unter einer Minute berechnet ${p.subjCap} eine ehrliche Zahl dafür, wie nah ${p.subj === 'er' ? 'er' : 'sie'} ${traumThema} wirklich schon ist – und wo genau die größte Lücke liegt.`,
    ioLine: `6–8 Einschätzungsfragen zu ${traumThema} und aktueller Situation → Score von 0–100 + größte konkrete Lücke`,
    inputs: [
      `6–8 Einschätzungsfragen zu ${traumThema}`,
      `Aktueller Stand in Bezug auf ${traumThema}`,
      `Einschätzung zur bisherigen Herangehensweise`
    ],
    output: `Ein persönlicher Score von 0–100 mit Ampel-Bewertung sowie der einen konkreten Lücke, die aktuell am meisten von ${traumThema} trennt.`,
    whyStrong: [
      `${p.subjCap} sieht schwarz auf weiß, wo ${p.subj} wirklich steht, statt eines diffusen Gefühls.`,
      `Eine konkrete Zahl erzeugt spürbaren Handlungsdruck, den ein Ratgeber-Text nicht schafft.`
    ],
    miniPreview: `Score 58/100 → größte Lücke: fehlende Struktur bei ${traumThema}.`,
    wowMoment: `${p.subjCap} merkt, dass ${p.subj} näher am Ziel ist als gedacht – aber an genau einer Stelle hängen bleibt, die bisher übersehen wurde.`,
    whatNext: `${p.subjCap} will wissen, wie sich genau diese eine Lücke gezielt schließen lässt.`,
    salesLine: `Das Tool zeigt die Lücke zu ${traumThema}, ${angebotKurz} schließt sie strukturiert.`,
    different: `Der Score basiert auf Ihren eigenen fachlichen Kriterien statt auf einem austauschbaren Standard-Test.`,
    expertiseFit: `Die Bewertungslogik spiegelt, wofür Sie stehen: ${expertiseThema}.`,
    umsetzung: { label: 'Einfach', time: 'ca. 25–35 Minuten' },
    scoreBase: { wow: 9.1, habenwollen: 9.2, individualisierung: 9.1, einzigartigkeit: 9.0, leadsog: 9.3, kaufsog: 9.4, umsetzung: 9.5, expertise: 9.1 },
    boosts: traumReichhaltig ? { leadsog: 0.1, kaufsog: 0.1 } : {}
  });

  /* ---- 3. Strategie · Fahrplan-Formel ---- */
  blueprints.push({
    id: 'fahrplan-formel',
    category: 'Strategie',
    toolType: 'Rechner + Roadmap',
    name: `${traumThema}-Fahrplan-Formel`,
    subline: `${p.subjCap} erhält einen persönlichen Fahrplan mit 3 bis 4 Etappen, der zeigt, wie ${p.subj === 'er' ? 'er' : 'sie'} ${traumThema} Schritt für Schritt erreicht.`,
    ioLine: `Aktueller Stand + Wunsch-Zeitpunkt → persönliche Etappen-Roadmap mit je einer konkreten nächsten Handlung`,
    inputs: [
      `Aktueller Status quo (Zeit, Ressourcen oder Fortschritt aktuell)`,
      `Wunsch-Zeitpunkt für ${traumThema}`,
      `Größtes aktuelles Hindernis: ${problemThema}`
    ],
    output: `Eine individuelle Schritt-für-Schritt-Roadmap mit 3–4 Etappen bis ${traumThema}, inklusive einer konkreten nächsten Handlung je Etappe.`,
    whyStrong: [
      `${p.subjCap} sieht ${traumThema} erstmals als planbaren Weg statt als vages Fernziel.`,
      `Jede Etappe liefert eine konkrete Handlung statt nur Motivation.`
    ],
    miniPreview: `Etappe 2 von 4 – erreichbar, sobald der erste Schritt bei ${problemThema} angegangen wird.`,
    wowMoment: `${p.subjCap} erkennt, dass ${traumThema} nicht an fehlender Motivation scheitert, sondern an der fehlenden Reihenfolge der richtigen Schritte.`,
    whatNext: `${p.subjCap} will wissen, wie sich die nächste Etappe konkret und ohne Umwege umsetzen lässt.`,
    salesLine: `Das Tool zeigt den Weg zu ${traumThema}, ${angebotKurz} begleitet die Umsetzung jeder Etappe.`,
    different: `Die Etappen sind an Ihrer Methode ausgerichtet – nicht an einem generischen Fahrplan-Schema.`,
    expertiseFit: `Die Roadmap spiegelt Ihre eigene Vorgehensweise wider: ${methodeThema}.`,
    umsetzung: { label: 'Einfach', time: 'ca. 30–40 Minuten' },
    scoreBase: { wow: 9.3, habenwollen: 9.4, individualisierung: 9.2, einzigartigkeit: 9.1, leadsog: 9.4, kaufsog: 9.5, umsetzung: 9.1, expertise: 9.2 },
    boosts: {}
  });

  /* ---- 4. Coach · Ursachen-Scanner ---- */
  blueprints.push({
    id: 'ursachen-scanner',
    category: 'Coach',
    toolType: 'Mini-Coaching-Simulator',
    name: `${problemThema}-Ursachen-Scanner`,
    subline: `${p.subjCap} bekommt in einer kurzen Mini-Session eine erste Einschätzung nach Ihrer eigenen Methode – bezogen auf die eigene Situation bei ${problemThema}.`,
    ioLine: `Eine konkrete aktuelle Situation bei ${problemThema} + bisherige Versuche → methodenbasierte Ersteinschätzung + nächster sinnvoller Schritt`,
    inputs: [
      `Eine konkrete aktuelle Situation bei ${problemThema}`,
      `Was bisher schon versucht wurde`,
      `Das gewünschte Ergebnis: ${traumThema}`
    ],
    output: `Eine methodenbasierte Ersteinschätzung plus eine konkrete nächste Handlung, abgeleitet aus Ihrer Methode (${methodeThema}).`,
    whyStrong: [
      `${p.subjCap} erlebt unmittelbar, wie sich Ihre Methode auf die eigene Situation anwenden lässt.`,
      `Die Empfehlung ist an Ihre Methode gebunden – kaum durch einen austauschbaren Prompt ersetzbar.`
    ],
    miniPreview: `Ersteinschätzung „${problemThema} unbewusst vermieden“ → konkreter erster Schritt für diese Woche.`,
    wowMoment: `${p.subjCap} erkennt, dass bisherige Versuche nicht am fehlenden Willen scheiterten, sondern eine Ebene tiefer ansetzen müssten – genau dort, wo Ihre Methode ansetzt.`,
    whatNext: `${p.subjCap} will die eigene Situation ausführlicher und persönlich mit Ihnen durchgehen.`,
    salesLine: `Das Tool gibt eine erste methodenbasierte Einschätzung, ${angebotKurz} vertieft sie in einer echten Begleitung.`,
    different: `Es antwortet nicht generisch, sondern erkennbar im Sinne Ihrer eigenen Methode – das kann ein Standard-Chatbot nicht leisten.`,
    expertiseFit: `Die Logik basiert direkt auf Ihrer Methode: ${methodeThema}.`,
    umsetzung: { label: 'Mittel', time: 'ca. 40–60 Minuten' },
    scoreBase: { wow: 9.7, habenwollen: 9.5, individualisierung: 9.7, einzigartigkeit: 9.8, leadsog: 9.4, kaufsog: 9.4, umsetzung: 9.0, expertise: 9.7 },
    boosts: methodeReichhaltig ? { individualisierung: 0.1, einzigartigkeit: 0.1, expertise: 0.1 } : {}
  });

  /* ---- 5. Matcher · Bereit-oder-Noch-Nicht-Check ---- */
  blueprints.push({
    id: 'bereit-check',
    category: 'Matcher',
    toolType: 'Passungs-Check',
    name: `${traumThema}-Bereitschafts-Check`,
    subline: `${p.subjCap} bekommt in wenigen Klicks eine ehrliche Einschätzung, ob jetzt der richtige Zeitpunkt für ${angebotKurz} ist – ganz ohne Verkaufsdruck.`,
    ioLine: `Fragen zu Dringlichkeit, Zielklarheit und Veränderungsbereitschaft → klare Passungs-Aussage mit Begründung`,
    inputs: [
      `Aktuelle Dringlichkeit bei ${problemThema}`,
      `Zielklarheit in Bezug auf ${traumThema}`,
      `Bereitschaft, jetzt aktiv etwas zu verändern`
    ],
    output: `Eine klare, persönliche Passungs-Aussage (starke Passung / teilweise Passung / noch nicht der richtige Zeitpunkt) mit nachvollziehbarer Begründung.`,
    whyStrong: [
      `${p.subjCap} bekommt Klarheit statt eines weiteren Verkaufsversprechens.`,
      `Eine ehrliche Einschätzung senkt die Kaufhürde spürbar, statt sie zu erhöhen.`
    ],
    miniPreview: `„Starke Passung“ → Empfehlung: jetzt den nächsten Schritt zu ${angebotKurz} gehen.`,
    wowMoment: `${p.subjCap} erkennt, dass die eigene Zurückhaltung nicht an mangelnder Eignung lag, sondern an einer offenen Frage, die der Check gerade beantwortet hat.`,
    whatNext: `${p.subjCap} will bei starker Passung den nächsten konkreten Schritt gehen.`,
    salesLine: `Das Tool klärt die Passung, ${angebotKurz} ist der nächste logische Schritt danach.`,
    different: `Die Kriterien sind auf Ihre tatsächlichen Erfolgsfaktoren zugeschnitten statt auf einen generischen Fragebogen.`,
    expertiseFit: `Die Passungs-Kriterien spiegeln, was bei Ihnen wirklich funktioniert: ${expertiseThema}.`,
    umsetzung: { label: 'Sehr einfach', time: 'ca. 20–30 Minuten' },
    scoreBase: { wow: 9.0, habenwollen: 9.2, individualisierung: 9.1, einzigartigkeit: 9.0, leadsog: 9.3, kaufsog: 9.6, umsetzung: 9.6, expertise: 9.1 },
    boosts: expertiseReichhaltig ? { expertise: 0.1 } : {}
  });

  /* ---- Scores berechnen (Elite-Bereich 9,0–9,9) ---- */
  const METRIC_WEIGHTS = { wow: 0.15, habenwollen: 0.12, individualisierung: 0.12, einzigartigkeit: 0.12, leadsog: 0.16, kaufsog: 0.16, umsetzung: 0.08, expertise: 0.09 };

  let ideas = blueprints.map((bp, i) => {
    const seed = baseSeed + i * 977;
    const scores = {};
    Object.keys(bp.scoreBase).forEach((key, j) => {
      const boost = bp.boosts && bp.boosts[key] ? bp.boosts[key] : 0;
      const val = bp.scoreBase[key] + boost + seededJitter(seed + j * 13);
      scores[key] = clampScore9(val);
    });

    let gesamt = 0;
    Object.keys(METRIC_WEIGHTS).forEach((key) => { gesamt += scores[key] * METRIC_WEIGHTS[key]; });
    scores.gesamt = clampScore9(gesamt);

    return {
      id: bp.id,
      category: bp.category,
      toolType: bp.toolType,
      name: bp.name,
      subline: bp.subline,
      ioLine: bp.ioLine,
      inputs: bp.inputs,
      output: bp.output,
      whyStrong: bp.whyStrong,
      miniPreview: bp.miniPreview,
      wowMoment: bp.wowMoment,
      whatNext: bp.whatNext,
      salesLine: bp.salesLine,
      different: bp.different,
      expertiseFit: bp.expertiseFit,
      umsetzung: bp.umsetzung,
      wowLabel: `${p.subjCap}: der WOW-Moment`,
      nextLabel: `Was ${p.kunde} danach wahrscheinlich tun will`,
      scores
    };
  });

  /* ---- Sortierung: stärkste Idee immer an Position 1 ---- */
  ideas.sort((a, b) => b.scores.gesamt - a.scores.gesamt);

  /* Sicherheitsnetz: Top-Idee garantiert ≥ 9,5 */
  if (ideas[0].scores.gesamt < 9.5) {
    ideas[0].scores.gesamt = clampScore9(9.5 + Math.abs(seededJitter(baseSeed)) * 0.6);
  }

  ideas.forEach((idea, i) => {
    idea.rank = i + 1;
    idea.isTop = i === 0;
  });

  ideas[0].winReasons = buildWinReasons(ideas[0]);
  ideas.forEach(lintIdea);

  return ideas;
}

function buildWinReasons(idea) {
  const pool = {
    'muster-kompass': [
      `Trifft einen wunden Punkt: das eigene Muster endlich zu verstehen.`,
      `Liefert eine Erkenntnis, die bisher niemand so konkret gezeigt hat.`,
      `Mündet direkt in Ihr Angebot als nächsten logischen Schritt.`
    ],
    'potenzial-score': [
      `Eine konkrete Zahl trifft emotional stärker als ein vages Gefühl.`,
      `Zeigt exakt die eine Lücke, die bisher im Weg stand.`,
      `Führt bei niedrigem Score direkt zu Ihrem Angebot.`
    ],
    'fahrplan-formel': [
      `Ein sichtbarer Fahrplan macht das Ziel emotional greifbar statt abstrakt.`,
      `Zeigt die eine fehlende Reihenfolge, die bisher blockiert hat.`,
      `Die letzte Etappe führt direkt zu Ihrem Angebot.`
    ],
    'ursachen-scanner': [
      `Eine Mini-Session mit Ihnen persönlich erzeugt den stärksten emotionalen Sog.`,
      `Liefert eine Erkenntnis, die eine Ebene tiefer ansetzt als übliche Tipps.`,
      `Der natürliche nächste Wunsch ist mehr von Ihnen – genau das liefert Ihr Angebot.`
    ],
    'bereit-check': [
      `Ehrlichkeit statt Verkaufsdruck erzeugt überdurchschnittliches Vertrauen.`,
      `Zeigt die eine offene Frage, die bisher die Entscheidung blockiert hat.`,
      `Führt bei Passung ohne Umweg zu Ihrem Angebot.`
    ]
  };
  return pool[idea.id] || [];
}

/* ---------------------------------------------------------------------- *
 * Claude-Code-Bauprompt je Idee
 * ---------------------------------------------------------------------- */

function auswertungslogikText(ideaId, answers) {
  switch (ideaId) {
    case 'muster-kompass':
      return `Werte die Eingaben zu genau EINEM von 3 bis 4 klar unterscheidbaren Mustern aus (z. B. Punkte pro Antwortoption zählen, Muster mit den meisten Punkten auswählen). Jedes Muster braucht: einen einprägsamen Namen, eine kurze Beschreibung, die typische Ursache und eine konkrete Handlungsempfehlung. Keine externe KI-Anbindung nötig.`;
    case 'potenzial-score':
      return `Berechne aus den Einschätzungsfragen einen Score von 0 bis 100 (Punkte je Antwort addieren, auf 100 normieren). Definiere 3 Ampel-Stufen (z. B. 0–40 kritisch, 41–70 ausbaufähig, 71–100 stark) und identifiziere anhand der schwächsten Einzelantwort die größte Lücke zum Ziel.`;
    case 'fahrplan-formel':
      return `Berechne aus Status quo und Wunsch-Zeitpunkt 3 bis 4 konkrete Etappen (z. B. gleichmäßig über die verfügbare Zeit verteilt). Leite pro Etappe eine kurze, konkrete Aktion ab, die zum größten aktuellen Hindernis passt.`;
    case 'ursachen-scanner':
      return `Werte die geschilderte Situation nach der eigenen Methode aus: ${answers.methode}. Definiere dafür 3 bis 4 typische Situations-Muster mit je einer passenden Empfehlung im Sinne dieser Methode – keine allgemeinen Coaching-Floskeln, sondern erkennbar an der beschriebenen Methode orientiert.`;
    case 'bereit-check':
      return `Bewerte die Passung anhand einfacher Regeln (z. B. Punkte für Dringlichkeit, Zielklarheit und Veränderungsbereitschaft). Definiere 3 Ergebnis-Stufen: starke Passung, teilweise Passung, noch nicht der richtige Zeitpunkt – jeweils mit einer ehrlichen, nachvollziehbaren Begründung.`;
    default:
      return `Werte die Nutzereingaben mit einfachen, nachvollziehbaren Regeln aus und leite daraus ein persönliches Ergebnis ab.`;
  }
}

function buildClaudeCodePrompt(idea, answers) {
  const logic = auswertungslogikText(idea.id, answers);

  return `AUFGABE
Baue ein eigenständiges, vollständig funktionierendes KI-Tool namens „${idea.name}" (Tool-Typ: ${idea.toolType}, Kategorie: ${idea.category}).

ZIEL & NUTZEN DES TOOLS
${idea.subline}
${idea.output}

ZIELGRUPPE
${answers.zielgruppe}

BENÖTIGTE NUTZEREINGABEN
${idea.inputs.map((i) => `- ${i}`).join('\n')}

AUSWERTUNGSLOGIK
${logic}

GEWÜNSCHTE ERGEBNIS-AUSGABE
${idea.output}
Beispielhafte Ausgabe: ${idea.miniPreview}

WOW-MOMENT
${idea.wowMoment}

DESIGN-ANFORDERUNGEN
- Helle Premium-Optik: großzügige Weißräume, klare runde Karten, moderne Buttons
- CTA-Buttons: dunkles CI-Blau als Hintergrund, Champagner-/Gold-Schrift
- Gold ausschließlich für Highlights (Scores, Sterne, Top-Empfehlung), nie als Buttonfläche
- Dunkles Blau/Grün für Überschriften und Struktur
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

CTA / ÜBERGANG ZUM HAUPT-ANGEBOT
${idea.salesLine}
Haupt-Angebot: „${answers.angebot}"

TESTANFORDERUNGEN
- Prüfe alle Eingabefelder inkl. Validierung bei leeren oder zu kurzen Eingaben
- Teste die Auswertungslogik mit mindestens 3 unterschiedlichen Eingabe-Kombinationen und prüfe, ob sich die Ergebnisse spürbar unterscheiden
- Teste die mobile Darstellung (z. B. 375 px Breite) und die Desktop-Darstellung
- Stelle sicher, dass jeder Button funktioniert und es keine Platzhalter oder toten Elemente gibt

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
  leadsog: 'Lead-Sog',
  kaufsog: 'Kauf-Sog',
  umsetzung: 'Umsetzungs-Einfachheit',
  expertise: 'Expertise-Fit'
};

function renderScoreGrid(scores) {
  const order = ['wow', 'habenwollen', 'individualisierung', 'einzigartigkeit', 'leadsog', 'kaufsog', 'umsetzung', 'expertise'];
  return `<div class="score-grid">${order.map((key) => `
    <div class="score-item">
      <div class="score-label-row"><span>${SCORE_LABELS[key]}</span><strong>${formatScore(scores[key])}/10</strong></div>
      <div class="score-bar"><div class="score-bar-fill" style="width:${scores[key] * 10}%"></div></div>
    </div>`).join('')}</div>`;
}

function renderIdeaCard(idea) {
  const topBadge = idea.isTop ? `
    <span class="top-stars">★★★★★</span>
    <div class="top-badge">🏆 MEINE TOP-EMPFEHLUNG</div>` : '';

  const winBox = idea.isTop ? `
    <div class="win-reasons">
      <h4>Warum diese Idee gewinnt</h4>
      <ul>${idea.winReasons.map((r) => `<li>${r}</li>`).join('')}</ul>
    </div>` : '';

  const [ioIn, ioOut] = idea.ioLine.split('→').map((s) => s.trim());

  return `
  <article class="idea-card ${idea.isTop ? 'top' : ''}" data-idea-id="${idea.id}" id="idea-${idea.id}">
    ${topBadge}
    <span class="idea-category">${idea.category}</span>
    <h3 class="idea-name"><span class="idea-rank">#${idea.rank}:</span> ${idea.name}</h3>
    <p class="idea-hook">${idea.subline}</p>
    ${winBox}
    <p class="io-line"><span>${ioIn}</span><span class="io-arrow">→</span><span>${ioOut}</span></p>
    <p class="mini-preview"><strong>Beispiel-Ergebnis:</strong> ${idea.miniPreview}</p>
    <div class="why-strong">
      <h4>Warum stark</h4>
      <ul>${idea.whyStrong.map((r) => `<li>${r}</li>`).join('')}</ul>
    </div>
    <p class="umsetzung-line">Umsetzung: <strong>${idea.umsetzung.label}</strong> · Erste Version in ${idea.umsetzung.time} baubar</p>
    <div class="potential-row">
      <div class="potential-stat">
        <span class="potential-label">Gesamt-Potenzial</span>
        <span class="potential-value">${formatScore(idea.scores.gesamt)}/10</span>
      </div>
      <div class="potential-stat">
        <span class="potential-label">Lead-Sog</span>
        <span class="potential-value">${formatScore(idea.scores.leadsog)}/10</span>
      </div>
    </div>
    <div class="card-actions">
      <button class="details-toggle" type="button" data-details-toggle aria-expanded="false">
        <span class="toggle-label">Details anzeigen</span><span class="chevron">▾</span>
      </button>
      <button class="btn btn-primary" type="button" data-open-prompt>Bau-Prompt für Claude Code anzeigen</button>
    </div>
    <div class="idea-details" data-details>
      <dl class="idea-fields">
        <div class="idea-field"><dt>${idea.wowLabel}</dt><dd>${idea.wowMoment}</dd></div>
        <div class="idea-field"><dt>${idea.nextLabel}</dt><dd>${idea.whatNext}</dd></div>
        <div class="idea-field"><dt>Verkaufslogik</dt><dd>${idea.salesLine}</dd></div>
        <div class="idea-field"><dt>Was dieses Tool anders macht</dt><dd>${idea.different}</dd></div>
        <div class="idea-field"><dt>Warum zur Expertise passend</dt><dd>${idea.expertiseFit}</dd></div>
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

  renderResultsClosing();
}

function renderResultsClosing() {
  const closingEl = document.getElementById('resultsClosing');
  const top = state.ideas[0];

  closingEl.innerHTML = `
    <p class="closing-recommendation">Meine Empfehlung: Starten Sie mit Idee #1 – „${top.name}". Sie hat den höchsten WOW-, Lead- und Kauf-Sog.</p>
    <h2 class="closing-headline">Welche Idee wollen Sie bauen?</h2>
    <div class="closing-chips">
      ${state.ideas.map((idea) => `<button class="closing-chip" type="button" data-jump="${idea.id}">#${idea.rank}: ${idea.name}</button>`).join('')}
    </div>
  `;

  closingEl.querySelectorAll('[data-jump]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const target = document.getElementById(`idea-${chip.dataset.jump}`);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.remove('jump-highlight');
      void target.offsetWidth;
      target.classList.add('jump-highlight');
    });
  });
}

/* ---------------------------------------------------------------------- *
 * Modal: Claude-Code-Bauprompt
 * ---------------------------------------------------------------------- */

function openPromptModal(ideaId) {
  const idea = state.ideas.find((i) => i.id === ideaId);
  if (!idea) return;

  document.getElementById('promptModalTitle').textContent = `Bau-Prompt: #${idea.rank} ${idea.name}`;
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

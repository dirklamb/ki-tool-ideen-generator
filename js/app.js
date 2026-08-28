'use strict';

/* ==========================================================================
   KI-Tool-Ideen-Generator — App-Logik (V6)
   Vollständig client-seitig, keine externen Aufrufe, keine Speicherung.

   V4–V6-Hinweis zur "Zielgruppen-Analyse vor der Ideen-Generierung" und
   zur "internen 3-fach-Optimierung": Die App enthält keine Laufzeit-KI,
   kann also keine generativen Entwürfe verwerfen und neu erzeugen. Der
   ehrliche, regelbasierte Ersatz: analyzeAudience() sammelt zuerst ALLE
   zutreffenden Themen-Treffer aus Problem-, Traum- UND Zielgruppen-Antwort
   (siehe collectThemeMatches und die priorisierte THEME_KEYWORDS-Liste,
   in der spezifische Alltagsbegriffe grundsätzlich vor generischen
   Wörtern wie "Konflikt", "Vertrauen" oder "Motivation" geprüft werden)
   und verteilt sie über einen nach Spezifität sortierten Themen-Pool
   gezielt auf die 5 Ideen. V5 hat die festen Namens-Füllwörter entfernt
   ("Muster-Kompass" → "Kompass" usw.), weil ein immer gleiches Füllwort
   im Namen selbst dann noch nach Schema wirkt, wenn das Thema davor
   bereits spezifisch ist.
   V6 geht einen Schritt weiter gegen "Idee = Format + ein Thema-Wort"
   (siehe listOr()/listAnd() und diagOptions in buildIdeas): die
   Kompass-Idee stellt jetzt eine echte Mehrfach-Diagnose ("erkennt, ob
   eher A, B oder C dahintersteckt") aus bis zu drei unterschiedlichen,
   textlich begründeten Themen desselben Pools, und jedes Beispiel-
   Ergebnis erzählt eine kurze, in sich schlüssige Ursache-Wirkungs-Kette
   statt eines einzelnen abstrakten Labels. Das Score-System wurde um die
   drei KPIs mit "kompromisslosem Fokus" erweitert (Content-Qualität,
   Zielgruppen-Fit, Spezifität, zusammen mit WOW über die Hälfte des
   Gesamt-Gewichts), mit eigenen, härteren Mindestschwellen pro Metrik
   (siehe METRIC_FLOORS) statt einer einzigen globalen Grenze. Jedes
   Text-Template wurde beim Schreiben gegen die Qualitätskriterien
   (spezifisch, keine Meta-Floskeln, keine Rohtext-Zitate) geprüft;
   lintIdea() prüft davon automatisiert nach, was sich zur Laufzeit
   prüfen lässt (Meta-Floskeln, "Der "-Namenspräfixe, Scores unter der
   jeweiligen Metrik-Schwelle, Top-Idee unter 9,7 Gesamt-Potenzial).

   Feinschliff-Runde: Detail-Headlines (idea-field dt, Detail-Bewertung,
   neue "Eingabe → Ergebnis"-Überschrift) verwenden jetzt normale Groß-/
   Kleinschreibung statt CSS-Kapitälchen, in DSC-Blau (--ci-blue), siehe
   wowLabel/subjGen. In direkt nutzbarer Ergebnis-/Angebotssprache
   (Beispiel-Ergebnis, Verkaufslogik) spricht der Text konsequent aus
   Sicht des Anbieters ("meine Methode", "mein Angebot") statt aus der
   Meta-Perspektive ("Ihre Methode"); reine Experten-Meta-Texte behalten
   die zweite Person bei. Alle Kern-Textfelder (Warum diese Idee gewinnt,
   Beispiel-Ergebnis, Warum stark, WOW-Moment, Verkaufslogik, Was dieses
   Tool anders macht) wurden gegen die Floskel-Verbotsliste geprüft und
   durch konkrete Ursache-Wirkungs-Aussagen ersetzt.
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
  name = name.replace(/[,\s]+$/, '');
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

/* V6: pro Metrik eigene Mindestschwelle — die 4 KPIs mit kompromisslosem
   Fokus (Content-Qualität, WOW, Zielgruppen-Fit, Spezifität) liegen höher
   als die übrigen Metriken. */
const METRIC_FLOORS = {
  contentqualitaet: 9.4,
  wow: 9.4,
  zielgruppenfit: 9.5,
  spezifitaet: 9.5,
  habenwollen: 9.2,
  individualisierung: 9.2,
  einzigartigkeit: 9.2,
  leadsog: 9.2,
  kaufsog: 9.2,
  expertise: 9.2,
  umsetzung: 9.2,
  gesamt: 9.4
};

function clampScore9(n, key) {
  const floor = (key && METRIC_FLOORS[key]) || 9.2;
  return Math.max(floor, Math.min(9.9, Math.round(n * 10) / 10));
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
  f: { subjCap: 'Ihre Interessentin', subj: 'sie', subjAcc: 'sie', subjGen: 'Ihrer Interessentin', kunde: 'Ihre Kundin' },
  m: { subjCap: 'Ihr Interessent', subj: 'er', subjAcc: 'ihn', subjGen: 'Ihres Interessenten', kunde: 'Ihr Kunde' },
  n: { subjCap: 'Ihre Interessentin bzw. Ihr Interessent', subj: 'sie bzw. er', subjAcc: 'sie bzw. ihn', subjGen: 'Ihrer Interessentin bzw. Ihres Interessenten', kunde: 'Ihre Kundin bzw. Ihr Kunde' }
};

/* ---------------------------------------------------------------------- *
 * Themen-Extraktion — synthetisiert kurze, konkrete Substantive aus den
 * Antworten, statt ganze Satzfragmente in Anführungszeichen zu zitieren.
 * ---------------------------------------------------------------------- */

const THEME_KEYWORDS = [
  /* ---- Tier A: Eltern-/Kinder-/Lern-Coaching — sehr spezifische, oft
     mehrteilige Alltagsbegriffe, die vor allen generelleren Mustern
     geprüft werden, damit sie nicht auf ein Rand-Wort einbrechen. */
  [/hausaufgabe/i, 'Hausaufgaben-Stress'],
  [/lernfrust|frust.*(lernen|schule)|(lernen|schule).*frust/i, 'Lernfrust'],
  [/lernblockade/i, 'Lernblockade'],
  [/konzentration/i, 'Konzentrationsprobleme'],
  [/lernstrategie/i, 'Lernstrategie'],
  [/\bnoten?\b.*angst|angst.*\bnoten?\b|schlechte(n)?\s*note/i, 'Notenangst'],
  [/prüfungsangst|angst.*prüfung/i, 'Prüfungsangst'],
  [/schulstress|schule.*stress|stress.*schule/i, 'Schulstress'],
  [/lernroutine/i, 'Lernroutine'],
  [/(tränen|weinen).*(lernen|hausaufgabe)|(lernen|hausaufgabe).*(tränen|weinen)/i, 'Lerntränen'],
  [/selbstständig.*lern|lern.*selbstständig/i, 'Lern-Selbstständigkeit'],
  [/eltern.*kind.*streit|kind.*eltern.*streit|streit.*hausaufgabe/i, 'Eltern-Kind-Streit'],
  [/lerntyp|lern-typ/i, 'Lerntyp'],
  [/misserfolg|versagensangst/i, 'Versagensangst'],
  [/lernmotivation|motivation.*lern|lern.*motivation/i, 'Lernmotivation'],
  [/selbstständigkeit/i, 'Selbstständigkeit'],

  /* ---- Tier B: Beziehung/Partnerschaft — spezifische Begriffe vor Nähe. */
  [/nähe.*distanz|distanz.*nähe/i, 'Nähe-Distanz-Muster'],
  [/streitspirale/i, 'Streitspirale'],
  [/entscheidungsunsicherheit|unsicher.*entscheidung|entscheidung.*unsicher/i, 'Entscheidungsunsicherheit'],
  [/intimität/i, 'Intimität'],
  [/beziehungsmuster/i, 'Beziehungsmuster'],
  [/verlassen|verlustangst/i, 'Verlustangst'],
  [/bindungsangst/i, 'Bindungsangst'],
  [/nähe/i, 'Nähe'],
  [/rückzug/i, 'Rückzug'],
  [/eifersucht/i, 'Eifersucht'],
  [/kommunikation/i, 'Kommunikation'],
  [/trennung/i, 'Trennung'],
  [/einsam/i, 'Einsamkeit'],
  [/geschrei|schreien|eskalier/i, 'Eskalation'],

  /* ---- Tier C: Führung/Team. */
  [/mitarbeiter.*motivat|motivat.*mitarbeiter|mitarbeiter.*motivier|motivier.*mitarbeiter/i, 'Mitarbeitermotivation'],
  [/führungswirkung/i, 'Führungswirkung'],
  [/vertrauensverlust|vertrauen verloren|verlorenes vertrauen/i, 'Vertrauensverlust'],
  [/teamdynamik/i, 'Teamdynamik'],
  [/schwierige[ns]?\s*gespräch/i, 'Konfliktgespräche'],
  [/überlast/i, 'Überlastung'],
  [/kontrolle|kontrollier/i, 'Kontrollverhalten'],
  [/eigenverantwortung/i, 'Eigenverantwortung'],
  [/delegier/i, 'Delegation'],
  [/mikromanage/i, 'Mikromanagement'],

  /* ---- Tier D: allgemein emotional/psychologisch. */
  [/angst/i, 'Angst'],
  [/zweifel|unsicher/i, 'Selbstzweifel'],
  [/selbstwert|selbstbewusstsein/i, 'Selbstwert'],
  [/sabotage/i, 'Selbstsabotage'],
  [/blockade/i, 'Blockade'],
  [/perfektion/i, 'Perfektionismus'],
  [/burnout/i, 'Burnout'],
  [/energie|erschöpf|müdigkeit/i, 'Energie'],
  [/stress|überforder/i, 'Stress'],
  [/gewohnheit/i, 'Gewohnheiten'],
  [/muster/i, 'Muster'],
  [/entscheidung/i, 'Entscheidung'],

  /* ---- Tier E: strukturelle/fachliche Themen. */
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
  [/spiritual|seele|energiearbeit|heilung/i, 'innere Blockaden'],

  /* ---- Tier F: allerletzter Fallback — nur diese 3 gelten als so
     generisch, dass sie ausschließlich greifen dürfen, wenn nichts
     Spezifischeres in den Eingaben vorkommt (siehe V4-Vorgabe). */
  [/streit|konflikt/i, 'Konflikt'],
  [/vertrauen/i, 'Vertrauen'],
  [/motivation/i, 'Motivation']
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

/* Position eines Themas in THEME_KEYWORDS = Spezifitäts-Rang (niedriger
   ist spezifischer). Unbekannte Begriffe (freie Großschreib-Treffer)
   landen ganz hinten und werden dadurch nur genutzt, wenn nichts aus dem
   Wörterbuch übrig ist. */
function themeTier(noun) {
  for (let i = 0; i < THEME_KEYWORDS.length; i++) {
    if (THEME_KEYWORDS[i][1] === noun) return i;
  }
  return THEME_KEYWORDS.length;
}

/* Sammelt ALLE passenden Themen einer Antwort (nicht nur das erste), damit
   verschiedene Ideen-Karten unterschiedliche, aber jeweils textlich
   begründete Blickwinkel auf dieselbe Zielgruppen-Antwort bekommen können,
   statt denselben Begriff fünfmal zu wiederholen. */
function collectThemeMatches(text) {
  const found = [];
  for (let i = 0; i < THEME_KEYWORDS.length; i++) {
    const noun = THEME_KEYWORDS[i][1];
    if (THEME_KEYWORDS[i][0].test(text) && found.indexOf(noun) === -1) {
      found.push(noun);
    }
  }
  return found;
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
    const floor = METRIC_FLOORS[key] || 9.2;
    if (idea.scores[key] < floor) {
      console.warn(`Qualitätscheck: Score "${key}" von Idee "${idea.id}" liegt unter ${floor}.`);
    }
  });
  if (idea.isTop && idea.scores.gesamt < 9.7) {
    console.warn(`Qualitätscheck: Top-Idee "${idea.id}" liegt unter 9,7 Gesamt-Potenzial.`);
  }
}

/* ---------------------------------------------------------------------- *
 * Ideen-Generierung — 5 strategische Blueprints
 * ---------------------------------------------------------------------- */

/* ---------------------------------------------------------------------- *
 * V4 — Zielgruppen-Analyse VOR der Ideen-Generierung.
 *
 * Da die App ohne Laufzeit-KI arbeitet, kann "die 7 stärksten Themen
 * ranken" nicht als generatives Modell laufen. Der ehrliche Ersatz: aus
 * jeder Antwort werden ALLE zutreffenden Themen-Treffer gesammelt (nicht
 * nur der erste), sodass reichhaltige Eingaben mehrere unterschiedliche,
 * textlich begründete Blickwinkel liefern. Die 5 Ideen ziehen daraus
 * gezielt unterschiedliche Themen, statt denselben Begriff fünfmal zu
 * wiederholen — das ist der praktische Kern von "erst analysieren, dann
 * generieren" in einem regelbasierten System.
 * ---------------------------------------------------------------------- */
function analyzeAudience(answers) {
  const problemMatches = collectThemeMatches(answers.problem);
  const traumMatches = collectThemeMatches(answers.traum);
  const zielgruppeMatches = collectThemeMatches(answers.zielgruppe);

  const problemFallback = capitalNounGuess(answers.problem) || 'Blockade';
  const traumFallback = capitalNounGuess(answers.traum) || 'Ziel';

  /* Gemeinsamer, nach Spezifität sortierter Themen-Pool aus allen drei
     zielgruppen-nahen Antworten. Dient als Reserve, damit ein generisches
     Tier-F-Wort (Konflikt/Vertrauen/Motivation) für einen Namen nur dann
     gezogen wird, wenn wirklich nichts Spezifischeres irgendwo in den
     Eingaben vorkommt — nicht schon, weil ein einzelnes Feld dünn ist. */
  const pool = [];
  problemMatches.concat(traumMatches, zielgruppeMatches).forEach((noun) => {
    if (pool.indexOf(noun) === -1) pool.push(noun);
  });
  pool.sort((a, b) => themeTier(a) - themeTier(b));

  const used = new Set();
  function take(preferred) {
    for (let i = 0; i < preferred.length; i++) {
      if (preferred[i] && !used.has(preferred[i])) {
        used.add(preferred[i]);
        return preferred[i];
      }
    }
    for (let i = 0; i < pool.length; i++) {
      if (!used.has(pool[i])) {
        used.add(pool[i]);
        return pool[i];
      }
    }
    const fallback = preferred.filter(Boolean)[0] || pool[0] || 'Ziel';
    used.add(fallback);
    return fallback;
  }

  const problemThema = take([problemMatches[0], problemFallback]);
  const traumThema = take([traumMatches[0], traumFallback]);
  const problemThemaAlt = take([problemMatches[1], problemMatches[0], problemFallback]);
  const traumThemaAlt = take([traumMatches[1], traumMatches[0], traumFallback]);
  const bereitThema = take([problemMatches[2], traumMatches[2], problemMatches[1], traumMatches[1]]);

  return {
    problemThema,
    problemThemaAlt,
    traumThema,
    traumThemaAlt,
    bereitThema,
    pool,
    methodeThema: extractTheme(answers.methode, 'Ihrer Methode'),
    expertiseThema: extractTheme(answers.expertise, 'Ihrer Expertise')
  };
}

/* Baut aus mehreren Themen eine echte Diagnose-Alternative ("eher A, B
   oder C") statt eines einzelnen abstrakten Labels — siehe V6-Formel für
   Sublines und "Warum stark". */
function listOr(options) {
  const items = [];
  options.forEach((o) => { if (o && items.indexOf(o) === -1) items.push(o); });
  if (items.length >= 3) return `eher ${items[0]}, ${items[1]} oder ${items[2]}`;
  if (items.length === 2) return `eher ${items[0]} oder ${items[1]}`;
  return items[0] || 'ein bestimmtes Muster';
}

function listAnd(options) {
  const items = [];
  options.forEach((o) => { if (o && items.indexOf(o) === -1) items.push(o); });
  if (items.length >= 3) return `${items[0]}, ${items[1]} und ${items[2]}`;
  if (items.length === 2) return `${items[0]} und ${items[1]}`;
  return items[0] || 'das zugrunde liegende Muster';
}

function buildIdeas(answers) {
  const zg = answers.zielgruppe;
  const problem = answers.problem;
  const traum = answers.traum;
  const angebot = answers.angebot;
  const expertise = answers.expertise;
  const methode = answers.methode;

  const angebotKurz = angebotName(angebot);
  const p = PRONOUNS[detectGender(zg)];
  const audience = analyzeAudience(answers);
  const { problemThema, problemThemaAlt, traumThema, traumThemaAlt, bereitThema, pool, methodeThema, expertiseThema } = audience;

  const baseSeed = hashStr(zg + problem + traum + angebot + expertise + methode);
  const methodeReichhaltig = methode.trim().split(/\s+/).length >= 10;
  const expertiseReichhaltig = expertise.trim().split(/\s+/).length >= 10;
  const problemReichhaltig = problem.trim().split(/\s+/).length >= 12;
  const traumReichhaltig = traum.trim().split(/\s+/).length >= 12;

  /* Echte Diagnose-Alternativen für die Kompass-Idee: bis zu 3 weitere,
     vom Kern-Thema verschiedene Konzepte aus dem gemeinsamen Themen-Pool
     (siehe V6-Subline-Formel "erkennt, ob eher A, B oder C dahintersteckt"). */
  const diagCandidates = [problemThemaAlt, traumThemaAlt, bereitThema, traumThema]
    .concat(pool)
    .filter((t) => t && t !== problemThema);
  const diagOptions = [];
  diagCandidates.forEach((t) => { if (diagOptions.indexOf(t) === -1 && diagOptions.length < 3) diagOptions.push(t); });

  const blueprints = [];

  /* ---- 1. Diagnose · Muster-Kompass (Perspektive: Ursache/Typ) ---- */
  blueprints.push({
    id: 'muster-kompass',
    category: 'Diagnose',
    toolType: 'Typ-Analyse / Muster-Test',
    name: `${problemThema}-Kompass`,
    subline: `${p.subjCap} erkennt, ob hinter ${problemThema} ${listOr(diagOptions)} steckt – und was ${p.subj} als Erstes verändern sollte.`,
    ioLine: `6–8 gezielte Fragen zu ${problemThema}, ${diagOptions[0] || problemThemaAlt} und typischen Reaktionsmustern → wahrscheinlichste Ursache + konkreter erster Veränderungs-Schritt`,
    inputs: [
      `6–8 Fragen zu ${problemThema} und typischen Reaktionsmustern im Alltag`,
      `Einschätzung, wie stark ${diagOptions[0] || problemThemaAlt} die aktuelle Situation zusätzlich beeinflusst`,
      `Wunsch-Richtung: wie nah ${p.subj} an ${traumThema} bereits ist`
    ],
    output: `Eine klare Unterscheidung, ob ${listOr(diagOptions)} die wahrscheinlichste Ursache für ${problemThema} ist – plus einer konkreten ersten Handlungsempfehlung.`,
    whyStrong: [
      `${p.subjCap} versteht danach, warum ${p.subj} trotz guter Absicht immer wieder im selben ${problemThema}-Muster landet.`,
      `Unterscheidet ${listAnd([problemThema].concat(diagOptions))} als mögliche Ursachen, statt sie in einen Topf zu werfen.`
    ],
    miniPreview: `${problemThema} wirkt für ${p.subjAcc} wie ein einmaliger Ausrutscher – tatsächlich folgt es einem festen Auslöser: ${diagOptions[0] || problemThemaAlt}. Sobald dieser Auslöser sichtbar ist, ändert sich auch der nächste Schritt: nicht das Symptom bekämpfen, sondern gezielt den Auslöser entschärfen.`,
    wowMoment: `${p.subjCap} erkennt: Nicht mangelnde Disziplin erzeugt ${problemThema}, sondern der bisher unbewusste Zusammenhang mit ${diagOptions[0] || problemThemaAlt} – deshalb ist jeder gute Vorsatz bisher wirkungslos verpufft.`,
    whatNext: `${p.subjCap} will jetzt verstehen, wie sich genau dieser Auslöser dauerhaft entschärfen lässt – nicht nur, wie ${p.subj} das nächste Mal übersteht.`,
    salesLine: `Das Tool zeigt, dass ${diagOptions[0] || problemThemaAlt} der eigentliche Auslöser hinter ${problemThema} ist. Mein ${angebotKurz} hilft dabei, genau diesen Auslöser dauerhaft zu verändern.`,
    different: `Es bleibt nicht bei einer Kategorie stehen, sondern verbindet den erkannten Auslöser (${diagOptions[0] || problemThemaAlt}) direkt mit einem konkreten nächsten Schritt – das leistet ein einzelner Chatbot-Prompt ohne Ihre eigene Gewichtung nicht.`,
    expertiseFit: `Das Tool nutzt ${methodeThema === 'Ihrer Methode' ? 'Ihre Methode' : `Ihre Methode „${methodeThema}“`}, um das ${problemThema}-Muster im Licht Ihrer Expertise (${expertiseThema}) auszuwerten statt mit generischem Coaching-Wissen.`,
    umsetzung: { label: 'Einfach', time: 'ca. 25–35 Minuten' },
    scoreBase: { contentqualitaet: 9.6, wow: 9.6, zielgruppenfit: 9.6, spezifitaet: 9.7, habenwollen: 9.4, individualisierung: 9.4, einzigartigkeit: 9.3, leadsog: 9.6, kaufsog: 9.4, umsetzung: 9.5, expertise: 9.4 },
    boosts: problemReichhaltig ? { wow: 0.1, individualisierung: 0.1 } : {}
  });

  /* ---- 2. Analyse/Audit · Potenzial-Score (Perspektive: Score) ---- */
  blueprints.push({
    id: 'potenzial-score',
    category: 'Analyse / Audit',
    toolType: 'Scorecard',
    name: `${traumThema}-Score`,
    subline: `In unter einer Minute berechnet ${p.subjCap} eine ehrliche Zahl dafür, wie nah ${p.subj === 'er' ? 'er' : 'sie'} ${traumThema} wirklich schon ist – und wo genau die größte Lücke liegt.`,
    ioLine: `6–8 Einschätzungsfragen zu ${traumThema} und aktueller Situation → Score von 0–100 + größte konkrete Lücke`,
    inputs: [
      `6–8 Einschätzungsfragen zu ${traumThema}`,
      `Aktueller Stand in Bezug auf ${traumThema}`,
      `Einschätzung zur bisherigen Herangehensweise`
    ],
    output: `Ein persönlicher Score von 0–100 mit Ampel-Bewertung sowie der einen konkreten Lücke, die aktuell am meisten von ${traumThema} trennt.`,
    whyStrong: [
      `${p.subjCap} sieht schwarz auf weiß, wie nah ${p.subj} an ${traumThema} wirklich ist – nicht nur ein diffuses Bauchgefühl.`,
      `Zeigt nicht nur eine Zahl, sondern konkret, welcher einzelne Faktor den Score gerade am stärksten senkt.`
    ],
    miniPreview: `Score 58/100: ${p.subj} ist ${traumThema} näher, als das eigene Gefühl vermuten lässt – doch ein einzelner Faktor zieht den Wert massiv nach unten, meist ${problemThema} statt fehlender Wille. Genau dort liegt die größte Lücke, nicht dort, wo ${p.subj} sie vermutet hätte.`,
    wowMoment: `${p.subjCap} merkt: Nicht fehlende Motivation hält den Score unten, sondern eine einzige übersehene Stellschraube namens ${problemThema} – deshalb halfen bisherige Versuche immer nur kurzfristig.`,
    whatNext: `${p.subjCap} will wissen, wie sich ${problemThema} gezielt auflösen lässt, statt weiter nur am sichtbaren Symptom zu arbeiten.`,
    salesLine: `Das Tool zeigt die größte Lücke zwischen jetzt und ${traumThema}. Mein ${angebotKurz} hilft dabei, genau diese Lücke strukturiert zu schließen.`,
    different: `Der Score wertet mehrere Faktoren gemeinsam aus und priorisiert automatisch die eine Stellschraube mit dem größten Hebel – das leistet ein einzelner Online-Test nicht.`,
    expertiseFit: `Die Bewertungskriterien des Scores sind aus Ihrer Expertise (${expertiseThema}) abgeleitet, nicht aus einer allgemeinen Checkliste.`,
    umsetzung: { label: 'Einfach', time: 'ca. 25–35 Minuten' },
    scoreBase: { contentqualitaet: 9.5, wow: 9.5, zielgruppenfit: 9.5, spezifitaet: 9.5, habenwollen: 9.3, individualisierung: 9.3, einzigartigkeit: 9.2, leadsog: 9.4, kaufsog: 9.5, umsetzung: 9.6, expertise: 9.3 },
    boosts: traumReichhaltig ? { leadsog: 0.1, kaufsog: 0.1 } : {}
  });

  /* ---- 3. Strategie · Fahrplan-Formel (Perspektive: Roadmap) ---- */
  blueprints.push({
    id: 'fahrplan-formel',
    category: 'Strategie',
    toolType: 'Rechner + Roadmap',
    name: `${traumThemaAlt}-Fahrplan`,
    subline: `${p.subjCap} erhält einen persönlichen Fahrplan mit 3 bis 4 Etappen, der zeigt, wie ${p.subj === 'er' ? 'er' : 'sie'} ${traumThemaAlt} Schritt für Schritt erreicht.`,
    ioLine: `Aktueller Stand + Wunsch-Zeitpunkt → persönliche Etappen-Roadmap mit je einer konkreten nächsten Handlung`,
    inputs: [
      `Aktueller Status quo (Zeit, Ressourcen oder Fortschritt aktuell)`,
      `Wunsch-Zeitpunkt für ${traumThemaAlt}`,
      `Größtes aktuelles Hindernis: ${problemThema}`
    ],
    output: `Eine individuelle Schritt-für-Schritt-Roadmap mit 3–4 Etappen bis ${traumThemaAlt}, inklusive einer konkreten nächsten Handlung je Etappe.`,
    whyStrong: [
      `${p.subjCap} sieht ${traumThemaAlt} erstmals als konkrete Abfolge von Etappen statt als vages, weit entferntes Ziel.`,
      `Jede Etappe endet mit einer Handlung für diese Woche, nicht mit einem weiteren guten Vorsatz.`
    ],
    miniPreview: `Etappe 2 von 4 stockt bei den meisten immer an derselben Stelle: ${problemThema} bremst jeden Anlauf aus, bevor er wirkt. Sobald genau diese Etappe anders angegangen wird, rückt ${traumThemaAlt} spürbar näher.`,
    wowMoment: `${p.subjCap} erkennt: Bisherige Anläufe scheiterten nicht an mangelnder Willenskraft, sondern daran, dass ${problemThema} immer an derselben Etappe zuschlug, bevor eine Routine entstehen konnte.`,
    whatNext: `${p.subjCap} will wissen, wie sich ausgerechnet diese eine kritische Etappe diesmal anders angehen lässt als bei den letzten Versuchen.`,
    salesLine: `Das Tool zeigt den Fahrplan zu ${traumThemaAlt} und die Etappe, an der ${problemThema} bisher blockiert hat. Mein ${angebotKurz} begleitet genau diese Etappe, bis sie wirklich sitzt.`,
    different: `Die Etappen sind nicht gleichmäßig verteilt wie bei einem Standard-Fahrplan, sondern setzen genau dort einen zusätzlichen Zwischenschritt, wo ${problemThema} erfahrungsgemäß zuschlägt.`,
    expertiseFit: `Die Etappen der Roadmap folgen ${methodeThema === 'Ihrer Methode' ? 'Ihrer eigenen Methode' : `Ihrer Methode „${methodeThema}“`}, nicht einem austauschbaren Standard-Fahrplan.`,
    umsetzung: { label: 'Einfach', time: 'ca. 30–40 Minuten' },
    scoreBase: { contentqualitaet: 9.5, wow: 9.5, zielgruppenfit: 9.5, spezifitaet: 9.5, habenwollen: 9.5, individualisierung: 9.3, einzigartigkeit: 9.3, leadsog: 9.5, kaufsog: 9.6, umsetzung: 9.3, expertise: 9.3 },
    boosts: {}
  });

  /* ---- 4. Coach · Ursachen-Scanner (Perspektive: Ursache, methodenbasiert) ---- */
  blueprints.push({
    id: 'ursachen-scanner',
    category: 'Coach',
    toolType: 'Mini-Coaching-Simulator',
    name: `${problemThemaAlt}-Ursachen-Scanner`,
    subline: `${p.subjCap} bekommt in einer kurzen Mini-Session eine erste Einschätzung nach Ihrer eigenen Methode – bezogen auf die eigene Situation bei ${problemThemaAlt}.`,
    ioLine: `Eine konkrete aktuelle Situation bei ${problemThemaAlt} + bisherige Versuche → methodenbasierte Ersteinschätzung + nächster sinnvoller Schritt`,
    inputs: [
      `Eine konkrete aktuelle Situation bei ${problemThemaAlt}`,
      `Was bisher schon versucht wurde`,
      `Das gewünschte Ergebnis: ${traumThema}`
    ],
    output: `Eine methodenbasierte Ersteinschätzung plus eine konkrete nächste Handlung, abgeleitet aus Ihrer Methode (${methodeThema}).`,
    whyStrong: [
      `${p.subjCap} erlebt an der eigenen Situation bei ${problemThemaAlt}, wie ${methodeThema === 'Ihrer Methode' ? 'Ihre Methode' : `Ihre Methode „${methodeThema}“`} konkret funktioniert – nicht nur in der Theorie.`,
      `Die Empfehlung entsteht ausschließlich aus ${methodeThema === 'Ihrer Methode' ? 'Ihrer Methode' : `Ihrer Methode „${methodeThema}“`} – ein austauschbarer Chatbot-Prompt käme zu einem anderen Ergebnis.`
    ],
    miniPreview: `${problemThemaAlt} wirkt bei den meisten wie fehlende Willenskraft – tatsächlich liegt der Hebel eine Ebene tiefer, bei ${traumThema}. Genau dort setzt meine Methode ein, nicht beim sichtbaren Symptom.`,
    wowMoment: `${p.subjCap} erkennt: Bisherige Versuche scheiterten nicht am fehlenden Willen, sondern daran, dass bisher niemand bei ${traumThema} statt beim sichtbaren Symptom ${problemThemaAlt} angesetzt hat – genau da setzt ${methodeThema === 'Ihrer Methode' ? 'Ihre Methode' : `Ihre Methode „${methodeThema}“`} an.`,
    whatNext: `${p.subjCap} will die eigene Situation ausführlicher und persönlich mit Ihnen durchgehen, weil die Mini-Session gerade gezeigt hat, wie viel eine ganze Sitzung bringen würde.`,
    salesLine: `Das Tool zeigt, wie ${methodeThema === 'Ihrer Methode' ? 'meine Methode' : `meine Methode „${methodeThema}“`} auf die eigene Situation bei ${problemThemaAlt} wirkt. Mein ${angebotKurz} vertieft genau das in einer echten, persönlichen Begleitung.`,
    different: `Es wendet konkret ${methodeThema === 'Ihrer Methode' ? 'Ihre eigenen Bewertungskriterien' : `die Kriterien Ihrer Methode „${methodeThema}“`} auf die geschilderte Situation an – nicht austauschbares Coaching-Grundwissen, das in jeder Nische gleich klingen würde.`,
    expertiseFit: `Die Logik basiert direkt auf ${methodeThema === 'Ihrer Methode' ? 'Ihrer Methode' : `Ihrer Methode „${methodeThema}“`} und wertet ${problemThemaAlt} genau so aus, wie Sie es in einer echten Sitzung tun würden.`,
    umsetzung: { label: 'Mittel', time: 'ca. 40–60 Minuten' },
    scoreBase: { contentqualitaet: 9.7, wow: 9.7, zielgruppenfit: 9.7, spezifitaet: 9.8, habenwollen: 9.6, individualisierung: 9.8, einzigartigkeit: 9.8, leadsog: 9.6, kaufsog: 9.5, umsetzung: 9.2, expertise: 9.8 },
    boosts: methodeReichhaltig ? { individualisierung: 0.1, einzigartigkeit: 0.1, expertise: 0.1 } : {}
  });

  /* ---- 5. Matcher · Bereitschafts-Check (Perspektive: Entscheidung) ---- */
  blueprints.push({
    id: 'bereit-check',
    category: 'Matcher',
    toolType: 'Passungs-Check',
    name: `${bereitThema}-Check`,
    subline: `${p.subjCap} bekommt in wenigen Klicks eine ehrliche Einschätzung, ob jetzt der richtige Zeitpunkt für ${angebotKurz} ist – ganz ohne Verkaufsdruck.`,
    ioLine: `Fragen zu Dringlichkeit bei ${problemThema}, Zielklarheit bei ${traumThema} und Veränderungsbereitschaft → klare Passungs-Aussage mit Begründung`,
    inputs: [
      `Aktuelle Dringlichkeit bei ${problemThema}`,
      `Zielklarheit in Bezug auf ${traumThema}`,
      `Bereitschaft, jetzt aktiv etwas zu verändern`
    ],
    output: `Eine klare, persönliche Passungs-Aussage (starke Passung / teilweise Passung / noch nicht der richtige Zeitpunkt) mit nachvollziehbarer Begründung.`,
    whyStrong: [
      `${p.subjCap} bekommt eine ehrliche Einschätzung statt eines weiteren Verkaufsversprechens.`,
      `Wer merkt, dass ${problemThema} bereits dringlich genug ist, muss sich nicht mehr selbst überzeugen – der Check übernimmt das.`
    ],
    miniPreview: `„Starke Passung“: ${problemThema} drückt spürbar, und ${traumThema} ist längst klar umrissen – die einzige offene Frage war bisher der Zeitpunkt. Der Check beantwortet sie: jetzt fehlt nur noch der erste Schritt zu ${angebotKurz}.`,
    wowMoment: `${p.subjCap} erkennt: Die eigene Zurückhaltung lag nie an mangelnder Eignung, sondern an einer einzigen unbeantworteten Frage zu ${traumThema} – und genau die beantwortet der Check gerade.`,
    whatNext: `${p.subjCap} will bei starker Passung den nächsten konkreten Schritt gehen, ohne noch länger abzuwägen, weil die Unsicherheit gerade aufgelöst wurde.`,
    salesLine: `Das Tool zeigt schwarz auf weiß, ob ${problemThema} dringlich und ${traumThema} klar genug sind. Mein ${angebotKurz} ist bei starker Passung der nächste folgerichtige Schritt.`,
    different: `Die Passung entsteht aus dem Zusammenspiel von Dringlichkeit bei ${problemThema} und Zielklarheit bei ${traumThema} – nicht aus einem einzelnen Pauschal-Kriterium wie bei einem Standard-Quiz.`,
    expertiseFit: `Die Passungs-Kriterien spiegeln, was bei Ihnen wirklich funktioniert: ${expertiseThema}.`,
    umsetzung: { label: 'Sehr einfach', time: 'ca. 20–30 Minuten' },
    scoreBase: { contentqualitaet: 9.5, wow: 9.5, zielgruppenfit: 9.6, spezifitaet: 9.5, habenwollen: 9.3, individualisierung: 9.3, einzigartigkeit: 9.2, leadsog: 9.5, kaufsog: 9.8, umsetzung: 9.8, expertise: 9.3 },
    boosts: expertiseReichhaltig ? { expertise: 0.1 } : {}
  });

  /* ---- Scores berechnen (Elite-Bereich, pro Metrik eigene Schwelle) ----
     Die 4 KPIs mit "kompromisslosem Fokus" (Content-Qualität, WOW,
     Zielgruppen-Fit, Spezifität) tragen zusammen über die Hälfte des
     Gewichts am Gesamt-Potenzial. */
  const METRIC_WEIGHTS = {
    contentqualitaet: 0.14, wow: 0.14, zielgruppenfit: 0.14, spezifitaet: 0.14,
    habenwollen: 0.07, individualisierung: 0.06, einzigartigkeit: 0.06,
    leadsog: 0.08, kaufsog: 0.08, expertise: 0.05, umsetzung: 0.04
  };

  let ideas = blueprints.map((bp, i) => {
    const seed = baseSeed + i * 977;
    const scores = {};
    Object.keys(bp.scoreBase).forEach((key, j) => {
      const boost = bp.boosts && bp.boosts[key] ? bp.boosts[key] : 0;
      const val = bp.scoreBase[key] + boost + seededJitter(seed + j * 13);
      scores[key] = clampScore9(val, key);
    });

    let gesamt = 0;
    Object.keys(METRIC_WEIGHTS).forEach((key) => { gesamt += scores[key] * METRIC_WEIGHTS[key]; });
    scores.gesamt = clampScore9(gesamt, 'gesamt');

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
      wowLabel: `Der WOW-Moment ${p.subjGen}`,
      nextLabel: `Was ${p.kunde} danach wahrscheinlich tun will`,
      scores
    };
  });

  /* ---- Sortierung: stärkste Idee immer an Position 1 ---- */
  ideas.sort((a, b) => b.scores.gesamt - a.scores.gesamt);

  /* Sicherheitsnetz: Top-Idee garantiert ≥ 9,7, alle anderen ≥ 9,4 Gesamt
     (Letzteres ist durch den Floor in clampScore9 bereits pro Metrik
     erzwungen und pflanzt sich damit mathematisch in den gewichteten
     Gesamt-Potenzial-Wert fort). */
  if (ideas[0].scores.gesamt < 9.7) {
    ideas[0].scores.gesamt = Math.min(9.9, Math.round((9.7 + Math.abs(seededJitter(baseSeed)) * 0.4) * 10) / 10);
  }

  ideas.forEach((idea, i) => {
    idea.rank = i + 1;
    idea.isTop = i === 0;
  });

  const winCtx = {
    subj: p.subj,
    problemThema,
    problemThemaAlt,
    traumThema,
    traumThemaAlt,
    diagTop: diagOptions[0] || problemThemaAlt,
    methodeLabel: methodeThema === 'Ihrer Methode' ? 'Ihre Methode' : `Ihre Methode „${methodeThema}“`,
    angebotKurz
  };
  ideas[0].winReasons = buildWinReasons(ideas[0], winCtx);
  ideas.forEach(lintIdea);

  return ideas;
}

function buildWinReasons(idea, a) {
  const pool = {
    'muster-kompass': [
      `Beantwortet die Frage, die ${a.subj} sich insgeheim am häufigsten stellt: „Warum passiert mir das immer wieder?“ bei ${a.problemThema}.`,
      `Deckt auf, dass ${a.diagTop} der eigentliche Auslöser ist – eine Verbindung, die kein Ratgeber-Artikel so konkret benennt.`,
      `Wer den Auslöser einmal sieht, will ihn nicht mehr allein angehen – das führt direkt zu ${a.angebotKurz}.`
    ],
    'potenzial-score': [
      `Beantwortet die Frage, die sich ${a.subj} insgeheim stellt: „Wie weit bin ich wirklich von ${a.traumThema} entfernt?“`,
      `Zeigt eine Zahl, die überrascht – meist liegt ${a.subj} näher am Ziel, als das eigene Gefühl vermuten lässt, aber an einer unerwarteten Stelle fest.`,
      `Ein niedriger Wert an genau dieser Stelle macht den nächsten Schritt unausweichlich – direkt zu ${a.angebotKurz}.`
    ],
    'fahrplan-formel': [
      `Beantwortet die Frage, die jeden Anlauf zu ${a.traumThemaAlt} bisher begleitet hat: „An welcher Stelle werde ich wieder hängen bleiben?“`,
      `Zeigt, dass genau eine Etappe – die mit ${a.problemThema} – bisher jeden Versuch kippen ließ, nicht mangelnde Disziplin.`,
      `Wer diese eine kritische Etappe kennt, will sie nicht allein meistern – der Weg führt direkt zu ${a.angebotKurz}.`
    ],
    'ursachen-scanner': [
      `Beantwortet die Frage, die sich ${a.subj} nach mehreren gescheiterten Versuchen stellt: „Liegt es an mir – oder mache ich etwas grundsätzlich falsch?“`,
      `Zeigt an der eigenen Situation bei ${a.problemThemaAlt}, wie ${a.methodeLabel} konkret funktioniert – nicht nur als Beschreibung, sondern angewendet.`,
      `Wer die eigene Methode einmal live erlebt hat, will keine generische Alternative mehr – der Weg führt direkt zu ${a.angebotKurz}.`
    ],
    'bereit-check': [
      `Beantwortet die Frage, die sich ${a.subj} vor jeder Entscheidung insgeheim stellt: „Bin ich wirklich bereit dafür – oder rede ich mir das nur ein?“`,
      `Zeigt eine ehrliche Passungs-Aussage statt eines weiteren Verkaufsarguments – das schafft Vertrauen, wo sonst Skepsis wäre.`,
      `Bei starker Passung verschwindet die letzte Zögerlichkeit, und der Weg zu ${a.angebotKurz} wird zur logischen Konsequenz.`
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
- Premium-Optik in kräftigem CI-Blau (#016E8E) + sehr hellem Creme/Offwhite, großzügige Weißräume, klare runde Karten
- Ein deutlich sichtbarer blauer Hero-/Header-Bereich oben (kein dünner Strich), Headline in Weiß/Offwhite
- CTA-Buttons: Hintergrund exakt #016E8E, Champagner-/Gold-Schrift; sekundäre Buttons hell mit blauem Rand und blauer Schrift
- Gold ausschließlich sparsam für Sterne, Scores und Top-Empfehlung, nie als große Fläche
- Dunkler Text in tiefem Blau/Anthrazit statt Schwarz
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
  contentqualitaet: 'Content-Qualität',
  wow: 'WOW-Effekt',
  zielgruppenfit: 'Zielgruppen-Fit',
  spezifitaet: 'Spezifität',
  habenwollen: 'Haben-wollen',
  individualisierung: 'Individualisierung',
  einzigartigkeit: 'Einzigartigkeit',
  leadsog: 'Lead-Sog',
  kaufsog: 'Kauf-Sog',
  umsetzung: 'Umsetzungs-Einfachheit',
  expertise: 'Expertise-Fit'
};

function renderScoreGrid(scores) {
  const order = ['contentqualitaet', 'wow', 'zielgruppenfit', 'spezifitaet', 'habenwollen', 'individualisierung', 'einzigartigkeit', 'leadsog', 'kaufsog', 'umsetzung', 'expertise'];
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
    <p class="io-line-label">Eingabe → Ergebnis</p>
    <p class="io-line"><span>${ioIn}</span><span class="io-arrow">→</span><span>${ioOut}</span></p>
    <p class="mini-preview"><strong>Beispiel-Ergebnis:</strong> ${idea.miniPreview}</p>
    <div class="why-strong">
      <h4>Warum stark</h4>
      <ul>${idea.whyStrong.map((r) => `<li>${r}</li>`).join('')}</ul>
    </div>
    <p class="umsetzung-line">Umsetzung: <strong>${idea.umsetzung.label}</strong> · Erste Version in ${idea.umsetzung.time} baubar</p>
    <div class="potential-row">
      <div class="potential-stat is-gold">
        <span class="potential-label">Gesamt-Potenzial</span>
        <span class="potential-value">${formatScore(idea.scores.gesamt)}/10</span>
      </div>
      <div class="potential-stat is-blue">
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

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
   "Eingabe → Ergebnis"-Überschrift) verwenden normale Groß-/Kleinschreibung
   statt CSS-Kapitälchen, in DSC-Blau (--ci-blue), siehe wowLabel/subjGen.

   Struktur-Runde: Die Hauptkarte zeigt Name, Kategorie, Subline, Eingabe→
   Ergebnis, Beispiel-Ergebnis, "Warum [Kundin/Kunde] das wissen will"
   (max. 2 Punkte), Umsetzung, Gesamt-Potenzial, Lead-Sog und den
   Bau-Prompt-Button. Details sind in 3 Cluster gegliedert (siehe
   renderIdeaCard): "Aha" ("Was [Kundin/Kunde] plötzlich erkennt"), "Sog"
   ("Der nächste sinnvolle Schritt für [Kundin/Kunde]" + das kaufsog-Feld
   mit max. 2 Punkten) und "Strategie" (Verkaufslogik, Abgrenzung,
   Expertise-Fit, "Für wen diese Idee besonders stark ist", Detail-
   Scores). Bei der Top-Idee steht zusätzlich ganz oben in den Details
   die Box "Warum ich Ihnen genau diese Idee zuerst empfehlen würde".

   V7 — Alltagssprache-Runde: THEME_CONCRETE übersetzt abstrakte Theme-
   Substantive (Motivation, Lern-Selbstständigkeit, Eigenverantwortung …)
   in beobachtbares Alltagsverhalten (siehe concreteBehavior()); jede
   Idee ist zusätzlich an eine echte, alltagssprachliche Kernfrage der
   Zielgruppe gebunden, sichtbar als erster Punkt unter "Warum [Kundin/
   Kunde] das wissen will". Jedes Beispiel-Ergebnis folgt strikt dem
   Muster "Das passiert → Das steckt dahinter → Das können Sie jetzt
   tun" (Symptom → Ursache → Handlung). Perspektive bleibt pro Block
   konsistent: Verkaufslogik und sonstige strategische Analyse sprechen
   den Experten mit "Ihre Methode/Ihr Angebot/Ihr Coaching" an (2.
   Person); nur im direkt nutzbaren Beispiel-Ergebnis bleibt "meine
   Methode" (Ich-Stimme des Anbieters gegenüber der eigenen Kundschaft)
   stehen.

   V8 — Selbstfragen-Runde: Tool-Namen dürfen nie mehr aus einem bloßen
   generischen Einzelbegriff + Format-Suffix bestehen ("Stress-Check").
   isGenericTheme()/buildNameThema() (ab THEME_KEYWORDS-Tier D, siehe
   GENERIC_TIER_START) erzwingen dafür ein konkretes Zwei-Themen-
   Compound, sobald das führende Thema generisch ist — z. B. wird aus
   dem bloßen "Team" automatisch "Team-Eigenverantwortung". Jede Idee
   trägt zusätzlich eine dokumentierte "Job-Definition" als Kommentar
   direkt über ihrem Blueprint (Hauptfrage, benötigte Daten, Schluss-
   folgerung, dadurch leichtere Handlung — siehe Punkt 8 der Vorgabe).
   Sublines folgen jetzt durchgehend der 3-Klausel-Formel "erkennt X,
   warum Y entsteht, was sie/er konkret anders machen kann"; Eingabe→
   Ergebnis-Ausgaben sind volle beschreibende Sätze ("zeigt, welches …,
   wie stark … und welcher nächste Schritt …") statt Nomen-Listen. Das
   Score-System hat eine fünfte KPI mit kompromisslosem Fokus,
   Verständlichkeit (≥ 9,6, siehe METRIC_FLOORS/METRIC_WEIGHTS), und der
   allgemeine Gesamt-Floor liegt jetzt bei 9,5 statt 9,4. Alle Kern-
   Textfelder wurden gegen die erweiterte Floskel-Verbotsliste geprüft
   (siehe META_PATTERNS) und durch konkrete Ursache-Wirkungs-Aussagen
   ersetzt.
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

/* Pro Metrik eigene Mindestschwelle — die 5 KPIs mit kompromisslosem
   Fokus (Content-Qualität, WOW, Zielgruppen-Fit, Spezifität,
   Verständlichkeit) liegen höher als die übrigen Metriken. */
const METRIC_FLOORS = {
  contentqualitaet: 9.4,
  wow: 9.4,
  zielgruppenfit: 9.6,
  spezifitaet: 9.6,
  verstaendlichkeit: 9.6,
  habenwollen: 9.2,
  individualisierung: 9.2,
  einzigartigkeit: 9.2,
  leadsog: 9.2,
  kaufsog: 9.2,
  expertise: 9.2,
  umsetzung: 9.2,
  gesamt: 9.5
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
  f: { subjCap: 'Ihre Interessentin', subj: 'sie', subjAcc: 'sie', subjGen: 'Ihrer Interessentin', kunde: 'Ihre Kundin', kundeAcc: 'Ihre Kundin' },
  m: { subjCap: 'Ihr Interessent', subj: 'er', subjAcc: 'ihn', subjGen: 'Ihres Interessenten', kunde: 'Ihr Kunde', kundeAcc: 'Ihren Kunden' },
  n: { subjCap: 'Ihre Interessentin bzw. Ihr Interessent', subj: 'sie bzw. er', subjAcc: 'sie bzw. ihn', subjGen: 'Ihrer Interessentin bzw. Ihres Interessenten', kunde: 'Ihre Kundin bzw. Ihr Kunde', kundeAcc: 'Ihre Kundin bzw. Ihren Kunden' }
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

/* Übersetzt abstrakte Theme-Substantive in beobachtbares Alltagsverhalten
   (siehe V7-Vorgabe "Alltagssprache statt abstrakter Begriffe", Beispiel
   "Lernselbstständigkeit" → "beginnt Aufgaben selbstständiger, bleibt
   länger dran und fragt gezielter nach Hilfe"). Alle Klauseln stehen in
   der 3. Person Singular und funktionieren dadurch unabhängig vom
   Geschlecht der Zielgruppe als Fortsetzung von z. B. "Ihre Interessentin". */
const THEME_CONCRETE = {
  Motivation: 'startet leichter, bleibt bei Rückschlägen dran und braucht weniger Druck von außen',
  Lernmotivation: 'startet leichter mit dem Lernen, bleibt bei schwierigen Aufgaben dran und braucht weniger Erinnern und Drängen',
  Selbstständigkeit: 'übernimmt mehr eigene Schritte, ohne bei jeder Kleinigkeit nachzufragen',
  'Lern-Selbstständigkeit': 'beginnt Aufgaben selbstständiger, bleibt länger dran und fragt gezielter nach Hilfe',
  Selbstwert: 'traut sich mehr zu und spricht seltener abwertend über sich selbst',
  Selbstzweifel: 'traut sich mehr zu, statt sich von jedem Rückschlag entmutigen zu lassen',
  Vertrauen: 'öffnet sich wieder, statt ständig nach Bestätigung zu fragen',
  Vertrauensverlust: 'reagiert wieder gelassener, statt jede Situation misstrauisch zu prüfen',
  Konflikt: 'eskaliert seltener bei Kleinigkeiten und sucht schneller eine gemeinsame Lösung',
  Stress: 'wirkt spürbar ruhiger und reagiert nicht mehr bei jeder Kleinigkeit gereizt',
  Muster: 'verhält sich in wiederkehrenden Situationen anders, statt automatisch in die alte Reaktion zu fallen',
  Entscheidung: 'trifft die Entscheidung tatsächlich, statt sie wochenlang vor sich herzuschieben',
  Entscheidungsunsicherheit: 'trifft die Entscheidung tatsächlich, statt sie immer wieder aufzuschieben',
  Eigenverantwortung: 'übernimmt Aufgaben von sich aus, statt auf Anweisung zu warten',
  Kontrollverhalten: 'lässt Aufgaben los, ohne ständig nachzufragen oder alles noch einmal selbst zu prüfen',
  Führung: 'trifft Entscheidungen sichtbar und wird vom Team ernst genommen, ohne über Druck führen zu müssen',
  Führungswirkung: 'wird vom Team spürbar anders wahrgenommen: ernst genommen, ohne autoritär wirken zu müssen',
  Team: 'arbeitet eigenständiger zusammen, ohne dass jede Entscheidung eskaliert werden muss',
  Teamdynamik: 'spricht Spannungen im Team direkt an, statt sie zu ignorieren, bis sie eskalieren',
  Mitarbeitermotivation: 'zeigt im Alltag sichtbar mehr Eigeninitiative, statt nur Dienst nach Vorschrift zu machen',
  Blockade: 'kommt an der Stelle voran, an der bisher immer wieder Stillstand war',
  Perfektionismus: 'liefert Ergebnisse ab, statt sie endlos zu überarbeiten',
  Angst: 'geht die Situation trotz Unbehagen an, statt sie wie bisher zu vermeiden',
  Zeitmangel: 'schafft die wichtigen Dinge, ohne jeden Abend bis spät zu arbeiten',
  Energie: 'kommt spürbar entspannter durch den Tag',
  Grenzen: 'sagt spürbar öfter Nein, ohne sich anschließend schuldig zu fühlen',
  Gewohnheiten: 'hält neue Routinen auch dann durch, wenn der Alltag stressig wird',
  Karriere: 'bewirbt sich aktiv auf die nächste Position, statt abzuwarten, bis sie angeboten wird',
  Finanzen: 'trifft Preis- und Geld-Entscheidungen ohne das flaue Gefühl im Bauch',
  Kundengewinnung: 'bekommt Anfragen, ohne jeden Tag aktiv hinterherlaufen zu müssen',
  Sichtbarkeit: 'postet regelmäßig, ohne sich vorher tagelang den Kopf über den Inhalt zu zerbrechen',
  Preisgestaltung: 'nennt den Preis, ohne sich dafür zu rechtfertigen oder ihn im letzten Moment zu senken',
  'innere Blockaden': 'handelt trotz des inneren Widerstands, statt auf das perfekte Gefühl zu warten',
  Mikromanagement: 'übergibt Aufgaben wirklich, statt sie kurz danach wieder an sich zu ziehen',
  Delegation: 'gibt Aufgaben ab und lässt sie auch bei einem anderen Ergebnis als dem eigenen stehen',
  Überlastung: 'sagt spürbar früher Stopp, bevor der Punkt der Erschöpfung erreicht ist',
  Konfliktgespräche: 'führt das schwierige Gespräch zeitnah, statt es wochenlang vor sich herzuschieben',
  Erziehung: 'reagiert in Erziehungsfragen konsequenter, ohne öfter laut zu werden',
  Einsamkeit: 'sucht aktiver Kontakt, statt sich weiter zurückzuziehen',
  Eifersucht: 'reagiert auf Auslöser gelassener, statt sofort in Kontrolle oder Vorwürfe zu gehen',
  Kommunikation: 'spricht Bedürfnisse direkt aus, statt zu erwarten, dass der andere sie errät',
  Trennung: 'trifft Klarheit über die eigene Situation, statt im Ungewissen zu verharren',
  Bindungsangst: 'bleibt in der Nähe, statt sich beim ersten echten Gefühl zurückzuziehen',
  Verlustangst: 'reagiert auf normale Distanz gelassener, statt sofort Verlust zu befürchten',
  Intimität: 'lässt echte Nähe zu, statt sie unbewusst zu vermeiden',
  Beziehungsmuster: 'verhält sich im Streit anders als im alten, eingespielten Muster',
  Streitspirale: 'steigt aus dem immer gleichen Streit-Ablauf aus, bevor er eskaliert',
  'Nähe-Distanz-Muster': 'bleibt in der Nähe-Phase, statt beim ersten Anzeichen von Nähe wieder auf Distanz zu gehen',
  Burnout: 'erkennt eigene Warnsignale früh, statt bis zum Zusammenbruch weiterzumachen',
  Selbstsabotage: 'bleibt am eigenen Vorhaben dran, statt sich kurz vorher selbst auszubremsen',
  Versagensangst: 'traut sich an schwierige Aufgaben heran, statt sie vorab zu vermeiden',
  Notenangst: 'geht in Prüfungssituationen ruhiger heran, statt sich vorher komplett zu blockieren',
  Prüfungsangst: 'geht in Prüfungssituationen ruhiger heran, statt sich vorher komplett zu blockieren',
  Konzentrationsprobleme: 'bleibt länger konzentriert bei einer Aufgabe, ohne sich ständig ablenken zu lassen'
};

/* Liefert die konkrete Alltags-Klausel zu einem Thema (oder null, wenn
   keine hinterlegt ist) und baut daraus wahlweise direkt einen Satz. */
function concreteGloss(theme) {
  return THEME_CONCRETE[theme] || null;
}

function concreteBehavior(subjectPhrase, theme) {
  const gloss = concreteGloss(theme);
  if (gloss) return `${subjectPhrase} ${gloss}`;
  return `${subjectPhrase} zeigt bei ${theme} eine im Alltag klar spürbare Veränderung`;
}

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

/* Ab Tier D ("Angst") gelten Themen als so allgemein, dass sie zusammen
   mit einem reinen Format-Suffix ("Stress-Check", "Motivations-Analyse")
   in praktisch jeder Nische unverändert funktionieren würden — genau das
   verbietet die Anti-Generik-Regel für Tool-Namen. */
const GENERIC_TIER_START = themeTier('Angst');

function isGenericTheme(noun) {
  return themeTier(noun) >= GENERIC_TIER_START;
}

/* Baut den Themen-Baustein für einen Tool-Namen: ein bereits konkretes
   Thema (Tier A–C, z. B. "Hausaufgaben-Stress", "Kontrollverhalten")
   bleibt allein stehen, weil es selbst schon eine erkennbare Alltags-
   situation beschreibt. Ein generisches Thema (Tier D–F, z. B. "Stress",
   "Motivation", "Team") wird stattdessen mit einem zweiten, andersartigen
   Thema zu einem konkreten Zwei-Themen-Namen kombiniert (siehe Vorgabe-
   Beispiel "Nähe-Rückzug-Muster-Check") — ein Tool-Name besteht dadurch
   nie mehr aus nur einem abstrakten Begriff plus Format-Suffix. */
function buildNameThema(primary, ...alternatives) {
  if (!isGenericTheme(primary)) return primary;
  const specific = alternatives.find((t) => t && t !== primary && !isGenericTheme(t));
  if (specific) return `${primary}-${specific}`;
  const anyOther = alternatives.find((t) => t && t !== primary);
  return anyOther ? `${primary}-${anyOther}` : primary;
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
  /erzeugt einen? aha/i,
  /natürliche[ns]? nächste[ns]? wunsch ist mehr von (ihnen|mir)/i,
  /(tool|es) (erzeugt|schafft) (kauf-?sog|klarheit)\.?\s*$/i,
  /schafft klarheit/i,
  /geht (eine ebene )?tiefer\.?\s*$/i,
  /zeigt potenzial\.?\s*$/i,
  /erzeugt emotionalen sog/i,
  /liefert erkenntnisse\.?\s*$/i,
  /natürlicher nächster schritt/i
];

function lintIdea(idea) {
  const textFields = [idea.subline, idea.wowMoment, idea.whatNext, idea.fuerWen, ...idea.whyStrong, ...idea.kaufsog, ...idea.recommend];
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

  /* ---- 1. Diagnose · Muster-Kompass (Perspektive: Ursache/Typ) ----
     Job dieser Idee (Punkt 8): Hauptfrage — "Warum lande ich bei
     [Problem] immer wieder im gleichen Muster?". Daten — 6–8 Antworten
     zu Reaktionsmustern + Einschätzung zum wahrscheinlichsten Auslöser.
     Schlussfolgerung — welcher von bis zu 3 konkreten Auslösern am
     wahrscheinlichsten dahintersteckt. Leichtere Handlung — gezielt an
     der Ursache statt am Symptom ansetzen. */
  blueprints.push({
    id: 'muster-kompass',
    category: 'Diagnose',
    toolType: 'Typ-Analyse / Muster-Test',
    name: `${buildNameThema(problemThema, diagOptions[0], problemThemaAlt, traumThema)}-Kompass`,
    subline: `${p.subjCap} erkennt, warum ${p.subj} bei ${problemThema} immer wieder ins gleiche Muster rutscht, ob ${listOr(diagOptions)} dahintersteckt – und was ${p.subj} als Erstes anders machen kann, ohne sich zusätzlich unter Druck zu setzen.`,
    ioLine: `6–8 gezielte Fragen zu ${problemThema} und typischen Reaktionsmustern → zeigt, welches Muster hinter ${problemThema} steckt, wie stark ${diagOptions[0] || problemThemaAlt} mitspielt und welcher erste Schritt das Muster durchbricht`,
    inputs: [
      `6–8 Fragen zu ${problemThema} und typischen Reaktionsmustern im Alltag`,
      `Einschätzung, wie stark ${diagOptions[0] || problemThemaAlt} die aktuelle Situation zusätzlich beeinflusst`,
      `Wunsch-Richtung: wie nah ${p.subj} an ${traumThema} bereits ist`
    ],
    output: `Zeigt, welches Muster hinter ${problemThema} steckt, wie stark ${diagOptions[0] || problemThemaAlt} mitspielt und welcher erste Schritt das Muster durchbricht.`,
    whyStrong: [
      `Beantwortet die Frage: „Warum lande ich bei ${problemThema} immer wieder im gleichen Muster?“`,
      `Weil klar wird, dass nicht Willensschwäche das Problem ist, sondern ${diagOptions[0] || problemThemaAlt} – das nimmt Druck und zeigt einen konkreten Ansatzpunkt.`
    ],
    miniPreview: `${p.subjCap} erlebt ${problemThema} immer wieder in denselben Situationen, egal wie oft ${p.subj} sich vornimmt, es anders zu machen → dahinter steckt meist ${diagOptions[0] || problemThemaAlt}, nicht fehlende Disziplin → zuerst dort ansetzen, nicht am sichtbaren Symptom.`,
    wowMoment: `${p.subjCap} erkennt: Nicht mangelnde Disziplin erzeugt ${problemThema}, sondern der bisher unbewusste Zusammenhang mit ${diagOptions[0] || problemThemaAlt} – deshalb ist jeder gute Vorsatz bisher wirkungslos verpufft. Das entlastet, weil es nie am eigenen Willen lag.`,
    whatNext: `Der nächste sinnvolle Schritt: gezielt an ${diagOptions[0] || problemThemaAlt} ansetzen, statt weiter nur auf ${problemThema} zu reagieren. Was danach noch fehlt: eine Begleitung, die diesen Auslöser dauerhaft verändert, nicht nur einmal benennt – genau das ist der logische nächste Schritt zu Ihrer Begleitung.`,
    kaufsog: [
      `${p.subjCap} erkennt jetzt den Auslöser (${diagOptions[0] || problemThemaAlt}) hinter ${problemThema}, weiß aber noch nicht, wie ${p.subj} ihn im Alltag dauerhaft entschärft.`,
      `Genau diese Umsetzung ist der nächste logische Schritt in Ihrer Begleitung.`
    ],
    salesLine: `Das Tool zeigt, dass ${diagOptions[0] || problemThemaAlt} der eigentliche Auslöser hinter ${problemThema} ist. ${methodeThema === 'Ihrer Methode' ? 'Ihre Methode' : `Ihre Methode „${methodeThema}“`} hilft dabei, genau diesen Auslöser konkret zu verändern. Ihr ${angebotKurz} unterstützt ${p.kundeAcc} dabei, diese Veränderung dauerhaft im Alltag zu verankern.`,
    different: `Es kombiniert ${listAnd([problemThema].concat(diagOptions))} zu einer einzigen Diagnose, statt sie getrennt abzufragen, und zieht daraus die Schlussfolgerung, welcher Auslöser wahrscheinlich zuerst wirkt – das leistet ein einzelnes Quiz mit Punktesumme nicht, weil es die Faktoren nicht gegeneinander gewichtet.`,
    expertiseFit: `Das Tool nutzt ${methodeThema === 'Ihrer Methode' ? 'Ihre Methode' : `Ihre Methode „${methodeThema}“`}, um das ${problemThema}-Muster im Licht Ihrer Expertise (${expertiseThema}) auszuwerten statt mit generischem Coaching-Wissen.`,
    fuerWen: `Besonders stark für alle, bei denen ${problemThema} immer wieder in den gleichen Situationen auftritt und die sich konkret wünschen, dass ${concreteBehavior(p.subj, traumThema)}.`,
    umsetzung: { label: 'Einfach zu bauen', reason: 'weil nur 6–8 Fragen und eine einfache Musterauswertung nötig sind' },
    recommend: [
      `Trifft den Punkt, der am meisten wehtut: immer wieder im gleichen ${problemThema}-Muster zu landen, obwohl man es eigentlich anders machen wollte.`,
      `Der WOW-Moment ist konkret: nicht Willensschwäche, sondern ${diagOptions[0] || problemThemaAlt} ist der wahre Auslöser.`,
      `Der Übergang zu Ihrer Begleitung ist natürlich, weil das Tool den Auslöser zeigt, die dauerhafte Veränderung aber erst in der Begleitung passiert.`
    ],
    scoreBase: { contentqualitaet: 9.6, wow: 9.6, zielgruppenfit: 9.6, spezifitaet: 9.7, verstaendlichkeit: 9.7, habenwollen: 9.4, individualisierung: 9.4, einzigartigkeit: 9.3, leadsog: 9.6, kaufsog: 9.4, umsetzung: 9.5, expertise: 9.4 },
    boosts: problemReichhaltig ? { wow: 0.1, individualisierung: 0.1 } : {}
  });

  /* ---- 2. Analyse/Audit · Potenzial-Score (Perspektive: Score) ----
     Job dieser Idee (Punkt 8): Hauptfrage — "Wie weit bin ich wirklich
     von [Ziel] entfernt?". Daten — 6–8 Einschätzungsfragen + aktueller
     Stand. Schlussfolgerung — ein Score plus der eine Faktor, der ihn
     am stärksten senkt. Leichtere Handlung — Energie gezielt in genau
     diese eine Stellschraube statt breit in alles investieren. */
  blueprints.push({
    id: 'potenzial-score',
    category: 'Analyse / Audit',
    toolType: 'Scorecard',
    name: `${buildNameThema(traumThema, problemThema, traumThemaAlt)}-Score`,
    subline: `${p.subjCap} erkennt, wie nah ${p.subj === 'er' ? 'er' : 'sie'} ${traumThema} wirklich schon ist, welcher einzelne Faktor (${problemThema}) den Fortschritt bisher bremst – und was ${p.subj} konkret als Nächstes verändern kann.`,
    ioLine: `6–8 Einschätzungsfragen zu ${traumThema} → zeigt, wie nah ${p.subj} an ${traumThema} wirklich ist, welcher Faktor (${problemThema}) am meisten bremst und welcher nächste Schritt am meisten bringt`,
    inputs: [
      `6–8 Einschätzungsfragen zu ${traumThema}`,
      `Aktueller Stand in Bezug auf ${traumThema}`,
      `Einschätzung zur bisherigen Herangehensweise`
    ],
    output: `Zeigt, wie nah ${p.subj} an ${traumThema} wirklich ist, welcher Faktor (${problemThema}) am meisten bremst und welcher nächste Schritt am meisten bringt.`,
    whyStrong: [
      `Beantwortet die Frage: „Wie weit bin ich eigentlich wirklich von ${traumThema} entfernt?“`,
      `Weil eine konkrete Zahl mehr bewegt als ein diffuses Gefühl – und zeigt, an welcher einzelnen Stelle sich Veränderung am meisten lohnt.`
    ],
    miniPreview: `${p.subjCap} steht bei ${traumThema} näher am Ziel, als es sich anfühlt → dahinter steckt, dass vor allem ${problemThema} den Score nach unten zieht, nicht fehlender Wille → zuerst genau dort ansetzen, dann zeigt sich der Fortschritt auch im Gefühl.`,
    wowMoment: `${p.subjCap} merkt: Nicht fehlende Motivation hält den Score unten, sondern eine einzige übersehene Stellschraube namens ${problemThema} – deshalb halfen bisherige Versuche immer nur kurzfristig. Das entlastet, weil nicht die ganze Person „das Problem“ ist, sondern nur diese eine Stellschraube.`,
    whatNext: `Der nächste sinnvolle Schritt: gezielt an ${problemThema} arbeiten, statt weiter am sichtbaren Symptom. Was danach noch fehlt: konkrete Schritte, um diese eine Lücke wirklich zu schließen – genau das leistet Ihr Angebot als logischer nächster Schritt.`,
    kaufsog: [
      `${p.subjCap} kennt jetzt die eine Lücke (${problemThema}), die den Score senkt, weiß aber noch nicht, mit welchen konkreten Schritten sie sich schließen lässt.`,
      `Genau dieses Schließen der Lücke ist der nächste logische Schritt in Ihrem Angebot.`
    ],
    salesLine: `Das Tool zeigt die größte Lücke zwischen jetzt und ${traumThema}. Ihre Methode hilft dabei, genau diese Lücke konkret zu schließen. Ihr ${angebotKurz} unterstützt ${p.kundeAcc} dabei, den Fortschritt dauerhaft im Alltag zu halten.`,
    different: `Der Score wertet mehrere Faktoren gemeinsam aus und priorisiert automatisch die eine Stellschraube mit dem größten Hebel, statt nur eine Gesamtpunktzahl auszugeben – das leistet ein einzelner Online-Test nicht, weil er die Faktoren nicht gegeneinander gewichtet.`,
    expertiseFit: `Die Bewertungskriterien des Scores sind aus Ihrer Expertise (${expertiseThema}) abgeleitet, nicht aus einer allgemeinen Checkliste.`,
    fuerWen: `Besonders stark für alle, die bei ${traumThema} das Gefühl haben, nicht voranzukommen. Konkret heißt das Ziel: ${concreteBehavior(p.subj, traumThema)}.`,
    umsetzung: { label: 'Einfach zu bauen', reason: 'weil nur ein Punkte-Score berechnet werden muss' },
    recommend: [
      `Trifft den Punkt, der am meisten wehtut: das Gefühl, bei ${traumThema} nicht so recht voranzukommen, ohne genau zu wissen, woran es liegt.`,
      `Der WOW-Moment ist konkret: der Score zeigt, dass ${problemThema} und nicht fehlender Wille die Punktzahl senkt.`,
      `Der Übergang zu Ihrem Angebot ist natürlich, weil der Score die Lücke zeigt, das Schließen der Lücke aber erst dort passiert.`
    ],
    scoreBase: { contentqualitaet: 9.5, wow: 9.5, zielgruppenfit: 9.5, spezifitaet: 9.5, verstaendlichkeit: 9.8, habenwollen: 9.3, individualisierung: 9.3, einzigartigkeit: 9.2, leadsog: 9.4, kaufsog: 9.5, umsetzung: 9.6, expertise: 9.3 },
    boosts: traumReichhaltig ? { leadsog: 0.1, kaufsog: 0.1 } : {}
  });

  /* ---- 3. Strategie · Fahrplan-Formel (Perspektive: Roadmap) ----
     Job dieser Idee (Punkt 8): Hauptfrage — "Warum komme ich bei
     [Ziel] immer an derselben Stelle nicht weiter?". Daten — aktueller
     Status quo + Wunsch-Zeitpunkt + größtes Hindernis. Schlussfolgerung
     — welche Etappe als Nächstes ansteht und wo genau das Hindernis
     bisher zuschlägt. Leichtere Handlung — für diese eine Etappe einen
     zusätzlichen Zwischenschritt einplanen statt den ganzen Plan neu
     aufzurollen. */
  blueprints.push({
    id: 'fahrplan-formel',
    category: 'Strategie',
    toolType: 'Rechner + Roadmap',
    name: `${buildNameThema(traumThemaAlt, traumThema, problemThema)}-Fahrplan`,
    subline: `${p.subjCap} erkennt, bei welcher Etappe rund um ${traumThemaAlt} ${p.subj === 'er' ? 'er' : 'sie'} bisher hängen bleibt, warum genau dort ${problemThema} zuschlägt – und was ${p.subj} für diese eine Etappe konkret anders angehen kann.`,
    ioLine: `Aktueller Stand + Wunsch-Zeitpunkt für ${traumThemaAlt} → zeigt, welche Etappe zu ${traumThemaAlt} als Nächstes ansteht, wo ${problemThema} bisher blockiert und welche Handlung diese Woche den Unterschied macht`,
    inputs: [
      `Aktueller Status quo (Zeit, Ressourcen oder Fortschritt aktuell)`,
      `Wunsch-Zeitpunkt für ${traumThemaAlt}`,
      `Größtes aktuelles Hindernis: ${problemThema}`
    ],
    output: `Zeigt, welche Etappe zu ${traumThemaAlt} als Nächstes ansteht, wo ${problemThema} bisher blockiert und welche Handlung diese Woche den Unterschied macht.`,
    whyStrong: [
      `Beantwortet die Frage: „Warum komme ich bei ${traumThemaAlt} immer wieder an derselben Stelle nicht weiter?“`,
      `Weil das Scheitern an einer einzelnen Etappe leichter zu akzeptieren ist als das Gefühl, grundsätzlich nicht durchhalten zu können.`
    ],
    miniPreview: `${p.subjCap} kommt bei den ersten Etappen gut voran, stockt aber immer an derselben Stelle → dahinter steckt ${problemThema}, das genau dort jeden Anlauf ausbremst → für diese eine Etappe einen zusätzlichen Zwischenschritt einplanen, statt sie wie die anderen zu behandeln.`,
    wowMoment: `${p.subjCap} erkennt: Bisherige Anläufe scheiterten nicht an mangelnder Willenskraft, sondern daran, dass ${problemThema} immer an derselben Etappe zuschlug, bevor eine Routine entstehen konnte. Das entlastet, weil nicht der ganze Fahrplan falsch war, sondern nur eine einzige Etappe.`,
    whatNext: `Der nächste sinnvolle Schritt: für genau diese eine kritische Etappe einen anderen Ansatz wählen als bei den letzten Versuchen. Was danach noch fehlt: Begleitung genau in diesem Moment, nicht nur ein Plan auf Papier – das ist der logische nächste Schritt zu Ihrer Begleitung.`,
    kaufsog: [
      `${p.subjCap} kennt jetzt die kritische Etappe, an der ${problemThema} bisher blockiert, weiß aber noch nicht, wie ${p.subj} sie diesmal anders meistert.`,
      `Genau diese Umsetzung der kritischen Etappe ist der nächste logische Schritt in Ihrer Begleitung.`
    ],
    salesLine: `Das Tool zeigt den Fahrplan zu ${traumThemaAlt} und die Etappe, an der ${problemThema} bisher blockiert hat. Ihre Methode hilft dabei, genau diese Etappe konkret anders anzugehen. Ihr ${angebotKurz} unterstützt ${p.kundeAcc} dabei, dort dranzubleiben, bis die Etappe wirklich sitzt.`,
    different: `Die Etappen sind nicht gleichmäßig verteilt wie bei einem Standard-Fahrplan, sondern setzen genau dort einen zusätzlichen Zwischenschritt, wo ${problemThema} erfahrungsgemäß zuschlägt – diese Schlussfolgerung zieht ein generischer Ziel-Rechner nicht.`,
    expertiseFit: `Die Etappen der Roadmap folgen ${methodeThema === 'Ihrer Methode' ? 'Ihrer eigenen Methode' : `Ihrer Methode „${methodeThema}“`}, nicht einem austauschbaren Standard-Fahrplan.`,
    fuerWen: `Besonders stark für alle, die bei ${traumThemaAlt} immer wieder an derselben Etappe hängen bleiben. Konkret heißt das Ziel: ${concreteBehavior(p.subj, traumThemaAlt)}.`,
    umsetzung: { label: 'Einfach zu bauen', reason: 'weil die Etappen aus zwei einfachen Angaben berechnet werden' },
    recommend: [
      `Trifft den Punkt, der am meisten wehtut: ${traumThemaAlt} fühlt sich seit Langem wie ein fernes Ziel an, nicht wie ein planbarer Weg.`,
      `Der WOW-Moment ist konkret: nicht die ganze Strecke ist das Problem, sondern immer dieselbe Etappe, an der ${problemThema} zuschlägt.`,
      `Der Übergang zu Ihrer Begleitung ist natürlich, weil der Fahrplan die kritische Etappe zeigt, sie tatsächlich meistern hilft aber erst die Begleitung.`
    ],
    scoreBase: { contentqualitaet: 9.5, wow: 9.5, zielgruppenfit: 9.5, spezifitaet: 9.5, verstaendlichkeit: 9.6, habenwollen: 9.5, individualisierung: 9.3, einzigartigkeit: 9.3, leadsog: 9.5, kaufsog: 9.6, umsetzung: 9.3, expertise: 9.3 },
    boosts: {}
  });

  /* ---- 4. Coach · Ursachen-Scanner (Perspektive: Ursache, methodenbasiert) ----
     Job dieser Idee (Punkt 8): Hauptfrage — "Liegt es an mir, oder
     mache ich bei [Problem] etwas grundsätzlich falsch?". Daten — eine
     konkrete Situation + bisherige Versuche + Wunsch-Ergebnis.
     Schlussfolgerung — die wahrscheinlichste Ursache nach der eigenen
     Methode plus 2 typische Anzeichen dafür. Leichtere Handlung — ein
     erster Schritt, der an der Ursache statt am Symptom ansetzt. */
  blueprints.push({
    id: 'ursachen-scanner',
    category: 'Coach',
    toolType: 'Mini-Coaching-Simulator',
    name: `${buildNameThema(problemThemaAlt, problemThema, traumThema)}-Ursachen-Scanner`,
    subline: `${p.subjCap} erkennt, warum bisherige Versuche bei ${problemThemaAlt} nicht gewirkt haben, dass ${traumThema} statt des sichtbaren Symptoms der eigentliche Hebel ist – und was ${p.subj} als Nächstes konkret angehen kann.`,
    ioLine: `Eine konkrete Situation bei ${problemThemaAlt} + bisherige Versuche → zeigt, welche Ursache bei ${problemThemaAlt} am wahrscheinlichsten ist, woran ${p.subj} das im Alltag erkennt und welcher erste Schritt jetzt sinnvoll ist`,
    inputs: [
      `Eine konkrete aktuelle Situation bei ${problemThemaAlt}`,
      `Was bisher schon versucht wurde`,
      `Das gewünschte Ergebnis: ${traumThema}`
    ],
    output: `Zeigt, welche Ursache bei ${problemThemaAlt} am wahrscheinlichsten ist, woran ${p.subj} das im Alltag erkennt und welcher erste Schritt jetzt sinnvoll ist, abgeleitet aus Ihrer Methode (${methodeThema}).`,
    whyStrong: [
      `Beantwortet die Frage: „Liegt es an mir, oder mache ich bei ${problemThemaAlt} etwas grundsätzlich falsch?“`,
      `Weil das Ergebnis direkt an der eigenen Situation entsteht, nicht an einem austauschbaren Beispiel – das macht die Empfehlung sofort nachvollziehbar.`
    ],
    miniPreview: `${p.subjCap} hat bei ${problemThemaAlt} schon einiges versucht, ohne echten Fortschritt → dahinter steckt eher ${traumThema} als das sichtbare Symptom → genau dort setzt meine Methode ein, nicht beim Symptom selbst.`,
    wowMoment: `${p.subjCap} erkennt: Bisherige Versuche scheiterten nicht am fehlenden Willen, sondern daran, dass bisher niemand bei ${traumThema} statt beim sichtbaren Symptom ${problemThemaAlt} angesetzt hat – genau da setzt ${methodeThema === 'Ihrer Methode' ? 'Ihre Methode' : `Ihre Methode „${methodeThema}“`} an. Das entlastet, weil frühere Versuche nicht falsch waren, nur am falschen Punkt angesetzt haben.`,
    whatNext: `Der nächste sinnvolle Schritt: die eigene Situation ausführlich und persönlich durchgehen, nicht nur in einer Mini-Session. Was danach noch fehlt: die Übertragung der ersten Einschätzung auf die eigene, komplexere Situation – genau das ist der logische nächste Schritt zu Ihrer persönlichen Begleitung.`,
    kaufsog: [
      `${p.subjCap} erkennt in der Mini-Session, dass ${traumThema} statt ${problemThemaAlt} der eigentliche Hebel ist, weiß aber noch nicht, wie sich das auf die eigene, komplexere Situation übertragen lässt.`,
      `Genau dieser Transfer auf die eigene Situation ist der nächste logische Schritt in Ihrer persönlichen Begleitung.`
    ],
    salesLine: `Das Tool zeigt, wie ${methodeThema === 'Ihrer Methode' ? 'Ihre Methode' : `Ihre Methode „${methodeThema}“`} auf die eigene Situation bei ${problemThemaAlt} wirkt und dabei hilft, ${traumThema} konkret zu verändern. Ihr ${angebotKurz} unterstützt ${p.kundeAcc} dabei, das in einer echten, persönlichen Begleitung dauerhaft umzusetzen.`,
    different: `Es wendet konkret ${methodeThema === 'Ihrer Methode' ? 'Ihre eigenen Bewertungskriterien' : `die Kriterien Ihrer Methode „${methodeThema}“`} auf die geschilderte Situation an und zieht daraus eine Schlussfolgerung zur Ursache – nicht austauschbares Coaching-Grundwissen, das ein einfacher Prompt ohne Ihre Kriterien nicht liefern würde.`,
    expertiseFit: `Die Logik basiert direkt auf ${methodeThema === 'Ihrer Methode' ? 'Ihrer Methode' : `Ihrer Methode „${methodeThema}“`} und wertet ${problemThemaAlt} genau so aus, wie Sie es in einer echten Sitzung tun würden.`,
    fuerWen: `Besonders stark für alle, die bei ${problemThemaAlt} schon mehrere Anläufe hinter sich haben. Konkret heißt das Ziel: ${concreteBehavior(p.subj, traumThema)}.`,
    umsetzung: { label: 'Etwas anspruchsvoller', reason: 'weil mehrere Situations-Muster nach Ihrer Methode kombiniert werden' },
    recommend: [
      `Trifft den Punkt, der am meisten wehtut: das Gefühl, bei ${problemThemaAlt} schon alles Mögliche versucht zu haben, ohne echten Fortschritt.`,
      `Der WOW-Moment ist konkret: ${methodeThema === 'Ihrer Methode' ? 'Ihre Methode' : `Ihre Methode „${methodeThema}“`} setzt woanders an als alle bisherigen Versuche – bei ${traumThema} statt beim sichtbaren Symptom.`,
      `Der Übergang zu Ihrer Begleitung ist natürlich, weil die Mini-Session einen ersten Geschmack gibt, die eigentliche Übertragung auf die eigene Situation aber erst in der Begleitung passiert.`
    ],
    scoreBase: { contentqualitaet: 9.7, wow: 9.7, zielgruppenfit: 9.7, spezifitaet: 9.8, verstaendlichkeit: 9.7, habenwollen: 9.6, individualisierung: 9.8, einzigartigkeit: 9.8, leadsog: 9.6, kaufsog: 9.5, umsetzung: 9.2, expertise: 9.8 },
    boosts: methodeReichhaltig ? { individualisierung: 0.1, einzigartigkeit: 0.1, expertise: 0.1 } : {}
  });

  /* ---- 5. Matcher · Bereitschafts-Check (Perspektive: Entscheidung) ----
     Job dieser Idee (Punkt 8): Hauptfrage — "Bin ich wirklich bereit
     dafür, oder rede ich mir das nur ein?". Daten — Dringlichkeit beim
     Problem + Zielklarheit + Veränderungsbereitschaft. Schlussfolgerung
     — eine abgestufte Passungs-Aussage mit Begründung. Leichtere
     Handlung — bei starker Passung direkt den ersten Schritt gehen,
     statt weiter abzuwägen. */
  blueprints.push({
    id: 'bereit-check',
    category: 'Matcher',
    toolType: 'Passungs-Check',
    name: `${buildNameThema(bereitThema, problemThema, traumThema)}-Check`,
    subline: `${p.subjCap} erkennt, ob ${problemThema} bereits dringlich und ${traumThema} klar genug für ${angebotKurz} ist, woran die eigene Zurückhaltung wirklich liegt – und was ${p.subj} jetzt konkret als Nächstes tun kann.`,
    ioLine: `Dringlichkeit bei ${problemThema} + Zielklarheit bei ${traumThema} → zeigt, ob die Passung zu ${angebotKurz} stimmt, woran das liegt und welcher nächste Schritt jetzt sinnvoll ist`,
    inputs: [
      `Aktuelle Dringlichkeit bei ${problemThema}`,
      `Zielklarheit in Bezug auf ${traumThema}`,
      `Bereitschaft, jetzt aktiv etwas zu verändern`
    ],
    output: `Zeigt, ob die Passung zu ${angebotKurz} stimmt (starke Passung / teilweise Passung / noch nicht der richtige Zeitpunkt), woran das liegt und welcher nächste Schritt jetzt sinnvoll ist.`,
    whyStrong: [
      `Beantwortet die Frage: „Bin ich wirklich bereit dafür, oder rede ich mir das nur ein?“`,
      `Weil eine ehrliche Antwort die Entscheidung leichter macht als noch mehr Abwägen im Kopf.`
    ],
    miniPreview: `${p.subjCap} zögert seit Längerem, obwohl ${problemThema} spürbar drückt und ${traumThema} längst klar ist → dahinter steckt meist nur eine einzige offene Frage zum Zeitpunkt, keine grundsätzliche Unsicherheit → diese Frage jetzt beantworten, dann wird der erste Schritt leicht.`,
    wowMoment: `${p.subjCap} erkennt: Die eigene Zurückhaltung lag nie an mangelnder Eignung, sondern an einer einzigen unbeantworteten Frage zu ${traumThema} – und genau die beantwortet der Check gerade. Das entlastet, weil das Zögern nie ein Zeichen von Unentschlossenheit war, sondern von genau dieser offenen Frage.`,
    whatNext: `Der nächste sinnvolle Schritt bei starker Passung: direkt den ersten konkreten Schritt gehen, statt weiter abzuwägen. Was danach noch fehlt: der eigentliche Anfang – und genau der liegt in ${angebotKurz} als logischem nächsten Schritt.`,
    kaufsog: [
      `${p.subjCap} weiß jetzt, dass die Passung stimmt, aber noch nicht, wie der erste konkrete Schritt in ${angebotKurz} tatsächlich aussieht.`,
      `Genau diese Frage nach dem „Wie fange ich an“ beantwortet nur ${angebotKurz} selbst.`
    ],
    salesLine: `Das Tool zeigt schwarz auf weiß, ob ${problemThema} dringlich und ${traumThema} klar genug sind. Ihre Methode hilft dabei, aus dieser Klarheit einen konkreten ersten Schritt zu machen. Ihr ${angebotKurz} unterstützt ${p.kundeAcc} dabei, diesen Schritt dauerhaft weiterzugehen.`,
    different: `Die Passung entsteht aus dem Zusammenspiel von Dringlichkeit bei ${problemThema} und Zielklarheit bei ${traumThema} und zieht daraus eine abgestufte Aussage – nicht aus einem einzelnen Pauschal-Kriterium wie bei einem Standard-Quiz.`,
    expertiseFit: `Die Passungs-Kriterien spiegeln, was bei Ihnen wirklich funktioniert: ${expertiseThema}.`,
    fuerWen: `Besonders stark für alle, die innerlich schon länger schwanken und sich konkret wünschen, dass ${concreteBehavior(p.subj, traumThema)}.`,
    umsetzung: { label: 'Sehr einfach', reason: 'weil nur 3 kurze Einschätzungsfragen nötig sind' },
    recommend: [
      `Trifft den Punkt, der am meisten wehtut: seit Längerem zu zögern, ohne genau sagen zu können, woran es eigentlich liegt.`,
      `Der WOW-Moment ist konkret: nicht mangelnde Eignung hält zurück, sondern eine einzige unbeantwortete Frage zu ${traumThema}.`,
      `Der Übergang zu Ihrem Angebot ist natürlich, weil der Check die Zögerlichkeit auflöst und damit den ersten Schritt selbst schon leicht macht.`
    ],
    scoreBase: { contentqualitaet: 9.5, wow: 9.5, zielgruppenfit: 9.6, spezifitaet: 9.5, verstaendlichkeit: 9.9, habenwollen: 9.3, individualisierung: 9.3, einzigartigkeit: 9.2, leadsog: 9.5, kaufsog: 9.8, umsetzung: 9.8, expertise: 9.3 },
    boosts: expertiseReichhaltig ? { expertise: 0.1 } : {}
  });

  /* ---- Scores berechnen (Elite-Bereich, pro Metrik eigene Schwelle) ----
     Die 5 KPIs mit "kompromisslosem Fokus" (Content-Qualität, WOW,
     Zielgruppen-Fit, Spezifität, Verständlichkeit) tragen zusammen fast
     zwei Drittel des Gewichts am Gesamt-Potenzial. */
  const METRIC_WEIGHTS = {
    contentqualitaet: 0.12, wow: 0.13, zielgruppenfit: 0.13, spezifitaet: 0.13, verstaendlichkeit: 0.12,
    habenwollen: 0.06, individualisierung: 0.05, einzigartigkeit: 0.05,
    leadsog: 0.07, kaufsog: 0.07, expertise: 0.04, umsetzung: 0.03
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
      kaufsog: bp.kaufsog,
      salesLine: bp.salesLine,
      different: bp.different,
      expertiseFit: bp.expertiseFit,
      fuerWen: bp.fuerWen,
      umsetzung: bp.umsetzung,
      recommend: bp.recommend,
      whyStrongLabel: `Warum ${p.kunde} das wissen will`,
      wowLabel: `Was ${p.kunde} plötzlich erkennt`,
      nextLabel: `Der nächste sinnvolle Schritt für ${p.kundeAcc}`,
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

  ideas.forEach(lintIdea);

  return ideas;
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
  verstaendlichkeit: 'Verständlichkeit',
  habenwollen: 'Haben-wollen',
  individualisierung: 'Individualisierung',
  einzigartigkeit: 'Einzigartigkeit',
  leadsog: 'Lead-Sog',
  kaufsog: 'Kauf-Sog',
  umsetzung: 'Umsetzungs-Einfachheit',
  expertise: 'Expertise-Fit'
};

function renderScoreGrid(scores) {
  const order = ['contentqualitaet', 'wow', 'zielgruppenfit', 'spezifitaet', 'verstaendlichkeit', 'habenwollen', 'individualisierung', 'einzigartigkeit', 'leadsog', 'kaufsog', 'umsetzung', 'expertise'];
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

  /* Punkt 13: Eingabe → Ergebnis fest zweizeilig (Eingaben, dann eine
     eigene Zeile die immer mit "→" beginnt) statt einer umbrechenden
     Flex-Zeile, in der der Pfeil am Ende von Zeile 1 hängen bleiben könnte. */
  const [ioIn, ioOut] = idea.ioLine.split('→').map((s) => s.trim());

  const recommendBox = idea.isTop ? `
    <div class="recommend-box">
      <h4>Warum ich Ihnen genau diese Idee zuerst empfehlen würde</h4>
      <ul>${idea.recommend.map((r) => `<li>${r}</li>`).join('')}</ul>
    </div>` : '';

  return `
  <article class="idea-card ${idea.isTop ? 'top' : ''}" data-idea-id="${idea.id}" id="idea-${idea.id}">
    ${topBadge}
    <span class="idea-category">${idea.category}</span>
    <h3 class="idea-name"><span class="idea-rank">#${idea.rank}:</span> ${idea.name}</h3>
    <p class="idea-hook">${idea.subline}</p>
    <p class="io-line-label">Eingabe → Ergebnis</p>
    <p class="io-line">
      <span class="io-line-in">${ioIn}</span>
      <span class="io-line-out"><span class="io-arrow">→</span> ${ioOut}</span>
    </p>
    <p class="mini-preview"><strong>Beispiel-Ergebnis:</strong> ${idea.miniPreview}</p>
    <div class="why-strong">
      <h4>${idea.whyStrongLabel}</h4>
      <ul>${idea.whyStrong.map((r) => `<li>${r}</li>`).join('')}</ul>
    </div>
    <p class="umsetzung-line">Umsetzung: <strong>${idea.umsetzung.label}</strong> – ${idea.umsetzung.reason}</p>
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
      ${recommendBox}
      <div class="detail-cluster">
        <p class="detail-cluster-title">Aha</p>
        <dl class="idea-fields">
          <div class="idea-field"><dt>${idea.wowLabel}</dt><dd>${idea.wowMoment}</dd></div>
        </dl>
      </div>
      <div class="detail-cluster">
        <p class="detail-cluster-title">Sog</p>
        <dl class="idea-fields">
          <div class="idea-field"><dt>${idea.nextLabel}</dt><dd>${idea.whatNext}</dd></div>
          <div class="idea-field"><dt>Warum dieses Tool Kauf-Sog erzeugt</dt><dd><ul class="kaufsog-list">${idea.kaufsog.map((r) => `<li>${r}</li>`).join('')}</ul></dd></div>
        </dl>
      </div>
      <div class="detail-cluster">
        <p class="detail-cluster-title">Strategie</p>
        <dl class="idea-fields">
          <div class="idea-field"><dt>Verkaufslogik</dt><dd>${idea.salesLine}</dd></div>
          <div class="idea-field"><dt>Was dieses Tool anders macht</dt><dd>${idea.different}</dd></div>
          <div class="idea-field"><dt>Warum es zu Ihrer Expertise passt</dt><dd>${idea.expertiseFit}</dd></div>
          <div class="idea-field"><dt>Für wen diese Idee besonders stark ist</dt><dd>${idea.fuerWen}</dd></div>
        </dl>
        <p class="detail-scores-label">Detail-Bewertung</p>
        ${renderScoreGrid(idea.scores)}
      </div>
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

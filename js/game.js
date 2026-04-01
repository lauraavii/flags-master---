let COUNTRIES = [];
let paises = [];
let actual = 0;
let vidas = 3;

let tiempo = 60;
let puntos = 0;
let intervaloTiempo = null;

const SESSION_KEYS = {
  mode: "mode",
  type: "type",
  value: "value",
  currentStats: "flagsGame.currentStats",
  history: "flagsGame.history",
};

const HISTORY_LIMIT = 30;

let mode = getPreference(SESSION_KEYS.mode) || "countryToFlag";
let currentType = getPreference(SESSION_KEYS.type);
let currentValue = getPreference(SESSION_KEYS.value);
let currentRoundToken = 0;

let opciones6 = [];
let opciones6Total = 0;

let scoreState = null;
let scoreClosed = false;

const VALID_MODES = new Set([
  "countryToFlag",
  "flagToCountry4",
  "flagToCountry",
  "dragDrop",
  "countryToFlag6",
  "mode1minuto",
  "mode1minutoBanderas",
  "mapMode",
  "infoTable",
  "dailyChallenge",
]);

const MODE_LABELS = {
  countryToFlag: "País a 4 banderas",
  flagToCountry4: "Bandera a 4 países",
  flagToCountry: "Bandera a escribir país",
  dragDrop: "Arrastrar bandera a país",
  countryToFlag6: "Cascada de 6 banderas",
  mode1minuto: "1 minuto de países",
  mode1minutoBanderas: "1 minuto de banderas",
  mapMode: "Mapas",
  infoTable: "Tabla informativa",
  dailyChallenge: "Reto Diario",
};

const SCORING_RULES = {
  countryToFlag: { correct: 10, wrong: 4 },
  flagToCountry4: { correct: 12, wrong: 5 },
  flagToCountry: { correct: 15, wrong: 6 },
  dragDrop: { correct: 11, wrong: 5 },
  countryToFlag6: { correct: 13, wrong: 6 },
  mode1minuto: { correct: 8, wrong: 3 },
  mode1minutoBanderas: { correct: 8, wrong: 3 },
  mapMode: { correct: 18, wrong: 7 },
  dailyChallenge: { correct: 14, wrong: 5 },
  default: { correct: 10, wrong: 5 },
};

const TIMED_MODES = new Set(["mode1minuto", "mode1minutoBanderas"]);
const DAILY_QUESTIONS = 20;
let dailyQuestionTypes = [];
const MAP_ENABLED_CONTINENTS = new Set(["europa", "africa", "asia", "oceania", "america del norte", "america del sur",]);

const CONTINENT_ALIASES = {
  europa: "Europa",
  asia: "Asia",
  africa: "Africa",
  "africa del norte": "Africa",
  america: "America del Norte",
  "america del norte": "America del Norte",
  "america del sur": "America del Sur",
  oceania: "Oceania",
};

const isSubFolderGame = window.location.pathname.includes("/juego/");
const basePrefix = isSubFolderGame ? ".." : ".";
const flagsBasePath = `${basePrefix}/assets/flags`;
const mapsBasePath = `${basePrefix}/assets/maps`;
const assetUrlCache = new Map();
const mapAvailabilityCache = new Map();
const imageLoadPromiseCache = new Map();

function getEl(id) {
  return document.getElementById(id);
}

function safeGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch (_err) {
    return null;
  }
}

function safeSet(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch (_err) {
    // no-op
  }
}

function safeRemove(storage, key) {
  try {
    storage.removeItem(key);
  } catch (_err) {
    // no-op
  }
}

function getPreference(key) {
  return safeGet(sessionStorage, key) ?? safeGet(localStorage, key);
}

function setPreference(key, value) {
  safeSet(sessionStorage, key, value);
}

function removePreference(key) {
  safeRemove(sessionStorage, key);
}

function readSessionJSON(key, fallback) {
  const raw = safeGet(sessionStorage, key);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (_err) {
    return fallback;
  }
}

function writeSessionJSON(key, value) {
  safeSet(sessionStorage, key, JSON.stringify(value));
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function canonicalContinent(continent) {
  const key = normalizeText(continent);
  return CONTINENT_ALIASES[key] || continent;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) & 0xffffffff;
  }
  return h >>> 0;
}

function createSeededRng(seed) {
  let s = seed === 0 ? 1 : seed;
  return function () {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967295;
  };
}

function seededShuffle(arr, rng) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getDailyDateKey() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function buildDailyChallenge(allCountries) {
  const dateKey = getDailyDateKey();
  const rng = createSeededRng(hashString(dateKey));
  const selected = seededShuffle(allCountries, rng).slice(0, Math.min(DAILY_QUESTIONS, allCountries.length));
  const rng2 = createSeededRng(hashString(dateKey + ":types"));
  dailyQuestionTypes = selected.map(() => (rng2() < 0.55 ? "countryToFlag" : "flagToCountry4"));
  return selected;
}

function getDailyStorageKey() {
  return `dailyChallenge.${getDailyDateKey()}`;
}

function saveDailyCompletion(score, accuracy) {
  try {
    localStorage.setItem(getDailyStorageKey(), JSON.stringify({ score, accuracy, at: new Date().toISOString() }));
  } catch (_e) {
    // no-op
  }
}

function getTodaysDailyResult() {
  try {
    const raw = localStorage.getItem(getDailyStorageKey());
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
}

function updateDailyBadge() {
  const badge = getEl("daily-badge");
  if (!badge) return;
  const result = getTodaysDailyResult();
  badge.textContent = result ? `Completado · ${result.score} pts` : "";
  badge.style.display = result ? "block" : "none";
}

function toggleDisplay(id, visible, defaultDisplay = "block") {
  const el = getEl(id);
  if (!el) return;
  el.style.display = visible ? defaultDisplay : "none";
}

function setText(id, text) {
  const el = getEl(id);
  if (!el) return;
  el.textContent = text;
}

function setAnswerHelper(text) {
  const helper = getEl("answer-helper");
  if (!helper) return;
  helper.textContent = text;
}

function setFlagsLayout(layout = "default") {
  const flagsDiv = getEl("flags");
  if (!flagsDiv) return;
  flagsDiv.dataset.layout = layout;
}

function setGameState(state) {
  if (!document.body) return;
  document.body.dataset.gameState = state;
}

function clearVisualStage() {
  const visualStage = getEl("visual-stage");
  if (visualStage) visualStage.innerHTML = "";
}

function renderVisualImage(src, alt, className = "") {
  const visualStage = getEl("visual-stage");
  if (!visualStage) return null;

  visualStage.innerHTML = "";
  if (!src) return null;

  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.decoding = "async";
  img.loading = "eager";
  img.referrerPolicy = "no-referrer";
  if (className) img.className = className;
  visualStage.appendChild(img);
  return img;
}

function resolveAssetUrl(path) {
  if (!path) return "";

  const normalized = String(path).replace(/\\/g, "/");
  if (/^(https?:|data:|blob:)/i.test(normalized)) return normalized;
  if (assetUrlCache.has(normalized)) return assetUrlCache.get(normalized);

  let resolved = normalized;
  if (normalized.startsWith("/")) {
    const trimmed = normalized.replace(/^\/+/, "");
    const isGamePage = window.location.pathname.includes("/juego/");
    resolved = isGamePage ? `../${trimmed}` : `./${trimmed}`;
  }

  assetUrlCache.set(normalized, resolved);
  return resolved;
}

function loadImageProbe(src) {
  if (!src) return Promise.resolve(false);
  if (imageLoadPromiseCache.has(src)) return imageLoadPromiseCache.get(src);

  const promise = new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });

  imageLoadPromiseCache.set(src, promise);
  return promise;
}

function showMessage(message) {
  const flagsDiv = getEl("flags");
  const paisH2 = getEl("pais");
  if (flagsDiv) flagsDiv.innerHTML = "";
  setFlagsLayout("default");
  setAnswerHelper("Cambia el filtro o reinicia la partida para seguir.");
  clearVisualStage();
  if (paisH2) paisH2.textContent = message;
}

function normalizeMode(rawMode) {
  const aliases = {
    flagOptions: "flagToCountry4",
  };
  const normalized = aliases[rawMode] || rawMode;
  return VALID_MODES.has(normalized) ? normalized : "countryToFlag";
}

function isTimedMode() {
  return TIMED_MODES.has(mode);
}

function isMapMode() {
  return mode === "mapMode";
}

function resetTimerState() {
  clearInterval(intervaloTiempo);
  intervaloTiempo = null;
  tiempo = 60;
  puntos = 0;
}

function resetGameState() {
  actual = 0;
  vidas = 3;
  opciones6 = [];
  opciones6Total = 0;
  resetTimerState();
}

function formatFilterLabel(type, value) {
  if (!type) return "Sin filtro";
  if (type === "level") return `Nivel ${value}`;
  if (type === "continent") return String(value);
  return `${type}: ${value}`;
}

function updateGameLayoutState() {
  if (document.body) {
    document.body.dataset.gameMode = mode;
  }
}

function updateGameContext() {
  setText("current-mode", MODE_LABELS[mode] || mode);
  setText("current-filter", formatFilterLabel(currentType, currentValue));
}

function updateStatusPanels() {
  const timed = isTimedMode();
  toggleDisplay("lives-panel", !timed, "flex");
  toggleDisplay("timer-panel", timed, "flex");
}

function getSessionHistory() {
  const history = readSessionJSON(SESSION_KEYS.history, []);
  return Array.isArray(history) ? history : [];
}

function persistSessionHistory(history) {
  writeSessionJSON(SESSION_KEYS.history, history.slice(0, HISTORY_LIMIT));
}

function getSessionBestScore() {
  const history = getSessionHistory();
  const historyBest = history.reduce((best, item) => Math.max(best, Number(item.score) || 0), 0);
  const current = scoreState ? scoreState.score : 0;
  return Math.max(historyBest, current);
}

function updateDerivedScoreStats() {
  if (!scoreState) return;
  scoreState.answered = scoreState.correct + scoreState.wrong;
  scoreState.accuracy = scoreState.answered > 0
    ? Math.round((scoreState.correct / scoreState.answered) * 100)
    : 0;
}

function persistCurrentScoreState() {
  if (!scoreState) return;
  updateDerivedScoreStats();
  writeSessionJSON(SESSION_KEYS.currentStats, scoreState);
}

function updateScoreboard() {
  if (!scoreState) return;
  const bestScore = getSessionBestScore();
  setText("stat-score", String(scoreState.score));
  setText("stat-correct", String(scoreState.correct));
  setText("stat-wrong", String(scoreState.wrong));
  setText("stat-accuracy", `${scoreState.accuracy}%`);
  setText("stat-streak", `${scoreState.streak}/${scoreState.bestStreak}`);
  setText("stat-best", String(bestScore));
}

function updateSessionSummary() {
  const summaryEl = getEl("session-summary");
  if (!summaryEl) return;

  const history = getSessionHistory();
  if (history.length === 0) {
    summaryEl.textContent = "Sesión actual: sin partidas terminadas.";
    return;
  }

  const last = history[0];
  const best = history.reduce((acc, item) => (item.score > acc.score ? item : acc), history[0]);
  summaryEl.textContent = `Última: ${last.modeLabel}, ${last.score} pts y ${last.accuracy}% de precisión. Mejor sesión: ${best.score} pts en ${best.modeLabel}.`;
}

function initializeScoreState() {
  scoreClosed = false;
  scoreState = {
    mode,
    modeLabel: MODE_LABELS[mode] || mode,
    filterType: currentType || null,
    filterValue: currentValue || null,
    filterLabel: formatFilterLabel(currentType, currentValue),
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationSec: 0,
    status: "playing",
    totalTargets: isTimedMode() ? null : paises.length,
    score: 0,
    correct: 0,
    wrong: 0,
    answered: 0,
    accuracy: 0,
    streak: 0,
    bestStreak: 0,
    bonuses: 0,
    penalties: 0,
    lastDelta: 0,
  };

  persistCurrentScoreState();
  updateScoreboard();
  updateSessionSummary();
}

function registerAnswer(isCorrect, scoringMode = mode) {
  if (!scoreState) return;

  const rules = SCORING_RULES[scoringMode] || SCORING_RULES.default;
  let delta = 0;

  if (isCorrect) {
    scoreState.correct += 1;
    scoreState.streak += 1;
    scoreState.bestStreak = Math.max(scoreState.bestStreak, scoreState.streak);

    const streakBonus = Math.floor(scoreState.streak / 3);
    delta = rules.correct + streakBonus;
    scoreState.bonuses += streakBonus;
  } else {
    scoreState.wrong += 1;
    scoreState.streak = 0;
    delta = -rules.wrong;
    scoreState.penalties += rules.wrong;
  }

  scoreState.score = Math.max(0, scoreState.score + delta);
  scoreState.lastDelta = delta;

  persistCurrentScoreState();
  updateScoreboard();
}

function addScoreBonus(points) {
  if (!scoreState || points <= 0) return;

  scoreState.score += points;
  scoreState.bonuses += points;
  scoreState.lastDelta = points;

  persistCurrentScoreState();
  updateScoreboard();
}

function finalizeScore(status) {
  if (!scoreState || scoreClosed) return;

  scoreClosed = true;
  scoreState.status = status;

  const endedAtMs = Date.now();
  const startedAtMs = Date.parse(scoreState.startedAt);
  scoreState.endedAt = new Date(endedAtMs).toISOString();
  scoreState.durationSec = Number.isFinite(startedAtMs)
    ? Math.max(0, Math.round((endedAtMs - startedAtMs) / 1000))
    : 0;

  persistCurrentScoreState();

  const history = getSessionHistory();
  history.unshift({
    mode: scoreState.mode,
    modeLabel: scoreState.modeLabel,
    filterType: scoreState.filterType,
    filterValue: scoreState.filterValue,
    filterLabel: scoreState.filterLabel,
    score: scoreState.score,
    correct: scoreState.correct,
    wrong: scoreState.wrong,
    accuracy: scoreState.accuracy,
    bestStreak: scoreState.bestStreak,
    durationSec: scoreState.durationSec,
    status,
    endedAt: scoreState.endedAt,
  });

  persistSessionHistory(history);
  updateScoreboard();
  updateSessionSummary();
}

function getDataPathCandidates() {
  return isSubFolderGame
    ? ["../data/countries.json", "../../data/countries.json"]
    : ["data/countries.json", "../data/countries.json"];
}

async function loadCountries() {
  if (COUNTRIES.length > 0) return true;

  // Datos inline (data.js) — funciona con file:// sin CORS
  if (Array.isArray(window.COUNTRIES_DATA) && window.COUNTRIES_DATA.length > 0) {
    COUNTRIES = [...window.COUNTRIES_DATA];
    return true;
  }

  // Fallback: fetch (solo funciona con http/https)
  for (const path of getDataPathCandidates()) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      COUNTRIES = await res.json();
      if (Array.isArray(COUNTRIES)) return true;
    } catch (_err) {
      // Intentar siguiente path
    }
  }

  showMessage("No se pudo cargar data/countries.json");
  return false;
}

async function buildFilteredCountries(type, value) {
  let filtered = [...COUNTRIES];

  if (type === "level") {
    const parsedLevel = Number.parseInt(value, 10);
    filtered = Number.isFinite(parsedLevel)
      ? filtered.filter(c => c.nivel === parsedLevel)
      : [];
} else if (type === "continent") {
  const normalizedValue = normalizeText(value);

  // 👇 SI EL USUARIO ELIGE "Norte y Central"
  if (normalizedValue === normalizeText("America del Norte y Central")) {
    filtered = filtered.filter(c =>
      normalizeText(c.continente) === normalizeText("America del Norte")
    );
  } else {
    const canonical = normalizeText(canonicalContinent(value));
    filtered = filtered.filter(c =>
      normalizeText(c.continente) === canonical
    );
  }
}


  if (isMapMode()) {
    const allowedContinents = filtered.filter(country => {
      const continent = normalizeText(canonicalContinent(country?.continente || ""));
      return MAP_ENABLED_CONTINENTS.has(continent);
    });

    const checks = await Promise.all(
      allowedContinents.map(async country => ({
        country,
        src: await getExistingMapSrc(country),
      }))
    );

    filtered = checks
      .filter(item => Boolean(item.src))
      .map(item => item.country);
  }

  return filtered;
}

function setGameOverVisible(visible) {
  toggleDisplay("game-over", visible, "grid");
  setGameState(visible ? "ended" : "playing");
}

function getFlagSrc(country) {
  return resolveAssetUrl(`${flagsBasePath}/${country.bandera}`);
}

const MAP_FOLDERS = {
  europa: "europa",
  asia: "asia",
  africa: "africa",
  "africa del norte": "africa",
  america: "america",
  "america del norte": "america",
  "america del sur": "america",
  "america central": "america",
  oceania: "oceania",
};

function normalizeName(value) {
  if (!value || typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getContinentFolder(continent) {
  const c = normalizeText(continent);

  if (c.includes("america del norte")) return "america del norte";
  if (c.includes("america del sur")) return "america del sur";

  return c;
}

function getMapBaseName(country) {
  if (!country || !country.bandera) return "";
  return normalizeName(country.bandera.replace(/\.[^.]+$/, ""));
}

function getMapCandidates(country) {
  if (!country) return [];

  const folder = getContinentFolder(country.continente);
  const rawCandidates = [
    country.mapa,
    country.map,
    country.png,
    country.mappng,
    country.mapPath,
    country.bandera ? country.bandera.replace(/\.[^.]+$/, "") : "",
    getMapBaseName(country),
    country.codigo,
    country.code,
    country.iso2,
    country.iso3,
    country.alpha2,
    country.alpha3,
    country.id,
    country.pais,
    country.country,
  ].filter(Boolean);

  const uniqueNames = [
    ...new Set(
      rawCandidates
        .map(value => String(value).trim())
        .filter(Boolean)
        .flatMap(value => {
          const withoutExtension = value.replace(/\.(svg|png|jpg|jpeg|webp)$/i, "");
          return [
            withoutExtension,
            withoutExtension.toLowerCase(),
            normalizeName(withoutExtension),
          ];
        })
        .filter(Boolean)
    ),
  ];

  return uniqueNames.map(name => resolveAssetUrl(`${mapsBasePath}/${folder}/${name}.png`));
}

function getMapSrc(country) {
  const candidates = getMapCandidates(country);
  return candidates[0] || null;
}

async function getExistingMapSrc(country) {
  const candidates = getMapCandidates(country);
  if (candidates.length === 0) return null;

  const cacheKey = `${country?.pais || "unknown"}::${candidates.join("|")}`;
  if (mapAvailabilityCache.has(cacheKey)) {
    return mapAvailabilityCache.get(cacheKey);
  }

  for (const candidate of candidates) {
    const exists = await loadImageProbe(candidate);
    if (exists) {
      mapAvailabilityCache.set(cacheKey, candidate);
      return candidate;
    }
  }

  mapAvailabilityCache.set(cacheKey, null);
  return null;
}

async function renderMapMode(correcto) {
  const flagsDiv = getEl("flags");
  const paisH2 = getEl("pais");

  if (!flagsDiv || !paisH2 || !correcto) return;

  setFlagsLayout("map-grid");

  paisH2.textContent = "¿Qué país es este mapa?";
  setAnswerHelper("Mira el mapa y elige la bandera correcta.");

  const tokenAtStart = currentRoundToken;

  // 🔥 AQUÍ CAMBIO IMPORTANTE (PNG en vez de SVG)
  const src = getMapSrc(correcto); // ahora debe apuntar a .png

  if (tokenAtStart !== currentRoundToken) return;

  if (!src) {
    setText("pais", "Mapa no disponible");
    return;
  }

  // Mostrar el mapa
  renderVisualImage(src, `Mapa de ${correcto.pais}`, "visual-map");

  // Opciones
  const opciones = getMultipleChoiceOptions(correcto, 4);

  flagsDiv.innerHTML = "";

  opciones.forEach(p => {
    const img = document.createElement("img");
    img.src = getFlagSrc(p);
    img.alt = `Bandera de ${p.pais}`;

    img.onclick = () => {
      const isCorrect = p === correcto;

      if (isCorrect) actual++;
      else vidas--;

      registerAnswer(isCorrect, "mapMode");
      updateLives();
      void showRound();
    };

    flagsDiv.appendChild(img);
  });
}

function updateGameOverPanel(status) {
  const isDaily = mode === "dailyChallenge";
  const states = {
    game_over: {
      kicker: "Sin vidas",
      title: "Te has quedado sin vidas",
      copy: "La ronda termina aquí, pero puedes reiniciarla al instante o bajar a los controles para cambiar el enfoque.",
    },
    completado: {
      kicker: isDaily ? "Reto del día completado" : "Ronda completada",
      title: isDaily ? "Lo has conseguido" : "Has completado toda la ronda",
      copy: isDaily
        ? "Has terminado el reto de hoy. Vuelve mañana para un nuevo desafio."
        : "Buen cierre. Puedes repetir la misma configuración o usar el panel lateral para apretar un poco más la dificultad.",
    },
    tiempo_finalizado: {
      kicker: "Tiempo agotado",
      title: "Se acabó el tiempo",
      copy: "La sesión queda guardada. Decide si quieres volver a intentar el mismo minuto o cambiar a otro modo.",
    },
    sin_datos: {
      kicker: "Sin datos",
      title: "No hay países para esta combinación",
      copy: "Ese filtro no tiene contenido útil en este modo. Cambia el filtro o vuelve al selector.",
    },
  };

  const config = states[status] || {
    kicker: "Fin",
    title: "Fin de la partida",
    copy: "Puedes reiniciar o cambiar el modo cuando quieras.",
  };

  const answered = scoreState ? scoreState.correct + scoreState.wrong : 0;
  let summary = `Has respondido ${answered} preguntas en ${MODE_LABELS[mode] || mode}.`;

  if (status === "game_over") {
    summary = `Te has quedado sin vidas con ${scoreState?.score ?? 0} puntos y ${scoreState?.accuracy ?? 0}% de precisión.`;
  } else if (status === "completado") {
    if (mode === "dailyChallenge") {
      summary = `Reto del día completado con ${scoreState?.score ?? 0} puntos y ${scoreState?.accuracy ?? 0}% de precisión. Vuelve mañana.`;
      saveDailyCompletion(scoreState?.score ?? 0, scoreState?.accuracy ?? 0);
      updateDailyBadge();
    } else {
      summary = `Has completado ${answered} preguntas con ${scoreState?.score ?? 0} puntos y una mejor racha de ${scoreState?.bestStreak ?? 0}.`;
    }
  } else if (status === "tiempo_finalizado") {
    summary = `Has cerrado el cronómetro con ${puntos} aciertos visuales y ${scoreState?.score ?? 0} puntos totales.`;
  } else if (status === "sin_datos") {
    summary = "Prueba con otra región, otro nivel o vuelve al selector de modos.";
  }

  setText("game-over-kicker", config.kicker);
  setText("game-over-title", config.title);
  setText("game-over-copy", config.copy);
  setText("game-over-mode", `Modo: ${MODE_LABELS[mode] || mode}`);
  setText("game-over-filter", `Filtro: ${formatFilterLabel(currentType, currentValue)}`);
  setText("game-over-score", String(scoreState?.score ?? 0));
  setText("game-over-accuracy", `${scoreState?.accuracy ?? 0}%`);
  setText("game-over-correct", String(scoreState?.correct ?? 0));
  setText("game-over-streak", String(scoreState?.bestStreak ?? 0));
  setText("game-over-summary", summary);
}

function clampLives() {
  vidas = Math.max(0, vidas);
}

function updateLives() {
  clampLives();
  const vidasEl = getEl("vidas");
  if (!vidasEl) return;
  vidasEl.textContent = vidas > 0 ? "❤".repeat(vidas) : "Sin vidas";
}

function updateTimerText() {
  const timerDiv = getEl("timer");
  if (!timerDiv) return;
  timerDiv.textContent = `${Math.max(0, tiempo)} s | ${puntos} aciertos`;
}

function advanceOrLose(isCorrect, scoringMode = mode) {
  registerAnswer(isCorrect, scoringMode);

  if (isCorrect) {
    actual++;
  } else {
    vidas--;
  }

  updateLives();
  void showRound();
}

function getMultipleChoiceOptions(correcto, totalOptions = 4) {
  const distractors = shuffle(paises.filter(p => p !== correcto)).slice(0, Math.max(0, totalOptions - 1));
  return shuffle([correcto, ...distractors]);
}

function clearMainContainers() {
  const flagsDiv = getEl("flags");
  const paisH2 = getEl("pais");
  if (flagsDiv) flagsDiv.innerHTML = "";
  setFlagsLayout("default");
  setAnswerHelper("Elige la opción correcta para seguir avanzando.");
  clearVisualStage();
  if (paisH2) paisH2.textContent = "";
  if (mode !== "dailyChallenge") delete document.body.dataset.dailyQtype;
}

function isFinished() {
  if (isTimedMode()) return false;
  if (mode === "countryToFlag6" && opciones6.length > 0) return false;
  return actual >= paises.length;
}

async function startGame(type = currentType, value = currentValue) {
  mode = normalizeMode(getPreference(SESSION_KEYS.mode) || mode);
  setPreference(SESSION_KEYS.mode, mode);

  currentType = type;
  currentValue = value;

  if (currentType) {
    setPreference(SESSION_KEYS.type, currentType);
    setPreference(SESSION_KEYS.value, String(currentValue ?? ""));
  } else {
    removePreference(SESSION_KEYS.type);
    removePreference(SESSION_KEYS.value);
  }

  updateGameLayoutState();
  updateGameContext();
  updateStatusPanels();

  const loaded = await loadCountries();
  if (!loaded) return;

  resetGameState();
  clearMainContainers();
  setGameOverVisible(false);
  setText("timer", "");
  updateStatusPanels();

  if (mode === "dailyChallenge") {
    paises = buildDailyChallenge(COUNTRIES);
  } else {
    paises = shuffle(await buildFilteredCountries(currentType, currentValue));
  }

  initializeScoreState();
  updateLives();
  updateDailyBadge();

  if (paises.length === 0) {
    showMessage("No hay países disponibles con este filtro.");
    finalizeScore("sin_datos");
    updateGameOverPanel("sin_datos");
    setGameOverVisible(true);
    return;
  }

  if (mode === "infoTable") {
    showInfoTable(paises);
  } else {
    void showRound();
  }
}

async function showRound() {
  currentRoundToken++;
  clearMainContainers();
  setGameOverVisible(false);

  if (vidas <= 0) {
    finalizeScore("game_over");
    updateGameOverPanel("game_over");
    setGameOverVisible(true);
    return;
  }

  if (paises.length === 0) {
    showMessage("No hay países disponibles con este filtro.");
    return;
  }

  if (isFinished()) {
    finalizeScore("completado");
    updateGameOverPanel("completado");
    setGameOverVisible(true);
    return;
  }

  if (mode === "countryToFlag6") {
    renderCountryToFlag6();
    return;
  }

  const correcto = paises[actual];
  if (!correcto) {
    finalizeScore("completado");
    updateGameOverPanel("completado");
    setGameOverVisible(true);
    return;
  }

  switch (mode) {
    case "countryToFlag":
      renderCountryToFlag(correcto);
      break;
    case "flagToCountry4":
      renderFlagToCountry4(correcto);
      break;
    case "flagToCountry":
      renderFlagToCountry(correcto);
      break;
    case "dragDrop":
      renderDragDrop();
      break;
    case "mode1minuto":
      iniciarModo1Minuto();
      break;
    case "mode1minutoBanderas":
      iniciarModo1MinutoBanderas();
      break;
    case "mapMode":
      await renderMapMode(correcto);
      break;
    case "dailyChallenge":
      renderDailyChallenge(correcto);
      break;
    default:
      mode = "countryToFlag";
      setPreference(SESSION_KEYS.mode, mode);
      updateGameLayoutState();
      updateGameContext();
      renderCountryToFlag(correcto);
  }
}

function renderCountryToFlag(correcto) {
  const flagsDiv = getEl("flags");
  if (!flagsDiv) return;

  setFlagsLayout("image-grid");
  setAnswerHelper("Toca la bandera que corresponde al país.");
  setText("pais", correcto.pais);

  const opciones = getMultipleChoiceOptions(correcto, 4);
  opciones.forEach(p => {
    const img = document.createElement("img");
    img.src = getFlagSrc(p);
    img.alt = `Bandera de ${p.pais}`;
    img.onclick = () => checkAnswer(p.pais, "countryToFlag");
    flagsDiv.appendChild(img);
  });
}

function renderFlagToCountry4(correcto) {
  const flagsDiv = getEl("flags");
  if (!flagsDiv) return;

  setFlagsLayout("button-grid");
  setAnswerHelper("Lee la bandera y elige el nombre correcto.");
  setText("pais", "Selecciona el país correcto");
  renderVisualImage(getFlagSrc(correcto), `Bandera de ${correcto.pais}`);

  const opciones = getMultipleChoiceOptions(correcto, 4);
  opciones.forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = p.pais;
    btn.onclick = () => checkAnswer(p.pais, "flagToCountry4");
    flagsDiv.appendChild(btn);
  });
}

function renderFlagToCountry(correcto) {
  const flagsDiv = getEl("flags");
  if (!flagsDiv) return;

  setFlagsLayout("form");
  setAnswerHelper("Escribe el nombre del país y confirma.");
  setText("pais", "Escribe el país de la bandera");
  renderVisualImage(getFlagSrc(correcto), `Bandera de ${correcto.pais}`);

  const input = document.createElement("input");
  input.placeholder = "Escribe el país";
  flagsDiv.appendChild(input);

  const btn = document.createElement("button");
  btn.textContent = "Comprobar";
  btn.onclick = () => checkAnswer(input.value, "flagToCountry");
  flagsDiv.appendChild(btn);

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") checkAnswer(input.value, "flagToCountry");
  });
}

function renderDragDrop() {
  const flagsDiv = getEl("flags");
  if (!flagsDiv) return;

  setFlagsLayout("drag");
  setAnswerHelper("Relaciona cada bandera con su país antes de quedarte sin vidas.");
  setText("pais", "Arrastra cada bandera a su país");

  const opciones = paises.slice(actual, actual + 4);
  if (opciones.length === 0) {
    void showRound();
    return;
  }

  const container = document.createElement("div");
  container.className = "drag-layout";

  const namesCol = document.createElement("div");
  const flagsCol = document.createElement("div");
  namesCol.className = "drag-column drag-column-targets";
  flagsCol.className = "drag-column drag-column-flags";

  let correctPlaced = 0;

  const withDragIds = shuffle(
    opciones.map((paisItem, index) => ({
      paisItem,
      dragId: `flag-${actual}-${index}-${normalizeText(paisItem.pais).replace(/\s+/g, "-")}`,
    }))
  );

  opciones.forEach(p => {
    const expected = withDragIds.find(item => item.paisItem === p);

    const drop = document.createElement("div");
    drop.className = "drop-zone";
    drop.textContent = p.pais;
    drop.dataset.expectedId = expected.dragId;

    drop.ondragover = event => event.preventDefault();
    drop.ondrop = event => {
      event.preventDefault();
      const banderaId = event.dataTransfer.getData("drag-id");

      if (banderaId === drop.dataset.expectedId) {
        const dragged = getEl(banderaId);
        if (!dragged) return;

        drop.classList.add("drop-zone-correct");
        drop.appendChild(dragged);
        drop.ondrop = null;
        correctPlaced++;

        registerAnswer(true, "dragDrop");

        if (correctPlaced === opciones.length) {
          actual += opciones.length;
          void showRound();
        }
      } else {
        vidas--;
        registerAnswer(false, "dragDrop");
        updateLives();
        if (vidas <= 0) void showRound();
      }
    };

    namesCol.appendChild(drop);
  });

  withDragIds.forEach(({ paisItem, dragId }) => {
    const img = document.createElement("img");
    img.src = getFlagSrc(paisItem);
    img.alt = `Bandera de ${paisItem.pais}`;
    img.id = dragId;
    img.className = "draggable-flag";
    img.draggable = true;
    img.ondragstart = event => event.dataTransfer.setData("drag-id", dragId);
    flagsCol.appendChild(img);
  });

  container.appendChild(namesCol);
  container.appendChild(flagsCol);
  flagsDiv.appendChild(container);
}

function checkAnswer(respuesta, scoringMode = mode) {
  const correcto = paises[actual];
  if (!correcto) {
    void showRound();
    return;
  }

  const isCorrect = normalizeText(respuesta) === normalizeText(correcto.pais);
  advanceOrLose(isCorrect, scoringMode);
}

function startTimedMode() {
  updateStatusPanels();
  updateTimerText();

  if (intervaloTiempo) return;

  intervaloTiempo = setInterval(() => {
    tiempo--;
    updateTimerText();

    if (tiempo <= 0) {
      finishTimedMode();
    }
  }, 1000);
}

function finishTimedMode() {
  clearInterval(intervaloTiempo);
  intervaloTiempo = null;

  const bonusTiempo = Math.floor(Math.max(0, tiempo) / 5);
  if (!scoreClosed && bonusTiempo > 0) {
    addScoreBonus(bonusTiempo);
  }

  finalizeScore("tiempo_finalizado");
  clearVisualStage();

  const flagsDiv = getEl("flags");
  if (flagsDiv) flagsDiv.innerHTML = "";
  setFlagsLayout("default");
  updateGameOverPanel("tiempo_finalizado");
  setGameOverVisible(true);
  updateTimerText();
}

function getTimedOptions() {
  return shuffle(paises).slice(0, Math.min(4, paises.length));
}

function iniciarModo1Minuto() {
  if (paises.length === 0) {
    showMessage("No hay paises disponibles para este modo.");
    return;
  }

  setAnswerHelper("Acumula aciertos antes de que se agote el tiempo.");
  setText("pais", "¿Qué país es esta bandera?");
  startTimedMode();
  nuevaPregunta1Minuto();
}

function nuevaPregunta1Minuto() {
  if (tiempo <= 0) return;

  const flagsDiv = getEl("flags");
  if (!flagsDiv) return;
  flagsDiv.innerHTML = "";
  setFlagsLayout("timed-buttons");

  const opciones = getTimedOptions();
  if (opciones.length === 0) {
    finishTimedMode();
    return;
  }

  const correcta = opciones[Math.floor(Math.random() * opciones.length)];
  renderVisualImage(getFlagSrc(correcta), `Bandera de ${correcta.pais}`);

  opciones.forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = p.pais;
    btn.onclick = () => {
      const isCorrect = p === correcta;
      if (isCorrect) {
        puntos++;
      } else {
        tiempo = Math.max(0, tiempo - 5);
      }

      registerAnswer(isCorrect, "mode1minuto");
      updateTimerText();
      nuevaPregunta1Minuto();
    };
    flagsDiv.appendChild(btn);
  });
}

function iniciarModo1MinutoBanderas() {
  if (paises.length === 0) {
    showMessage("No hay paises disponibles para este modo.");
    return;
  }

  setAnswerHelper("Encuentra la bandera correcta lo mas rapido posible.");
  setText("pais", "Selecciona la bandera correcta");
  startTimedMode();
  nuevaPregunta1MinutoBanderas();
}

function nuevaPregunta1MinutoBanderas() {
  if (tiempo <= 0) return;

  const flagsDiv = getEl("flags");
  if (!flagsDiv) return;
  flagsDiv.innerHTML = "";
  setFlagsLayout("timed-flags");
  clearVisualStage();

  const opciones = getTimedOptions();
  if (opciones.length === 0) {
    finishTimedMode();
    return;
  }

  const correcta = opciones[Math.floor(Math.random() * opciones.length)];
  setText("pais", correcta.pais);

  opciones.forEach(p => {
    const img = document.createElement("img");
    img.src = getFlagSrc(p);
    img.alt = `Bandera de ${p.pais}`;
    img.onclick = () => {
      const isCorrect = p === correcta;
      if (isCorrect) {
        puntos++;
      } else {
        tiempo = Math.max(0, tiempo - 5);
      }

      registerAnswer(isCorrect, "mode1minutoBanderas");
      updateTimerText();
      nuevaPregunta1MinutoBanderas();
    };
    flagsDiv.appendChild(img);
  });
}

function renderCountryToFlag6() {
  const flagsDiv = getEl("flags");
  if (!flagsDiv) return;

  setFlagsLayout("cascade-grid");
  setAnswerHelper("Limpia la tanda completa para quedarte con el bonus de ronda.");
  if (opciones6.length === 0) {
    opciones6 = paises.slice(actual, actual + 6);
    opciones6Total = opciones6.length;
  }

  if (opciones6.length === 0) {
    void showRound();
    return;
  }

  const correcto = opciones6[Math.floor(Math.random() * opciones6.length)];
  setAnswerHelper(`Pulsa la bandera correcta. Quedan ${opciones6.length} en esta tanda.`);
  setText("pais", correcto.pais);

  opciones6.forEach(p => {
    const img = document.createElement("img");
    img.src = getFlagSrc(p);
    img.alt = `Bandera de ${p.pais}`;

    img.onclick = () => {
      const isCorrect = p === correcto;
      registerAnswer(isCorrect, "countryToFlag6");

      if (isCorrect) {
        opciones6 = opciones6.filter(x => x !== p);
        if (opciones6.length === 0) {
          actual += opciones6Total;
          addScoreBonus(10);
          opciones6Total = 0;
        }
      } else {
        vidas--;
      }

      updateLives();
      void showRound();
    };

    flagsDiv.appendChild(img);
  });
}

function renderDailyChallenge(correcto) {
  const flagsDiv = getEl("flags");
  if (!flagsDiv || !correcto) return;

  const total = paises.length;
  const qType = dailyQuestionTypes[actual] || "countryToFlag";

  // Marca el tipo de pregunta en body para que CSS adapte el layout
  document.body.dataset.dailyQtype = qType;

  if (qType === "flagToCountry4") {
    setFlagsLayout("button-grid");
    setAnswerHelper(`Pregunta ${actual + 1} de ${total}  —  Lee la bandera y elige el pais correcto`);
    setText("pais", "¿Qué pais es esta bandera?");
    renderVisualImage(getFlagSrc(correcto), `Bandera de ${correcto.pais}`);

    const opciones = getMultipleChoiceOptions(correcto, 4);
    flagsDiv.innerHTML = "";
    opciones.forEach(p => {
      const btn = document.createElement("button");
      btn.textContent = p.pais;
      btn.onclick = () => checkAnswer(p.pais, "dailyChallenge");
      flagsDiv.appendChild(btn);
    });
  } else {
    setFlagsLayout("image-grid");
    setAnswerHelper(`Pregunta ${actual + 1} de ${total}  —  Toca la bandera del pais correcto`);
    setText("pais", correcto.pais);
    clearVisualStage();

    const opciones = getMultipleChoiceOptions(correcto, 4);
    flagsDiv.innerHTML = "";
    opciones.forEach(p => {
      const img = document.createElement("img");
      img.src = getFlagSrc(p);
      img.alt = `Bandera de ${p.pais}`;
      img.onclick = () => checkAnswer(p.pais, "dailyChallenge");
      flagsDiv.appendChild(img);
    });
  }
}

function restartGame() {
  void startGame(currentType, currentValue);
}

function focusControlPanel() {
  const sidebar = getEl("game-sidebar");
  if (!sidebar) return;

  const firstDrawer = sidebar.querySelector(".side-drawer");
  if (firstDrawer) firstDrawer.open = true;

  sidebar.scrollIntoView({ behavior: "smooth", block: "start" });
}

function goHome() {
  window.location.href = isSubFolderGame ? "../index.html" : "index.html";
}

function showInfoTable(countries) {
  const flagsDiv = getEl("flags");
  const paisH2 = getEl("pais");
  if (!flagsDiv || !paisH2) return;

  paisH2.textContent = "Tabla informativa";
  setFlagsLayout("default");
  setAnswerHelper("Consulta los datos y usa los controles laterales para cambiar modo/filtro.");

  let tableHTML = `
    <table class="info-table">
      <thead>
        <tr>
          <th>País</th>
          <th>Capital</th>
          <th>Bandera</th>
        </tr>
      </thead>
      <tbody>
  `;

  const sortedCountries = [...countries].sort((a, b) => a.pais.localeCompare(b.pais));

  sortedCountries.forEach(country => {
    tableHTML += `
      <tr>
        <td>${country.pais}</td>
        <td>${country.capital}</td>
        <td><img src="${getFlagSrc(country)}" alt="Bandera de ${country.pais}"></td>
      </tr>
    `;
  });

  tableHTML += `
      </tbody>
    </table>
  `;

  flagsDiv.innerHTML = tableHTML;
}

function changeMode(nextMode) {
  mode = normalizeMode(nextMode);
  setPreference(SESSION_KEYS.mode, mode);
  updateGameLayoutState();
  updateGameContext();
  updateStatusPanels();
  void startGame(currentType, currentValue);
}

window.startGame = startGame;
window.restartGame = restartGame;
window.focusControlPanel = focusControlPanel;
window.goHome = goHome;
window.changeMode = changeMode;
window.getDailyDateKey = getDailyDateKey;

document.addEventListener("DOMContentLoaded", () => {
  void startGame();
});

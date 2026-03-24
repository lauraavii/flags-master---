let COUNTRIES = [];
let paises = [];
let actual = 0;
let vidas = 3;
let currentType = null;
let currentValue = null;

const CONTINENT_ALIASES = {
  europa: "Europa",
  asia: "Asia",
  africa: "Africa",
  "america del norte": "America del Norte",
  "america del norte y central": "America del Norte",
  "america del sur": "America del Sur",
  oceania: "Oceania",
};

const isSubFolderGame = window.location.pathname.includes("/juego/");
const basePrefix = isSubFolderGame ? ".." : ".";

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

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function loadCountries() {
  if (COUNTRIES.length > 0) return true;

  const candidates = [
    `${basePrefix}/data/countries.json`,
    "../data/countries.json",
    "./data/countries.json",
  ];

  for (const path of candidates) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      COUNTRIES = await res.json();
      if (Array.isArray(COUNTRIES)) return true;
    } catch (_err) {
      // seguir al siguiente path
    }
  }

  if (Array.isArray(window.COUNTRIES_DATA) && window.COUNTRIES_DATA.length > 0) {
    COUNTRIES = [...window.COUNTRIES_DATA];
    return true;
  }

  const paisH2 = document.getElementById("pais");
  if (paisH2) paisH2.textContent = "No se pudo cargar data/countries.json";
  return false;
}

function updateLives() {
  const livesEl = document.getElementById("vidas");
  if (!livesEl) return;
  livesEl.textContent = "Vidas: " + "❤️".repeat(Math.max(0, vidas));
}

function showMessage(message) {
  const flagsDiv = document.getElementById("flags");
  const paisH2 = document.getElementById("pais");
  if (flagsDiv) flagsDiv.innerHTML = "";
  if (paisH2) paisH2.textContent = message;
}

async function startGame(type = currentType, value = currentValue) {
  const loaded = await loadCountries();
  if (!loaded) return;

  currentType = type;
  currentValue = value;

  if (type === "level") {
    const parsedLevel = Number.parseInt(value, 10);
    paises = Number.isFinite(parsedLevel)
      ? COUNTRIES.filter(c => c.nivel === parsedLevel)
      : [];
  } else if (type === "continent") {
    const canonical = normalizeText(canonicalContinent(value));
    paises = COUNTRIES.filter(c => normalizeText(c.continente) === canonical);
  } else {
    paises = [...COUNTRIES];
  }

  paises = shuffle(paises);
  actual = 0;
  vidas = 3;

  updateLives();

  if (paises.length === 0) {
    showMessage("No hay países disponibles con este filtro.");
    return;
  }

  showRound();
}

function showRound() {
  const flagsDiv = document.getElementById("flags");
  const paisH2 = document.getElementById("pais");
  const gameOver = document.getElementById("game-over");

  if (flagsDiv) flagsDiv.innerHTML = "";
  if (paisH2) paisH2.textContent = "";

  if (vidas <= 0) {
    if (gameOver) gameOver.style.display = "block";
    return;
  }

  if (gameOver) gameOver.style.display = "none";

  if (actual >= paises.length) {
    if (paisH2) paisH2.textContent = "🎉 ¡Has completado el juego!";
    return;
  }

  const correcto = paises[actual];
  if (!correcto) {
    if (paisH2) paisH2.textContent = "🎉 ¡Has completado el juego!";
    return;
  }

  if (paisH2) paisH2.textContent = "Escribe el país de la bandera (con ayuda)";
  renderFlagToCountryHelp(correcto);
}

function renderFlagToCountryHelp(correcto) {
  const flagsDiv = document.getElementById("flags");
  if (!flagsDiv) return;

  const img = document.createElement("img");
  img.src = `${basePrefix}/assets/flags/${correcto.bandera}`;
  img.alt = correcto.pais;
  img.style.width = "120px";
  img.style.display = "block";
  img.style.margin = "0 auto 10px";
  flagsDiv.appendChild(img);

  const input = document.createElement("input");
  input.placeholder = "Escribe el país";
  input.style.display = "block";
  input.style.margin = "0 auto 10px";
  input.style.padding = "5px";
  input.style.fontSize = "16px";
  flagsDiv.appendChild(input);

  const btn = document.createElement("button");
  btn.textContent = "Comprobar";
  btn.style.margin = "5px";
  btn.onclick = () => checkAnswerHelp(input.value.trim(), correcto.pais);
  flagsDiv.appendChild(btn);

  input.addEventListener("input", () => {
    const typed = normalizeText(input.value);
    const expected = normalizeText(correcto.pais);
    input.style.borderColor = typed.length > 0 && !expected.startsWith(typed) ? "red" : "";
  });

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") checkAnswerHelp(input.value.trim(), correcto.pais);
  });
}

function checkAnswerHelp(respuesta, correcto) {
  if (normalizeText(respuesta) === normalizeText(correcto)) {
    actual++;
  } else {
    vidas--;
  }

  updateLives();
  showRound();
}

function restartGame() {
  startGame(currentType, currentValue);
}

function goHome() {
  window.location.href = isSubFolderGame ? "modos.html" : "juego/modos.html";
}

window.startGame = startGame;
window.restartGame = restartGame;
window.goHome = goHome;

startGame();

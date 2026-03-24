function safeSetSessionValue(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch (_err) {
    // No hacemos nada si sessionStorage falla
  }
}

function safeRemoveSessionValue(key) {
  try {
    sessionStorage.removeItem(key);
  } catch (_err) {
    // No hacemos nada si sessionStorage falla
  }
}

function goToModesPage() {
  const currentPath = window.location.pathname.replace(/\\/g, "/");
  const isAtRoot =
    currentPath.endsWith("/index.html") ||
    !currentPath.includes("/juego/");

  window.location.href = isAtRoot ? "juego/modos.html" : "modos.html";
}

function setFilter(type, value) {
  if (!type) {
    safeRemoveSessionValue("type");
    safeRemoveSessionValue("value");
  } else {
    safeSetSessionValue("type", String(type));
    safeSetSessionValue("value", String(value));
  }

  goToModesPage();
}

function startByLevel(level) {
  setFilter("level", String(level));
}

function startByContinent(continent) {
  setFilter("continent", continent);
}

function startAll() {
  setFilter(null, null);
}

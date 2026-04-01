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

function setFilter(type, value) {
  if (!type) {
    safeRemoveSessionValue("type");
    safeRemoveSessionValue("value");
  } else {
    safeSetSessionValue("type", String(type));
    safeSetSessionValue("value", String(value));
  }

  // Navigate directly to game.html (same directory as index.html — avoids
  // cross-directory file:// security restrictions in Chrome)
  window.location.href = "game.html";
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

function startDaily() {
  try { sessionStorage.setItem("mode", "dailyChallenge"); } catch(_e) {}
  window.location.href = "game.html";
}

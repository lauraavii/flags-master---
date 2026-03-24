function selectMode(modeName) {
  sessionStorage.setItem("mode", modeName);
  window.location.href = "juego/juego.html";
}

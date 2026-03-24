// ===== MODO: Bandera → 4 países =====

function renderFlagTo4Countries() {
  const container = document.getElementById("flags");
  if (!container || !Array.isArray(paises) || paises.length === 0) return;

  const correcto = paises[actual];
  if (!correcto) return;

  container.innerHTML = "";

  const incorrectos = shuffle(paises.filter(p => p !== correcto)).slice(0, 3);
  const opciones = shuffle([correcto, ...incorrectos]);

  const img = document.createElement("img");
  img.src = `../assets/flags/${correcto.bandera}`;
  img.alt = `Bandera de ${correcto.pais}`;
  img.style.width = "140px";
  img.style.display = "block";
  img.style.margin = "0 auto";
  container.appendChild(img);

  const opcionesDiv = document.createElement("div");
  opcionesDiv.style.display = "flex";
  opcionesDiv.style.justifyContent = "center";
  opcionesDiv.style.gap = "10px";
  opcionesDiv.style.marginTop = "20px";

  opciones.forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = p.pais;
    btn.onclick = () => checkAnswer(p.pais);
    opcionesDiv.appendChild(btn);
  });

  container.appendChild(opcionesDiv);
}

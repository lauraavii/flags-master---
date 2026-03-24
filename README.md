# Juego de Banderas

Proyecto web estático para practicar países y banderas con varios modos de juego.

## Requisitos

- Navegador moderno
- Servidor estático local (recomendado)

Ejemplos para servir el proyecto:

```bash
# Opción 1 (Python)
python3 -m http.server 8080

# Opción 2 (Node)
npx serve .
```

Luego abre:

- `http://localhost:8080/index.html` (flujo principal)
- `http://localhost:8080/game.html` (pantalla unificada alternativa)

## Flujo principal

1. `index.html`: eliges filtro (nivel, continente o libre).
2. `juego/modos.html`: eliges modo de juego.
3. `juego/juego.html`: se ejecuta la partida.

Los filtros y el modo se persisten en `sessionStorage`.

## Sistema de puntuacion

- Puntos por acierto/error definidos por modo de juego.
- Bonus progresivo por racha de aciertos.
- Bonus adicional al cerrar bloque en modo cascada.
- En modos de 1 minuto, bonus por tiempo restante.
- Se muestran en pantalla: puntos, aciertos, fallos, precision y racha maxima.

Toda la informacion de puntuacion de la sesion se guarda en:

- `flagsGame.currentStats` (estado de la partida actual)
- `flagsGame.history` (historial de partidas de la sesion)

## Modos disponibles

- País -> 4 banderas
- Bandera -> 4 países
- Bandera -> escribir país
- Drag & drop (bandera -> país)
- Cascada (6 banderas)
- 1 minuto: países
- 1 minuto: banderas
- Mapas (limitado a Europa/Africa)

## Datos y assets

- Dataset: `data/countries.json`
- Banderas: `assets/flags`
- Mapas: `assets/maps`

`mapMode` solo usa países de Europa y Africa. Si falta un mapa puntual, la ronda se salta automáticamente para evitar bloquear la partida.

## Validación de consistencia

Se incluye un validador para revisar dataset y assets:

```bash
node scripts/validate-data.js
```

Valida:

- esquema básico de `countries.json`
- banderas faltantes
- mapas faltantes en Europa/Africa (warning)
- niveles fuera de rango
- duplicados `pais + continente`

## Notas de mantenimiento

- Si añades países, añade también bandera (`.png`) y, si aplica, mapa (`.svg`).
- Mantén los continentes consistentes con el dataset:
  - `Europa`
  - `Asia`
  - `Africa`
  - `America del Norte`
  - `America del Sur`
  - `Oceania`

# Banderas del Mundo

Un juego web interactivo para aprender y practicar el reconocimiento de banderas de países de todo el mundo. Diseñado para ser educativo, divertido y accesible, con múltiples modos de juego y desafíos diarios.

##  Características

- **250+ países** con banderas de alta calidad
- **8 modos de juego** para diferentes estilos de aprendizaje
- **Reto diario** con preguntas fijas que cambian cada día
- **Filtros avanzados** por continente o nivel de dificultad
- **Sistema de puntuación** con rachas y bonos
- **Interfaz responsive** que funciona en móvil y escritorio
- **Sin registro** ni dependencias externas
- **Soporte offline** (una vez cargado)

##  Modos de Juego

### Modos Principales
- **País a 4 banderas**: Se muestra el nombre del país, elige la bandera correcta entre 4 opciones.
- **Bandera a 4 países**: Se muestra la bandera, elige el país correcto entre 4 opciones.
- **Bandera a escribir país**: Se muestra la bandera, escribe el nombre del país.
- **Arrastrar bandera a país**: Arrastra la bandera al país correspondiente en un mapa interactivo.

### Modos Especiales
- **Cascada de 6 banderas**: Responde correctamente para desbloquear más opciones.
- **1 minuto de países**: Responde tantas preguntas como puedas en 60 segundos.
- **1 minuto de banderas**: Variante con enfoque en banderas.
- **Mapas**: Identifica países en mapas vectoriales.
- **Tabla informativa**: Explora países en una tabla detallada.

### Reto Diario
- 20 preguntas fijas que cambian cada día.
- Mezcla de modos para un desafío equilibrado.
- Sin límite de tiempo, pero con puntuación guardada.


## Uso

### Opción 1: Sitio Web (Recomendado)

Visita [retobanderas.es](https://retobanderas.es) para jugar directamente en línea sin necesidad de instalar nada.


##  Cómo Jugar

1. **Inicio**: Elige un filtro (continente, nivel o sin filtro) en la página principal
2. **Modo**: Selecciona cómo quieres jugar
3. **Juego**: Responde las preguntas correctamente para ganar puntos
4. **Puntuación**: Acumula puntos, rachas y precisión

### Sistema de Puntuación
- **Aciertos**: Puntos base según el modo (10-18 puntos)
- **Fallos**: Penalización (4-7 puntos)
- **Rachas**: Bonos progresivos por respuestas consecutivas correctas
- **Tiempo**: Bonos adicionales en modos cronometrados

##  Estructura del Proyecto

```
flags-master/
├── index.html              # Página de inicio y selección de filtros
├── game.html               # Pantalla de juego principal
├── README.md               # Este archivo
├── assets/
│   ├── ui.css             # Estilos CSS
│   └── flags/             # Imágenes de banderas
│       └── maps/          # Mapas por continente
├── data/
│   └── countries.json     # Datos de países (fuente)
└── js/
    ├── data.js            # Datos inline de países
    ├── main.js            # Lógica de la página de inicio
    └── game.js            # Lógica principal del juego
```

##  Tecnologías

- **HTML5** para la estructura
- **CSS3** para el diseño y animaciones
- **JavaScript ES6+** para la lógica
- **LocalStorage/SessionStorage** para persistencia
- **Fetch API** para carga de datos

##  Contribuir

¡Las contribuciones son bienvenidas! Para contribuir:


### Ideas para Contribuciones
- Nuevos modos de juego
- Más países y banderas
- Mejoras en la interfaz
- Traducciones a otros idiomas
- Optimizaciones de rendimiento

##  Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

##  Agradecimientos

- Datos de países de fuentes públicas
- Iconos y diseño inspirado en juegos educativos
- Comunidad open source por las herramientas utilizadas

---

¡Diviértete aprendiendo sobre las banderas del mundo! 🇺🇳
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


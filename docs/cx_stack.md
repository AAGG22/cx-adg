# Stack y ecosistema de cx-adg

Referencia técnica de **cómo está construida** la aplicación, **qué piezas usa** y **cómo encajan** entre sí.

---

## 1. Resumen en una frase

**cx-adg** es una aplicación web estática, sin backend, que corre enteramente en el navegador: un solo `index.html` con HTML, CSS y JavaScript vanilla, dibujo en Canvas 2D, exportación a raster y SVG, y una capa PWA mínima para uso offline.

---

## 2. Arquitectura general

```
┌─────────────────────────────────────────────────────────┐
│                     Navegador del usuario                │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  index.html │  │  Canvas 2D   │  │  localStorage   │ │
│  │  (UI + JS)  │──│  (lienzo)    │  │  (autoguardado) │ │
│  └──────┬──────┘  └──────────────┘  └─────────────────┘ │
│         │                                                │
│  ┌──────▼──────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   sw.js     │  │ manifest     │  │  Archivos .json │ │
│  │ (PWA cache) │  │ .webmanifest │  │  (guardar/abrir)│ │
│  └─────────────┘  └──────────────┘  └─────────────────┘ │
└───────────────────────────┬─────────────────────────────┘
                            │ (solo export GIF, 1ª visita)
                            ▼
                   CDN: gif.js + gif.worker.js
```

| Principio | Detalle |
|-----------|---------|
| **Sin servidor de aplicación** | No hay API, base de datos ni autenticación |
| **Privacidad** | Los diagramas se editan y exportan en el cliente |
| **Sin build** | No hay npm, bundler ni paso de compilación |
| **Deploy** | Sitio estático (Netlify, Vercel, GitHub Pages, etc.) |

---

## 3. Stack por capas

### 3.1 Presentación (UI)

| Tecnología | Uso |
|------------|-----|
| **HTML5** | Estructura: header, rail de herramientas, canvas, panel derecho, pestañas, modales |
| **CSS3** | Tema oscuro, variables (`--bg`, `--accent`, …), flexbox, media queries básicas |
| **JavaScript ES** | Toda la lógica en un `<script>` dentro de `index.html` |

No hay React, Vue, Svelte ni componentes web framework.

### 3.2 Gráficos y animación

| Tecnología | Uso |
|------------|-----|
| **Canvas 2D API** | Dibujo de nodos, flechas, cuadrícula, animación de flujo, export PNG/JPG/GIF |
| **requestAnimationFrame** | Bucle de render (~60 fps) |
| **SVG (generado a mano)** | Export `.svg` como XML construido con strings |
| **SVG embebido (data URLs)** | Iconos cloud (GCP, AWS, Azure, Kafka, K8s, …) |

Coordenadas del mundo: lienzo lógico **2560×1440** (`const W`, `const H`).

### 3.3 Datos y persistencia

| Almacén | Contenido |
|---------|-----------|
| **Memoria (`doc`)** | `{ theme, pages[], cur }` — cada página tiene `nodes[]`, `edges[]`, `name` |
| **localStorage** | Clave `cx-adg.autosave.v1` — última sesión para recuperar al reabrir |
| **Archivos en disco** | `.json` / `.cx-adg.json` — guardar/abrir proyecto completo |
| **Portapapeles** | Prefijo interno `cx-adg::` para copiar/pegar nodos entre sesiones |

### 3.4 PWA (Progressive Web App)

| Archivo | Rol |
|---------|-----|
| `manifest.webmanifest` | Nombre, colores, `display: standalone`, iconos |
| `sw.js` | Service worker: caché estática (`cx-adg-static-v*`), estrategia cache-first |
| Registro en `index.html` | `navigator.serviceWorker.register("./sw.js")` al cargar |

Assets cacheados: `index.html`, `manifest.webmanifest`, `sw.js`, y opcionalmente `gif.js` del CDN.

### 3.5 Dependencia externa

| Librería | Origen | Para qué |
|----------|--------|----------|
| **[gif.js](https://github.com/jnordberg/gif.js) v0.2.0** | CDN Cloudflare | Codificar GIF animado en Web Worker |

Todo lo demás es API nativa del navegador.

---

## 4. Estructura del repositorio

```
cx-adg/
├── index.html              # Aplicación completa (~2200 líneas)
├── manifest.webmanifest    # Metadatos PWA
├── sw.js                   # Service worker
├── README.md               # Introducción y deploy
└── docs/
    ├── cx_stack.md         # Este documento
    ├── cx_svg.md           # Exportación SVG y coordenadas
    └── cx_pestaña_nombre.md # Nombre de pestaña al abrir archivos
```

No hay `package.json`, `node_modules`, ni carpetas `src/` / `dist/`.

---

## 5. Modelo de dominio (simplificado)

### Documento (`doc`)

```js
{
  theme: "dark" | "crema" | "claro",
  cur: 0,                    // índice de página activa
  pages: [
    {
      name: "mi-diagrama",
      nodes: [ /* ... */ ],
      edges: [ /* ... */ ],
      nextId: 42
    }
  ]
}
```

### Nodo (`node`)

Campos principales: `id`, `shape`, `x`, `y`, `w`, `h`, `label`, `color`, `fs`, `textColor`, `textAlign`, `fontFamily`, `pulse`, `order`, …

Formas: `rect`, `cylinder`, `diamond`, `circle`, `hex`, `text`, `icon`, `image`.

### Arista / flecha (`edge`)

Campos principales: `id`, `from`, `to`, `fromSide`, `toSide`, `route`, `waypoints`, `label`, `animated`, `dashed`, `lineColor`, …

### Configuración global (`settings`)

Velocidad de animación, puntos por flecha, cuadrícula, aparición secuencial, etc.

---

## 6. Flujos principales

### Edición

1. Usuario interactúa (clic, arrastre, teclado).
2. Se actualiza `doc` en memoria.
3. `render()` redibuja el canvas con pan/zoom (`viewX`, `viewY`, `viewZoom`).
4. `scheduleAutosave()` persiste en `localStorage` con debounce.

### Exportación

| Formato | Mecanismo |
|---------|-----------|
| **PNG / JPG** | Canvas offscreen + `toBlob()` |
| **GIF** | Fotogramas en canvas → **gif.js** |
| **SVG** | `buildSVGDocument()` → XML → descarga |

PNG/GIF recortan al contenido (`getBounds`). SVG usa área fija 2560×1440 (ver `docs/cx_svg.md`).

### Apertura de archivo

1. `#fileIn` lee el `.json`.
2. `applyProjectData(data, { fileName })` carga el documento.
3. `applyPageNamesFromFile()` renombra la pestaña (ver `docs/cx_pestaña_nombre.md`).
4. `renderTabs()` actualiza la barra inferior.

---

## 7. Fuentes y tipografía

| Contexto | Fuente por defecto |
|----------|-------------------|
| UI de la app | Segoe UI, system-ui |
| Texto en diagramas | **Aptos** (con fallback a Segoe UI) |
| Logo / modales | Georgia (solo UI, no nodos) |

El usuario puede elegir fuente por nodo/flecha: Aptos, Georgia, Segoe UI, Arial, monoespaciada.

Negrita en etiquetas: sintaxis `**palabra**` parseada al dibujar.

---

## 8. Temas visuales

```js
const THEMES = {
  dark:  { bg, grid, text, edge, edgeLbl, lblBg },
  crema: { ... },
  claro: { ... }
};
```

Paleta semántica de nodos (`PALETTE`): servicio, eventos/Kafka, datos, IA, alerta, externo, config.

---

## 9. Despliegue y ecosistema operativo

### Hosting estático

La app se publica tal cual: **sin build command**, directorio raíz `.`.

Opciones usadas o documentadas:

| Plataforma | Notas |
|------------|-------|
| **Netlify** | Import desde GitHub; deploy en cada push a `main` |
| **Vercel** | Documentado en README; mismo esquema estático |
| **Local** | `npx serve .` (HTTP obligatorio para service worker) |

### Control de versiones

- **Git** + **GitHub** (`AAGG22/cx-adg`)
- Repo puede ser privado; el sitio en Netlify sigue siendo público en su URL

### Caché del service worker

En `sw.js`:

```js
const CACHE = "cx-adg-static-v6";  // incrementar al publicar cambios importantes
```

Cambiar el nombre del cache fuerza a los clientes PWA a descargar archivos nuevos.

---

## 10. Lo que **no** hay

| Ausente | Implicación |
|---------|-------------|
| Backend / API | No hay usuarios, colaboración en tiempo real ni almacenamiento en nube |
| Base de datos | Todo es memoria + archivos locales |
| npm / Node en runtime | No hay dependencias instaladas en el proyecto |
| TypeScript | JavaScript plano |
| Tests automatizados | No hay suite de tests en el repo |
| Framework CSS | CSS escrito a mano |
| Librería de diagramas | Lógica propia (inspirada en draw.io, no es fork) |

---

## 11. Requisitos del navegador

Funcionalidad mínima recomendada:

- Canvas 2D
- ES6+ (arrow functions, `Set`, `Map`, template literals)
- `localStorage`
- Service Workers (para PWA/offline)
- File API (`<input type="file">`, `Blob`, descargas)
- Clipboard API (copiar/pegar nodos e imágenes)

Probado conceptualmente en Chrome/Edge; Firefox y Safari suelen funcionar con posibles diferencias en PWA y fuentes.

---

## 12. Extensiones futuras (orientación)

Si querés evolucionar el stack sin romper la filosofía “estática y simple”:

| Objetivo | Enfoque compatible |
|----------|-------------------|
| Tests | Playwright o Vitest en CI, sin bundlear la app |
| Tipado | Migración gradual a TypeScript + build opcional |
| Más formatos | Nuevas funciones `exportX()` junto a las existentes |
| Colaboración | Requeriría **nuevo** backend (fuera del stack actual) |
| Iconos | Seguir con SVG data URLs o sprite sheet propio |

---

## 13. Mapa mental

> **Un archivo HTML es la app. El canvas es el motor gráfico. El JSON es la base de datos. El service worker es el cable a tierra offline. Netlify solo sirve archivos.**

Con eso tenés el panorama completo del ecosistema de cx-adg.

---

## 14. Glosario (términos técnicos)

**API / Web API**: funciones que el navegador ofrece (ej. Canvas 2D, Clipboard API, File API).

**Autosave**: guardado automático en segundo plano (en cx-adg se guarda en `localStorage` con debounce).

**CDN (Content Delivery Network)**: red de servidores para entregar archivos “rápido” desde Internet (en cx-adg se usa para `gif.js`).

**Cache (cache del navegador)**: almacenamiento local que evita volver a pedir recursos; puede quedar “viejo” si no se invalida.

**Cache-first**: estrategia de service worker: intentar servir desde cache y, si no existe, hacer `fetch` para traerlo.

**Canvas 2D**: elemento `<canvas>` donde se dibuja con una API de 2D (rectángulos, líneas, texto, etc.).

**CD (Service Worker)** / **Service worker**: script que corre en segundo plano y puede interceptar requests para habilitar PWA (offline/caché).

**Debounce**: técnica para “esperar un poco” antes de ejecutar algo repetido; reduce escrituras/operaciones. (En cx-adg se usa para autosave.)

**DOM**: estructura del HTML en memoria; funciones como `document.getElementById(...)` interactúan con ella.

**Event handler**: función asociada a un evento (ej. un `onchange`, `onclick`, o un `addEventListener`).

**Event listener**: registro explícito de callbacks para eventos (por ejemplo: `el.addEventListener("click", ...)`).

**File API**: herramientas para leer archivos del usuario desde `<input type="file">` (ej. `.text()` y `Blob`).

**File name / file base name**: el nombre del archivo en disco. “Base name” es el nombre sin la extensión.

**NBSP**: “Non-breaking space” (espacio no separable). Es un espacio Unicode distinto al espacio normal; por eso el regex puede fallar si no se normaliza.

**Offscreen (opcional)**: en cx-adg se usa un `canvas` “extra” para exportar PNG/JPG sin depender del canvas visible.

**Pan**: movimiento de “cámara” para desplazar el lienzo (en cx-adg se maneja con `viewX` y `viewY`).

**Parse / JSON.parse**: convertir texto JSON a objetos JavaScript.

**Pestañas (`renderTabs`)**: barra inferior que genera pestañas basadas en `doc.pages` y `doc.cur`.

**PWA (Progressive Web App)**: app web con capacidades tipo “instalable” y soporte offline vía service worker + manifest.

**Regex (expresión regular)**: patrón para buscar texto (ej. para detectar nombres “Página 2”).

**Service Worker scope**: alcance de qué archivos/requests administra el service worker (depende de la ruta donde vive).

**SVG**: formato vectorial basado en XML; cx-adg lo genera como strings y lo descarga como archivo `.svg`.

**Tspan**: elemento SVG para agrupar texto con estilos (cx-adg usa `<tspan font-weight="bold">` para `**negrita**`).

**viewBox**: propiedad del `<svg>` que define la ventana/coordenadas del sistema de dibujo.

**Viewport**: región “visible” en pantalla. En cx-adg el viewport en coordenadas mundo se calcula con `viewX/viewY/viewZoom`.

**View**: “cámara” que controla zoom y pan; en cx-adg se traduce a transformaciones del canvas.

**ViewZoom**: variable que indica el zoom (escala) aplicada al canvas.

**viewZoom / viewX / viewY**: variables que modelan el sistema de cámara (zoom y desplazamiento).

**XML escape**: función para reemplazar caracteres especiales (`<`, `>`, `&`, `"`) antes de insertar texto en SVG/XML.

**toBlob()**: método para convertir el contenido de un canvas a un `Blob` (usado para PNG/JPG).

**ZIP (no aplica)**: no se usa en cx-adg; solo para dejar claro que no hay empaquetado.


# Fondo cuadriculado — guía didáctica

El fondo cuadriculado **no es una imagen**: se dibuja con líneas en el canvas (editor) y, si corresponde, en el SVG exportado. Sirve de guía visual para alinear nodos y medir distancias.

---

## 1. De dónde sale

| Pieza | Rol |
|-------|-----|
| `GRID = 20` | Espaciado entre líneas (20 px del mundo del diagrama) |
| `THEMES[tema].grid` | Color (y opacidad) de las líneas según el tema |
| `settings.grid` | Encendido/apagado de la cuadrícula |
| `#chkGrid` | Checkbox “Cuadrícula” en la UI |

Primero se pinta el fondo sólido del tema (`T.bg`); encima van las líneas de la grilla.

---

## 2. Cómo usarlo en la app

1. Marcá o desmarcá **Cuadrícula** en la barra superior (`#chkGrid`).
2. Cambiá el **tema** (oscuro / crema / claro): el fondo y el color de la grilla se adaptan.
3. Al exportar SVG/PNG con fondo no transparente, si la cuadrícula está activa se incluye en el archivo.

Con **Fondo transparente** en el export, la grilla **no** se dibuja (solo tiene sentido sobre un fondo sólido).

---

## 3. Colores por tema

Definidos en `THEMES`:

```js
const THEMES = {
  dark:  { bg: "#161616", grid: "rgba(255,255,255,.045)", /* ... */ },
  crema: { bg: "#f4eee1", grid: "rgba(0,0,0,.06)",        /* ... */ },
  claro: { bg: "#ffffff", grid: "rgba(0,0,0,.05)",        /* ... */ },
};
```

Líneas muy suaves para no competir con nodos y conectores.

---

## 4. Estado y checkbox

```js
let settings = { speed: .5, dots: 3, build: false, stagger: .45, grid: true };
```

```js
$("chkGrid").onchange = () => { settings.grid = $("chkGrid").checked; };
```

Al cargar un proyecto, si `settings.grid` viene indefinido, se asume `true`. El valor se guarda con el resto de `settings` en el JSON del diagrama.

---

## 5. Dibujo en el editor (Canvas)

En el render (vista normal, no export):

1. Se calcula el rectángulo visible en coordenadas del mundo (`wx`, `wy`, `ww`, `wh`) según pan/zoom.
2. Se rellena con `T.bg`.
3. Si `settings.grid`, se trazan verticales y horizontales cada `GRID` px:

```js
c.fillStyle = T.bg;
c.fillRect(wx, wy, ww, wh);

if (settings.grid) {
  c.strokeStyle = T.grid;
  c.lineWidth = 1 / viewZoom; // grosor estable en pantalla
  c.beginPath();
  const sx = Math.floor(wx / GRID) * GRID;
  const sy = Math.floor(wy / GRID) * GRID;
  for (let x = sx; x < wx + ww + GRID; x += GRID) {
    c.moveTo(x, wy); c.lineTo(x, wy + wh);
  }
  for (let y = sy; y < wy + wh + GRID; y += GRID) {
    c.moveTo(wx, y); c.lineTo(wx + ww, y);
  }
  c.stroke();
}
```

`Math.floor(.../GRID)*GRID` alinea las líneas a la grilla global, no al borde del viewport.

En modo **export canvas** (PNG) hay un bloque equivalente que dibuja la grilla dentro de los bounds exportados.

---

## 6. Exportación SVG

Función `svgGrid(theme)`: genera un `<g id="grid">` con `<line>` cada 20 px sobre el área fija `W×H` (2560×1440):

```js
function svgGrid(theme) {
  const col = escapeAttribute(THEMES[theme].grid);
  const lines = [];
  for (let x = 0; x <= W; x += GRID)
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" .../>`);
  for (let y = 0; y <= H; y += GRID)
    lines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" .../>`);
  return `<g id="grid">${lines.join("")}</g>`;
}
```

En `buildSVGDocument`:

```js
if (!transparent) parts.push(`<rect ... fill="${T.bg}"/>`);
if (settings.grid && !transparent) parts.push(svgGrid(theme));
```

Orden: fondo → grilla → conectores → nodos → marco del área de trabajo.

---

## 7. Relación con el snap

`GRID` también se usa para **encajar** posiciones al mover/crear nodos:

```js
const snap = v => Math.round(v / GRID) * GRID;
```

La cuadrícula visible y el snap comparten el mismo paso de 20 px. Apagar la visualización **no** desactiva el snap por sí solo.

---

## 8. Flujo resumido

```
Tema (doc.theme) → T.bg + T.grid
settings.grid / #chkGrid → ¿dibujar líneas?
        ↓
Canvas: fillRect(bg) + stroke líneas cada GRID
SVG:    <rect fill> + svgGrid()  (si no transparente)
```

---

## 9. Cómo probar

1. Activá/desactivá **Cuadrícula** y verificá que las líneas aparecen/desaparecen.
2. Cambiá de tema: el fondo y el tono de la grilla deben cambiar.
3. Exportá SVG con fondo opaco y grilla on → buscá `<g id="grid">` en el archivo.
4. Exportá con fondo transparente → no debe haber grilla ni rect de fondo.

---

## 10. Glosario breve

| Término | Significado |
|---------|-------------|
| **GRID** | Paso de la grilla (20 px) |
| **T.bg / T.grid** | Fondo y color de líneas del tema activo |
| **settings.grid** | Flag persistido de “mostrar cuadrícula” |
| **Viewport** | Zona visible del canvas tras pan/zoom |
| **Snap** | Redondeo de coordenadas al múltiplo de `GRID` |

---

## 11. Idea final

> **La cuadrícula es geometría dibujada, no un asset: mismo `GRID` para ver, exportar y alinear.**

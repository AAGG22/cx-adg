# Caja con contorno gris y relleno transparente — guía didáctica

La forma **Caja** (`rect`) puede usar un color semántico especial: **contorno gris oscuro** y **relleno transparente**. Sirve para agrupar o delimitar sin tapar el diagrama.

---

## 1. Para qué sirve

| Estilo normal | Estilo contorno |
|---------------|-----------------|
| Relleno semitransparente del color semántico | Sin relleno (transparente) |
| Borde del mismo color | Borde gris oscuro `#2e3134` |

Útil para marcos, agrupadores lógicos o cajas “fantasma” que no compiten visualmente con los nodos de servicio.

---

## 2. Cómo usarlo en la app

1. Creá o seleccioná una **Caja** (herramienta Caja en el rail izquierdo).
2. En el panel derecho → **Color semántico**.
3. Elegí el swatch **Contorno gris** (cuadrado vacío con borde gris).
4. La caja queda solo con contorno; el texto de la etiqueta sigue visible.

Ese swatch **solo aparece** cuando el nodo seleccionado es una caja (`shape: "rect"`). En rombos, círculos, etc. no se muestra.

---

## 3. Cómo se guarda en el modelo

Los colores normales usan un hex (`#6a9fb5`, etc.). El contorno usa un valor especial:

```js
const OUTLINE_COLOR = "outline";
```

En el JSON del diagrama verás algo como:

```json
{
  "id": 3,
  "shape": "rect",
  "x": 400,
  "y": 300,
  "w": 180,
  "h": 70,
  "label": "Grupo A",
  "color": "outline"
}
```

No es un color CSS válido por sí solo: la app lo interpreta al dibujar.

---

## 4. Constantes y detección

```js
const OUTLINE_COLOR = "outline";
const OUTLINE_STROKE = "#2e3134"; // gris oscuro (misma familia que --line del tema)

function isOutlineColor(c) {
  return c === OUTLINE_COLOR;
}

function nodeRectOutline(n) {
  return n.shape === "rect" && isOutlineColor(n.color);
}
```

`nodeRectOutline(n)` es la condición central: **solo cajas** con `color: "outline"`.

---

## 5. Paleta en el panel (swatches)

Los colores semánticos normales vienen de `PALETTE`. El contorno va en una lista aparte solo para cajas:

```js
const PALETTE_RECT = [
  { c: OUTLINE_COLOR, n: "Contorno gris", rectOnly: true }
];
```

Al crear el swatch en el DOM:

- Clase CSS `outlineOnly` → se ve como marco vacío.
- `data-rect-only="1"` → en `refreshPanel()` se oculta si el nodo no es `rect`.

```js
if (sw.dataset.rectOnly) {
  sw.style.display = obj.shape === "rect" ? "" : "none";
}
```

---

## 6. Dibujo en Canvas

En `drawNode()`, las cajas con contorno no pasan por el relleno habitual (`hexA`):

```js
else if (nodeRectOutline(n)) {
  c.strokeStyle = OUTLINE_STROKE;
  c.lineWidth = 2.5 + glow * 1.5;
  shapePath(c, n);
  c.stroke();           // solo contorno, sin fill()
  drawLabelLines(c, n, theme, 17, n.y);
}
```

Las demás formas siguen con `fill()` + `stroke()` y el color semántico elegido.

---

## 7. Exportación SVG

En `renderNodeToSVG()`:

```js
const outline = nodeRectOutline(n);
const fill = outline ? "none" : svgFillColor(n.color, theme);
const stroke = outline ? OUTLINE_STROKE : escapeAttribute(n.color);
```

El `<rect>` de la caja exporta `fill="none"` y `stroke="#2e3134"`.

---

## 8. Estilo visual del swatch (CSS)

```css
.swatch.outlineOnly {
  background: transparent;
  box-shadow: inset 0 0 0 2px #2e3134;
}
```

Así el usuario distingue el contorno vacío de los swatches rellenos.

---

## 9. Flujo resumido

```
Usuario selecciona Caja
        ↓
Aparece swatch "Contorno gris"
        ↓
Click → n.color = "outline"
        ↓
drawNode / renderNodeToSVG detectan nodeRectOutline(n)
        ↓
Solo stroke gris, sin relleno
```

---

## 10. Cómo probar

1. Insertá una caja en el lienzo.
2. Seleccionala → debe verse el swatch de contorno al final de Color semántico.
3. Aplicá contorno gris.
4. Exportá SVG o PNG: la caja debe verse hueca, solo borde.
5. Guardá el `.json` y verificá `"color": "outline"`.

---

## 11. Glosario breve

| Término | Significado |
|---------|-------------|
| **Swatch** | Cuadradito de color en el panel |
| **Color semántico** | Color que clasifica el tipo de componente (servicio, datos, etc.) |
| **Sentinel** | Valor especial (`"outline"`) que no es un hex pero marca un estilo |
| **rect** | Forma interna de la herramienta Caja |
| **hexA** | Función que convierte `#rrggbb` a `rgba` con transparencia para el relleno |

---

## 12. Idea final

> **Un color semántico no siempre es un hex: puede ser una “marca” que cambia cómo se pinta la forma. Para la caja, `"outline"` significa: borde gris, interior transparente.**

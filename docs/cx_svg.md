# Exportación SVG en cx-adg — guía didáctica

Este documento explica **por qué el SVG salía desfasado**, **qué se cambió** y **cómo funciona** el sistema de coordenadas, para que puedas modificarlo vos mismo.

---

## 1. El problema en una frase

En el editor conviven **tres sistemas de coordenadas distintos**. Si el exportador SVG no usa el mismo que el lienzo, el archivo se ve corrido, recortado o con mucho espacio vacío.

---

## 2. Los tres sistemas de coordenadas

### A) Coordenadas de pantalla (píxeles del `<canvas>` en el navegador)

Cuando movés o hacés zoom, el canvas aplica una transformación:

```
pantalla = mundo × viewZoom + viewX
```

- `viewX`, `viewY` → desplazamiento (pan)
- `viewZoom` → zoom

Esto **solo afecta lo que ves en pantalla**, no las posiciones guardadas de los nodos.

### B) Coordenadas del mundo (donde viven los nodos)

Cada nodo tiene `x`, `y`, `w`, `h` en un espacio lógico compartido. Una caja en `x:500, y:300` sigue ahí aunque hagas pan o zoom.

En `index.html` el tamaño del **área de trabajo** está definido así:

```js
const W = 2560, H = 1440;
```

Ese rectángulo `(0, 0)` → `(2560, 1440)` es el “lienzo oficial” que el SVG debe exportar.

### C) Coordenadas del SVG (`viewBox`)

Un SVG declara su ventana con `viewBox`:

```xml
<svg width="2560" height="1440" viewBox="0 0 2560 1440">
```

Todo lo que dibujes dentro usa **las mismas coordenadas del mundo**. Si un nodo está en `x=800`, en el SVG también va en `x=800`.

---

## 3. Por qué parecía “desfasado”

### PNG/GIF vs SVG exportaban distinto

| Formato | Qué hacía antes | Resultado |
|---------|-----------------|-----------|
| **PNG / GIF** | Usa `getBounds()` → recorta solo alrededor del contenido | Siempre “encuadra” el diagrama |
| **SVG** | Usaba `viewBox="0 0 2560 1440"` **sin fondo** y sin marcar el área | El contenido quedaba en su posición absoluta dentro de un rectángulo grande; en visores parecía corrido o con mucho margen |

Ejemplo: si tu diagrama está centrado alrededor de `(1280, 720)` dentro de `2560×1440`, el PNG lo recorta bien, pero el SVG muestra todo el rectángulo completo con el dibujo en el medio — o peor, si algo quedó **fuera** de `2560×1440`, el SVG lo recorta sin avisar.

### El pan/zoom no es el culpable directo

Es fácil pensar que el zoom causa el desfase. **No**: el zoom solo cambia la cámara. El bug era de **encuadre inconsistente** entre formatos y falta de referencia visual del área de trabajo.

---

## 4. Qué se implementó (resumen)

1. **Borde punteado visible** en el lienzo → marca el área `2560×1440`.
2. **Oscurecimiento fuera del área** → ves claramente cuando un nodo queda afuera.
3. **Badge de aviso** abajo a la izquierda → “Área de trabajo 2560×1440” o advertencia si hay overflow.
4. **SVG corregido** → fondo del tema, cuadrícula opcional, mismo `viewBox`, marco del área de trabajo.
5. **Confirmación al exportar** si hay contenido fuera del área.

---

## 5. Código paso a paso

### 5.1 Constantes del área de trabajo

```js
const W = 2560, H = 1440;
```

Todo el export SVG gira en torno a este rectángulo. Si querés otro tamaño (por ejemplo `1920×1080`), cambiás acá **y** revisás que PNG/GIF/SVG sigan alineados.

### 5.2 Detectar si el contenido se sale

```js
function getBounds() {
  // Calcula el rectángulo mínimo que envuelve nodos + flechas (+ margen)
}

function workAreaOverflow() {
  const b = getBounds();
  return b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H;
}
```

`getBounds()` ya existía para PNG. Lo reutilizamos para saber si algo sobresale del área oficial.

### 5.3 Dibujar el área en el lienzo (solo editor)

```js
function drawWorkArea(c, theme) {
  // 1. Oscurece la zona visible que queda FUERA de (0,0,W,H)
  // 2. Dibuja rectángulo punteado en (0,0,W,H)
  // 3. Si hay overflow → borde rojo en lugar de naranja
}
```

Se llama dentro de `render()`, **después de la cuadrícula y antes de nodos/flechas**, para que el marco quede debajo del contenido pero la zona exterior se note.

La función usa el viewport visible en coordenadas mundo:

```js
const wx = -viewX / viewZoom;
const wy = -viewY / viewZoom;
const ww = cv.width / viewZoom;
const wh = cv.height / viewZoom;
```

Así solo oscurece lo que realmente estás viendo en pantalla.

### 5.4 Construir el SVG

```js
function buildSVGDocument(scale = 1) {
  const { width, height } = getExportDimensions(scale);
  const theme = doc.theme;
  const T = THEMES[theme];

  const parts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg ... width="${width}" height="${height}" viewBox="0 0 ${W} ${H}">`,
    buildSVGDefs(),
    `<rect width="${W}" height="${H}" fill="${T.bg}"/>`,  // ← fondo explícito
  ];

  if (settings.grid) parts.push(svgGrid(theme));

  for (const e of page.edges) parts.push(renderConnectorToSVG(e, theme));
  for (const n of page.nodes) parts.push(renderNodeToSVG(n, theme));

  parts.push(svgWorkAreaFrame(theme, workAreaOverflow())); // ← marco punteado
  parts.push("</svg>");
  return parts.join("\n");
}
```

**Claves didácticas:**

| Pieza | Para qué sirve |
|-------|----------------|
| `viewBox="0 0 W H"` | Define el sistema de coordenadas del archivo |
| `<rect>` de fondo | Evita fondo blanco/transparente inesperado en visores |
| `svgGrid()` | Replica la cuadrícula del editor |
| `renderNodeToSVG` / `renderConnectorToSVG` | Convierten cada objeto del modelo a XML |
| `svgWorkAreaFrame()` | Dibuja el mismo borde punteado que ves en pantalla |

### 5.5 Relación `width` / `height` vs `viewBox`

```js
function getExportDimensions(scale = 1) {
  return { width: Math.round(W * scale), height: Math.round(H * scale) };
}
```

- `viewBox` → coordenadas lógicas (siempre `0 0 2560 1440`)
- `width` / `height` → tamaño en píxeles del archivo (escala 0.5x, 1x, 2x…)

El visor escala proporcionalmente. Si `viewBox` y las posiciones de los nodos coinciden, **no hay desfase**.

---

## 6. Cómo se renderiza un nodo a SVG

Cada forma tiene su función en `renderNodeToSVG()`. Ejemplo simplificado de una caja:

```js
case "rect":
  parts.push(
    `<rect x="${n.x - n.w/2}" y="${n.y - n.h/2}"
           width="${n.w}" height="${n.h}" ... />`
  );
  parts.push(svgLabelLines(n, theme, 17, n.y));
```

Fijate que usa **las mismas** `n.x`, `n.y` que el canvas en `drawNode()`. Esa es la regla de oro: **misma fuente de verdad, dos renderizadores**.

---

## 7. Cómo depurar si algo sigue mal

### Checklist rápido

1. ¿El nodo está dentro del borde punteado en el editor?
2. ¿El badge abajo dice advertencia de overflow?
3. Abrí el `.svg` en un editor de texto y buscá `viewBox="0 0 2560 1440"`.
4. Compará un `x`/`y` del JSON del diagrama con el del XML.

### Herramientas del navegador

1. Exportá SVG.
2. Arrastralo al Chrome → se abre solo.
3. Inspeccioná elementos → verificá posiciones.

### Error común al extender

Agregar un offset en SVG sin aplicarlo en canvas (o al revés). **Siempre** tocá ambos caminos: `drawNode` / `drawEdge` y `renderNodeToSVG` / `renderConnectorToSVG`.

---

## 8. Diferencia intencional: PNG vs SVG

| | PNG / GIF | SVG |
|---|-----------|-----|
| Encuadre | Recorta al contenido (`getBounds`) | Área fija `2560×1440` |
| Uso ideal | Compartir imagen rápida | Editar en Illustrator, Figma, documentación |
| Fuera del área | Se incluye si está en bounds | Se recorta en el borde del área |

Si en el futuro querés que SVG también recorte al contenido, podés cambiar el `viewBox`:

```js
const b = getBounds();
// viewBox="${b.x} ${b.y} ${b.w} ${b.h}"
```

Pero perdés la correspondencia 1:1 con el marco visible del editor. Por eso elegimos **área de trabajo fija**.

---

## 9. Ejercicio para practicar

1. Creá un nodo en `(100, 100)` y exportá SVG → debe aparecer arriba-izquierda del área.
2. Mové un nodo fuera del borde punteado → el badge debe avisar y el borde ponerse rojo.
3. Cambiá `W` a `1920` temporalmente → verificá que el marco y el SVG cambian juntos.
4. Agregá un `console.log(buildSVGDocument())` y leé el XML generado.

---

## 10. Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `index.html` | `drawWorkArea`, `workAreaOverflow`, `buildSVGDocument`, badge UI |
| `sw.js` | Bump de caché (`cx-adg-static-v5`) para que Netlify sirva la versión nueva |

---

## 11. Idea final

> **El editor dibuja en “mundo”. El SVG es una foto vectorial de ese mundo en un rectángulo fijo. La pantalla es solo una cámara que se mueve por encima.**

Si mantenés esa separación clara, los exports dejan de sorprenderte.

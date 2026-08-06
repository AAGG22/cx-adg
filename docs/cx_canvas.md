# Canvas en cx-adg — guía didáctica

**Canvas no es una librería.** Es un elemento HTML nativo (`<canvas>`) más la **Canvas 2D API** del navegador. En cx-adg no se usa Fabric, Konva, Paper.js ni similares: el dibujo es vanilla JavaScript sobre ese lienzo.

> Nombre correcto: **canvas** (con **s**). “Canva” es otra cosa (un producto de diseño online).

---

## 1. Dónde está la etiqueta

En `index.html`, dentro del escenario del editor:

```html
<div class="stage">
  <div id="wrap">
    <canvas id="cv" width="2560" height="1440"></canvas>
    <textarea id="editBox" rows="1"></textarea>
  </div>
  ...
</div>
```

| Atributo | Significado |
|----------|-------------|
| `id="cv"` | Identificador para tomarlo desde JS |
| `width` / `height` | Resolución interna del buffer de píxeles (aquí 2560×1440 al inicio; el código puede redimensionar según el viewport) |

Si buscás “canva” en el código no vas a encontrarlo. Buscá `canvas` o `id="cv"`.

---

## 2. Cómo se conecta el JavaScript

```js
const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");
```

- `cv` → el elemento DOM (`HTMLCanvasElement`)
- `ctx` → contexto de dibujo 2D (`CanvasRenderingContext2D`)

Con `ctx` se llaman operaciones como `fillRect`, `stroke`, `fillText`, `drawImage`, `beginPath`, `translate`, `scale`, etc. Eso **es** la API del navegador, no un paquete npm.

---

## 3. Rol en la arquitectura

```
Modelo (JSON: nodos, edges, settings)
        │
        ▼
   render / draw*   ──►  <canvas id="cv">   (lo que ves al editar)
        │
        ├── PNG/JPG ──► canvas offscreen + toBlob()
        └── SVG     ──► strings SVG (otro camino, sin canvas)
```

| Superficie | Tecnología | Para qué |
|------------|------------|----------|
| Editor en vivo | Canvas 2D (`#cv`) | Interactuar, animar, pan/zoom |
| Export raster | Canvas auxiliar (creado en memoria) | PNG / JPG / fotogramas GIF |
| Export vectorial | SVG generado a mano | Archivo `.svg` editable |

El canvas es el **motor gráfico del editor**. El SVG de export es un **segundo renderizador** del mismo modelo.

---

## 4. Qué se dibuja ahí

Funciones típicas (todas pintan sobre `ctx` o un contexto offscreen):

| Función | Contenido |
|---------|-----------|
| Fondo + grilla | `T.bg`, líneas cada `GRID` |
| `drawNode` | Cajas, rombos, iconos, texto… |
| `drawEdge` | Conectores y animación de flujo |
| Área de trabajo | Marco punteado 2560×1440 |
| Selección / handles | UI de edición encima del diagrama |

Cada frame (o tras un cambio) se limpia y se vuelve a pintar: el canvas **no guarda** nodos como DOM; solo píxeles. La “verdad” vive en `doc.pages[].nodes` / `edges`.

---

## 5. Pan y zoom

Antes de dibujar el contenido del mundo, se aplica una transformación:

```js
c.translate(viewX, viewY);
c.scale(viewZoom, viewZoom);
```

Así las coordenadas del modelo (`n.x`, `n.y`) se mapean a la pantalla. El mouse se convierte en coordenadas de mundo con la inversa de esa transformación.

---

## 6. Canvas offscreen (export)

Para PNG/JPG (y frames de GIF) se crea un canvas **que no está en el HTML**:

```js
const off = document.createElement("canvas");
off.width = w; off.height = h;
const oc = off.getContext("2d");
// se dibuja el diagrama en oc…
off.toBlob(...);
```

Sirve para exportar a resolución fija sin depender del tamaño visible del `#cv`.

---

## 7. Canvas vs SVG (no confundir)

| | Canvas | SVG |
|--|--------|-----|
| Qué es | Bitmap (mapa de píxeles) | Vector (formas como texto XML) |
| En el editor | Sí (`#cv`) | No como lienzo principal |
| Al exportar | PNG/JPG/GIF | Archivo `.svg` |
| Escalado | Puede pixelarse | Escala limpio |
| Librería | No | Tampoco: se arma el markup a mano |

Ambos leen el **mismo** modelo de datos. Si cambiás cómo se dibuja un nodo, conviene tocar canvas y SVG.

---

## 8. Qué no es

- No es **Canva.com**
- No es un framework de diagramas
- No requiere `npm install canvas`
- No hay etiqueta `<canva>` en HTML

Solo: **`<canvas>` + `getContext("2d")`**.

---

## 9. Cómo ubicarlo en el código

1. HTML: buscar `id="cv"` o `<canvas`.
2. JS: buscar `getElementById("cv")`, `getContext("2d")`, `drawNode`, `drawEdge`.
3. Export: buscar `createElement("canvas")` y `toBlob`.

---

## 10. Glosario breve

| Término | Significado |
|---------|-------------|
| **`<canvas>`** | Elemento HTML que reserva un buffer de píxeles |
| **Contexto 2D** | Objeto con métodos de dibujo (`fill`, `stroke`, …) |
| **Frame / render** | Un repintado completo del lienzo |
| **Offscreen** | Canvas creado en JS, no visible en la página |
| **Vanilla** | Sin librerías de dibujo encima de la API nativa |

---

## 11. Idea final

> **El lienzo es HTML nativo. Buscá `<canvas id="cv">`, no “canva”. El navegador dibuja; el JSON recuerda.**

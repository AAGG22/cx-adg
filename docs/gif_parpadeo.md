# Parpadeo negro en GIF — diagnóstico y solución

El flash negro entre fotogramas **no viene del CSS ni del canvas oscuro de la app**. Viene del formato GIF (disposal + transparencia de 1 bit). **La solución con alpha limpio es exportar APNG**, no pelear más con el GIF transparente.

---

## 1. Síntoma

Al reproducir un GIF (sobre todo con fondo transparente), entre frames aparece un destello negro. No se arregla con padding, cards ni el color de fondo de la página donde lo embebes.

---

## 2. Causa

| Pieza | Efecto |
|-------|--------|
| **Disposal 2** (“restore to background”) | El visor borra la zona del frame al color de fondo (casi siempre negro) y recién pinta el siguiente → flash |
| **Transparencia GIF 1-bit** | Solo opaco / transparente; sin alpha suave. gif.js, con color transparente, fuerza disposal 2 por defecto |
| **Layout / CSS** | No es la causa del flash entre frames del archivo |

Aunque fuerces `dispose: 1` (*leave as is*), el GIF **sigue sin alpha real**. Con transparencia + animación el formato es un callejón sin salida limpio.

---

## 3. Solución en cx-adg: APNG (alpha limpio)

**APNG** = PNG animado con canal alpha de 8 bits (como un PNG estático, pero con varios frames).

### Cómo usarlo

1. **Exportar** → formato **APNG animado (alpha limpio)** (opción por defecto).
2. Marcá **Fondo transparente** si lo necesitás.
3. Descargás un `.png` animado (Chrome, Firefox, Safari lo reproducen).

Si elegís **GIF** y marcás transparencia, la app **redirige a APNG** automáticamente (mismo resultado limpio). El GIF opaco sigue siendo `.gif` para máxima compatibilidad.

### Cómo se genera

1. Cada frame se renderiza en un canvas offscreen con `transparent: true` → `clearRect` deja alpha 0 (sin chroma key).
2. Se lee `getImageData` (RGBA real).
3. [UPNG.js](https://github.com/photopea/UPNG.js) + **pako** (CDN) codifican APNG lossless: `UPNG.encode(bufs, w, h, 0, dels)`.
4. Se descarga `image/png`.

No hay disposal 2 ni color clave. Por eso no hay flash negro.

---

## 4. GIF: qué quedó

| Modo | Resultado |
|------|-----------|
| GIF **opaco** | Sigue disponible; frames con `dispose: 1` |
| GIF + **transparente** | Se exporta como **APNG** (no se genera GIF transparente) |

Intentar “arreglar” el GIF transparente solo con disposal no da alpha limpio. Por eso se abandonó ese camino para el caso transparente.

---

## 5. Comparación rápida

| Formato | Alpha | Parpadeo negro | Compatibilidad |
|--------|-------|----------------|----------------|
| GIF transparente | 1 bit | Típico (disposal) | Muy alta |
| GIF opaco | No | No (con dispose 1) | Muy alta |
| **APNG** | **8-bit real** | **No** | Alta (navegadores modernos; algunos viewers viejos muestran solo el 1.er frame) |
| WebP animado | Real | No | Alta (alternativa futura) |

---

## 6. Código clave

Export modal: opción `apng`. Si `gif` + transparente → `exportAPNG`.

```js
if (fmt === "apng") exportAPNG(scale, transparent);
else if (fmt === "gif" && transparent) exportAPNG(scale, true);
else if (fmt === "gif") exportGIF(scale, false);
```

Render transparente (sin relleno de tema ni grilla):

```js
c.clearRect(...);
// no fill de T.bg si opts.transparent
// grilla omitida si opts.transparent
```

Encoder:

```js
await ensureUPNG(); // pako + UPNG desde jsDelivr
const png = UPNG.encode(bufs, w, h, 0, dels); // 0 = lossless RGBA
```

---

## 7. Cómo probar

1. Hard refresh (caché SW `v10+`).
2. Exportá **APNG** con fondo transparente.
3. Abrí el `.png` en el navegador o embebelo sobre un fondo de color: debe animar **sin** flash negro y con bordes suaves donde el canvas use alpha.
4. GIF sin transparencia → `.gif` opaco, sin flash.

---

## 8. Idea final

> **El flash negro es del GIF transparente. Para alpha limpio usá APNG; el GIF opaco queda para compatibilidad.**

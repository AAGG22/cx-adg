# Parpadeo negro en GIF — diagnóstico y solución

El flash negro entre fotogramas **no viene del CSS ni del canvas oscuro de la app**. Viene de cómo el formato GIF (y el encoder) tratan el **disposal method** de cada frame, sobre todo con transparencia.

---

## 1. Síntoma

Al reproducir un GIF exportado (sobre todo con **Fondo transparente**), entre un frame y el siguiente aparece un destello negro (o del color de fondo del contenedor) antes de pintar el siguiente fotograma.

No se arregla cambiando padding, cards ni el color `#12151c` del layout donde se embebe el GIF.

---

## 2. Causa (formato GIF)

Cada frame GIF puede declarar qué hacer con los píxeles **después** de mostrarlo:

| Código | Nombre | Comportamiento |
|--------|--------|----------------|
| **0** | Unspecified / no action | Depende del viewer; suele dejar como está |
| **1** | Do not dispose / leave as is | Deja el frame; el siguiente se pinta encima |
| **2** | Restore to background | **Borra** la zona del frame al color de fondo (casi siempre negro) y recién después pinta el siguiente |
| **3** | Restore previous | Restaura el estado anterior al frame actual |

Con **disposal = 2**, el visor limpia a fondo negro entre frames → **parpadeo negro**.

Además, GIF solo tiene **transparencia de 1 bit** (píxel opaco o transparente), sin alpha suave como PNG/WebP. Eso empeora el efecto al animar sobre fondos claros u oscuros.

### Por qué pasaba en cx-adg

La exportación usa [gif.js](https://github.com/jnordberg/gif.js). En su encoder:

> Default is **0** if no transparent color has been set, otherwise **2**.

Si marcás transparencia, el encoder fuerza **disposal 2** salvo que se sobrescriba. Cada frame se renderiza completo en un canvas offscreen, pero el archivo GIF igual pedía “restaurar al fondo” entre frames.

---

## 3. Solución en el código

En `exportGIF()`, al agregar cada fotograma se fuerza **disposal 1** (*leave as is*):

```js
gif.addFrame(off, {
  copy: true,
  delay: Math.round(1000 / fps),
  dispose: 1, // do not dispose — evita flash negro de disposal 2
});
```

`dispose` es una opción documentada de `addFrame` en gif.js. El encoder la escribe en la Graphic Control Extension y **pisa** el default 2 cuando hay color transparente.

Cada frame de cx-adg ya es un dibujo completo del diagrama (no es un delta parcial), así que “dejar el frame anterior y pintar el nuevo encima” es correcto y elimina el flash.

---

## 4. Transparencia: límites y trade-offs

| Opción | Flash negro | Notas |
|--------|-------------|--------|
| GIF opaco + `dispose: 1` | No | Recomendado para compartir animaciones |
| GIF transparente + `dispose: 1` | No | Puede dejar **rastros** si hay píxeles transparentes sobre animación (puntos de flujo); el frame nuevo no “limpia” el anterior en esas zonas |
| GIF transparente + `dispose: 2` | **Sí** | Comportamiento viejo de gif.js; evitar |
| **APNG / WebP animado** | No | Alpha real; mejor si necesitás fondo transparente limpio |

GIF no es ideal para animación con transparencia suave. Para bordes limpios o alpha, preferí **PNG** (estático) o, a futuro, export APNG/WebP.

---

## 5. Si reexportás fuera de la app

En Photoshop u otros editores:

1. Abrí la animación / timeline.
2. Revisá **Frame disposal** / **Dispose**.
3. Usá **Do not dispose** / **Leave as is**, no **Background** / **Restore to background**.
4. Reexportá el GIF.

Herramientas de inspección (p. ej. GIF inspectors online) muestran el disposal de cada frame: deberías ver **1**, no **2**.

---

## 6. Cómo verificar en cx-adg

1. Exportá un GIF **sin** transparencia → no debe parpadear negro.
2. Exportá **con** transparencia → el flash negro típico de disposal 2 no debería aparecer.
3. Opcional: inspeccioná el archivo; Graphic Control Extension → disposal method = 1.

Tras desplegar, si el service worker cachea `index.html`, hace falta bump de caché (`sw.js`) y recarga forzada para tomar el cambio.

---

## 7. Flujo resumido

```
render frame completo en canvas offscreen
        ↓
gif.addFrame(..., { dispose: 1 })
        ↓
GCE del GIF: “leave as is”
        ↓
Viewer pinta frame N+1 encima sin borrar a negro
```

Sin el override:

```
transparent color set → gif.js default dispose 2
        ↓
Viewer: clear to background (negro) → flash → paint next frame
```

---

## 8. Relación con otras piezas

| Pieza | Rol |
|-------|-----|
| `exportGIF()` | Genera frames y llama a gif.js |
| `gifOpts.transparent` | Color clave (chroma) para transparencia 1-bit |
| `dispose: 1` | Corrige el parpadeo |
| Canvas / CSS de la app | **No** son la causa del flash entre frames del archivo |

Documentación relacionada: stack en `docs/cx_stack.md` (export GIF vía gif.js); canvas en `docs/cx_canvas.md`.

---

## 9. Idea final

> **El negro entre frames es disposal 2 del GIF, no tu UI. Forzá leave as is (`dispose: 1`). Si necesitás transparencia animada de verdad, mirá APNG o WebP.**

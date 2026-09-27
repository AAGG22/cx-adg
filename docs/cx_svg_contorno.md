# Color de contorno en SVG — guía rápida

Cuando seleccionás una imagen SVG (p. ej. turbinas de `svg/`), el panel muestra **Color de contorno (SVG)**.

## Paleta

Igual que **Color del texto**:

| Opción | Efecto |
|--------|--------|
| **Original** | Contornos del archivo (sin tintar) |
| Colores semánticos | Misma `PALETTE` (Servicio, Kafka, Datos…) |
| Claro / Oscuro / Negro / Blanco | Misma `TEXT_COLORS` |

## Modelo

```json
{
  "shape": "image",
  "img": "data:image/svg+xml,...",
  "strokeColor": "#6a9fb5"
}
```

`strokeColor: null` o ausente = original. El `img` **siempre** guarda el SVG original (nunca un blob tintado).

## Cómo funciona (pipeline único)

1. Solo aplica a nodos `image` cuyo `img` es un data URL SVG.
2. `applySvgStrokeColor` (DOMParser) es la **única** fuente de verdad:
   - Reescribe CSS (`stroke`, fills oscuros tipo `#222222`)
   - Hornea `fill` en `#outline` / `*-outline` y quita clases (`.st5`) para que el CSS no pise el color
   - Inserta `<style id="cx-outline-tint">` de refuerzo
3. **Canvas:** el XML tintado se sirve como **Blob URL** cacheado por `nodeId` (no data-URL gigante). Al cambiar el color se revoca el blob anterior.
4. **Export SVG:** mismo `applySvgStrokeColor`, aplicado **después** de uniquificar ids (`n7-outline`, etc.).
5. No toca fills de color vivos (rojo, verde, etc.).

## Caso `bateria1.svg`

Ese icono dibuja el contorno con **`fill:#222222`** en el grupo `#outline` (clase `.st5`), no con `stroke` (los strokes están en capas `display:none`). Por eso hace falta tintar fills oscuros y hornear el atributo, no solo strokes.

## Uso

1. Insertá un SVG (Iconos → Proyecto, o Imagen).
2. Seleccionálo.
3. Elegí un swatch en **Color de contorno (SVG)**.
4. Si no ves el cambio: **Ctrl+Shift+R** (el service worker debe ser ≥ v31; el HTML va network-first).

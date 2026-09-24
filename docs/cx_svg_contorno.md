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

`strokeColor: null` o ausente = original.

## Cómo funciona

1. Solo aplica a nodos `image` cuyo `img` es un data URL SVG.
2. Recolorea:
   - **`stroke`** en CSS y atributos
   - **`fill` oscuros** de line-art (p. ej. `#222222` en `#outline` de SVG Repo)
   - Un `<style id="cx-outline-tint">` embebido como refuerzo
3. No toca fills de color (rojo, verde, etc.).
4. El resultado se cachea y se usa en canvas y export SVG.

## Caso `bateria1.svg`

Ese icono dibuja el contorno con **`fill:#222222`** en el grupo `#outline`, no con `stroke` (los strokes están en capas `display:none`). Por eso hace falta tintar fills oscuros, no solo strokes.

## Uso

1. Insertá un SVG (Iconos → Proyecto, o Imagen).
2. Seleccionálo.
3. Elegí un swatch en **Color de contorno (SVG)**.

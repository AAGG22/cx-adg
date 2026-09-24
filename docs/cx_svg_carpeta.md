# SVGs de la carpeta `svg/` — guía rápida

## Por qué no cargaban

1. **`xmlns` incorrecto** en los archivos (`http://w3.org` en vez de `http://www.w3.org/2000/svg`). El navegador no los trata como SVG.
2. La app **no leía** la carpeta `svg/`: solo tenía iconos embebidos en `ICONS`.

## Cómo usarlos ahora

1. Serví el proyecto por HTTP (`npx serve . -p 3000`), no con `file://`.
2. **Iconos** → sección **Proyecto (svg/)** → elegí Turbina 2 / Turbina 3 → clic en el lienzo.
3. También: botón **Imagen**, arrastrar el `.svg` al lienzo, o pegar.

## Agregar un SVG nuevo

1. Poné el archivo en `svg/mi-icono.svg` con `xmlns="http://www.w3.org/2000/svg"`.
2. Sumalo a `CUSTOM_SVGS` en `index.html`:

```js
{ id: "mi-icono", path: "./svg/mi-icono.svg", n: "Mi icono" }
```

3. Opcional: agregá la ruta en `ASSETS` de `sw.js` para precache PWA.

## Nota sobre animación CSS

Las animaciones CSS dentro del SVG (p. ej. rotor girando) **no se ven en el canvas**: `drawImage` rasteriza un fotograma. Quedan quietas en el diagrama. Para animar habría que otro enfoque (frames o dibujo manual).

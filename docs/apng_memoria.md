# APNG: calidad, memoria y duración

## Por qué se cortaba a ~2,5 s

`upng-js@2.1.0` (CDN) reserva el buffer de salida como  
`frameBytes × numFrames + 100`. Si el PNG comprimido + chunks APNG
supera ese tamaño, **trunca el archivo**. El visor deja de animar a
mitad → suele verse ~2–3 s aunque hayas pedido 8 s.

## Solución actual

1. Encoder **Photopea UPNG** en `vendor/UPNG.js` (calcula el tamaño exacto).
2. **Prioridad resolución**: techo ~1920px de lado largo, piso ~960px.
3. Si no entra en RAM (~150 MB): menos frames con delay más largo (misma duración).
4. Barra 0–100%; verifica frames y duración; nombre `slug-8s.png`.

## Memoria

`ancho × alto × 4 × frames`. Para un diagrama ~2000×900 a 8 s suele quedar
cerca de **1920×850** con ~24–40 frames (delay ~200–330 ms).

## Cómo exportar

1. **Ctrl+Shift+R** (caché SW v24)
2. APNG, escala **1x**, duración pedida, transparente OFF
3. En progreso debería verse algo como `1920×853 · … frames`
4. Archivo `…-8s.png` — en React/Next sirve con `<img src="…png">`

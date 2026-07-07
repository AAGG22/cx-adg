# Nombre de pestaña al abrir un archivo — guía didáctica

Cuando abrís un `.json` o `.cx-adg.json`, la pestaña inferior muestra el **nombre del archivo** (sin extensión) en lugar de «Página 1», «Página 2», etc.

---

## 1. El problema

El documento guarda las páginas así:

```js
doc = {
  theme: "dark",
  cur: 0,
  pages: [
    { name: "Página 1", nodes: [...], edges: [...], nextId: 42 },
    { name: "Página 2", nodes: [...], edges: [...], nextId: 10 }
  ]
};
```

La barra de pestañas (`#pagesBar`) lee `pg.name` de cada página:

```js
name.textContent = pg.name;
```

Al abrir un archivo nuevo, el JSON traía nombres genéricos (`Página 1`) o el formato viejo (v1) creaba siempre `blankPage("Página 1")`. El usuario no veía **de qué archivo venía** el diagrama.

---

## 2. La idea de la solución

El navegador, al elegir un archivo, expone `file.name` (ej. `dispersion-pagos.cx-adg.json`).

Después de cargar el JSON en memoria, **renombramos las pestañas** usando ese nombre:

| Archivo | Nombre en la pestaña |
|---------|----------------------|
| `dispersion-pagos.cx-adg.json` | `dispersion-pagos` |
| `api-gateway.json` | `api-gateway` |
| `borrador.cx-adg` | `borrador` |

---

## 3. Funciones nuevas

### 3.1 Quitar la extensión del archivo

```js
function nameFromFile(fileName) {
  const n = String(fileName || "");
  return n
    .replace(/\.cx-adg\.json$/i, "")
    .replace(/\.json$/i, "")
    .replace(/\.cx-adg$/i, "")
    || "diagrama";
}
```

El orden importa: primero `.cx-adg.json`, después `.json` suelto.

### 3.2 Detectar nombres por defecto

Si el JSON tiene **varias páginas** con nombres personalizados («Intro», «Detalle»), no los pisamos.

Solo renombramos pestañas que siguen el patrón automático:

```js
function isDefaultPageName(name) {
  return /^Página \d+$/i.test(String(name || "").trim());
}
```

### 3.3 Aplicar el nombre a las páginas cargadas

```js
function applyPageNamesFromFile(fileName) {
  const base = nameFromFile(fileName);

  if (doc.pages.length === 1) {
    doc.pages[0].name = base;
    return;
  }

  doc.pages.forEach((pg, i) => {
    if (isDefaultPageName(pg.name)) {
      pg.name = i === 0 ? base : `${base} (${i + 1})`;
    }
  });
}
```

| Situación | Resultado |
|-----------|-----------|
| 1 página | Siempre usa el nombre del archivo |
| Varias páginas con «Página 1», «Página 2» | `archivo`, `archivo (2)`, `archivo (3)`… |
| Varias páginas con nombres propios guardados | Se conservan |

---

## 4. Dónde se engancha al abrir archivo

El input oculto `#fileIn` dispara la carga:

```js
$("fileIn").onchange = ev => {
  const f = ev.target.files[0];
  if (!f) return;

  f.text().then(txt => {
    try {
      applyProjectData(JSON.parse(txt), { fileName: f.name });
      saveAutosave(true);
      fitWorkAreaView();
    } catch (e) {
      alert("El archivo no es un diagrama cx-adg válido.");
    }
  });

  ev.target.value = ""; // permite volver a abrir el mismo archivo
};
```

La clave es el segundo argumento: `{ fileName: f.name }`.

---

## 5. Cambio en `applyProjectData`

Antes solo parseaba el JSON. Ahora acepta opciones:

```js
function applyProjectData(d, opts = {}) {
  // ... cargar doc, nodos, edges, settings ...

  if (opts.fileName) {
    applyPageNamesFromFile(opts.fileName);
  }

  syncProjectControls();
  clearSel();
  renderTabs();  // ← redibuja pestañas con los nombres nuevos
}
```

**Importante:** `applyPageNamesFromFile` solo se llama al **abrir desde disco**, no al restaurar autoguardado ni al crear una página nueva con «＋».

---

## 6. Flujo completo (diagrama)

```
Usuario pulsa 📂 Abrir
        ↓
Elige dispersion-pagos.cx-adg.json
        ↓
fileIn.onchange → lee texto → JSON.parse
        ↓
applyProjectData(data, { fileName: "dispersion-pagos.cx-adg.json" })
        ↓
doc.pages[0].name = "dispersion-pagos"
        ↓
renderTabs() → pestaña muestra «dispersion-pagos»
```

---

## 7. Pestañas que no vienen del archivo

| Acción | Nombre de pestaña |
|--------|-------------------|
| Primera visita / app vacía | `Página 1` |
| Botón «＋» nueva página | `Página 2`, `Página 3`, … |
| Doble clic en pestaña | El usuario edita con `prompt()` |
| Abrir archivo | Nombre del archivo (esta guía) |
| Restaurar autoguardado | Nombres que ya tenía en sesión |

---

## 8. Cómo probarlo

1. Guardá un diagrama como `mi-arquitectura.cx-adg.json`.
2. Recargá la app o abrí otra pestaña del navegador.
3. **📂 Abrir** → elegí ese archivo.
4. La pestaña inferior debe decir `mi-arquitectura`, no `Página 1`.

---

## 9. Ejercicio para practicar

1. Cambiá `nameFromFile` para que reemplace guiones por espacios (`mi-arquitectura` → `mi arquitectura`).
2. Abrí un JSON con dos páginas nombradas `Página 1` y `Página 3` y verificá el resultado.
3. Guardá un JSON con páginas `Intro` y `Detalle`, abrilo y confirmá que **no** se renombran.

---

## 10. Archivos relacionados

| Archivo | Rol |
|---------|-----|
| `index.html` → `blankPage`, `applyPageNamesFromFile`, `applyProjectData`, `renderTabs` | Lógica completa |
| `#pagesBar` en el HTML | Contenedor de pestañas en el footer |
| `serializeProject()` | Al guardar, persiste `pg.name` dentro del JSON |

---

## 11. Idea final

> **El nombre de la pestaña es solo un campo `name` en cada página. Abrir un archivo es la ocasión perfecta para sincronizarlo con el nombre del fichero en disco.**

Si entendés eso, podés extender el comportamiento (por ejemplo, actualizar la pestaña al guardar «Guardar como…» con otro nombre).

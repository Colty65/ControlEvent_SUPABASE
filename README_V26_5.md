# ControlEvent v26.6 - reducción inicial de index.html

Versión basada en v26.4. Objetivo: empezar a aligerar `public/index.html` sin tocar lógica de negocio.

## Cambios principales

- Se extraen los 41 bloques `<style>` de `public/index.html` a `public/app/styles/app.css`.
- Se extraen 5 imágenes Base64 embebidas del HTML a `public/assets/embedded/`.
- Se actualiza el Service Worker a `controlevent-shell-v26-6` y se cachean los nuevos assets.
- Se mantiene el orden de los estilos legacy para respetar precedencias.
- Se actualizan cadenas de versión a `ControlEvent v26.6` / `ControlEvent_v26_6`.

## Métrica de index.html

- v26.4: 21,412 líneas; 1,418,313 bytes.
- v26.6: 20,393 líneas; 1,166,152 bytes.
- Reducción: 1,019 líneas; 252,161 bytes.

El fichero CSS extraído tiene 1,062 líneas.

## Prueba local

```powershell
npm install
npm run dev:supabase
```

Abrir `http://localhost:3030`.

## Diagnóstico

En consola:

```js
ControlEventDiagnostics.inspect().indexHtml
ControlEventDiagnostics.print()
```

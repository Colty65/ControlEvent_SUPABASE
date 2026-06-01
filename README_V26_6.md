# ControlEvent v50.24 - Index slim legacy JS

## Objetivo

Seguir adelgazando `public/index.html` sin cambiar comportamiento funcional.

## Cambios principales

- Se extraen los 63 bloques `<script>` inline legacy del `index.html`.
- Se crean 63 ficheros JS clásicos en `public/app/legacy/`.
- Se mantiene el orden exacto de ejecución mediante etiquetas `<script src="...">` en la misma posición del HTML.
- El `index.html` queda sin bloques `<style>` y sin scripts inline con contenido.
- Se actualiza la versión a `ControlEvent v50.24`.
- Se actualiza caché PWA a `controlevent-shell-v50-24`.
- Diagnóstico actualizado con métricas de adelgazamiento de v26.5 y v26.9.

## Métricas

| Versión | Líneas `index.html` | Bytes `index.html` |
|---|---:|---:|
| v26.4 | 21.412 | 1.418.313 |
| v26.5 | 20.392 | 1.166.152 |
| v26.9 | 570 | 27.229 |

Reducción de v26.5 a v26.9:

- 19.822 líneas menos.
- 1.138.923 bytes menos.
- 63 scripts legacy extraídos a ficheros externos.

Reducción acumulada desde v26.4:

- 20.842 líneas menos.
- 1.391.084 bytes menos.

## Prueba recomendada

```powershell
npm run dev:supabase
```

Abrir:

```text
http://localhost:3030
```

Comprobar en consola:

```js
ControlEventDiagnostics.inspect().indexHtml
ControlEventDiagnostics.print()
```

## Notas

Esta versión no elimina lógica legacy. Sólo mueve el JavaScript inline a ficheros externos para que el `index.html` quede como carcasa real y sea más fácil seguir modularizando.

# ControlEvent v18.11.10_prod · Zuzu flujo, versión y layout

Corrección de saneamiento después de detectar que en pruebas seguían apareciendo síntomas de versión vieja: título `ControlEvent v18_prod`, botones inferiores sin mover, PDF con nombre antiguo `ControlEvent - Respuesta de Zuzu.pdf`, pérdida de traza y error visual `HTTP 200`.

## Cambios

- Badge visible fijo en pantalla: `v18.11.10_prod · build`.
- Badge visible dentro de la ventana de Zuzu.
- Hardlock final cargado al final de `index.html` para que ningún script viejo pise versión ni layout.
- `/api/version` queda alineado con `v18.11.10_prod`.
- `ControlEventVersionCheck()` compara front y API.
- Herramientas inferiores Excel / Carga / Descarga / Mantenimiento se fuerzan a columna lateral izquierda.
- Zuzu ya no convierte una respuesta `ok=false` con HTTP 200 en el mensaje inútil `HTTP 200`; pinta la respuesta y la traza si existen.
- Traza técnica Zuzu/CE/Gemini abierta por defecto para las pruebas.
- PDF recupera nombre compuesto con versión, asunto y timestamp.
- Refuerzo de detección de “socios que no estarán / no estarán en el evento”.
- PERSONAS con `Grupo...`, `Personas...`, `z_de...`, `z_DEV...` quedan excluidas del cálculo de socios no asistentes.
- Service Worker neutralizado y eliminación de caches anteriores.

## Prueba rápida tras desplegar

1. Abrir la app y confirmar que arriba aparece el badge `v18.11.10_prod`.
2. Ejecutar en consola:

```js
ControlEventVersionCheck()
```

Debe devolver `ok: true`.

3. Abrir Zuzu y comprobar que en el modal aparece `v18.11.10_prod`.
4. Preguntar por datos + socios que no estarán + parte meteorológico.
5. Confirmar que aparece traza técnica y que el PDF se nombra con `ControlEvent_v18_11_10_prod-responde_Zuzu_a_...`.

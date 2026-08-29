# ControlEvent v4_0_exp · BANK4_26

## Objetivo

Cerrar dos problemas perceptivos sin tocar el circuito de captura de voz:

1. La unidad tipada del DATASET manda sobre la redacción final: un campo `count` no puede salir como euros.
2. La capa de oralización prepara el texto para TTS con pronunciación y prosodia humanas.

## Cambios de voz (solo salida TTS)

- `26 °C` → `veintiséis grados`.
- `55 %` → `cincuenta y cinco por ciento`.
- `18 km/h` → `dieciocho kilómetros por hora`.
- `1015 hPa` → `mil quince hectopascales`.
- `4ºs Final` conserva semántica ordinal (`cuartos de final`), separada del símbolo de grados `°`.
- Los importes con céntimos ya no se truncan: `598,44 €` se oraliza con euros y céntimos.
- La prosodia se segmenta por cláusulas: coma (pausa corta), dos puntos/punto y coma (media), fin de frase (larga).
- Las horas (`18:30`) y números decimales no se rompen por su puntuación interna.
- Se reduce el riesgo de corte del navegador dividiendo cláusulas largas en espacios, nunca a mitad de palabra.

No se modifica reconocimiento, micrófono, Voz CE, barge-in, wake word ni fallback.

## Unidades tipadas

`dataset.columnTypes` se usa como autoridad final. Para campos `count`, `quantity`, `number`, `percent` o `date`, se elimina cualquier euro introducido por la redacción final tanto si aparece antes como después del valor. Los `count` enteros se normalizan sin `,00`.

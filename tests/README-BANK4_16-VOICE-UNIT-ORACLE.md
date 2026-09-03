# BANK4_16 · Voice Unit Oracle

Objetivo: impedir que la capa hablada convierta años, recuentos u otras cifras no monetarias en euros.

Cambios principales:
- La respuesta escrita queda como fuente semántica autoritativa para TTS.
- El cliente solo humaniza como dinero cifras que ya llevan marcador monetario explícito.
- El servidor compara `spoken_answer` con `written_answer`; si detecta euros añadidos a cifras no monetarias, usa la respuesta escrita como voz segura y conserva la voz original para auditoría.
- Los años incrustados en nombres canónicos de eventos se restauran desde el catálogo antes de presentar.
- El prompt final compacto vuelve a declarar explícitamente la diferencia entre amount, units, count, años, fechas y nombres.

Regresión: `node scripts/v4-1-exp-bank416-voice-unit-oracle-regression.cjs`.

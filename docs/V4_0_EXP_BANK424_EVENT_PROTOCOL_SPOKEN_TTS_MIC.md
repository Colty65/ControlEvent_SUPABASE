# BANK4_24 · EVENT protocol + spoken TTS + mic fallback

1. Canonicaliza tokens de dominio del protocolo compacto (event→events, product→products, purchase→purchases, donation→donations, store→stores, document(s)→documentation). No interpreta lenguaje del usuario; corrige vocabulario del contrato interno.
2. La voz vuelve a usar `spokenAnswer` certificado por el servidor. La pantalla sigue intacta. Si el spoken añade un importe numérico no presente como dinero en pantalla, el cliente conserva el fallback escrito.
3. `nombre_hablado` de `ce_eventos` puede por fin llegar al TTS, porque BANK4_23 ya lo aplicaba en servidor pero VOICE-V53 descartaba esa salida y leía siempre `answer`.
4. Web Speech cambia a Voz CE ante `audio-capture`, dos `no-speech` consecutivos o dos fallos de arranque no relacionados con permisos.
5. No requiere SQL adicional.

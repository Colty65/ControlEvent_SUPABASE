# ControlEvent v4_0_exp · BANK4_20 · PERSONAS SOCIALES + ENTRETENIMIENTO FONÉTICO

## Objetivo

1. Sacar motes/sobrenombres del código y convertirlos en datos mantenibles.
2. Resolver el alias exacto antes del fuzzy general de PERSONAS.
3. Permitir altas/modificaciones con `Nombre amigo` y varios aliases.
4. Conservar identidad social en BACKUP/RESTORE.
5. Hacer las microfrases de espera más humanas: onomatopeyas largas con velocidad propia y pausas reales.

## SQL obligatorio

Ejecutar una vez:

`sql/ControlEvent_SQL_BANK4_20_PERSONAS_SOCIALES.sql`

Crea `ce_personas.nombre_amigo` y `ce_persona_aliases`, y siembra los sobrenombres confirmados el 29/08/2026.

## Mantenimiento PERSONAS

- Nombre: identidad canónica.
- Nombre amigo: forma habitual preferida al hablar.
- Otros nombres / motes: lista separada por coma o punto y coma.
- Rango: igual que antes.

La entrada hablada/escrita intenta primero coincidencia exacta de `Nombre amigo`/alias. Solo si no existe entra el fuzzy general. Alias ambiguos como `Paco` conservan la ambigüedad.

## Voz

La espera mantiene el intervalo inicial anterior (~3,3 s) y un máximo de una microfrase por turno. Las onomatopeyas usan segmentos TTS con velocidad propia. `Ummmmm` se sintetiza como `uuuummmmmmmmmm` a rate 0.42, seguido de pausa real y una frase de pensamiento algo más completa.

# BANK4_17 · Human Speech Lexicon

Objetivo: mantener nombres canónicos exactos en pantalla/datos y usar una capa exclusivamente oral para que Zuzu hable como una persona del grupo.

- `SySA 2026` se pronuncia `Santiago y Santa Ana de este año` cuando el año local es 2026.
- Los sufijos visuales de mes/año (`- MAY26`, `DIC25`, etc.) no se pronuncian.
- Numerales romanos visuales se humanizan: `IV Jornada` -> `cuarta Jornada`; `PORRETA LIX` -> `PORRETA 59`.
- `vs` se pronuncia `contra`; `(by Betunero)` se vuelve `de Betunero`.
- Las personas pueden usar apodos/hipocorísticos configurados con frecuencia no determinista aparente pero estable por turno. La lógica vive en un motor genérico y el vocabulario social en `config/zuzu-human-language.json`.
- La pantalla y el Ledger siguen usando los nombres canónicos: los alias no modifican BBDD, filtros, DATASET ni VIEW.
- BANK4_16 sigue actuando antes: primero se protege la unidad monetaria; después se humanizan nombres en voz.

Regresión: `node scripts/v4-1-exp-bank417-human-speech-regression.cjs`.

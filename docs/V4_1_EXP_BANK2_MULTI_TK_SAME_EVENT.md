# v4.1_exp · BANK2 · varios TKxx del mismo evento en un movimiento

## Problema real detectado
Un movimiento ya podía compartirse entre eventos, pero una combinación real mostró que al existir un TKxx ya asociado no se podía guardar otro TKxx del mismo evento. Además, la UI bloqueaba cualquier suma de justificantes que superase aunque fuese mínimamente el importe del movimiento bancario.

## Modelo definitivo
- Movimiento bancario: único.
- Puede tener N TKxx del mismo evento y/o de varios eventos.
- Un TKxx solo puede pertenecer a un movimiento: unicidad `(event_id, ticket_code)`.
- La suma de TKxx puede quedar por debajo o por encima del importe bancario.
- Mientras la diferencia no sea cero, el estado global sigue pendiente.
- La diferencia puede aceptarse explícitamente en ambos sentidos; jamás se reparte artificialmente a un evento.

## Ejemplos
- Banco 120,00; TKxx 118,56 -> pendiente 1,44 hasta aceptar diferencia.
- Banco 135,00; TKxx 135,68 -> pendiente por exceso 0,68 hasta aceptar diferencia.
- Banco 135,68; TK01 130,68 + TK15 5,00 -> cuadrado exacto y ambos vínculos se conservan.

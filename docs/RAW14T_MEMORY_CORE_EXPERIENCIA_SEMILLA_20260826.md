# ControlEvent v4_0_exp · RAW14T · Memory Core DB + semilla de Experiencia CE

Fecha: 26/08/2026

## Alcance de esta pieza

RAW14T no intenta construir todavía el aprendizaje completo de CE. Limpia primero la base de memoria y deja una huella anónima reutilizable para la futura capa Experiencia.

## Memoria histórica: una sola verdad

- La memoria histórica personal se obtiene únicamente de `ce_zuzu_conversations` + `ce_zuzu_turns`.
- `ce_meta` puede continuar como compatibilidad del ledger técnico, pero no crea ni recupera recuerdos.
- El navegador conserva referencias ligeras de sesión; nunca es fuente histórica.
- Si las tablas persistentes de memoria no están disponibles, Zuzu no inventa que recuerda: la búsqueda histórica devuelve vacío.
- Cada candidato y episodio transporta `memory_source=db` y la traza deja visible el origen.

## Orden humano de recuperación

- Los candidatos se recorren normalmente de más joven a más viejo.
- Si una pista contextual es claramente mejor (persona/tema/plan), puede elevar un recuerdo más antiguo.
- En referencias amplias recientes como «últimamente», la recencia exige una ventaja semántica mayor para ser desplazada.
- Una vez elegida UNA conversación, el episodio se reconstruye internamente de principio a fin, porque leer una conversación al revés no tendría sentido.

## Preparación de memoria multidimensional sin invadir conversaciones

Nuevos campos:

- `memory_visibility` en conversación y turno. RAW14T usa `private` por defecto y no habilita recuerdos cruzados.
- `memory_experience_signature` en turno.

La `memory_experience_signature` es una huella anónima NHC. Puede contener:

- acción;
- dominio(s);
- tipo de scope;
- tipo de respuesta;
- roles de entidades (PERSON, STORE, etc., nunca sus valores);
- tipos de operaciones;
- número de entidades;
- bucket del tamaño del resultado;
- `shape_id` estable de esa estructura.

No contiene usuario, pregunta literal, respuesta literal, nombre de persona, evento, tienda, producto ni cifras de negocio. Esta huella es únicamente la semilla para que, en una versión posterior, CE pueda aprender qué caminos de consulta suelen resultar útiles sin revelar quién los recorrió.

## NHC / reutilización futura

La huella describe una estructura de interacción, no un caso concreto. Por tanto puede servir en el futuro a `Zuzu Core` independientemente del adaptador ControlEvent.

## SQL

Ejecutar `sql/ce_zuzu_memory_raw14t.sql` después del SQL RAW14Q ya aplicado.

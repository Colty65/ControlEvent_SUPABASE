# ControlEvent v6_1-exp · Universal Contract Core + Domain Adapter

## Objective
Make the cognitive architecture reusable across unrelated applications without encoding domain names or user phrases in the generic core.

## Runtime flow

User text
→ Gemini sovereign interpreter
→ **small fixed universal JSON contract**
→ mechanical validation against `domain_manifest`
→ domain adapter execution
→ certified evidence
→ Gemini synthesis

## Universal contract
The Gemini response schema is fixed and domain-cardinality invariant. It contains only generic structural fields such as:

- `thread_mutation`
- `capability_assessment`
- `execution_intent.status`
- `execution_intent.pipeline[]`
- generic primitive IDs (`FETCH`, `FILTER`, `SORT_LIMIT`, `VISUALIZE`)
- opaque `entity_name` and field IDs as strings
- `assistant_response`

The schema does **not** enumerate ControlEvent entities or fields.

## Domain manifest
ControlEvent-specific structure lives in `services/zuzu-v6-controlevent-domain.service.js`:

- entities
- fields
- relationships
- canonical metrics
- supported capabilities
- limits
- presentation types

Gemini reads those identifiers as runtime data. CE validates returned IDs mechanically against the manifest before executing them.

## Hard-code rule
The generic core must not contain:

- domain entity names
- domain field names
- names of people/events
- examples of user wording
- phrase detectors
- keyword/regex intent logic

The physical ControlEvent data mapping may remain domain-specific in the host adapter layer; it must not interpret natural language.

## Schema cardinality invariant
`buildV6DecisionSchema()` and `buildV6SynthesisSchema()` produce the same schemas for a domain with 1 entity or 500 entities.

Current static sizes:

- Decision schema: ~3.2 KB
- Synthesis schema: ~3.1 KB

This removes the Gemini `HTTP 400: schema has too many states for serving` failure caused by embedding the complete domain ontology into the schema.

# ControlEvent · autorizador para ZIS

Este módulo pertenece a ControlEvent. ZIS únicamente lo consulta.

## Objetivo

Conservar el modelo de permisos actual de ControlEvent sin crear una segunda matriz de seguridad:

- `READ`: GD, RW y RO.
- `WRITE`: GD y RW.
- `ADMIN`: solo GD.

La identidad recibida se resuelve contra los usuarios reales de ControlEvent mediante `auth.service`; el nivel enviado por el llamante no se toma como autoridad.

## Endpoints

### `GET /api/zis/authorization-contract`
Devuelve el contrato y la versión de política, sin usuarios ni secretos.

### `POST /api/zis/authorize`
Ejemplo:

```json
{
  "actor": { "identificacion": "Colty" },
  "operation": "READ",
  "capability": "evidence.ticket.view",
  "resource": { "event_id": "...", "ticket": "TK03" }
}
```

Respuesta:

```json
{
  "decision": "ALLOW",
  "allowed": true,
  "policy_version": "CE_ROLE_V1",
  "actor": { "identificacion": "Colty", "nivel": "GD" },
  "operation": "READ",
  "capability": "evidence.ticket.view"
}
```

## Principio

El endpoint no decide permisos nuevos para ZIS. Traduce la política vigente GD/RW/RO de ControlEvent a `ALLOW` o `DENY`. Si en el futuro ControlEvent centraliza reglas más detalladas, este servicio debe delegar en esas mismas reglas y no duplicarlas.

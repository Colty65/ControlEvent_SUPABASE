# ControlEvent · ZIS Authorization V1

Se añade a ControlEvent el autorizador que ZIS consultará antes de acceder a capacidades protegidas.

## Política actual, sin rediseñar CE

- READ: GD / RW / RO
- WRITE: GD / RW
- ADMIN: GD

La identificación recibida se resuelve contra los usuarios reales de ControlEvent. El nivel enviado por el consumidor no se usa como autoridad.

## Endpoints

- `GET /api/zis/authorization-contract`
- `POST /api/zis/authorize`

El endpoint pertenece a ControlEvent. ZIS solo lo invoca.

## Ficheros añadidos

- `services/ce-role-policy.service.js`
- `services/zis-authorization.service.js`
- `routes/zis-authorization.routes.js`
- `docs/ZIS_AUTHORIZATION_INTEGRATION.md`
- `scripts/zis-authorization-regression.mjs`

## Ficheros modificados

- `server/app.js`: registra la nueva ruta.
- `package.json`: añade `test:zis-authorization`.

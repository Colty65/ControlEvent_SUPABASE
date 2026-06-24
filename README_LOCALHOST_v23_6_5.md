# ControlEvent v15_prod localhost

Versión de estabilización local.

## Arranque

```bat
npm install
npm run dev
```

Abrir:

```text
http://localhost:3030
```

Usuarios iniciales:

```text
admin / admin  -> GD
rw / rw        -> RW
ro / ro        -> RO
```

## Datos que debes conservar

```text
data/state.json
data/access-users.json
uploads/ticket-images/
```

## Cambio importante v23.6.5

- El login ya no carga todo `state.json` antes de entrar.
- Se ignora el `localStorage` antiguo del navegador al arrancar.
- Las fotos base64 antiguas se migran a `uploads/ticket-images/` en el servidor local.
- El estado que recibe el navegador queda limpio: las fotos viajan como URLs/rutas, no como base64 pesado.

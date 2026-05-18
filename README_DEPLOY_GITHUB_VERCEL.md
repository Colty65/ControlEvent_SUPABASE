# Despliegue GitHub + Vercel

Esta version ya funciona en local contra Supabase. Para publicarla:

## 1. Subir a GitHub

Sube esta carpeta como repositorio:

```text
ControlEvent_v23_6_7_base_supabase_localhost
```

No subas:

- `.env`
- `node_modules`
- `data/state.json`
- `data/access-users.json`
- `uploads/ticket-images/`

Ya estan protegidos en `.gitignore`.

## 2. Importar en Vercel

1. Entra en Vercel.
2. New Project.
3. Importa el repositorio de GitHub.
4. Framework preset: Other.
5. No hace falta build command.

## 3. Variables de entorno en Vercel

En Project Settings > Environment Variables, crea:

```text
SUPABASE_URL=https://cdivaembvuwimnmfvyxm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SUPABASE_TICKET_BUCKET=ticket-images
```

No pongas `PORT` en Vercel.

## 4. Probar

Cuando termine el deploy, abre:

```text
https://TU-PROYECTO.vercel.app
https://TU-PROYECTO.vercel.app/api/health
https://TU-PROYECTO.vercel.app/api/diagnostics
```

Si `/api/health` devuelve `ok: true`, la app esta conectando con Supabase.

## Fotos

Las fotos no se guardan en GitHub ni Vercel. Se guardan en Supabase Storage, bucket:

```text
ticket-images
```

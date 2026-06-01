# ControlEvent v50.24 RESTORE LIMPIO

Paquete completo revisado para restaurar la versión estable v28.6.1 en GitHub/Vercel.

## Validaciones realizadas
- `package.json`: JSON válido.
- `package-lock.json`: JSON válido.
- `vercel.json`: JSON válido.
- 89 archivos `.js` revisados con `node --check`: OK.
- No incluye `node_modules`.
- No incluye `.git`.
- No incluye `.env.local` ni claves reales.
- Incluye `.env.example` sólo con placeholders.

## Instalación limpia recomendada
En tu carpeta real del repo conserva sólo:
- `.git`
- `.env.local`

Borra el resto y copia dentro el contenido de esta carpeta, de forma que `package.json` quede en la raíz del repo.

Después, en GitHub Desktop:
1. Commit: `Restaurar ControlEvent v50.24 estable`
2. Push origin

## Comprobación en producción
En consola del navegador:

```js
ControlEventDebug.status()
ControlEventExcel.info().excelJs.loaded
ControlEventActiveRender.print()
```

Debe indicar:
- `ControlEvent v50.24`
- `ExcelJS loaded: false`
- `ActiveRender enabled: false`

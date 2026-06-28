# ControlEvent v16_prod - OPT3D entrada reparada

Base: v16_prod + OPT2 validada + OPT3B.

Objetivo:
- Reparar la entrada al sistema sin tocar el flujo de login probado.
- Evitar que escribir/autorrellenar usuario/clave dispare refrescos pesados.
- Mantener la limpieza visual de la pantalla de login y la pantalla CE de presentación.

Cambios:
1. Se elimina la estrategia de OPT3C que envolvía login, fetch y renders.
2. No se bloquea `/api/state`, `/api/login`, `render`, `doLogin` ni funciones de datos.
3. Se añade una guardia temprana de inputs del login: escritura, autocompletado y pegado no suben a manejadores globales antiguos.
4. Se conserva el botón Entrar con los manejadores existentes de ControlEvent.
5. Se arregla el botón Ver/Ocultar clave cuando aparece dentro del login.
6. Login visual fijo y centrado; se ocultan cabecera/app/footer detrás del overlay.
7. Pantalla de presentación posterior limpia: icono ControlEvent central, sin textos.
8. Se conserva completa la OPT3B de Resumen presupuestario/globos/rendimiento.

No toca:
- compras
- donaciones como módulo
- ingresos
- documentos
- tickets
- planificación
- gráficas
- avance del evento

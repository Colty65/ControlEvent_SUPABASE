# Auditoría ControlEvent v3_0_exp · Gemini/CE + ITV + COMPRAS/DONACIONES

Fecha: 23/08/2026

## Objetivo de esta cirugía

Esta versión mantiene como principio de autoridad **INTERPRETAR, NO REESCRIBIR**: Gemini decide la semántica del turno; ControlEvent certifica entidades/ámbitos, traduce roles semánticos a campos físicos mediante capabilities y ejecuta. CE no cambia silenciosamente una persona, producto, evento o intención para "mejorar" lo que Gemini quiso decir.

A la vez se corrigen cuatro bloques concretos observados en las últimas baterías FULL-CERT y en la ventana de mantenimiento:

1. Contexto conversacional ofrecido a Gemini como candidatos, no como filtros implícitos.
2. Comparaciones de personas ejecutadas como personas, no como comparación de eventos.
3. ITV conserva el oráculo estructural importado desde Excel y normaliza el nombre de los JSON sin repetir `_exp`.
4. COMPRAS/DONACIONES separan de forma coherente Tienda y Donante en alta y mantenimiento.

## 1. COMPRAS / DONACIONES

### Contrato de negocio aplicado

- **COMPRAS**: usa `tiendaId`; `donorRef` se guarda vacío.
- **DONACIONES**: usa `donorRef`; `tiendaId` se guarda vacío.
- En una donación `DONADO TIENDA`, la tienda donante se representa en `donorRef` con la opción tipada `T:<id>`. No existe un segundo campo Tienda independiente.
- El desplegable **Donante** de mantenimiento reutiliza exactamente `window.donorOptions()`, la misma fuente que el alta. Así se conservan las mismas personas/tiendas, etiquetas y valores `P:` / `T:`.

### Interfaz

En edición/mantenimiento:

- DONACIONES: Producto · Unidades · Precio · Valor · Tipo de donación · **Donante**. No se renderiza Tienda.
- COMPRAS: Producto · Unidades · Precio · Importe · Ticket/Otros gastos · **Tienda**. No se renderiza Donante.
- Responsable permanece en una segunda fila, a la izquierda y con ancho suficiente para nombres individuales y parejas.
- La primera fila de edición queda en seis columnas proporcionales en escritorio; móvil conserva la disposición vertical existente.

### Persistencia defensiva

Además de ocultar el campo que no procede, los guardados RPC y los fallbacks limpian el campo opuesto para impedir residuos históricos invisibles:

- guardar donación => `tiendaId = ''`
- guardar compra => `donorRef = ''`

## 2. Contrato Gemini → CE

Se refuerza el prompt del Query Kernel con reglas generales, no ligadas a nombres concretos:

- CURRENT/RECENT/HISTORY son **candidatos de referencia**, no filtros activos.
- Una consulta colectiva/general sin pronombre o mención personal no hereda una persona anterior.
- `¿Y X?` sin predicado nuevo conserva el predicado/domain/scope/response_kind inmediatamente anterior y sustituye solo la entidad comparable.
- Un cambio explícito de asunto hace que el resto de la frase actual domine sobre el foco anterior.
- La forma interrogativa determina `response_kind`: whether / who / what / amount / which_event.
- Las comparaciones son tipadas por `group_role`.
- Las comparaciones relativas de ranking exigen `reference` + `operator`; CE no deduce por su cuenta el significado lingüístico de "más que X".
- Preguntas sobre personas con ingresos pendientes pertenecen al estado económico del evento (`event_summary`), no a `purchases` ni a una persona literal llamada "gente".

## 3. Comparación tipada de personas

Se añade ejecución específica cuando Gemini entrega:

- `domain = comparison`
- operación `compare`
- `group_role = person`
- `values = [persona1, persona2, ...]`

CE ejecuta el mismo dossier canónico para cada persona y genera un DATASET `Comparativa de personas` con:

- Persona
- Aportación vinculada
- Ingresos vinculados
- Compras bajo responsabilidad
- Donaciones vinculadas
- Eventos vinculados

`Aportación vinculada` se define como ingresos vinculados + valor de donaciones vinculadas. Las compras bajo responsabilidad se presentan aparte y no se consideran aportación personal, porque son gasto gestionado por cuenta del evento.

Las comparaciones de eventos siguen utilizando el circuito anterior. La capability de `comparison` resuelve la dimensión según `group_role`, sin convertir personas en eventos.

## 4. ITV: oráculo real y nombre de exportación

### Oráculo importado desde Excel

El parser del servidor ya devolvía `oracle`, pero el cliente lo descartaba al reconstruir `cases`. Ahora se conserva en cada caso enviado a `/api/zuzu-tests/run-custom-case`.

`replayContractVersion` pasa a **4** para distinguir esta batería importada de las anteriores.

Esto permite que la validación estructural del servidor compruebe realmente dominio ejecutado, evento, filas, entidad/sujeto y ANSWER_PAYLOAD, en vez de quedarse únicamente con el texto `expected`.

### Nombre de JSON/PDF ITV

Se normaliza la versión antes de construir el nombre de archivo:

- `v3_0_exp_exp_exp_exp` => `v3_0_exp`
- prefijo => `ControlEvent_v3_0_exp`

Ejemplo esperado:

`ControlEvent_v3_0_exp_ITV_Zuzu_2026-08-23T...-FULL_CERT.json`

La corrección se hace en el generador de nombre, no renombrando archivos a posteriori.

## 5. Regresiones ejecutadas

Resultados locales antes de empaquetar:

- `compras-donaciones-maintenance-regression.js` => **OK** (20 comprobaciones)
- `zuzu-itv-contract-regression.js` => **OK**
- `zuzu-itv-oracle-regression.js` => **OK**
- `zuzu-history-ranking-regression.js` => **OK**
- `zuzu-ledger-fixes-regression.js` => **OK**
- `zuzu-answer-blueprint-regression.js` => **OK**
- `zuzu-ledger-structural-suite.js` => **OK**
- `zuzu-conversation-invariants.js` => **158 OK / 0 KO**
- `zuzu-router-observed-regressions.js` => **OK**
- `zuzu-router-shadow-suite.js --dry-run` => **100 mensajes OK**
- Sintaxis JavaScript global => **240 ficheros OK**
- `package.json` => **válido**

Para las suites que importan el runtime del servidor se utilizaron únicamente stubs locales mínimos de `@supabase/supabase-js` y `mime-types`; se eliminaron antes del empaquetado y no forman parte del ZIP.

## 6. Limitación de esta auditoría

No se ha realizado desde el contenedor una nueva ejecución real de Gemini FULL-CERT 21+33, porque requiere el entorno desplegado y credenciales/datos reales. Tampoco se ejecuta aquí el importador Excel dinámico que depende de `exceljs`, ausente en el ZIP sin `node_modules`; el puente cliente que conserva `oracle` queda cubierto por la regresión estática específica.

La siguiente validación útil en despliegue es repetir FULL-CERT técnica 21 y humana 33. Debe prestarse especial atención a:

- que una consulta general de PAN no herede una persona antigua;
- que Pocholo/Celes y Vicente/Pocholo produzcan **Comparativa de personas**;
- que preguntas `whether` conserven ese tipo de respuesta;
- que el oráculo convierta en KO los falsos OK de dominio/sujeto/filas;
- que los JSON exportados contengan una sola aparición de `_exp` en la versión.

## SQL

No hay SQL nuevo en esta cirugía.

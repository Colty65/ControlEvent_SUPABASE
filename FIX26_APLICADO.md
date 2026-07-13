# ControlEvent v20_prod · FIX26

Cambios aplicados sobre FIX25:

1. Logon / fluidez
   - Neutralizado el selector pesado de FIX25.
   - Desactivadas reconstrucciones antiguas del selector en v19-fix13/v19-fix19.
   - Eliminado el MutationObserver global sobre document.body de v19-fix13, que podía ralentizar entrada/login.
   - Nuevo selector v20-fix26: sin fetch, sin precarga, sin timers globales; solo actúa cuando el usuario abre/cambia el desplegable o cuando la app emite evento cargado.

2. Desplegable de eventos
   - Mantiene cache local del primer orden válido y refuerza el orden por fecha de inicio.
   - Aplica color verde a eventos En curso y rojo a Finalizado cuando el estado está disponible.

3. AVANCE DEL EVENTO · INFO SOCIOS
   - Para socios con " y ", el total cuenta como 2.
   - Si solo asiste uno de los miembros de una pareja/grupo, cuenta como 1 asistente, no como 0 ni como 2.
   - Visualmente se muestra (1/2) cuando la asistencia es parcial.

4. Zuzu / Planificación
   - Refuerzo de criterio: nombres con " y " cuentan como 2; si solo aparece uno de los miembros, cuenta como 1 asistente de ese grupo.

No se han tocado descuentos, ingresos, descargas ni Vista aérea.

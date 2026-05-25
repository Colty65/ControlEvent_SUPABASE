ControlEvent v44.6.1

Corrección urgente sobre v44.6:
- La capa "Cargando nuevo evento..." pasa a ser informativa/pasiva.
- No bloquea el desplegable de eventos.
- No intercepta clicks.
- No usa MutationObserver global ni espera a que el DOM quede en silencio.
- Evita que el cambio de evento se quede colgado o tarde más de medio minuto por culpa de la capa de carga.

No se ha cambiado la lógica de guardado de COMPRAS, DONACIONES, INFOEVENTO ni BACKUP.

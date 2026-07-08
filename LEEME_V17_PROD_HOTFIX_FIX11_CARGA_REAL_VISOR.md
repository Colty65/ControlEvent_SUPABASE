# ControlEvent v19_prod - FIX11 Carga real visor y miniaturas

Base: FIX10.

Cambios acotados:

1. Se corrige el fallo de FIX10: el fichero `v17-hotfix-final-cierre-miniaturas-visor.js` existía, pero no estaba enlazado en `public/index.html`, por eso no se aplicaban los cambios.
2. Se añade la carga real del hotfix al final de `index.html`, después del hotfix de cálculos/fotos.
3. Se refuerza el visor de ticket:
   - intercepta la miniatura y abre visor propio;
   - cierra/neutraliza visores legacy si aparecen;
   - botón cerrar abajo a la derecha;
   - detalle de líneas a la izquierda.
4. Se refuerza la eliminación visual de miniaturas duplicadas en cada fila de `Cálculos por tienda y ticket`.
5. Se refuerza el cierre del globo de detalle con aspa y Escape.

No cambia versión visible: sigue `v19_prod`.

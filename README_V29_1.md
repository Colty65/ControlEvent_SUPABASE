# ControlEvent v16_prod - Diagnóstico y modo ligero visible para iPad/Android

Versión generada sobre la base estable v29.0 / v28.6.1.

## Objetivo

La v29.0 funcionaba correctamente, incluido INFOEVENTO y BACKUP, pero seguía lenta en iPad y Android. Esta v29.1 no cambia la lógica funcional: añade una comprobación visible de si el modo ligero está actuando y reduce tareas repetitivas heredadas en dispositivos táctiles lentos.

## Cambios principales

- Versión visible actualizada a `ControlEvent v16_prod`.
- Nuevo arranque temprano `public/app/performance/low-resource-boot.js`.
- Indicador visual inferior: `⚡ LITE ON` o `⚡ LITE OFF`.
- Tocando el indicador se abre un panel de diagnóstico con:
  - si LowResource está activo;
  - si MobileLite está instalado;
  - funciones render envueltas;
  - renders ejecutados;
  - renders saltados por pantalla oculta;
  - intervalos heredados lentificados;
  - eventos de ratón anulados en iPad/Android;
  - estado de ScreenLazy y Hotpath.
- En iPad y Android se ralentizan los `setInterval` heredados de mantenimiento visual que antes se repetían cada 0,9–1,8 segundos.
- En iPad y Android se ignoran listeners globales de `mousemove`, `mouseover`, `mouseenter` y `pointermove`, que en pantallas táctiles no aportan y pueden penalizar mucho.
- Se mantiene `ControlEventActiveRender` desactivado.
- No se cambia INFOEVENTO, BACKUP, carga inicial, ExcelJS ni Supabase.

## Comprobación rápida

En iPad/Android debe aparecer abajo a la derecha:

```text
⚡ LITE ON
```

Toca ese botón para ver el panel.

Los datos más importantes son:

- `MobileLite INSTALADO / ON`
- `envueltas` mayor que 0
- `saltados ocultos` va subiendo al cambiar de pestañas o al actualizar datos
- `intervalos lentificados` mayor que 0
- `eventos mouse anulados` mayor que 0 en iPad/Android

## Forzar o desactivar pruebas

En la URL puedes añadir:

```text
?ceLite=1
```

para forzar el modo ligero, o:

```text
?ceLite=0
```

para desactivarlo temporalmente y comparar.

## Comandos de consola

```js
ControlEventLowResource.print()
ControlEventMobileLite.print()
ControlEventRuntime.inspect()
```

## Prueba recomendada

1. Subir primero el paquete `SOLO_SUBIR_GITHUB`.
2. Abrir en iPad/Android.
3. Confirmar que aparece `⚡ LITE ON`.
4. Tocar el indicador y comprobar que los contadores no están a cero.
5. Cambiar entre Ingresos, Compras, Donaciones, Resumen y Gráficas.
6. Probar INFOEVENTO y BACKUP para confirmar que siguen funcionando.

/* ControlEvent v27_prod_1.1 - versión centralizada */
export const VERSION = 'v27_prod_1.1';
export const VERSION_LABEL = 'v27_prod_1.1';
export const VERSION_TEXT = 'ControlEvent v27_prod_1.1';
export const VERSION_FILE = 'ControlEvent_v27_prod_1.1';
export const BUILD_ID = '20260810-V27-PROD-1-1-INGRESOS-BANCO-GRAFICAS';
export const ZIP_NAME = 'CE_V27_PROD_1_1_ZUZU_INTELIGENCIA_INGRESOS_BANCO_GRAFICAS.zip';

try {
  // v27_prod_1.1: migración única de claves internas heredadas sin perder sesión/preferencias.
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const copies = [];
      for (let i = 0; i < store.length; i += 1) {
        const oldKey = store.key(i);
        if (!oldKey || !oldKey.startsWith('ControlEvent_v24_prod')) continue;
        const newKey = oldKey.replace(/^ControlEvent_v24_prod/, 'ControlEvent_v27_prod_1.1');
        if (store.getItem(newKey) == null) copies.push([newKey, store.getItem(oldKey)]);
      }
      copies.forEach(([key, value]) => store.setItem(key, value));
    } catch (_) {}
  }
} catch (_) {}

try {
  window.__ceVersion = VERSION;
  window.__ceVersionLabel = VERSION_LABEL;
  window.__ceBuildId = BUILD_ID;
  window.__ceVersionInfo = { version: VERSION, label: VERSION_LABEL, text: VERSION_TEXT, file: VERSION_FILE, buildId: BUILD_ID, zipName: ZIP_NAME };
} catch (_) {}

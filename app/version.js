/* ControlEvent v27_prod_1.3 - versión centralizada */
export const VERSION = 'v27_prod_1.3';
export const VERSION_LABEL = 'v27_prod_1.3';
export const VERSION_TEXT = 'ControlEvent v27_prod_1.3';
export const VERSION_FILE = 'ControlEvent_v27_prod_1.3';
export const BUILD_ID = '20260810-V27-PROD-1-3-ZUZU-BANCO-GRAFICAS-EJECUTABLES';
export const ZIP_NAME = 'CE_V27_PROD_1_3_ZUZU_BANCO_GRAFICAS_EJECUTABLES.zip';

try {
  // v27_prod_1.3: migración única de claves internas heredadas sin perder sesión/preferencias.
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const copies = [];
      const legacyPrefixes = ['ControlEvent_v27_prod_1.2', 'ControlEvent_v24_prod'];
      for (let i = 0; i < store.length; i += 1) {
        const oldKey = store.key(i);
        const prefix = legacyPrefixes.find(p => oldKey && oldKey.startsWith(p));
        if (!prefix) continue;
        const newKey = oldKey.replace(prefix, 'ControlEvent_v27_prod_1.3');
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

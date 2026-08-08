/* ControlEvent v26_prod - versión centralizada */
export const VERSION = 'v26_prod';
export const VERSION_LABEL = 'v26_prod';
export const VERSION_TEXT = 'ControlEvent v26_prod';
export const VERSION_FILE = 'ControlEvent_v26_prod';
export const BUILD_ID = '20260808-V26-PROD-ZUZU-TOOLS';
export const ZIP_NAME = 'CE_V26_PROD_ZUZU_TOOLS.zip';

try {
  // v26_prod: migración única de claves internas heredadas sin perder sesión/preferencias.
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const copies = [];
      for (let i = 0; i < store.length; i += 1) {
        const oldKey = store.key(i);
        if (!oldKey || !oldKey.startsWith('ControlEvent_v24_prod')) continue;
        const newKey = oldKey.replace(/^ControlEvent_v24_prod/, 'ControlEvent_v26_prod');
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

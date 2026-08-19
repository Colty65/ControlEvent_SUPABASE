/* ControlEvent v3_0_exp - versión centralizada */
export const VERSION = 'v3_0_exp';
export const VERSION_LABEL = 'v3_0_exp';
export const VERSION_TEXT = 'ControlEvent v3_0_exp';
export const VERSION_FILE = 'ControlEvent_v3_0_exp';
export const BUILD_ID = '20260816-V3_0_EXP-BANK-FINAL1';
export const ZIP_NAME = 'ControlEvent_v3_0_exp.zip';

try {
  // v3_0_exp: migración única de claves internas heredadas sin perder sesión/preferencias.
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const copies = [];
      const legacyPrefixes = ['ControlEvent_v2.0_exp','ControlEvent_' + 'v1' + '.0_exp','ControlEvent_' + 'v30' + '_prod','ControlEvent_v29_prod','ControlEvent_v28.5.3_prod','ControlEvent_v28.5.2_prod','ControlEvent_v28.5.1_prod','ControlEvent_v28.5_prod','ControlEvent_v28.4_prod','ControlEvent_v28.3_prod','ControlEvent_v28.2_prod','ControlEvent_v28.1_prod','ControlEvent_v28.0_prod','ControlEvent_v27_prod_1.5','ControlEvent_v27_prod_1.4','ControlEvent_v27_prod_1.3','ControlEvent_v27_prod_1.2','ControlEvent_v27_prod_1.1','ControlEvent_v24_prod'];
      for (let i = 0; i < store.length; i += 1) {
        const oldKey = store.key(i);
        const prefix = legacyPrefixes.find(p => oldKey && oldKey.startsWith(p));
        if (!prefix) continue;
        const newKey = oldKey.replace(prefix, 'ControlEvent_v3_0_exp');
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

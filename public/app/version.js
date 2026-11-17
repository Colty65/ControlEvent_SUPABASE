/* ControlEvent v6_1-exp - versión centralizada */
export const VERSION = 'v6_1-exp';
export const VERSION_LABEL = 'v6_1-exp';
export const VERSION_TEXT = 'ControlEvent v6_1-exp';
export const VERSION_FILE = 'ControlEvent_v6_1-exp';
export const BUILD_ID = '20260911-V604-BASIC-END2END-FIX1';
export const ZIP_NAME = 'ControlEvent_v6_1-exp.zip';

try {
  // v6_1-exp: migración desde v6.0.1/v6.0 y la última conversación v5.3.2, sin arrastrar motores cognitivos.
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const copies = [];
      const prefixes = ['ControlEvent_v6.0.3_exp', 'ControlEvent_v6.0.2_exp', 'ControlEvent_v6.0.1_exp', 'ControlEvent_v6.0_exp', 'ControlEvent_v5.3.2_exp'];
      for (let i = 0; i < store.length; i += 1) {
        const oldKey = store.key(i);
        const prefix = prefixes.find(p => oldKey && oldKey.startsWith(p));
        if (!prefix) continue;
        const newKey = oldKey.replace(prefix, 'ControlEvent_v6_1-exp');
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

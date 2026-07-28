/* ControlEvent v24_prod-02 - versión centralizada */
export const VERSION = 'v24_prod-02';
export const VERSION_LABEL = 'v24_prod-02';
export const VERSION_TEXT = 'ControlEvent v24_prod-02';
export const VERSION_FILE = 'ControlEvent_v24_prod-02';
export const BUILD_ID = '20260728-V24-PROD-02-BANK-UX';
export const ZIP_NAME = 'CE_V24_PROD_02_CUADRE_BANCO_UX.zip';

try {
  window.__ceVersion = VERSION;
  window.__ceVersionLabel = VERSION_LABEL;
  window.__ceBuildId = BUILD_ID;
  window.__ceVersionInfo = { version: VERSION, label: VERSION_LABEL, text: VERSION_TEXT, file: VERSION_FILE, buildId: BUILD_ID, zipName: ZIP_NAME };
} catch (_) {}

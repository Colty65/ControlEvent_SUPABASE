/* ControlEvent v24_prod - versión centralizada */
export const VERSION = 'v24_prod';
export const VERSION_LABEL = 'v24_prod';
export const VERSION_TEXT = 'ControlEvent v24_prod';
export const VERSION_FILE = 'ControlEvent_v24_prod';
export const BUILD_ID = '20260728-V24-PROD-CUADRE-BANCO';
export const ZIP_NAME = 'CE_V24_PROD_CUADRE_BANCO.zip';

try {
  window.__ceVersion = VERSION;
  window.__ceVersionLabel = VERSION_LABEL;
  window.__ceBuildId = BUILD_ID;
  window.__ceVersionInfo = { version: VERSION, label: VERSION_LABEL, text: VERSION_TEXT, file: VERSION_FILE, buildId: BUILD_ID, zipName: ZIP_NAME };
} catch (_) {}

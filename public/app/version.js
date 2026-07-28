/* ControlEvent v23_prod_r5 - versión centralizada */
export const VERSION = 'v23_prod_r5';
export const VERSION_LABEL = 'v23_prod_r5';
export const VERSION_TEXT = 'ControlEvent v23_prod_r5';
export const VERSION_FILE = 'ControlEvent_v23_prod_r5';
export const BUILD_ID = '20260728-V23-PROD-R5-INGRESOS-AJUSTE-AVANCE';
export const ZIP_NAME = 'CE_v23_PROD_R5_INGRESOS_AJUSTE_SIN_VERSION_AVANCE.zip';

try {
  window.__ceVersion = VERSION;
  window.__ceVersionLabel = VERSION_LABEL;
  window.__ceBuildId = BUILD_ID;
  window.__ceVersionInfo = { version: VERSION, label: VERSION_LABEL, text: VERSION_TEXT, file: VERSION_FILE, buildId: BUILD_ID, zipName: ZIP_NAME };
} catch (_) {}

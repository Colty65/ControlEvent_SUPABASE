/* ControlEvent v25_prod - versión centralizada */
export const VERSION = 'v25_prod';
export const VERSION_LABEL = 'v25_prod';
export const VERSION_TEXT = 'ControlEvent v25_prod';
export const VERSION_FILE = 'ControlEvent_v25_prod';
export const BUILD_ID = '20260729-V25-PROD-COMPACT-BANK';
export const ZIP_NAME = 'CE_V25_PROD.zip';

try {
  window.__ceVersion = VERSION;
  window.__ceVersionLabel = VERSION_LABEL;
  window.__ceBuildId = BUILD_ID;
  window.__ceVersionInfo = { version: VERSION, label: VERSION_LABEL, text: VERSION_TEXT, file: VERSION_FILE, buildId: BUILD_ID, zipName: ZIP_NAME };
} catch (_) {}

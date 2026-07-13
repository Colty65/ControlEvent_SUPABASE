// ControlEvent version source of truth - generated 20260708-200500
export const PACKAGE_NAME = 'controlevent';
export const VERSION_LABEL = 'v20_prod';
export const VERSION_TEXT = 'ControlEvent v20_prod';
export const VERSION_FILE = 'ControlEvent_v20_prod';
export const BUILD_ID = '20260708-200500';
export const ZIP_NAME = 'CE_v19_PROD_MAPA_GLOBAL_FIX3.zip';
export const VERSION = VERSION_TEXT;

if (typeof window !== 'undefined') {
  window.__ceVersionLabel = VERSION_LABEL;
  window.__ceVersion = VERSION_TEXT;
  window.VERSION = VERSION_TEXT;
  window.VERSION_FILE = VERSION_FILE;
  window.ControlEventVersion = {
    label: VERSION_LABEL,
    version: VERSION_TEXT,
    versionFile: VERSION_FILE,
    build: BUILD_ID,
    zip: ZIP_NAME,
    source: 'public/app/version.js'
  };
}

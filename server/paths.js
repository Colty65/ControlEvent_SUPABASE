import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT = path.resolve(__dirname, '..');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const DATA_DIR = path.join(ROOT, 'data');
export const ACCESS_FILE = path.join(DATA_DIR, 'access-users.json');
export const UPLOADS_DIR = path.join(ROOT, 'uploads');
export const NODE_MODULES_DIR = path.join(ROOT, 'node_modules');
export const PORT = Number(process.env.PORT || 3030);
export const BACKEND_NAME = 'supabase-real-tables';
export const APP_VERSION = 'ControlEvent v18.11.7_prod';

export const APP_VERSION_LABEL = 'v18.11.7_prod';
export const APP_VERSION_FILE = 'ControlEvent_v18_11_7_prod';
export const BUILD_ID = '20260708-011500';
export const ZIP_NAME = 'CE_v18_11_7_PROD_ZUZU_INDIRECTOS_GEMINI.zip';

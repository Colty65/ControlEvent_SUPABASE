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
export const APP_VERSION = 'ControlEvent v13.0_prod';

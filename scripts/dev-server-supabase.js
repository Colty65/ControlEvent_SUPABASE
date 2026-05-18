import path from 'path';
import { fileURLToPath } from 'url';
import app from '../server/app.js';
import { PORT } from '../server/paths.js';

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

export default app;

if (isDirectRun) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('ControlEvent v27.0.2.1 localhost + Supabase real tables');
    console.log(`Abre: http://localhost:${PORT}`);
    console.log(`Red local: http://TU_IP_LOCAL:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`Version: http://localhost:${PORT}/api/version`);
  });
}

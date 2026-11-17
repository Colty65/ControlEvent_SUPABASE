import { createApp } from '../server/app.js';

// Producción Vercel: SOLO API. Los HTML/JS/CSS/imágenes se sirven como estáticos.
export default createApp({ serveFrontend: false });

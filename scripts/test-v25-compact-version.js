import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.resolve(file), 'utf8');
const bankJs = read('app/features/v24-cuadre-banco.js');
const bankCss = read('app/styles/cuadre-banco.css');
const index = read('index.html');
const publicIndex = read('public/index.html');
const version = read('app/version.js');
const serverPaths = read('server/paths.js');
const exportRoutes = read('routes/export.routes.js');
const coltylab = read('app/features/v17-fix27-welcome-info-general.js');
const excelBundle = read('public/app/legacy/legacy-bundle-after-modules-v30.7.js');
const legacyBefore = read('public/app/legacy/legacy-bundle-before-modules-v30.7.js');
const zuzu = read('public/app/features/v11-3-zuzu-analitica-libre.js');
const readonlyTools = read('public/app/features/v12-0-finalizado-herramientas-consulta.js');
const buildMetrics = read('public/app/diagnostics/build-metrics.json');

assert.match(bankJs, /const VERSION = 'v25_prod'/);
assert.match(bankJs, /<span class="ce-bank-version">v25_prod<\/span>/);
assert.match(bankCss, /v25_prod · máxima superficie útil y fichas bancarias compactas/);
assert.match(bankCss, /grid-template-columns:minmax\(650px,1\.22fr\) minmax\(430px,\.9fr\)/,
  'En escritorio los datos y la conciliación deben quedar en paralelo');
assert.match(bankCss, /\.ce-bank-movement\{margin-bottom:6px;border-radius:13px\}/,
  'Las fichas deben reducir separación y altura');
assert.match(bankCss, /\.ce-bank-header\{min-height:82px/,
  'La cabecera bancaria debe compactarse');
assert.match(bankCss, /\.ce-bank-kpi\{min-height:68px/,
  'Los saldos deben ocupar menos altura');

for (const source of [index, publicIndex, version, serverPaths, exportRoutes, coltylab, excelBundle, legacyBefore, zuzu, readonlyTools, buildMetrics]) {
  assert.match(source, /v25_prod|V25-PROD/);
  assert.doesNotMatch(source, /v24_prod-(?:02|05)|V24-PROD-(?:02|05)/i);
}
assert.equal(index, publicIndex, 'index.html y public/index.html deben quedar sincronizados');
assert.match(index, /<title>ControlEvent v25_prod<\/title>/);
assert.match(index, /data-ce-version-label>v25_prod<\/span>/);
assert.match(index, /20260729-V25-PROD-COMPACT-BANK/);
assert.match(version, /VERSION_FILE = 'ControlEvent_v25_prod'/);
assert.match(serverPaths, /APP_VERSION_FILE = 'ControlEvent_v25_prod'/);
assert.match(exportRoutes, /BACKUP_VERSION_FILE = 'ControlEvent_v25_prod'/);
assert.match(excelBundle, /`\$\{VERSION_FILE\}_INFOEVENTO-/);
assert.match(excelBundle, /`\$\{VERSION_FILE\}_BACKUP_/);
assert.match(excelBundle, /\['VERSION', VERSION\]/);
assert.match(coltylab, /DEFAULT_VERSION_LABEL = 'v25_prod'/);
assert.match(legacyBefore, /ControlEvent_v25_prod_INFOEVENTO-/);
assert.match(legacyBefore, /ControlEvent_v25_prod_descarga_datos\.xlsx/);
assert.match(zuzu, /ControlEvent_v25_prod-responde_Zuzu_a_/);
assert.match(readonlyTools, /ControlEvent_v25_prod_BACKUP/);
assert.match(buildMetrics, /20260729-V25-PROD-COMPACT-BANK/);

console.log('OK v25_prod: Cuadre Banco compacto y versión unificada en cabecera, ColtyLAB, INFOEVENTO y BACKUP.');

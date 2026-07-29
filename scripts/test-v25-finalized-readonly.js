import fs from 'node:fs';

const files = [
  new URL('../app/features/v24-cuadre-banco.js', import.meta.url),
  new URL('../public/app/features/v24-cuadre-banco.js', import.meta.url)
];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const required = [
    "['ceBankAccount','ceBankFilter','ceBankSort','ceBankSearch']",
    "node.disabled=locked",
    "node.setAttribute('tabindex','-1')",
    "if(store.readOnly){event.target.value=store.accountId||'TODOS';return;}",
    "if(store.readOnly){event.target.value=store.filter;return;}",
    "if(store.readOnly){event.target.value=store.sort;return;}",
    "if(store.readOnly){event.target.value=store.search;return;}",
    "store.filter='TODOS'",
    "store.search=''",
    "store.sort='DESC'",
    'applyReadOnlyControlState();'
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      throw new Error(`Falta protección de solo lectura (${token}) en ${file.pathname}`);
    }
  }
}

const cssFiles = [
  new URL('../app/styles/cuadre-banco.css', import.meta.url),
  new URL('../public/app/styles/cuadre-banco.css', import.meta.url)
];
for (const file of cssFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes('.ce-bank-command-fields select:disabled') || !source.includes('pointer-events:none!important')) {
    throw new Error(`Falta estilo visual/bloqueo de controles en ${file.pathname}`);
  }
}

console.log('OK v25_prod Finalizado: desplegables y búsqueda bloqueados; vista normalizada a todos los movimientos.');

/* Regression checks: global bank receipt associations and bounded history rendering. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const src=fs.readFileSync(new URL('../public/app/features/v24-cuadre-banco.js',`file://${__filename}`),'utf8');
function extract(name,next){const start=src.indexOf(`  function ${name}(`);const end=src.indexOf(`  function ${next}(`,start+1);assert(start>=0&&end>start,`function ${name}`);return src.slice(start,end);}
const mergeCode=extract('mergeHistoryLinks','bankHistoryRows');
const merge=new Function('arr','text',`${mergeCode};return mergeHistoryLinks;`)(v=>Array.isArray(v)?v:[],v=>v==null?'':String(v).trim());
const id=x=>`${x.eventId}|${x.id}`;
const global=[{eventId:'ELA',id:'income-1',imageUrl:'https://example.org/ela.png'},{eventId:'OTHER',id:'income-2',imageUrl:'https://example.org/other.png'}];
const local=[{eventId:'OTHER',id:'income-2',imageUrl:''}];
const merged=merge(global,local,id);
assert.equal(merged.length,2,'Never hide a historical association from another event');
assert.equal(merged.find(x=>x.eventId==='OTHER').imageUrl,'https://example.org/other.png','Keep global photo when local copy lacks it');
assert.match(src,/visibleRows=rows\.slice\(pageStart,pageStart\+store\.bankHistoryPageSize\)/);
assert.match(src,/bankHistoryPageSize:60/);
assert.match(src,/data-ce-bank-history-page="next"/);
assert.match(src,/IntersectionObserver/);
assert.match(src,/store\.balanceTicketImageRequests\[key\]/);
assert.match(src,/const incomes=arr\(row\?\.incomeLinks\)\.filter\(link=>text\(link\?\.id\|\|link\?\.incomeId\)\)/);
console.log('OK: asociaciones globales, miniaturas, paginación y deduplicación de peticiones');

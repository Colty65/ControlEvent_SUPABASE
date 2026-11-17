const fs=require('fs'),path=require('path');
const s=fs.readFileSync(path.resolve(__dirname,'../services/bank-reconciliation.service.js'),'utf8');
const checks={
 'el indicador global del CSV no determina En saldo':!s.includes('included=row.included;'),
 'se detectan instantaneas amplias de periodos anteriores':s.includes('const provisionalSnapshotIds=new Set('),
 'las instantaneas no se confunden con decision explicita':s.includes('stateByMovement.has(row.id) && !provisionalSnapshotIds.has(row.id)'),
 'solo evidencia del evento acredita inclusion automatica':s.includes('if(currentLinks.length || incomeMovementIds.has(text(row.id)))'),
 'se preserva la decision manual explicita':s.includes('included=stateByMovement.get(row.id);'),
 'los candidatos no confirmados nacen fuera de saldo':/inclu[d]?ed=false;\s*}\s*const reconciled=reconcileMovement/.test(s),
 'la foto del evento finalizado se conserva':s.includes('included=stateByMovement.has(row.id)?stateByMovement.get(row.id):incomeMovementIds.has(text(row.id));')
};
let errors=0;for(const [k,v] of Object.entries(checks)){console.log(v?'OK':'KO',k);if(!v)errors++;}process.exit(errors?1:0);

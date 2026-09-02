const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');const bank=fs.readFileSync(path.join(root,'public/app/features/v24-cuadre-banco.js'),'utf8'),index=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
let ok=0,bad=0;function t(n,c,d=''){if(c){ok++;console.log('OK ',n)}else{bad++;console.error('KO ',n,d)}}
function slice(src,a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw Error(`slice ${a} -> ${b}`);return src.slice(i,j)}
t('mismo motor history y zoom',/wireBalancePane\(pane,pane\.dataset\.paneId==='zoom'\?zoomPane\.meta:historyPane\.meta\)/.test(bank));
t('estado conserva originRatio y ventana intradía',/originRatio/.test(bank)&&/clusterStart/.test(bank)&&/clusterEnd/.test(bank));
t('ventana del día usa timestamp real',/function balanceIntradayWindow/.test(bank)&&/getHours|86400000/.test(bank));
t('solo abre grupo del día tocado',/filter\(x=>x\.time>=clusterStart&&x\.time<clusterEnd\)/.test(bank));
t('usa hora relativa dentro del grupo',/\(group\[i\]\.time-minT\)\/\(maxT-minT\)/.test(bank));
t('desempata con separación mínima',/minGap=meta\.id==='zoom'\?20:15/.test(bank));
t('arrastre derecha abre grupo hacia la izquierda',/if\(delta>=0\)\{rightEdge=Math\.min\(rightBound,splitX\);leftEdge=Math\.max\(leftBound,rightEdge-desiredSpan\)/.test(bank));
t('arrastre izquierda abre grupo hacia la derecha',/else\{leftEdge=Math\.max\(leftBound,splitX\);rightEdge=Math\.min\(rightBound,leftEdge\+desiredSpan\)/.test(bank));
t('límite permite casi todo ancho',/Math\.min\(meta\.plotW\*\.72,naturalSpan\)/.test(bank));
t('pointer capture sigue activo',/setPointerCapture/.test(bank));
t('restaurar borra ambas gráficas',/state\.panes=\{history:null,zoom:null\}/.test(bank));
t('cache BANK474',/BANK474-BOUNDARY-INTRADAY-CLUSTER-SPREAD/.test(index));
try{
 const src=slice(bank,'  function balanceSpreadX(meta,time,spread){','  function applyBalancePaneSpread');
 const ctx={Math,Date,Number,String,arr:v=>Array.isArray(v)?v:[],num:v=>Number(v)||0};vm.createContext(ctx);vm.runInContext(src+'\nthis.positions=balanceResolvedPointPositions;',ctx);
 const day=new Date(2026,7,31).getTime(),meta={id:'history',left:10,plotW:1000,safeMinTime:0,safeMaxTime:day+86400000*2,points:[]};
 for(let i=0;i<10;i++){const time=day+i*60*60*1000,point={time,movement:{id:'m'+i}};meta.points.push({point});}
 const spread={anchorTime:day+9*3600000,originRatio:.90,anchorRatio:.98,clusterStart:day,clusterEnd:day+86400000};
 const m=ctx.positions(meta,spread),xs=[...m.values()];
 t('grupo derecho deja de ser vertical',Math.max(...xs)-Math.min(...xs)>130,JSON.stringify(xs));
 let increasing=true;for(let i=1;i<xs.length;i++)if(xs[i]<=xs[i-1])increasing=false;t('orden intradía se conserva',increasing,JSON.stringify(xs));
 t('último punto permanece dentro del borde',Math.max(...xs)<=1002);
}catch(e){t('simulación intradía cargó',false,String(e));}
console.log(`BANK4.7.4 INTRADAY CLUSTER SPREAD: ${ok} OK · ${bad} KO`);process.exitCode=bad?1:0;

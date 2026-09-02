const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const bank=fs.readFileSync(path.join(root,'public/app/features/v24-cuadre-banco.js'),'utf8');
const index=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
let ok=0,bad=0;function t(n,c,d=''){if(c){ok++;console.log('OK ',n)}else{bad++;console.error('KO ',n,d)}}
function slice(src,a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw Error(`slice ${a} -> ${b}`);return src.slice(i,j)}
t('motor común para ambas gráficas',/wireBalancePane\(pane,pane\.dataset\.paneId==='zoom'\?zoomPane\.meta:historyPane\.meta\)/.test(bank));
t('eje global ya no se deforma',/function balanceSpreadX\(meta,time,spread\)\{[\s\S]{0,220}return meta\.left\+\(time-min\)\/span\*meta\.plotW;/.test(bank));
t('solo se mueve grupo del día tocado',/filter\(x=>x\.time>=clusterStart&&x\.time<clusterEnd\)/.test(bank));
t('usa hora real dentro del grupo',/\(group\[i\]\.time-minT\)\/\(maxT-minT\)/.test(bank));
t('expansión depende del arrastre físico',/rawSpread=Math\.max\(24,num\(spread\.spreadPx\)\)/.test(bank));
t('grupo derecho se abre automáticamente a izquierda',/anchorX>=rightBound-edgeBand\)side='left'/.test(bank));
t('grupo izquierdo se abre automáticamente a derecha',/anchorX<=leftBound\+edgeBand\)side='right'/.test(bank));
t('centro conserva lógica de arrastre',/dragDirection\)>=0\?'left':'right'/.test(bank));
t('restaurar sigue borrando ambas',/state\.panes=\{history:null,zoom:null\}/.test(bank));
t('cache BANK475',/BANK475-LOCAL-INTRADAY-FAN/.test(index));
t('package BANK475',pkg.scripts?.['test:v4-bank475']==='node scripts/v4-0-exp-bank475-local-intraday-fan-regression.cjs');
try{
  const src=slice(bank,'  function balanceSpreadX(meta,time,spread){','  function applyBalancePaneSpread');
  const ctx={Math,Date,Number,String,arr:v=>Array.isArray(v)?v:[],num:v=>Number(v)||0};vm.createContext(ctx);vm.runInContext(src+'\nthis.sx=balanceSpreadX;this.positions=balanceResolvedPointPositions;',ctx);
  const day=new Date(2026,7,31).getTime(),max=day+86400000*3,meta={id:'history',left:10,plotW:1000,safeMinTime:0,safeMaxTime:max,points:[]};
  // un punto antiguo fuera del grupo + 10 movimientos del mismo día pegados al extremo derecho
  const old={time:day-86400000*300,movement:{id:'old'}};meta.points.push({point:old});
  for(let i=0;i<10;i++){const time=day+i*60*60*1000;meta.points.push({point:{time,movement:{id:'m'+i}}});}
  const oldBase=ctx.sx(meta,old.time,null);
  const anchor=day+9*3600000,baseAnchor=ctx.sx(meta,anchor,null);
  const spread={anchorTime:anchor,clusterStart:day,clusterEnd:day+86400000,spreadPx:180,dragDirection:-1};
  const m=ctx.positions(meta,spread),xs=[...Array(10)].map((_,i)=>m.get('m'+i));
  t('punto fuera del cluster no se mueve',Math.abs(m.get('old')-oldBase)<1e-9,`${m.get('old')} vs ${oldBase}`);
  t('cluster derecho se abre hacia la izquierda aunque arrastre sea contrario',Math.min(...xs)<baseAnchor-120,JSON.stringify(xs));
  t('cluster deja de ser vertical',Math.max(...xs)-Math.min(...xs)>250,JSON.stringify(xs));
  let inc=true;for(let i=1;i<xs.length;i++)if(!(xs[i]>xs[i-1]))inc=false;t('orden horario se conserva',inc,JSON.stringify(xs));
  t('cluster queda dentro del área',Math.min(...xs)>=18&&Math.max(...xs)<=1002,JSON.stringify(xs));
}catch(e){t('simulación local cargó',false,String(e));}
console.log(`BANK4.7.5 LOCAL INTRADAY FAN: ${ok} OK · ${bad} KO`);process.exitCode=bad?1:0;

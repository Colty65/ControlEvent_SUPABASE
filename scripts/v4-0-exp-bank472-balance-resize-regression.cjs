const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const bank=fs.readFileSync(path.join(root,'public/app/features/v24-cuadre-banco.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/app/styles/cuadre-banco.css'),'utf8');
const index=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
let ok=0,bad=0;function t(name,cond,d=''){if(cond){ok++;console.log('OK ',name)}else{bad++;console.error('KO ',name,d)}}
function slice(src,a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw Error(`slice ${a} -> ${b}`);return src.slice(i,j)}

t('histórico pinta todos los movimientos',/pointScope:'all'/.test(bank));
t('zoom mantiene puntos del evento',/pointScope:'event'/.test(bank));
t('puntos siguen rojo/verde',/\.positive\{fill:#21a56f\}/.test(css)&&/\.negative\{fill:#d44752\}/.test(css));
t('miniaturas históricas siguen disponibles',/paneId==='history'/.test(bank)&&/renderBalanceInspectorMedia/.test(bank));
t('estado persiste por evento y cuenta',/balanceChartSpread=\{key,panes:\{history:null,zoom:null\}\}/.test(bank));
t('estado usa anchorTime + anchorRatio',/\{anchorTime,anchorRatio:Math\.max\(\.035,Math\.min\(\.965,anchorRatio\)\)\}/.test(bank));
t('ya no existe factor de lupa',!bank.includes('Math.pow(1-u')&&!bank.includes('baseFactor:1'));
t('drag funciona en ambas direcciones',/Math\.abs\(dx\)>18/.test(bank)&&!/dx<-28/.test(bank));
t('movimiento cambia ratio por delta horizontal',/gesture\.startRatio\+dxSvg\/Math\.max\(1,meta\.plotW\)/.test(bank));
t('drag izquierdo comprime izquierda y expande derecha por mapping lineal',/return meta\.left\+u\*\(splitX-meta\.left\)/.test(bank)&&/return splitX\+u\*\(\(meta\.left\+meta\.plotW\)-splitX\)/.test(bank));
t('límites evitan colapsar completamente un lado',/Math\.max\(\.035,Math\.min\(\.965/.test(bank));
t('inversa piecewise existe',/if\(clampedX<=splitX\)/.test(bank)&&/return anchorTime\+u\*\(max-anchorTime\)/.test(bank));
t('puntos y ticks se remapean en vivo',/data-ce-bank-time-tick/.test(bank)&&(/circle\.setAttribute\('cx',x\(point\.time\)/.test(bank)||/circle\.setAttribute\('cx',num\(pointX\.get\(id\)\|\|x\(point\.time\)\)\.toFixed\(2\)\)/.test(bank)));
t('botón Restaurar borra ambas vistas',/state\.panes=\{history:null,zoom:null\}/.test(bank));
t('botón Restaurar gráfica permanece',/Restaurar gráfica/.test(bank));
t('ayuda describe gesto izquierda o derecha tipo Excel',/arrastra a izquierda o derecha/.test(bank)&&/ens[a-z]*char una columna en Excel/i.test(bank));
t('pointer capture permite llegar al borde',/setPointerCapture/.test(bank));
t('click posterior a resize no abre miniatura accidental',/suppressClickUntil=Date\.now\(\)\+420/.test(bank));
t('touch-action sigue deshabilitado en plot',/touch-action:none!important/.test(css));
t('cache bust BANK473',/(BANK473-BALANCE-INTRADAY-SPREAD|BANK472-BALANCE-RESIZE-PIVOT)/.test(index));
t('package registra BANK472',pkg.scripts?.['test:v4-bank472-balance-resize']==='node scripts/v4-0-exp-bank472-balance-resize-regression.cjs');
t('helper intradía reparte puntos muy juntos',/function balanceResolvedPointPositions/.test(bank)&&/minGap=meta\.id==='zoom'\?18:12/.test(bank));

// Prueba matemática real de la transformación y su inversa.
try{
  const fn= slice(bank,'  function balanceSpreadX(meta,time,spread){','  function applyBalancePaneSpread');
  const ctx={Math,num:v=>Number(v)||0};vm.createContext(ctx);vm.runInContext(fn+'\nthis.sx=balanceSpreadX;this.tx=balanceTimeAtSvgX;',ctx);
  const meta={left:10,plotW:1000,safeMinTime:0,safeMaxTime:100};
  const left={anchorTime:50,anchorRatio:.30},right={anchorTime:50,anchorRatio:.70};
  t('ancla izquierda se mueve al 30%',Math.abs(ctx.sx(meta,50,left)-310)<1e-6);
  t('al mover frontera izquierda, tiempo 25 se comprime a x160',Math.abs(ctx.sx(meta,25,left)-160)<1e-6);
  t('al mover frontera izquierda, tiempo 75 ocupa zona derecha ampliada',Math.abs(ctx.sx(meta,75,left)-660)<1e-6);
  t('al mover frontera derecha, tiempo 25 ocupa zona izquierda ampliada',Math.abs(ctx.sx(meta,25,right)-360)<1e-6);
  const xs=[0,10,25,50,75,90,100];let round=true;for(const tt of xs){const px=ctx.sx(meta,tt,left),back=ctx.tx(meta,px,left);if(Math.abs(back-tt)>1e-7)round=false;}t('transformación e inversa redondean sin perder fecha',round);
}catch(e){t('prueba matemática cargó',false,String(e));}

console.log(`BANK4.7.2 BALANCE RESIZE: ${ok} OK · ${bad} KO`);process.exitCode=bad?1:0;

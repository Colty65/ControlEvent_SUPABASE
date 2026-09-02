const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const reg=fs.readFileSync(path.join(root,'services/zuzu-capability-registry.service.js'),'utf8');
const lab=fs.readFileSync(path.join(root,'services/zuzu-test-lab.service.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
let ok=0,bad=0;function t(n,c,d=''){if(c){ok++;console.log('OK ',n)}else{bad++;console.error('KO ',n,d)}}
function slice(src,a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);if(i<0||j<0)throw Error(`slice ${a} -> ${b}`);return src.slice(i,j)}
const p21=slice(ai,'function vnextP2Tools()','async function runZuzuVNextP13Agent');
const sys=slice(ai,'function vnextP2SystemInstruction','function vnextP2NormalizeCalls');
const merge=slice(ai,'function vnextP1222MergeViewFilters','function vnextP1222NextViewState');

// P2 invariant remains intact.
t('provider P2.1',p21.includes("provider:'zuzu-vnext-p21-one-decision-referents'"));
t('arquitectura P2.1 declarada',p21.includes('gramática de vistas + referentes + ledger de sesión'));
t('decisión normal maxCalls=1',/stage:'VNEXT P2\.1 · única decisión Gemini'[\s\S]{0,180}maxCalls:1/.test(p21));
t('narración sigue siendo única excepción',/stage:'VNEXT P2 · narración factual opcional'[\s\S]{0,180}maxCalls:2/.test(p21));
t('sin semantic retry P1',!p21.includes('DIALOGUE_STATE_AUTHORITY_RETRY')&&!p21.includes('PENDING_INTENT_RETRY')&&!p21.includes('FUNCTION CALL RETRY'));
t('contrato inválido no reintenta IA',p21.includes('No hay retry IA; se conserva el estado previo.'));

// View grammar.
t('schema documenta OR misma columna',reg.includes('MISMA columna son alternativas OR'));
t('runtime agrupa positivos por campo como OR',/positiveFields=new Set/.test(merge)&&/out=out\.filter/.test(merge));
t('schema prohíbe reset implícito',reg.includes('Ordenar o recuperar columnas NO resetea filtros'));
t('normalizador elimina reset no pedido',p21.includes("if(a.reset_filters===true&&a.reset_table!==true&&!explicitReset){delete a.reset_filters;repairs++;}"));
t('reset explícito se detecta sin decidir dominio',p21.includes('function vnextP21ExplicitFilterReset'));
t('sort se normaliza estructuralmente a view_sort runtime',p21.includes("if(Array.isArray(a.sort)){if(!arr(a.view_sort).length)a.view_sort=a.sort;delete a.sort;repairs++;}"));
t('sort se normaliza también en registry',reg.includes("sort → view_sort"));
t('view_sort es el único orden publicado para view_current',reg.includes('Usa siempre view_sort; nunca inventes sort'));

// Derive grammar.
t('derive enum incluye MAX/MIN/RANK',reg.includes("enum:['SUM','COUNT','DISTINCT_COUNT','MAX','MIN','AVG','RANK','DIFFERENCE']"));
t('field métrico explicado',reg.includes('En una tabla Indicador/Valor, field=Valor'));
t('label descriptivo explicado',reg.includes('label_field=Indicador'));
t('system dice MAX no sort',sys.includes('es derive(MAX), field=Valor')&&sys.includes('NO la conviertas en view_current+sort'));
t('catálogo derive refuerza MAX',reg.includes('NO sustituyas esa pregunta por view_current+sort'));

// Referents + current session ledger.
t('workspace expone recent_entities',p21.includes('compact.recent_entities=refs'));
t('workspace expone session_ledger',p21.includes('compact.session_ledger=ledger'));
t('workspace expone current_event',p21.includes('compact.current_event=trim(currentEvent)'));
t('resultContext persiste current_entities',p21.includes('out.current_entities=refs'));
t('resolve_entity alimenta referentes',p21.includes("if(name==='resolve_entity')")&&p21.includes('f.candidates'));
t('system conserva elipsis multi-persona',sys.includes('pronombres o elipsis')&&sys.includes('puedes emitir una query_ce por persona en la MISMA decisión'));
t('ledger actual separado de memoria histórica',sys.includes('session_ledger representa ESTA conversación actual'));
t('summary de charla se responde sin recall_memory',sys.includes('responde DIRECTAMENTE desde session_ledger; NO uses recall_memory'));
t('recall_memory ya no publica current',/enum:\['search','list','read','summarize'\]/.test(p21));
t('protocol guard detecta pseudo recall_memory',/recall_memory\|resolve_entity\|search_documents/.test(ai));

// Golden semantic road.
t('Golden usa indicadores reales',lab.includes('Indicador sea Ingresos o Compras realizadas'));
t('Golden espera 2 filas tras OR',lab.includes("rowCount:2,requiredValues:['Ingresos','Compras realizadas']"));
t('Golden columna oculta conserva 2 filas',lab.includes("forbiddenColumns:['Valor']"));
t('Golden orden conserva filtro',lab.includes("rowCount:2,expectedColumns:['Indicador','Valor'],sort:{field:'Valor',direction:'desc'},forbidResetFilters:true"));
t('Golden vuelve a Economía con vista previa de 2 filas',/Volvamos a la tabla de Economía[\s\S]{0,250}rowCount:2/.test(lab));
t('Golden final no exige memoria histórica',/Resúmeme qué hemos hecho[\s\S]{0,220}requiresTool:false,noTool:true/.test(lab));
t('Golden valida rowCount',lab.includes('filas esperadas'));
t('Golden valida columnas',lab.includes('falta columna esperada'));
t('Golden valida valores reales',lab.includes('no aparece la fila/valor esperado'));
t('Golden valida sort materializado',lab.includes('orden esperado'));
t('Golden valida referentes',lab.includes('referente esperado no conservado'));
t('Golden valida ambas personas',lab.includes('faltó consultar los eventos de'));
t('Golden prohíbe protocolo interno',lab.includes('la respuesta expone protocolo interno'));
t('Golden battery P2.1',lab.includes("'GOLDEN-DIALOG-P21-14'"));
t('Dialog battery P2.1',lab.includes("'DIALOGUE-P21-24'"));

// Compact cost safeguards unchanged.
let sizes={};try{let prefix=reg.slice(0,reg.indexOf('export function capabilityCatalogText'));prefix=prefix.replace(/^import .*$/mg,'').replace(/\bexport\s+/g,'');const ctx={};vm.createContext(ctx);vm.runInContext(prefix+'\nthis.__full=queryCeToolParameters();this.__compact=queryCeCompactToolParameters();',ctx);sizes={full:JSON.stringify(ctx.__full).length,compact:JSON.stringify(ctx.__compact).length};}catch(e){sizes={error:String(e)}}
t('schema compacto sigue < 8000 chars',sizes.compact>0&&sizes.compact<8000,JSON.stringify(sizes));
t('compactación sigue >70%',sizes.full>0&&sizes.compact/sizes.full<.30,JSON.stringify(sizes));
t('ITV light identifica P2.1',ui.includes("reportFormat:'LIGHT-P21'"));
t('build UI P2.1',html.includes('20260902-VNEXT-P21-GRAMMAR-REFERENTS-SEMANTIC-GOLDEN-NHC'));
t('package registra P2.1',pkg.scripts?.['test:vnext-p21']==='node scripts/v4-0-exp-vnext-p21-grammar-referents-regression.cjs');

console.log(`VNEXT P2.1 GRAMMAR/REFERENTS: ${ok} OK · ${bad} KO · schema ${sizes.compact||'?'} / ${sizes.full||'?'} chars`);process.exitCode=bad?1:0;

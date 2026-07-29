/* ControlEvent v25_prod - FIX1 conciliación, globos persistentes y restauración integral. */
(function(){
  'use strict';
  if(window.__ceV25ProdFix1) return; window.__ceV25ProdFix1=true;
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const bool=v=>['SI','SÍ','TRUE','1','YES'].includes(up(v));
  const number=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;let s=norm(v).replace(/[^0-9,.-]/g,'');if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0;};
  const actorHeader=()=>{const u=window.ControlEventApp?.authUser||window.authUser||window.__CONTROL_EVENT_USER__||{};return encodeURIComponent(JSON.stringify({nivel:up(u.nivel||u.Nivel),identificacion:norm(u.identificacion||u.Identificacion),nombre:norm(u.nombre||u.Nombre)}));};

  // Cierre robusto: el aspa funciona aunque una capa heredada capture el click.
  function closeBankNow(ev){
    const btn=ev?.target?.closest?.('#ceBankClose'); if(!btn) return;
    try{ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();}catch(_){ }
    try{window.ControlEventBankReconciliation?.close?.(true);}catch(_){ }
    try{window.ceCloseCuadreBanco?.();}catch(_){ }
    const overlay=$('ceBankOverlay'); if(overlay){overlay.classList.remove('visible');overlay.classList.add('hidden');overlay.style.removeProperty('display');}
    try{document.body.classList.remove('ce-bank-open');document.body.style.overflow='';}catch(_){ }
  }
  ['pointerdown','pointerup','touchend','click'].forEach(type=>document.addEventListener(type,closeBankNow,{capture:true,passive:false}));
  function keepCsvAvailableInCurrentEvent(){
    const overlay=$('ceBankOverlay');const button=$('ceBankImport');const headline=$('ceBankEventHeadline');
    if(!overlay||!button||!headline||overlay.classList.contains('hidden'))return;
    const inProgress=headline.classList.contains('in-progress')&&!/FINALIZADO/i.test(headline.textContent||'');
    if(inProgress&&!button.classList.contains('busy')){button.disabled=false;button.setAttribute('aria-disabled','false');}
  }
  const bankUiObserver=new MutationObserver(()=>keepCsvAvailableInCurrentEvent());
  document.addEventListener('DOMContentLoaded',()=>{const overlay=$('ceBankOverlay');if(overlay)bankUiObserver.observe(overlay,{subtree:true,attributes:true,childList:true});setInterval(keepCsvAvailableInCurrentEvent,900);},{once:true});

  // Globo de GRAFICAS persistente hasta X/Escape u otro segmento.
  let pinned=null;
  function removePinned(){pinned?.remove();pinned=null;}
  function showPinned(target,ev){
    const raw=target?.getAttribute?.('data-ce-tip-v21')||target?.getAttribute?.('data-ce-tip')||target?.getAttribute?.('title')||'';
    if(!norm(raw)) return;
    removePinned();
    const box=document.createElement('div'); box.id='ceV25PinnedGraphTip';
    const pt={x:Number(ev?.clientX||window.innerWidth/2),y:Number(ev?.clientY||window.innerHeight/2)};
    box.innerHTML=`<button type="button" aria-label="Cerrar">×</button><div>${String(raw).split(/\n/).map(line=>`<p>${line.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</p>`).join('')}</div>`;
    box.style.cssText=`position:fixed;z-index:2147483640;left:${Math.max(12,Math.min(window.innerWidth-390,pt.x+14))}px;top:${Math.max(12,Math.min(window.innerHeight-260,pt.y+14))}px;max-width:min(370px,calc(100vw - 24px));max-height:min(62vh,520px);overflow:auto;background:#0f172a;color:#fff;border:2px solid rgba(255,255,255,.45);border-radius:16px;padding:14px 42px 14px 16px;box-shadow:0 18px 55px rgba(15,23,42,.45);font:800 13px/1.35 system-ui,sans-serif;white-space:normal;pointer-events:auto`;
    box.querySelector('button').style.cssText='position:absolute;right:8px;top:7px;width:28px;height:28px;border-radius:999px;border:1px solid rgba(255,255,255,.55);background:rgba(255,255,255,.14);color:#fff;font-size:22px;line-height:22px;cursor:pointer';
    box.querySelectorAll('p').forEach(p=>p.style.cssText='margin:0 0 5px');
    box.querySelector('button').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();removePinned();});
    document.body.appendChild(box); pinned=box;
  }
  document.addEventListener('click',ev=>{
    const target=ev.target?.closest?.('#eventChartWrap [data-ce-tip-v21],#tabGraficas [data-ce-tip-v21],#eventChartWrap [data-ce-tip],#tabGraficas [data-ce-tip]');
    if(!target) return;
    setTimeout(()=>showPinned(target,ev),0);
  },true);
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape')removePinned();},true);
  window.addEventListener('controlevent:event-loaded',removePinned);

  // Restauración integral de los BACKUP v25_prod: núcleo + banco + hitos/LG.
  async function ensureXlsx(){
    if(window.XLSX) return window.XLSX;
    if(typeof window.ensureSheetJS==='function') await window.ensureSheetJS();
    if(!window.XLSX) throw new Error('No se ha podido cargar el lector de Excel.');
    return window.XLSX;
  }
  function sheetRows(wb,name){
    const key=(wb.SheetNames||[]).find(n=>up(n)===up(name)); if(!key) return [];
    return window.XLSX.utils.sheet_to_json(wb.Sheets[key],{defval:'',raw:false}).map(row=>{
      const out={};Object.entries(row||{}).forEach(([k,v])=>out[up(k).replace(/[^A-Z0-9_]+/g,'_')]=v);return out;
    });
  }
  function pick(row,...keys){for(const k of keys){const key=up(k).replace(/[^A-Z0-9_]+/g,'_');if(row?.[key]!==undefined&&norm(row[key])!=='')return row[key];}return '';}
  function parseJson(v){if(v&&typeof v==='object')return v;try{return JSON.parse(norm(v)||'[]');}catch(_){return [];}}
  function parseJsonValue(v){if(v&&typeof v==='object')return v;const raw=norm(v);if(!raw)return null;try{return JSON.parse(raw);}catch(_){return raw;}}
  function backupScope(wb){const rows=sheetRows(wb,'METADATOS');const map=Object.fromEntries(rows.map(r=>[up(pick(r,'CAMPO')),pick(r,'VALOR')]));const id=norm(map.EVENTO_ID);return !id||up(id)==='TODOS'?'TODOS':id;}
  function isV25Backup(wb){return (wb.SheetNames||[]).some(n=>up(n)==='METADATOS')&&(wb.SheetNames||[]).some(n=>up(n)==='CE_COMPRAS_BBDD');}
  function coreState(wb){
    const eventRows=sheetRows(wb,'EVENTOS');
    const eventos=eventRows.map(r=>({id:norm(pick(r,'EVENTO_ID')),titulo:norm(pick(r,'EVENTO_TITULO')),precio:number(pick(r,'EVENTO_PRECIO')),fechaIni:norm(pick(r,'EVENTO_FECHAINI')),fechaFin:norm(pick(r,'EVENTO_FECHAFIN')),situacion:norm(pick(r,'EVENTO_SITUACION'))||'En curso',descripcion:norm(pick(r,'EVENTO_DESCRIPCION'))})).filter(r=>r.id);
    const eventCodeToId=new Map(eventRows.map(r=>[norm(pick(r,'EVENTO_CODIGO')),norm(pick(r,'EVENTO_ID'))]).filter(([code,id])=>code&&id));
    const resolveEventId=value=>{const code=norm(value);return eventCodeToId.get(code)||code;};
    const personaRows=sheetRows(wb,'PERSONAS');
    const personas=personaRows.map(r=>({id:norm(pick(r,'PERSONA_ID')),nombre:norm(pick(r,'PERSONA_NOMBRE')),rango:norm(pick(r,'PERSONA_RANGO'))||'SOCIO'})).filter(r=>r.id);
    const personCodeToId=new Map(personaRows.map(r=>[norm(pick(r,'PERSONA_CODIGO')),norm(pick(r,'PERSONA_ID'))]).filter(([code,id])=>code&&id));
    const tiendas=sheetRows(wb,'TIENDAS').map(r=>({id:norm(pick(r,'TIENDA_ID')),nombre:norm(pick(r,'TIENDA_NOMBRE'))})).filter(r=>r.id);
    const productos=sheetRows(wb,'PRODUCTOS').map(r=>({id:norm(pick(r,'PRODUCTO_ID')),nombre:norm(pick(r,'PRODUCTO_NOMBRE')),segmento:norm(pick(r,'PRODUCTO_SEGMENTO')),destino:norm(pick(r,'PRODUCTO_DESTINO')),defaultPrecio:number(pick(r,'PRODUCTO_PRECIO_REFERENCIA')),precio:number(pick(r,'PRODUCTO_PRECIO_REFERENCIA'))})).filter(r=>r.id);
    const colaboradores=sheetRows(wb,'INGRESOS').map(r=>{const code=norm(pick(r,'PERSONA_CODIGO'));return {id:norm(pick(r,'INGRESO_ID')),eventId:resolveEventId(pick(r,'EVENTO_CODIGO')),personaId:personCodeToId.get(code)||code,numero:number(pick(r,'NUMERO')),situacion:norm(pick(r,'INGRESO')),importe:number(pick(r,'IMPORTE_VOLUNTARIO'))};}).filter(r=>r.id&&r.eventId&&r.personaId);
    const compras=sheetRows(wb,'CE_COMPRAS_BBDD').map(r=>({id:norm(pick(r,'COMPRA_ID')),eventId:norm(pick(r,'EVENT_ID')),productoId:norm(pick(r,'PRODUCTO_ID')),unidades:number(pick(r,'UNIDADES')),precio:number(pick(r,'PRECIO')),ticketDonacion:norm(pick(r,'TICKET_DONACION')),tiendaId:norm(pick(r,'TIENDA_ID')),responsableId:norm(pick(r,'RESPONSABLE_ID')),donorRef:norm(pick(r,'DONOR_REF')),createdAt:norm(pick(r,'CREATED_AT')),updatedAt:norm(pick(r,'UPDATED_AT'))})).filter(r=>r.id);
    const eventDocuments=sheetRows(wb,'DOCUMENTOS').map(r=>({eventId:resolveEventId(pick(r,'EVENTO_CODIGO')),id:norm(pick(r,'DOC_ID')),codigo:norm(pick(r,'DOC_CODIGO')),fecha:norm(pick(r,'FECHA')),descripcion:norm(pick(r,'DESCRIPCION')),imageKey:norm(pick(r,'CLAVE_IMAGEN')),imageUrl:norm(pick(r,'FOTO_URL'))})).filter(r=>r.eventId&&(r.id||r.codigo));
    const ticketImages={};sheetRows(wb,'CE_TICKET_IMAGES_BBDD').forEach(r=>{const key=norm(pick(r,'IMAGE_KEY'));const value=norm(pick(r,'PUBLIC_URL'))||norm(pick(r,'PATHNAME'))||norm(pick(r,'STORAGE_PATH'));if(key&&value)ticketImages[key]=value;});
    return {__forceReplaceAll:true,__allowEmptyReplace:true,eventos,personas,tiendas,productos,colaboradores,compras,eventDocuments,ticketImages,selectedEventId:eventos[0]?.id||''};
  }
  function extendedTables(wb){
    return {
      accessUsers:sheetRows(wb,'ACCESOS').map(r=>({identificacion:norm(pick(r,'IDENTIFICACION')),nombre:norm(pick(r,'NOMBRE')),clave:norm(pick(r,'CLAVE')),nivel:up(pick(r,'NIVEL'))||'RO',created_at:norm(pick(r,'CREATED_AT'))||undefined,updated_at:norm(pick(r,'UPDATED_AT'))||undefined})).filter(r=>r.identificacion),
      metaRows:sheetRows(wb,'META_BBDD').map(r=>({key:norm(pick(r,'KEY')),value:parseJsonValue(pick(r,'VALUE_JSON')),updated_at:norm(pick(r,'UPDATED_AT'))||undefined})).filter(r=>r.key),
      ticketImageRows:sheetRows(wb,'CE_TICKET_IMAGES_BBDD').map(r=>({image_key:norm(pick(r,'IMAGE_KEY')),event_id:norm(pick(r,'EVENT_ID')),label:norm(pick(r,'LABEL')),public_url:norm(pick(r,'PUBLIC_URL'))||null,pathname:norm(pick(r,'PATHNAME'))||null,storage_path:norm(pick(r,'STORAGE_PATH'))||null,content_type:norm(pick(r,'CONTENT_TYPE'))||null,size_bytes:number(pick(r,'SIZE_BYTES'))||null,created_at:norm(pick(r,'CREATED_AT'))||undefined,updated_at:norm(pick(r,'UPDATED_AT'))||undefined})).filter(r=>r.image_key),
      bankImportBatches:sheetRows(wb,'BANCO_IMPORTACIONES').map(r=>({id:norm(pick(r,'ID')),source_filename:norm(pick(r,'SOURCE_FILENAME')),account_id:norm(pick(r,'ACCOUNT_ID')),account_label:norm(pick(r,'ACCOUNT_LABEL')),date_from:norm(pick(r,'DATE_FROM'))||null,date_to:norm(pick(r,'DATE_TO'))||null,parsed_count:number(pick(r,'PARSED_COUNT')),inserted_count:number(pick(r,'INSERTED_COUNT')),duplicate_count:number(pick(r,'DUPLICATE_COUNT')),warning_count:number(pick(r,'WARNING_COUNT')),imported_by:norm(pick(r,'IMPORTED_BY'))||null,imported_at:norm(pick(r,'IMPORTED_AT'))||undefined})).filter(r=>r.id),
      bankMovements:sheetRows(wb,'BANCO_MVTOS').map(r=>({id:norm(pick(r,'ID')),account_id:norm(pick(r,'ACCOUNT_ID')),account_label:norm(pick(r,'ACCOUNT_LABEL')),executed_at:norm(pick(r,'EXECUTED_AT')),value_date:norm(pick(r,'VALUE_DATE')),description:norm(pick(r,'DESCRIPTION')),amount:number(pick(r,'AMOUNT')),bank_balance:number(pick(r,'BANK_BALANCE')),included:bool(pick(r,'INCLUDED')),source_filename:norm(pick(r,'SOURCE_FILENAME')),source_hash:norm(pick(r,'SOURCE_HASH')),import_batch_id:norm(pick(r,'IMPORT_BATCH_ID'))||null,created_by:norm(pick(r,'CREATED_BY'))||null,created_at:norm(pick(r,'CREATED_AT'))||undefined,updated_at:norm(pick(r,'UPDATED_AT'))||undefined})).filter(r=>r.id),
      bankTicketLinks:sheetRows(wb,'BANCO_TK_LINKS').map(r=>({id:norm(pick(r,'ID')),movement_id:norm(pick(r,'MOVEMENT_ID')),event_id:norm(pick(r,'EVENT_ID')),ticket_code:norm(pick(r,'TICKET_CODE')),ticket_amount_snapshot:number(pick(r,'TICKET_AMOUNT_SNAPSHOT')),forced_square:bool(pick(r,'FORCED_SQUARE')),created_by:norm(pick(r,'CREATED_BY'))||null,created_at:norm(pick(r,'CREATED_AT'))||undefined})).filter(r=>r.id),
      bankEventSettings:sheetRows(wb,'BANCO_PERIODOS').map(r=>({event_id:norm(pick(r,'EVENT_ID')),date_from:norm(pick(r,'DATE_FROM')),date_to:norm(pick(r,'DATE_TO')),updated_by:norm(pick(r,'UPDATED_BY'))||null,updated_at:norm(pick(r,'UPDATED_AT'))||undefined})).filter(r=>r.event_id),
      bankMovementStates:sheetRows(wb,'BANCO_ESTADO_MVTO').map(r=>({event_id:norm(pick(r,'EVENT_ID')),movement_id:norm(pick(r,'MOVEMENT_ID')),included:bool(pick(r,'INCLUDED')),updated_by:norm(pick(r,'UPDATED_BY'))||null,created_at:norm(pick(r,'CREATED_AT'))||undefined,updated_at:norm(pick(r,'UPDATED_AT'))||undefined})).filter(r=>r.event_id&&r.movement_id),
      hitos:sheetRows(wb,'HITOS').map(r=>({id:norm(pick(r,'ID')),event_id:norm(pick(r,'EVENT_ID')),nombre_hito:norm(pick(r,'NOMBRE_HITO')),descripcion:norm(pick(r,'DESCRIPCION')),fecha_minima:norm(pick(r,'FECHA_MINIMA'))||null,fecha_maxima:norm(pick(r,'FECHA_MAXIMA'))||null,responsable_id:norm(pick(r,'RESPONSABLE_ID'))||null,responsable_nombre:norm(pick(r,'RESPONSABLE_NOMBRE'))||null,orden:number(pick(r,'ORDEN')),created_at:norm(pick(r,'CREATED_AT'))||undefined,updated_at:norm(pick(r,'UPDATED_AT'))||undefined})).filter(r=>r.id),
      lgs:sheetRows(wb,'LG').map(r=>({id:norm(pick(r,'ID')),event_id:norm(pick(r,'EVENT_ID')),hito_id:norm(pick(r,'HITO_ID')),descripcion:norm(pick(r,'DESCRIPCION')),fecha_minima:norm(pick(r,'FECHA_MINIMA'))||null,fecha_maxima:norm(pick(r,'FECHA_MAXIMA'))||null,notas:norm(pick(r,'NOTAS'))||null,dependencia_tipo:norm(pick(r,'DEPENDENCIA_TIPO'))||'LG',dependencias_previas:parseJson(pick(r,'DEPENDENCIAS_PREVIAS')),dependencias_posteriores:parseJson(pick(r,'DEPENDENCIAS_POSTERIORES')),responsable_id:norm(pick(r,'RESPONSABLE_ID'))||null,responsable_nombre:norm(pick(r,'RESPONSABLE_NOMBRE'))||null,cumplida:bool(pick(r,'CUMPLIDA')),cumplida_at:norm(pick(r,'CUMPLIDA_AT'))||null,orden:number(pick(r,'ORDEN')),created_at:norm(pick(r,'CREATED_AT'))||undefined,updated_at:norm(pick(r,'UPDATED_AT'))||undefined})).filter(r=>r.id)
    };
  }
  async function restoreBackup(file){
    const XLSX=await ensureXlsx();const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});if(!isV25Backup(wb))return false;
    const scope=backupScope(wb);
    if(scope!=='TODOS') throw new Error('La restauración integral requiere un BACKUP con alcance TODOS para no sustituir accidentalmente otros eventos.');
    const role=up((window.ControlEventApp?.authUser||window.authUser||window.__CONTROL_EVENT_USER__||{}).nivel);if(role!=='GD')throw new Error('Solo un usuario GD puede restaurar un BACKUP.');
    const status=$('importStatus');if(status){status.textContent='Restaurando BACKUP completo…';status.className='ok';}
    const core=coreState(wb);
    const coreRes=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json','X-ControlEvent-Backup-Restore':'1'},body:JSON.stringify(core)});
    if(!coreRes.ok){let d={};try{d=await coreRes.json();}catch(_){ }throw new Error(d?.error||`No se pudo restaurar el núcleo (${coreRes.status}).`);}
    const extRes=await fetch('/api/export/restore-extended',{method:'POST',headers:{'Content-Type':'application/json','X-ControlEvent-Actor':actorHeader()},body:JSON.stringify({scope:backupScope(wb),tables:extendedTables(wb)})});
    let ext={};try{ext=await extRes.json();}catch(_){ }if(!extRes.ok)throw new Error(ext?.error||`No se pudieron restaurar Banco/Hitos/LG (${extRes.status}).`);
    if(status){status.textContent=`BACKUP restaurado completamente. Accesos: ${ext?.counts?.accessUsers||0}; Banco: ${ext?.counts?.bankMovements||0} movimientos; Hitos: ${ext?.counts?.hitos||0}; LG: ${ext?.counts?.lgs||0}. Recargando…`;status.className='ok';}
    setTimeout(()=>location.reload(),900);return true;
  }
  document.addEventListener('click',async ev=>{
    const btn=ev.target?.closest?.('#btnStartImport');if(!btn)return;
    const file=$('importWorkbookFile')?.files?.[0];if(!file)return;
    try{
      const XLSX=await ensureXlsx();const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});if(!isV25Backup(wb))return;
      ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
      await restoreBackup(file);
    }catch(error){const status=$('importStatus');if(status){status.textContent='Error al restaurar BACKUP: '+(error?.message||error);status.className='bad';}else alert(error?.message||error);}
  },true);
})();

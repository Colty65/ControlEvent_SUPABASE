/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #41. */
/* ==== V22.5: corrección limpia de fotos de tickets y claves ACCESOS ==== */
(function(){
  const VERSION='ControlEvent v26.6';
  const VERSION_FILE='ControlEvent_v26_6';
  const EXCEL_PASSWORD='open_excel_arrastre';
  const DB_NAME='controlevent_ticket_images_v225';
  const DB_STORE='images';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const masked=v=>/^[•*●·]+$/.test(String(v||''));
  const stateRef=()=>{ try{ if(typeof state!=='undefined') return state; }catch(_){ } return window.state||{}; };
  const currentEventId=()=>String(stateRef().selectedEventId||'');
  function role(){ try{return String(authUser?.nivel||'').toUpperCase();}catch(_){return '';} }
  function isRO(){return role()==='RO';} function isRW(){return role()==='RW';} function isGD(){return role()==='GD';} function canEvents(){return isRW()||isGD();}

  function updateVersion(){
    try{document.title=VERSION;}catch(_){ }
    try{document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||''))el.textContent=VERSION;});}catch(_){ }
  }
  window.emittedByTextV171=function(date=new Date()){
    const pad=n=>String(n).padStart(2,'0');
    const dd=pad(date.getDate()), mm=pad(date.getMonth()+1), yyyy=date.getFullYear();
    const hh=pad(date.getHours()), mi=pad(date.getMinutes()), ss=pad(date.getSeconds());
    return `Emitido por “©oltyLAB ’26_${VERSION_FILE}_${dd}${mm}${yyyy}_${hh}:${mi}:${ss}”`;
  };
  try{emittedByTextV171=window.emittedByTextV171;}catch(_){ }

  window.addCellNote=function(cell,text){
    if(!cell||!text)return;
    let t=String(text||'').replace(/\s*\n\s*/g,' ').replace(/\s+/g,' ').trim();
    const low=t.toLowerCase();
    if(low.includes('peña')||low.includes('arrastre')) t='Dinero de la cuenta de la peña que se utiliza para colaborar en este evento.';
    if(low.includes('z_dev_ingresos')||low.includes('devolucion')||low.includes('devolución')) t='Este importe se corresponde con la/s devolucion/es realizadas en este evento.';
    const width=Math.max(360,Math.min(760,140+t.length*5.2));
    const height=Math.max(95,Math.min(220,70+Math.ceil(t.length/62)*34));
    try{cell.note={texts:[{text:t}],margins:{insetmode:'custom',inset:[0.20,0.20,0.45,0.45]},protection:{locked:true,lockText:true},editAs:'twoCells',width,height};}
    catch(_){try{cell.note=t;}catch(__){ }}
  };
  try{addCellNote=window.addCellNote;}catch(_){ }

  function patchExcelProtection(){
    try{
      if(window.ExcelJS && ExcelJS.Worksheet && ExcelJS.Worksheet.prototype.protect && !ExcelJS.Worksheet.prototype.protect.__v225Patched){
        const prev=ExcelJS.Worksheet.prototype.protect;
        const w=function(password,options){return prev.call(this,EXCEL_PASSWORD,options);};
        w.__v225Patched=true; ExcelJS.Worksheet.prototype.protect=w;
      }
    }catch(_){ }
  }

  // ---------- Fotos de tickets: almacenamiento bien hecho en IndexedDB + estado en memoria ----------
  let dbPromise=null;
  function openTicketDb(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){resolve(null);return;}
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{try{req.result.createObjectStore(DB_STORE);}catch(_){ }};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('No se pudo abrir IndexedDB de tickets'));
    });
    return dbPromise;
  }
  async function idbPut(key,value){
    const db=await openTicketDb(); if(!db||!key||!value)return;
    await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
  }
  async function idbDelete(key){
    const db=await openTicketDb(); if(!db||!key)return;
    await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
  }
  async function idbAll(){
    const db=await openTicketDb(); if(!db)return {};
    return await new Promise((resolve,reject)=>{
      const out={}; const tx=db.transaction(DB_STORE,'readonly'); const store=tx.objectStore(DB_STORE); const req=store.openCursor();
      req.onsuccess=()=>{const cur=req.result;if(cur){out[cur.key]=cur.value;cur.continue();}else resolve(out);};
      req.onerror=()=>reject(req.error); tx.onerror=()=>reject(tx.error);
    });
  }
  function isImage(v){const s=String(v||'');return s.length>80&&(/^data:image\//.test(s)||/^[A-Za-z0-9+/=\r\n]+$/.test(s.slice(0,140)));}
  function normalizeImage(v){let s=String(v||'').trim(); if(!s)return ''; if(/^data:image\//.test(s))return s; if(/^[A-Za-z0-9+/=\r\n]+$/.test(s)&&s.length>80)return 'data:image/jpeg;base64,'+s.replace(/\s+/g,''); return s;}
  function ticketToken(label){const m=String(label||'').match(/\bTK\s*\d+[A-Z0-9_-]*\b/i); return m?m[0].replace(/\s+/g,'').toUpperCase():'';}
  function ticketImageKey(label,eventId=currentEventId()){return `${eventId}|${String(label||'').trim()}`;}
  function candidateKeys(label,eventId=currentEventId()){
    const s=String(label||'').trim(); const arr=[]; const add=x=>{x=String(x||'').trim(); if(x&&!arr.includes(x))arr.push(x);};
    add(ticketImageKey(s,eventId)); add(`${eventId}|${s}`); add(s);
    const tk=ticketToken(s); if(tk){add(`${eventId}|${tk}`); add(tk);}
    const clean=s.split('·')[0].trim(); if(clean&&clean!==s){add(`${eventId}|${clean}`); add(clean); const tk2=ticketToken(clean); if(tk2){add(`${eventId}|${tk2}`); add(tk2);}}
    return arr;
  }
  function ensureTicketImages(){const s=stateRef(); if(!s.ticketImages||typeof s.ticketImages!=='object')s.ticketImages={}; return s.ticketImages;}
  function findTicketImage(label,eventId=currentEventId()){
    const imgs=ensureTicketImages();
    for(const k of candidateKeys(label,eventId)){const img=normalizeImage(imgs[k]); if(isImage(img))return img;}
    const tk=ticketToken(label); if(tk){
      const prefix=`${eventId}|`;
      for(const [k,v] of Object.entries(imgs)){if(String(k).startsWith(prefix)&&String(k).toUpperCase().includes(tk)){const img=normalizeImage(v); if(isImage(img))return img;}}
    }
    return '';
  }
  async function storeTicketImage(label,img,eventId=currentEventId()){
    img=normalizeImage(img); if(!isImage(img))return;
    const imgs=ensureTicketImages();
    for(const k of candidateKeys(label,eventId)){imgs[k]=img; await idbPut(k,img).catch(()=>{});}
  }
  async function deleteTicketImage(label,eventId=currentEventId()){
    const imgs=ensureTicketImages();
    const keys=candidateKeys(label,eventId);
    keys.forEach(k=>delete imgs[k]);
    await Promise.all(keys.map(k=>idbDelete(k).catch(()=>{})));
  }
  async function hydrateTicketImages(){
    const imgs=ensureTicketImages();
    for(const [k,v] of Object.entries(imgs)){const img=normalizeImage(v); if(isImage(img)){imgs[k]=img; await idbPut(k,img).catch(()=>{});}}
    const fromDb=await idbAll().catch(()=>({}));
    let changed=false;
    for(const [k,v] of Object.entries(fromDb)){const img=normalizeImage(v); if(isImage(img)&&!isImage(imgs[k])){imgs[k]=img; changed=true;}}
    return changed;
  }
  function resizeImageFile(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('No se pudo leer la foto'));
      reader.onload=e=>{
        const img=new Image();
        img.onerror=()=>reject(new Error('No se pudo procesar la foto'));
        img.onload=()=>{
          const maxW=1400,maxH=1400; let w=img.width,h=img.height; const ratio=Math.min(maxW/w,maxH/h,1); w=Math.round(w*ratio); h=Math.round(h*ratio);
          const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
          resolve(canvas.toDataURL('image/jpeg',0.86));
        };
        img.src=e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
  async function persistNow(){try{if(typeof saveState==='function')saveState();}catch(_){ }}
  async function uploadTicketImageClean(encodedKey){
    const label=decodeURIComponent(encodedKey||''); if(!label)return;
    const input=document.createElement('input'); input.type='file'; input.accept='image/*';
    input.onchange=async ev=>{
      const file=ev.target.files&&ev.target.files[0]; if(!file)return;
      try{const dataUrl=await resizeImageFile(file); await storeTicketImage(label,dataUrl); await persistNow(); try{if(typeof render==='function')render();}catch(_){ }}
      catch(err){console.error(err); alert('No se pudo insertar la foto del ticket: '+(err.message||err));}
    };
    input.click();
  }
  async function removeTicketImageClean(encodedKey){
    const label=decodeURIComponent(encodedKey||''); if(!label)return;
    if(!confirm('¿Eliminar la foto asociada a este ticket/donación/gasto?'))return;
    await deleteTicketImage(label); await persistNow(); try{if(typeof render==='function')render();}catch(_){ }
  }
  window.uploadTicketImageV164=uploadTicketImageClean; window.removeTicketImageV164=removeTicketImageClean;
  window.uploadTicketImage=function(evOrEncoded,maybeEncoded){
    const encoded=typeof evOrEncoded==='string'?evOrEncoded:maybeEncoded;
    return uploadTicketImageClean(encoded);
  };
  window.removeTicketImage=removeTicketImageClean;
  try{uploadTicketImageV164=window.uploadTicketImageV164; removeTicketImageV164=window.removeTicketImageV164; uploadTicketImage=window.uploadTicketImage; removeTicketImage=window.removeTicketImage;}catch(_){ }
  window.__ceFindTicketImageV225=findTicketImage;

  const oldSaveState=(typeof saveState==='function')?saveState:null;
  if(oldSaveState&&!oldSaveState.__v225Clean){
    const wrapped=function(){
      hydrateTicketImages().catch(()=>{});
      const s=stateRef(); const full=s.ticketImages;
      try{
        // Evita que localStorage pierda datos por cuota al meter muchas fotos. Las fotos quedan en IndexedDB y, en memoria, para Excel.
        s.ticketImages={};
        if(typeof STORAGE_KEY!=='undefined')localStorage.setItem(STORAGE_KEY,JSON.stringify(s));
      }catch(_){ }
      finally{s.ticketImages=full;}
      try{
        if(authUser && (typeof canWriteRole!=='function'||canWriteRole()) && typeof pushStateToServer==='function'){
          clearTimeout(window.__ceV225RemoteTimer); window.__ceV225RemoteTimer=setTimeout(()=>{try{pushStateToServer();}catch(_){ }},150);
        }
      }catch(_){ }
    };
    wrapped.__v225Clean=true; try{saveState=wrapped;}catch(_){ } window.saveState=wrapped;
  }

  // Si cualquier render reconstruye la lista, asegura que las miniaturas usen las fotos de IndexedDB/estado.
  function fixTicketThumbs(){
    try{
      document.querySelectorAll('#summaryTiendaTicket .summary-item').forEach(row=>{
        const btn=row.querySelector('button[onclick*="uploadTicketImageV164"],button[onclick*="uploadTicketImage"]');
        if(!btn)return;
        const m=String(btn.getAttribute('onclick')||'').match(/'([^']+)'/); if(!m)return;
        const label=decodeURIComponent(m[1]); const img=findTicketImage(label); if(!img)return;
        let thumb=row.querySelector('img.ticket-thumb');
        const actions=row.querySelector('.ticket-actions'); if(!actions)return;
        if(!thumb){thumb=document.createElement('img');thumb.className='ticket-thumb';thumb.alt='ticket';actions.appendChild(thumb);} thumb.src=img;
        if(!actions.querySelector('button[data-ce-delete-img="1"],button[onclick*="removeTicketImage"]')){
          const del=document.createElement('button'); del.type='button'; del.className='outline small'; del.title='Eliminar foto'; del.dataset.ceDeleteImg='1'; del.textContent='🗑️'; del.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();removeTicketImageClean(encodeURIComponent(label));},true); actions.appendChild(del);
        }
      });
    }catch(_){ }
  }
  const prevRender=(typeof render==='function')?render:null;
  if(prevRender&&!prevRender.__v225Clean){
    const w=function(){const ret=prevRender.apply(this,arguments); setTimeout(fixTicketThumbs,40); return ret;};
    w.__v225Clean=true; try{render=w;}catch(_){ } window.render=w;
  }
  const prevExport=(typeof exportExcel==='function')?exportExcel:null;
  if(prevExport&&!prevExport.__v225Clean){
    const w=async function(){await hydrateTicketImages().catch(()=>{}); return await prevExport.apply(this,arguments);};
    w.__v225Clean=true; try{exportExcel=w;}catch(_){ } window.exportExcel=w;
  }

  function ensureTicketModal(){
    let modal=$('ceTicketImageModalV225'); if(modal)return modal;
    modal=document.createElement('div'); modal.id='ceTicketImageModalV225'; modal.className='ce-ticket-modal-v225';
    modal.innerHTML='<div class="ce-ticket-modal-v225-box"><button type="button" class="ce-ticket-modal-v225-close" title="Cerrar">×</button><img alt="Ticket ampliado"><div class="ce-ticket-modal-v225-hint">Pulsa fuera o ESC para cerrar</div></div>';
    modal.addEventListener('click',ev=>{if(ev.target===modal||ev.target.closest('.ce-ticket-modal-v225-close'))modal.classList.remove('visible');});
    document.body.appendChild(modal); return modal;
  }
  document.addEventListener('click',ev=>{const img=ev.target?.closest?.('img.ticket-thumb'); if(!img)return; ev.preventDefault(); ev.stopPropagation(); const modal=ensureTicketModal(); modal.querySelector('img').src=img.src; modal.classList.add('visible');},true);
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape')$('ceTicketImageModalV225')?.classList.remove('visible');},true);

  // ---------- Claves: un solo botón estable, sin intervalos ni mensajes falsos ----------
  function unwrapPassword(input){
    if(!input)return null;
    let row=input.closest('.ce-v225-pass-row'); if(row)return row;
    const old=input.closest('.ce-v220-pass-wrap,.ce-v221-pass-wrap,.ce-v222-pass-wrap,.ce-v223-pass-wrap,.ce-v224-pass-row,.ce-v2242-pass-row,.ce-v2243-pass-row');
    if(old){old.className='ce-v225-pass-row'; old.querySelectorAll('button').forEach(b=>b.remove()); return old;}
    const parent=input.parentElement; if(!parent)return null;
    row=document.createElement('div'); row.className='ce-v225-pass-row'; parent.insertBefore(row,input); row.appendChild(input); return row;
  }
  function ensurePasswordButton(input){
    if(!input)return;
    const row=unwrapPassword(input); if(!row)return;
    row.querySelectorAll('button').forEach(b=>b.remove());
    const btn=document.createElement('button'); btn.type='button'; btn.className='ce-v225-eye'; btn.textContent=input.type==='text'?'Ocultar':'Ver'; btn.title='Ver/Ocultar clave';
    btn.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
      const show=input.type==='password';
      if(show){
        // En ACCESOS, si el backend no entrega la clave, solo se podrá ver la nueva clave que se escriba.
        if(masked(input.value)||input.value==='Clave no disponible') input.value='';
        try{input.type='text';input.setAttribute('type','text');}catch(_){ } btn.textContent='Ocultar';
      }else{try{input.type='password';input.setAttribute('type','password');}catch(_){ } btn.textContent='Ver';}
      try{input.focus({preventScroll:true});}catch(_){ } return false;
    },true);
    row.appendChild(btn);
  }
  function cleanAccessPasswordFields(){
    try{
      document.querySelectorAll('#mtAcceso input[data-action="edit-acceso-clave"]').forEach(input=>{
        if(masked(input.value)||input.value==='Clave no disponible') input.value='';
        input.placeholder='Nueva clave (opcional)'; input.autocomplete='new-password';
        try{input.type='password';input.setAttribute('type','password');}catch(_){ }
        ensurePasswordButton(input);
      });
      const add=$('newAccesoClave'); if(add){add.placeholder='Clave'; ensurePasswordButton(add);}
    }catch(_){ }
  }
  function setupLoginPasswordButtons(){
    ensurePasswordButton($('loginClave')); ensurePasswordButton($('changeNewPassword1')); ensurePasswordButton($('changeNewPassword2'));
    const panel=$('changePasswordPanel'); if(panel){
      let actions=panel.querySelector('.auth-subactions'); if(!actions){actions=document.createElement('div');actions.className='auth-subactions';panel.appendChild(actions);}
      if(!$('btnCancelChangePassword')){const b=document.createElement('button'); b.type='button'; b.id='btnCancelChangePassword'; b.className='outline ce-v225-cancel'; b.textContent='Cancelar'; b.addEventListener('click',ev=>{ev.preventDefault(); panel.classList.add('hidden'); ['changeNewPassword1','changeNewPassword2'].forEach(id=>{const el=$(id); if(el)el.value='';}); const er=$('authError'); if(er)er.textContent='';},true); actions.insertBefore(b,actions.firstChild);}
    }
  }
  const prevRenderAcc=(typeof renderAcceso==='function')?renderAcceso:null;
  if(prevRenderAcc&&!prevRenderAcc.__v225Clean){
    const w=function(){const ret=prevRenderAcc.apply(this,arguments); setTimeout(cleanAccessPasswordFields,20); return ret;};
    w.__v225Clean=true; try{renderAcceso=w;}catch(_){ } window.renderAcceso=w;
  }
  const prevFetchAcc=(typeof fetchAccessUsers==='function')?fetchAccessUsers:null;
  if(prevFetchAcc&&!prevFetchAcc.__v225Clean){
    const w=async function(){const ret=await prevFetchAcc.apply(this,arguments); setTimeout(cleanAccessPasswordFields,30); return ret;};
    w.__v225Clean=true; try{fetchAccessUsers=w;}catch(_){ } window.fetchAccessUsers=w;
  }

  // ---------- Permisos RO/RW básicos sin tocar otras zonas ----------
  function setDisabled(el,disabled){if(!el)return; el.disabled=!!disabled; el.classList.toggle('ce-v225-ro-disabled',!!disabled); if(disabled)el.setAttribute('aria-disabled','true'); else el.removeAttribute('aria-disabled');}
  function applyPermissions(){
    updateVersion();
    const ro=isRO();
    ['btnOpenImport','btnExportSeed'].forEach(id=>{const el=$(id); if(el){el.classList.toggle('ce-v225-hidden',ro); setDisabled(el,ro); if(ro)el.title='No disponible para usuarios RO';}});
    ['btnStartImport','importWorkbookFile','importTicketFiles','importMode','btnClearImportStatus'].forEach(id=>setDisabled($(id),ro));
    if(ro){$('mtImportar')?.classList.add('hidden');}
    const excel=$('btnExportExcel'); if(excel){excel.classList.remove('ce-v225-hidden','ce-v225-ro-disabled','locked'); excel.disabled=false; excel.removeAttribute('aria-disabled');}
    const allow=canEvents();
    ['mtEventosBtn','btnAddEvento','newEventoTitulo','newEventoPrecio','newEventoFechaIni','newEventoFechaFin','newEventoSituacion','newEventoDescripcion'].forEach(id=>setDisabled($(id),!allow));
    document.querySelectorAll('[data-action^="edit-evento"],button[data-action="save-evento"],button[data-action="delete-evento"]').forEach(el=>setDisabled(el,!allow));
  }
  document.addEventListener('click',ev=>{const blocked=ev.target?.closest?.('#btnOpenImport,#btnExportSeed,#btnStartImport,#importWorkbookFile,#importTicketFiles,#ceBackupOkV181'); if(blocked&&isRO()){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();alert('Usuario RO: no autorizado para cargas ni descargas de datos. Sí puede descargar INFOEVENTO.'); return false;}},true);
  document.addEventListener('click',ev=>{if(!canEvents())return; const btn=ev.target?.closest?.('button'); if(!btn)return; const action=btn.dataset.action||btn.id||''; if(action==='btnAddEvento'&&typeof addEvento==='function'){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();addEvento();return false;} if(action==='save-evento'&&typeof saveEventRecord==='function'){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();saveEventRecord(btn.dataset.id);return false;}},true);

  async function init(){
    updateVersion(); patchExcelProtection(); setupLoginPasswordButtons(); cleanAccessPasswordFields(); applyPermissions();
    await hydrateTicketImages().catch(()=>{}); fixTicketThumbs();
    try{if(typeof render==='function')render();}catch(_){ }
  }
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(init,30);});
  window.addEventListener('load',()=>{setTimeout(init,80);});
  init();
})();

/* ControlEvent v17_prod - Cálculos por tienda/ticket: fotos con método tipo Documentos.
   FIX8: mantiene fotos FIX6, recupera detalle completo de filas sin icono (i). No cambia versión. */
(function(){
  'use strict';
  const INSTALLED='__ceV17CalculosFotosDocMethodFinal';
  if(window[INSTALLED]) return;
  window[INSTALLED]=true;

  const STYLE_ID='ceV17CalculosFotosDocMethodFinalStyle';
  const WRITE_SCOPE='ticket-image-v8-5-fix26';
  const DB_NAME='controlevent_ticket_images_v225';
  const DB_STORE='images';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe=(fn,fb)=>{try{const out=fn();return out===undefined?fb:out;}catch(_){return fb;}};
  const getLexical=name=>safe(()=>Function('return (typeof '+name+'!=="undefined")?'+name+':undefined')(),undefined);
  const setLexical=(name,value)=>safe(()=>Function('value',name+'=value;')(value),undefined);
  const stop=ev=>{try{ev?.preventDefault?.();ev?.stopPropagation?.();ev?.stopImmediatePropagation?.();}catch(_){ } return false;};

  let previousRenderSummaryList=null;
  let previousSummaryByTiendaTicket=null;
  let previousRender=null;
  let previousRenderBudget=null;
  let drawing=false;
  let fetchingEvent='';
  let loadedEvent='';
  let fetchPromise=null;
  let lastDrawSig='';
  const serverImages={};
  const tombstones=new Set();
  const busy=new Set();

  function stateObjects(){
    const out=[];
    const add=o=>{if(o&&typeof o==='object'&&!out.includes(o))out.push(o);};
    add(getLexical('state'));
    add(window.state);
    add(window.ControlEventApp?.state);
    add(window.ControlEventRuntime?.app?.state);
    add(window.__CONTROL_EVENT_STATE__);
    return out;
  }
  function st(){return stateObjects()[0]||{};}
  function eventId(){
    const sid=safe(()=>typeof selectedEvent==='function'?(selectedEvent()||{}).id:'','')||safe(()=>window.selectedEvent?.()?.id,'');
    if(norm(sid)) return norm(sid);
    for(const s of stateObjects()){if(norm(s?.selectedEventId))return norm(s.selectedEventId);}
    return norm($('selectedEvent')?.value||'');
  }
  function currentEvent(){
    const id=eventId();
    for(const s of stateObjects()){
      const ev=(Array.isArray(s?.eventos)?s.eventos:[]).find(x=>String(x?.id||'')===id);
      if(ev)return ev;
    }
    return {};
  }
  function role(){return up(safe(()=>authUser?.nivel,'')||window.authUser?.nivel||window.ControlEventApp?.authUser?.nivel||'');}
  function canWrite(){const r=role();return r==='GD'||r==='RW';}
  function locked(){
    const val=safe(()=>typeof isLocked==='function'?isLocked():undefined,undefined);
    if(val!==undefined)return !!val;
    return /FINALIZADO/i.test(norm(currentEvent().situacion||currentEvent().estado||''));
  }
  function money(v){
    const n=Number(v||0);
    const fn=getLexical('money')||window.money;
    if(typeof fn==='function')return safe(()=>fn(n),new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n));
    return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);
  }
  function ticketToken(label){const m=norm(label).match(/\bTK\s*\d+[A-Z0-9_-]*\b/i);return m?m[0].replace(/\s+/g,'').toUpperCase():'';}
  function cleanLabel(label){
    const ev=eventId();
    let s=norm(label);
    try{s=decodeURIComponent(s);}catch(_){ }
    s=s.split('·')[0].replace(/\s*\|\s*/g,' | ').trim();
    if(ev&&s.startsWith(ev+' | '))s=s.slice(ev.length+3).trim();
    if(ev&&s.startsWith(ev+'|'))s=s.slice(ev.length+1).trim();
    return s.replace(/\s*\|\s*/g,' | ').trim();
  }
  function rowKey(row){return cleanLabel(row?.key||row?.k||row?.label||row?.concepto||'');}
  function splitParts(label){return cleanLabel(label).split('|').map(x=>norm(x)).filter(Boolean);}
  function canonicalKey(label){const ev=eventId();const clean=cleanLabel(label);return ev&&clean?ev+'|'+clean:clean;}
  function imageValue(v){
    if(!v)return '';
    if(typeof v==='string')return norm(v);
    if(typeof v==='object')return norm(v.url||v.public_url||v.publicUrl||v.pathname||v.path||v.storage_path||v.dataUrl||v.src||v.base64||'');
    return '';
  }
  function cacheBust(src, seed){
    src=norm(src); if(!src||/^data:/i.test(src))return src;
    if(/[?&]ce_img=/.test(src))return src;
    return src+(src.includes('?')?'&':'?')+'ce_img='+encodeURIComponent(seed||Date.now().toString(36));
  }
  function sameEventImageKey(key,value){
    const ev=eventId(); if(!ev)return false;
    const k=norm(key);
    if(k.startsWith(ev+'|'))return true;
    const src=imageValue(value);
    const m=src.match(/\/ticket-images\/([^\/?#]+)\//i);
    return !!(m&&decodeURIComponent(m[1])===ev);
  }
  function imageRest(key){const ev=eventId();const k=norm(key);return ev&&k.startsWith(ev+'|')?k.slice(ev.length+1):k;}
  function candidateKeys(label){
    const ev=eventId(), clean=cleanLabel(label), parts=splitParts(clean), tk=ticketToken(clean);
    const out=[]; const add=v=>{v=norm(v);if(v&&!out.includes(v))out.push(v);};
    const scoped=v=>{v=cleanLabel(v);if(!v)return;add(v);if(ev)add(ev+'|'+v);};
    scoped(clean);
    if(parts.length>=2){
      const store=parts[0], rest=parts.slice(1).join(' | ');
      [store+' | '+rest,store+'|'+rest,rest,tk?store+' | '+tk:'',tk?store+'|'+tk:'',tk||''].forEach(scoped);
    }else if(tk){ scoped(tk); }
    return out;
  }
  function matchesLabel(label,key,value){
    const ev=eventId(); const clean=cleanLabel(label); const tk=ticketToken(clean); const rest=imageRest(key); const restU=up(rest);
    const vars=new Set(candidateKeys(clean).map(norm));
    if(vars.has(norm(key))||vars.has(rest))return true;
    if(!sameEventImageKey(key,value))return false;
    if(tk&&restU.includes(tk)){
      const p=splitParts(clean); const store=up(p[0]||'');
      return !store || restU.includes(store) || restU===tk;
    }
    return up(rest)===up(clean);
  }
  function normalizeApiImages(images){
    Object.keys(serverImages).forEach(k=>delete serverImages[k]);
    for(const [k,v] of Object.entries(images||{})){
      const src=cacheBust(imageValue(v), norm(v?.storage_path||v?.pathname||v?.url||k));
      if(src)serverImages[k]=src;
    }
  }
  async function loadServerImages(force=false){
    const ev=eventId(); if(!ev)return {};
    if(!force&&loadedEvent===ev)return Promise.resolve(serverImages);
    if(!force&&fetchingEvent===ev&&fetchPromise)return fetchPromise;
    fetchingEvent=ev;
    fetchPromise=fetch('/api/ticket-images?eventId='+encodeURIComponent(ev),{cache:'no-store'})
      .then(async res=>{const json=await res.json().catch(()=>({})); if(!res.ok)throw new Error(json.error||json.message||('HTTP '+res.status)); normalizeApiImages(json.images||{}); loadedEvent=ev; return serverImages;})
      .catch(err=>{console.warn('[ControlEvent v17_prod] No se pudieron cargar fotos de tickets:',err?.message||err); return serverImages;})
      .finally(()=>{fetchPromise=null;});
    return fetchPromise;
  }
  function imageFor(label){
    const clean=cleanLabel(label); const tk=ticketToken(clean); const p=splitParts(clean); const storeU=up(p[0]||'');
    if(tombstones.has(canonicalKey(clean))||tombstones.has(tk))return '';
    let best={score:-1,src:''};
    for(const [key,src] of Object.entries(serverImages)){
      if(!sameEventImageKey(key,src))continue;
      const rest=imageRest(key); const restU=up(rest); let score=-1;
      if(key===canonicalKey(clean))score=1000;
      else if(up(rest)===up(clean))score=800;
      else if(tk&&restU.includes(tk)&&(!storeU||restU.includes(storeU)||restU===tk))score=500;
      else if(matchesLabel(clean,key,src))score=300;
      if(score>best.score)best={score,src};
    }
    return best.score>=0?best.src:'';
  }
  function clearStateAliases(label){
    const clean=cleanLabel(label), tk=ticketToken(clean), p=splitParts(clean), storeU=up(p[0]||'');
    const keys=new Set(candidateKeys(clean));
    for(const s of stateObjects()){
      ['ticketImages','ticketImageRefs','ticketImagesByKey','__photoCache','ticketImagesBackup','ticketImagesLocal'].forEach(name=>{
        const bag=s?.[name]; if(!bag||typeof bag!=='object')return;
        Object.keys(bag).forEach(k=>{
          const restU=up(imageRest(k));
          if(keys.has(k)||matchesLabel(clean,k,bag[k])||(tk&&sameEventImageKey(k,bag[k])&&restU.includes(tk)&&(!storeU||restU.includes(storeU)||restU===tk))){
            try{delete bag[k];}catch(_){ }
          }
        });
      });
    }
    try{
      const storageKey=norm(getLexical('STORAGE_KEY')||'controlevent_v6_4');
      const raw=localStorage.getItem(storageKey);
      if(raw){
        const obj=JSON.parse(raw);
        ['ticketImages','ticketImageRefs','ticketImagesByKey'].forEach(name=>{
          const bag=obj?.[name]; if(!bag||typeof bag!=='object')return;
          Object.keys(bag).forEach(k=>{if(keys.has(k)||matchesLabel(clean,k,bag[k]))delete bag[k];});
        });
        localStorage.setItem(storageKey,JSON.stringify(obj));
      }
    }catch(_){ }
  }
  async function clearIndexedDbAliases(label){
    if(!('indexedDB' in window))return;
    const clean=cleanLabel(label), tk=ticketToken(clean), p=splitParts(clean), storeU=up(p[0]||'');
    const keySet=new Set(candidateKeys(clean));
    await new Promise(resolve=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onerror=()=>resolve();
      req.onsuccess=()=>{
        const db=req.result;
        try{
          if(!db.objectStoreNames.contains(DB_STORE)){db.close(); resolve(); return;}
          const tx=db.transaction(DB_STORE,'readwrite'); const store=tx.objectStore(DB_STORE);
          const cur=store.openCursor();
          cur.onsuccess=()=>{
            const c=cur.result;
            if(c){
              const k=String(c.key||''); const restU=up(imageRest(k));
              if(keySet.has(k)||(tk&&k.startsWith(eventId()+'|')&&restU.includes(tk)&&(!storeU||restU.includes(storeU)||restU===tk))) c.delete();
              c.continue();
            }
          };
          tx.oncomplete=()=>{try{db.close();}catch(_){ } resolve();};
          tx.onerror=()=>{try{db.close();}catch(_){ } resolve();};
        }catch(_){try{db.close();}catch(__){ } resolve();}
      };
    });
  }
  function setServerImage(label,src){
    const key=canonicalKey(label);
    if(src)serverImages[key]=src; else delete serverImages[key];
  }
  function beginTombstone(label){
    const clean=cleanLabel(label), tk=ticketToken(clean);
    tombstones.add(canonicalKey(clean)); if(tk)tombstones.add(tk);
  }
  function endTombstone(label){
    const clean=cleanLabel(label), tk=ticketToken(clean);
    tombstones.delete(canonicalKey(clean)); if(tk)tombstones.delete(tk);
  }
  function rowsFromExisting(){
    const fn=previousSummaryByTiendaTicket||getLexical('summaryByTiendaTicket')||window.summaryByTiendaTicket;
    if(typeof fn==='function')return safe(()=>fn()||[],[]);
    return [];
  }

  function arr(name){
    for(const s of stateObjects()){
      const v=s?.[name];
      if(Array.isArray(v)) return v;
    }
    return [];
  }
  function byId(name,id){
    const sid=String(id??'');
    return arr(name).find(x=>String(x?.id??x?.ID??'')===sid) || {};
  }
  function displayName(obj){return norm(obj?.nombre||obj?.name||obj?.titulo||obj?.descripcion||obj?.label||obj?.id||'');}
  function productName(c){
    return norm(c?.producto?.nombre||c?.product?.nombre||c?.productoNombre||c?.productName||c?.nombreProducto||displayName(byId('productos',c?.productoId??c?.producto_id??c?.productId))||'Producto');
  }
  function storeName(c){
    return norm(c?.tienda?.nombre||c?.store?.nombre||c?.tiendaNombre||c?.storeName||displayName(byId('tiendas',c?.tiendaId??c?.tienda_id??c?.storeId))||'Sin tienda');
  }
  function personName(id){return displayName(byId('personas',id))||'';}
  function donorName(c){
    const ref=norm(c?.donorRef??c?.donanteRef??c?.donante_id??c?.donanteId??c?.personaId??'');
    if(ref.startsWith('P:')) return personName(ref.slice(2)) || 'Sin donante';
    if(ref.startsWith('T:')) return displayName(byId('tiendas',ref.slice(2))) || 'Sin donante';
    if(ref) return personName(ref) || displayName(byId('tiendas',ref)) || ref;
    return norm(c?.donante?.nombre||c?.donor?.nombre||c?.persona?.nombre||c?.tiendaDonante?.nombre||'Sin donante');
  }
  function units(c){return Number(c?.unidades??c?.uds??c?.cantidad??c?.qty??0)||0;}
  function price(c){
    const p=c?.precio??c?.precioUnitario??c?.price??c?.importeUnitario??c?.producto?.defaultPrecio??c?.producto?.precio??byId('productos',c?.productoId??c?.producto_id??c?.productId)?.defaultPrecio??byId('productos',c?.productoId??c?.producto_id??c?.productId)?.precio??0;
    return Number(p)||0;
  }
  function valueLine(c){
    const explicit=c?.importe??c?.total??c?.valor??c?.amount;
    const n=Number(explicit);
    if(Number.isFinite(n)&&n!==0) return n;
    return units(c)*price(c);
  }
  function ticketOf(c){return norm(c?.ticketDonacion??c?.ticket_donacion??c?.ticket??c?.donacion??c?.ticketId??'');}
  function isDonationTicket(t){const u=up(t); return u.startsWith('DONADO')||u.includes('DONACION')||u.includes('DONADO');}
  function isCurrentOrPending(t){
    const u=up(t);
    return !u || u==='GASTOS CORRIENTES' || u.includes('GASTOS CORRIENTES') || u.includes('PTE') || u.includes('PENDIENTE');
  }
  function fmtNum(v){return new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(Number(v||0));}
  function linePurchase(c,first){return [first,storeName(c),productName(c),fmtNum(units(c)),money(price(c)),money(valueLine(c))];}
  function lineDonation(c){return [donorName(c),productName(c),fmtNum(units(c)),money(price(c)),money(valueLine(c))];}
  function detailedRowsFromState(){
    const ev=eventId();
    if(!ev) return [];
    const filled=new Map(), pending=new Map();
    arr('compras').filter(c=>String(c?.eventId??c?.event_id??'')===ev).forEach(c=>{
      const tk=ticketOf(c);
      const donated=isDonationTicket(tk);
      const v=valueLine(c);
      if(!donated && isCurrentOrPending(tk)){
        const key=storeName(c)+' | Pte. Compra u otros gastos';
        if(!pending.has(key)) pending.set(key,{key,label:key,k:key,v:0,pending:true,donated:false,attachable:false,lines:[],headers:['Ticket/Otros gastos','Tienda','Producto','Uds','Precio','Total']});
        const r=pending.get(key); r.v+=v; r.lines.push(linePurchase(c,tk||'PTE.COMPRA')); return;
      }
      const holder=donated?donorName(c):storeName(c);
      const key=holder+' | '+(tk || 'Pte. Compra u otros gastos');
      if(!filled.has(key)) filled.set(key,{key,label:key,k:key,v:0,pending:false,donated,attachable:!donated&&!isCurrentOrPending(tk),rawTicket:tk,lines:[],headers:donated?['Donante','Producto','Uds','Precio estimado','Valor estimado']:['Ticket/Otros gastos','Tienda','Producto','Uds','Precio','Total']});
      const r=filled.get(key); r.v+=v; r.lines.push(donated?lineDonation(c):linePurchase(c,tk||'PTE.COMPRA'));
    });
    return [...filled.values(),...pending.values()];
  }
  function hasFullDetail(r){return Array.isArray(r?.headers)&&r.headers.length&&Array.isArray(r?.lines)&&r.lines.length;}
  function fullDetailFor(label,row){
    if(hasFullDetail(row)) return row;
    const clean=cleanLabel(label||rowKey(row)||row?.label||row?.key||'');
    const u=up(clean);
    const found=detailedRowsFromState().find(x=>up(cleanLabel(x.key||x.label||''))===u) || null;
    if(found) return {...row,...found,v:Number(row?.v??found.v??0)||Number(found.v||0)};
    return row||{key:clean,label:clean,v:0,headers:[],lines:[]};
  }
  function tipForRow(r,label){
    if(r?.headers&&Array.isArray(r?.lines)){
      const out=[]; out.push(r.donated?'CÁLCULOS POR DONANTE Y DONACIÓN':(r.pending?'PENDIENTE DE COMPRA U OTROS GASTOS':'CÁLCULOS POR TIENDA Y TICKET'));
      out.push(label); out.push('TOTAL | '+money(r.v||0)); out.push(''); out.push((r.headers||[]).join(' | '));
      (r.lines||[]).forEach(line=>out.push((line||[]).join(' | ')));
      return out.join('\n');
    }
    return norm(r?.tip||r?.tooltip||r?.label||label);
  }
  function rowTitle(r){
    return r?.donated?'CÁLCULOS POR DONANTE Y DONACIÓN':(r?.pending?'PENDIENTE DE COMPRA U OTROS GASTOS':'CÁLCULOS POR TIENDA Y TICKET');
  }
  function normalizeLine(line,cols){
    if(Array.isArray(line)) return line.map(x=>String(x??''));
    const parts=String(line??'').split('|').map(x=>norm(x));
    if(cols&&parts.length<cols){ while(parts.length<cols) parts.push(''); }
    return parts;
  }
  function showRowDetail(r,label,ev){
    stop(ev||{});
    const clean=cleanLabel(label||rowKey(r)||r?.label||r?.key||'');
    r=fullDetailFor(clean,r||{});
    document.querySelectorAll('.ce-v17-rowdetail-modal').forEach(x=>x.remove());
    const title=rowTitle(r);
    const heads=Array.isArray(r?.headers)?r.headers.map(x=>String(x??'')):[];
    const lines=Array.isArray(r?.lines)?r.lines:[];
    const modal=document.createElement('div');
    modal.className='ce-v17-rowdetail-modal'+(r?.pending?' pending':'')+(r?.donated?' donated':'');
    let body='';
    if(heads.length){
      const htmlRows=(lines.length?lines:[['Sin detalle']]).map(line=>{
        const cells=normalizeLine(line,heads.length);
        return '<tr>'+cells.map(cell=>'<td>'+esc(cell)+'</td>').join('')+'</tr>';
      }).join('');
      body='<div class="ce-v17-rowdetail-table-wrap"><table class="ce-v17-rowdetail-table"><thead><tr>'+heads.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+htmlRows+'</tbody></table></div>';
    }else{
      const txt=tipForRow(r,clean)||'Sin detalle';
      body='<pre class="ce-v17-rowdetail-pre">'+esc(txt)+'</pre>';
    }
    modal.innerHTML='<div class="ce-v17-rowdetail-card" role="dialog" aria-modal="true"><div class="ce-v17-rowdetail-head"><div><h3>'+esc(title)+'</h3><p>'+esc(clean)+'</p></div><button type="button" class="ce-v17-rowdetail-close" aria-label="Cerrar">×</button></div><div class="ce-v17-rowdetail-total"><span>'+esc(r?.donated?'TOTAL ESTIMADO':'TOTAL')+'</span><strong>'+esc(money(r?.v||0))+'</strong></div>'+body+'</div>';
    modal.addEventListener('click',e=>{
      if(e.target===modal||e.target.closest('.ce-v17-rowdetail-close')){
        stop(e); modal.remove();
      }
    },true);
    document.body.appendChild(modal);
    return false;
  }
  function renderSummaryTiendaTicketDirect(rowsArg){
    const root=$('summaryTiendaTicket'); if(!root||drawing)return;
    const rows=(Array.isArray(rowsArg)&&rowsArg.length?rowsArg:rowsFromExisting()).filter(Boolean);
    const ev=eventId(); if(ev&&loadedEvent!==ev)loadServerImages(false).then(()=>renderSummaryTiendaTicketDirect(rows)).catch(()=>{});
    const mode=st().summaryTiendaSort||'tienda';
    const sig=JSON.stringify([ev,mode,rows.map(r=>[rowKey(r),Math.round(Number(r.v||0)*100),!!r.pending,!!r.donated,!!r.attachable,imageFor(rowKey(r))])]);
    if(root.dataset.ceV17DocPhotoSig===sig&&root.querySelector('.ce-v17-doc-sortbar'))return;
    drawing=true;
    try{
      root.dataset.ceV17DocPhotoSig=sig;
      root.classList.add('ce-v17-doc-photo-ready','ce-hf10-ready');
      root.innerHTML='';
      const tools=document.createElement('div'); tools.className='hint ce-v17-doc-sortbar ce-hf10-sortbar';
      tools.innerHTML='<span>Ordenar por:</span> <button type="button" class="outline small '+(mode==='tienda'?'active':'')+'" data-ce-v17-sort="tienda">Tienda</button> <button type="button" class="outline small '+(mode==='ticket'?'active':'')+'" data-ce-v17-sort="ticket">Ticket/Donación/Otros gastos</button>';
      root.appendChild(tools);
      if(!rows.length){const empty=document.createElement('div');empty.className='hint';empty.textContent='Sin datos.';root.appendChild(empty);return;}
      let total=0;
      rows.forEach(r=>{
        const label=rowKey(r); if(!label)return;
        total+=Number(r.v||0);
        const pending=!!r.pending; const donated=!!r.donated; const attachable=!!r.attachable&&!pending&&!donated&&!!ticketToken(label);
        const src=attachable?imageFor(label):''; const rowTip=tipForRow(r,label);
        const div=document.createElement('div');
        div.className='summary-item ce-hf10-row ce-v17-doc-row'+(pending?' red-row ce-v17-pending':'')+(donated?' ce-hf10-donation':'');
        div.dataset.ceV17Label=label; div.dataset.ceTicketLabel=label; div.setAttribute('role','button'); div.setAttribute('tabindex','0'); div.setAttribute('aria-label','Ver detalle');
        const amountStyle=pending?' style="background:#fef2f2;color:#b91c1c"':(donated?' style="text-decoration:line-through"':'');
        const left=document.createElement('span'); left.className='ce-hf10-label'; left.innerHTML=esc(label);
        const right=document.createElement('span'); right.className='ce-v17-doc-right'; right.innerHTML='<span class="pill"'+amountStyle+'>'+esc(money(r.v||0))+'</span>';
        if(attachable){
          const actions=document.createElement('span'); actions.className='ticket-actions ce-v17-doc-actions'; actions.dataset.ceV17Label=label;
          const attach=document.createElement('button'); attach.type='button'; attach.className='outline small ce-v17-doc-photo-btn'; attach.dataset.ceV17Photo='attach'; attach.dataset.ceV17Label=label; attach.title='Adjuntar foto'; attach.setAttribute('aria-label','Adjuntar foto'); attach.textContent='📎'; attach.disabled=busy.has(canonicalKey(label)); actions.appendChild(attach);
          if(src){
            const img=document.createElement('img'); img.className='ticket-thumb ce-v17-doc-thumb'; img.alt='ticket'; img.loading='lazy'; img.decoding='async'; img.src=src; img.dataset.ceHf12Tk=ticketToken(label); img.dataset.ceV17Src=src; actions.appendChild(img);
            const rem=document.createElement('button'); rem.type='button'; rem.className='outline small ce-v17-doc-photo-btn'; rem.dataset.ceV17Photo='remove'; rem.dataset.ceV17Label=label; rem.title='Eliminar foto'; rem.setAttribute('aria-label','Eliminar foto'); rem.textContent='🗑️'; rem.disabled=busy.has(canonicalKey(label)); actions.appendChild(rem);
          }else{
            const no=document.createElement('span'); no.className='hint ce-v17-noimage'; no.textContent='Sin imagen'; actions.appendChild(no);
          }
          right.appendChild(actions);
        }
        div.appendChild(left); div.appendChild(right);
        div.addEventListener('click',ev=>{ if(ev.target.closest('button,input,select,a,img,.ticket-actions'))return; showRowDetail(r,label,ev); });
        div.addEventListener('keydown',ev=>{ if(ev.key==='Enter'||ev.key===' '){ showRowDetail(r,label,ev); } });
        root.appendChild(div);
      });
      const td=document.createElement('div'); td.className='summary-item ce-v17-doc-total'; td.style.fontWeight='800'; td.innerHTML='<span>TOTAL EVENTO</span><span class="pill">'+esc(money(total))+'</span>'; root.appendChild(td);
      root.querySelectorAll('[data-ce-v17-sort]').forEach(btn=>btn.addEventListener('click',ev=>{stop(ev); st().summaryTiendaSort=btn.dataset.ceV17Sort||'tienda'; try{localStorage.setItem(getLexical('STORAGE_KEY')||'controlevent_v6_4',JSON.stringify(st()));}catch(_){ } root.dataset.ceV17DocPhotoSig=''; if(typeof previousRenderBudget==='function')previousRenderBudget(); else renderSummaryTiendaTicketDirect();},true));
    }finally{drawing=false;}
  }
  function redraw(){renderSummaryTiendaTicketDirect();}
  function refreshAfterAction(label,src){
    if(src)setServerImage(label,src); else setServerImage(label,'');
    const root=$('summaryTiendaTicket'); if(root)root.dataset.ceV17DocPhotoSig='';
    renderSummaryTiendaTicketDirect();
  }
  function guard(ev){
    if(!canWrite()){alert('No autorizado para modificar fotos.');return stop(ev||{});}
    if(locked()){alert('Evento finalizado. No se puede modificar.');return stop(ev||{});}
    return true;
  }
  function fileToCompressedDataUrl(file){
    return new Promise((resolve,reject)=>{
      if(!file)return reject(new Error('Selecciona una imagen.'));
      if(file.type&&!/^image\//i.test(file.type))return reject(new Error('El archivo debe ser una imagen.'));
      const reader=new FileReader();
      reader.onerror=()=>reject(reader.error||new Error('No se pudo leer la imagen.'));
      reader.onload=()=>{
        const original=String(reader.result||'');
        const img=new Image();
        img.onerror=()=>resolve(original);
        img.onload=()=>{
          try{const max=1500;let w=img.width||max,h=img.height||max;const r=Math.min(max/Math.max(w,1),max/Math.max(h,1),1);w=Math.max(1,Math.round(w*r));h=Math.max(1,Math.round(h*r));const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);resolve(c.toDataURL('image/jpeg',0.84));}catch(_){resolve(original);}
        };
        img.src=original;
      };
      reader.readAsDataURL(file);
    });
  }
  async function apiJson(url,options={}){
    const res=await fetch(url,{cache:'no-store',...options,headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':WRITE_SCOPE,...(options.headers||{})}});
    const text=await res.text().catch(()=>''); let json={}; try{json=text?JSON.parse(text):{};}catch(_){json={};}
    if(!res.ok)throw new Error(json.error||json.message||text||('HTTP '+res.status));
    return json;
  }
  async function deleteServer(label){
    const ev=eventId(), key=cleanLabel(label); if(!ev||!key)return {ok:true};
    return apiJson('/api/ticket-images?eventId='+encodeURIComponent(ev)+'&key='+encodeURIComponent(key),{method:'DELETE',body:JSON.stringify({eventId:ev,key})});
  }
  async function uploadServer(label,dataUrl){
    const ev=eventId(), key=cleanLabel(label); if(!ev||!key||!/^data:image\//i.test(dataUrl))throw new Error('Falta evento, ticket o imagen.');
    const json=await apiJson('/api/ticket-images',{method:'POST',body:JSON.stringify({eventId:ev,key,dataUrl})});
    const image=json.image||json||{}; const src=cacheBust(imageValue(image)||dataUrl,image.storage_path||image.pathname||image.url||Date.now());
    return {image,src};
  }
  async function attachPhoto(label,ev){
    stop(ev||{}); if(guard(ev)!==true)return false; label=cleanLabel(label); if(!label)return false;
    const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.style.cssText='position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0'; document.body.appendChild(input);
    input.addEventListener('change',async()=>{
      const file=input.files&&input.files[0]; if(!file)return;
      const bkey=canonicalKey(label); busy.add(bkey); beginTombstone(label); clearStateAliases(label); await clearIndexedDbAliases(label); refreshAfterAction(label,'');
      try{
        const dataUrl=await fileToCompressedDataUrl(file);
        await deleteServer(label).catch(err=>console.warn('[ControlEvent v17_prod] Limpieza previa TK:',err?.message||err));
        clearStateAliases(label); await clearIndexedDbAliases(label);
        const uploaded=await uploadServer(label,dataUrl);
        endTombstone(label); setServerImage(label,uploaded.src); clearStateAliases(label);
        for(const s of stateObjects()){
          if(!s.ticketImages||typeof s.ticketImages!=='object')s.ticketImages={};
          if(!s.ticketImageRefs||typeof s.ticketImageRefs!=='object')s.ticketImageRefs={};
          const k=canonicalKey(label); s.ticketImages[k]=uploaded.src; s.ticketImageRefs[k]={key:k,url:uploaded.src,pathname:uploaded.src};
        }
        refreshAfterAction(label,uploaded.src);
        window.dispatchEvent(new CustomEvent('controlevent:ticket-image-changed',{detail:{eventId:eventId(),key:canonicalKey(label),action:'upload'}}));
      }catch(error){endTombstone(label); alert('No se pudo adjuntar la foto. '+(error?.message||error)); await loadServerImages(true); refreshAfterAction(label,imageFor(label));}
      finally{busy.delete(bkey); try{input.value='';input.remove();}catch(_){ } refreshAfterAction(label,imageFor(label));}
    },{once:true});
    input.click(); return false;
  }
  async function removePhoto(label,ev){
    stop(ev||{}); if(guard(ev)!==true)return false; label=cleanLabel(label); if(!label)return false;
    if(!confirm('¿Eliminar la foto asociada a este ticket?'))return false;
    const bkey=canonicalKey(label); busy.add(bkey); beginTombstone(label); clearStateAliases(label); await clearIndexedDbAliases(label); refreshAfterAction(label,'');
    try{
      await deleteServer(label);
      clearStateAliases(label); await clearIndexedDbAliases(label); setServerImage(label,'');
      refreshAfterAction(label,'');
      window.dispatchEvent(new CustomEvent('controlevent:ticket-image-changed',{detail:{eventId:eventId(),key:canonicalKey(label),action:'delete'}}));
    }catch(error){alert('No se pudo eliminar la foto. '+(error?.message||error));}
    finally{busy.delete(bkey); await loadServerImages(true); if(!imageFor(label))beginTombstone(label); refreshAfterAction(label,imageFor(label));}
    return false;
  }
  function labelFromControl(control){
    const explicit=control?.dataset?.ceV17Label||control?.closest?.('.ticket-actions')?.dataset?.ceV17Label||control?.closest?.('.summary-item')?.dataset?.ceV17Label||'';
    if(explicit)return cleanLabel(explicit);
    const onclick=norm(control?.getAttribute?.('onclick')||'');
    const m=onclick.match(/(?:uploadTicketImage|removeTicketImage)[^(]*\((?:event\s*,\s*)?['"]([^'"]+)['"]/i); if(m)return cleanLabel(m[1]);
    const row=control?.closest?.('#summaryTiendaTicket .summary-item'); return row?rowKey({label:row.querySelector('.ce-hf10-label,span:first-child')?.textContent||''}):'';
  }
  function actionFromControl(control){
    const data=norm(control?.dataset?.ceV17Photo||control?.dataset?.ceV17PhotoAction||''); if(data==='attach'||data==='remove')return data;
    const txt=up((control?.textContent||'')+' '+(control?.title||'')+' '+(control?.getAttribute?.('aria-label')||'')+' '+(control?.getAttribute?.('onclick')||''));
    if(/REMOVE|ELIMINAR|BORRAR|🗑/.test(txt))return 'remove';
    if(/UPLOAD|ADJUNTAR|INSERTAR|SUBIR|📎/.test(txt))return 'attach';
    return '';
  }
  function handleActivation(ev){
    const c=ev.target?.closest?.('#summaryTiendaTicket .ticket-actions button,#summaryTiendaTicket .ticket-actions input,#summaryTiendaTicket button[onclick*="uploadTicketImage"],#summaryTiendaTicket button[onclick*="removeTicketImage"]');
    if(!c)return;
    const action=actionFromControl(c), label=labelFromControl(c); if(!action||!label)return;
    if(action==='attach')return attachPhoto(label,ev);
    if(action==='remove')return removePhoto(label,ev);
  }
  function wrapGlobals(){
    const upFn=function(evOrEncoded,maybeEncoded){
      if(evOrEncoded&&evOrEncoded.target&&evOrEncoded.target.files){ const label=cleanLabel(maybeEncoded||''); const file=evOrEncoded.target.files&&evOrEncoded.target.files[0]; if(!file||!label)return false; const input=evOrEncoded.target; (async()=>{try{const dataUrl=await fileToCompressedDataUrl(file); beginTombstone(label); clearStateAliases(label); await clearIndexedDbAliases(label); refreshAfterAction(label,''); await deleteServer(label).catch(()=>{}); const uploaded=await uploadServer(label,dataUrl); endTombstone(label); setServerImage(label,uploaded.src); refreshAfterAction(label,uploaded.src);}catch(e){alert('No se pudo adjuntar la foto. '+(e?.message||e));}finally{try{input.value='';}catch(_){}}})(); return false; }
      return attachPhoto(evOrEncoded,null);
    };
    const rmFn=function(encoded){return removePhoto(encoded,null);};
    ['uploadTicketImage','uploadTicketImageV164','uploadTicketImageV202'].forEach(name=>{try{window[name]=upFn;setLexical(name,upFn);}catch(_){window[name]=upFn;}});
    ['removeTicketImage','removeTicketImageV164','removeTicketImageV202'].forEach(name=>{try{window[name]=rmFn;setLexical(name,rmFn);}catch(_){window[name]=rmFn;}});
  }
  function wrapRenderers(){
    if(!previousRenderSummaryList){previousRenderSummaryList=getLexical('renderSummaryList')||window.renderSummaryList||null;}
    if(!previousSummaryByTiendaTicket){previousSummaryByTiendaTicket=getLexical('summaryByTiendaTicket')||window.summaryByTiendaTicket||null;}
    const rs=function(targetId,rows){ if(targetId==='summaryTiendaTicket'){renderSummaryTiendaTicketDirect(rows);return;} return typeof previousRenderSummaryList==='function'?previousRenderSummaryList.apply(this,arguments):undefined; };
    try{window.renderSummaryList=rs;setLexical('renderSummaryList',rs);}catch(_){window.renderSummaryList=rs;}
    if(!previousRenderBudget){previousRenderBudget=getLexical('renderBudget')||window.renderBudget||null;}
    if(previousRenderBudget&&!previousRenderBudget.__ceV17DocWrapped){
      const originalBudget=previousRenderBudget;
      const rb=function(){const ret=originalBudget.apply(this,arguments); setTimeout(redraw,0); return ret;}; rb.__ceV17DocWrapped=true; try{window.renderBudget=rb;setLexical('renderBudget',rb);}catch(_){window.renderBudget=rb;}
    }
    if(!previousRender){previousRender=getLexical('render')||window.render||null;}
    if(previousRender&&!previousRender.__ceV17DocWrapped){
      const originalRender=previousRender;
      const rr=function(){const ret=originalRender.apply(this,arguments); setTimeout(redraw,0); return ret;}; rr.__ceV17DocWrapped=true; try{window.render=rr;setLexical('render',rr);}catch(_){window.render=rr;}
    }
  }
  function injectStyle(){
    if($(STYLE_ID))return;
    const style=document.createElement('style'); style.id=STYLE_ID;
    style.textContent=`
      #summaryTiendaTicket .ticket-actions{display:inline-flex!important;align-items:center!important;gap:8px!important;justify-content:flex-end!important;white-space:nowrap!important;min-width:112px!important;}
      #summaryTiendaTicket .ticket-actions input.ticket-file-input,#summaryTiendaTicket .ticket-actions button:not([data-ce-v17-photo]):not(.ce-v17-doc-photo-btn){display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #summaryTiendaTicket .ce-v17-doc-photo-btn{width:34px!important;min-width:34px!important;height:30px!important;min-height:30px!important;padding:2px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:17px!important;line-height:1!important;border-radius:8px!important;white-space:nowrap!important;background:#fff!important;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;}
      #summaryTiendaTicket .ticket-thumb.ce-v17-doc-thumb{width:36px!important;height:36px!important;object-fit:cover!important;border-radius:8px!important;display:inline-block!important;}
      #summaryTiendaTicket .ce-v17-noimage{font-size:12px!important;color:#64748b!important;white-space:nowrap!important;}
      #summaryTiendaTicket .ce-v17-doc-row{min-height:44px!important;transition:none!important;animation:none!important;}
      #summaryTiendaTicket .ce-v17-doc-right{display:flex!important;align-items:center!important;gap:8px!important;justify-content:flex-end!important;}
      #summaryTiendaTicket .ce-v17-doc-sortbar button.active{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important;}
      #summaryTiendaTicket .ce-hf10-label i,#summaryTiendaTicket .ce-v17-doc-row i{display:none!important;visibility:hidden!important;}
      #summaryTiendaTicket .ce-v17-doc-row{cursor:pointer!important;}
      .ce-v17-rowdetail-modal{position:fixed!important;inset:0!important;background:rgba(15,23,42,.38)!important;z-index:9800!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:14px!important;}
      .ce-v17-rowdetail-card{width:min(980px,94vw)!important;max-height:78vh!important;overflow:auto!important;background:#fff!important;border-radius:18px!important;border:2px solid #0f172a!important;box-shadow:0 24px 80px rgba(15,23,42,.35)!important;padding:14px!important;color:#0f172a!important;}
      .ce-v17-rowdetail-head{display:flex!important;justify-content:space-between!important;gap:12px!important;align-items:flex-start!important;border-bottom:1px solid #e2e8f0!important;padding-bottom:8px!important;margin-bottom:8px!important;}
      .ce-v17-rowdetail-head h3{margin:0!important;font-size:18px!important;font-weight:950!important;}
      .ce-v17-rowdetail-head p{margin:4px 0 0!important;font-weight:850!important;color:#334155!important;}
      .ce-v17-rowdetail-close{border:0!important;background:#0f172a!important;color:#fff!important;border-radius:999px!important;width:46px!important;height:46px!important;font-size:30px!important;font-weight:950!important;line-height:1!important;cursor:pointer!important;}
      .ce-v17-rowdetail-total{display:flex!important;justify-content:space-between!important;gap:12px!important;align-items:center!important;background:#e0f2fe!important;border-radius:12px!important;padding:8px 10px!important;margin-bottom:8px!important;font-weight:950!important;}
      .ce-v17-rowdetail-table-wrap{overflow:auto!important;border:1px solid #dbe4ee!important;border-radius:12px!important;}
      .ce-v17-rowdetail-table{border-collapse:separate!important;border-spacing:0!important;width:100%!important;min-width:680px!important;font-size:13px!important;}
      .ce-v17-rowdetail-table th,.ce-v17-rowdetail-table td{padding:7px 9px!important;border-bottom:1px solid #e2e8f0!important;border-right:1px solid #eef2f7!important;text-align:left!important;white-space:nowrap!important;}
      .ce-v17-rowdetail-table th{position:sticky!important;top:0!important;background:#f1f5f9!important;font-weight:950!important;z-index:1!important;}
      .ce-v17-rowdetail-table td:nth-last-child(-n+3),.ce-v17-rowdetail-table th:nth-last-child(-n+3){text-align:right!important;}
      .ce-v17-rowdetail-table td:first-child{font-weight:850!important;}
      .ce-v17-rowdetail-pre{white-space:pre-wrap!important;background:#f8fafc!important;border:1px solid #e2e8f0!important;border-radius:12px!important;padding:10px!important;max-height:55vh!important;overflow:auto!important;font-family:inherit!important;}
      #summaryTiendaTicket .ce-v17-pending .ce-hf10-label{color:#b91c1c!important;font-weight:950!important;}
      .ce-v17-rowdetail-modal.pending .ce-v17-rowdetail-head h3,.ce-v17-rowdetail-modal.pending .ce-v17-rowdetail-head p{color:#b91c1c!important;}
      .ce-v17-rowdetail-modal.pending .ce-v17-rowdetail-total{background:#fef2f2!important;color:#b91c1c!important;}
      #ceV104TicketDetail .ce-v104-close-row,#ceV103TicketDetail .ce-v103-close-row,#ceV102TicketDetail .ce-v102-close-row{position:sticky!important;bottom:0!important;z-index:20!important;background:linear-gradient(to top,#fff 72%,rgba(255,255,255,0))!important;padding:10px 4px 4px!important;margin-top:0!important;}
      #ceV104TicketDetail [data-ce-v104-close],#ceV103TicketDetail [data-ce-v103-close],#ceV102TicketDetail [data-ce-v102-close],#ceV101TicketDetail [data-ce-v101-close],#ceV100TicketDetail [data-ce-v100-close],#ceV96TicketDetail [data-ce-v96-close]{position:fixed!important;right:calc(2vw + 20px)!important;bottom:calc(3vh + 16px)!important;top:auto!important;z-index:10000080!important;min-width:96px!important;min-height:38px!important;font-weight:950!important;background:#fff!important;}
    `;
    document.head.appendChild(style);
  }
  function install(){injectStyle();wrapGlobals();wrapRenderers();loadServerImages(false).then(redraw);redraw();}
  ['click','pointerup','touchend'].forEach(type=>{window.addEventListener(type,handleActivation,{capture:true,passive:false});document.addEventListener(type,handleActivation,{capture:true,passive:false});});
  document.addEventListener('change',ev=>{ if(ev.target&&ev.target.id==='selectedEvent'){ Object.keys(serverImages).forEach(k=>delete serverImages[k]); loadedEvent=''; tombstones.clear(); setTimeout(()=>loadServerImages(true).then(redraw),80); } },true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-loaded','controlevent:data-loaded','controlevent:module-mounted'].forEach(evt=>window.addEventListener(evt,()=>setTimeout(install,30),true));
  [0,250,1000].forEach(ms=>setTimeout(install,ms));
  window.ControlEventV17CalculosFotos={install,redraw,attachPhoto,removePhoto,loadServerImages,serverImages,version:'v17_prod_doc_method_fix8_detalle_completo_avance'};
})();

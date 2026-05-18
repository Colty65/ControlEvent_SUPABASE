/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #46. */
/* ==== v23.3 ESTABILIZACIÓN: login limpio, accesos, finalizado consultable, globos y rendimiento ==== */
(function(){
  'use strict';
  const VERSION='ControlEvent v26.6';
  const VERSION_FILE='ControlEvent_v26_6';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>Number(v||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  const num=v=>Number(v||0).toLocaleString('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2});
  const cmp=(a,b)=>up(a).localeCompare(up(b),'es');
  function st(){try{return (typeof state!=='undefined' && state) || window.state || {};}catch(_){return window.state||{};}}
  function arr(n){const s=st(); return Array.isArray(s[n])?s[n]:[];}
  function role(){try{return up((typeof authUser!=='undefined' && authUser && authUser.nivel) || window.authUser?.nivel || '');}catch(_){return '';}}
  const isGD=()=>role()==='GD'; const isRW=()=>role()==='RW'; const isRO=()=>role()==='RO';
  function byId(list,id){return arr(list).find(x=>String(x.id)===String(id))||{};}
  function currentEvent(){try{return (typeof selectedEvent==='function'?selectedEvent():null)||byId('eventos',st().selectedEventId)||{};}catch(_){return byId('eventos',st().selectedEventId)||{};}}
  function eventId(){return String(currentEvent().id||st().selectedEventId||'');}
  function isFinalized(){return up(currentEvent().situacion)==='FINALIZADO';}
  function persona(id){try{return (typeof personaById==='function'?personaById(id):null)||byId('personas',id);}catch(_){return byId('personas',id);}}
  function producto(id){try{return (typeof productoById==='function'?productoById(id):null)||byId('productos',id);}catch(_){return byId('productos',id);}}
  function tienda(id){try{return (typeof tiendaById==='function'?tiendaById(id):null)||byId('tiendas',id);}catch(_){return byId('tiendas',id);}}
  function compras(){try{const r=(typeof comprasForEvent==='function'?comprasForEvent():null); if(Array.isArray(r))return r;}catch(_){} return arr('compras').filter(c=>String(c.eventId||'')===eventId());}
  function prodName(c){return norm(c?.producto?.nombre||producto(c?.productoId).nombre||'Producto');}
  function tiendaName(c){const p=producto(c?.productoId); return norm(c?.tienda?.nombre||tienda(c?.tiendaId||p.tiendaId||p.defaultTiendaId).nombre||'Sin tienda');}
  function donorName(c){try{if(typeof donorLabel==='function'&&c?.donorRef){const d=donorLabel(c.donorRef); if(norm(d))return d;}}catch(_){} const raw=norm(c?.donorRef||c?.donante||c?.donanteNombre||''); if(raw.startsWith('P:'))return persona(raw.slice(2)).nombre||'Sin donante'; if(raw.startsWith('T:'))return tienda(raw.slice(2)).nombre||'Sin donante'; return raw||c?.donorLabel||c?.responsable?.nombre||tiendaName(c)||'Sin donante';}
  function ticket(c){return norm(c?.ticketDonacion||c?.ticket||'');}
  function isDonation(v){try{return typeof isDonationTicket==='function'?isDonationTicket(v):up(v).startsWith('DONADO');}catch(_){return up(v).startsWith('DONADO');}}
  function isCurrent(v){try{return typeof isCurrentExpenseTicket==='function'?isCurrentExpenseTicket(v):up(v)==='GASTOS CORRIENTES';}catch(_){return up(v)==='GASTOS CORRIENTES';}}
  function units(c){return Number(c?.unidades??c?.uds??0);}
  function price(c){const p=producto(c?.productoId); return Number(c?.precio??c?.precioCalc??p.defaultPrecio??p.precio??0);}
  function value(c){return Number(c?.valor??(price(c)*units(c)));}
  function setTip(el,text,bg='#fff',layout='default'){if(!el||!norm(text))return; el.setAttribute('data-ce-tip-v21',text); el.setAttribute('data-tip-bg-v21',bg||'#fff'); el.setAttribute('data-ce-tip-layout-v21',layout||'default'); ['data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'].forEach(a=>el.removeAttribute(a));}
  function table(title, header, lines, totalLabel, total){return [title,'',header].concat(lines.length?lines:['Sin registros'],'',`${totalLabel}: ${money(total||0)}`).join('\n');}

  // 1) Versión visible y descargas.
  function refreshVersion(){
    try{document.title=VERSION;}catch(_){}
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{ if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent=VERSION; });
    const proto=HTMLAnchorElement.prototype;
    if(!proto.__ce_v233_click){const old=proto.click; proto.click=function(){try{if(this.download)this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/g,VERSION_FILE);}catch(_){} return old.apply(this,arguments);}; proto.__ce_v233_click=true;}
  }

  // 2) Login: reconstrucción limpia del formulario de acceso para eliminar botones duplicados y campos bloqueados.
  function rebuildLogin(){
    const card=document.querySelector('#authOverlay .auth-card'); if(!card) return;
    if(card.dataset.ceV233Built==='1'){
      ['loginIdentificacion','loginClave','changeNewPassword1','changeNewPassword2'].forEach(id=>{const i=$(id); if(i){i.disabled=false;i.readOnly=false;i.style.pointerEvents='auto';}});
      return;
    }
    const oldIdent=$('loginIdentificacion')?.value||'';
    const oldClave=$('loginClave')?.value||'';
    card.dataset.ceV233Built='1';
    card.innerHTML=`
      <h2>Acceso a ControlEvent</h2>
      <div class="auth-grid">
        <div class="field"><label>Identificación</label><input id="loginIdentificacion" autocomplete="username" /></div>
        <div class="field"><label>Clave</label><div class="ce-pass-row-v233"><input id="loginClave" type="password" autocomplete="current-password" /><button type="button" class="outline small ce-pass-toggle-v233" data-target="loginClave">Ver</button></div></div>
      </div>
      <div id="authError" class="auth-error"></div>
      <div class="auth-actions">
        <button type="button" id="btnLogin">Entrar</button>
        <button type="button" class="outline" id="btnToggleChangePassword">Cambiar clave</button>
      </div>
      <div id="changePasswordPanel" class="auth-change-panel hidden">
        <div class="auth-grid">
          <div class="field"><label>Nueva clave</label><div class="ce-pass-row-v233"><input id="changeNewPassword1" type="password" autocomplete="new-password" /><button type="button" class="outline small ce-pass-toggle-v233" data-target="changeNewPassword1">Ver</button></div></div>
          <div class="field"><label>Repetir nueva clave</label><div class="ce-pass-row-v233"><input id="changeNewPassword2" type="password" autocomplete="new-password" /><button type="button" class="outline small ce-pass-toggle-v233" data-target="changeNewPassword2">Ver</button></div></div>
        </div>
        <div class="auth-subactions">
          <button type="button" id="btnChangePassword">Guardar nueva clave</button>
          <button type="button" class="outline" id="btnCancelChangePassword">Cancelar</button>
        </div>
      </div>`;
    $('loginIdentificacion').value=oldIdent; $('loginClave').value=oldClave;
  }
  document.addEventListener('click',function(e){
    const t=e.target.closest?.('.ce-pass-toggle-v233');
    if(t){e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); const input=$(t.dataset.target); if(input){input.type=input.type==='password'?'text':'password'; t.textContent=input.type==='password'?'Ver':'Ocultar'; input.focus({preventScroll:true});} return false;}
    const id=e.target.closest?.('button')?.id;
    if(id==='btnLogin'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); try{doLogin();}catch(err){console.error(err); const er=$('authError'); if(er)er.textContent='Error en logon. Revisa consola.';} return false;}
    if(id==='btnToggleChangePassword'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); $('authError')&&( $('authError').textContent='' ); $('changePasswordPanel')?.classList.toggle('hidden'); return false;}
    if(id==='btnCancelChangePassword'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); $('changePasswordPanel')?.classList.add('hidden'); ['changeNewPassword1','changeNewPassword2'].forEach(x=>{const i=$(x); if(i)i.value='';}); $('authError')&&($('authError').textContent=''); return false;}
    if(id==='btnChangePassword'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); try{doChangePassword();}catch(err){console.error(err); const er=$('authError'); if(er)er.textContent='Error al cambiar clave. Revisa consola.';} return false;}
  },true);

  // 3) ACCESOS limpio: solo GD, acceso por botón, campo estable con Ver/Ocultar.
  function accessUsersList(){try{return Array.isArray(accessUsers)?accessUsers:(Array.isArray(window.accessUsers)?window.accessUsers:[]);}catch(_){return Array.isArray(window.accessUsers)?window.accessUsers:[];}}
  function clearPwd(u){const c=norm(u?.clave||u?.password||u?.plainClave||u?.clearPassword||''); return /^[•*]+$/.test(c)?'':c;}
  function renderAccesosV233(){
    const wrap=$('accesoList'); if(!wrap)return;
    if(!isGD()){wrap.innerHTML='<div class="empty">Solo un usuario GD puede mantener ACCESOS.</div>'; return;}
    const list=accessUsersList().slice().sort((a,b)=>cmp(a.identificacion||a.nombre,b.identificacion||b.nombre));
    wrap.innerHTML='';
    if(!list.length){wrap.innerHTML='<div class="empty">No hay usuarios en ACCESOS.</div>';return;}
    list.forEach(u=>{const id=norm(u.identificacion||u.id||''); const clave=clearPwd(u); const safeId=id.replace(/[^a-zA-Z0-9_-]/g,'_'); const row=document.createElement('div'); row.className='itemcard maint-soft'; row.innerHTML=`
      <div class="rowline persona">
        <div class="field"><label>Identificación</label><input value="${esc(id)}" data-action="edit-acceso-identificacion" data-id="${esc(id)}" /></div>
        <div class="field"><label>Nombre</label><input value="${esc(u.nombre||'')}" data-action="edit-acceso-nombre" data-id="${esc(id)}" /></div>
        <div class="field"><label>Clave</label><div class="ce-pass-row-v233"><input id="accClave_${safeId}" type="password" value="${esc(clave)}" placeholder="Nueva clave (opcional)" data-action="edit-acceso-clave" data-id="${esc(id)}" autocomplete="new-password" /><button type="button" class="outline small ce-pass-toggle-v233" data-target="accClave_${safeId}">Ver</button></div></div>
        <div class="field"><label>Nivel</label><select data-action="edit-acceso-nivel" data-id="${esc(id)}">${['RO','RW','GD'].map(v=>`<option value="${v}" ${v===u.nivel?'selected':''}>${v}</option>`).join('')}</select></div>
        <button type="button" class="modify small" data-action="save-acceso" data-id="${esc(id)}">Modificar</button>
        <button type="button" class="danger small" data-action="delete-acceso" data-id="${esc(id)}" ${(typeof authUser!=='undefined'&&authUser&&id===authUser.identificacion)?'disabled':''}>Eliminar</button>
      </div>`; wrap.appendChild(row);});
  }
  async function openAccessV233(){
    if(!isGD()){alert('Solo un usuario GD puede mantener ACCESOS.'); return false;}
    const wrapper=$('maintenanceWrapper'); if(wrapper){wrapper.classList.remove('hidden');wrapper.classList.remove('ce-import-only-v212');}
    ['mtPersonas','mtEventos','mtTiendas','mtProductos','mtImportar','importPanel'].forEach(id=>$(id)?.classList.add('hidden'));
    $('mtAcceso')?.classList.remove('hidden'); $('mtAccesoBtn')?.classList.remove('hidden');
    try{if(typeof fetchAccessUsers==='function') await fetchAccessUsers(); else if(typeof fetchAccessIfNeeded==='function') await fetchAccessIfNeeded();}catch(err){console.warn('No se pudo recargar ACCESOS',err);}
    renderAccesosV233(); return false;
  }
  window.openAccessMaintenance=openAccessV233; try{renderAcceso=renderAccesosV233;}catch(_){} window.renderAcceso=renderAccesosV233;
  document.addEventListener('click',function(e){const btn=e.target.closest?.('#mtAccesoBtn,[data-target="mtAccesoBtn"],[data-action="open-acceso"]'); if(btn){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openAccessV233();return false;}},true);
  document.addEventListener('click',function(e){const b=e.target.closest?.('[data-action="save-acceso"],[data-action="delete-acceso"]'); if(!b)return; if(!isGD()){e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); alert('Solo GD puede mantener ACCESOS.'); return false;}},true);

  // 4) Evento finalizado: navegación consultable. Bloquea cambios fuera de EVENTOS.
  try{window.isLocked=function(){return false;}; if(typeof isLocked!=='undefined') isLocked=function(){return false;};}catch(_){}
  function isMutatingAction(action,id){
    if(!action&&!id)return false;
    if(/^tab|toggle|open|mt|btnExportExcel|btnLogout|selectedEvent|ceMobile|toggleIngresos|toggleCompras/.test(action||id||''))return false;
    return /add|save|delete|remove|upload|insert|modify|edit-|btnAdd|btnChange|btnStartImport|btnExportSeed|btnOpenImport|toggleEventPower|btnTogglePower/i.test(action||id||'');
  }
  document.addEventListener('click',function(e){
    if(!isFinalized())return;
    const el=e.target.closest?.('button,input,select,textarea'); if(!el||el.closest('#authOverlay'))return;
    const id=el.id||''; const action=el.getAttribute('data-action')||'';
    const inEventos=!!el.closest?.('#mtEventos');
    const inProductos=!!el.closest?.('#mtProductos');
    if(isMutatingAction(action,id) && !inEventos && !(isGD() && inProductos)){ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return false; }
  },true);
  function applyFinalizedUI(){
    document.body.classList.toggle('ce-v233-final-consulta',isFinalized());
    document.querySelectorAll('.locked,.app-lockable.locked').forEach(el=>{el.classList.remove('locked');el.style.pointerEvents='auto';el.style.opacity='1';el.style.filter='none';});
    if($('mtAccesoBtn')){$('mtAccesoBtn').classList.toggle('hidden',!isGD()); $('mtAccesoBtn').disabled=!isGD();}
  }

  // 5) Globos: cabecera primera, datos encolumnados, unidades y precio, TOTAL ESTIMADO en donaciones.
  function totalize(lines,keyFn,valFn,label){const out=[];let prev=null,sub=0;lines.forEach((r,i)=>{const k=keyFn(r); if(prev!==null&&k!==prev){out.push(`${label} ${prev} | | | | | ${money(sub)}`);out.push('');sub=0;} prev=k; out.push(r.__line); sub+=valFn(r); if(i===lines.length-1)out.push(`${label} ${k} | | | | | ${money(sub)}`);}); return out;}
  function graphDonationTips(){
    const wrap=$('eventChartWrap'); if(!wrap)return; const rows=wrap.querySelectorAll('.chart-row'); const segs=rows[1]?.querySelectorAll?.('.chart-seg')||[];
    [['DONADO TIENDA','Donado tiendas'],['DONADO SOCIO','Donado socios'],['DONADO OTROS','Donado no socios']].forEach(([code,title],i)=>{const seg=segs[i]; if(!seg)return; const data=compras().filter(c=>ticket(c)===code).map(c=>{c.__line=`${donorName(c)} | ${prodName(c)} | ${num(units(c))} | ${money(price(c))} | ${money(value(c))}`;return c;}).sort((a,b)=>cmp(donorName(a),donorName(b))||cmp(prodName(a),prodName(b))); const lines=totalize(data,donorName,value,'Total donante'); const total=data.reduce((s,c)=>s+value(c),0); setTip(seg,table('GRÁFICAS / DONACIÓN DE PRODUCTO / '+title,'Donante | Producto | Uds | Precio estimado | Valor estimado',lines,'TOTAL ESTIMADO',total),'#fff','graphdonationv233');});
  }
  function graphExpenseTips(){
    const wrap=$('eventChartWrap'); if(!wrap)return; const rows=wrap.querySelectorAll('.chart-row'); const segs=rows[2]?.querySelectorAll?.('.chart-seg')||[];
    [['ticket','Gastado por ticket'],['current','Gastos corrientes'],['pending','Pte. Compra u otros gastos']].forEach(([kind,title],i)=>{const seg=segs[i]; if(!seg)return; let data=compras().filter(c=>!isDonation(ticket(c))); if(kind==='ticket')data=data.filter(c=>ticket(c)&&!isCurrent(ticket(c))); if(kind==='current')data=data.filter(c=>isCurrent(ticket(c))); if(kind==='pending')data=data.filter(c=>!ticket(c)); data=data.map(c=>{c.__key=ticket(c)||'PTE.COMPRA'; c.__line=`${c.__key} | ${tiendaName(c)} | ${prodName(c)} | ${num(units(c))} | ${money(price(c))} | ${money(value(c))}`; return c;}).sort((a,b)=>cmp(a.__key,b.__key)||cmp(tiendaName(a),tiendaName(b))||cmp(prodName(a),prodName(b))); const lines=totalize(data,c=>c.__key,value,'Total'); const total=data.reduce((s,c)=>s+value(c),0); setTip(seg,table('GRÁFICAS / GASTOS / '+title,'Ticket | Tienda | Producto | Uds | Precio | Total',lines,'TOTAL',total),'#fff','graphexpensev233');});
  }
  function groupingTips(){
    [['summarySegmento','segmento','CÁLCULOS POR AGRUPACIÓN / POR SEGMENTO'],['summaryDestino','destino','CÁLCULOS POR AGRUPACIÓN / POR DESTINO']].forEach(([id,field,title])=>{const wrap=$(id); if(!wrap)return; wrap.querySelectorAll('.vbars-card').forEach(card=>{const label=norm((card.querySelector('.vbars-title')?.textContent||'').split('·')[0]); if(!label)return; const cols=card.querySelectorAll('.vbar-col'); const base=compras().filter(c=>norm(producto(c.productoId)[field]||c.producto?.[field]||'Sin '+field)===label); const specs=[['Comprado',c=>!isDonation(ticket(c))&&ticket(c)&&!isCurrent(ticket(c)),'#dc2626','groupingv233buy'],['Donado',c=>isDonation(ticket(c)),'#f59e0b','groupingv233don'],['Pte. Compra u otros gastos',c=>!isDonation(ticket(c))&&(!ticket(c)||isCurrent(ticket(c))),'#fb7185','groupingv233pending']]; specs.forEach(([name,filter,bg,layout],idx)=>{const data=base.filter(filter).map(c=>`${name==='Donado'?donorName(c):(ticket(c)||'PTE.COMPRA')} | ${tiendaName(c)} | ${prodName(c)} | ${num(units(c))} | ${money(price(c))} | ${money(value(c))}`).sort((a,b)=>cmp(a,b)); const total=base.filter(filter).reduce((s,c)=>s+value(c),0); const text=table(`${title} / ${label} / ${name}`,'Ticket/Donante | Tienda | Producto | Uds | Precio | Total',data,name==='Donado'?'TOTAL ESTIMADO':'TOTAL',total); const col=cols[idx]; if(col)setTip(col,text,bg,layout); const stick=col?.querySelector?.('.vbar-stick'); if(stick)setTip(stick,text,bg,layout);});});});
    const tt=$('summaryTiendaTicket'); if(tt)tt.querySelectorAll('[data-ce-tip-v21]').forEach(el=>{let t=el.getAttribute('data-ce-tip-v21')||''; if(/DONADO|Donado/i.test(t))el.setAttribute('data-ce-tip-v21',t.replace(/\bTOTAL\s*:/ig,'TOTAL ESTIMADO:'));});
  }

  // 6) RO: INFOEVENTO si evento finalizado.
  document.addEventListener('click',function(e){const b=e.target.closest?.('#btnExportExcel'); if(!b)return; if(isRO()&&!isFinalized()){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();alert('Usuario RO: solo puede sacar INFOEVENTO si el evento está Finalizado.');return false;}},true);

  let pending=false;
  function applyAll(){pending=false; refreshVersion(); rebuildLogin(); applyFinalizedUI(); graphDonationTips(); graphExpenseTips(); groupingTips();}
  function schedule(){if(pending)return; pending=true; (window.requestIdleCallback||window.requestAnimationFrame||setTimeout)(applyAll,{timeout:500});}
  const oldRender=typeof render==='function'?render:null;
  if(oldRender&&!oldRender.__ce_v233){const wrapped=function(){const r=oldRender.apply(this,arguments); schedule(); return r;}; wrapped.__ce_v233=true; try{render=wrapped; window.render=wrapped;}catch(_){} }
  document.addEventListener('DOMContentLoaded',()=>{applyAll();setTimeout(applyAll,500);},false);
  window.addEventListener('load',()=>{applyAll();setTimeout(applyAll,800);},false);
  document.addEventListener('click',()=>setTimeout(schedule,0),false);
  applyAll(); setTimeout(applyAll,600);
})();

/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #45. */
/* ==== v22.9: correcciones de evento finalizado y claves ACCESOS ==== */
(function(){
  'use strict';
  const VERSION='ControlEvent v26.6';
  const VERSION_FILE='ControlEvent_v26_6';
  const SELECT_KEY='controlevent_v229_selected_event_id';
  const ACCESS_CACHE_KEY='controlevent_v229_access_clear_cache';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function st(){try{return (typeof state!=='undefined'&&state)||window.state||{};}catch(_){return window.state||{};}}
  function role(){try{return String((typeof authUser!=='undefined'&&authUser&&authUser.nivel)||'').toUpperCase();}catch(_){return '';}}
  function isGD(){return role()==='GD';}
  function isRW(){return role()==='RW';}
  function evById(id){const s=st();return (s.eventos||[]).find(e=>String(e.id)===String(id))||null;}
  function currentEv(){const s=st();return evById(s.selectedEventId)||null;}
  function isFinalized(){return String(currentEv()?.situacion||'').toUpperCase()==='FINALIZADO';}
  function storageKey(){try{return typeof STORAGE_KEY!=='undefined'?STORAGE_KEY:'controlevent_v6_4';}catch(_){return 'controlevent_v6_4';}}
  function validEventId(id){return !!id && !!evById(id);}
  function rememberEvent(id){if(!validEventId(id))return; try{sessionStorage.setItem(SELECT_KEY,String(id));}catch(_){} try{localStorage.setItem(SELECT_KEY,String(id));}catch(_){} }
  function rememberedEvent(){let id=''; try{id=sessionStorage.getItem(SELECT_KEY)||'';}catch(_){} if(!id){try{id=localStorage.getItem(SELECT_KEY)||'';}catch(_){}} return validEventId(id)?String(id):'';}
  function persistStateLocal(){try{localStorage.setItem(storageKey(),JSON.stringify(st()));}catch(_){}}
  function enforceSelectedEvent(){
    const s=st(); if(!s||!Array.isArray(s.eventos)||!s.eventos.length)return;
    const id=rememberedEvent();
    if(id && String(s.selectedEventId)!==id){s.selectedEventId=id; persistStateLocal();}
    const sel=$('selectedEvent');
    if(sel){ sel.disabled=false; sel.classList.remove('locked'); sel.style.pointerEvents='auto'; sel.style.opacity='1'; if(id && sel.value!==id) sel.value=id; }
  }
  window.changeSelectedEvent = async function(value){
    const s=st(); const id=String(value||''); if(!validEventId(id))return;
    s.selectedEventId=id; rememberEvent(id); persistStateLocal();
    try{ if(typeof render==='function') render(); }catch(_){ }
    const sel=$('selectedEvent'); if(sel) sel.value=id;
    try{ if((isGD()||isRW()) && typeof pushStateToServer==='function'){ clearTimeout(window.__ceV229SelectedPush); window.__ceV229SelectedPush=setTimeout(()=>{try{pushStateToServer();}catch(_e){}},250); } }catch(_){ }
  };
  document.addEventListener('change',function(e){
    if(e.target&&e.target.id==='selectedEvent'){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      window.changeSelectedEvent(e.target.value); return false;
    }
  },true);
  try{
    if(typeof mergeLoadedState==='function' && !mergeLoadedState.__v229){
      const old=mergeLoadedState;
      const w=function(serverState,defaults){const merged=old.apply(this,arguments); try{const id=rememberedEvent(); if(id&&(merged.eventos||[]).some(e=>String(e.id)===id)) merged.selectedEventId=id;}catch(_){} return merged;};
      w.__v229=true; mergeLoadedState=w; window.mergeLoadedState=w;
    }
  }catch(_){ }

  function isAllowedInFinalized(el){
    const id=el.id||''; const action=el.getAttribute?.('data-action')||'';
    if(['selectedEvent','btnExportExcel','btnLogout','toggleEventDesc','toggleIngresosSummary','toggleComprasSummary','toggleComprasEvent','ceMobileMenuBtn','ceMobileDrawerClose','btnToggleMaintenance','mtEventosBtn','tabIngresosBtn','tabComprasBtn','tabDonacionesBtn','tabResumenBtn','tabGraficasBtn'].includes(id)) return true;
    if(el.classList?.contains('tab')) return true;
    if(el.classList?.contains('mobile-menu-action')) return true;
    if((isGD()||isRW()) && (action==='save-evento' || action.startsWith('edit-evento-'))) return true;
    if(isGD() && id==='btnTogglePower') return true;
    return false;
  }
  function applyFinalizedConsulta(){
    const fin=isFinalized(); document.body.classList.toggle('ce-finalizado-consulta',fin);
    if(!fin) return;
    document.querySelectorAll('.app-lockable.locked,.locked').forEach(el=>{el.classList.remove('locked'); el.style.pointerEvents='auto'; el.style.opacity='1';});
    document.querySelectorAll('#mainTabs,#tabIngresos,#tabCompras,#tabDonaciones,#tabResumen,#tabGraficas,#maintenanceWrapper').forEach(el=>{if(el){el.style.pointerEvents='auto';el.style.opacity='1';}});
    document.querySelectorAll('button,input,select,textarea').forEach(el=>{
      if(isAllowedInFinalized(el)){el.disabled=false;el.removeAttribute('aria-disabled');return;}
      const action=el.getAttribute?.('data-action')||'';
      const mutable = el.matches('input,select,textarea,button') && !el.closest('.auth-card') && !el.closest('#authOverlay');
      if(mutable || /^save-|^delete-|^edit-/.test(action)){el.disabled=true;el.setAttribute('aria-disabled','true');}
    });
  }
  const oldRenderLock=typeof renderLockState==='function'?renderLockState:null;
  if(oldRenderLock && !oldRenderLock.__v229){
    const w=function(){const r=oldRenderLock.apply(this,arguments); enforceSelectedEvent(); applyFinalizedConsulta(); return r;};
    w.__v229=true; renderLockState=w; window.renderLockState=w;
  }

  // Guardar EVENTOS con RW/GD, incluido pasar Finalizado -> En curso.
  window.saveEventRecord = function(id){
    if(!(isGD()||isRW())) return;
    const s=st(); const ev=(s.eventos||[]).find(x=>String(x.id)===String(id)); if(!ev)return;
    const val=(action,fallback='')=>{const el=document.querySelector(`[data-action="${action}"][data-id="${CSS.escape(String(id))}"]`);return el?el.value:fallback;};
    ev.titulo=String(val('edit-evento-titulo',ev.titulo||'')).trim();
    ev.precio=Number(val('edit-evento-precio',ev.precio||0)||0);
    ev.fechaIni=String(val('edit-evento-fechaini',ev.fechaIni||'')).trim();
    ev.fechaFin=String(val('edit-evento-fechafin',ev.fechaFin||'')).trim();
    ev.descripcion=String(val('edit-evento-descripcion',ev.descripcion||'')).trim();
    ev.situacion=String(val('edit-evento-situacion',ev.situacion||'En curso')||'En curso');
    persistStateLocal(); try{if(typeof saveState==='function')saveState();}catch(_){}
    try{if(typeof render==='function')render();}catch(_){}
    try{if(typeof pushStateToServer==='function'){clearTimeout(window.__ceV229EventPush);window.__ceV229EventPush=setTimeout(()=>pushStateToServer(),250);}}catch(_){}
  };
  document.addEventListener('click',function(e){
    const btn=e.target.closest?.('button[data-action="save-evento"]'); if(!btn)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); window.saveEventRecord(btn.dataset.id); return false;
  },true);

  // ACCESOS: un único botón estable y cache local de claves escritas/modificadas.
  function getAccessCache(){try{return JSON.parse(localStorage.getItem(ACCESS_CACHE_KEY)||'{}')||{};}catch(_){return {};}}
  function setAccessCache(id,clave){if(!id||!clave)return; const c=getAccessCache(); c[String(id)]=String(clave); try{localStorage.setItem(ACCESS_CACHE_KEY,JSON.stringify(c));}catch(_){} }
  function realClave(u){const id=String(u?.identificacion||''); const c=getAccessCache(); const raw=(u&&(u.clave||u.password||u.pass||u.clearPassword||u.claveClaro))||c[id]||''; if(/^•+$|^\*+$/.test(String(raw)))return c[id]||''; return String(raw||'');}
  function passRowHTML(id,value){
    const v=String(value||'');
    return `<div class="ce-v229-pass-row"><input type="password" value="${esc(v)}" placeholder="Nueva clave (opcional)" autocomplete="new-password" data-ce-acceso-clave-v229="${esc(id)}" /><button type="button" class="ce-v229-eye" data-ce-eye-v229="${esc(id)}">Ver</button></div>${v?'':'<div class="ce-v229-access-note">La clave anterior no está disponible en claro. Escribe una nueva clave solo si quieres cambiarla.</div>'}`;
  }
  window.renderAcceso = function(){
    const wrap=$('accesoList'); if(!wrap)return;
    if(!isGD()){wrap.innerHTML='<div class="empty">Solo un usuario GD puede consultar esta tabla.</div>';return;}
    const list=((typeof accessUsers!=='undefined'&&accessUsers)||window.accessUsers||[]).slice().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
    if(!list.length){wrap.innerHTML='<div class="empty">No hay usuarios en ACCESO.</div>';return;}
    wrap.innerHTML='';
    list.forEach(u=>{const id=String(u.identificacion||''); const row=document.createElement('div'); row.className='itemcard maint-soft';
      row.innerHTML=`<div class="rowline persona">
        <div class="field"><label>Identificación</label><input value="${esc(id)}" data-action="edit-acceso-identificacion" data-id="${esc(id)}" /></div>
        <div class="field"><label>Nombre</label><input value="${esc(u.nombre||'')}" data-action="edit-acceso-nombre" data-id="${esc(id)}" /></div>
        <div class="field"><label>Clave</label>${passRowHTML(id,realClave(u))}</div>
        <div class="field"><label>Nivel</label><select data-action="edit-acceso-nivel" data-id="${esc(id)}">${['RO','RW','GD'].map(v=>`<option value="${v}" ${v===u.nivel?'selected':''}>${v}</option>`).join('')}</select></div>
        <button type="button" class="modify small" data-action="save-acceso" data-id="${esc(id)}">Modificar</button>
        <button type="button" class="danger small" data-action="delete-acceso" data-id="${esc(id)}" ${window.authUser&&id===window.authUser.identificacion?'disabled':''}>Eliminar</button>
      </div>`; wrap.appendChild(row); });
  };
  window.saveAccessUser = async function(existingId=''){
    if(!isGD()) return;
    const id=String(existingId||'');
    const get=(action,fallback='')=>{const el=document.querySelector(`[data-action="${action}"][data-id="${CSS.escape(id)}"]`);return el?el.value:fallback;};
    const identificacion=id?String(get('edit-acceso-identificacion',id)).trim():String($('newAccesoIdentificacion')?.value||'').trim();
    const nombre=id?String(get('edit-acceso-nombre','')).trim():String($('newAccesoNombre')?.value||'').trim();
    const clave=id?String(document.querySelector(`[data-ce-acceso-clave-v229="${CSS.escape(id)}"]`)?.value||''):String($('newAccesoClave')?.value||'');
    const nivel=id?String(get('edit-acceso-nivel','RO')):String($('newAccesoNivel')?.value||'RO');
    if(!identificacion||!nombre||(!id&&!clave)){alert('Identificación, nombre y clave son obligatorios al dar de alta.');return;}
    const payload={identificacion,nombre,nivel,existingId:id}; if(clave) payload.clave=clave;
    const res=await fetch('/api/access-users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok){alert(data.error||'No se pudo guardar el usuario de acceso.');return;}
    if(clave) setAccessCache(identificacion,clave);
    if(!id){['newAccesoIdentificacion','newAccesoNombre','newAccesoClave'].forEach(x=>{const el=$(x); if(el)el.value='';}); const lv=$('newAccesoNivel'); if(lv)lv.value='RO';}
    try{if(typeof fetchAccessUsers==='function') await fetchAccessUsers();}catch(_){}
    try{renderAcceso(); if(typeof renderPermissions==='function')renderPermissions(); if(typeof renderMaintenanceTabs==='function')renderMaintenanceTabs();}catch(_){}
  };
  document.addEventListener('click',function(e){
    const eye=e.target.closest?.('[data-ce-eye-v229]');
    if(eye){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); const id=eye.getAttribute('data-ce-eye-v229'); const inp=document.querySelector(`[data-ce-acceso-clave-v229="${CSS.escape(id)}"]`); if(!inp)return false; const show=inp.type==='password'; inp.type=show?'text':'password'; eye.textContent=show?'Ocultar':'Ver'; inp.focus({preventScroll:true}); return false;}
    const save=e.target.closest?.('button[data-action="save-acceso"]');
    if(save){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); window.saveAccessUser(save.dataset.id||''); return false;}
  },true);

  function refreshVersion(){
    try{document.title=VERSION;}catch(_){ }
    try{document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||''))el.textContent=VERSION;});}catch(_){ }
    try{const proto=HTMLAnchorElement.prototype; if(!proto.click.__v229){const prev=proto.click; const w=function(){try{if(this.download)this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig,VERSION_FILE);}catch(_){} return prev.apply(this,arguments);}; w.__v229=true; proto.click=w;}}catch(_){ }
  }
  function applyAll(){refreshVersion(); enforceSelectedEvent(); applyFinalizedConsulta();}
  const oldRender=typeof render==='function'?render:null;
  if(oldRender && !oldRender.__v229){const w=function(){enforceSelectedEvent(); const r=oldRender.apply(this,arguments); setTimeout(applyAll,20); setTimeout(applyAll,250); return r;}; w.__v229=true; render=w; window.render=w;}
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>{setTimeout(applyAll,40);setTimeout(applyAll,500);},false));
  setInterval(applyAll,900);
  applyAll();
})();

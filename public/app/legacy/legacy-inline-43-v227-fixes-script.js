/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #43. */
(function(){
  'use strict';
  const VERSION='v22.8';
  const $=id=>document.getElementById(id);
  const st=()=>window.state||state;
  const esc=s=>String(s??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const canEventsV227=()=>!!window.authUser && ['RW','GD'].includes(String(window.authUser.nivel||''));

  // 1) Cambio de evento: no refrescar desde servidor justo después ni volver al anterior.
  window.changeSelectedEvent = async function(value){
    const s=st();
    const id=String(value||'');
    if(!id) return;
    s.selectedEventId=id;
    try{ localStorage.setItem(typeof STORAGE_KEY!=='undefined'?STORAGE_KEY:'controlevent_v6_4', JSON.stringify(s)); }catch(_){ }
    try{ if(typeof saveState==='function') saveState(); }catch(_){ }
    try{ if(typeof render==='function') render(); }catch(_){ }
    const sel=$('selectedEvent'); if(sel) sel.value=id;
    try{
      if(window.authUser && ['RW','GD'].includes(String(window.authUser.nivel||'')) && typeof pushStateToServer==='function'){
        clearTimeout(window.__ceV227EventSaveTimer);
        window.__ceV227EventSaveTimer=setTimeout(()=>{try{pushStateToServer();}catch(_){}},120);
      }
    }catch(_){ }
  };
  document.addEventListener('change',function(ev){
    if(ev.target && ev.target.id==='selectedEvent'){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      window.changeSelectedEvent(ev.target.value);
      return false;
    }
  },true);

  // 2) EVENTOS: RW/GD puede modificar; se guarda siempre la situación del registro editado.
  window.saveEventRecord = function(id){
    if(!canEventsV227()) return;
    const s=st();
    const ev=(s.eventos||[]).find(x=>String(x.id)===String(id));
    if(!ev) return;
    const val=(action, fallback='')=>{
      const el=document.querySelector(`[data-action="${action}"][data-id="${CSS.escape(String(id))}"]`);
      return el ? el.value : fallback;
    };
    ev.titulo=String(val('edit-evento-titulo',ev.titulo||'')).trim();
    ev.precio=Number(val('edit-evento-precio',ev.precio||0)||0);
    ev.fechaIni=String(val('edit-evento-fechaini',ev.fechaIni||'')).trim();
    ev.fechaFin=String(val('edit-evento-fechafin',ev.fechaFin||'')).trim();
    ev.descripcion=String(val('edit-evento-descripcion',ev.descripcion||'')).trim();
    ev.situacion=String(val('edit-evento-situacion',ev.situacion||'En curso')||'En curso');
    try{ localStorage.setItem(typeof STORAGE_KEY!=='undefined'?STORAGE_KEY:'controlevent_v6_4', JSON.stringify(s)); }catch(_){ }
    try{ if(typeof saveState==='function') saveState(); }catch(_){ }
    try{ if(typeof render==='function') render(); }catch(_){ }
    try{ if(typeof pushStateToServer==='function'){ clearTimeout(window.__ceV227EventSaveTimer); window.__ceV227EventSaveTimer=setTimeout(()=>pushStateToServer(),120); } }catch(_){ }
  };
  document.addEventListener('click',function(ev){
    const btn=ev.target.closest?.('button[data-action="save-evento"]');
    if(!btn) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    window.saveEventRecord(btn.dataset.id);
    return false;
  },true);

  function ensureSelectedEnabled(){
    const sel=$('selectedEvent');
    if(sel){sel.disabled=false;sel.classList.remove('locked');sel.style.pointerEvents='auto';sel.style.opacity='1';}
    if(canEventsV227()){
      document.querySelectorAll('[data-action^="edit-evento-"],button[data-action="save-evento"],#mtEventosBtn').forEach(el=>{
        el.disabled=false; el.classList.remove('locked'); el.style.pointerEvents='auto'; el.style.opacity='1';
      });
    }
  }
  const prevRenderLock=typeof renderLockState==='function'?renderLockState:null;
  if(prevRenderLock&&!prevRenderLock.__v227){
    const w=function(){const ret=prevRenderLock.apply(this,arguments); ensureSelectedEnabled(); return ret;};
    w.__v227=true; try{renderLockState=w;}catch(_){} window.renderLockState=w;
  }

  // 3) Menú móvil: botón Cerrar al final y cierre por delegación robusta.
  function patchMobileMenu(){
    const drawer=$('ceMobileDrawer');
    if(!drawer) return;
    drawer.querySelector('#ceMobileDrawerClose')?.remove();
    let grid=drawer.querySelector('#ceMobileCloseGridV227');
    if(!grid){
      const sec=document.createElement('div');
      sec.className='mobile-menu-section';
      sec.innerHTML='<h3>Salir</h3><div class="mobile-menu-grid" id="ceMobileCloseGridV227"><button type="button" class="mobile-menu-action close-v227" data-mobile-close-v227="1"><span class="mi">×</span>Cerrar menú</button></div>';
      drawer.appendChild(sec);
    }
  }
  function closeMobile(){document.body.classList.remove('mobile-drawer-open');}
  document.addEventListener('click',function(ev){
    if(ev.target.closest?.('[data-mobile-close-v227],#ceMobileDrawerBackdrop')){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();closeMobile();return false;}
  },true);
  const prevInitMobile=window.__ceInitMobileResponsive;
  window.__cePatchMobileV227=patchMobileMenu;
  setTimeout(patchMobileMenu,200);
  setTimeout(patchMobileMenu,1000);

  // 4) ACCESOS: render limpio, sin parches antiguos ni campos temblando. La clave existente solo se ve si backend la entrega.
  function realClave(u){
    for(const k of ['clave','password','pass','claveClara','clave_plana','plainPassword']){
      const v=u&&u[k];
      if(v!=null && String(v).trim() && !/^•+$/.test(String(v).trim())) return String(v);
    }
    return '';
  }
  function passRowHTML(id,value,placeholder='Nueva clave (opcional)'){
    const has=value!=='';
    return `<div class="ce-v227-pass-row"><input type="password" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="new-password" data-ce-acceso-clave-v227="${esc(id)}" /><button type="button" class="ce-v227-eye" data-ce-eye-v227="${esc(id)}">Ver</button></div>${has?'':'<div class="ce-v227-access-note">La clave guardada no está disponible en claro. Escribe una nueva clave solo si quieres cambiarla.</div>'}`;
  }
  window.renderAcceso = function(){
    const wrap=$('accesoList'); if(!wrap) return;
    if(typeof isGodRole==='function' && !isGodRole()){wrap.innerHTML='<div class="empty">Solo un usuario GD puede consultar esta tabla.</div>';return;}
    const list=(window.accessUsers||accessUsers||[]).slice().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
    if(!list.length){wrap.innerHTML='<div class="empty">No hay usuarios en ACCESO.</div>';return;}
    wrap.innerHTML='';
    list.forEach(u=>{
      const id=String(u.identificacion||'');
      const row=document.createElement('div'); row.className='itemcard maint-soft';
      row.innerHTML=`<div class="rowline persona">
        <div class="field"><label>Identificación</label><input value="${esc(id)}" data-action="edit-acceso-identificacion" data-id="${esc(id)}" /></div>
        <div class="field"><label>Nombre</label><input value="${esc(u.nombre||'')}" data-action="edit-acceso-nombre" data-id="${esc(id)}" /></div>
        <div class="field"><label>Clave</label>${passRowHTML(id,realClave(u))}</div>
        <div class="field"><label>Nivel</label><select data-action="edit-acceso-nivel" data-id="${esc(id)}">${['RO','RW','GD'].map(v=>`<option value="${v}" ${v===u.nivel?'selected':''}>${v}</option>`).join('')}</select></div>
        <button type="button" class="modify small" data-action="save-acceso" data-id="${esc(id)}">Modificar</button>
        <button type="button" class="danger small" data-action="delete-acceso" data-id="${esc(id)}" ${window.authUser&&id===window.authUser.identificacion?'disabled':''}>Eliminar</button>
      </div>`;
      wrap.appendChild(row);
    });
  };
  window.saveAccessUser = async function(existingId=''){
    if(typeof isGodRole==='function' && !isGodRole()) return;
    const id=String(existingId||'');
    const get=(action,fallback='')=>{const el=document.querySelector(`[data-action="${action}"][data-id="${CSS.escape(id)}"]`); return el?el.value:fallback;};
    const identificacion=id?String(get('edit-acceso-identificacion',id)).trim():String($('newAccesoIdentificacion')?.value||'').trim();
    const nombre=id?String(get('edit-acceso-nombre','')).trim():String($('newAccesoNombre')?.value||'').trim();
    const clave=id?String(document.querySelector(`[data-ce-acceso-clave-v227="${CSS.escape(id)}"]`)?.value||''):String($('newAccesoClave')?.value||'');
    const nivel=id?String(get('edit-acceso-nivel','RO')):String($('newAccesoNivel')?.value||'RO');
    if(!identificacion||!nombre||(!id&&!clave)){alert('Identificación, nombre y clave son obligatorios al dar de alta.');return;}
    const payload={identificacion,nombre,nivel,existingId:id};
    if(clave) payload.clave=clave;
    const res=await fetch('/api/access-users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok){alert(data.error||'No se pudo guardar el usuario de acceso.');return;}
    if(!id){['newAccesoIdentificacion','newAccesoNombre','newAccesoClave'].forEach(x=>{const el=$(x); if(el)el.value='';}); const lv=$('newAccesoNivel'); if(lv)lv.value='RO';}
    if(typeof fetchAccessUsers==='function') await fetchAccessUsers();
    try{renderAcceso();renderPermissions?.();renderMaintenanceTabs?.();}catch(_){ }
  };
  document.addEventListener('click',function(ev){
    const eye=ev.target.closest?.('[data-ce-eye-v227]');
    if(eye){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation(); const id=eye.getAttribute('data-ce-eye-v227'); const input=document.querySelector(`[data-ce-acceso-clave-v227="${CSS.escape(id)}"]`); if(!input)return false; const show=input.type==='password'; input.type=show?'text':'password'; eye.textContent=show?'Ocultar':'Ver'; input.focus({preventScroll:true}); return false;}
    const save=ev.target.closest?.('button[data-action="save-acceso"]');
    if(save){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation(); window.saveAccessUser(save.dataset.id||''); return false;}
  },true);

  const prevRender=typeof render==='function'?render:null;
  if(prevRender&&!prevRender.__v227){
    const w=function(){const ret=prevRender.apply(this,arguments); setTimeout(()=>{ensureSelectedEnabled();patchMobileMenu();},30); return ret;};
    w.__v227=true; try{render=w;}catch(_){} window.render=w;
  }
  document.addEventListener('DOMContentLoaded',()=>{ensureSelectedEnabled();patchMobileMenu();},true);
  setTimeout(()=>{ensureSelectedEnabled();patchMobileMenu();},500);
})();

/* ControlEvent v50.22 - correccion quirurgica sobre v50.4.
   - Estabiliza menu RO sin recolocaciones visibles.
   - Salir/Refrescar visibles y utilizables en movil aunque el contenedor original este oculto.
   - Salir no deja pantalla borrosa: fuerza la vuelta limpia al overlay de acceso.
   - Reordena cabeceras de globos si aparecen al final en Por tienda y Ticket / donaciones.
   - Abre fotos de globos/tickets con visor propio ligero para iPad, evitando bloqueos por handlers antiguos.
*/
(function(){
  'use strict';

  const VERSION = 'ControlEvent v50.22';
  const VERSION_FILE = 'ControlEvent_v50_22';
  const INSTALLED = '__ceV505FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const TABS = ['ingresos','donaciones','compras','mapa','planificacion','resumen','graficas'];
  const PANEL = {ingresos:'tabIngresos',donaciones:'tabDonaciones',compras:'tabCompras',mapa:'tabMapaProductos',planificacion:'tabPlanificacionInicial',resumen:'tabResumen',graficas:'tabGraficas'};
  const BTN = {ingresos:'tabIngresosBtn',donaciones:'tabDonacionesBtn',compras:'tabComprasBtn',mapa:'tabMapaBtn',planificacion:'tabPlanificacionBtn',resumen:'tabResumenBtn',graficas:'tabGraficasBtn'};
  const TAB_BY_BTN = Object.entries(BTN).reduce((acc,[tab,id]) => (acc[id]=tab, acc), {});

  function safe(fn, fallback){ try{ const v=fn(); return v===undefined ? fallback : v; }catch(_){ return fallback; } }
  function getFn(name){ return safe(() => (typeof window[name] === 'function') ? window[name] : Function('return (typeof '+name+' === "function") ? '+name+' : null')(), null); }
  function auth(){ return safe(() => (typeof authUser !== 'undefined' && authUser) || window.authUser || window.ControlEventApp?.authUser || null, window.authUser || window.ControlEventApp?.authUser || null); }
  function role(){ return up(auth()?.nivel || ''); }
  function isGD(){ return role() === 'GD'; }
  function isRW(){ return role() === 'RW'; }
  function isRO(){ return role() === 'RO'; }
  function currentTab(){
    const lexical = safe(() => (typeof currentMainTab !== 'undefined' ? String(currentMainTab || '') : ''), '');
    if(TABS.includes(lexical)) return lexical;
    const appTab = String(window.ControlEventApp?.navigation?.currentMainTab || window.__ceCurrentMainTab || '');
    if(TABS.includes(appTab)) return appTab;
    const visible = TABS.find(tab => { const p=$(PANEL[tab]); return p && !p.classList.contains('hidden') && safe(() => getComputedStyle(p).display !== 'none', true); });
    return visible || (isRO() ? 'resumen' : 'ingresos');
  }
  function roleAllows(tab){
    if(!auth()) return false;
    const t = String(tab || '');
    if(isRO()) return ['resumen','mapa','graficas'].includes(t);
    if(t === 'planificacion') return isGD();
    return TABS.includes(t);
  }
  function defaultTab(prefer){ const p=String(prefer || ''); if(roleAllows(p)) return p; return isRO() ? 'resumen' : 'ingresos'; }
  function setCurrentTab(tab){
    const next = defaultTab(tab || currentTab());
    try{ currentMainTab = next; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = next; }catch(_){ }
    window.__ceCurrentMainTab = next;
    return next;
  }
  function setVisible(el, visible){
    if(!el) return;
    const isVisible = !el.classList.contains('hidden') && !el.classList.contains('ce-v505-hidden-role') && el.style.display !== 'none';
    if(visible && isVisible) return;
    if(!visible && el.classList.contains('ce-v505-hidden-role')) return;
    if(visible){
      el.classList.remove('hidden','hidden-by-role-v228','ce-v452-hidden-role','ce-v502-hidden-role','ce-v504-hidden-role','ce-v505-hidden-role');
      el.removeAttribute('hidden'); el.removeAttribute('aria-hidden'); el.removeAttribute('aria-disabled');
      if('disabled' in el) el.disabled = false;
      el.style.removeProperty('display'); el.style.removeProperty('visibility'); el.style.removeProperty('opacity'); el.style.removeProperty('pointer-events');
    }else{
      el.classList.add('hidden','ce-v505-hidden-role');
      el.setAttribute('aria-hidden','true'); el.setAttribute('aria-disabled','true');
      if('disabled' in el) el.disabled = true;
      el.style.setProperty('display','none','important');
    }
  }
  function stop(ev){ try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; }

  function injectStyle(){
    if($('ceV505FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV505FinalStyle';
    style.textContent = `
      .ce-v505-hidden-role{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-authenticated-v505 #authOverlay{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body:not(.ce-authenticated-v505) #authOverlay{display:flex!important;visibility:visible!important;pointer-events:auto!important;}
      body.ce-role-ro-v505 #tabIngresosBtn,body.ce-role-ro-v505 #tabDonacionesBtn,body.ce-role-ro-v505 #tabComprasBtn,body.ce-role-ro-v505 #tabPlanificacionBtn{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-role-ro-v505 #btnExportExcel,body.ce-role-ro-v505 #btnOpenImport,body.ce-role-ro-v505 #btnExportSeed,body.ce-role-ro-v505 #btnToggleMaintenance{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-role-ro-v505 #mainTabs.tabs{display:grid!important;grid-template-columns:repeat(3,48px)!important;justify-content:center!important;justify-items:center!important;gap:10px!important;overflow:visible!important;transition:none!important;animation:none!important;}
      body.ce-role-ro-v505 #tabResumenBtn{order:1!important;}body.ce-role-ro-v505 #tabMapaBtn{order:2!important;}body.ce-role-ro-v505 #tabGraficasBtn{order:3!important;}
      body.ce-role-ro-v505 #mainTabs .tab,body.ce-role-ro-v505 #mainTabs .tab *{transition:none!important;animation:none!important;}
      body.ce-role-ro-v505 .mobile-menu-action[data-target="tabIngresosBtn"],body.ce-role-ro-v505 .mobile-menu-action[data-target="tabDonacionesBtn"],body.ce-role-ro-v505 .mobile-menu-action[data-target="tabComprasBtn"],body.ce-role-ro-v505 .mobile-menu-action[data-target="tabPlanificacionBtn"],body.ce-role-ro-v505 .mobile-menu-action[data-target="btnExportExcel"],body.ce-role-ro-v505 .mobile-menu-action[data-target="btnOpenImport"],body.ce-role-ro-v505 .mobile-menu-action[data-target="btnExportSeed"],body.ce-role-ro-v505 .mobile-menu-action[data-target="btnToggleMaintenance"]{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #ceTooltipV21 .ce-v505-tooltip-header-row td,#ceBudgetLiteTooltipV307 .ce-v505-tooltip-header-row th,#ceBudgetLiteTooltipV307 .ce-v505-tooltip-header-row td{font-weight:950!important;background:rgba(15,23,42,.08)!important;}
      #ceV505PhotoModal{position:fixed!important;inset:0!important;z-index:1000000!important;background:rgba(15,23,42,.78)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:12px!important;touch-action:auto!important;}
      #ceV505PhotoModal .ce-v505-photo-card{width:min(1100px,96vw)!important;max-height:94vh!important;background:#fff!important;border-radius:20px!important;box-shadow:0 24px 80px rgba(0,0,0,.42)!important;padding:12px!important;display:flex!important;flex-direction:column!important;gap:10px!important;overflow:auto!important;}
      #ceV505PhotoModal .ce-v505-photo-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;font-weight:950!important;color:#111827!important;}
      #ceV505PhotoModal .ce-v505-photo-close{min-width:42px!important;height:38px!important;border-radius:999px!important;background:#111827!important;color:#fff!important;border:0!important;font-size:22px!important;line-height:1!important;display:flex!important;align-items:center!important;justify-content:center!important;}
      #ceV505PhotoModal img{max-width:100%!important;max-height:78vh!important;object-fit:contain!important;border-radius:14px!important;background:#f8fafc!important;align-self:center!important;}
      #ceV505PhotoModal .ce-v505-photo-info{font-size:12px!important;color:#475569!important;white-space:pre-wrap!important;max-height:80px!important;overflow:auto!important;border-top:1px solid #e5e7eb!important;padding-top:6px!important;}
      @media(max-width:760px){
        body.ce-authenticated-v505 .appname .user-actions{display:flex!important;position:fixed!important;top:calc(env(safe-area-inset-top,0px) + 6px)!important;right:calc(env(safe-area-inset-right,0px) + 6px)!important;left:auto!important;z-index:9500!important;gap:5px!important;align-items:center!important;justify-content:flex-end!important;pointer-events:none!important;margin:0!important;height:auto!important;min-height:0!important;}
        body.ce-authenticated-v505 #btnLogout:not(.hidden),body.ce-authenticated-v505 #btnSoftRefresh:not(.hidden){position:static!important;display:inline-flex!important;visibility:visible!important;align-items:center!important;justify-content:center!important;height:34px!important;min-height:34px!important;border-radius:12px!important;background:rgba(255,255,255,.98)!important;color:#111827!important;box-shadow:0 8px 24px rgba(15,23,42,.18)!important;font-size:12px!important;font-weight:900!important;pointer-events:auto!important;touch-action:manipulation!important;padding:0 9px!important;margin:0!important;}
        body.ce-authenticated-v505 #btnLogout:not(.hidden){min-width:56px!important;}body.ce-authenticated-v505 #btnSoftRefresh:not(.hidden){min-width:76px!important;}
        body.ce-role-ro-v505 #mainTabs.tabs{grid-template-columns:repeat(3,42px)!important;gap:8px!important;justify-content:center!important;margin-top:2px!important;}
        body.ce-role-ro-v505 #mainTabs .tab{width:42px!important;height:42px!important;min-width:42px!important;min-height:42px!important;}
        body.ce-role-ro-v505 #mainTabs .tab .tabicon{font-size:28px!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function applyVersion(){
    try{ document.title = VERSION; document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => { const text=el.textContent || ''; if(/ControlEvent\s+v\d+(?:\.\d+)*/i.test(text)) el.textContent = text.replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION); }); }catch(_){ }
  }

  function syncAuthUi(){
    injectStyle(); applyVersion();
    const has = !!auth();
    const r = role();
    document.body.classList.toggle('ce-authenticated-v505', has);
    document.body.classList.toggle('ce-role-gd-v505', has && r === 'GD');
    document.body.classList.toggle('ce-role-rw-v505', has && r === 'RW');
    document.body.classList.toggle('ce-role-ro-v505', has && r === 'RO');
    if(!has){
      document.body.classList.remove('ce-authenticated-v504','ce-role-gd-v504','ce-role-rw-v504','ce-role-ro-v504','ce-role-gd-v502','ce-role-rw-v502','ce-role-ro-v502','ce-role-ro-v452','mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
      document.documentElement.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
      document.body.classList.add('auth-locked');
      const overlay=$('authOverlay'); if(overlay){ overlay.classList.remove('hidden'); overlay.removeAttribute('hidden'); overlay.style.removeProperty('display'); overlay.style.removeProperty('visibility'); overlay.style.removeProperty('pointer-events'); }
      const logout=$('btnLogout'); if(logout) logout.classList.add('hidden');
      const refresh=$('btnSoftRefresh'); if(refresh) refresh.classList.add('hidden');
    }else{
      document.body.classList.remove('auth-locked');
      const overlay=$('authOverlay'); if(overlay) overlay.classList.add('hidden');
      const logout=$('btnLogout'); if(logout){ logout.classList.remove('hidden'); logout.disabled=false; }
      const refresh=$('btnSoftRefresh'); if(refresh){ refresh.classList.remove('hidden'); refresh.disabled=false; }
    }
  }

  function stabilizeRoleMenu(){
    syncAuthUi();
    if(!auth()) return;
    const active = setCurrentTab(currentTab());
    Object.entries(BTN).forEach(([tab,id]) => setVisible($(id), roleAllows(tab)));
    document.querySelectorAll('.mobile-menu-action[data-target]').forEach(el => {
      const tab = TAB_BY_BTN[el.dataset?.target || ''];
      if(tab) setVisible(el, roleAllows(tab));
    });
    ['btnExportExcel','btnOpenImport','btnExportSeed','btnToggleMaintenance'].forEach(id => setVisible($(id), !isRO() && (isGD() || isRW())));
    TABS.forEach(tab => {
      const panel = $(PANEL[tab]);
      if(!panel) return;
      const allowed = roleAllows(tab);
      const visible = allowed && tab === active;
      panel.classList.toggle('hidden', !visible);
      if(visible){ panel.style.removeProperty('display'); panel.removeAttribute('aria-hidden'); }
      else if(!allowed){ panel.style.setProperty('display','none','important'); panel.setAttribute('aria-hidden','true'); }
    });
    Object.entries(BTN).forEach(([tab,id]) => { const btn=$(id); if(btn) btn.classList.toggle('active', roleAllows(tab) && tab === active); });
  }

  function prepareLogoutStart(){
    injectStyle();
    document.body.classList.remove('ce-authenticated-v505','ce-authenticated-v504','ce-role-ro-v505','ce-role-rw-v505','ce-role-gd-v505','ce-role-ro-v504','ce-role-rw-v504','ce-role-gd-v504','ce-role-ro-v502','ce-role-rw-v502','ce-role-gd-v502','ce-role-ro-v452','mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
    document.documentElement.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
    document.body.classList.add('auth-locked');
    const overlay=$('authOverlay'); if(overlay){ overlay.classList.remove('hidden'); overlay.removeAttribute('hidden'); overlay.style.removeProperty('display'); overlay.style.removeProperty('visibility'); overlay.style.removeProperty('pointer-events'); }
    ['ceV505PhotoModal','ceV504ReceiptModal','ceV502ReceiptModal','ceTicketModalV234','ceTicketImageModalV225'].forEach(id => { const el=$(id); if(el){ try{ el.remove(); }catch(_){ el.classList.remove('visible','open','show'); } } });
    const logout=$('btnLogout'); if(logout) logout.classList.add('hidden');
    const refresh=$('btnSoftRefresh'); if(refresh) refresh.classList.add('hidden');
  }

  function patchLoginLogout(){
    ['doLogin','doLogout'].forEach(name => {
      const old = getFn(name);
      if(typeof old !== 'function' || old.__ceV505Wrapped) return;
      const wrapped = async function(){
        if(name === 'doLogout') prepareLogoutStart();
        const result = await old.apply(this, arguments);
        syncAuthUi(); stabilizeRoleMenu(); sanitizeTipAttributes(); normalizeOpenTooltipTables();
        return result;
      };
      wrapped.__ceV505Wrapped = true;
      try{ window[name] = wrapped; }catch(_){ }
      try{ Function(name + ' = window["' + name + '"]')(); }catch(_){ }
    });
    const oldAuth = getFn('renderAuthUI');
    if(typeof oldAuth === 'function' && !oldAuth.__ceV505Wrapped){
      const wrappedAuth = function(){ const ret = oldAuth.apply(this, arguments); syncAuthUi(); return ret; };
      wrappedAuth.__ceV505Wrapped = true;
      try{ renderAuthUI = wrappedAuth; }catch(_){ }
      window.renderAuthUI = wrappedAuth;
    }
  }

  function isHeaderLine(line){
    const t = up(line).replace(/\s*\|\s*/g,'|');
    return /^(DONANTE|TIENDA|TICKET|TICKET\/OTROS GASTOS|TICKET U OTROS GASTOS|NOMBRE)\|/.test(t) && /\|/.test(t) && /(PRODUCTO|INGRESO|IMPORTE|UDS|CANT|TOTAL)/.test(t);
  }
  function normalizeTipText(text){
    const raw = String(text || '');
    if(!raw.includes('|')) return raw;
    const lines = raw.split(/\r?\n/);
    let i = 0;
    while(i < lines.length){
      if(!lines[i].includes('|')){ i++; continue; }
      const start = i;
      while(i < lines.length && lines[i].includes('|')) i++;
      const end = i;
      const block = lines.slice(start, end);
      const headerIdx = block.findIndex(isHeaderLine);
      if(headerIdx > 0){
        const [header] = block.splice(headerIdx, 1);
        block.unshift(header);
        lines.splice(start, end - start, ...block);
      }
    }
    return lines.join('\n');
  }
  function sanitizeTipAttributes(){
    document.querySelectorAll('[data-ce-tip-v21]').forEach(el => {
      const old = el.getAttribute('data-ce-tip-v21') || '';
      const fixed = normalizeTipText(old);
      if(fixed !== old) el.setAttribute('data-ce-tip-v21', fixed);
    });
  }
  function normalizeOpenTooltipTables(){
    const boxes = ['ceTooltipV21','ceBudgetLiteTooltipV307','ceV462Tooltip'].map($).filter(Boolean).concat(Array.from(document.querySelectorAll('.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip')));
    boxes.forEach(box => {
      box.querySelectorAll('table').forEach(table => {
        const rows = Array.from(table.querySelectorAll('tr'));
        if(rows.length < 2) return;
        const idx = rows.findIndex(tr => isHeaderLine(Array.from(tr.children).map(td => td.textContent || '').join(' | ')));
        if(idx > 0){
          const tr = rows[idx];
          const parent = tr.parentNode;
          try{ parent.insertBefore(tr, rows[0]); tr.classList.add('ce-v505-tooltip-header-row'); }catch(_){ }
        }else if(idx === 0){
          rows[0].classList.add('ce-v505-tooltip-header-row');
        }
      });
    });
  }

  let lastPhotoOpen = 0;
  function photoInfoFromTarget(target){
    const row = target.closest?.('tr,.summary-item,.budget-row,.itemcard,.chart-row,#ceTooltipV21,#ceBudgetLiteTooltipV307');
    let text = '';
    if(row){
      text = row.innerText || '';
      if(!text){
        const owner = row.closest?.('[data-ce-tip-v21]') || target.closest?.('[data-ce-tip-v21]');
        text = owner?.getAttribute?.('data-ce-tip-v21') || '';
      }
    }
    return String(text || '').replace(/\n{3,}/g,'\n\n').trim().slice(0,1200);
  }
  function closePhotoModal(ev){
    stop(ev || {});
    const old = $('ceV505PhotoModal');
    if(old) old.remove();
    return false;
  }
  function openPhotoModal(src, info, ev){
    if(!src) return false;
    injectStyle();
    const now = Date.now();
    if(now - lastPhotoOpen < 280) return stop(ev || {});
    lastPhotoOpen = now;
    try{ $('ceV505PhotoModal')?.remove(); }catch(_){ }
    try{ document.querySelectorAll('#ceTicketModalV234,#ceTicketImageModalV225,.ce-ticket-modal-v234,.ce-ticket-modal-v225').forEach(m => m.classList.remove('visible','open','show')); }catch(_){ }
    const modal = document.createElement('div');
    modal.id = 'ceV505PhotoModal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML = `<div class="ce-v505-photo-card"><div class="ce-v505-photo-head"><span>Foto / justificante</span><button type="button" class="ce-v505-photo-close" aria-label="Cerrar">×</button></div><img alt="Foto ampliada" src="${esc(src)}">${info ? `<div class="ce-v505-photo-info">${esc(info)}</div>` : ''}</div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target === modal || e.target?.closest?.('.ce-v505-photo-close')) return closePhotoModal(e); try{ e.stopPropagation(); }catch(_){ } }, true);
    modal.addEventListener('pointerdown', e => { if(e.target === modal || e.target?.closest?.('.ce-v505-photo-close')) return; try{ e.stopPropagation(); }catch(_){ } }, true);
    try{ modal.querySelector('.ce-v505-photo-close')?.focus({preventScroll:true}); }catch(_){ }
    return stop(ev || {});
  }
  function handlePhotoPointer(ev){
    const target = ev.target?.closest?.('.ce-v465-tip-thumb,img.ticket-thumb');
    if(!target) return;
    const inUsefulArea = target.closest?.('#ceTooltipV21,#ceBudgetLiteTooltipV307,#summaryTiendaTicket,#eventChartWrap,.summary-item,.chart-row');
    if(!inUsefulArea) return;
    const img = target.matches?.('img') ? target : target.querySelector?.('img');
    const src = img?.currentSrc || img?.src || '';
    if(!src) return;
    return openPhotoModal(src, photoInfoFromTarget(target), ev);
  }

  function handleNav(ev){
    const trg = ev.target?.closest?.('button[id],.mobile-menu-action[data-target]');
    if(!trg || !auth()) return;
    const id = trg.dataset?.target || trg.id || '';
    const tab = TAB_BY_BTN[id] || '';
    if(tab && !roleAllows(tab)){ stop(ev); stabilizeRoleMenu(); return false; }
    if(tab){ setCurrentTab(tab); setTimeout(stabilizeRoleMenu, 40); }
  }

  function patchRender(){
    const old = getFn('render');
    if(typeof old !== 'function' || old.__ceV505Wrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      [20,80,220,520].forEach(ms => setTimeout(() => { syncAuthUi(); stabilizeRoleMenu(); sanitizeTipAttributes(); normalizeOpenTooltipTables(); applyVersion(); }, ms));
      return ret;
    };
    wrapped.__ceV505Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.render = (...args) => wrapped(...args); }catch(_){ }
  }

  function install(){
    injectStyle(); patchLoginLogout(); patchRender(); syncAuthUi(); stabilizeRoleMenu(); sanitizeTipAttributes(); normalizeOpenTooltipTables(); applyVersion();
  }

  window.addEventListener('click', ev => { if(ev.target?.closest?.('#btnLogout')) prepareLogoutStart(); }, true);
  window.addEventListener('click', handleNav, true);
  window.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') setTimeout(() => { stabilizeRoleMenu(); sanitizeTipAttributes(); }, 80); }, true);
  ['pointerdown','touchstart'].forEach(type => document.addEventListener(type, handlePhotoPointer, {capture:true, passive:false}));
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape' && $('ceV505PhotoModal')) return closePhotoModal(ev); }, true);
  document.addEventListener('click', () => setTimeout(() => { sanitizeTipAttributes(); normalizeOpenTooltipTables(); }, 20), true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0,60,180,500,1200,2500,5000].forEach(ms => setTimeout(install, ms));
  setInterval(() => { syncAuthUi(); stabilizeRoleMenu(); sanitizeTipAttributes(); normalizeOpenTooltipTables(); applyVersion(); }, window.ControlEventLowResource?.interval?.(10000) || 10000);

  window.ControlEventV505 = {version:VERSION, versionFile:VERSION_FILE, install, syncAuthUi, stabilizeRoleMenu, sanitizeTipAttributes, normalizeOpenTooltipTables, openPhotoModal};
})();

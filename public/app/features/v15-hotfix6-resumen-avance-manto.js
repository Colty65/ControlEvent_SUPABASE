(function(){
  'use strict';
  const VERSION = 'ControlEvent v23_prod_r1';
  const VERSION_FILE = 'ControlEvent_v23_prod_r1';
  const INSTALLED = '__ceV15Hotfix6ResumenAvanceManto';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const same = (a,b) => String(a ?? '') === String(b ?? '');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cssEsc = v => { try{ return window.CSS?.escape ? CSS.escape(String(v ?? '')) : String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }catch(_){ return String(v ?? '').replace(/"/g,'\\"'); } };

  function st(){
    try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ }
    try{ if(window.state) return window.state; }catch(_){ }
    try{ if(window.ControlEventApp?.state) return window.ControlEventApp.state; }catch(_){ }
    return {};
  }
  const arr = key => Array.isArray(st()[key]) ? st()[key] : [];
  function ev(){
    try{ const x = typeof selectedEvent === 'function' ? selectedEvent() : null; if(x) return x; }catch(_){ }
    const id = String(st().selectedEventId || $('selectedEvent')?.value || '');
    return arr('eventos').find(e => same(e?.id, id)) || null;
  }
  const evId = () => String(ev()?.id || st().selectedEventId || $('selectedEvent')?.value || '');
  const personaByIdSafe = id => {
    try{ if(typeof personaById === 'function') return personaById(id) || {}; }catch(_){ }
    return arr('personas').find(p => same(p?.id, id)) || {};
  };
  const productoByIdSafe = id => {
    try{ if(typeof productoById === 'function') return productoById(id) || {}; }catch(_){ }
    return arr('productos').find(p => same(p?.id, id)) || {};
  };
  const compras = () => {
    try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ }
    return arr('compras').filter(r => same(r?.eventId, evId()));
  };
  const ingresos = () => {
    try{ if(typeof collabsForEvent === 'function') return collabsForEvent() || []; }catch(_){ }
    return arr('colaboradores').filter(r => same(r?.eventId, evId()));
  };
  const docs = () => {
    try{ if(window.ControlEventDocumentsV85?.list) return window.ControlEventDocumentsV85.list(evId()) || []; }catch(_){ }
    return arr('eventDocuments').filter(r => same(r?.eventId, evId()));
  };
  function money(v){
    try{ return typeof window.money === 'function' ? window.money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }catch(_){ return `${Number(v || 0).toFixed(2)} €`; }
  }
  function num(v){
    try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0, maximumFractionDigits:2}).format(Number(v || 0)); }catch(_){ return String(v ?? ''); }
  }
  function parseEuro(value){
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = String(value ?? '').trim().replace(/\s/g,'').replace(/€/g,'');
    if(!s) return 0;
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  function srcOf(v){
    if(!v) return '';
    if(typeof v === 'string') return v;
    if(typeof v === 'object') return v.url || v.public_url || v.publicUrl || v.pathname || v.path || v.storage_path || v.dataUrl || v.base64 || '';
    return '';
  }
  function imageExists(keys){
    const s = st();
    const stores = [s.ticketImages || {}, s.ticketImageRefs || {}];
    for(const key of keys){
      for(const store of stores){
        const src = srcOf(store[key]);
        if(src) return true;
      }
    }
    return false;
  }
  function ingresoReceiptKeys(id){
    const e = evId();
    const sid = String(id || '');
    return [`${e}|INGRESO:${sid}`, `${e}|INGRESO|${sid}`, `INGRESO:${e}|${sid}`, `INGRESO:${sid}`];
  }
  function ticketImageKeys(code){
    const e = evId();
    const c = String(code || '').trim();
    return [`${e}|${c}`, c];
  }
  function totalIngreso(row){
    const precioEvento = Number(ev()?.precio || 0);
    const n = Number(row?.numero || 0);
    const per = row?.persona || personaByIdSafe(row?.personaId) || {};
    const esSocio = up(per?.rango || '') === 'SOCIO';
    const socio = esSocio ? Number(row?.base != null ? row.base : n * precioEvento) : 0;
    const vol = Number(row?.donation != null ? row.donation : (row?.importe || 0));
    return Number(row?.total != null ? row.total : socio + vol);
  }
  function isPendingIngreso(row){ return up(row?.situacion || '') === 'PENDIENTE'; }
  function ticketCode(value){ return norm(value || ''); }
  function isDonationTicket(value){ return up(value || '').startsWith('DONADO'); }
  function isCurrentExpenseTicket(value){ return up(value || '') === 'GASTOS CORRIENTES'; }

  function computeProgress(){
    const ing = ingresos();
    const buyRows = compras();
    const plannedBuys = buyRows.filter(r => !isDonationTicket(ticketCode(r?.ticketDonacion)));
    const tkRows = buyRows.filter(r => /^TK\d+/i.test(ticketCode(r?.ticketDonacion)));
    const uniqueTks = Array.from(new Set(tkRows.map(r => ticketCode(r.ticketDonacion)).filter(Boolean))).sort();
    const donRows = buyRows.filter(r => isDonationTicket(ticketCode(r?.ticketDonacion)));
    const totalIngresos = ing.reduce((a,r) => a + totalIngreso(r), 0);
    const doneIngresos = ing.filter(r => !isPendingIngreso(r)).reduce((a,r) => a + totalIngreso(r), 0);
    const ingresoRowsForReceipt = ing.filter(r => !isPendingIngreso(r));
    const ingresoReceiptDone = ingresoRowsForReceipt.filter(r => imageExists(ingresoReceiptKeys(r?.id))).length;
    const comprasDoneRows = plannedBuys.filter(r => {
      const tk = ticketCode(r?.ticketDonacion);
      return /^TK\d+/i.test(tk) || isCurrentExpenseTicket(tk);
    });
    const ticketPhotoDone = uniqueTks.filter(code => imageExists(ticketImageKeys(code))).length;
    const docRows = docs();

    return {
      ingresosPct: totalIngresos > 0 ? Math.max(0, Math.min(100, (doneIngresos / totalIngresos) * 100)) : 0,
      ingresosText: `${money(doneIngresos)} de ${money(totalIngresos)} ingresados`,
      ingresosReceiptPct: ingresoRowsForReceipt.length > 0 ? Math.max(0, Math.min(100, (ingresoReceiptDone / ingresoRowsForReceipt.length) * 100)) : 0,
      ingresosReceiptText: `${num(ingresoReceiptDone)} de ${num(ingresoRowsForReceipt.length)} ingresos realizados con justificante`,
      donacionesPct: donRows.length > 0 ? 100 : 0,
      donacionesText: donRows.length > 0 ? `Donaciones registradas: ${num(donRows.length)}` : 'Aún no hay donaciones registradas',
      comprasPct: plannedBuys.length > 0 ? Math.max(0, Math.min(100, (comprasDoneRows.length / plannedBuys.length) * 100)) : 0,
      comprasText: `${num(comprasDoneRows.length)} de ${num(plannedBuys.length)} líneas ya asignadas a TKxx o gastos corrientes`,
      docsPct: docRows.length > 0 ? 100 : 0,
      docsText: docRows.length > 0 ? `${num(docRows.length)} documento(s) adjunto(s)` : '0 documentos adjuntos',
      docsWarn: docRows.length === 0 ? 'Este evento no tiene documentos adjuntos. ¿Es correcto?' : '',
      ticketPhotoPct: uniqueTks.length > 0 ? Math.max(0, Math.min(100, (ticketPhotoDone / uniqueTks.length) * 100)) : 0,
      ticketPhotoText: `${num(ticketPhotoDone)} de ${num(uniqueTks.length)} tickets contables con foto adjunta`,
      ticketPhotoWarn: uniqueTks.length === 0 ? 'Todavía no hay TKxx registrados' : ''
    };
  }

  function progressRowHtml(label, pct, color, text, warn){
    const clamped = Math.max(0, Math.min(100, Number(pct || 0)));
    return `
      <div class="ce-v15hf6-progress-row">
        <div class="ce-v15hf6-progress-head">
          <div class="ce-v15hf6-progress-label">${esc(label)}</div>
          <div class="ce-v15hf6-progress-pct">${esc(num(clamped))}%</div>
        </div>
        <div class="ce-v15hf6-progress-track"><div class="ce-v15hf6-progress-fill" style="width:${clamped}%;background:${esc(color)}"></div></div>
        <div class="ce-v15hf6-progress-sub">${esc(text || '')}</div>
        ${warn ? `<div class="ce-v15hf6-progress-warn">${esc(warn)}</div>` : ''}
      </div>`;
  }

  function applyBudgetProgress(){
    const panel = document.querySelector('#budgetLayout .budget-panel.donantes') || Array.from(document.querySelectorAll('#budgetLayout .budget-panel')).find(p => /DONACI[OÓ]N\s+DE\s+PRODUCTO/i.test(p.querySelector('h3')?.textContent || ''));
    if(!panel) return;
    const p = computeProgress();
    let box = panel.querySelector('.ce-v15hf6-avance-box');
    if(!box){
      box = document.createElement('div');
      box.className = 'ce-v15hf6-avance-box';
      panel.appendChild(box);
    }
    box.innerHTML = `
      <div class="ce-v15hf6-avance-title">AVANCE del evento</div>
      ${progressRowHtml('1 · INGRESOS', p.ingresosPct, '#2563eb', p.ingresosText, '')}
      ${progressRowHtml('2 · Foto justificante de ingresos adjuntas', p.ingresosReceiptPct, '#16a34a', p.ingresosReceiptText, '')}
      ${progressRowHtml('3 · DONACIONES', p.donacionesPct, '#f59e0b', p.donacionesText, '')}
      ${progressRowHtml('4 · COMPRAS', p.comprasPct, '#ef4444', p.comprasText, '')}
      ${progressRowHtml('5 · DOCUMENTOS DEL EVENTO', p.docsPct, p.docsPct >= 100 ? '#16a34a' : '#f59e0b', p.docsText, p.docsWarn)}
      ${progressRowHtml('6 · Foto de tickets adjuntos a factura contable', p.ticketPhotoPct, '#8b5cf6', p.ticketPhotoText, p.ticketPhotoWarn)}
    `;
  }

  function normalizeSummaryRows(){
    const root = $('summaryTiendaTicket');
    if(!root) return;
    const rows = Array.from(root.querySelectorAll(':scope > .summary-item'));
    rows.forEach(row => {
      const amount = row.querySelector('.pill');
      const labelNode = row.querySelector(':scope > span:first-child') || row.querySelector('span');
      if(!labelNode || !amount) return;
      const full = norm(labelNode.textContent || '');
      if(!full) return;
      const isTotal = /^TOTAL(\s+EVENTO)?$/i.test(full);
      if(isTotal) return;
      const parts = full.split(' · ').map(x => norm(x)).filter(Boolean);
      const head = parts.shift() || full;
      const detail = parts.join(' · ');
      if(detail){
        const tip = `${head}\n\n${detail}`;
        row.setAttribute('data-ce-tip-v21', tip);
        row.setAttribute('data-tip-bg-v21', '#ffffff');
        row.setAttribute('data-ce-tip-layout-v21', 'default');
        row.setAttribute('data-ce-tip', tip);
        row.setAttribute('data-tip-bg', '#ffffff');
        row.setAttribute('data-ce-tip-layout', 'default');
        labelNode.setAttribute('data-ce-tip-v21', tip);
        labelNode.setAttribute('data-tip-bg-v21', '#ffffff');
        labelNode.setAttribute('data-ce-tip-layout-v21', 'default');
        labelNode.setAttribute('data-ce-tip', tip);
        labelNode.setAttribute('data-tip-bg', '#ffffff');
        labelNode.setAttribute('data-ce-tip-layout', 'default');
        labelNode.textContent = head;
        row.classList.add('ce-v15hf6-summary-collapsed');
      }else{
        row.classList.remove('ce-v15hf6-summary-collapsed');
      }
      if(/PTE\.?\s*COMPRA|OTROS\s*GASTOS/i.test(head)) row.classList.add('ce-v15hf6-summary-pending');
    });
  }

  function visibleMaintTab(){
    const map = [
      ['personas','mtPersonas'],
      ['eventos','mtEventos'],
      ['tiendas','mtTiendas'],
      ['productos','mtProductos'],
      ['acceso','mtAcceso'],
      ['importar','mtImportar']
    ];
    for(const [tab,id] of map){
      const el = $(id);
      if(el && !el.classList.contains('hidden')) return tab;
    }
    try{ return String(window.currentMaintTab || ''); }catch(_){ }
    return '';
  }
  function captureMaintenanceContext(btn){
    const wrap = $('maintenanceWrapper');
    const panel = btn?.closest?.('#maintenanceWrapper,.card,.itemcard,.rowline') || wrap;
    return {
      activeTab: visibleMaintTab() || 'personas',
      wrapWasHidden: !!(wrap && wrap.classList.contains('hidden')),
      pageX: window.scrollX || 0,
      pageY: window.scrollY || 0,
      docTop: document.scrollingElement?.scrollTop || 0,
      wrapTop: wrap?.scrollTop || 0,
      panelTop: panel?.getBoundingClientRect?.().top || 0,
      activeId: btn?.dataset?.id || '',
      action: btn?.dataset?.action || ''
    };
  }
  function showMaintTab(tab){
    const wrap = $('maintenanceWrapper');
    if(!wrap) return;
    wrap.classList.remove('hidden');
    try{ window.currentMaintTab = tab; }catch(_){ }
    try{ Function('value', 'currentMaintTab = value;')(tab); }catch(_){ }
    try{ if(typeof renderMaintenance === 'function') renderMaintenance(); else window.renderMaintenance?.(); }catch(_){ }
    try{ if(typeof renderMaintenanceTabs === 'function') renderMaintenanceTabs(); else window.renderMaintenanceTabs?.(); }catch(_){ }
    const map = {personas:'mtPersonas', eventos:'mtEventos', tiendas:'mtTiendas', productos:'mtProductos', acceso:'mtAcceso', importar:'mtImportar'};
    Object.keys(map).forEach(key => {
      const el = $(map[key]);
      if(el) el.classList.toggle('hidden', key !== tab);
    });
    const toggle = $('btnToggleMaintenance');
    if(toggle){ toggle.classList.add('maint-btn-open'); toggle.classList.remove('maint-btn-closed'); }
  }
  function restoreMaintenanceContext(ctx){
    if(!ctx) return;
    const wrap = $('maintenanceWrapper');
    if(!wrap) return;
    showMaintTab(ctx.activeTab || 'personas');
    try{ window.scrollTo(ctx.pageX || 0, ctx.pageY || 0); }catch(_){ }
    try{ if(document.scrollingElement) document.scrollingElement.scrollTop = ctx.docTop || ctx.pageY || 0; }catch(_){ }
    try{ wrap.scrollTop = ctx.wrapTop || 0; }catch(_){ }
    if(ctx.activeId){
      const safe = cssEsc(ctx.activeId);
      const row = document.querySelector(`#maintenanceWrapper [data-id="${safe}"]`)?.closest?.('.itemcard,.rowline,.card,tr,li') || document.querySelector(`#maintenanceWrapper button[data-id="${safe}"]`)?.closest?.('.itemcard,.rowline,.card,tr,li');
      if(row && typeof row.scrollIntoView === 'function'){
        try{ row.scrollIntoView({block:'nearest', inline:'nearest'}); }catch(_){ }
      }
    }
  }
  function scheduleMaintenanceRestore(ctx){
    [30,120,320,650,1100,1800].forEach(ms => setTimeout(() => restoreMaintenanceContext(ctx), ms));
  }

  function injectStyle(){
    if($('ceV15Hotfix6Style')) return;
    const style = document.createElement('style');
    style.id = 'ceV15Hotfix6Style';
    style.textContent = `
      #budgetLayout .budget-panel.donantes .ce-v15hf6-avance-box{margin-top:14px;padding:14px 14px 12px;border:3px solid #0f172a;border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,250,252,.98));box-shadow:0 10px 26px rgba(15,23,42,.10);}
      #budgetLayout .budget-panel.donantes .ce-v15hf6-avance-title{font-size:18px;font-weight:950;letter-spacing:.02em;color:#0f172a;margin:0 0 10px;text-transform:none;}
      #budgetLayout .budget-panel.donantes .ce-v15hf6-progress-row{display:flex;flex-direction:column;gap:5px;padding:7px 0;border-top:1px dashed rgba(15,23,42,.14);}
      #budgetLayout .budget-panel.donantes .ce-v15hf6-progress-row:first-of-type{border-top:0;padding-top:0;}
      #budgetLayout .budget-panel.donantes .ce-v15hf6-progress-head{display:flex;align-items:center;justify-content:space-between;gap:10px;}
      #budgetLayout .budget-panel.donantes .ce-v15hf6-progress-label{font-weight:900;color:#0f172a;font-size:13px;line-height:1.25;}
      #budgetLayout .budget-panel.donantes .ce-v15hf6-progress-pct{font-weight:950;color:#0f172a;font-size:13px;white-space:nowrap;}
      #budgetLayout .budget-panel.donantes .ce-v15hf6-progress-track{position:relative;height:12px;border-radius:999px;background:#e5e7eb;overflow:hidden;border:1px solid rgba(15,23,42,.10);}
      #budgetLayout .budget-panel.donantes .ce-v15hf6-progress-fill{height:100%;border-radius:999px;min-width:0;transition:width .25s ease;}
      #budgetLayout .budget-panel.donantes .ce-v15hf6-progress-sub{font-size:12px;line-height:1.25;color:#334155;font-weight:700;}
      #budgetLayout .budget-panel.donantes .ce-v15hf6-progress-warn{font-size:12px;line-height:1.25;color:#c2410c;background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:6px 8px;font-weight:800;}
      #summaryTiendaTicket .summary-item.ce-v15hf6-summary-collapsed{cursor:pointer;}
      #summaryTiendaTicket .summary-item.ce-v15hf6-summary-collapsed > span:first-child{text-decoration:none;}
      #summaryTiendaTicket .summary-item.ce-v15hf6-summary-collapsed > span:first-child::after{content:'  ⓘ';font-weight:900;color:#2563eb;}
      #summaryTiendaTicket .summary-item.ce-v15hf6-summary-collapsed{min-height:44px;align-items:center;}
      #summaryTiendaTicket .summary-item.ce-v15hf6-summary-collapsed > span:first-child{display:block;max-width:calc(100% - 120px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      #summaryTiendaTicket .summary-item.ce-v15hf6-summary-pending > span:first-child{font-weight:900;}
      @media (max-width:760px){
        #budgetLayout .budget-panel.donantes .ce-v15hf6-avance-box{padding:12px 10px;}
        #budgetLayout .budget-panel.donantes .ce-v15hf6-progress-head{align-items:flex-start;flex-direction:column;gap:3px;}
      }
    `;
    document.head.appendChild(style);
  }

  function applyVersion(){
    try{ document.title = VERSION; document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; }catch(_){ }
  }

  function applyAll(){
    applyVersion();
    injectStyle();
    applyBudgetProgress();
    normalizeSummaryRows();
  }

  window.addEventListener('click', function(ev){
    const btn = ev.target?.closest?.('button[data-action="save-persona"],button[data-action="save-evento"],button[data-action="save-tienda"],button[data-action="save-producto"],button[data-action="save-acceso"]');
    if(!btn || !btn.closest('#maintenanceWrapper')) return;
    const ctx = captureMaintenanceContext(btn);
    scheduleMaintenanceRestore(ctx);
  }, true);

  let mo = null;
  function installObserver(){
    if(mo) return;
    try{
      mo = new MutationObserver(() => {
        if(installObserver._t) clearTimeout(installObserver._t);
        installObserver._t = setTimeout(applyAll, 80);
      });
      mo.observe(document.body, {childList:true, subtree:true});
    }catch(_){ }
  }
  function wrapRender(){
    const old = (typeof render === 'function') ? render : window.render;
    if(!old || old.__ceV15Hotfix6Wrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      [20,120,340,700].forEach(ms => setTimeout(applyAll, ms));
      return ret;
    };
    wrapped.__ceV15Hotfix6Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }

  function install(){
    applyAll();
    wrapRender();
    installObserver();
  }

  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 40)));
  [0,120,500,1400,2600].forEach(ms => setTimeout(install, ms));
  setInterval(applyAll, 2500);
  window.ControlEventV15Hotfix6 = {version: VERSION, versionFile: VERSION_FILE, applyAll, computeProgress};
})();

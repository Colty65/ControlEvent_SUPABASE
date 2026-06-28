/* ControlEvent v16_prod OPT3B - Resumen: Por tienda/ticket inmediato y ligero.
   Objetivo: que los globos/detalle de donaciones y tickets estén disponibles desde
   el primer pintado, evitando el refresco tardío que provocaba retemblores y carga de CPU. */
(function(){
  'use strict';
  if(window.__ceV16Opt3BResumenGlobosRendimiento) return;
  window.__ceV16Opt3BResumenGlobosRendimiento = true;

  const VERSION = 'v16_opt_3b';
  const ROOT_ID = 'summaryTiendaTicket';
  const $ = id => document.getElementById(id);
  const norm = v => String(v == null ? '' : v).trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const arr = v => Array.isArray(v) ? v : [];
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stateRef = () => { try{ return window.ControlEventApp?.state || window.state || (typeof state !== 'undefined' ? state : {}) || {}; }catch(_){ return {}; } };
  const evId = () => norm(stateRef().selectedEventId || $('selectedEvent')?.value || '');
  const isResumenVisible = () => {
    const root = $(ROOT_ID); const tab = $('tabResumen');
    return !!(root && (root.offsetWidth || root.offsetHeight || root.getClientRects().length || (tab && (tab.offsetWidth || tab.offsetHeight || tab.getClientRects().length))));
  };
  const money = v => { try{ if(typeof window.money === 'function') return window.money(num(v)); }catch(_){} return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v)); };
  const nfmt = v => { try{ return new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(num(v)); }catch(_){ return String(v || 0); } };

  const metrics = window.ControlEventOpt3B = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    renders: 0,
    skips: 0,
    interceptedSummaryList: 0,
    interceptedBudget: 0,
    mutationFixes: 0,
    lastRenderMs: 0,
    lastSignature: '',
    lastEventId: ''
  };

  function byId(listName, id){
    const list = arr(stateRef()[listName]);
    return list.find(x => norm(x && x.id) === norm(id)) || {};
  }
  function isDonatedTicket(t){ return /^DONADO/i.test(norm(t)); }
  function isCurrentExpense(t){ const s = up(t); return s === 'GASTOS CORRIENTES' || s.includes('GASTOS CORRIENTES'); }
  function productName(c){ return c?.producto?.nombre || byId('productos', c?.productoId)?.nombre || c?.productName || c?.nombreProducto || 'Producto'; }
  function storeName(c){ return c?.tienda?.nombre || byId('tiendas', c?.tiendaId)?.nombre || c?.storeName || 'Sin tienda'; }
  function personName(id){ return byId('personas', id)?.nombre || ''; }
  function donorName(c){
    const ref = norm(c?.donorRef || c?.donanteRef || c?.donante || c?.responsable);
    if(ref.startsWith('P:')) return personName(ref.slice(2)) || 'Sin donante';
    if(ref.startsWith('T:')) return byId('tiendas', ref.slice(2))?.nombre || 'Sin donante';
    if(c?.personaId) return personName(c.personaId) || ref || 'Sin donante';
    if(c?.tiendaDonanteId) return byId('tiendas', c.tiendaDonanteId)?.nombre || ref || 'Sin donante';
    return ref || 'Sin donante';
  }
  function units(c){ return num(c?.unidades ?? c?.uds ?? c?.cantidad); }
  function price(c){ return num(c?.precio ?? c?.precioUnitario ?? c?.precioReferencia ?? byId('productos', c?.productoId)?.defaultPrecio); }
  function value(c){
    const explicit = c?.importe ?? c?.total ?? c?.valor;
    if(explicit !== undefined && explicit !== null && explicit !== '') return num(explicit);
    return units(c) * price(c);
  }
  function imageValue(v){
    if(!v) return '';
    if(typeof v === 'string') return v;
    if(typeof v === 'object') return v.url || v.public_url || v.publicUrl || v.path || v.pathname || v.storage_path || v.dataUrl || v.base64 || '';
    return '';
  }
  function ticketToken(label){ const m = up(label).match(/\bTK\d{1,3}\b/); return m ? m[0] : ''; }
  function imageRefFor(label){
    const id = evId(); const tk = ticketToken(label); if(!tk) return '';
    const s = stateRef();
    const bags = [s.ticketImages, s.ticketImageRefs, s.ticketImagesByKey, s.ticket_images, s.ce_ticket_images];
    for(const bag of bags){
      if(Array.isArray(bag)){
        for(const row of bag){
          const parts = [row?.eventId, row?.ticket, row?.tk, row?.ticketKey, row?.key, row?.codigo].map(up).join('|');
          if(id && row?.eventId && norm(row.eventId) !== id) continue;
          if(parts.includes(tk)){ const img = imageValue(row?.image || row?.url || row?.publicUrl || row?.path || row); if(img) return img; }
        }
      }else if(bag && typeof bag === 'object'){
        for(const [k,v] of Object.entries(bag)){
          const ks = norm(k); if(id && ks.includes('|') && !ks.startsWith(id + '|')) continue;
          if(up(ks).includes(tk)){ const img = imageValue(v); if(img) return img; }
        }
      }
    }
    return '';
  }

  function linePurchase(c, first){ return [first, storeName(c), productName(c), nfmt(units(c)), money(price(c)), money(value(c))]; }
  function lineDonation(c){ return [donorName(c), productName(c), nfmt(units(c)), money(price(c)), money(value(c))]; }

  function rowsForSummary(){
    const s = stateRef(); const selected = evId(); const filled = new Map(); const pending = new Map();
    arr(s.compras).filter(c => !selected || norm(c?.eventId || c?.eventoId) === selected).forEach(c => {
      const tk = norm(c.ticketDonacion || c.ticket || c.tk || c.tipoTicket);
      const donated = isDonatedTicket(tk);
      const v = value(c);
      if(!donated && (!tk || isCurrentExpense(tk))){
        const key = `${storeName(c)} | Pte. Compra u otros gastos`;
        if(!pending.has(key)) pending.set(key, {key, label:key, v:0, pending:true, donated:false, attachable:false, rawTicket:'', lines:[], headers:['Ticket/Otros gastos','Tienda','Producto','Uds','Precio','Total']});
        const r = pending.get(key); r.v += v; r.lines.push(linePurchase(c, tk || 'PTE.COMPRA')); return;
      }
      const holder = donated ? donorName(c) : storeName(c);
      const key = `${holder} | ${tk || 'Pte. Compra u otros gastos'}`;
      if(!filled.has(key)) filled.set(key, {key, label:key, v:0, pending:false, donated, attachable:!donated && !isCurrentExpense(tk), rawTicket:tk, lines:[], headers:donated ? ['Donante','Producto','Uds','Precio estimado','Valor estimado'] : ['Ticket/Otros gastos','Tienda','Producto','Uds','Precio','Total']});
      const r = filled.get(key); r.v += v; r.lines.push(donated ? lineDonation(c) : linePurchase(c, tk || 'PTE.COMPRA'));
    });
    const rows = [...filled.values(), ...pending.values()];
    const mode = stateRef().summaryTiendaSort || 'tienda';
    rows.sort((a,b) => {
      const [a1='', a2=''] = String(a.key).split(' | ');
      const [b1='', b2=''] = String(b.key).split(' | ');
      return mode === 'ticket' ? (a2.localeCompare(b2,'es') || a1.localeCompare(b1,'es')) : (a1.localeCompare(b1,'es') || a2.localeCompare(b2,'es'));
    });
    return rows.map(r => ({...r, image: r.attachable ? imageRefFor(r.key) : ''}));
  }

  function tipForRow(row){
    const out = [];
    out.push(row.donated ? 'CÁLCULOS POR DONANTE Y DONACIÓN' : (row.pending ? 'PENDIENTE DE COMPRA U OTROS GASTOS' : 'CÁLCULOS POR TIENDA Y TICKET'));
    out.push(row.key || '');
    out.push('TOTAL | ' + money(row.v || 0));
    out.push('');
    if(row.headers?.length) out.push(row.headers.join(' | '));
    (row.lines || []).forEach(line => out.push((line || []).join(' | ')));
    return out.join('\n');
  }

  function signature(rows){
    const mode = stateRef().summaryTiendaSort || 'tienda';
    return JSON.stringify([evId(), mode, ...rows.map(r => [r.key, Math.round(num(r.v) * 100), (r.lines || []).length, r.image || '', r.donated ? 1 : 0, r.pending ? 1 : 0])]);
  }

  function showTable(row){
    document.querySelectorAll('.ce-opt3b-modal,.ce-hf10-modal,.ce-hf9-modal').forEach(x => x.remove());
    const title = row.donated ? 'CÁLCULOS POR DONANTE Y DONACIÓN' : (row.pending ? 'PENDIENTE DE COMPRA U OTROS GASTOS' : 'CÁLCULOS POR TIENDA Y TICKET');
    const heads = row.headers || [];
    const htmlRows = (row.lines || []).map(line => `<tr>${line.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${heads.length || 1}">Sin detalle</td></tr>`;
    const modal = document.createElement('div'); modal.className = 'ce-opt3b-modal';
    modal.innerHTML = `<div class="ce-opt3b-card" role="dialog" aria-modal="true"><div class="ce-opt3b-head"><div><h3>${esc(title)}</h3><p>${esc(row.key)}</p></div><button type="button" class="ce-opt3b-close" aria-label="Cerrar">×</button></div><div class="ce-opt3b-total"><span>${esc(row.donated ? 'TOTAL ESTIMADO' : 'TOTAL')}</span><strong>${esc(money(row.v))}</strong></div><div class="ce-opt3b-table-wrap"><table class="ce-opt3b-table"><thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${htmlRows}</tbody></table></div></div>`;
    modal.addEventListener('click', ev => { if(ev.target === modal || ev.target.closest('.ce-opt3b-close')) modal.remove(); }, true);
    document.body.appendChild(modal);
  }

  function injectStyle(){
    if($('ceV16Opt3BStyle')) return;
    const stl = document.createElement('style'); stl.id = 'ceV16Opt3BStyle';
    stl.textContent = `
      #summaryTiendaTicket.ce-opt3b-ready{visibility:visible!important;contain:layout paint;}
      #summaryTiendaTicket .ce-opt3b-sortbar{margin-bottom:10px!important;}
      #summaryTiendaTicket .ce-opt3b-row{cursor:pointer;min-height:44px!important;transition:none!important;will-change:auto!important;}
      #summaryTiendaTicket .ce-opt3b-row.ce-opt3b-donation .pill{text-decoration:line-through;}
      #summaryTiendaTicket .ce-opt3b-row.ce-opt3b-pending .pill{background:#fef2f2!important;color:#b91c1c!important;}
      #summaryTiendaTicket .ce-opt3b-label{display:block;max-width:calc(100% - 130px);white-space:nowrap!important;overflow:hidden;text-overflow:ellipsis;text-align:left!important;font-weight:800;color:#0f172a;}
      #summaryTiendaTicket .ce-opt3b-label i{font-style:normal;color:#2563eb;font-weight:950;margin-left:5px;}
      #summaryTiendaTicket .ce-opt3b-sortbar button.active{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important;box-shadow:0 0 0 3px rgba(15,23,42,.14)!important;}
      #summaryTiendaTicket.ce-opt3b-freeze{min-height:var(--ce-opt3b-h,220px)!important;}
      .ce-opt3b-modal{position:fixed;inset:0;background:rgba(15,23,42,.38);z-index:7200;display:flex;align-items:center;justify-content:center;padding:14px;}
      .ce-opt3b-card{width:min(980px,94vw);max-height:78vh;overflow:auto;background:#fff;border-radius:18px;border:2px solid #0f172a;box-shadow:0 24px 80px rgba(15,23,42,.35);padding:14px;}
      .ce-opt3b-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:8px;}
      .ce-opt3b-head h3{margin:0;font-size:18px;font-weight:950;}.ce-opt3b-head p{margin:4px 0 0;font-weight:850;color:#334155;}.ce-opt3b-head button{border:0;background:#0f172a;color:#fff;border-radius:999px;width:46px;height:46px;font-size:30px;font-weight:950;line-height:1;cursor:pointer;}
      .ce-opt3b-total{display:flex;justify-content:space-between;gap:12px;align-items:center;background:#e0f2fe;border-radius:12px;padding:8px 10px;margin-bottom:8px;font-weight:950;}
      .ce-opt3b-table-wrap{overflow:auto;border:1px solid #dbe4ee;border-radius:12px;}.ce-opt3b-table{border-collapse:separate;border-spacing:0;width:100%;min-width:680px;font-size:13px;}.ce-opt3b-table th,.ce-opt3b-table td{padding:7px 9px;border-bottom:1px solid #e2e8f0;border-right:1px solid #eef2f7;text-align:left;white-space:nowrap;}.ce-opt3b-table th{position:sticky;top:0;background:#f1f5f9;font-weight:950;z-index:1;}.ce-opt3b-table td:nth-last-child(-n+3),.ce-opt3b-table th:nth-last-child(-n+3){text-align:right;}.ce-opt3b-table td:first-child{font-weight:850;}
    `;
    document.head.appendChild(stl);
  }

  let rendering = false;
  function renderNow(force){
    const root = $(ROOT_ID); if(!root) return false;
    if(!force && !isResumenVisible()) return false;
    const started = performance.now ? performance.now() : Date.now();
    const rows = rowsForSummary();
    const sig = signature(rows);
    if(!force && root.dataset.ceOpt3bSig === sig && root.querySelector('.ce-opt3b-row')){ metrics.skips++; return true; }
    rendering = true;
    const h = Math.round(root.getBoundingClientRect?.().height || root.offsetHeight || 0);
    if(h > 160){ root.style.setProperty('--ce-opt3b-h', h + 'px'); root.classList.add('ce-opt3b-freeze'); }
    const mode = stateRef().summaryTiendaSort || 'tienda';
    root.dataset.ceOpt3bSig = sig;
    root.dataset.ceOpt3bEventId = evId();
    root.classList.add('ce-opt3b-ready','ce-hf10-ready');
    root.innerHTML = `<div class="hint ce-opt3b-sortbar ce-hf10-sortbar"><span>Ordenar por:</span><button type="button" class="outline small ${mode === 'tienda' ? 'active' : ''}" data-opt3b-sort="tienda">Tienda</button><button type="button" class="outline small ${mode === 'ticket' ? 'active' : ''}" data-opt3b-sort="ticket">Ticket/Donación/Otros gastos</button></div>`;
    if(!rows.length){ root.insertAdjacentHTML('beforeend','<div class="hint">Sin datos.</div>'); rendering = false; return true; }
    let total = 0;
    const frag = document.createDocumentFragment();
    rows.forEach(row => {
      total += num(row.v);
      const div = document.createElement('div');
      div.className = 'summary-item ce-opt3b-row ce-hf10-row' + (row.pending ? ' red-row ce-opt3b-pending' : '') + (row.donated ? ' ce-opt3b-donation' : '');
      div.dataset.ceOpt3bKey = row.key || '';
      div.dataset.ceHf12Tk = row.rawTicket || '';
      const rowTip = tipForRow(row);
      div.setAttribute('data-ce-tip-v21', rowTip);
      div.setAttribute('data-ce-tip', rowTip);
      div.__ceOpt3bRow = row;
      const encoded = encodeURIComponent(row.key || '');
      const actions = row.attachable ? `<span class="ticket-actions"><button type="button" class="outline small" title="Insertar foto" onclick="uploadTicketImage('${encoded}'); return false;">📎</button>${row.image ? `<img class="ticket-thumb" src="${esc(row.image)}" alt="ticket" data-ce-hf12-tk="${esc(row.rawTicket || '')}" data-ce-tip-v21="${esc(rowTip)}" />` : '<span class="hint">Sin imagen</span>'}${row.image ? `<button type="button" class="outline small" title="Eliminar foto" onclick="removeTicketImage('${encoded}'); return false;">🗑️</button>` : ''}</span>` : '';
      div.innerHTML = `<span class="ce-opt3b-label ce-hf10-label">${esc(row.key)} <i>ⓘ</i></span><span style="display:flex;align-items:center;gap:8px;justify-content:flex-end;"><span class="pill">${esc(money(row.v))}</span>${actions}</span>`;
      frag.appendChild(div);
    });
    root.appendChild(frag);
    root.insertAdjacentHTML('beforeend', `<div class="summary-item ce-tt-total-evento" style="font-weight:800"><span>TOTAL EVENTO</span><span class="pill">${esc(money(total))}</span></div>`);
    try{ window.ControlEventSummaryTiendaSortFix?.apply?.(); }catch(_){ }
    metrics.renders++; metrics.lastSignature = sig; metrics.lastEventId = evId(); metrics.lastRenderMs = Math.round((performance.now ? performance.now() : Date.now()) - started);
    setTimeout(() => { try{ root.classList.remove('ce-opt3b-freeze'); root.style.removeProperty('--ce-opt3b-h'); }catch(_){} }, 180);
    rendering = false;
    return true;
  }

  let timer = 0;
  function schedule(reason, delay){
    clearTimeout(timer);
    timer = setTimeout(() => { try{ renderNow(false); }catch(err){ console.warn('[v16_opt_3b] render', reason, err); } }, delay == null ? 40 : delay);
  }

  function patchGlobals(){
    if(window.__ceOpt3bPatchedGlobals) return;
    window.__ceOpt3bPatchedGlobals = true;
    const prevSummaryList = window.renderSummaryList;
    const summaryWrapped = function(targetId, rows){
      if(targetId === ROOT_ID){ metrics.interceptedSummaryList++; renderNow(true); return; }
      return typeof prevSummaryList === 'function' ? prevSummaryList.apply(this, arguments) : undefined;
    };
    try{ window.renderSummaryList = summaryWrapped; renderSummaryList = summaryWrapped; }catch(_){ window.renderSummaryList = summaryWrapped; }
    try{ window.summaryByTiendaTicket = rowsForSummary; summaryByTiendaTicket = rowsForSummary; }catch(_){ window.summaryByTiendaTicket = rowsForSummary; }
  }

  function patchRenderBudget(){
    const current = window.renderBudget || (typeof renderBudget === 'function' ? renderBudget : null);
    if(typeof current !== 'function' || current.__ceOpt3bRenderWrapped) return;
    const original = current;
    const wrapped = function(){
      const ret = original.apply(this, arguments);
      metrics.interceptedBudget++;
      schedule('renderBudget', 90);
      return ret;
    };
    wrapped.__ceOpt3bRenderWrapped = true;
    wrapped.__ceOpt3bOriginal = original;
    try{ window.renderBudget = wrapped; renderBudget = wrapped; }catch(_){ window.renderBudget = wrapped; }
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.renderBudget = wrapped; }catch(_){ }
  }

  let observer = null;
  function installObserver(){
    const root = $(ROOT_ID); if(!root || observer) return;
    observer = new MutationObserver(() => {
      if(rendering) return;
      // Si otro parche sustituye la lista por una versión sin detalle, se restaura una sola vez.
      const ok = !!root.querySelector('.ce-opt3b-row[data-ce-tip-v21]');
      if(!ok && isResumenVisible()){ metrics.mutationFixes++; schedule('mutation', 60); }
    });
    observer.observe(root, {childList:true});
  }

  document.addEventListener('click', ev => {
    const sort = ev.target?.closest?.('[data-opt3b-sort]');
    if(sort){
      ev.preventDefault(); ev.stopPropagation();
      try{ stateRef().summaryTiendaSort = sort.getAttribute('data-opt3b-sort') || 'tienda'; }catch(_){ }
      renderNow(true); return;
    }
    const rowEl = ev.target?.closest?.('#summaryTiendaTicket .ce-opt3b-row');
    if(rowEl && !ev.target.closest('button,input,select,a,img')){
      const row = rowEl.__ceOpt3bRow;
      if(row){ ev.preventDefault(); ev.stopPropagation(); showTable(row); }
    }
  }, true);
  window.addEventListener('keydown', ev => { if(ev.key === 'Escape') document.querySelectorAll('.ce-opt3b-modal').forEach(m => m.remove()); }, true);

  function install(){ injectStyle(); patchGlobals(); patchRenderBudget(); installObserver(); schedule('install', 20); }

  window.ControlEventOpt3B = Object.assign(metrics, {install, renderNow, rowsForSummary});

  install();
  setTimeout(install, 100);
  setTimeout(install, 500);
  ['controlevent:runtime-ready','controlevent:app-ready','controlevent:data-loaded','controlevent:event-ready','controlevent:opt1-event-stable'].forEach(e => window.addEventListener(e, () => schedule(e, 70), true));
  window.addEventListener('controlevent:event-changed', () => { const root = $(ROOT_ID); if(root) root.classList.remove('ce-hf10-ready'); schedule('event-changed', 120); }, true);
})();

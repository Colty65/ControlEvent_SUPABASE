/* ControlEvent v16_prod OPT3I - Resumen hardlock controlado + reposo real.
   Rebase sobre OPT3H. No toca login, /api/state, selector, gráficas, compras ni tickets.
   OPT3I corta el trabajo repetido después de un cambio de evento: si el bloque ya pertenece al
   evento actual no vuelve a recalcular filas, importes ni miniaturas durante la ventana de reposo. */
(function(){
  'use strict';
  if(window.__ceV16Opt3FResumenHardlock) return;
  window.__ceV16Opt3FResumenHardlock = true;

  const VERSION = 'v16_opt_3k_core';
  const ROOT_ID = 'summaryTiendaTicket';
  const $ = id => document.getElementById(id);
  const norm = v => String(v == null ? '' : v).trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const arr = v => Array.isArray(v) ? v : [];
  const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stateRef = () => { try{ return window.ControlEventApp?.state || window.state || (typeof state !== 'undefined' ? state : {}) || {}; }catch(_){ return {}; } };
  const evId = () => norm(stateRef().selectedEventId || $('selectedEvent')?.value || '');
  const authVisible = () => {
    const ov = $('authOverlay');
    if(!ov || ov.classList.contains('hidden') || ov.hasAttribute('hidden')) return false;
    try{ const cs = getComputedStyle(ov); return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) !== 0; }catch(_){ return true; }
  };
  const readyToWork = () => !authVisible() && !!evId();
  const isVisible = el => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const isResumenVisible = () => readyToWork() && isVisible($(ROOT_ID));
  const money = v => { try{ if(typeof window.money === 'function') return window.money(num(v)); }catch(_){} return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v)); };
  const nfmt = v => { try{ return new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(num(v)); }catch(_){ return String(v || 0); } };

  function listLen(v){
    if(Array.isArray(v)) return v.length;
    if(v && typeof v === 'object') return Object.keys(v).length;
    return 0;
  }
  function lightStamp(){
    const s = stateRef();
    const images = listLen(s.ticketImages) + listLen(s.ticketImageRefs) + listLen(s.ticketImagesByKey) + listLen(s.ticket_images) + listLen(s.ce_ticket_images);
    return [evId(), s.summaryTiendaSort || 'tienda', listLen(s.compras), listLen(s.productos), listLen(s.tiendas), listLen(s.personas), images].join('|');
  }

  let ticketImageIndexCache = {stamp:'', eventId:'', map:new Map()};
  let rowsCache = {stamp:'', eventId:'', rows:null, at:0};

  function clearCaches(){
    ticketImageIndexCache = {stamp:'', eventId:'', map:new Map()};
    rowsCache = {stamp:'', eventId:'', rows:null, at:0};
    metrics.cacheClears++;
    try{ const root = $(ROOT_ID); if(root){ delete root.dataset.ceOpt3eLightStamp; delete root.dataset.ceOpt3eSig; } }catch(_){}
  }

  const metrics = window.ControlEventOpt3F = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    renders: 0,
    skips: 0,
    skipsForcedSame: 0,
    blockedBeforeLogin: 0,
    observerFixes: 0,
    blockedLegacySummaryRenders: 0,
    blockedOldDomWrites: 0,
    fallbackClicks: 0,
    lastMs: 0,
    lastSig: '',
    lastEventId: '',
    lightSkips: 0,
    imageIndexBuilds: 0,
    rowsCacheHits: 0,
    budgetStableSkips: 0,
    cacheClears: 0
  };

  function byId(listName, id){
    const list = arr(stateRef()[listName]);
    return list.find(x => norm(x && x.id) === norm(id)) || {};
  }
  function productName(c){ return c?.producto?.nombre || byId('productos', c?.productoId)?.nombre || c?.productName || c?.nombreProducto || c?.producto || 'Producto'; }
  function storeName(c){ return c?.tienda?.nombre || byId('tiendas', c?.tiendaId)?.nombre || c?.storeName || c?.tienda || 'Sin tienda'; }
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
  function isDonatedTicket(t){ return /^DONADO/i.test(norm(t)); }
  function isCurrentExpense(t){ const s = up(t); return s === 'GASTOS CORRIENTES' || s.includes('GASTOS CORRIENTES'); }
  function imageValue(v){
    if(!v) return '';
    if(typeof v === 'string') return v;
    if(typeof v === 'object') return v.url || v.public_url || v.publicUrl || v.path || v.pathname || v.storage_path || v.dataUrl || v.base64 || '';
    return '';
  }
  function ticketToken(label){ const m = up(label).match(/\bTK\d{1,3}\b/); return m ? m[0] : ''; }
  function imageIndex(){
    const id = evId();
    const s = stateRef();
    const stamp = id + '|' + listLen(s.ticketImages) + '|' + listLen(s.ticketImageRefs) + '|' + listLen(s.ticketImagesByKey) + '|' + listLen(s.ticket_images) + '|' + listLen(s.ce_ticket_images);
    if(ticketImageIndexCache.stamp === stamp && ticketImageIndexCache.eventId === id) return ticketImageIndexCache.map;
    const map = new Map();
    const add = (key, img) => {
      const m = up(key).match(/\bTK\d{1,3}\b/g);
      if(!m || !img) return;
      m.forEach(tk => { if(!map.has(tk)) map.set(tk, img); });
    };
    const bags = [s.ticketImages, s.ticketImageRefs, s.ticketImagesByKey, s.ticket_images, s.ce_ticket_images];
    for(const bag of bags){
      if(Array.isArray(bag)){
        for(const row of bag){
          if(id && row?.eventId && norm(row.eventId) !== id) continue;
          const parts = [row?.ticket, row?.tk, row?.ticketKey, row?.key, row?.codigo].map(norm).join('|');
          const img = imageValue(row?.image || row?.url || row?.publicUrl || row?.path || row);
          add(parts, img);
        }
      }else if(bag && typeof bag === 'object'){
        for(const [k,v] of Object.entries(bag)){
          const ks = norm(k); if(id && ks.includes('|') && !ks.startsWith(id + '|')) continue;
          add(ks, imageValue(v));
        }
      }
    }
    ticketImageIndexCache = {stamp, eventId:id, map};
    metrics.imageIndexBuilds++;
    return map;
  }
  function imageRefFor(label){
    const tk = ticketToken(label);
    if(!tk) return '';
    return imageIndex().get(tk) || '';
  }

  function linePurchase(c, first){ return [first, storeName(c), productName(c), nfmt(units(c)), money(price(c)), money(value(c))]; }
  function lineDonation(c){ return [donorName(c), productName(c), nfmt(units(c)), money(price(c)), money(value(c))]; }

  function rowsForSummary(){
    const cacheStamp = lightStamp();
    const nowMs = Date.now();
    if(rowsCache.stamp === cacheStamp && rowsCache.eventId === evId() && rowsCache.rows && (nowMs - rowsCache.at) < 12000){ metrics.rowsCacheHits++; return rowsCache.rows; }
    const s = stateRef(); const selected = evId(); const filled = new Map(); const pending = new Map();
    arr(s.compras).filter(c => !selected || norm(c?.eventId || c?.eventoId) === selected).forEach(c => {
      const tk = norm(c.ticketDonacion || c.ticket || c.tk || c.tipoTicket);
      const donated = isDonatedTicket(tk);
      const v = value(c);
      if(!donated && (!tk || isCurrentExpense(tk))){
        const key = `${storeName(c)} | Pte. Compra u otros gastos`;
        if(!pending.has(key)) pending.set(key, {key, v:0, pending:true, donated:false, attachable:false, rawTicket:'', lines:[], headers:['Ticket/Otros gastos','Tienda','Producto','Uds','Precio','Total']});
        const r = pending.get(key); r.v += v; r.lines.push(linePurchase(c, tk || 'PTE.COMPRA')); return;
      }
      const holder = donated ? donorName(c) : storeName(c);
      const key = `${holder} | ${tk || 'Pte. Compra u otros gastos'}`;
      if(!filled.has(key)) filled.set(key, {key, v:0, pending:false, donated, attachable:!donated && !isCurrentExpense(tk), rawTicket:tk, lines:[], headers:donated ? ['Donante','Producto','Uds','Precio estimado','Valor estimado'] : ['Ticket/Otros gastos','Tienda','Producto','Uds','Precio','Total']});
      const r = filled.get(key); r.v += v; r.lines.push(donated ? lineDonation(c) : linePurchase(c, tk || 'PTE.COMPRA'));
    });
    const rows = [...filled.values(), ...pending.values()];
    const mode = stateRef().summaryTiendaSort || 'tienda';
    rows.sort((a,b) => {
      const [a1='', a2=''] = String(a.key).split(' | ');
      const [b1='', b2=''] = String(b.key).split(' | ');
      return mode === 'ticket' ? (a2.localeCompare(b2,'es') || a1.localeCompare(b1,'es')) : (a1.localeCompare(b1,'es') || a2.localeCompare(b2,'es'));
    });
    const out = rows.map(r => ({...r, image: r.attachable ? imageRefFor(r.key) : ''}));
    rowsCache = {stamp: cacheStamp, eventId: selected, rows: out, at: Date.now()};
    return out;
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
    return JSON.stringify([evId(), mode, ...rows.map(r => [r.key, Math.round(num(r.v)*100), (r.lines||[]).length, r.image || '', r.donated?1:0, r.pending?1:0])]);
  }

  function injectStyle(){
    if($('ceV16Opt3EStyle')) return;
    const stl = document.createElement('style'); stl.id = 'ceV16Opt3EStyle';
    stl.textContent = `
      #summaryTiendaTicket.ce-opt3e-ready{visibility:visible!important;contain:layout paint;}
      #summaryTiendaTicket .ce-opt3e-sortbar{margin-bottom:10px!important;}
      #summaryTiendaTicket .ce-opt3e-sortbar button.active{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important;box-shadow:0 0 0 3px rgba(15,23,42,.12)!important;}
      #summaryTiendaTicket .ce-opt3e-row{cursor:pointer;min-height:44px!important;transition:none!important;will-change:auto!important;}
      #summaryTiendaTicket .ce-opt3e-row.ce-opt3e-donation .pill{text-decoration:line-through;}
      #summaryTiendaTicket .ce-opt3e-row.ce-opt3e-pending .pill{background:#fef2f2!important;color:#b91c1c!important;}
      #summaryTiendaTicket .ce-opt3e-label{display:block;max-width:calc(100% - 130px);white-space:nowrap!important;overflow:hidden;text-overflow:ellipsis;text-align:left!important;font-weight:800;color:#0f172a;}
      #summaryTiendaTicket .ce-opt3e-label i{font-style:normal;color:#2563eb;font-weight:950;margin-left:5px;}
      .ce-opt3e-modal{position:fixed;inset:0;background:rgba(15,23,42,.38);z-index:7200;display:flex;align-items:center;justify-content:center;padding:14px;}
      .ce-opt3e-card{width:min(980px,94vw);max-height:78vh;overflow:auto;background:#fff;border-radius:18px;border:2px solid #0f172a;box-shadow:0 24px 80px rgba(15,23,42,.35);padding:14px;}
      .ce-opt3e-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:8px;}
      .ce-opt3e-head h3{margin:0;font-size:18px;font-weight:950;}.ce-opt3e-head p{margin:4px 0 0;font-weight:850;color:#334155;}.ce-opt3e-head button{border:0;background:#0f172a;color:#fff;border-radius:999px;width:46px;height:46px;font-size:30px;font-weight:950;line-height:1;cursor:pointer;}
      .ce-opt3e-total{display:flex;justify-content:space-between;gap:12px;align-items:center;background:#e0f2fe;border-radius:12px;padding:8px 10px;margin-bottom:8px;font-weight:950;}
      .ce-opt3e-table-wrap{overflow:auto;border:1px solid #dbe4ee;border-radius:12px;}.ce-opt3e-table{border-collapse:separate;border-spacing:0;width:100%;min-width:680px;font-size:13px;}.ce-opt3e-table th,.ce-opt3e-table td{padding:7px 9px;border-bottom:1px solid #e2e8f0;border-right:1px solid #eef2f7;text-align:left;white-space:nowrap;}.ce-opt3e-table th{position:sticky;top:0;background:#f1f5f9;font-weight:950;z-index:1;}.ce-opt3e-table td:nth-last-child(-n+3),.ce-opt3e-table th:nth-last-child(-n+3){text-align:right;}.ce-opt3e-table td:first-child{font-weight:850;}
    `;
    document.head.appendChild(stl);
  }

  function showTable(row){
    document.querySelectorAll('.ce-opt3e-modal,.ce-opt3b-modal,.ce-hf10-modal,.ce-hf9-modal').forEach(x => x.remove());
    const title = row.donated ? 'CÁLCULOS POR DONANTE Y DONACIÓN' : (row.pending ? 'PENDIENTE DE COMPRA U OTROS GASTOS' : 'CÁLCULOS POR TIENDA Y TICKET');
    const heads = row.headers || [];
    const htmlRows = (row.lines || []).map(line => `<tr>${line.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${heads.length || 1}">Sin detalle</td></tr>`;
    const modal = document.createElement('div'); modal.className = 'ce-opt3e-modal';
    modal.innerHTML = `<div class="ce-opt3e-card" role="dialog" aria-modal="true"><div class="ce-opt3e-head"><div><h3>${esc(title)}</h3><p>${esc(row.key)}</p></div><button type="button" class="ce-opt3e-close" aria-label="Cerrar">×</button></div><div class="ce-opt3e-total"><span>${esc(row.donated ? 'TOTAL ESTIMADO' : 'TOTAL')}</span><strong>${esc(money(row.v))}</strong></div><div class="ce-opt3e-table-wrap"><table class="ce-opt3e-table"><thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${htmlRows}</tbody></table></div></div>`;
    modal.addEventListener('click', ev => { if(ev.target === modal || ev.target.closest('.ce-opt3e-close')) modal.remove(); }, true);
    document.body.appendChild(modal);
  }

  let rendering = false;
  let lastRenderAt = 0;
  function renderNow(force){
    const root = $(ROOT_ID);
    if(!root){ return false; }
    if(!readyToWork()){ metrics.blockedBeforeLogin++; return false; }
    if(!force && !isResumenVisible()){ return false; }
    const start = performance.now ? performance.now() : Date.now();
    const light = lightStamp();
    const nowCheap = Date.now();
    // Salida temprana barata: evita recalcular toda la lista si ya está pintada para este evento.
    if(root.dataset.ceOpt3eLightStamp === light && rootLooksOwned(root) && (nowCheap - lastRenderAt) < 12000){
      metrics.lightSkips++;
      return true;
    }
    const rows = rowsForSummary();
    const sig = signature(rows);
    const now = Date.now();
    const hasRows = !!root.querySelector('.ce-opt3e-row,.summary-item:not(.ce-tt-total-evento)');
    const sameSig = root.dataset.ceOpt3eSig === sig;
    const ownedEnough = rootLooksOwned(root);
    // OPT3H: aunque una llamada venga como force=true, si la lista ya corresponde
    // al evento/datos actuales no se vuelve a pintar. Esto corta el segundo/tercer
    // repintado que dejaba el PC trabajando después de que la ventana ya estaba bien.
    if(sameSig && hasRows && ownedEnough){
      metrics.skips++;
      if(force) metrics.skipsForcedSame++;
      return true;
    }
    if(sameSig && hasRows && (now - lastRenderAt) < 2500){
      metrics.skips++;
      if(force) metrics.skipsForcedSame++;
      return true;
    }
    rendering = true;
    root.dataset.ceOpt3eSig = sig;
    root.dataset.ceOpt3eLightStamp = light;
    root.dataset.ceOpt3eEventId = evId();
    root.classList.add('ce-opt3e-ready','ce-hf10-ready');
    const h = Math.round(root.getBoundingClientRect?.().height || root.offsetHeight || 0);
    if(h > 160) root.style.minHeight = h + 'px';
    const mode = stateRef().summaryTiendaSort || 'tienda';
    root.innerHTML = `<div class="hint ce-opt3e-sortbar ce-hf10-sortbar"><span>Ordenar por:</span><button type="button" class="outline small ${mode === 'tienda' ? 'active' : ''}" data-opt3e-sort="tienda">Tienda</button><button type="button" class="outline small ${mode === 'ticket' ? 'active' : ''}" data-opt3e-sort="ticket">Ticket/Donación/Otros gastos</button></div>`;
    if(!rows.length){
      root.insertAdjacentHTML('beforeend','<div class="hint">Sin datos.</div>');
    }else{
      let total = 0;
      const frag = document.createDocumentFragment();
      rows.forEach(row => {
        total += num(row.v);
        const div = document.createElement('div');
        div.className = 'summary-item ce-opt3e-row ce-hf10-row' + (row.pending ? ' red-row ce-opt3e-pending' : '') + (row.donated ? ' ce-opt3e-donation' : '');
        div.dataset.ceOpt3eKey = row.key || '';
        div.dataset.ceHf12Tk = row.rawTicket || '';
        const rowTip = tipForRow(row);
        div.setAttribute('data-ce-tip-v21', rowTip);
        div.setAttribute('data-ce-tip', rowTip);
        div.__ceOpt3eRow = row;
        const encoded = encodeURIComponent(row.key || '');
        const actions = row.attachable ? `<span class="ticket-actions" data-ce-opt3k-ticket-actions="1" data-ce-ticket-key="${esc(row.key || '')}"><button type="button" class="outline small" title="Insertar foto" data-ce-opt3k-upload="1" data-ce-ticket-key="${esc(row.key || '')}">📎</button>${row.image ? `<img class="ticket-thumb" src="${esc(row.image)}" alt="ticket" data-ce-ticket-key="${esc(row.key || '')}" data-ce-hf12-tk="${esc(row.rawTicket || '')}" data-ce-tip-v21="${esc(rowTip)}" />` : '<span class="hint">Sin imagen</span>'}${row.image ? `<button type="button" class="outline small" title="Eliminar foto" data-ce-opt3k-delete="1" data-ce-ticket-key="${esc(row.key || '')}">🗑️</button>` : ''}</span>` : '';
        div.innerHTML = `<span class="ce-opt3e-label ce-hf10-label">${esc(row.key)} <i>ⓘ</i></span><span style="display:flex;align-items:center;gap:8px;justify-content:flex-end;"><span class="pill">${esc(money(row.v))}</span>${actions}</span>`;
        frag.appendChild(div);
      });
      root.appendChild(frag);
      root.insertAdjacentHTML('beforeend', `<div class="summary-item ce-tt-total-evento" style="font-weight:800"><span>TOTAL EVENTO</span><span class="pill">${esc(money(total))}</span></div>`);
    }
    lastRenderAt = Date.now();
    metrics.renders++; metrics.lastSig = sig; metrics.lastEventId = evId(); metrics.lastMs = Math.round((performance.now ? performance.now() : Date.now()) - start);
    setTimeout(() => { try{ if(root.dataset.ceOpt3eEventId === evId()) root.style.minHeight = ''; }catch(_){} }, 160);
    rendering = false;
    return true;
  }

  let timer = 0;
  function schedule(reason, delay, force){
    if(!readyToWork()){ metrics.blockedBeforeLogin++; return; }
    clearTimeout(timer);
    timer = setTimeout(() => { try{ patchRenderSummaryList(); patchRenderBudget(); renderNow(!!force); }catch(err){ console.warn('[v16_opt_3f]', reason, err); } }, delay == null ? 140 : delay);
  }

  let observer = null;
  function rootLooksOwned(root){
    // OPT3H: no dependemos de data-ce-tip-v21, porque la capa de click directo
    // puede limpiar atributos de tooltip. Basta con que exista una lista ce-opt3e
    // del evento actual para considerarla estable y no forzar otro render.
    return !!(root && root.dataset.ceOpt3eSig && root.dataset.ceOpt3eEventId === evId() && root.querySelector('.ce-opt3e-row,.summary-item:not(.ce-tt-total-evento)'));
  }
  function ensureObserver(){
    const root = $(ROOT_ID);
    if(!root || observer) return;
    observer = new MutationObserver(() => {
      if(rendering || !isResumenVisible()) return;
      // Si cualquier capa antigua vuelve a escribir este bloque, lo recuperamos en el siguiente frame.
      const ok = rootLooksOwned(root);
      if(!ok){ metrics.observerFixes++; schedule('mutation-hardlock', 0, true); }
    });
    observer.observe(root, {childList:true});
  }

  function patchRenderSummaryList(){
    let old = null;
    try{ old = window.renderSummaryList || eval('typeof renderSummaryList === "function" ? renderSummaryList : null'); }catch(_){ old = window.renderSummaryList || null; }
    if(!old || old.__ceOpt3FWrapped) return;
    const wrapped = function(targetId){
      if(String(targetId || '') === ROOT_ID && readyToWork()){
        metrics.blockedLegacySummaryRenders++;
        schedule('renderSummaryList-blocked', 0, true);
        return undefined;
      }
      return old.apply(this, arguments);
    };
    wrapped.__ceOpt3FWrapped = true;
    wrapped.__ceOpt3FOld = old;
    try{ window.renderSummaryList = wrapped; renderSummaryList = wrapped; }catch(_){ window.renderSummaryList = wrapped; }
  }

  function patchRenderBudget(){
    let old = null;
    try{ old = window.renderBudget || eval('typeof renderBudget === "function" ? renderBudget : null'); }catch(_){ old = window.renderBudget || null; }
    if(!old || old.__ceOpt3FBudgetWrapped) return;
    const wrapped = function(){
      const root = $(ROOT_ID);
      const sameStable = isResumenVisible() && rootLooksOwned(root) && root?.dataset?.ceOpt3eEventId === evId() && root?.dataset?.ceOpt3eLightStamp === lightStamp();
      const focusShield = Number(window.__ceOpt3KFocusShieldUntil || 0) > Date.now();
      const photoBusyUntil = Number(window.__ceOpt3KPhotoBusyUntil || 0);
      // OPT3K: al volver de otra tarea Windows, renderBudget heredado repintaba el bloque completo
      // aunque los datos no hubieran cambiado. Si el bloque ya es del evento actual, se bloquea
      // ese repintado visual feo y solo se permite cuando hay foto en curso o cambio real.
      if(sameStable && focusShield && photoBusyUntil < Date.now()){
        metrics.budgetStableSkips++;
        schedule('renderBudget-focus-skip', 220, false);
        return undefined;
      }
      const ret = old.apply(this, arguments);
      if(isResumenVisible()) schedule('renderBudget-tail', 180, true);
      return ret;
    };
    wrapped.__ceOpt3FBudgetWrapped = true;
    wrapped.__ceOpt3FOld = old;
    try{ window.renderBudget = wrapped; renderBudget = wrapped; }catch(_){ window.renderBudget = wrapped; }
  }

  function rowFromExistingElement(el){
    if(!el) return null;
    if(el.__ceOpt3eRow) return el.__ceOpt3eRow;
    const labelEl = el.querySelector('.ce-opt3e-label,.ce-hf10-label,:scope > span:first-child') || el.querySelector('span');
    let label = norm(labelEl?.textContent || el.textContent || '');
    label = label.replace(/ⓘ/g,'').replace(/\s+\d{1,3}(?:\.\d{3})*,\d{2}\s*€\s*$/,'').trim();
    const nlabel = up(label);
    if(!nlabel || nlabel === 'TOTAL' || nlabel === 'TOTAL EVENTO') return null;
    const rows = rowsForSummary();
    return rows.find(r => up(r.key) === nlabel) || rows.find(r => nlabel.includes(up(r.key)) || up(r.key).includes(nlabel)) || null;
  }

  function install(){
    injectStyle();
    patchRenderSummaryList();
    patchRenderBudget();
    if(!readyToWork()) return;
    ensureObserver();
    if(isResumenVisible()) schedule('install', 0, true);
  }

  document.addEventListener('click', ev => {
    const sort = ev.target?.closest?.('[data-opt3e-sort]');
    if(sort){
      ev.preventDefault(); ev.stopPropagation();
      try{ stateRef().summaryTiendaSort = sort.getAttribute('data-opt3e-sort') || 'tienda'; }catch(_){ }
      renderNow(true); return;
    }
    const rowEl = ev.target?.closest?.('#summaryTiendaTicket .ce-opt3e-row,#summaryTiendaTicket .summary-item');
    if(rowEl && !ev.target.closest('button,input,select,a,img')){
      const row = rowFromExistingElement(rowEl);
      if(row){ metrics.fallbackClicks += rowEl.__ceOpt3eRow ? 0 : 1; ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); showTable(row); }
    }
  }, true);
  window.addEventListener('keydown', ev => { if(ev.key === 'Escape') document.querySelectorAll('.ce-opt3e-modal').forEach(m => m.remove()); }, true);

  window.ControlEventOpt3F = Object.assign(metrics, {install, renderNow, rowsForSummary, patchRenderSummaryList, patchRenderBudget, clearCaches});
  injectStyle();
  patchRenderSummaryList();
  patchRenderBudget();
  ['controlevent:app-ready','controlevent:runtime-ready','controlevent:data-loaded','controlevent:event-ready','controlevent:opt1-event-stable','controlevent:event-changed','controlevent:module-mounted'].forEach(e => window.addEventListener(e, () => setTimeout(install, 140), true));
  document.addEventListener('click', ev => { if(ev.target?.closest?.('#tabResumenBtn,.mobile-menu-action[data-target="tabResumenBtn"]')) setTimeout(install, 120); }, true);
  document.addEventListener('DOMContentLoaded', () => setTimeout(install, 120), {once:true});
  window.addEventListener('load', () => setTimeout(install, 160), {once:true});
})();

/* ControlEvent v16_prod OPT3G - Clic directo en donaciones de Resumen.
   No repinta Resumen. No toca login, selector, /api/state, graficas, tickets ni avance.
   Objetivo: las filas DONADO TIENDA/SOCIO/OTROS abren detalle desde el primer momento,
   igual que las filas TKxx, aunque entren renders antiguos o tardios. */
(function(){
  'use strict';
  if(window.__ceV16Opt3GDonacionesDirectas) return;
  window.__ceV16Opt3GDonacionesDirectas = true;

  const VERSION = 'v16_opt_3g';
  const ROOT_ID = 'summaryTiendaTicket';
  const MODAL_CLASS = 'ce-opt3g-modal';
  const DON_CODES = ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'];
  const LEGACY_TIP_ATTRS = ['data-ce-tip','data-ce-tip-v21','data-tooltip','data-tooltip-html','title'];

  const $ = id => document.getElementById(id);
  const norm = v => String(v == null ? '' : v).trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const arr = v => Array.isArray(v) ? v : [];
  const num = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = norm(v).replace(/\./g,'').replace(',', '.').replace(/[^0-9.-]/g,'');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stateRef = () => { try{ return window.ControlEventApp?.state || window.state || (typeof state !== 'undefined' ? state : {}) || {}; }catch(_){ return {}; } };
  const evId = () => norm(stateRef().selectedEventId || $('selectedEvent')?.value || '');
  const isLoginVisible = () => {
    const ov = $('authOverlay');
    if(!ov || ov.classList.contains('hidden') || ov.hasAttribute('hidden')) return false;
    try{ const cs = getComputedStyle(ov); return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) !== 0; }catch(_){ return true; }
  };
  const ready = () => !isLoginVisible() && !!evId();
  const money = v => { try{ if(typeof window.money === 'function') return window.money(num(v)); }catch(_){} return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v)); };
  const nfmt = v => { try{ return new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(num(v)); }catch(_){ return String(v || 0); } };

  const metrics = window.ControlEventOpt3G = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    donationOpens: 0,
    rowsTagged: 0,
    legacyAttrsRemoved: 0,
    noMatch: 0,
    lastKey: '',
    lastEventId: ''
  };

  function byId(listName, id){
    const list = arr(stateRef()[listName]);
    return list.find(x => norm(x && x.id) === norm(id)) || {};
  }
  function productName(c){ return c?.producto?.nombre || byId('productos', c?.productoId)?.nombre || c?.productName || c?.nombreProducto || c?.producto || 'Producto'; }
  function personName(id){ return byId('personas', id)?.nombre || ''; }
  function tiendaName(id){ return byId('tiendas', id)?.nombre || ''; }
  function donorName(c){
    const ref = norm(c?.donorRef || c?.donanteRef || c?.donante || c?.responsable || c?.donanteNombre || c?.donorName);
    if(ref.startsWith('P:')) return personName(ref.slice(2)) || 'Sin donante';
    if(ref.startsWith('T:')) return tiendaName(ref.slice(2)) || 'Sin donante';
    if(c?.personaId) return personName(c.personaId) || ref || 'Sin donante';
    if(c?.tiendaDonanteId) return tiendaName(c.tiendaDonanteId) || ref || 'Sin donante';
    if(c?.tiendaId && up(c?.ticketDonacion || c?.ticket || '').includes('TIENDA')) return tiendaName(c.tiendaId) || ref || 'Sin donante';
    return ref || 'Sin donante';
  }
  function units(c){ return num(c?.unidades ?? c?.uds ?? c?.cantidad); }
  function price(c){ return num(c?.precio ?? c?.precioUnitario ?? c?.precioReferencia ?? byId('productos', c?.productoId)?.defaultPrecio); }
  function value(c){
    const explicit = c?.importe ?? c?.total ?? c?.valor;
    if(explicit !== undefined && explicit !== null && explicit !== '') return num(explicit);
    return units(c) * price(c);
  }
  function rowEventId(c){ return norm(c?.eventId || c?.eventoId || c?.idEvento || ''); }
  function donationCode(c){
    const t = up(c?.ticketDonacion || c?.ticket || c?.tk || c?.tipoTicket || c?.donacion || '');
    return DON_CODES.find(code => t === code || t.includes(code)) || '';
  }
  function eventPurchases(){
    const selected = evId();
    return arr(stateRef().compras).filter(c => !selected || !rowEventId(c) || rowEventId(c) === selected);
  }

  function labelFromRow(row){
    if(!row) return '';
    const labelEl = row.querySelector('.ce-opt3e-label,.ce-hf10-label,:scope > span:first-child') || row.querySelector('span');
    let text = norm(labelEl?.textContent || row.textContent || '');
    text = text.replace(/ⓘ/g,'').replace(/\s+\d{1,3}(?:\.\d{3})*,\d{2}\s*€\s*$/,'').replace(/\s+Sin imagen\s*$/i,'').trim();
    return text;
  }
  function donationInfoFromLabel(label){
    const text = norm(label);
    const n = up(text);
    const code = DON_CODES.find(c => n.includes(c));
    if(!code) return null;
    const before = norm(text.split('|')[0] || '');
    if(!before || up(before) === 'TOTAL' || up(before) === 'TOTAL EVENTO') return null;
    return {key: `${before} | ${code}`, donor: before, code};
  }
  function rowFromTarget(target){
    if(!target || !target.closest) return null;
    const row = target.closest(`#${ROOT_ID} .summary-item,#${ROOT_ID} .ce-opt3e-row,#${ROOT_ID} .rowline,#${ROOT_ID} [data-ce-opt3e-key]`);
    if(!row || row.classList.contains('ce-tt-total-evento')) return null;
    const info = donationInfoFromLabel(labelFromRow(row));
    return info ? {row, info} : null;
  }
  function linesFor(info){
    const code = up(info.code);
    const donor = up(info.donor);
    const rows = eventPurchases().filter(c => {
      if(donationCode(c) !== code) return false;
      const dn = up(donorName(c));
      return dn === donor || dn.includes(donor) || donor.includes(dn);
    });
    return rows.map(c => ({
      donor: donorName(c),
      product: productName(c),
      units: units(c),
      price: price(c),
      value: value(c)
    }));
  }

  function injectStyle(){
    if($('ceOpt3GStyle')) return;
    const st = document.createElement('style');
    st.id = 'ceOpt3GStyle';
    st.textContent = `
      #summaryTiendaTicket .ce-opt3g-donation-direct{cursor:pointer!important;}
      #summaryTiendaTicket .ce-opt3g-donation-direct .pill{text-decoration:line-through!important;}
      .ce-opt3g-modal{position:fixed;inset:0;z-index:7600;background:rgba(15,23,42,.40);display:flex;align-items:center;justify-content:center;padding:14px;}
      .ce-opt3g-card{width:min(980px,94vw);max-height:78vh;overflow:auto;background:#fff;border:2px solid #0f172a;border-radius:18px;box-shadow:0 24px 80px rgba(15,23,42,.35);padding:14px;}
      .ce-opt3g-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid #e2e8f0;margin-bottom:8px;padding-bottom:8px;}
      .ce-opt3g-head h3{margin:0;font-size:18px;font-weight:950;color:#0f172a;}.ce-opt3g-head p{margin:4px 0 0;font-weight:850;color:#334155;}.ce-opt3g-close{border:0;background:#0f172a;color:#fff;border-radius:999px;width:46px;height:46px;font-size:30px;font-weight:950;line-height:1;cursor:pointer;}
      .ce-opt3g-total{display:flex;justify-content:space-between;gap:12px;align-items:center;background:#e0f2fe;border-radius:12px;padding:8px 10px;margin-bottom:8px;font-weight:950;}
      .ce-opt3g-table-wrap{overflow:auto;border:1px solid #dbe4ee;border-radius:12px;}.ce-opt3g-table{border-collapse:separate;border-spacing:0;width:100%;min-width:680px;font-size:13px;}.ce-opt3g-table th,.ce-opt3g-table td{padding:7px 9px;border-bottom:1px solid #e2e8f0;border-right:1px solid #eef2f7;text-align:left;white-space:nowrap;}.ce-opt3g-table th{position:sticky;top:0;background:#f1f5f9;font-weight:950;z-index:1;}.ce-opt3g-table td:nth-child(n+3),.ce-opt3g-table th:nth-child(n+3){text-align:right;}.ce-opt3g-table td:first-child{font-weight:850;}
    `;
    document.head.appendChild(st);
  }

  function closeModals(){ document.querySelectorAll('.ce-opt3g-modal,.ce-opt3e-modal,.ce-opt3b-modal,.ce-hf10-modal,.ce-hf9-modal').forEach(x => x.remove()); }
  function showDonation(info){
    const lines = linesFor(info);
    metrics.donationOpens++; metrics.lastKey = info.key; metrics.lastEventId = evId();
    if(!lines.length) metrics.noMatch++;
    const total = lines.reduce((sum, l) => sum + num(l.value), 0);
    const body = lines.length ? lines.map(l => `<tr><td>${esc(l.donor)}</td><td>${esc(l.product)}</td><td>${esc(nfmt(l.units))}</td><td>${esc(money(l.price))}</td><td>${esc(money(l.value))}</td></tr>`).join('') : '<tr><td colspan="5">Sin detalle encontrado para esta donación.</td></tr>';
    closeModals();
    const modal = document.createElement('div'); modal.className = MODAL_CLASS;
    modal.innerHTML = `<div class="ce-opt3g-card" role="dialog" aria-modal="true"><div class="ce-opt3g-head"><div><h3>CÁLCULOS POR DONANTE Y DONACIÓN</h3><p>${esc(info.key)}</p></div><button type="button" class="ce-opt3g-close" aria-label="Cerrar">×</button></div><div class="ce-opt3g-total"><span>TOTAL ESTIMADO</span><strong>${esc(money(total))}</strong></div><div class="ce-opt3g-table-wrap"><table class="ce-opt3g-table"><thead><tr><th>Donante</th><th>Producto</th><th>Uds</th><th>Precio estimado</th><th>Valor estimado</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
    modal.addEventListener('click', ev => { if(ev.target === modal || ev.target.closest('.ce-opt3g-close')) modal.remove(); }, true);
    document.body.appendChild(modal);
  }
  function stop(ev){ try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); }catch(_){} }
  function handleEvent(ev){
    if(!ready()) return;
    if(ev.target?.closest?.(`.${MODAL_CLASS},button,input,select,textarea,a,img,.ticket-actions`)) return;
    const found = rowFromTarget(ev.target);
    if(!found) return;
    stop(ev);
    showDonation(found.info);
    return false;
  }

  let markTimer = 0;
  function stripLegacyTips(el){
    if(!el) return;
    LEGACY_TIP_ATTRS.forEach(attr => { try{ if(el.hasAttribute?.(attr)){ el.removeAttribute(attr); metrics.legacyAttrsRemoved++; } }catch(_){} });
    try{ el.querySelectorAll?.('[data-ce-tip],[data-ce-tip-v21],[data-tooltip],[data-tooltip-html],[title]').forEach(child => LEGACY_TIP_ATTRS.forEach(attr => { if(child.hasAttribute(attr)){ child.removeAttribute(attr); metrics.legacyAttrsRemoved++; } })); }catch(_){}
  }
  function markRows(){
    const root = $(ROOT_ID); if(!root) return;
    root.querySelectorAll('.summary-item,.ce-opt3e-row,.rowline,[data-ce-opt3e-key]').forEach(row => {
      const info = donationInfoFromLabel(labelFromRow(row));
      if(!info) return;
      row.classList.add('ce-opt3g-donation-direct');
      row.dataset.ceOpt3gDonationKey = info.key;
      stripLegacyTips(row);
      metrics.rowsTagged++;
    });
  }
  function scheduleMark(){ clearTimeout(markTimer); markTimer = setTimeout(markRows, 0); }

  function installObserver(){
    try{
      const root = $(ROOT_ID); if(!root || root.__ceOpt3GObserved) return;
      root.__ceOpt3GObserved = true;
      const obs = new MutationObserver(scheduleMark);
      obs.observe(root, {childList:true, subtree:true});
      scheduleMark();
    }catch(_){ }
  }
  function install(){ injectStyle(); installObserver(); markRows(); }

  // Ventana en captura: se ejecuta antes que los listeners antiguos colocados en document.
  ['pointerup','click','touchend'].forEach(type => window.addEventListener(type, handleEvent, {capture:true, passive:false}));
  window.addEventListener('keydown', ev => { if(ev.key === 'Escape') closeModals(); }, true);
  ['controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:module-mounted','controlevent:event-changed','controlevent:opt1-event-stable'].forEach(type => window.addEventListener(type, () => setTimeout(install, 40), true));
  document.addEventListener('DOMContentLoaded', () => setTimeout(install, 120), {once:true});
  window.addEventListener('load', () => setTimeout(install, 160), {once:true});
  setTimeout(install, 100);
  window.ControlEventOpt3G = Object.assign(metrics, {install, markRows, linesFor, showDonation});
})();

/* ControlEvent v17_prod - Parche quirurgico COMPRAS: TK01..TK50 + tickets usados en verde.
   No cambia version ni toca la logica de guardado/carga. */
(function(){
  'use strict';

  const PURCHASE_VALUES = ['','GASTOS CORRIENTES', ...Array.from({length:50}, (_,i)=>'TK'+String(i+1).padStart(2,'0'))];
  const ALL_VALUES = ['','DONADO TIENDA','DONADO SOCIO','DONADO OTROS', ...PURCHASE_VALUES.slice(1)];
  const USED_STYLE = 'background:#dcfce7;color:#166534;font-weight:700;';

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function norm(value){ return String(value ?? '').trim(); }
  function normUp(value){ return norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(); }
  function isDonation(value){
    try{ if(typeof isDonationTicket === 'function') return !!isDonationTicket(value); }catch(_){ }
    return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(normUp(value));
  }
  function stateRef(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    try{ if(window.ControlEventApp && window.ControlEventApp.state) return window.ControlEventApp.state; }catch(_){ }
    return window.state || {};
  }
  function selectedEventId(){
    try{ if(typeof selectedEvent === 'function'){ const ev = selectedEvent(); if(ev && ev.id) return String(ev.id); } }catch(_){ }
    const st = stateRef();
    return String(st.selectedEventId || document.getElementById('selectedEvent')?.value || '');
  }
  function ensureTk50Constants(){
    try{
      if(typeof PURCHASE_TICKET_OPTIONS !== 'undefined' && Array.isArray(PURCHASE_TICKET_OPTIONS)){
        PURCHASE_TICKET_OPTIONS.splice(0, PURCHASE_TICKET_OPTIONS.length, ...PURCHASE_VALUES);
      }
    }catch(_){ }
    try{
      if(typeof ALL_TICKET_OPTIONS !== 'undefined' && Array.isArray(ALL_TICKET_OPTIONS)){
        ALL_TICKET_OPTIONS.splice(0, ALL_TICKET_OPTIONS.length, ...ALL_VALUES);
      }
    }catch(_){ }
  }
  function purchaseRowsForCurrentEvent(){
    const st = stateRef();
    const evId = selectedEventId();
    return (Array.isArray(st.compras) ? st.compras : [])
      .filter(row => String(row?.eventId || '') === evId)
      .filter(row => !isDonation(row?.ticketDonacion));
  }
  function usedPurchaseTickets(){
    const used = new Set();
    purchaseRowsForCurrentEvent().forEach(row => {
      const ticket = norm(row?.ticketDonacion);
      if(ticket) used.add(ticket);
    });
    return used;
  }
  function optionHtml(value, selectedValue, used){
    const label = value === '' ? '-- Pte.Compra u otros gastos --' : value;
    const isUsed = value !== '' && used.has(value);
    return '<option value="' + esc(value) + '"'
      + (String(value) === String(selectedValue || '') ? ' selected' : '')
      + (isUsed ? ' class="ce-used-ticket-option" style="' + USED_STYLE + '" title="Ya utilizado en este evento"' : '')
      + '>' + esc(label) + (isUsed ? ' ✓' : '') + '</option>';
  }
  function valuesIncludingCurrent(current){
    const values = PURCHASE_VALUES.slice();
    const cur = norm(current);
    if(cur && !values.includes(cur)) values.push(cur);
    return values;
  }
  function fillPurchaseTicketSelect(select, used){
    if(!select) return;
    const current = select.value || select.getAttribute('data-ce-ticket-value') || '';
    select.setAttribute('data-ce-ticket-value', current);
    select.innerHTML = valuesIncludingCurrent(current).map(v => optionHtml(v, current, used)).join('');
    select.value = current;
    select.dataset.ceTk50Patched = '1';
  }
  function refreshPurchaseTicketSelects(){
    ensureTk50Constants();
    const used = usedPurchaseTickets();
    fillPurchaseTicketSelect(document.getElementById('buyTicket'), used);
    document.querySelectorAll('#comprasList select[data-action="edit-compra-ticket"]').forEach(sel => fillPurchaseTicketSelect(sel, used));
  }
  function scheduleRefresh(){
    setTimeout(refreshPurchaseTicketSelects, 0);
    setTimeout(refreshPurchaseTicketSelects, 120);
    setTimeout(refreshPurchaseTicketSelects, 420);
  }
  function wrapFunction(fn, assign){
    if(typeof fn !== 'function' || fn.__ceTk50Wrapped) return;
    const wrapped = function(){
      const ret = fn.apply(this, arguments);
      scheduleRefresh();
      return ret;
    };
    wrapped.__ceTk50Wrapped = true;
    assign(wrapped);
  }
  try{ if(typeof render === 'function') wrapFunction(render, v => { render = v; window.render = v; }); }catch(_){ }
  try{ if(typeof renderMainSelectors === 'function') wrapFunction(renderMainSelectors, v => { renderMainSelectors = v; window.renderMainSelectors = v; }); }catch(_){ }
  try{ if(typeof renderCompras === 'function') wrapFunction(renderCompras, v => { renderCompras = v; window.renderCompras = v; }); }catch(_){ }
  try{ if(typeof changeSelectedEvent === 'function') wrapFunction(changeSelectedEvent, v => { changeSelectedEvent = v; window.changeSelectedEvent = v; }); }catch(_){ }

  document.addEventListener('mousedown', function(ev){
    const sel = ev.target?.closest?.('#buyTicket, #comprasList select[data-action="edit-compra-ticket"]');
    if(sel) refreshPurchaseTicketSelects();
  }, true);
  document.addEventListener('touchstart', function(ev){
    const sel = ev.target?.closest?.('#buyTicket, #comprasList select[data-action="edit-compra-ticket"]');
    if(sel) refreshPurchaseTicketSelects();
  }, true);
  document.addEventListener('focusin', function(ev){
    const sel = ev.target?.closest?.('#buyTicket, #comprasList select[data-action="edit-compra-ticket"]');
    if(sel) refreshPurchaseTicketSelects();
  }, true);
  document.addEventListener('change', function(ev){
    const sel = ev.target?.closest?.('#buyTicket, #comprasList select[data-action="edit-compra-ticket"]');
    if(sel){
      sel.setAttribute('data-ce-ticket-value', sel.value || '');
      scheduleRefresh();
    }
  }, true);

  window.addEventListener('controlevent:app-ready', scheduleRefresh, true);
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, scheduleRefresh, true));
  ensureTk50Constants();
  scheduleRefresh();
})();

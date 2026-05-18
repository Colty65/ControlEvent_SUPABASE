/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #9. */
/* ==== V15.0 FILTRO TKxx EN AGR.TIENDA-TICKET ==== */
(function(){
  const prevSummaryByTiendaTicket = typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket : null;

  function isTKTicketLabel(label){
    return /^TK\d+/i.test(String(label || '').trim());
  }

  summaryByTiendaTicket = function(){
    const rows = prevSummaryByTiendaTicket ? prevSummaryByTiendaTicket() : [];
    return rows.filter(r => {
      const parts = String(r.k || '').split(' | ');
      const ticket = (parts[1] || '').trim();
      return isTKTicketLabel(ticket);
    });
  };

  window.addEventListener('load', () => {
    try{
      if(typeof renderBudget === 'function') renderBudget();
    }catch(_){}
  });
})();

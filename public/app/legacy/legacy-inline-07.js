/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #7. */
/* ==== V14.4 CORRECCIÓN FINAL AGRUPACIÓN TIENDA/TICKET ==== */
(function(){
  function holderNameForRow(c){
    try{
      const donated = (typeof isDonationTicket === 'function') ? isDonationTicket(c.ticketDonacion) : false;
      if(donated){
        if(c?.donorLabel) return c.donorLabel;
        if(typeof donorLabel === 'function' && c?.donorRef){
          const d = donorLabel(c.donorRef);
          if(d) return d;
        }
      }
      if(typeof tiendaById === 'function' && c?.tiendaId){
        const t = tiendaById(c.tiendaId);
        if(t?.nombre) return t.nombre;
      }
      if(c?.tienda?.nombre) return c.tienda.nombre;
    }catch(_){}
    return '';
  }

  // Restaurar la lógica buena de v13.2 y solo cambiar "holder" para donaciones
  summaryByTiendaTicket = function(){
    const filled = {};
    const pending = {};

    comprasForEvent().forEach(c => {
      const holder = holderNameForRow(c) || 'Sin tienda';
      const rawTicket = String(c.ticketDonacion || '').trim();
      const productName = String(c.producto?.nombre || '').trim();
      const displayTicket = (Number(c.valor || 0) === 0 && productName)
        ? productName
        : (rawTicket || 'Pte.Compra u otros gastos');
      const key = `${holder} | ${displayTicket}`;

      if(rawTicket === ''){
        pending[key] = (pending[key] || 0) + Number(c.valor || 0);
      } else {
        const donated = (typeof isDonationTicket === 'function') ? isDonationTicket(c.ticketDonacion) : false;
        if(!filled[key]) filled[key] = {v:0, donated, rawTicket, holder};
        filled[key].v += Number(c.valor || 0);
        filled[key].donated = filled[key].donated || donated;
      }
    });

    const rows = Object.entries(filled).map(([k,obj])=>({
      k,
      v:obj.v,
      pending:false,
      donated:obj.donated,
      image:(!obj.donated && obj.v>0 && state.ticketImages?.[ticketImageStateKey(k)])
        ? state.ticketImages[ticketImageStateKey(k)]
        : ''
    })).concat(
      Object.entries(pending).map(([k,v])=>({
        k, v, pending:true, donated:false, image:''
      }))
    );

    const sortMode = state.summaryTiendaSort || 'tienda';
    rows.sort((a,b)=>{
      const [ta='',tk=''] = a.k.split(' | ');
      const [tb='',tl=''] = b.k.split(' | ');
      if(sortMode === 'ticket'){
        const s1 = tk.localeCompare(tl,'es');
        if(s1 !== 0) return s1;
        return ta.localeCompare(tb,'es');
      }
      const s1 = ta.localeCompare(tb,'es');
      if(s1 !== 0) return s1;
      return tk.localeCompare(tl,'es');
    });
    return rows;
  };

  window.addEventListener('load', () => {
    try{
      if(typeof renderBudget === 'function') renderBudget();
    }catch(_){}
  });
})();

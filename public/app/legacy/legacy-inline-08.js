/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #8. */
/* ==== V14.4 CORRECCIÓN 2 DONANTE REAL EN AGRUPACIÓN ==== */
(function(){
  function holderNameForRowV2(c){
    try{
      const donated = (typeof isDonationTicket === 'function') ? isDonationTicket(c.ticketDonacion) : false;

      if(donated){
        if(c?.donorLabel && String(c.donorLabel).trim()) return String(c.donorLabel).trim();

        if(c?.donorRef && String(c.donorRef).trim()){
          const raw = String(c.donorRef).trim();

          // Si viene ya grabado como texto libre, usarlo tal cual
          if(!raw.startsWith('P:') && !raw.startsWith('T:')) return raw;

          if(typeof donorLabel === 'function'){
            const resolved = donorLabel(raw);
            if(resolved && String(resolved).trim()) return String(resolved).trim();
          }
        }

        // Compatibilidad con datos antiguos donde el donante quedó en tiendaId
        if(c?.tiendaId && typeof tiendaById === 'function'){
          const t = tiendaById(c.tiendaId);
          if(t?.nombre && String(t.nombre).trim()) return String(t.nombre).trim();
        }
      }

      if(c?.tienda?.nombre && String(c.tienda.nombre).trim()) return String(c.tienda.nombre).trim();

      if(c?.tiendaId && typeof tiendaById === 'function'){
        const t = tiendaById(c.tiendaId);
        if(t?.nombre && String(t.nombre).trim()) return String(t.nombre).trim();
      }
    }catch(_){}
    return '';
  }

  summaryByTiendaTicket = function(){
    const filled = {};
    const pending = {};

    comprasForEvent().forEach(c => {
      const holder = holderNameForRowV2(c) || 'Sin tienda';
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
      k, v:obj.v, pending:false, donated:obj.donated,
      image:(!obj.donated && obj.v>0 && state.ticketImages?.[ticketImageStateKey(k)]) ? state.ticketImages[ticketImageStateKey(k)] : ''
    })).concat(
      Object.entries(pending).map(([k,v])=>({k,v,pending:true,donated:false,image:''}))
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

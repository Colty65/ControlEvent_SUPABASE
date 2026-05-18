/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #6. */
/* ==== V14.4 FIX AGRUPACIÓN TIENDA/TICKET/DONACIÓN ==== */
(function(){
  function donorGroupingName(c){
    try{
      if(c?.donorLabel) return c.donorLabel;
      if(typeof donorLabel === 'function' && c?.donorRef){
        const d = donorLabel(c.donorRef);
        if(d) return d;
      }
      if(typeof tiendaById === 'function' && c?.tiendaId){
        const t = tiendaById(c.tiendaId);
        if(t?.nombre) return t.nombre;
      }
      if(c?.tienda?.nombre) return c.tienda.nombre;
    }catch(_){}
    return '';
  }

  summaryByTiendaTicket = function(){
    const filled = {};
    const pending = {};

    comprasForEvent().forEach(c => {
      const donated = isDonationTicket(c.ticketDonacion);
      const holder = donated
        ? (donorGroupingName(c) || 'Sin Tienda')
        : (c.tienda?.nombre || 'Sin Tienda');

      const rawTicket = String(c.ticketDonacion || '').trim();
      const productName = String(c.producto?.nombre || '').trim();
      const key = `${holder} | ${rawTicket || 'Pte.Compra u otros gastos'}`;

      if(rawTicket === ''){
        pending[key] = (pending[key] || 0) + Number(c.valor || 0);
        return;
      }

      if(!filled[key]){
        filled[key] = {
          v: 0,
          donated,
          rawTicket,
          holder,
          products: []
        };
      }

      filled[key].v += Number(c.valor || 0);
      filled[key].donated = filled[key].donated || donated;

      if(donated && productName && !filled[key].products.includes(productName)){
        filled[key].products.push(productName);
      }
    });

    const rows = Object.entries(filled).map(([k,obj]) => {
      const label = obj.donated && obj.products.length
        ? `${k} · ${obj.products.join(' · ')}`
        : k;

      return {
        k,
        label,
        v: obj.v,
        pending: false,
        donated: obj.donated,
        attachable: !obj.donated && obj.rawTicket !== 'GASTOS CORRIENTES',
        image: (!obj.donated && obj.rawTicket !== 'GASTOS CORRIENTES' && obj.v > 0 && state.ticketImages?.[ticketImageStateKey(k)])
          ? state.ticketImages[ticketImageStateKey(k)]
          : ''
      };
    }).concat(
      Object.entries(pending).map(([k,v]) => ({
        k,
        label: k,
        v,
        pending: true,
        donated: false,
        attachable: false,
        image: ''
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

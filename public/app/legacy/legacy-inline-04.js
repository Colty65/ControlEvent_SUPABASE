/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #4. */
/* ==== FIX V14.3 DONACIONES EN POR TIENDA/TICKET ==== */
(function(){
  const donorNameFromRow = (c) => {
    try{
      const byDonorRef = (typeof donorLabel === 'function') ? donorLabel(c?.donorRef || '') : '';
      if(byDonorRef) return byDonorRef;
    }catch(_){}
    try{
      const byStore = (typeof tiendaById === 'function') ? (tiendaById(c?.tiendaId || '')?.nombre || '') : '';
      if(byStore) return byStore;
    }catch(_){}
    try{
      if(c?.tienda?.nombre) return c.tienda.nombre;
    }catch(_){}
    return '';
  };

  // 1) ComprasForEvent: para donaciones, si donorRef no existe pero hay tiendaId legado, usarlo.
  const prevComprasForEvent = (typeof comprasForEvent === 'function') ? comprasForEvent : null;
  if(prevComprasForEvent){
    comprasForEvent = function(){
      return state.compras
        .filter(c => c.eventId === state.selectedEventId)
        .map(c => {
          const productoBase = typeof productoById === 'function' ? (productoById(c.productoId) || {}) : {};
          const precio = Number(c.precio != null ? c.precio : ((productoBase.defaultPrecio ?? productoBase.precio) || 0));
          const unidades = Number(c.unidades || 0);
          const valor = precio * unidades;
          const donation = (typeof isDonationTicket === 'function') ? isDonationTicket(c.ticketDonacion) : false;
          const importe = donation ? 0 : valor;

          let tiendaObj;
          if(donation){
            const donorName = donorNameFromRow(c);
            tiendaObj = { id: c.donorRef || c.tiendaId || '', nombre: donorName };
          }else{
            tiendaObj = (typeof tiendaById === 'function' ? tiendaById(c.tiendaId || '') : null) || {id:'', nombre:''};
          }

          return {
            ...c,
            producto: {...productoBase, precio},
            tienda: tiendaObj,
            valor,
            importe,
            responsable: typeof personaById === 'function' ? personaById(c.responsableId || '') : null,
            donorLabel: donorNameFromRow(c)
          };
        });
    };
  }

  // 2) Resumen "Por tienda y Ticket": usar donante/tienda real en donaciones.
  summaryByTiendaTicket = function(){
    const filled = {};
    const pending = {};
    comprasForEvent().forEach(c => {
      const rawTicket = String(c.ticketDonacion || '').trim();
      const productName = String(c.producto?.nombre || '').trim();
      const donation = (typeof isDonationTicket === 'function') ? isDonationTicket(rawTicket) : false;

      let fuente = '';
      if(donation){
        fuente = c.donorLabel || donorNameFromRow(c);
      }else{
        fuente = c.tienda?.nombre || '';
      }
      const tienda = fuente || 'Sin Tienda';

      if(rawTicket === ''){
        const key = `${tienda} | Pte.Compra u otros gastos`;
        pending[key] = (pending[key] || 0) + Number(c.valor || 0);
        return;
      }

      const ticketLabel = rawTicket;
      const key = `${tienda} | ${ticketLabel}`;

      if(!filled[key]){
        filled[key] = {
          v: 0,
          donated: donation,
          rawTicket,
          products: []
        };
      }

      filled[key].v += Number(c.valor || 0);
      filled[key].donated = filled[key].donated || donation;
      if(donation && productName && !filled[key].products.includes(productName)){
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
        image: (!obj.donated && obj.rawTicket !== 'GASTOS CORRIENTES' && obj.v > 0 && state.ticketImages?.[ticketImageStateKey(k)]) ? state.ticketImages[ticketImageStateKey(k)] : ''
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
        const c1 = tk.localeCompare(tl, 'es');
        return c1 !== 0 ? c1 : ta.localeCompare(tb, 'es');
      }
      const c2 = ta.localeCompare(tb, 'es');
      return c2 !== 0 ? c2 : tk.localeCompare(tl, 'es');
    });
    return rows;
  };

  // refresco inmediato si el resumen está visible
  const rerenderResumen = () => {
    try{
      if(typeof renderBudget === 'function') renderBudget();
    }catch(_){}
  };
  window.addEventListener('load', () => setTimeout(rerenderResumen, 0));
})();

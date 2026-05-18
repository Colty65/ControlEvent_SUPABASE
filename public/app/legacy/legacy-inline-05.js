/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #5. */
/* ==== FIX V14.3 RESUMEN DONACIONES POR DONANTE ==== */
(function(){
  const donorNameFromAny = (c) => {
    try{
      if (c?.donorLabel) return c.donorLabel;
      if (typeof donorLabel === 'function' && c?.donorRef) {
        const d = donorLabel(c.donorRef);
        if (d) return d;
      }
      if (typeof tiendaById === 'function' && c?.tiendaId) {
        const t = tiendaById(c.tiendaId);
        if (t?.nombre) return t.nombre;
      }
      if (c?.tienda?.nombre) return c.tienda.nombre;
    }catch(_){}
    return '';
  };

  summaryByTiendaTicket = function(){
    const rows = [];
    const pendingMap = {};
    const normalMap = {};

    comprasForEvent().forEach(c => {
      const rawTicket = String(c.ticketDonacion || '').trim();
      const productName = String(c.producto?.nombre || '').trim() || 'Producto';
      const donation = (typeof isDonationTicket === 'function') ? isDonationTicket(rawTicket) : false;

      let fuente = '';
      if(donation){
        fuente = donorNameFromAny(c);
      }else{
        fuente = c.tienda?.nombre || '';
      }
      const tienda = fuente || 'Sin Tienda';

      if(rawTicket === ''){
        const key = `${tienda} | Pte.Compra u otros gastos`;
        pendingMap[key] = (pendingMap[key] || 0) + Number(c.valor || 0);
        return;
      }

      if(donation){
        // Una línea por donación realizada, evitando la megacadena de productos.
        const key = `${tienda} | ${rawTicket} | ${productName} | ${c.id}`;
        rows.push({
          k: key,
          label: `${tienda} | ${rawTicket} | ${productName}`,
          v: Number(c.valor || 0),
          pending: false,
          donated: true,
          attachable: false,
          image: ''
        });
        return;
      }

      // Compras / gastos corrientes agrupados por tienda + ticket
      const key = `${tienda} | ${rawTicket}`;
      if(!normalMap[key]){
        normalMap[key] = {
          k: key,
          label: key,
          v: 0,
          pending: false,
          donated: false,
          rawTicket,
          attachable: rawTicket !== 'GASTOS CORRIENTES',
          image: ''
        };
      }
      normalMap[key].v += Number(c.valor || 0);
      if(normalMap[key].attachable && state.ticketImages?.[ticketImageStateKey(key)]){
        normalMap[key].image = state.ticketImages[ticketImageStateKey(key)];
      }
    });

    const merged = rows
      .concat(Object.values(normalMap))
      .concat(Object.entries(pendingMap).map(([k,v]) => ({
        k,
        label: k,
        v,
        pending: true,
        donated: false,
        attachable: false,
        image: ''
      })));

    const sortMode = state.summaryTiendaSort || 'tienda';
    merged.sort((a,b)=>{
      const pa = String(a.label || a.k).split(' | ');
      const pb = String(b.label || b.k).split(' | ');
      const ta = pa[0] || '';
      const tb = pb[0] || '';
      const ka = pa[1] || '';
      const kb = pb[1] || '';
      if(sortMode === 'ticket'){
        const c1 = ka.localeCompare(kb, 'es');
        return c1 !== 0 ? c1 : ta.localeCompare(tb, 'es');
      }
      const c2 = ta.localeCompare(tb, 'es');
      return c2 !== 0 ? c2 : ka.localeCompare(kb, 'es');
    });

    return merged;
  };

  window.addEventListener('load', () => {
    try{
      if(typeof renderBudget === 'function') renderBudget();
    }catch(_){}
  });
})();

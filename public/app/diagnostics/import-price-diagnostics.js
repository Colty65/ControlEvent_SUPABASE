/* ControlEvent v1.0.1/pr - Diagnóstico precio referencia PRODUCTOS tras importar BACKUP */
(function(){
  const VERSION = 'v30.7';
  const num = v => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').replace(/[^0-9,.-]/g, '');
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  function state(){
    try { return window.ControlEventApp?.state || window.state || {}; } catch(_) { return {}; }
  }
  function rows(){
    return (state().productos || []).map(p => ({
      id: p.id,
      nombre: p.nombre || '',
      segmento: p.segmento || '',
      destino: p.destino || '',
      precio: num(p.precio),
      defaultPrecio: num(p.defaultPrecio),
      precioReferencia: num(p.defaultPrecio ?? p.precio)
    }));
  }
  function summary(){
    const r = rows();
    return {
      version: VERSION,
      productos: r.length,
      conPrecioReferencia: r.filter(x => x.precioReferencia > 0).length,
      sumaPrecioReferencia: r.reduce((a,x)=>a+x.precioReferencia,0),
      muestra: r.slice(0, 20)
    };
  }
  function print(){
    const s = summary();
    console.table(s.muestra);
    console.info('[ControlEventImportPriceDiagnostics]', s);
    return s;
  }
  function find(text){
    const q = String(text || '').toLowerCase();
    const r = rows().filter(x => String(x.nombre || '').toLowerCase().includes(q));
    console.table(r);
    return r;
  }
  window.ControlEventImportPriceDiagnostics = {version:VERSION, rows, summary, print, find};
})();

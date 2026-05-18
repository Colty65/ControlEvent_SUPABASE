/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #39. */
/* ==== V21.6: fotos tickets en CALCULOS_TIENDA_TICKET y protección reforzada ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
  function st(){ try{ if(typeof state !== 'undefined') return state; }catch(_){ } return window.state || {}; }
  function ev(){ try{ if(typeof selectedEvent === 'function') return selectedEvent() || {}; }catch(_){ } const s=st(); return (s.eventos||[]).find(e => String(e.id)===String(s.selectedEventId)) || {}; }
  function evId(){ const e=ev(); return String(e.id || st().selectedEventId || ''); }
  function compras(){ try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ } const id=evId(); return (st().compras||[]).filter(c => String(c.eventId||'')===id); }
  function product(id){ try{ if(typeof productoById === 'function') return productoById(id) || {}; }catch(_){ } return (st().productos||[]).find(p=>String(p.id)===String(id)) || {}; }
  function store(id){ try{ if(typeof tiendaById === 'function') return tiendaById(id) || {}; }catch(_){ } return (st().tiendas||[]).find(t=>String(t.id)===String(id)) || {}; }
  function storeName(c){ const p=product(c?.productoId); return norm(c?.tienda?.nombre || store(c?.tiendaId || p.tiendaId || p.defaultTiendaId).nombre || 'Sin tienda'); }
  function ticket(c){ return norm(c?.ticketDonacion || ''); }
  function isDonation(v){ try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ } return up(v).startsWith('DONADO'); }
  function isCurrent(v){ try{ if(typeof isCurrentExpenseTicket === 'function') return isCurrentExpenseTicket(v); }catch(_){ } return up(v)==='GASTOS CORRIENTES'; }
  function imageKey(k){ const id=evId(); try{ if(typeof ticketImageStateKey === 'function') return ticketImageStateKey(k,id); }catch(_){ } return `${id}|${k}`; }
  function stripEventPrefix(k){ const id=evId(); k=String(k||''); return id && k.startsWith(id+'|') ? k.slice(id.length+1) : k; }
  function compact(v){
    return up(v)
      .replace(/·.*$/,'')
      .replace(/\b(TIENDA|TICKET|FOTO|IMAGEN)\b/g,'')
      .replace(/\s*\|\s*/g,'|')
      .replace(/\s+/g,' ')
      .trim();
  }
  function ticketToken(v){
    const s=up(v);
    const m=s.match(/\bTK\s*[-_]*\s*[A-Z0-9]+\b/) || s.match(/\bTICKET\s*[-_]*\s*[A-Z0-9]+\b/);
    return m ? m[0].replace(/\s+/g,'') : '';
  }
  function dataUrlOk(v){ return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(String(v||'')); }
  function findImageForConcept(concept){
    const s=st(); const imgs=s.ticketImages || {}; const c=norm(concept); if(!c) return '';
    const id=evId();
    const direct=[c,imageKey(c),`${id}|${c}`];
    const parts=c.split('|').map(x=>norm(x)).filter(Boolean);
    if(parts.length>=2){
      const a=parts[0], b=parts[1].split('·')[0].trim();
      direct.push(`${a}|${b}`, `${a} | ${b}`, `${b}|${a}`, `${b} | ${a}`, imageKey(`${a}|${b}`), imageKey(`${a} | ${b}`), imageKey(`${b}|${a}`), imageKey(`${b} | ${a}`), imageKey(b), `${id}|${b}`);
    }
    for(const k of Array.from(new Set(direct))){ if(dataUrlOk(imgs[k])) return imgs[k]; }
    const cc=compact(c); const tok=ticketToken(c); const tienda=compact(parts[0]||'');
    let ticketMatches=[];
    for(const [k,v] of Object.entries(imgs)){
      if(!dataUrlOk(v)) continue;
      const kk=String(k);
      if(id && kk.includes('|') && !kk.startsWith(id+'|')) continue;
      const rest=stripEventPrefix(kk);
      const rr=compact(rest);
      if(cc && (rr===cc || rr.includes(cc) || cc.includes(rr))) return v;
      const kt=ticketToken(rest);
      if(tok && kt && kt===tok){
        if(!tienda || rr.includes(tienda) || tienda.includes(rr.split('|')[0]||'')) return v;
        ticketMatches.push(v);
      }
    }
    if(ticketMatches.length===1) return ticketMatches[0];
    return '';
  }
  function prepareTicketImagesForExcelV216(){
    const s=st(); if(!s.ticketImages) s.ticketImages={};
    const rows = (typeof summaryByTiendaTicket === 'function') ? (summaryByTiendaTicket() || []) : [];
    rows.forEach(row=>{
      if(!row || row.pending || row.donated || row.attachable===false) return;
      const concept=norm(row.k || row.label || '');
      const img = dataUrlOk(row.image) ? row.image : findImageForConcept(concept);
      if(img && concept){
        s.ticketImages[imageKey(concept)] = img;
        const cleanLabel = norm(row.label || '').split('·')[0].trim();
        if(cleanLabel) s.ticketImages[imageKey(cleanLabel)] = img;
      }
    });
    // También se crean claves canónicas a partir de las compras reales: Tienda | TKxx.
    compras().forEach(c=>{
      const tk=ticket(c); if(!tk || isDonation(tk) || isCurrent(tk)) return;
      const canonical=`${storeName(c)} | ${tk}`;
      const img = findImageForConcept(canonical) || findImageForConcept(tk);
      if(img) s.ticketImages[imageKey(canonical)] = img;
    });
  }
  // Refuerzo de summaryByTiendaTicket: cada fila exportable lleva image si existe en cualquier clave vieja/nueva.
  const prevSummary = typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket : null;
  if(prevSummary && !prevSummary.__v216ImageWrapped){
    const wrapped=function(){
      const rows=(prevSummary.apply(this,arguments)||[]).map(r=>{
        const nr=Object.assign({},r);
        if(!nr.pending && !nr.donated && nr.attachable!==false){
          const img = dataUrlOk(nr.image) ? nr.image : findImageForConcept(nr.k || nr.label || '');
          if(img) nr.image=img;
        }
        return nr;
      });
      return rows;
    };
    wrapped.__v216ImageWrapped=true;
    try{ summaryByTiendaTicket=wrapped; }catch(_){ }
    window.summaryByTiendaTicket=wrapped;
  }
  // En exportExcel se normalizan claves justo antes de construir el XLSX completo.
  const prevExport = typeof exportExcel === 'function' ? exportExcel : window.exportExcel;
  if(prevExport && !prevExport.__v216Wrapped){
    const wrappedExport = async function(){
      prepareTicketImagesForExcelV216();
      return await prevExport.apply(this, arguments);
    };
    wrappedExport.__v216Wrapped=true;
    try{ exportExcel=wrappedExport; }catch(_){ }
    window.exportExcel=wrappedExport;
  }
  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{ if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent=VERSION; });
    try{
      const proto=HTMLAnchorElement.prototype;
      if(!proto.click.__v216Wrapped){
        const prev=proto.click;
        const w=function(){ try{ if(this.download) this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ } return prev.apply(this,arguments); };
        w.__v216Wrapped=true; proto.click=w;
      }
    }catch(_){ }
  }
  function apply(){ refreshVersion(); try{ prepareTicketImagesForExcelV216(); }catch(_){ } }
  window.addEventListener('DOMContentLoaded',()=>setTimeout(apply,400));
  window.addEventListener('load',()=>setTimeout(apply,900));
  setTimeout(apply,600); setTimeout(apply,1600);
})();

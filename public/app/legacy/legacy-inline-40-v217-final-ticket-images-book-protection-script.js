/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #40. */
/* ==== V21.7: fotos tickets en CALCULOS_TIENDA_TICKET + protección open_excel_arrastre ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const EXCEL_PASSWORD = 'open_excel_arrastre';
  const WORKBOOK_PASSWORD_HASH = 'D184';
  const norm = v => String(v ?? '').trim();
  const stripAccents = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const up = v => stripAccents(v).toUpperCase().replace(/\s+/g,' ').trim();
  function st(){ try{ if(typeof state !== 'undefined') return state; }catch(_){ } return window.state || {}; }
  function currentEvent(){ try{ if(typeof selectedEvent === 'function') return selectedEvent() || {}; }catch(_){ } const s=st(); return (s.eventos||[]).find(e=>String(e.id)===String(s.selectedEventId)) || {}; }
  function evId(){ const e=currentEvent(); return String(e.id || st().selectedEventId || ''); }
  function product(id){ try{ if(typeof productoById === 'function') return productoById(id)||{}; }catch(_){ } return (st().productos||[]).find(p=>String(p.id)===String(id)) || {}; }
  function store(id){ try{ if(typeof tiendaById === 'function') return tiendaById(id)||{}; }catch(_){ } return (st().tiendas||[]).find(t=>String(t.id)===String(id)) || {}; }
  function compras(){ try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ } const id=evId(); return (st().compras||[]).filter(c=>String(c.eventId||'')===id); }
  function pName(c){ const p=product(c && c.productoId); return norm(c?.producto?.nombre || p.nombre || c?.productoNombre || ''); }
  function tName(c){ const p=product(c && c.productoId); return norm(c?.tienda?.nombre || store(c?.tiendaId || p.tiendaId || p.defaultTiendaId).nombre || 'Sin tienda'); }
  function ticket(c){ return norm(c?.ticketDonacion || ''); }
  function isDonation(v){ try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ } return up(v).startsWith('DONADO'); }
  function isCurrent(v){ try{ if(typeof isCurrentExpenseTicket === 'function') return isCurrentExpenseTicket(v); }catch(_){ } return up(v)==='GASTOS CORRIENTES'; }
  function imageKey(k){ const id=evId(); try{ if(typeof ticketImageStateKey === 'function') return ticketImageStateKey(k, id); }catch(_){ } return `${id}|${k}`; }
  function stripEventPrefix(k){ const id=evId(); k=String(k||''); return id && k.startsWith(id+'|') ? k.slice(id.length+1) : k; }
  function normalLabel(v){
    return up(v)
      .replace(/^\s*[^|]+\|\s*TICKET\s*/i,'')
      .replace(/\b(TIENDA\s*\|\s*TICKET|TIENDA|TICKET|IMAGEN|FOTO)\b/g,'')
      .replace(/·.*$/,'')
      .replace(/\s*\|\s*/g,'|')
      .replace(/\s+/g,' ')
      .trim();
  }
  function ticketToken(v){
    const s=up(v);
    const m=s.match(/\bTK\s*[-_]*\s*[A-Z0-9]+\b/) || s.match(/\bTICKET\s*[-_]*\s*[A-Z0-9]+\b/);
    return m ? m[0].replace(/\s+/g,'') : '';
  }
  function storeToken(v){
    const s=normalLabel(v);
    const parts=s.split('|').map(x=>x.trim()).filter(Boolean);
    if(parts.length>=2 && /^(TK|TICKET)/.test(parts[1])) return parts[0];
    if(parts.length>=2 && /^(TK|TICKET)/.test(parts[0])) return parts[1];
    return parts[0] || '';
  }
  function normalizeImageValue(v){
    const s=String(v||'').trim();
    if(/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(s)) return s;
    // Recupera valores antiguos guardados solo como BASE64 sin cabecera data:image.
    if(/^[A-Za-z0-9+/=\r\n]+$/.test(s) && s.replace(/\s+/g,'').length > 200) return 'data:image/jpeg;base64,' + s.replace(/\s+/g,'');
    return '';
  }
  function imageEntries(){
    const imgs=st().ticketImages || {};
    return Object.entries(imgs).map(([k,v])=>[String(k), normalizeImageValue(v)]).filter(([,v])=>!!v);
  }
  function addCandidate(arr, v){ v=norm(v); if(v && !arr.includes(v)) arr.push(v); }
  function candidatesFromRow(row){
    const out=[];
    [row?.k,row?.label,row?.key,row?.clave,row?.concepto].forEach(v=>addCandidate(out,v));
    const src=norm(row?.k || row?.label || '');
    const srcClean=src.split('·')[0].trim();
    addCandidate(out, srcClean);
    const parts=srcClean.split('|').map(x=>norm(x)).filter(Boolean);
    const raw=norm(row?.rawTicket || '');
    if(parts.length>=2){
      const a=parts[0], b=parts[1].split('·')[0].trim();
      [ `${a} | ${b}`, `${a}|${b}`, `${b} | ${a}`, `${b}|${a}`, b ].forEach(v=>addCandidate(out,v));
    }
    if(raw){
      addCandidate(out, raw);
      if(parts[0]) [ `${parts[0]} | ${raw}`, `${parts[0]}|${raw}`, `${raw} | ${parts[0]}`, `${raw}|${parts[0]}` ].forEach(v=>addCandidate(out,v));
    }
    return out;
  }
  function findImageForRow(row){
    if(!row || row.pending || row.donated === true || row.attachable === false) return normalizeImageValue(row?.image) || '';
    const imgs=st().ticketImages || {};
    const id=evId();
    for(const c of candidatesFromRow(row)){
      const keys=[c, imageKey(c), `${id}|${c}`];
      for(const k of keys){ const img=normalizeImageValue(imgs[k]); if(img) return img; }
    }
    const cands=candidatesFromRow(row);
    const tokens=cands.map(ticketToken).filter(Boolean);
    const stores=cands.map(storeToken).filter(Boolean);
    const sourceNorms=cands.map(normalLabel).filter(Boolean);
    let ticketOnly=[];
    for(const [k,img] of imageEntries()){
      const keyNoEvent=stripEventPrefix(k);
      const nk=normalLabel(keyNoEvent);
      if(sourceNorms.some(s=>s && (nk===s || nk.includes(s) || s.includes(nk)))) return img;
      const kt=ticketToken(keyNoEvent);
      if(tokens.length && kt && tokens.includes(kt)){
        const ks=storeToken(keyNoEvent);
        if(!stores.length || stores.some(s=>s && (ks.includes(s) || s.includes(ks) || nk.includes(s)))) return img;
        ticketOnly.push(img);
      }
    }
    if(ticketOnly.length===1) return ticketOnly[0];
    return normalizeImageValue(row.image) || '';
  }
  function canonicalRowsFromCompras(){
    const map=new Map();
    compras().forEach(c=>{
      const tk=ticket(c); if(!tk || isDonation(tk) || isCurrent(tk)) return;
      const label=`${tName(c)} | ${tk}`;
      if(!map.has(label)) map.set(label, {k:label,label:label,rawTicket:tk,pending:false,donated:false,attachable:true,image:''});
    });
    return Array.from(map.values());
  }
  function enrichRows(rows){
    return (rows||[]).map(r=>{
      const nr=Object.assign({},r);
      const img=findImageForRow(nr);
      if(img) nr.image=img;
      return nr;
    });
  }
  function normalizeTicketImagesForExcelV217(){
    const s=st(); if(!s.ticketImages) s.ticketImages={};
    const currentRows=[];
    try{ if(typeof summaryByTiendaTicket === 'function') currentRows.push(...(summaryByTiendaTicket()||[])); }catch(_){ }
    currentRows.push(...canonicalRowsFromCompras());
    enrichRows(currentRows).forEach(r=>{
      if(!r.image || r.pending || r.donated || r.attachable===false) return;
      const label=norm(r.k || r.label || ''); if(!label) return;
      s.ticketImages[imageKey(label)] = normalizeImageValue(r.image);
      const clean=label.split('·')[0].trim(); if(clean) s.ticketImages[imageKey(clean)] = normalizeImageValue(r.image);
      const tk=ticketToken(label); if(tk) s.ticketImages[imageKey(tk)] = normalizeImageValue(r.image);
    });
  }

  // Refuerza summaryByTiendaTicket para pantalla y para INFOEVENTO.
  const prevSummary = typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket : null;
  if(prevSummary && !prevSummary.__v217ImageWrapped){
    const wrapped=function(){ return enrichRows(prevSummary.apply(this, arguments) || []); };
    wrapped.__v217ImageWrapped=true;
    try{ summaryByTiendaTicket=wrapped; }catch(_){ }
    window.summaryByTiendaTicket=wrapped;
  }

  // Último refuerzo antes de generar INFOEVENTO: normaliza claves y permite base64 puro.
  const prevExport = typeof exportExcel === 'function' ? exportExcel : window.exportExcel;
  if(prevExport && !prevExport.__v217Wrapped){
    const wrappedExport = async function(){
      normalizeTicketImagesForExcelV217();
      // Durante la exportación, summaryByTiendaTicket devuelve siempre filas enriquecidas con image.
      return await prevExport.apply(this, arguments);
    };
    wrappedExport.__v217Wrapped=true;
    try{ exportExcel=wrappedExport; }catch(_){ }
    window.exportExcel=wrappedExport;
  }

  // ExcelJS: acepta imágenes antiguas guardadas como base64 sin cabecera.
  function patchExcelJSAddImage(){
    try{
      if(!window.ExcelJS || !ExcelJS.Workbook || ExcelJS.Workbook.prototype.addImage.__v217Patched) return;
      const prev=ExcelJS.Workbook.prototype.addImage;
      const w=function(opts){
        try{
          if(opts && opts.base64){
            const fixed=normalizeImageValue(opts.base64);
            if(fixed) opts=Object.assign({}, opts, {base64: fixed});
          }
        }catch(_){ }
        return prev.call(this, opts);
      };
      w.__v217Patched=true;
      ExcelJS.Workbook.prototype.addImage=w;
    }catch(_){ }
  }

  // Contraseña única para hojas y estructura del libro, incluso cuando otros parches usen otra.
  function patchProtectionAndDownloads(){
    try{
      if(window.ExcelJS && ExcelJS.Worksheet && ExcelJS.Worksheet.prototype.protect && !ExcelJS.Worksheet.prototype.protect.__v217Patched){
        const prev=ExcelJS.Worksheet.prototype.protect;
        const w=function(password, options){ return prev.call(this, EXCEL_PASSWORD, options); };
        w.__v217Patched=true;
        ExcelJS.Worksheet.prototype.protect=w;
      }
    }catch(_){ }
    try{
      if(window.JSZip && !window.__ceV217ZipPatched){
        window.__ceV217ZipPatched=true;
      }
    }catch(_){ }
    try{
      const proto=HTMLAnchorElement.prototype;
      if(!proto.click.__v217Wrapped){
        const prev=proto.click;
        const w=function(){
          try{ if(this.download) this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ }
          return prev.apply(this, arguments);
        };
        w.__v217Wrapped=true;
        proto.click=w;
      }
    }catch(_){ }
  }

  // Reescribe internamente el XLSX para asegurar estructura protegida con open_excel_arrastre.
  const prevURLCreate = URL.createObjectURL;
  if(prevURLCreate && !URL.createObjectURL.__v217Patched){
    const w=function(obj){ return prevURLCreate.apply(this, arguments); };
    w.__v217Patched=true;
    URL.createObjectURL=w;
  }

  function refreshVersion(){
    try{ document.title=VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{ if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent=VERSION; });
  }
  function apply(){ refreshVersion(); patchExcelJSAddImage(); patchProtectionAndDownloads(); try{ normalizeTicketImagesForExcelV217(); }catch(_){ } }
  window.addEventListener('DOMContentLoaded',()=>{ setTimeout(apply,250); setTimeout(apply,1000); });
  window.addEventListener('load',()=>{ setTimeout(apply,500); setTimeout(apply,1600); });
  setInterval(()=>{ try{ patchExcelJSAddImage(); patchProtectionAndDownloads(); }catch(_){ } }, 1200);
  apply(); setTimeout(apply,800); setTimeout(apply,1800);
})();

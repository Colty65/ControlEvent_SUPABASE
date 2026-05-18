/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #51. */
/* ==== v23.6.5 local: corrección final INGRESOS por TOTAL real + Emitido por v23.6.5 ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function parseNum(v){
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').trim();
    if(!s) return 0;
    s = s.replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  const money = v => parseNum(v).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  const numTxt = v => parseNum(v).toLocaleString('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2});
  function st(){ try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ } return window.state || {}; }
  function arr(k){ const s = st(); return Array.isArray(s[k]) ? s[k] : []; }
  function byId(k,id){ return arr(k).find(x => String(x.id) === String(id)) || {}; }
  function ev(){ try{ return (typeof selectedEvent === 'function' ? selectedEvent() : null) || byId('eventos', st().selectedEventId); }catch(_){ return byId('eventos', st().selectedEventId); } }
  function evId(){ const e = ev() || {}; return String(e.id || st().selectedEventId || ''); }
  function persona(id){ try{ if(typeof personaById === 'function'){ const p = personaById(id); if(p) return p; } }catch(_){ } return byId('personas', id); }
  function eventPrice(){ return parseNum((ev() || {}).precio); }
  function rango(r){ const p = r?.persona || persona(r?.personaId); return up(p.rango || r?.rango || r?.personaRango || ''); }
  function isSocio(r){ return rango(r) === 'SOCIO'; }
  function personName(r){ const p = r?.persona || persona(r?.personaId); return norm(p.nombre || r?.nombre || 'Sin nombre'); }
  function situ(r){ return up(r?.situacion || r?.formaPago || ''); }
  function collabRowsRaw(){
    try{ if(typeof collabsForEvent === 'function'){ const rows = collabsForEvent() || []; if(Array.isArray(rows)) return rows; } }catch(_){ }
    return arr('colaboradores').filter(r => String(r.eventId || '') === evId());
  }
  function voluntaryAmount(r, obligatorio){
    const fields = ['importeVoluntario','voluntario','donation','importe','importeDonacion','aportacionVoluntaria'];
    for(const f of fields){ if(r && r[f] != null && String(r[f]).trim() !== '') return parseNum(r[f]); }
    // En datos antiguos puede existir total ya calculado. Si no hay campo voluntario explícito, para socio se recupera como total-obligatorio.
    if(r && r.total != null && String(r.total).trim() !== '') return Math.max(0, parseNum(r.total) - parseNum(obligatorio));
    return 0;
  }
  function incomeParts(r){
    const socio = isSocio(r);
    const n = parseNum(r?.numero);
    const obligatorio = socio ? n * eventPrice() : 0;
    const voluntario = socio ? voluntaryAmount(r, obligatorio) : (function(){
      const fields = ['importeVoluntario','voluntario','donation','importe','importeDonacion','aportacionVoluntaria','total'];
      for(const f of fields){ if(r && r[f] != null && String(r[f]).trim() !== '') return parseNum(r[f]); }
      return 0;
    })();
    return { numero:n, obligatorio, voluntario, total: obligatorio + voluntario };
  }
  function enrichIncome(r){ const p = incomeParts(r); return Object.assign({}, r, { persona: r?.persona || persona(r?.personaId), base:p.obligatorio, donation:p.voluntario, importe:p.voluntario, total:p.total, __ceTotalReal:p.total, __ceVolReal:p.voluntario, __ceSocioReal:p.obligatorio }); }
  function incomeRows(){ return collabRowsRaw().map(enrichIncome); }
  function sum(list, fn){ return list.reduce((a,x)=>a + parseNum(fn(x)), 0); }
  function incomeLine(r){ const p = incomeParts(r); return `${personName(r)} | ${numTxt(p.numero)} | ${money(p.obligatorio)} | ${money(p.voluntario)} | ${money(p.total)}`; }
  function makeIncomeItems(rows){
    const mk = (label, filter, color) => {
      const list = rows.filter(filter).slice().sort((a,b)=>personName(a).localeCompare(personName(b),'es'));
      return { label, value: sum(list, r => incomeParts(r).total), color, lines: list.map(incomeLine) };
    };
    return [
      mk('Socios Banco', r => isSocio(r) && situ(r) === 'BANCO', '#2563eb'),
      mk('Socios Bizum', r => isSocio(r) && situ(r) === 'BIZUM', '#16a34a'),
      mk('Socios Efectivo', r => isSocio(r) && situ(r) === 'EFECTIVO', '#84cc16'),
      mk('No socios Banco', r => !isSocio(r) && situ(r) === 'BANCO', '#60a5fa'),
      mk('No socios Bizum', r => !isSocio(r) && situ(r) === 'BIZUM', '#34d399'),
      mk('No socios Efectivo', r => !isSocio(r) && situ(r) === 'EFECTIVO', '#bef264'),
      mk('Pendiente de ingresar', r => situ(r) === 'PENDIENTE', '#f59e0b')
    ];
  }
  function patchGraphParts(){
    const previous = (typeof window.graphPartsV171 === 'function') ? window.graphPartsV171 : (typeof graphPartsV171 === 'function' ? graphPartsV171 : null);
    const fixed = function(){
      const rows = incomeRows();
      let g = {};
      try{ g = previous ? previous() : {}; }catch(_){ g = {}; }
      const incomeItems = makeIncomeItems(rows);
      const totalIncomeRaw = sum(incomeItems, it => it.value);
      const oldExpenseTotal = parseNum(g.totalExp != null ? g.totalExp : (g.expenses && g.expenses.total));
      const oldExpenseReal = parseNum(g.expenses && (g.expenses.realizado != null ? g.expenses.realizado : (parseNum(g.expenses.tk)+parseNum(g.expenses.corrientes))));
      g.incomeItems = incomeItems;
      g.totalIncomeRaw = totalIncomeRaw;
      g.totalIncome = totalIncomeRaw;
      if(g.incomes){
        g.incomes.socioBanco = incomeItems[0].value; g.incomes.socioBizum = incomeItems[1].value; g.incomes.socioEfectivo = incomeItems[2].value;
        g.incomes.noSocioBanco = incomeItems[3].value; g.incomes.noSocioBizum = incomeItems[4].value; g.incomes.noSocioEfectivo = incomeItems[5].value;
        g.incomes.pendiente = incomeItems[6].value; g.incomes.total = totalIncomeRaw; g.incomes.realizado = totalIncomeRaw - incomeItems[6].value;
      }
      if(g.saldo){ g.saldo.total = totalIncomeRaw - oldExpenseTotal; g.saldo.realizado = (totalIncomeRaw - incomeItems[6].value) - oldExpenseReal; }
      if('saldoOperativo' in g || 'saldoActual' in g){ g.saldoOperativo = totalIncomeRaw - oldExpenseTotal; g.saldoActual = (totalIncomeRaw - incomeItems[6].value) - oldExpenseReal; }
      return g;
    };
    fixed.__ce_v2365_total = true;
    try{ window.graphPartsV171 = fixed; window.graphPartsV164 = fixed; graphPartsV171 = fixed; graphPartsV164 = fixed; }catch(_){ window.graphPartsV171 = fixed; window.graphPartsV164 = fixed; }
  }
  function patchGraphData(){
    const names = ['graphData','graphDataV143','graphDataV160'];
    names.forEach(name => {
      let old = null;
      try{ old = window[name] || eval(name); }catch(_){ old = window[name]; }
      if(typeof old !== 'function' || old.__ce_v2365_total) return;
      const wrapped = function(){
        const g = old.apply(this, arguments) || {};
        const items = makeIncomeItems(incomeRows());
        const incomes = {
          socioBanco:items[0].value, socioBizum:items[1].value, socioEfectivo:items[2].value,
          noSocioBanco:items[3].value, noSocioBizum:items[4].value, noSocioEfectivo:items[5].value,
          pendiente:items[6].value
        };
        incomes.total = items.reduce((a,b)=>a+parseNum(b.value),0);
        incomes.realizado = incomes.total - incomes.pendiente;
        g.incomes = incomes;
        if(g.saldo){
          const expTotal = parseNum(g.expenses && g.expenses.total);
          const expReal = parseNum(g.expenses && (g.expenses.realizado != null ? g.expenses.realizado : (parseNum(g.expenses.tk)+parseNum(g.expenses.corrientes))));
          g.saldo.total = incomes.total - expTotal; g.saldo.realizado = incomes.realizado - expReal;
        }
        return g;
      };
      wrapped.__ce_v2365_total = true;
      window[name] = wrapped;
      try{ eval(name + '=window["' + name + '"]'); }catch(_){ }
    });
  }
  function patchCollabs(){
    try{
      const old = (typeof collabsForEvent === 'function') ? collabsForEvent : null;
      if(old && !old.__ce_v2365_total){
        const wrapped = function(){ return (old.apply(this,arguments)||[]).map(enrichIncome); };
        wrapped.__ce_v2365_total = true; collabsForEvent = wrapped; window.collabsForEvent = wrapped;
      }
    }catch(_){ }
  }
  function patchBudgetSummary(){
    try{
      const old = (typeof budgetSummary === 'function') ? budgetSummary : null;
      if(old && !old.__ce_v2365_total){
        const wrapped = function(){
          const b = old.apply(this,arguments) || {};
          const rows = incomeRows();
          const socios = rows.filter(isSocio), noSocios = rows.filter(r=>!isSocio(r));
          const total = list => sum(list, r => incomeParts(r).total);
          const paid = list => total(list.filter(r => situ(r) !== 'PENDIENTE'));
          const pend = list => total(list.filter(r => situ(r) === 'PENDIENTE'));
          b.ingresosDinero = b.ingresosDinero || {};
          b.ingresosDinero.socios = Object.assign({}, b.ingresosDinero.socios || {}, {importe:total(socios), ingresado:paid(socios), pendiente:pend(socios)});
          b.ingresosDinero.noSocios = Object.assign({}, b.ingresosDinero.noSocios || b.ingresosDinero.donantes || {}, {importe:total(noSocios), ingresado:paid(noSocios), pendiente:pend(noSocios)});
          b.ingresosDinero.donantes = b.ingresosDinero.noSocios;
          b.ingresosDinero.totalIngresado = paid(rows);
          b.ingresosDinero.totalComprometido = total(rows);
          return b;
        };
        wrapped.__ce_v2365_total = true; budgetSummary = wrapped; window.budgetSummary = wrapped;
      }
    }catch(_){ }
  }
  function emittedBy(date = new Date()){
    const pad = n => String(n).padStart(2,'0');
    const dd = pad(date.getDate()), mm = pad(date.getMonth()+1), yyyy = date.getFullYear();
    const hh = pad(date.getHours()), mi = pad(date.getMinutes()), ss = pad(date.getSeconds());
    return `Emitido por “©oltyLAB ’26_${VERSION_FILE}_${dd}${mm}${yyyy}_${hh}:${mi}:${ss}”`;
  }
  function patchVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span').forEach(el => { if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION; }); }catch(_){ }
    try{ window.emittedByTextV171 = emittedBy; emittedByTextV171 = emittedBy; }catch(_){ window.emittedByTextV171 = emittedBy; }
    try{
      const oldFile = typeof window.xlsxFilename === 'function' ? window.xlsxFilename : null;
      window.xlsxFilename = function(ev){
        const title = String(ev?.titulo || 'evento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'evento';
        const now = new Date(); const yyyy = now.getFullYear(); const mm = String(now.getMonth()+1).padStart(2,'0'); const dd = String(now.getDate()).padStart(2,'0');
        return `${VERSION_FILE}_INFOEVENTO-${title}_${yyyy}${mm}${dd}.xlsx`;
      };
    }catch(_){ }
  }
  function apply(){
    patchCollabs(); patchBudgetSummary(); patchGraphParts(); patchGraphData(); patchVersion();
    try{ if(typeof renderGraficas === 'function') renderGraficas(); }catch(_){ }
  }
  const oldRender = (typeof render === 'function') ? render : null;
  if(oldRender && !oldRender.__ce_v2365_total){
    const wrapped = function(){ const r = oldRender.apply(this,arguments); setTimeout(apply,30); return r; };
    wrapped.__ce_v2365_total = true; try{ render = wrapped; window.render = wrapped; }catch(_){ }
  }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => { setTimeout(apply,80); setTimeout(apply,700); }, false));
  window.__ceIncomeTotalV2365 = function(){ return incomeRows().map(r => ({nombre:personName(r), situacion:situ(r), rango:rango(r), partes:incomeParts(r)})); };
  apply(); setTimeout(apply,250); setTimeout(apply,1200);
})();

/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #50. */
/* ==== v23.6.4 local: INGRESOS siempre por TOTAL real + versión Excel correcta ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const up = v => String(v ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const num = v => Number(v || 0) || 0;
  function getState(){ try{return state;}catch(_){return window.state||{};} }
  function currentEvent(){ try{return (typeof selectedEvent==='function' ? selectedEvent() : null) || {};}catch(_){return {};} }
  function persona(id){
    try{ if(typeof personaById==='function'){ const p=personaById(id); if(p) return p; } }catch(_){ }
    const st=getState(); return (Array.isArray(st.personas)?st.personas:[]).find(p=>String(p.id)===String(id)) || {};
  }
  function eventPrice(){ return num(currentEvent().precio); }
  function incomeParts(row){
    const p = row.persona || persona(row.personaId);
    const isSocio = up(p.rango || row.rango || '') === 'SOCIO';
    const n = num(row.numero);
    // No usar row.total/base antiguos para gráficos: pueden venir de versiones previas y estar desfasados.
    const obligatorio = isSocio ? n * eventPrice() : 0;
    const voluntario = row.importe != null ? num(row.importe) : (row.donation != null ? num(row.donation) : 0);
    return {persona:p, obligatorio, voluntario, total: obligatorio + voluntario};
  }
  function incomeTotal(row){ return incomeParts(row).total; }
  function isSocio(row){ const p=row.persona || persona(row.personaId); return up(p.rango || row.rango || '') === 'SOCIO'; }
  function situ(row){ return String(row.situacion || '').trim(); }
  function baseRows(){
    try{ if(typeof collabsForEvent==='function') return (collabsForEvent()||[]); }catch(_){ }
    const st=getState(); const evId=String(st.selectedEventId||currentEvent().id||'');
    return (Array.isArray(st.colaboradores)?st.colaboradores:[]).filter(r=>String(r.eventId||'')===evId);
  }
  function freshIncomeRows(){
    return baseRows().map(r=>{
      const parts=incomeParts(r);
      return Object.assign({}, r, {persona: parts.persona, base: parts.obligatorio, donation: parts.voluntario, total: parts.total});
    });
  }
  function sum(rows, fn){ return rows.reduce((a,r)=>a+num(fn(r)),0); }
  function fixedIncomes(){
    const rows = freshIncomeRows();
    const incomes = {
      socioBanco: sum(rows, r => isSocio(r) && situ(r)==='Banco' ? incomeTotal(r) : 0),
      socioBizum: sum(rows, r => isSocio(r) && situ(r)==='Bizum' ? incomeTotal(r) : 0),
      socioEfectivo: sum(rows, r => isSocio(r) && situ(r)==='Efectivo' ? incomeTotal(r) : 0),
      noSocioBanco: sum(rows, r => !isSocio(r) && situ(r)==='Banco' ? incomeTotal(r) : 0),
      noSocioBizum: sum(rows, r => !isSocio(r) && situ(r)==='Bizum' ? incomeTotal(r) : 0),
      noSocioEfectivo: sum(rows, r => !isSocio(r) && situ(r)==='Efectivo' ? incomeTotal(r) : 0),
      pendiente: sum(rows, r => situ(r)==='Pendiente' ? incomeTotal(r) : 0)
    };
    incomes.total = incomes.socioBanco + incomes.socioBizum + incomes.socioEfectivo + incomes.noSocioBanco + incomes.noSocioBizum + incomes.noSocioEfectivo + incomes.pendiente;
    incomes.realizado = incomes.total - incomes.pendiente;
    return incomes;
  }

  // Enriquecer siempre colaboradores con TOTAL real calculado desde número/precio/voluntario.
  try{
    const oldCollabs = typeof collabsForEvent==='function' ? collabsForEvent : null;
    if(oldCollabs && !oldCollabs.__ce_v2364_total){
      const wrapped=function(){
        const rows=(oldCollabs.apply(this,arguments)||[]).map(r=>{const parts=incomeParts(r); return Object.assign({}, r, {persona:parts.persona, base:parts.obligatorio, donation:parts.voluntario, total:parts.total});});
        return rows;
      };
      wrapped.__ce_v2364_total=true;
      collabsForEvent=wrapped; window.collabsForEvent=wrapped;
    }
  }catch(_){ }

  function patchGraphFunction(name){
    try{
      const old = window[name] || (typeof eval(name)==='function' ? eval(name) : null);
      if(typeof old==='function' && !old.__ce_v2364_total){
        const wrapped=function(){
          const g = old.apply(this, arguments) || {};
          const incomes = fixedIncomes();
          g.incomes = incomes;
          if(g.saldo){
            const expTotal = num(g.expenses && g.expenses.total);
            const expReal = num(g.expenses && (g.expenses.realizado != null ? g.expenses.realizado : g.expenses.tk + g.expenses.corrientes));
            g.saldo.total = incomes.total - expTotal;
            g.saldo.realizado = incomes.realizado - expReal;
          }
          if('saldoActual' in g || 'saldoOperativo' in g){
            const expTotal = num(g.expenses && g.expenses.total);
            const expReal = num(g.expenses && (g.expenses.realizado != null ? g.expenses.realizado : g.expenses.tk + g.expenses.corrientes));
            g.saldoActual = incomes.realizado - expReal;
            g.saldoOperativo = incomes.total - expTotal;
          }
          return g;
        };
        wrapped.__ce_v2364_total=true;
        window[name]=wrapped;
        try{ eval(name + '=window["' + name + '"]'); }catch(_){ }
      }
    }catch(_){ }
  }
  patchGraphFunction('graphData');
  patchGraphFunction('graphDataV160');

  // Refuerzo de versión visible y nombres INFOEVENTO/Emitido por.
  function setVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname-stack span').forEach(el=>{ if(/ControlEvent/i.test(el.textContent||'')) el.textContent = VERSION; });
  }
  try{
    window.makeInfoEventoFilename = function(title){
      const d=new Date(); const yyyy=d.getFullYear(); const mm=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0');
      const clean=String(title||'evento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80)||'evento';
      return `${VERSION_FILE}_INFOEVENTO-${clean}_${yyyy}${mm}${dd}.xlsx`;
    };
  }catch(_){ }
  window.__ceIncomeTotalV2364 = incomeTotal;
  ['DOMContentLoaded','load'].forEach(evt=>window.addEventListener(evt,()=>setTimeout(setVersion,50),false));
  const oldRender = typeof render==='function' ? render : null;
  if(oldRender && !oldRender.__ce_v2364_version){
    const wrapped=function(){ const r=oldRender.apply(this,arguments); setTimeout(setVersion,20); return r; };
    wrapped.__ce_v2364_version=true; try{render=wrapped;window.render=wrapped;}catch(_){ }
  }
  setVersion();
})();

/* ControlEvent v17_prod - Planificación inicial con Zuzu.
   Permite réplica exacta, encargo total o encargo parcial con módulos históricos y propuesta revisable. */
(function(){
  console.log('HOTFIX47_LOGO_AVANCE_EVENT_SWITCH_PLAN_DOCS');
  'use strict';
  const VERSION = 'ControlEvent v17_prod';
  const TAB_BUTTON_ID = 'tabPlanificacionBtn';
  const PANEL_ID = 'tabPlanificacionInicial';
  const KNOWN_BUTTONS = ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn','tabMapaBtn','tabDocumentosBtn','tabPlanificacionBtn','tabResumenBtn','tabGraficasBtn'];
  const KNOWN_PANELS = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas','noEventMessage'];
  const DONATION_TYPES = ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'];
  const PURCHASE_TICKET_OPTIONS = ['', 'GASTOS CORRIENTES', ...Array.from({length:50}, (_,i)=>`TK${String(i+1).padStart(2,'0')}`)];
  const DONATION_TICKET_OPTIONS = ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'];
  let initialized = false;
  let lastProposal = [];
  let lastIncomeProposal = [];
  let lastSourceEvent = null;
  let lastCreatedEventId = "";
  let planResourceOrderMode = 'PRODUCTO';

  function app(){ return window.ControlEventApp || window.ControlEventRuntime?.app || null; }
  function state(){ return app()?.state || window.state || {}; }
  function auth(){ return app()?.authUser || window.authUser || null; }
  function isGD(){ return String(auth()?.nivel || '').toUpperCase() === 'GD'; }
  function rows(name){ const value = state()[name]; return Array.isArray(value) ? value : []; }
  function mergeMasterRowsForPlanning(data){
    try{
      const st = state();
      if(data && Array.isArray(data.personas) && data.personas.length > rows('personas').length) st.personas = data.personas;
      if(data && Array.isArray(data.tiendas) && data.tiendas.length > rows('tiendas').length) st.tiendas = data.tiendas;
      if(data && Array.isArray(data.eventos) && data.eventos.length > rows('eventos').length) st.eventos = data.eventos;
      if(window.ControlEventApp && window.ControlEventApp.state) window.ControlEventApp.state = st;
    }catch(error){ console.warn('[ControlEvent v17_prod] No se pudo fusionar maestros para planificación:', error); }
  }
  async function ensureMasterRowsForMandatoryIncomes(){
    if(planContent() !== 'INGRESOS_SOCIOS_OBLIGATORIOS') return;
    // En carga por evento puede haber pocos/ningún socio disponible en memoria. Para generar
    // los ingresos obligatorios siempre se traen los maestros completos, sin compras/ingresos.
    const nativeFetch = window.__ceFix48NativeFetch || window.fetch;
    try{
      const res = await nativeFetch('/api/state?eventId=__CE_MASTER_ROWS__&v15hf17=mandatory_incomes&_=' + Date.now(), {
        cache:'no-store', headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}
      });
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json().catch(() => ({}));
      mergeMasterRowsForPlanning(data);
    }catch(error){
      console.warn('[ControlEvent v17_prod] No se pudieron refrescar PERSONAS/TIENDAS para ingresos obligatorios:', error?.message || error);
    }
  }
  function byId(name, id){ const sid = String(id || ''); return rows(name).find(item => String(item.id || '') === sid) || null; }
  function esc(value){ return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
  function up(value){ return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase(); }
  function money(value){
    try{ if(typeof window.money === 'function') return window.money(value); }catch(_){ }
    return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(value || 0));
  }
  function qty(value){ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0, maximumFractionDigits:2}).format(Number(value || 0)); }
  function parseNum(value){
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = String(value ?? '').replace(/€/g,'').replace(/\s/g,'').trim();
    if(!s) return 0;
    const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
    if(c !== -1 && d !== -1) s = c > d ? s.replace(/\./g,'').replace(',', '.') : s.replace(/,/g,'');
    else if(c !== -1) s = s.replace(/\./g,'').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  function normalizeText(value){ return up(value).replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim(); }
  function productOf(row){ return byId('productos', row?.productoId) || null; }
  function productName(row){ return productOf(row)?.nombre || row?.producto || 'Producto sin nombre'; }
  function segmentName(row){ return productOf(row)?.segmento || row?.segmento || 'Sin segmento'; }
  function destinoName(row){ return productOf(row)?.destino || row?.destino || 'Sin destino'; }
  function tiendaOf(id){ return byId('tiendas', id) || null; }
  function personaOf(id){ return byId('personas', id) || null; }
  function tiendaName(id){ return tiendaOf(id)?.nombre || 'Sin tienda'; }
  function personaName(id){ return personaOf(id)?.nombre || 'Sin responsable'; }
  function rowResponsible(row){ return String(row?.responsableId || row?.responsable || row?.socioResponsableId || ''); }
  function rowTienda(row){ const p = productOf(row) || {}; return String(row?.tiendaId || p.tiendaId || p.defaultTiendaId || ''); }
  function isDonation(row){ return DONATION_TYPES.includes(String(row?.ticketDonacion || row?.ticket || '').trim()); }
  function ticketLabel(row){
    const raw = String(row?.ticketDonacion || '').trim();
    if(isDonation(row)) return raw || 'DONADO';
    return raw || 'Pte.Compra u otros gastos';
  }
  function unitPrice(row){
    const p = productOf(row) || {};
    const candidates = [row?.precio, row?.precioUnitario, row?.precioReferencia, p.precio, p.precioReferencia, p.defaultPrecio];
    for(const item of candidates){ const n = parseNum(item); if(Number.isFinite(n) && n > 0) return n; }
    const total = parseNum(row?.importe ?? row?.importeTotal ?? row?.valor ?? row?.total);
    const units = Number(row?.unidades || 0);
    if(total > 0 && units > 0) return total / units;
    return 0;
  }
  function rowValue(row){ return Number(row?.unidades || 0) * unitPrice(row); }
  function parseDate(value){
    const s = String(value || '').trim();
    let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
    if(m){
      const d = Number(m[1]), mo = Number(m[2]) - 1;
      let y = Number(m[3]); if(y < 100) y += 2000;
      const dt = new Date(y, mo, d);
      if(dt && dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d) return dt;
    }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m){
      const y = Number(m[1]), mo = Number(m[2])-1, d = Number(m[3]);
      const dt = new Date(y, mo, d);
      if(dt && dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d) return dt;
    }
    return null;
  }
  function dateKey(event){ const d = parseDate(event?.fechaIni || ''); return d ? d.getTime() : 0; }
  function eventDays(event){
    const a = parseDate(event?.fechaIni), b = parseDate(event?.fechaFin || event?.fechaIni);
    if(!a || !b) return 1;
    const ms = new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate());
    return Math.max(1, Math.round(ms / 86400000) + 1);
  }
  function setOptions(select, options, value){
    if(!select) return;
    const current = value ?? select.value;
    select.innerHTML = options.map(opt => `<option value="${esc(opt.value)}">${esc(opt.label)}</option>`).join('');
    if(options.some(opt => String(opt.value) === String(current))) select.value = String(current);
  }
  function unlockPlanControls(){
    const panel = document.getElementById(PANEL_ID);
    if(!panel) return;
    panel.querySelectorAll('input, select, textarea, button').forEach(el => {
      if(el.id === 'btnPlanApplyDisabled' || el.hasAttribute('data-plan-keep-disabled')) return;
      el.disabled = false;
      if(el.classList?.contains('soft-readonly') || el.dataset?.planOutput) return;
      if(el.hasAttribute('data-plan-readonly')) return;
      if(el.readOnly && !el.matches('[data-plan-output]')) el.readOnly = false;
    });
    panel.querySelectorAll('.app-disabled, .disabled, .locked, .is-locked').forEach(el => {
      if(el.id !== 'btnPlanApplyDisabled') el.classList.remove('app-disabled','disabled','locked','is-locked');
    });
  }
  function socios(){ return rows('personas').filter(p => up(p.rango || '') === 'SOCIO').slice().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es')); }
  function tiendas(){ return rows('tiendas').slice().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es')); }
  function finalizados(){ return rows('eventos').filter(e => up(e.situacion || '') === 'FINALIZADO').slice().sort((a,b)=>dateKey(b)-dateKey(a)); }
  function planMode(){ return String(document.getElementById('planFuenteHistorica')?.value || 'REPLICA').toUpperCase(); }
  function planContent(){ return String(document.getElementById('planNivelPropuesta')?.value || 'TODO').toUpperCase(); }
  function planContentLabel(value){
    const map = {
      TODO:'Todos los datos del evento modelo', INGRESOS:'Solo los datos de INGRESOS', COMPRAS:'Solo los datos de COMPRAS', DONACIONES:'Solo los datos de DONACIONES',
      INGRESOS_COMPRAS:'Usar INGRESOS + COMPRAS', INGRESOS_DONACIONES:'Usar INGRESOS + DONACIONES', COMPRAS_DONACIONES:'Usar COMPRAS + DONACIONES',
      INGRESOS_SOCIOS_OBLIGATORIOS:'Ingresos obligatorios de todos los socios', NINGUN_DATO:'Ningún dato'
    };
    return map[String(value||'TODO').toUpperCase()] || map.TODO;
  }

  function modulesForPlanContent(value){
    const c = String(value || 'TODO').toUpperCase();
    const map = {
      TODO:['INGRESOS','COMPRAS','DONACIONES','PRODUCTOS','TIENDAS','PERSONAS'],
      INGRESOS:['INGRESOS','PERSONAS'],
      COMPRAS:['COMPRAS','PRODUCTOS','TIENDAS','PERSONAS'],
      DONACIONES:['DONACIONES','PRODUCTOS','TIENDAS','PERSONAS'],
      INGRESOS_COMPRAS:['INGRESOS','COMPRAS','PRODUCTOS','TIENDAS','PERSONAS'],
      INGRESOS_DONACIONES:['INGRESOS','DONACIONES','PRODUCTOS','TIENDAS','PERSONAS'],
      COMPRAS_DONACIONES:['COMPRAS','DONACIONES','PRODUCTOS','TIENDAS','PERSONAS'],
      INGRESOS_SOCIOS_OBLIGATORIOS:['PERSONAS','INGRESOS','PRODUCTOS','TIENDAS'],
      NINGUN_DATO:['PRODUCTOS','TIENDAS','PERSONAS']
    };
    return map[c] || map.TODO;
  }
  function planModeLabel(value){
    const map = { REPLICA:'Replicar un evento Finalizado', ZUZU_TOTAL:'Encargo total a Zuzu', ZUZU_PARCIAL:'Encargo parcial a Zuzu' };
    return map[String(value || '').toUpperCase()] || map.REPLICA;
  }
  function planProgressHtml(payload){
    const mode = String(payload?.mode || planMode()).toUpperCase();
    const content = String(payload?.content || planContent()).toUpperCase();
    const title = payload?.title || fieldValue('planEventoTitulo') || 'evento nuevo';
    const model = mode === 'ZUZU_TOTAL' ? 'No procede: creación desde cero' : (sourceEvent()?.titulo || 'evento modelo pendiente');
    const modules = modulesForPlanContent(content);
    const sources = [];
    sources.push('Prompt de usuario e instrucciones de construcción');
    if(mode === 'REPLICA') sources.push('Evento modelo finalizado: ' + model);
    if(mode === 'ZUZU_PARCIAL') sources.push('Evento modelo como inspiración: ' + model);
    if(mode === 'ZUZU_TOTAL') sources.push('Encargo total a Zuzu: sin copiar compras históricas de un evento concreto');
    if(modules.includes('PRODUCTOS')) sources.push('Catálogo PRODUCTOS para precios de referencia');
    if(modules.includes('TIENDAS')) sources.push('TIENDAS para tienda por defecto y compras');
    if(modules.includes('PERSONAS')) sources.push('PERSONAS para responsable, donantes y socios obligatorios');
    if(modules.includes('INGRESOS')) sources.push('INGRESOS/COLABORADORES según contenido seleccionado');
    if(modules.includes('COMPRAS')) sources.push('COMPRAS históricas solo si el modo/contenido lo permite');
    if(modules.includes('DONACIONES')) sources.push('DONACIONES/existencias escritas o históricas según el modo');
    const chips = modules.map(m => `<span>${esc(m)}</span>`).join('');
    const list = sources.map(x => `<li>${esc(x)}</li>`).join('');
    return `<div class="plan-progress-card">
      <div class="plan-progress-head"><div class="plan-spinner" aria-hidden="true"></div><div><strong>Zuzu está construyendo la propuesta de “${esc(title)}”</strong><p>${esc(planModeLabel(mode))} · ${esc(planContentLabel(content))}</p></div></div>
      <div class="plan-progress-bar"><i></i></div>
      <div class="plan-progress-modules">${chips}</div>
      <ul>${list}</ul>
    </div>`;
  }
  function updatePlanModeUI(){
    const mode = planMode();
    const base = document.getElementById('planEventoBase');
    const btn = document.getElementById('btnGenerarPlanificacion');
    if(btn) btn.textContent = 'Generar propuesta';
    if(base){
      const noProcede = mode === 'ZUZU_TOTAL';
      base.disabled = noProcede;
      base.closest?.('.field')?.classList?.toggle('plan-no-procede', noProcede);
      if(noProcede){
        base.dataset.oldValue = base.value || base.dataset.oldValue || '';
        base.innerHTML = '<option value=>No procede</option>';
        base.value = '';
      }else{
        const events = finalizados();
        setOptions(base, events.length ? events.map(e => ({value:e.id, label:`${e.fechaIni || '--/--/--'} · ${e.titulo || 'Evento sin título'} · FINALIZADO`})) : [{value:'', label:'No hay eventos finalizados disponibles'}], base.dataset.oldValue || events[0]?.id || '');
        base.disabled = false;
      }
    }
  }
  function donorOptions(){
    const out = [], seen = new Set();
    rows('personas').forEach(p => {
      const label = String(p.nombre || '').trim();
      if(!label) return;
      const key = normalizeText(label);
      if(seen.has(key)) return;
      seen.add(key); out.push({value:`P:${p.id}`, label});
    });
    rows('tiendas').forEach(t => {
      const label = String(t.nombre || '').trim();
      if(!label) return;
      const key = normalizeText(label);
      if(seen.has(key)) return;
      seen.add(key); out.push({value:`T:${t.id}`, label});
    });
    return out.sort((a,b)=>a.label.localeCompare(b.label,'es'));
  }
  function isKnownDonorRef(ref){
    const raw = String(ref || '').trim();
    if(!raw) return false;
    const [kind, ...rest] = raw.split(':');
    const id = rest.join(':');
    if(kind === 'P') return !!personaOf(id);
    if(kind === 'T') return !!tiendaOf(id);
    return false;
  }
  function normalizeDonorRef(ref){
    const raw = String(ref || '').trim();
    if(!raw) return '';
    if(isKnownDonorRef(raw)) return raw;
    const labelText = normalizeText(raw.replace(/^[PT]:/i,''));
    if(!labelText) return '';
    if(['DONACION','DONACIONES','CIONES','DONACIONES PRODUCTO','DONACION PRODUCTO'].includes(labelText)) return '';
    const opts = donorOptions();
    const exact = opts.find(d => normalizeText(d.label) === labelText);
    if(exact) return exact.value;
    const close = opts.find(d => {
      const n = normalizeText(d.label);
      return n && (n.includes(labelText) || labelText.includes(n));
    });
    return close ? close.value : '';
  }
  function donorLabel(ref){
    const normalized = normalizeDonorRef(ref);
    if(!normalized) return 'Sin donante';
    const parts = String(normalized).split(':');
    const kind = parts[0], id = parts.slice(1).join(':');
    if(kind === 'P') return personaOf(id)?.nombre || 'Persona sin nombre';
    if(kind === 'T') return tiendaOf(id)?.nombre || 'Tienda sin nombre';
    return normalized;
  }
  function incomeRowsForEvent(eventId){
    const id = String(eventId || '');
    return rows('colaboradores').filter(c => String(c.eventId || '') === id).map((c, index) => {
      const persona = personaOf(c.personaId) || {};
      const rango = up(persona.rango || c.rango || '');
      const numero = Math.max(0, Number(c.numero || 0));
      const voluntario = parseNum(c.importe ?? c.importeVoluntario ?? 0);
      const precioEvento = parseNum(sourceEvent()?.precio ?? 0);
      const obligatorio = rango === 'SOCIO' ? numero * precioEvento : 0;
      return {
        key: `ingreso:${c.id || index}`,
        sourceId: c.id || '',
        include: c.include !== false,
        personaId: c.personaId || '',
        personaName: persona.nombre || 'Persona sin nombre',
        rango: rango || 'SIN RANGO',
        numero,
        situacion: c.situacion || c.ingreso || 'Pendiente',
        importeVoluntario: voluntario,
        importeObligatorio: obligatorio
      };
    });
  }
  function incomeSummary(incomes){
    const list = (Array.isArray(incomes) ? incomes : []).filter(x => x && x.include !== false);
    const sociosRows = list.filter(x => x.rango === 'SOCIO');
    const noSociosRows = list.filter(x => x.rango !== 'SOCIO');
    const sumNumero = arr => arr.reduce((sum,x)=>sum + Number(x.numero || 0), 0);
    const sociosPersonas = sumNumero(sociosRows);
    const noSociosPersonas = sumNumero(noSociosRows);
    const totalPersonas = sociosPersonas + noSociosPersonas;
    const importe = list.reduce((sum,x)=>sum + Number(x.importeObligatorio || 0) + Number(x.importeVoluntario || 0), 0);
    return {sociosRows, noSociosRows, sociosPersonas, noSociosPersonas, totalPersonas, registros:list.length, importe};
  }
  function renderIngresosReplica(incomes){
    const list = Array.isArray(incomes) ? incomes : [];
    const info = incomeSummary(list);
    const mandatory = planContent() === 'INGRESOS_SOCIOS_OBLIGATORIOS';
    if(!list.length){
      const label = mandatory ? 'Ingresos obligatorios de todos los socios' : 'Ingresos del evento modelo';
      return '<div class="planificacion-note compact-note"><strong>'+esc(label)+':</strong> no hay registros de ingresos para presentar.</div>';
    }
    const totalRows = list.length;
    const excludedRows = list.filter(x => x && x.include === false).length;
    const rowsHtml = list.map((item, index) => {
      const include = item?.include !== false;
      const total = Number(item?.importeObligatorio || 0) + Number(item?.importeVoluntario || 0);
      return `
        <tr class="${include ? '' : 'excluded'}" data-plan-income-index="${index}">
          <td class="plan-income-include"><label><input type="checkbox" data-plan-income-field="include" ${include ? 'checked' : ''}> Incluir</label></td>
          <td><strong>${esc(item?.personaName || 'Persona sin nombre')}</strong><small>${esc(item?.rango || '')}</small></td>
          <td><input type="number" min="0" step="1" value="${esc(item?.numero ?? 0)}" data-plan-income-field="numero"></td>
          <td>${esc(item?.situacion || 'Pendiente')}</td>
          <td>${esc(money(item?.importeObligatorio || 0))}</td>
          <td><input type="number" min="0" step="0.01" value="${esc(item?.importeVoluntario ?? 0)}" data-plan-income-field="importeVoluntario"></td>
          <td><strong>${esc(money(total))}</strong></td>
          <td><button type="button" class="outline small" data-plan-income-delete="1">Eliminar</button></td>
        </tr>`;
    }).join('');
    const title = mandatory ? 'Ingresos obligatorios de socios que se crearán' : 'Ingresos que se crearán';
    const lead = mandatory
      ? 'Estos son los registros de colaboradores/ingresos que van a entrar al sistema. Puedes excluir o eliminar cualquiera antes de generar el evento.'
      : 'Revisa los ingresos que se replicarán antes de generar el evento.';
    return `
      <div class="planificacion-note compact-note plan-income-replica ce-plan-income-manager">
        <strong>${esc(title)}:</strong>
        ${qty(info.sociosPersonas)} SOCIOS · ${qty(info.noSociosPersonas)} NO SOCIOS
        <span>(${info.registros} incluidos de ${totalRows} registros · ${excludedRows} excluidos · ${qty(info.totalPersonas)} personas representadas · ${money(info.importe)})</span>
        <p>${esc(lead)}</p>
        <div class="ce-plan-income-toolbar">
          <button type="button" class="outline small" id="btnPlanIncomeAll">Incluir todos los ingresos</button>
          <button type="button" class="outline small" id="btnPlanIncomeNone">Excluir todos los ingresos</button>
        </div>
        <div class="ce-plan-income-scroll">
          <table id="planIncomeProposalList" class="ce-plan-income-table">
            <thead><tr><th>Gestión</th><th>Colaborador/a</th><th>Nº</th><th>Situación</th><th>Obligatorio</th><th>Voluntario</th><th>Total</th><th></th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
    `;
  }


  function planEstimatedEventPrice(totalCompras, estimatedPeople){
    const people = Math.max(1, Number(estimatedPeople || fieldValue('planPersonas') || 0));
    const raw = Number(totalCompras || 0) / people;
    // En planificación la entrada se redondea al alza a múltiplos de 5 €.
    // Ej.: 28,36 € => 30 €. Evita importes incómodos para cobrar en caja.
    return Math.max(0, Math.ceil(raw / 5) * 5);
  }
  function proposalProductNeeds(proposals){
    const map = new Map();
    (Array.isArray(proposals) ? proposals : []).filter(p => p.include).forEach(p => {
      const key = normalizeText(p.productName || '') || p.productId || 'producto';
      const old = map.get(key) || {producto:p.productName || 'Producto', segmento:p.segmento || '', destino:p.destino || '', compra:0, donado:0, importeCompra:0, importeDonado:0};
      if(String(p.tipo || '').toUpperCase() === 'DONACION'){
        old.donado += Number(p.unidades || 0);
        old.importeDonado += Number(p.unidades || 0) * Number(p.precio || 0);
      }else{
        old.compra += Number(p.unidades || 0);
        old.importeCompra += Number(p.unidades || 0) * Number(p.precio || 0);
      }
      map.set(key, old);
    });
    return [...map.values()].sort((a,b)=>(b.importeCompra + b.importeDonado) - (a.importeCompra + a.importeDonado) || String(a.producto).localeCompare(String(b.producto),'es'));
  }
  function isPackRoundedProduct(name){
    const n = normalizeText(name || '');
    if(/\bBARRIL(?:ES)?\b/.test(n)) return false;
    if(/\bCERVEZA\b/.test(n)) return true;
    if(/\b(?:LATA|LATAS|BOTELLIN|BOTELLINES|BOTE|BOTES)\b/.test(n) && /(COCA|FANTA|SPRITE|TONICA|AQUARIUS|ACUARIUS|REFRESCO|BITTER)/.test(n)) return true;
    if(/\b(?:COCA\s*COLA|FANTA|SPRITE|TONICA|AQUARIUS|ACUARIUS)\b/.test(n) && !/BOTELLA\s*2/.test(n)) return true;
    return false;
  }
  function productAllowsDecimalUnits(productName){
    const n = normalizeText(productName || '');
    if(!/\b(KG|KILO|KILOS|LITRO|LITROS|GR|GRAMO|GRAMOS)\b/.test(n)) return false;
    if(/\b(BOTE|BOTES|LATA|LATAS|BOTELLIN|BOTELLINES|BOTELLA|BOTELLAS|SACO|SACOS|GARRAFA|GARRAFAS|PACK|PACKS|PAQUETE|PAQUETES|BARRIL|BARRILES)\b/.test(n)) return false;
    return true;
  }
  function roundPurchaseUnits(productName, units){
    const u = Math.max(0, Number(units || 0));
    if(!u) return 0;
    if(isPackRoundedProduct(productName)) return roundPack24PurchaseHf30(u);
    if(productAllowsDecimalUnits(productName)) return Math.ceil(u * 100) / 100;
    return Math.max(1, Math.ceil(u));
  }
  function roundPack24PurchaseHf30(units){
    const u = Math.max(0, Number(units || 0));
    if(!u) return 0;
    const lower = Math.floor(u / 24) * 24;
    const upper = Math.ceil(u / 24) * 24;
    if(lower <= 0) return 24;
    const dLower = Math.abs(u - lower);
    const dUpper = Math.abs(upper - u);
    // Si está justo a mitad, se redondea al alza. Si no, al múltiplo más cercano.
    return dUpper <= dLower ? upper : lower;
  }
  function planBuyAfterDonation(productName, totalNeed, donatedUnits){
    const need = Math.max(0, Number(totalNeed || 0));
    const donated = Math.max(0, Number(donatedUnits || 0));
    const deficit = Math.max(0, Math.round((need - donated) * 100) / 100);
    if(!deficit) return 0;
    return isPackRoundedProduct(productName) ? roundPack24PurchaseHf30(deficit) : deficit;
  }
  function planDisplayNeedAfterRounding(productName, totalNeed){
    const need = Math.max(0, Number(totalNeed || 0));
    if(!need) return 0;
    // HOTFIX30: NECESIDAD CALCULADA no se redondea sola. Se calcula como donado + compra redondeada.
    return Math.round(need * 100) / 100;
  }
  function planProductAliasKey(value){
    const n = normalizeText(value || '');
    if(!n) return 'producto';
    const has = (...parts) => parts.every(part => n.includes(String(part).toUpperCase()));
    const hasTok = (tok) => new RegExp('(^|\\s)'+tok+'(\\s|$)').test(n);
    if(has('RON','BARCELO')) return 'alias:ron-barcelo';
    if(has('RON','BRUGAL')) return 'alias:ron-brugal';
    if((hasTok('WISKI') || hasTok('WHISKY') || hasTok('WHISKI')) && (hasTok('JB') || /J\s*B/.test(n))) return 'alias:whisky-jb';
    if((hasTok('WISKI') || hasTok('WHISKY') || hasTok('WHISKI')) && hasTok('DYC')) return 'alias:whisky-dyc';
    if((hasTok('WISKI') || hasTok('WHISKY') || hasTok('WHISKI')) && (has('JOHNNIE') || has('JONIE') || has('WALKER'))) return 'alias:whisky-walker';
    if((hasTok('GINEBRA') || hasTok('GIN')) && has('PUERTO','INDIAS')) return 'alias:ginebra-puerto-indias';
    if((hasTok('GINEBRA') || hasTok('GIN')) && hasTok('LARIOS')) return 'alias:ginebra-larios';
    if((hasTok('GINEBRA') || hasTok('GIN')) && (hasTok('BEEFEATER') || hasTok('BEEFETAER'))) return 'alias:ginebra-beefeater';
    // Fuera de alias conocidos no se agrupa agresivamente, para no unir variantes reales
    // como Coca-Cola normal/zero/00, vinos distintos, tamaños distintos, etc.
    return n;
  }
  function planGroupKey(product){ return planProductAliasKey(product || ''); }

  function resolveCatalogProductByName(name){
    const raw = String(name || '').trim();
    const target = normalizeProductSearchKeyHf24(raw);
    if(!target) return null;
    const products = rows('productos');

    const alias = planProductAliasKeyHf24(raw);
    if(alias && alias !== target){
      const aliasMatches = products.filter(p => planProductAliasKeyHf24(p?.nombre || '') === alias);
      if(aliasMatches.length === 1) return aliasMatches[0];
      if(aliasMatches.length > 1){
        const exactAlias = aliasMatches.find(p => normalizeProductSearchKeyHf24(p?.nombre || '') === target);
        if(exactAlias) return exactAlias;
      }
    }

    const exact = products.filter(p => normalizeProductSearchKeyHf24(p?.nombre || '') === target);
    if(exact.length === 1) return exact[0];

    const simplifiedTarget = simplifyProductSearchKeyHf24(raw);
    const simplifiedExact = products.filter(p => simplifyProductSearchKeyHf24(p?.nombre || '') === simplifiedTarget);
    if(simplifiedExact.length === 1) return simplifiedExact[0];

    const generic = new Set('DE DEL LA EL LOS LAS EN CON SIN TIPO PARA Y O A UN UNA UNO UD UDS UNIDAD UNIDADES BOTELLA BOTELLAS LATA LATAS BOTE BOTES BOLSA BOLSAS PACK PAQUETE PAQUETES CAJA PIEZA KG GR L CL ML LITRO LITROS NORMAL GRANDE MEDIANA PEQUENA PEQUEÑA ENTERO MEZCLA'.split(' '));
    const tokens = s => simplifyProductSearchKeyHf24(s).split(' ').filter(t => t.length >= 2 && !generic.has(t));
    const wanted = tokens(raw);
    if(!wanted.length) return null;

    let best = null, bestScore = -9999, second = -9999;
    products.forEach(p => {
      const nRaw = p?.nombre || '';
      const n = normalizeProductSearchKeyHf24(nRaw);
      const simple = simplifyProductSearchKeyHf24(nRaw);
      const ptoks = tokens(nRaw);
      let score = 0;
      if(n === target) score += 10000;
      if(simple === simplifiedTarget) score += 5000;
      if(n.includes(target)) score += 650;
      if(target.includes(n)) score += 450;
      if(simple.includes(simplifiedTarget)) score += 420;
      if(simplifiedTarget.includes(simple)) score += 320;

      let matched = 0;
      wanted.forEach(t => {
        if(ptoks.includes(t)){ score += 120 + Math.min(t.length, 12); matched++; }
        else if(simple.includes(t)){ score += 65 + Math.min(t.length, 12); matched++; }
        else score -= 35;
      });
      ptoks.forEach(t => { if(simplifiedTarget.includes(t)) score += 12; });

      const strong = wanted.filter(t => /^(RON|BRUGAL|BARCELO|BARCELO|WHISKY|WISKI|DYC|JHONY|JOHNY|WALKER|JB|BEEFEATER|LARIOS|PUERTO|INDIAS|GINEBRA|GIN|SPRITE|FANTA|COCA|COLA|ZERO|SKOL|MAHOU|AMBAR|SCHWEPPES|KAS|BITTER|BEETER|AOVE|ACEITE|VINAGRE|PAPEL|HIGIENICO|SECAMANOS|JABON|FAIRY|AMBIENTADOR|VELADORES|ANCHOAS|MEJILLONES|QUESO|JAMON|SALMON|CAFE|DESCAFEINADO|AGUA|BAICON|CHULETA|OREJA)$/.test(t));
      if(strong.length && !strong.some(t => simple.includes(t))) score -= 700;
      if(matched === 0) score -= 1000;
      score -= Math.abs(simple.length - simplifiedTarget.length) * 0.12;

      if(score > bestScore){ second = bestScore; bestScore = score; best = p; }
      else if(score > second){ second = score; }
    });
    if(best && bestScore >= 180 && bestScore - second >= 24) return best;
    if(best && bestScore >= 360) return best;
    return null;
  }
  function normalizeProductSearchKeyHf24(value){
    return normalizeText(value || '')
      .replace(/\bWISKI\b/g,'WHISKY')
      .replace(/\bWHISKI\b/g,'WHISKY')
      .replace(/\bJOHNY\b/g,'JHONY')
      .replace(/\bJOHNNY\b/g,'JHONY')
      .replace(/\bJOHNNIE\b/g,'JHONY')
      .replace(/\bJONIE\b/g,'JHONY')
      .replace(/\bJ\s*B\b/g,'JB')
      .replace(/\bBEETER\b/g,'BITTER')
      .replace(/\bLAVAMANOS\b/g,'MANOS')
      .replace(/\bBTLLA\b/g,'BOTELLA')
      .replace(/\bBTELLA\b/g,'BOTELLA')
      .replace(/\bBOT\s+1\s+5\b/g,'BOTELLA 1 5')
      .replace(/\bAÑEJO\b/g,'ANEJO')
      .replace(/\s+/g,' ')
      .trim();
  }
  function simplifyProductSearchKeyHf24(value){
    return normalizeProductSearchKeyHf24(value)
      .replace(/\b(?:BOTELLA|BOTELLAS|LATA|LATAS|BOTE|BOTES|BOLSA|BOLSAS|PACK|PACKS|PAQUETE|PAQUETES|CAJA|PIEZA|UD|UDS|UNIDAD|UNIDADES|BARRIL|BARRILES|KG|GR|L|CL|ML|LITRO|LITROS)\b/g,' ')
      .replace(/\b\d+(?:[,.]\d+)?\b/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }
  function planProductAliasKeyHf24(value){
    const n = normalizeProductSearchKeyHf24(value || '');
    const s = simplifyProductSearchKeyHf24(value || '');
    const has = (...parts) => parts.every(part => n.includes(normalizeProductSearchKeyHf24(part)));
    const hasS = (...parts) => parts.every(part => s.includes(normalizeProductSearchKeyHf24(part)));
    const tok = t => new RegExp('(^|\\s)' + normalizeProductSearchKeyHf24(t) + '(\\s|$)').test(n);

    if(has('COCA','COLA','ZERO') && (has('ZERO ZERO') || /ZERO\s+ZERO/.test(n))) return 'alias coca cola zero zero';
    if(has('COCA','COLA','ZERO')) return 'alias coca cola zero';
    if(has('COCA','COLA')) return 'alias coca cola normal';
    if(has('FANTA','NARANJA')) return 'alias fanta naranja';
    if(has('FANTA','LIMON')) return 'alias fanta limon';
    if(has('SPRITE')) return 'alias sprite';
    if(has('CERVEZA','SKOL')) return 'alias cerveza skol';
    if(has('TONICA','SCHWEPPES')) return 'alias tonica schweppes';
    if(has('BITTER','KAS')) return 'alias bitter kas';

    if(has('RON','BARCELO')) return 'alias ron barcelo';
    if(has('RON','BRUGAL')) return 'alias ron brugal';
    if(hasS('WHISKY') && (tok('JB') || has('5','AÑOS') || has('5','ANOS'))) return 'alias whisky jb';
    if(hasS('WHISKY') && hasS('DYC')) return 'alias whisky dyc';
    if(hasS('WHISKY') && (hasS('JHONY') || hasS('WALKER'))) return 'alias whisky walker';
    if((hasS('GINEBRA') || hasS('GIN')) && hasS('PUERTO','INDIAS')) return 'alias ginebra puerto indias';
    if((hasS('GINEBRA') || hasS('GIN')) && hasS('LARIOS')) return 'alias ginebra larios';
    if((hasS('GINEBRA') || hasS('GIN')) && hasS('BEEFEATER')) return 'alias ginebra beefeater';

    if(hasS('ACEITE','AOVE') || hasS('AOVE')) return 'alias aceite aove';
    if(hasS('VINAGRE')) return 'alias vinagre';
    if(hasS('AGUA') && (has('1L') || has('1 L') || hasS('CRISTAL'))) return 'alias agua 1l cristal';
    if(hasS('BAICON') || hasS('BACON')) return 'alias baicon';
    if(hasS('CHULETA','CERDO')) return 'alias chuleta cerdo';
    if(hasS('FAIRY')) return 'alias fairy';
    if(hasS('PAPEL','HIGIENICO')) return 'alias papel higienico';
    if(hasS('ROLLO','SECAMANOS') || hasS('PAPEL','SECAMANOS')) return 'alias rollo secamanos';
    if(hasS('BOLSAS','BASURA') || hasS('BOLSA','BASURA')) return 'alias bolsas basura grandes';
    if(hasS('JABON','MANOS') || hasS('JABON','LAVAMANOS')) return 'alias jabon manos';
    if(hasS('AMBIENTADOR')) return 'alias ambientador';

    if(hasS('CAFE','DESCAFEINADO')) return 'alias cafe descafeinado gorritas';
    if(hasS('CAFE','NORMAL')) return 'alias cafe normal gorritas';
    if(hasS('VINO','BLANCO')) return 'alias vino blanco';
    if(hasS('VINO','FRIZZANTE')) return 'alias vino frizzante';
    if(hasS('VINO','TINTO','RIOJA')) return 'alias vino tinto rioja';
    if(hasS('VINO','TINTO')) return 'alias vino tinto';
    if(hasS('OREJA','SALSA')) return 'alias oreja en salsa';
    return n;
  }
  function canonicalProposalProductId(row){
    return String(row?.productId || resolveCatalogProductByName(row?.productName || '')?.id || '');
  }
  function isTinyGhostDonation(row){
    if(String(row?.tipo || '').toUpperCase() !== 'DONACION') return false;
    if(row?.explicitPromptDonation === true) return false;
    return Number(row?.unidades || 0) > 0 && Number(row?.unidades || 0) <= 0.05;
  }
  function normalizeProposalRowsForGroups(list){
    const base = (Array.isArray(list) ? list : []).map(row => ({...row}));
    base.forEach(row => {
      const resolvedId = canonicalProposalProductId(row);
      if(resolvedId && !row.productId){
        const p = byId('productos', resolvedId) || resolveCatalogProductByName(row.productName || '');
        row.productId = resolvedId;
        if(p){
          row.productName = p.nombre || row.productName;
          row.segmento = p.segmento || row.segmento;
          row.destino = p.destino || row.destino;
        }
      }
      if(isTinyGhostDonation(row) || isSuppressedAutoDonation(row)){ row.include = false; row.__ceSuppressedDonation = true; }
    });
    const prev = lastProposal;
    try{
      lastProposal = base;
      const groups = planResourceRows(base);
      groups.forEach(group => {
        const includeGroup = !!group.include;
        group.allIndices.forEach(idx => {
          const row = base[idx];
          if(!row) return;
          row.include = includeGroup && !(isTinyGhostDonation(row));
          if(group.productId){
            row.productId = group.productId;
            row.productName = group.producto || row.productName;
            row.segmento = group.segmento || row.segmento;
            row.destino = group.destino || row.destino;
          }
        });
        const purchases = group.purchaseIndices.map(idx => ({idx, row:base[idx]})).filter(x => x.row);
        purchases.sort((a,b)=>a.idx-b.idx);
        purchases.forEach((item, pos) => {
          if(item.row.__ceSuppressedManualPurchase && Number(item.row.unidades || 0) <= 0){
            item.row.unidades = 0;
            item.row.include = false;
            item.row.necesidadTotal = Number(group.necesidad || 0) || item.row.necesidadTotal;
            return;
          }
          item.row.unidades = pos === 0 ? Math.max(0, Number(group.compra || 0)) : 0;
          item.row.include = pos === 0 ? (includeGroup && Number(group.compra || 0) > 0) : false;
          item.row.necesidadTotal = Number(group.necesidad || 0) || item.row.necesidadTotal;
          if(group.productId){
            item.row.productId = group.productId;
            item.row.productName = group.producto || item.row.productName;
            item.row.segmento = group.segmento || item.row.segmento;
            item.row.destino = group.destino || item.row.destino;
          }
        });
        const donationSeen = new Map();
        group.donationIndices.forEach(idx => {
          const row = base[idx]; if(!row) return;
          const donor = normalizeDonorRef(row.donorRef || '');
          const ticket = String(row.ticketDonacion || '').toUpperCase();
          const key = `${group.productId || group.key}|${donor}|${ticket}`;
          const weight = String(row.key || '').includes('hf19') ? 10000 : (row.explicitPromptStrictHf12 ? 1000 : 0);
          const prev = donationSeen.get(key);
          if(!prev || weight > prev.weight || (weight === prev.weight && idx > prev.idx)){
            donationSeen.set(key, {idx, weight});
          }
        });
        const keepDonationIdx = new Set([...donationSeen.values()].map(x => x.idx));
        group.donationIndices.forEach(idx => {
          const row = base[idx]; if(!row) return;
          if(!keepDonationIdx.has(idx)){
            row.include = false;
            row.__ceSuppressedDonation = true;
            return;
          }
          row.include = includeGroup;
          row.necesidadTotal = Number(group.necesidad || 0) || row.necesidadTotal;
          if(group.productId){
            row.productId = group.productId;
            row.productName = group.producto || row.productName;
            row.segmento = group.segmento || row.segmento;
            row.destino = group.destino || row.destino;
          }
        });
      });
    }finally{
      lastProposal = prev;
    }
    return base;
  }
  function planProductOptions(selected, fallbackName){
    const current = String(selected || '');
    const cleanFallback = String(fallbackName || '').trim();
    const products = rows('productos').slice().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
    const hasCurrent = current && products.some(p => String(p.id) === current);
    const emptyLabel = cleanFallback || '-- producto sin catálogo --';
    const extraCurrent = current && !hasCurrent ? `<option value="${esc(current)}" selected>${esc(emptyLabel)}</option>` : '';
    const opts = products.map(p => `<option value="${esc(p.id)}" ${String(p.id)===current?'selected':''}>${esc(p.nombre || 'Producto')}</option>`).join('');
    return `<option value="" ${!current?'selected':''}>${esc(emptyLabel)}</option>${extraCurrent}${opts}`;
  }
  function sortPlanResourceRows(list){
    const mode = String(planResourceOrderMode || 'PRODUCTO').toUpperCase();
    const arrRows = Array.isArray(list) ? list.slice() : [];
    const storeOfRow = row => tiendaName(row?.tiendaId || row?.purchaseDetails?.[0]?.tiendaId || '') || 'Sin tienda';
    if(mode === 'SEGMENTO_DESTINO'){
      return arrRows.sort((a,b)=>String(a.segmento||'').localeCompare(String(b.segmento||''),'es') || String(a.destino||'').localeCompare(String(b.destino||''),'es') || String(a.producto||'').localeCompare(String(b.producto||''),'es') || storeOfRow(a).localeCompare(storeOfRow(b),'es'));
    }
    if(mode === 'TIENDA'){
      return arrRows.sort((a,b)=>storeOfRow(a).localeCompare(storeOfRow(b),'es') || String(a.producto||'').localeCompare(String(b.producto||''),'es') || String(a.segmento||'').localeCompare(String(b.segmento||''),'es') || String(a.destino||'').localeCompare(String(b.destino||''),'es'));
    }
    return arrRows.sort((a,b)=>String(a.producto||'').localeCompare(String(b.producto||''),'es') || String(a.segmento||'').localeCompare(String(b.segmento||''),'es') || String(a.destino||'').localeCompare(String(b.destino||''),'es') || storeOfRow(a).localeCompare(storeOfRow(b),'es'));
  }
  function sortPlanProposalDetailCards(list){
    const arrRows = Array.isArray(list) ? list.slice() : [];
    const mode = String(planResourceOrderMode || 'PRODUCTO').toUpperCase();
    return arrRows.sort((a,b) => {
      const pa = a?.p || {}, pb = b?.p || {};
      const ta = tiendaName(pa.tiendaId || '') || 'Sin tienda';
      const tb = tiendaName(pb.tiendaId || '') || 'Sin tienda';
      if(mode === 'SEGMENTO_DESTINO'){
        return String(pa.segmento||'').localeCompare(String(pb.segmento||''),'es') || String(pa.destino||'').localeCompare(String(pb.destino||''),'es') || String(pa.productName||'').localeCompare(String(pb.productName||''),'es') || String(pa.tipo||'').localeCompare(String(pb.tipo||''),'es') || ta.localeCompare(tb,'es');
      }
      if(mode === 'TIENDA'){
        return ta.localeCompare(tb,'es') || String(pa.productName||'').localeCompare(String(pb.productName||''),'es') || String(pa.segmento||'').localeCompare(String(pb.segmento||''),'es') || String(pa.destino||'').localeCompare(String(pb.destino||''),'es') || String(pa.tipo||'').localeCompare(String(pb.tipo||''),'es');
      }
      return String(pa.productName||'').localeCompare(String(pb.productName||''),'es') || String(pa.segmento||'').localeCompare(String(pb.segmento||''),'es') || String(pa.destino||'').localeCompare(String(pb.destino||''),'es') || String(pa.tipo||'').localeCompare(String(pb.tipo||''),'es') || ta.localeCompare(tb,'es');
    });
  }
  function planDeficitUnits(productName, deficit){
    return roundPurchaseUnits(productName, deficit);
  }
  function planSegDestToken(row){ return `${up(row?.segmento || '')}__${up(row?.destino || '')}`; }
  function planSegDestClass(row){
    if(String(planResourceOrderMode || '').toUpperCase() !== 'SEGMENTO_DESTINO') return '';
    const map = {
      'COMIDA__APERITIVO':'plan-sd-comida-aperitivo',
      'COMIDA__COMIDA':'plan-sd-comida-comida',
      'COMIDA__CENA':'plan-sd-comida-cena',
      'BEBIDA__APERITIVO':'plan-sd-bebida-aperitivo',
      'BEBIDA__COMIDA':'plan-sd-bebida-comida',
      'BEBIDA__CENA':'plan-sd-bebida-cena',
      'BEBIDA__CUBATAS':'plan-sd-bebida-cubatas',
      'INFRAESTRUCTURA__APERITIVO':'plan-sd-infra-aperitivo',
      'INFRAESTRUCTURA__COMIDA':'plan-sd-infra-comida',
      'INFRAESTRUCTURA__CUBATAS':'plan-sd-infra-cubatas',
      'INFRAESTRUCTURA__CENA':'plan-sd-infra-cena',
      'INFRAESTRUCTURA__INFRAESTRUCTURA':'plan-sd-infra-infra'
    };
    return map[planSegDestToken(row)] || 'plan-sd-rara';
  }
  function planResourceBadgeText(row){
    const buy = Math.max(0, Number(row?.compra || 0));
    const need = Math.max(0, Number(row?.necesidad || 0));
    if(need <= 0 && buy <= 0) return 'Excluido inicialmente de compra';
    return `${row?.segmento || 'Sin segmento'} - ${row?.destino || 'Sin destino'}`;
  }


  // HOTFIX9: rescate de donaciones. En Zuzu no se aceptan donaciones inventadas.
  // Regla: donación fija del prompt + compra solo por déficit.
  function currentPromptText(){
    try{ return String(document.getElementById('planInfo')?.value || ''); }catch(_){ return ''; }
  }
  function isZuzuPlanningMode(){
    const m = String(planMode() || '').toUpperCase();
    return m === 'ZUZU_TOTAL' || m === 'ZUZU_PARCIAL';
  }
  function tokenList(value){ return normalizeText(value || '').split(/\s+/).filter(Boolean); }
  function meaningfulTokens(value, kind){
    const generic = new Set(['DONADO','SOCIO','SOCIOS','TIENDA','TIENDAS','OTROS','GASTOS','PTE','COMPRA','COMPRAS','CERVEZA','CERVEZAS','COCA','COLA','FANTA','SPRITE','TONICA','AQUARIUS','ACUARIUS','REFRESCO','REFRESCOS','LATA','LATAS','BOTE','BOTES','BOTELLA','BOTELLAS','BOTELLIN','BOTELLINES','PACK','PAQUETE','UNIDAD','UNIDADES','UD','UDS','LITRO','LITROS','KILO','KILOS','GRAMO','GRAMOS','CL','ML','KG','GR','CON','SIN','NORMAL','GRANDE','GRANDES','PEQUENO','PEQUENOS','EL','LA','LOS','LAS','DE','DEL','Y','E','EN','POR','PARA','UN','UNA','UNO','DOS','TRES']);
    const toks = tokenList(value).filter(t => t.length >= 2 && !generic.has(t));
    return kind === 'donor' ? toks.filter(t => t.length >= 3) : toks;
  }
  function productMentionInText(productName, textNorm){
    const pn = normalizeText(productName || '');
    if(!pn || !textNorm) return false;
    if(textNorm.includes(pn)) return true;
    const has = (...parts) => parts.every(part => pn.includes(part));
    const txtHas = (...parts) => parts.every(part => textNorm.includes(part));
    if(has('PAPEL','HIGIENICO') && txtHas('PAPEL','HIGIENICO')) return true;
    if(has('PAPEL') && (pn.includes('SECAMANOS') || pn.includes('SECAMAN')) && txtHas('PAPEL') && (textNorm.includes('SECAMANOS') || textNorm.includes('SECAMAN'))) return true;
    if(has('BOLSAS','BASURA') && txtHas('BOLSAS','BASURA')) return true;
    if(pn.includes('ANCHOA') && textNorm.includes('ANCHOA')) return true;
    if(pn.includes('BARRIL') && textNorm.includes('BARRIL')){
      const brands = meaningfulTokens(productName).filter(t => t !== 'BARRIL');
      if(!brands.length || brands.some(t => textNorm.includes(t))) return true;
    }
    const sig = meaningfulTokens(productName);
    if(!sig.length) return false;
    const hits = sig.filter(t => textNorm.includes(t)).length;
    if(sig.length <= 2) return hits === sig.length;
    return hits >= Math.min(3, sig.length);
  }
  function productAnchorTokens(productName){
    const pn = normalizeText(productName || '');
    const sig = meaningfulTokens(productName);
    const preferred = sig.filter(t => /SKOL|AMSTEL|MAHOU|ALHAMBRA|CRUZCAMPO|ZERO|ANCHOA|HIGIENICO|SECAMANOS|SECAMAN|BASURA|BARRIL|AOVE|WHISKY|WISKI|RON|GIN|GINEBRA|JABON|HIELO/.test(t));
    if(preferred.length) return preferred;
    if(pn.includes('PAPEL') && pn.includes('HIGIENICO')) return ['PAPEL','HIGIENICO'];
    if(pn.includes('BOLSAS') && pn.includes('BASURA')) return ['BOLSAS','BASURA'];
    return sig.slice(0,3);
  }
  function donorNearProductInPrompt(row){
    const prompt = normalizeText(currentPromptText());
    if(!prompt) return false;
    const product = row?.productName || productName(row) || '';
    if(!productMentionInText(product, prompt)) return false;
    const donor = donorLabel(row?.donorRef || '');
    const donorTokens = meaningfulTokens(donor, 'donor');
    if(!donorTokens.length) return true;
    const allDonorTokenSets = donorOptions().map(d => meaningfulTokens(d.label, 'donor')).filter(toks => toks.length);
    const anchors = productAnchorTokens(product).filter(Boolean);
    if(!anchors.length) return donorTokens.some(t => prompt.includes(t));
    const lastBefore = (tokens, pos) => Math.max(...tokens.map(t => prompt.lastIndexOf(t, pos)).filter(i => i >= 0), -1);
    for(const anchor of anchors){
      let pos = prompt.indexOf(anchor);
      while(pos >= 0){
        const ownLast = lastBefore(donorTokens, pos);
        const otherLast = Math.max(...allDonorTokenSets.filter(toks => toks.join('|') !== donorTokens.join('|')).map(toks => lastBefore(toks, pos)), -1);
        if(ownLast >= 0 && ownLast >= otherLast && (pos - ownLast) <= 1200) return true;
        const chunk = prompt.slice(Math.max(0, pos - 260), Math.min(prompt.length, pos + 260));
        if(donorTokens.some(t => chunk.includes(t))) return true;
        pos = prompt.indexOf(anchor, pos + anchor.length);
      }
    }
    return false;
  }
  function promptDonationQuantity(row){
    const prompt = normalizeText(currentPromptText());
    if(!prompt) return null;
    const product = row?.productName || productName(row) || '';
    const donor = donorLabel(row?.donorRef || '');
    const donorTokens = meaningfulTokens(donor, 'donor');
    const anchors = productAnchorTokens(product).filter(Boolean);
    const numsFromChunk = chunk => {
      const nums = [];
      const re = /(?:^|\s)(\d+(?:[,.]\d+)?)(?=\s|$)/g;
      let m;
      while((m = re.exec(chunk))){
        const n = parseNum(m[1]);
        if(Number.isFinite(n) && n > 0) nums.push(n);
      }
      return nums;
    };
    let best = null;
    for(const anchor of anchors){
      let pos = prompt.indexOf(anchor);
      while(pos >= 0){
        const chunk = prompt.slice(Math.max(0, pos - 170), Math.min(prompt.length, pos + 170));
        if(!donorTokens.length || donorTokens.some(t => chunk.includes(t))){
          const after = prompt.slice(pos, Math.min(prompt.length, pos + 120));
          const nums = numsFromChunk(after);
          if(nums.length) best = nums[nums.length - 1];
        }
        pos = prompt.indexOf(anchor, pos + anchor.length);
      }
    }
    return best;
  }
  function isSuppressedAutoDonation(row){
    if(String(row?.tipo || '').toUpperCase() !== 'DONACION') return false;
    // HOTFIX29: lo que viene del diagnóstico/prompt ya está confirmado; no lo vuelve a filtrar
    // el sistema antiguo donorNearProductInPrompt, que era el que perdía muchas donaciones.
    if(row?.explicitPromptDonation === true || row?.__ceHf27DiagnosticTruth === true || row?.__ceHf29DiagnosticTruth === true) return false;
    if(isTinyGhostDonation(row)) return true;
    if(!isZuzuPlanningMode()) return false;
    if(!normalizeDonorRef(row?.donorRef || '')) return true;
    return !donorNearProductInPrompt(row);
  }
  function planResourceRows(proposals){
    const map = new Map();
    const donationQuotaUsed = new Map();
    (Array.isArray(proposals) ? proposals : []).forEach((p, idx) => {
      if(!p || isTinyGhostDonation(p)) return;
      const suppressedDonation = isSuppressedAutoDonation(p);
      const resolvedProductId = canonicalProposalProductId(p);
      const catalogProduct = resolvedProductId ? byId('productos', resolvedProductId) || resolveCatalogProductByName(p.productName || '') : null;
      const canonicalName = catalogProduct?.nombre || p.productName || 'Producto';
      const canonicalSegmento = catalogProduct?.segmento || p.segmento || '';
      const canonicalDestino = catalogProduct?.destino || p.destino || '';
      const key = resolvedProductId ? `id:${String(resolvedProductId)}` : `nm:${planGroupKey(canonicalName || `producto-${idx}`)}::${up(canonicalSegmento)}::${up(canonicalDestino)}`;
      const row = map.get(key) || {
        key, producto: canonicalName, productId:resolvedProductId || p.productId || '', segmento: canonicalSegmento, destino: canonicalDestino, necesidad:0,
        compra:0, donado:0, importeCompra:0, importeDonado:0, precioCompra:0, precioDonado:0,
        donantes:new Map(), compras:new Map(), purchaseIndices:[], donationIndices:[], allIndices:[], include:false,
        tiendaId:'', responsableId:'', donorRef:'', donationResponsableId:'', donationTicket:'', donationDetails:[], purchaseDetails:[]
      };
      // Si Zuzu o el catálogo traen el mismo artículo con nombres ligeramente distintos
      // (RON Barcelo / Ron BARCELÓ Añejo 0.7 L, WISKI JB / Whisky 5 Años J.B...),
      // se agrupa en una sola ficha y se conserva el nombre/código de catálogo más completo.
      const incomingName = String(canonicalName || p.productName || '').trim();
      if(incomingName && (p.productId || normalizeText(incomingName).length > normalizeText(row.producto).length)){
        row.producto = incomingName;
        row.segmento = canonicalSegmento || row.segmento;
        row.destino = canonicalDestino || row.destino;
      }
      if(resolvedProductId && (!row.productId || p.tipo === 'COMPRA' || String(row.productId) === String(resolvedProductId))) row.productId = resolvedProductId;
      row.allIndices.push(idx);
      if(p.include && !suppressedDonation) row.include = true;
      const tipoRow = String(p.tipo || '').toUpperCase();
      let units = Number(p.unidades || 0);
      if(tipoRow === 'COMPRA' && p.include === false && !p.__ceForceKeepPurchase){
        units = 0;
      }
      const quotaKey = `${key}|${String(p.donorRef || '')}|${String(p.ticketDonacion || '')}`;
      const isDiagnosticTruth = p?.explicitPromptDonation === true || p?.__ceHf27DiagnosticTruth === true || p?.__ceHf29DiagnosticTruth === true;
      const quota = (suppressedDonation || isDiagnosticTruth) ? null : promptDonationQuantity(p);
      if(tipoRow === 'DONACION' && quota !== null){
        const used = donationQuotaUsed.get(quotaKey) || 0;
        const available = Math.max(0, Number(quota || 0) - used);
        units = Math.min(Math.max(0, units), available);
        donationQuotaUsed.set(quotaKey, used + units);
        if(units <= 0){ p = {...p, include:false, __ceSuppressedDonation:true}; }
      }
      const importe = units * Number(p.precio || 0);
      const needHint = Number(p.necesidadTotal || p.necesidad || p.necesidadCalculada || 0);
      if(needHint > row.necesidad) row.necesidad = needHint;
      if(suppressedDonation || (tipoRow === 'DONACION' && units <= 0)){
        map.set(key, row);
        return;
      }
      if(tipoRow === 'DONACION'){
        const donorRef = normalizeDonorRef(p.donorRef || '');
        row.donado += units;
        row.importeDonado += importe;
        row.precioDonado = row.precioDonado || Number(p.precio || 0);
        row.donationIndices.push(idx);
        row.donorRef = row.donorRef || donorRef || '';
        row.donationResponsableId = row.donationResponsableId || p.responsableId || '';
        row.donationTicket = row.donationTicket || p.ticketDonacion || 'DONADO';
        const label = `${p.ticketDonacion || 'DONADO'} · ${donorLabel(donorRef)} · Resp. ${personaName(p.responsableId)}`;
        row.donantes.set(label, (row.donantes.get(label) || 0) + units);
        row.donationDetails.push({
          idx,
          unidades:units,
          precio:Number(p.precio || 0),
          importe,
          ticketDonacion:p.ticketDonacion || 'DONADO',
          donorRef:donorRef || '',
          responsableId:p.responsableId || '',
          donorLabel:donorLabel(donorRef),
          responsableLabel:personaName(p.responsableId)
        });
      }else{
        row.compra += units;
        row.importeCompra += importe;
        row.precioCompra = row.precioCompra || Number(p.precio || 0);
        row.purchaseIndices.push(idx);
        row.tiendaId = row.tiendaId || p.tiendaId || '';
        row.responsableId = row.responsableId || p.responsableId || '';
        const label = `${tiendaName(p.tiendaId)} · Resp. ${personaName(p.responsableId)}`;
        row.compras.set(label, (row.compras.get(label) || 0) + units);
        row.purchaseDetails.push({ idx, unidades:units, precio:Number(p.precio || 0), importe, tiendaId:p.tiendaId || '', responsableId:p.responsableId || '' });
      }
      if(!row.productId && resolvedProductId) row.productId = resolvedProductId;
      map.set(key, row);
    });
    const list = [...map.values()].map(row => {
      const hasExplicitDonation = (row.donationDetails || []).some(d => lastProposal[d.idx]?.explicitPromptDonation === true);
      // Si la donación viene explícita del prompt, una compra previa de Zuzu se toma como necesidad total
      // calculada, no como compra extra encima de lo donado. Anchoas donadas 1 + necesidad 2 => comprar 1.
      // HOTFIX30: la necesidad visible nunca puede ser menor que lo ya donado.
      // Se calcula como unidades donadas + unidades de compra real que queden.
      if(productAliasKeyHf25(row.producto || '') === 'alias:otras-compras-imprevistas'){
        return {...row, necesidad:1, compra:1, include:true};
      }
      const donated = Math.max(0, Number(row.donado || 0));
      const zuzuBuy = Math.max(0, Number(row.compra || 0));
      const hintedNeed = Math.max(0, Number(row.necesidad || 0));
      const manualNeedValues = (row.allIndices || [])
        .map(idx => lastProposal[idx])
        .filter(x => x && x.__ceHf40ManualNeedOverride === true)
        .map(x => Number(x.necesidadTotal ?? x.necesidad ?? x.necesidadCalculada ?? 0))
        .filter(v => Number.isFinite(v) && v >= 0);
      const manualNeed = manualNeedValues.length > 0;
      if(manualNeed){
        // HOTFIX43: la caja visible NECESIDAD CALCULADA manda. Si el usuario baja de 2 a 1
        // con 1 donado y 1 a comprar, no debe volver a 2 por arrastre de la línea de compra antigua.
        const chosenNeed = manualNeedValues.length ? Math.min(...manualNeedValues) : hintedNeed;
        const displayNeed = Math.round(Math.max(donated, chosenNeed) * 100) / 100;
        const nextCompra = planBuyAfterDonation(row.producto, displayNeed, donated);
        return {...row, necesidad: displayNeed, compra: nextCompra, include: row.include || nextCompra > 0 || donated > 0};
      }
      const rawNeed = Math.max(hintedNeed, donated + zuzuBuy, donated);
      const nextCompra = planBuyAfterDonation(row.producto, rawNeed, donated);
      const displayNeed = Math.round((donated + nextCompra) * 100) / 100;
      return {...row, necesidad: displayNeed, compra: nextCompra, include: row.include || nextCompra > 0 || donated > 0};
    });
    return sortPlanResourceRows(list);
  }
  function renderPlanResourceEditor(proposals){
    const rows = planResourceRows(proposals).filter(r => r && (r.include || Number(r.compra||0) > 0 || Number(r.donado||0) > 0));
    if(!rows.length) return '';
    const tiendaOpts = (selected) => `<option value="" ${!selected?'selected':''}>-- tienda compra --</option>` + tiendas().map(t => `<option value="${esc(t.id)}" ${String(t.id)===String(selected)?'selected':''}>${esc(t.nombre || 'Tienda')}</option>`).join('');
    const respOpts = (selected, label='-- responsable compra --') => `<option value="" ${!selected?'selected':''}>${esc(label)}</option>` + socios().map(s => `<option value="${esc(s.id)}" ${String(s.id)===String(selected)?'selected':''}>${esc(s.nombre || 'Socio')}</option>`).join('');
    const donorOpts = (selected) => {
      const value = String(selected || '');
      const list = donorOptions();
      const has = list.some(d => String(d.value) === value);
      const extra = value && !has ? `<option value="${esc(value)}" selected>${esc(donorLabel(value))}</option>` : '';
      return `<option value="" ${!value?'selected':''}>-- donante --</option>` + extra + list.map(d => `<option value="${esc(d.value)}" ${String(d.value)===value?'selected':''}>${esc(d.label)}</option>`).join('');
    };
    const donationRows = (r) => (Array.isArray(r.donationDetails) ? r.donationDetails : []).map((d, n) => {
      const imp = Number(d.unidades || 0) * Number(d.precio || 0);
      return `<div class="plan-resource-subrow plan-resource-donation-subrow" data-plan-donation-index="${esc(d.idx)}">
        <label>Unidades<input type="number" min="0" step="0.01" value="${esc(d.unidades || 0)}" data-plan-resource-field="donationUnits" data-plan-proposal-index="${esc(d.idx)}"/></label>
        <label>Precio<input type="number" min="0" step="0.01" value="${esc(d.precio || 0)}" data-plan-resource-field="donationPrecio" data-plan-proposal-index="${esc(d.idx)}"/></label>
        <span class="plan-resource-mini"><b>Importe</b><strong data-plan-donation-total="${esc(d.idx)}">${money(imp)}</strong></span>
        <span class="plan-resource-donation-badge">${esc(d.ticketDonacion || ('DONADO ' + (n + 1)))}</span>
        <label>Donante<select data-plan-resource-field="donorRef" data-plan-proposal-index="${esc(d.idx)}">${donorOpts(d.donorRef)}</select></label>
        <label>Responsable<select data-plan-resource-field="donationResponsableId" data-plan-proposal-index="${esc(d.idx)}">${respOpts(d.responsableId, '-- responsable donación --')}</select></label>
      </div>`;
    }).join('');
    const purchaseRow = (r, buyBase, price) => buyBase > 0 ? `<div class="plan-resource-subrow plan-resource-purchase-subrow">
        <label>A comprar<input type="number" min="0" step="0.01" value="${esc(buyBase)}" data-plan-resource-field="compra"/></label>
        <label>Precio<input type="number" min="0" step="0.01" value="${esc(price)}" data-plan-resource-field="precio"/></label>
        <span class="plan-resource-mini"><b>Importe</b><strong data-plan-purchase-total>${money(buyBase * price)}</strong></span>
        <label>Tienda<select data-plan-resource-field="tiendaId">${tiendaOpts(r.tiendaId || document.getElementById('planTienda')?.value || '') || '<option value="">Sin tiendas</option>'}</select></label>
        <label>Responsable<select data-plan-resource-field="responsableId">${respOpts(r.responsableId || document.getElementById('planResponsable')?.value || '') || '<option value="">Sin socios</option>'}</select></label>
      </div>` : '';
    const tr = rows.map(r => {
      const buyBase = Math.max(0, Number(r.compra || 0));
      const price = Number(r.precioCompra || r.precioDonado || 0);
      const rowClass = ['plan-resource-edit-row', r.include ? '' : 'excluded', planSegDestClass(r)].filter(Boolean).join(' ');
      const badgeText = planResourceBadgeText({...r, compra:buyBase});
      const donations = donationRows(r);
      const purchase = purchaseRow(r, buyBase, price);
      const empty = (!donations && !purchase) ? '<div class="plan-resource-empty-flow">Sin donación ni compra prevista.</div>' : '';
      return `<tr class="${rowClass}" data-plan-resource-key="${esc(r.key)}" data-plan-product-name="${esc(normalizeText(r.producto))}">
        <td class="plan-resource-general">
          <div class="plan-resource-general-top">
            <label class="plan-include plan-include-icon"><input type="checkbox" data-plan-resource-field="include" ${r.include ? 'checked' : ''}/><span aria-hidden="true">✓</span></label>
            <label class="plan-need-large"><span>Necesidad calculada</span><input type="number" min="0" step="0.01" value="${esc(r.necesidad)}" data-plan-resource-field="necesidad"/></label>
          </div>
          <select class="plan-resource-product-select" data-plan-resource-field="productId" aria-label="Producto">${planProductOptions(r.productId, r.producto)}</select>
          <div class="plan-resource-meta"><b>Segmento / destino</b><span data-plan-resource-meta>${esc((r.segmento || 'Sin segmento') + ' · ' + (r.destino || 'Sin destino'))}</span></div>
        </td>
        <td class="plan-resource-flow">${donations}${purchase}${empty}</td>
      </tr>`;
    }).join('');
    return `<div class="plan-resource-editor-card" id="planResourceEditor">
      <div class="section-title tiny-title plan-resource-title"><div><h3>PROPUESTA DETALLADA DEL EVENTO</h3><p>Revisa necesidad, donaciones y compra del déficit. El producto se elige solo desde el desplegable, ya preseleccionado con el nombre detectado.</p></div><div class="plan-resource-order-actions"><input id="planBuscarRecurso" type="search" placeholder="Buscar producto, segmento, destino, tienda..." autocomplete="off"/><button type="button" class="outline" id="btnPlanBuscarRecurso">Buscar</button><button type="button" class="outline ${String(planResourceOrderMode || 'PRODUCTO').toUpperCase()==='PRODUCTO'?'active':''}" id="btnPlanOrdenProducto">Orden producto</button><button type="button" class="outline ${String(planResourceOrderMode || '').toUpperCase()==='SEGMENTO_DESTINO'?'active':''}" id="btnPlanOrdenSegmentoDestino">Orden segmento/destino</button><button type="button" class="outline ${String(planResourceOrderMode || '').toUpperCase()==='TIENDA'?'active':''}" id="btnPlanOrdenTienda">Orden tienda/producto</button></div></div>
      <div class="table-scroll"><table class="ce-table plan-resource-edit-table plan-resource-split-table">
        <thead><tr><th>Ficha general del producto</th><th>Donaciones y compras que se crearán</th></tr></thead>
        <tbody>${tr}</tbody>
      </table></div>
    </div>`;
  }
  function renderPlanResourceVision(proposals){ return renderPlanResourceEditor(proposals); }
  function injectPlanHotfixStyle(){
    if(document.getElementById('cePlanNoMoveStyle')) return;
    const st = document.createElement('style');
    st.id = 'cePlanNoMoveStyle';
    st.textContent = `
      .plan-resource-edit-row.plan-row-changed{outline:4px solid rgba(245,158,11,.75)!important;box-shadow:0 0 0 6px rgba(245,158,11,.18)!important;background:#fffbeb!important;scroll-margin:120px!important}
      .plan-resource-edit-row.plan-found{outline:4px solid rgba(37,99,235,.75)!important;box-shadow:0 0 0 6px rgba(37,99,235,.16)!important}
      .plan-resource-product-select{margin-top:6px!important;width:100%!important;min-width:120px!important;max-width:100%!important;font-weight:950!important;font-size:15px!important;background:#fff!important;color:#111827!important}
      .plan-resource-excluded-label{display:inline-block;margin-top:5px;padding:3px 7px;border-radius:999px;background:#f3f4f6;color:#6b7280;font-style:normal;font-weight:800;font-size:11px}
      .plan-donation-line{display:block;line-height:1.25}.plan-muted{color:#64748b;font-weight:700}
      .plan-resource-title{gap:12px!important;align-items:flex-start!important}.plan-resource-order-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;align-items:center}.plan-resource-order-actions input{min-width:190px!important;max-width:260px!important;padding:8px 10px!important;border-radius:12px!important;border:1px solid #cbd5e1!important}.plan-resource-order-actions button{white-space:nowrap}.plan-resource-order-actions button.active,.plan-resource-order-actions button.plan-order-active{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important;box-shadow:0 0 0 3px rgba(15,23,42,.16)!important}.plan-resource-order-actions button.active{background:#dbeafe!important;border-color:#2563eb!important;color:#0f172a!important;box-shadow:0 0 0 2px rgba(37,99,235,.16) inset!important}
      .plan-resource-split-table{table-layout:fixed!important;width:100%!important}.plan-resource-split-table th:first-child,.plan-resource-split-table td:first-child{width:30%!important}.plan-resource-split-table th:last-child,.plan-resource-split-table td:last-child{width:70%!important}
      .plan-resource-general{vertical-align:top!important;padding:10px!important}.plan-resource-general-top{display:grid!important;grid-template-columns:auto minmax(82px,105px)!important;gap:10px!important;align-items:center!important;margin-bottom:8px!important}.plan-include-icon{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:42px!important;height:42px!important;border-radius:14px!important;background:rgba(255,255,255,.84)!important;border:2px solid rgba(17,24,39,.25)!important}.plan-include-icon input{width:22px!important;height:22px!important}.plan-include-icon span{display:none!important}.plan-need-large{display:grid!important;gap:3px!important;font-size:11px!important;font-weight:950!important;text-transform:uppercase!important;color:#111827!important}.plan-need-large input{font-size:20px!important;font-weight:950!important;text-align:center!important;padding:7px 8px!important;border-radius:12px!important;max-width:105px!important}.plan-resource-product-label{display:block!important;font-size:16px!important;line-height:1.2!important;margin:7px 0 4px!important}.plan-resource-meta{display:grid!important;gap:2px!important;margin-top:6px!important;color:#334155!important}.plan-resource-meta b{font-size:10px!important;letter-spacing:.06em!important}.plan-resource-meta span{font-size:12px!important;font-weight:850!important}
      .plan-resource-flow{vertical-align:top!important;padding:8px!important}.plan-resource-subrow{display:grid!important;grid-template-columns:62px 76px 88px minmax(118px,150px) minmax(190px,1.6fr) minmax(190px,1.6fr)!important;gap:7px!important;align-items:end!important;margin:4px 0!important;padding:8px!important;border-radius:14px!important;border:1px solid rgba(17,24,39,.14)!important;background:rgba(255,255,255,.8)!important}.plan-resource-subrow label{display:grid!important;gap:3px!important;font-size:10px!important;font-weight:950!important;text-transform:uppercase!important;color:#334155!important}.plan-resource-subrow input,.plan-resource-subrow select{width:100%!important;min-width:0!important;padding:7px 8px!important;border-radius:10px!important}.plan-resource-mini{display:grid!important;gap:3px!important;font-size:10px!important;text-transform:uppercase!important;font-weight:950!important;color:#334155!important}.plan-resource-mini strong{font-size:13px!important;color:#111827!important}.plan-resource-donation-subrow{background:#fbbf24!important;border-color:#d97706!important;color:#111827!important}.plan-resource-purchase-subrow{background:#fca5a5!important;border-color:#f87171!important;color:#111827!important;grid-template-columns:86px 78px 94px minmax(210px,1.5fr) minmax(200px,1.4fr)!important}.plan-resource-donation-badge{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:35px!important;padding:5px 8px!important;border-radius:999px!important;background:#d97706!important;color:#fff!important;font-size:11px!important;font-weight:950!important;text-align:center!important}.plan-resource-empty-flow{font-weight:900;color:#64748b;padding:12px;border:1px dashed #cbd5e1;border-radius:12px;background:rgba(255,255,255,.65)}
      .plan-product-card{padding:7px 8px!important;border-radius:12px!important}.plan-product-head{margin-bottom:4px!important;gap:7px!important}.plan-product-title strong{font-size:14px!important;line-height:1.05!important}.plan-product-title span{font-size:11px!important;line-height:1.05!important}.plan-confidence{padding:2px 6px!important;font-size:11px!important}.plan-include{font-size:12px!important}.plan-product-grid.replica-grid{display:grid!important;grid-template-columns:repeat(6,minmax(95px,1fr))!important;gap:6px!important}.plan-product-grid.replica-grid .field{gap:2px!important}.plan-product-grid.replica-grid label{font-size:11px!important;line-height:1.05!important}.plan-product-grid.replica-grid input,.plan-product-grid.replica-grid select{min-height:34px!important;padding:6px 8px!important;border-radius:10px!important;font-size:13px!important}.plan-reason{display:none!important}.plan-product-card.plan-donation-card{background:#fbbf24!important;border-color:#d97706!important;color:#111827!important}.plan-product-card.plan-purchase-card{background:#fca5a5!important;border-color:#f87171!important;color:#111827!important}.plan-product-card.plan-donation-card strong,.plan-product-card.plan-donation-card span,.plan-product-card.plan-donation-card label,.plan-product-card.plan-donation-card .plan-reason{color:#111827!important}.plan-product-card.plan-purchase-card strong,.plan-product-card.plan-purchase-card span,.plan-product-card.plan-purchase-card label,.plan-product-card.plan-purchase-card .plan-reason{color:#111827!important}.plan-product-card.plan-donation-card input,.plan-product-card.plan-donation-card select,.plan-product-card.plan-purchase-card input,.plan-product-card.plan-purchase-card select{background:#fff!important;color:#111827!important}.plan-product-card.plan-donation-card .plan-confidence{background:rgba(255,255,255,.35)!important;color:#111827!important;border-color:rgba(17,24,39,.18)!important}.plan-product-card.plan-purchase-card .plan-confidence{background:rgba(255,255,255,.45)!important;color:#111827!important;border-color:rgba(17,24,39,.20)!important}
      .plan-resource-edit-table{border-collapse:separate!important;border-spacing:0 4px!important}.plan-resource-edit-row>td{border-top:2px solid rgba(17,24,39,.72)!important;border-bottom:2px solid rgba(17,24,39,.72)!important}.plan-resource-edit-row>td:first-child{border-left:2px solid rgba(17,24,39,.72)!important;border-radius:10px 0 0 10px}.plan-resource-edit-row>td:last-child{border-right:2px solid rgba(17,24,39,.72)!important;border-radius:0 10px 10px 0}.plan-resource-edit-row.plan-row-changed>td{border-color:#92400e!important}.plan-factory-indicator{display:flex!important;align-items:center!important;gap:12px!important;margin:10px 0 14px!important;padding:12px 14px!important;border-radius:18px!important;background:linear-gradient(135deg,#fff7ed,#fffbeb)!important;border:1px solid #fdba74!important;color:#7c2d12!important;box-shadow:0 10px 22px rgba(245,158,11,.15)!important}.plan-factory-indicator strong{display:block!important;font-size:15px!important}.plan-factory-indicator small{display:block!important;margin-top:2px!important;color:#9a3412!important;font-weight:700!important}.plan-factory-icon{font-size:28px!important;animation:cePlanPartyBounce 1.2s ease-in-out infinite}.plan-factory-dots{display:inline-flex!important;gap:6px!important;margin-left:auto!important;align-self:center!important}.plan-factory-dots i{display:block!important;width:9px!important;height:9px!important;border-radius:999px!important;background:#f59e0b!important;animation:cePlanPartyPulse 1s ease-in-out infinite}.plan-factory-dots i:nth-child(2){animation-delay:.18s}.plan-factory-dots i:nth-child(3){animation-delay:.36s}@keyframes cePlanPartyBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes cePlanPartyPulse{0%,100%{transform:scale(.7);opacity:.45}50%{transform:scale(1);opacity:1}}.ce-plan-income-manager p{margin:8px 0 10px;color:#475569;font-weight:700}.ce-plan-income-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.ce-plan-income-scroll{overflow:auto;max-height:360px;border:1px solid #dbe4ee;border-radius:14px;background:#fff}.ce-plan-income-table{width:100%;border-collapse:collapse;font-size:13px}.ce-plan-income-table th,.ce-plan-income-table td{padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:middle}.ce-plan-income-table th{position:sticky;top:0;background:#eef6ff;z-index:1;font-weight:950}.ce-plan-income-table small{display:block;color:#64748b;font-weight:800}.ce-plan-income-table input[type=number]{width:86px;max-width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:10px}.ce-plan-income-table tr.excluded{opacity:.48;background:#f8fafc}.ce-plan-income-include{white-space:nowrap}.ce-plan-income-table button.small,.ce-plan-income-toolbar button.small{padding:7px 10px!important;border-radius:10px!important;font-weight:900!important}
      .plan-resource-purchase-subrow input[data-plan-resource-field="compra"]{font-size:15px!important;font-weight:850!important}.plan-advanced-toolbar{display:flex!important;gap:8px!important;flex-wrap:wrap!important;align-items:center!important;margin:10px 0!important;padding:8px!important;border-radius:14px!important;background:#f8fafc!important;border:1px solid #e2e8f0!important}.plan-advanced-toolbar input{min-width:220px!important;flex:1 1 260px!important;padding:8px 10px!important;border-radius:12px!important;border:1px solid #cbd5e1!important}.plan-advanced-toolbar button{white-space:nowrap!important}
      .plan-resource-edit-row.plan-sd-rara>td{background:#f8fafc!important;color:#111827!important}.plan-resource-edit-row.plan-sd-rara input,.plan-resource-edit-row.plan-sd-rara select{color:#111827!important}/*ce-hf18-no-black*/@media (max-width: 900px){.plan-resource-split-table{table-layout:auto!important}.plan-resource-split-table th:first-child,.plan-resource-split-table td:first-child,.plan-resource-split-table th:last-child,.plan-resource-split-table td:last-child{width:auto!important}.plan-resource-subrow{grid-template-columns:1fr 1fr!important}.plan-resource-general-top{grid-template-columns:auto 1fr!important}.plan-resource-split-table thead{display:none!important}.plan-resource-split-table tr,.plan-resource-split-table td{display:block!important;width:100%!important;border-radius:10px!important}}
      .plan-budget-warning{background:#fff7ed!important;border:1px solid #fdba74!important;color:#7c2d12!important}
      .plan-resource-edit-row.plan-sd-comida-aperitivo>td{background:#f5ead8!important}.plan-resource-edit-row.plan-sd-comida-comida>td{background:#e7d1b4!important}.plan-resource-edit-row.plan-sd-comida-cena>td{background:#c99a68!important}
      .plan-resource-edit-row.plan-sd-bebida-aperitivo>td{background:#ffedd5!important}.plan-resource-edit-row.plan-sd-bebida-comida>td{background:#fed7aa!important}.plan-resource-edit-row.plan-sd-bebida-cena>td{background:#fdba74!important}.plan-resource-edit-row.plan-sd-bebida-cubatas>td{background:#fecaca!important}
      .plan-resource-edit-row.plan-sd-infra-aperitivo>td{background:#dbeafe!important}.plan-resource-edit-row.plan-sd-infra-comida>td{background:#bfdbfe!important}.plan-resource-edit-row.plan-sd-infra-cubatas>td{background:#93c5fd!important}.plan-resource-edit-row.plan-sd-infra-cena>td{background:#60a5fa!important}.plan-resource-edit-row.plan-sd-infra-infra>td{background:#86efac!important}
      .plan-resource-edit-row.plan-sd-rara>td{background:#f8fafc!important;color:#111827!important}.plan-resource-edit-row.plan-sd-rara input,.plan-resource-edit-row.plan-sd-rara select{color:#111827!important}.plan-resource-edit-row.plan-sd-rara small,.plan-resource-edit-row.plan-sd-rara strong{color:inherit!important}

      .plan-factory-overlay{position:fixed!important;inset:0!important;z-index:10000120!important;display:flex!important;align-items:center!important;justify-content:center!important;background:rgba(15,23,42,.42)!important;backdrop-filter:blur(2px)!important;padding:18px!important}.plan-factory-overlay-card{width:min(460px,92vw)!important;display:grid!important;justify-items:center!important;text-align:center!important;gap:10px!important;background:#fff!important;border:2px solid #fdba74!important;border-radius:24px!important;padding:24px 28px!important;box-shadow:0 30px 90px rgba(0,0,0,.35)!important;color:#7c2d12!important}.plan-factory-overlay-card strong{font-size:24px!important;font-weight:950!important;color:#111827!important}.plan-factory-overlay-card small{font-size:14px!important;line-height:1.45!important;font-weight:800!important;color:#9a3412!important}.plan-factory-spinner{font-size:44px!important;animation:cePlanFactorySpin 1.2s linear infinite}.plan-factory-overlay .plan-factory-dots{margin:4px 0 0!important}@keyframes cePlanFactorySpin{0%{transform:rotate(0deg) scale(1)}50%{transform:rotate(180deg) scale(1.08)}100%{transform:rotate(360deg) scale(1)}}
      .ce-hf27-diag-btn{margin-left:10px!important;background:#fff!important;color:#0f172a!important;border:2px solid #0f172a!important;border-radius:14px!important;padding:10px 14px!important;font-weight:950!important}
      .ce-hf27-diagnostic{margin:14px 0!important;border:3px solid #0f172a!important;border-radius:18px!important;background:#f8fafc!important;box-shadow:0 8px 22px rgba(15,23,42,.10)!important;overflow:hidden!important}
      .ce-hf27-head{display:flex!important;gap:12px!important;justify-content:space-between!important;align-items:flex-start!important;padding:12px 14px!important;background:#e0f2fe!important;border-bottom:2px solid #bae6fd!important}
      .ce-hf27-head h3{margin:0 0 4px!important;font-size:20px!important;font-weight:950!important;color:#082f49!important}.ce-hf27-head p{margin:0!important;color:#334155!important;font-weight:750!important}
      .ce-hf27-kpis{display:flex!important;gap:8px!important;flex-wrap:wrap!important;justify-content:flex-end!important}.ce-hf27-kpis span{display:grid!important;gap:2px!important;text-align:center!important;padding:6px 10px!important;background:#fff!important;border:1px solid #cbd5e1!important;border-radius:12px!important;font-weight:850!important}.ce-hf27-kpis b{font-size:18px!important}
      .ce-hf27-actions{display:flex!important;gap:8px!important;padding:10px 14px!important;background:#fff!important;border-bottom:1px solid #e2e8f0!important}.ce-hf27-actions button{border-radius:12px!important;border:1px solid #0f172a!important;background:#0f172a!important;color:#fff!important;font-weight:950!important;padding:8px 12px!important}.ce-hf27-actions button+button{background:#fff!important;color:#0f172a!important}
      .ce-hf27-tablewrap{max-height:420px!important;overflow:auto!important;background:#fff!important}.ce-hf27-diagnostic table{width:100%!important;border-collapse:collapse!important;font-size:12px!important}.ce-hf27-diagnostic th{position:sticky!important;top:0!important;background:#0f172a!important;color:#fff!important;padding:8px!important;text-align:left!important;z-index:1!important}.ce-hf27-diagnostic td{padding:8px!important;border-bottom:1px solid #e5e7eb!important;vertical-align:top!important}.ce-hf27-diagnostic tr.ok{background:#ecfdf5!important}.ce-hf27-diagnostic tr.warn{background:#fffbeb!important}.ce-hf27-diagnostic tr.bad{background:#fef2f2!important}.ce-hf27-diagnostic small{display:block!important;color:#475569!important;font-weight:700!important;margin-top:3px!important}.ce-hf27-status{display:inline-flex!important;padding:3px 7px!important;border-radius:999px!important;background:#fff!important;border:1px solid #cbd5e1!important;font-weight:950!important}

    `;
    document.head.appendChild(st);
  }
  function renderPlanningNarrative(proposals, totalCompras, totalDonaciones){
    const title = proposedEventTitle();
    const people = Math.max(0, Number(fieldValue('planPersonas') || 0));
    const price = planEstimatedEventPrice(totalCompras, people || 1);
    const valuation = Number(totalCompras || 0) + Number(totalDonaciones || 0);
    const costePersona = people > 0 ? Number(totalCompras || 0) / people : 0;
    const realism = people > 0 && costePersona > 35
      ? `<p class="plan-budget-warning"><strong>Aviso de realidad:</strong> ${esc(money(costePersona))} por persona supera el límite caro de referencia (${esc(money(35))}). Revisa cantidades antes de generar el evento.</p>`
      : (people > 0 && costePersona > 25 ? `<p class="plan-budget-warning"><strong>Aviso:</strong> ${esc(money(costePersona))} por persona está por encima del coste habitual de referencia (${esc(money(25))}).</p>` : '');
    const prompt = fieldValue('planInfo');
    const inc = incomeSummary(Array.isArray(lastIncomeProposal) ? lastIncomeProposal : []);
    const incomeLine = inc.registros > 0
      ? `<p><strong>Ingresos previstos:</strong> ${qty(inc.registros)} registro(s) · ${qty(inc.totalPersonas)} persona(s) representadas · ${money(inc.importe)}${planContent() === 'INGRESOS_SOCIOS_OBLIGATORIOS' ? ' · generados automáticamente desde socios obligatorios' : ''}.</p>`
      : '';
    const conditions = [];
    const dias = Number(fieldValue('planDias') || 0); if(dias) conditions.push(`${qty(dias)} día(s)`);
    if(people) conditions.push(`${qty(people)} personas estimadas`);
    if(/40\s*grados|40\s*º|calor|temperatura/i.test(prompt)) conditions.push('calor alto: revisar hielo, agua, refrescos y cerveza');
    if(/aperitivo/i.test(prompt)) conditions.push('aperitivo');
    if(/paella/i.test(prompt)) conditions.push('comida tipo paella');
    if(/cubatas|tardeo/i.test(prompt)) conditions.push('tardeo/cubatas');
    if(/barbacoa|cena/i.test(prompt)) conditions.push('cena/barbacoa');
    return `
      <div class="planificacion-note compact-note plan-zuzu-narrative">
        <strong>Lectura de Zuzu para ${esc(title)}:</strong>
        <p>He preparado una propuesta revisable atendiendo a las condiciones principales${conditions.length ? ': ' + esc(conditions.join(' · ')) : ''}. La lógica es: necesidad total prevista, menos donaciones/existencias, y compra solo del déficit revisable.</p>
        <p><strong>Total compras previstas:</strong> ${money(totalCompras)} · <strong>Donaciones/existencias estimadas:</strong> ${money(totalDonaciones)} · <strong>Valoración del evento:</strong> ${money(valuation)}.</p>
        ${incomeLine}
        <p><strong>Coste real de compra:</strong> ${people > 0 ? money(costePersona) + ' por persona' : 'sin personas estimadas'} · <strong>Precio orientativo de entrada:</strong> ${money(price)} por persona, redondeado al alza para facilitar el cobro.</p>
        ${realism}
        <p><strong>Para afinar más a Zuzu:</strong> indica personas, comidas incluidas, nivel de bebida, niños/no bebedores, presupuesto objetivo y si hay donaciones/existencias confirmadas.</p>
      </div>`;
  }



  function isPlanCoupleName(name){
    const n = normalizeText(name || '');
    // En PERSONAS no siempre existe un campo numero fiable. Para ingresos iniciales,
    // consideramos pareja/grupo socio cuando el nombre contiene una unión explícita entre personas.
    // Ej.: "Colty y Esther", "Cito y María José Díaz", "Isabel y Angel Téllez".
    return /\b(Y|E)\b/.test(n) || n.includes(' + ');
  }
  function splitPlanCoupleName(name){
    return normalizeText(name || '').split(/\s+(?:Y|E|\+)\s+/).map(normalizeText).filter(Boolean);
  }
  function singleCoveredByCouple(singleName, coupleName, parts){
    const s = normalizeText(singleName || '');
    const c = normalizeText(coupleName || '');
    if(!s || s.length < 3) return false;
    // Si "Colty" está dentro de "Colty y Esther", o "Maria Jose" dentro de
    // "Cito y Maria Jose Diaz", no debe proponerse otra vez como socio individual.
    if(c.includes(s)) return true;
    return (parts || []).some(part => {
      const p = normalizeText(part);
      if(!p || p.length < 3) return false;
      if(p === s || p.includes(s) || s.includes(p)) return true;
      const pf = p.split(' ')[0] || '';
      const sf = s.split(' ')[0] || '';
      return pf.length >= 4 && sf.length >= 4 && pf === sf;
    });
  }
  function sociosParaIngresosIniciales(){
    // Regla v13.0 hotfix: para "Ingresos obligatorios de todos los socios" se usan
    // parejas/grupos SOCIO escritos con "y/e/+" como numero=2, y solo los socios
    // individuales que no estén ya contenidos en una pareja. Esto evita duplicar
    // Colty+Esther como pareja y además Colty y Esther por separado.
    const list = socios();
    const selected = new Map();
    const couples = [];
    list.forEach(p => {
      const id = String(p.id || '');
      const name = normalizeText(p.nombre || '');
      if(!id || !name) return;
      if(isPlanCoupleName(name)){
        couples.push({persona:p, name, parts:splitPlanCoupleName(name)});
        selected.set(id, {...p, numeroIngreso:2});
      }
    });
    list.forEach(p => {
      const id = String(p.id || '');
      const name = normalizeText(p.nombre || '');
      if(!id || !name || isPlanCoupleName(name)) return;
      const covered = couples.some(c => singleCoveredByCouple(name, c.name, c.parts));
      if(covered) return;
      selected.set(id, {...p, numeroIngreso:1});
    });
    // HF42: cuando el usuario pide “Ingresos obligatorios de todos los socios”,
    // no se aplica ningún recorte por número estimado de asistentes. Ese recorte
    // era útil para evitar duplicados en algunos históricos, pero podía dejar la
    // propuesta a 0 SOCIOS si el maestro venía con muchos socios individuales.
    return [...selected.values()].sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
  }

  function buildMandatorySocioIncomeProposal(totalCompras){
    const estimatedPeople = Math.max(1, Number(fieldValue('planPersonas') || 0));
    const price = planEstimatedEventPrice(totalCompras || 0, estimatedPeople);
    let selected = sociosParaIngresosIniciales();
    // HF42: defensa adicional. Si por cualquier limpieza de duplicados quedara vacío,
    // se usan todos los registros SOCIO disponibles para no crear nunca 0 ingresos.
    if(!selected.length) selected = socios().map(p => ({...p, numeroIngreso: Math.max(1, Number(p.numero || 1))}));
    return selected.map((p, index) => {
      const numero = Math.max(1, Number(p.numeroIngreso || p.numero || 1));
      return {
        key: `socio-obligatorio:${p.id || index}`,
        sourceId: '',
        include: true,
        personaId: p.id || '',
        personaName: p.nombre || 'Socio sin nombre',
        rango: 'SOCIO',
        numero,
        situacion: 'Pendiente',
        importeVoluntario: 0,
        importeObligatorio: Math.round(numero * price * 100) / 100
      };
    });
  }


  function initForm(){
    // V33.5: solo se replica un evento finalizado. Los campos históricos anteriores quedan bloqueados para no confundir.
    const events = finalizados();
    setOptions(document.getElementById('planEventoBase'), events.length ? events.map(e => ({value:e.id, label:`${e.fechaIni || '--/--/--'} · ${e.titulo || 'Evento sin título'} · FINALIZADO`})) : [{value:'', label:'No hay eventos finalizados disponibles'}], events[0]?.id || '');
    const fuente = document.getElementById('planFuenteHistorica');
    if(fuente){
      setOptions(fuente, [
        {value:'REPLICA', label:'Replicar un evento Finalizado'},
        {value:'ZUZU_TOTAL', label:'Encargo total a Zuzu'},
        {value:'ZUZU_PARCIAL', label:'Encargo parcial a Zuzu'}
      ], fuente.value || 'REPLICA');
      fuente.disabled = false;
    }
    const nivel = document.getElementById('planNivelPropuesta');
    if(nivel){
      setOptions(nivel, [
        {value:'TODO', label:'Todos los datos del evento modelo'},
        {value:'INGRESOS', label:'Solo los datos de INGRESOS'},
        {value:'COMPRAS', label:'Solo los datos de COMPRAS'},
        {value:'DONACIONES', label:'Solo los datos de DONACIONES'},
        {value:'INGRESOS_COMPRAS', label:'Usar INGRESOS + COMPRAS'},
        {value:'INGRESOS_DONACIONES', label:'Usar INGRESOS + DONACIONES'},
        {value:'COMPRAS_DONACIONES', label:'Usar COMPRAS + DONACIONES'},
        {value:'INGRESOS_SOCIOS_OBLIGATORIOS', label:'Ingresos obligatorios de todos los socios'},
        {value:'NINGUN_DATO', label:'Ningún dato'}
      ], nivel.value || 'TODO');
      nivel.disabled = false;
    }
    updatePlanModeUI();
    const socioOptions = socios().map(p => ({value:p.id, label:p.nombre || 'Socio sin nombre'}));
    setOptions(document.getElementById('planResponsable'), socioOptions.length ? socioOptions : [{value:'', label:'Sin socios disponibles'}]);
    const tiendaOptions = tiendas().map(t => ({value:t.id, label:t.nombre || 'Tienda sin nombre'}));
    setOptions(document.getElementById('planTienda'), tiendaOptions.length ? tiendaOptions : [{value:'', label:'Sin tiendas disponibles'}]);
    updateDaysFromDates();
    unlockPlanControls();
  }
  function updateDaysFromDates(){
    const ini = document.getElementById('planFechaIni')?.value;
    const fin = document.getElementById('planFechaFin')?.value;
    const field = document.getElementById('planDias');
    if(!field) return;
    const a = parseDate(ini), b = parseDate(fin || ini);
    if(a && b){
      const ms = new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate());
      field.value = String(Math.max(1, Math.round(ms / 86400000) + 1));
    }
  }
  function sourceEvent(){
    const id = document.getElementById('planEventoBase')?.value || '';
    return byId('eventos', id);
  }
  function buildReplicaProposal(){
    const ev = sourceEvent();
    if(!ev){ return {event:null, rows:[]}; }
    if(up(ev.situacion || '') !== 'FINALIZADO') return {event:ev, rows:[], incomes:[]};
    const eventRows = rows('compras').filter(row => String(row.eventId || '') === String(ev.id || ''));
    const mapped = eventRows.map((row, index) => {
      const product = productOf(row) || {};
      const tipo = isDonation(row) ? 'DONACION' : 'COMPRA';
      return {
        key: `replica:${row.id || index}`,
        include: true,
        tipo,
        sourceId: row.id || '',
        productId: product.id || row.productoId || '',
        productName: product.nombre || productName(row),
        segmento: product.segmento || segmentName(row),
        destino: product.destino || destinoName(row),
        unidades: Math.max(0, Math.round(Number(row.unidades || 0) * 100) / 100),
        precio: unitPrice(row),
        tiendaId: rowTienda(row),
        responsableId: rowResponsible(row),
        ticketDonacion: String(row.ticketDonacion || ''),
        donorRef: String(row.donorRef || ''),
        sourceTiendaId: String(row.tiendaId || ''),
        sourcePrecio: unitPrice(row),
        confidence: 'Réplica exacta',
        reason: tipo === 'DONACION'
          ? 'Donación de producto replicada tal cual desde el evento finalizado.'
          : 'Compra replicada tal cual desde el evento finalizado.'
      };
    });
    mapped.sort((a,b) => {
      const ta = a.tipo.localeCompare(b.tipo, 'es');
      if(ta) return ta;
      return String(tiendaName(a.tiendaId)).localeCompare(String(tiendaName(b.tiendaId)),'es') || String(a.ticketDonacion || '').localeCompare(String(b.ticketDonacion || ''),'es') || a.productName.localeCompare(b.productName,'es');
    });
    return {event:ev, rows:mapped, incomes: incomeRowsForEvent(ev.id)};
  }

  function planVisibleResourceStats(){
    const groups = planResourceRows(lastProposal);
    const compras = [];
    const donaciones = [];
    let totalCompras = 0, totalDonaciones = 0;
    groups.forEach(g => {
      if (Number(g.compra || 0) > 0) {
        compras.push(g);
        totalCompras += Number(g.compra || 0) * Number(g.precioCompra || g.precioDonado || 0);
      }
      if (Number(g.donado || 0) > 0) {
        (g.donationDetails || []).forEach(d => {
          if (Number(d.unidades || 0) > 0) {
            donaciones.push(d);
            totalDonaciones += Number(d.unidades || 0) * Number(d.precio || 0);
          }
        });
      }
    });
    return {groups, compras, donaciones, totalCompras, totalDonaciones};
  }
  function promptDonationHintsHf22(){
    const info = fieldValue('planInfo');
    const hints = [];
    const lines = String(info || '').replace(/\r/g,'').split(/\n/);
    let active = null;
    const stop = /^(OBJETIVO|DATOS\s+PARA|DESCRIPCI[ÓO]N|CRITERIOS?|DETALLES|COMIDAS|PISTAS\s+DE\s+COMPRA|REGLAS\s+FINALES|COMPRA|COMPRAS|A\s+COMPRAR)\s*:/i;
    const start = /^(PRODUCTO\s+EN\s+LA\s+PE[NÑ]A|DONACIONES?\b|DONACI[ÓO]N\b|DONACION\b|EXISTENCIAS?\b|YA\s+TENEMOS\b)/i;
    const extract = (line, name) => {
      const m = String(line || '').match(new RegExp('\\[\\s*' + name + '\\s*[:=]\\s*([^\\]\\n]+)\\]', 'i'));
      return m ? String(m[1] || '').trim().replace(/[\]\)\.]+$/,'') : '';
    };
    const clean = raw => String(raw || '')
      .replace(/^\s*[•\-\*]\s*/,'')
      .replace(/\(([^)]*)\)/g, ' $1 ')
      .replace(/\b(?:bolsa|pack|packs|paquete|paquetes|caja|pieza)\s*(?:de|x)?\s*\d+(?:[,.]\d+)?\s*(?:ud\.?|uds\.?|unidades|latas|botellines|botellas|botes|kg)?\b/ig,' ')
      .replace(/\s+/g,' ')
      .trim();
    const qty = raw => {
      const s = String(raw || '').replace(/^\s*[•\-\*]\s*/,'');
      const tail = s.includes(':') ? s.slice(s.lastIndexOf(':') + 1) : s;
      let m = tail.match(/(\d+(?:[,.]\d+)?)\s*(?:pack|packs|paquete|paquetes)\s*(?:de|x)\s*(\d+(?:[,.]\d+)?)/i);
      if(m) return Math.max(0, Math.round(Number(String(m[1]).replace(',','.')) * Number(String(m[2]).replace(',','.')) * 100) / 100);
      m = tail.match(/(?:pack|packs|paquete|paquetes)\s*(?:de|x)\s*(\d+(?:[,.]\d+)?)/i);
      if(m) return Math.max(0, Number(String(m[1]).replace(',','.')));
      m = tail.match(/(\d+(?:[,.]\d+)?)/);
      return m ? Math.max(0, Number(String(m[1]).replace(',','.'))) : 1;
    };
    const meta = (line, prev={}) => {
      const m = {...prev};
      const h = String(line || '');
      if(/DONADO\s+TIENDA|DONACI[ÓO]N\s+DE\s+TIENDA/i.test(h)) m.ticketDonacion = 'DONADO TIENDA';
      else if(/DONADO\s+OTROS|DONACI[ÓO]N\s+DE\s+OTROS/i.test(h)) m.ticketDonacion = 'DONADO OTROS';
      else if(/DONADO\s+SOCIO|DONACIONES?\s+DE\s+SOCIOS?|PRODUCTO\s+EN\s+LA\s+PE[NÑ]A/i.test(h)) m.ticketDonacion = 'DONADO SOCIO';
      if(!m.ticketDonacion) m.ticketDonacion = 'DONADO SOCIO';
      const d = extract(h, 'Donante'), r = extract(h, 'Responsable');
      if(d) m.donor = d;
      if(r) m.responsable = r;
      if(!m.donor && /PRODUCTO\s+EN\s+LA\s+PE[NÑ]A/i.test(h)) m.donor = 'Peña El Arrastre';
      if(!m.responsable && /PRODUCTO\s+EN\s+LA\s+PE[NÑ]A/i.test(h)) m.responsable = document.getElementById('planResponsable')?.selectedOptions?.[0]?.textContent || 'Colty';
      return m;
    };
    lines.forEach(raw => {
      const line = String(raw || '').trim();
      if(!line) return;
      if(stop.test(line)){ active = null; return; }
      if(start.test(line)){ active = meta(line, {}); return; }
      if(active && (/Tratar\s+como\s+DONADO/i.test(line) || /\[Donante:|\[Responsable:/i.test(line))){ active = meta(line, active); return; }
      if(active && /^PRODUCTOS?\s*:?\s*$/i.test(line)) return;
      if(!active || !/^\s*[•\-\*]\s*[^:\n]{2,240}:\s*(?:\d|un|una|uno|pack|paquete)/i.test(raw)) return;
      let productText = String(raw).replace(/^\s*[•\-\*]\s*/,'');
      productText = productText.includes(':') ? productText.slice(0, productText.lastIndexOf(':')) : productText;
      productText = clean(productText);
      if(!productText) return;
      const prod = resolveCatalogProductByName(productText) || resolveCatalogProductByName(clean(productText));
      const productId = prod?.id || '';
      const productName = prod?.nombre || productText;
      const donorLabelText = active.donor || 'Donante indicado';
      const ticketDonacion = active.ticketDonacion || 'DONADO SOCIO';
      let donorRef = '';
      if(ticketDonacion === 'DONADO TIENDA'){
        const store = tiendas().find(t => normalizeText(t.nombre || '') === normalizeText(donorLabelText) || normalizeText(t.nombre || '').includes(normalizeText(donorLabelText)) || normalizeText(donorLabelText).includes(normalizeText(t.nombre || '')));
        donorRef = store ? 'T:' + store.id : donorLabelText;
      }else{
        const person = socios().find(s => normalizeText(s.nombre || '') === normalizeText(donorLabelText) || normalizeText(s.nombre || '').includes(normalizeText(donorLabelText)) || normalizeText(donorLabelText).includes(normalizeText(s.nombre || '')));
        donorRef = person ? 'P:' + person.id : donorLabelText;
      }
      const respName = active.responsable || (ticketDonacion === 'DONADO TIENDA' ? document.getElementById('planResponsable')?.selectedOptions?.[0]?.textContent : donorLabelText) || '';
      const resp = socios().find(s => normalizeText(s.nombre || '') === normalizeText(respName) || normalizeText(s.nombre || '').includes(normalizeText(respName)) || normalizeText(respName).includes(normalizeText(s.nombre || '')));
      const store = ticketDonacion === 'DONADO TIENDA' ? tiendas().find(t => normalizeText(t.nombre || '') === normalizeText(donorLabelText) || normalizeText(t.nombre || '').includes(normalizeText(donorLabelText)) || normalizeText(donorLabelText).includes(normalizeText(t.nombre || ''))) : null;
      hints.push({
        productId,
        productName,
        productKey: productId ? `id:${productId}` : `nm:${planGroupKey(productName)}`,
        unidades: qty(raw),
        precio: Number(prod?.defaultPrecio ?? prod?.precio ?? prod?.precioReferencia ?? prod?.precio_ref ?? prod?.pvp ?? prod?.importe ?? 0) || 0,
        segmento: prod?.segmento || 'Sin segmento',
        destino: prod?.destino || 'Sin destino',
        ticketDonacion,
        donorRef,
        tiendaId: store?.id || document.getElementById('planTienda')?.value || '',
        responsableId: resp?.id || document.getElementById('planResponsable')?.value || '',
        donorLabelText
      });
    });
    return hints;
  }
  function samePromptProductHf22(row, hint){
    if(!row || !hint) return false;
    const rowProdId = canonicalProposalProductId(row) || row.productId || '';
    if(rowProdId && hint.productId && String(rowProdId) === String(hint.productId)) return true;
    const a = normalizeText(row.productName || row.producto || '');
    const b = normalizeText(hint.productName || '');
    if(!a || !b) return false;
    if(a === b || a.includes(b) || b.includes(a)) return true;
    const tokens = b.split(' ').filter(t => t.length >= 3 && !/^(BOTELLA|BOTELLAS|LATA|LATAS|BOTE|BOTES|BOLSA|PACK|PAQUETE|PIEZA|NORMAL|GRANDE|MEDIANA|UNIDADES)$/.test(t));
    return tokens.length >= 2 && tokens.filter(t => a.includes(t)).length >= Math.min(tokens.length, 3);
  }
  function forcePromptDonationsHf22(list){
    const base = (Array.isArray(list) ? list : []).map(r => ({...r}));
    const hints = promptDonationHintsHf22();
    if(!hints.length) return base;
    const usedHint = new Set();
    hints.forEach((hint, hidx) => {
      const matches = base.map((row, idx) => ({row, idx})).filter(x => samePromptProductHf22(x.row, hint));
      let donation = matches.find(x => x.row.tipo === 'DONACION');
      let convertible = matches.find(x => x.row.tipo === 'COMPRA' && Math.abs(Number(x.row.unidades || 0) - Number(hint.unidades || 0)) < 0.001);
      const target = donation || convertible;
      if(target){
        const row = base[target.idx];
        row.include = true;
        row.tipo = 'DONACION';
        row.productId = hint.productId || row.productId || '';
        row.productName = hint.productName || row.productName;
        row.segmento = hint.segmento || row.segmento;
        row.destino = hint.destino || row.destino;
        row.unidades = Number(hint.unidades || row.unidades || 0);
        row.precio = Number(hint.precio || row.precio || 0);
        row.ticketDonacion = hint.ticketDonacion;
        row.donorRef = hint.donorRef;
        row.tiendaId = hint.tiendaId;
        row.responsableId = hint.responsableId;
        row.explicitPromptDonation = true;
        row.explicitConfirmedDonation = true;
        row.explicitPromptStrictHf12 = true;
        row.reason = `Donación/existencia confirmada por prompt (${hint.donorLabelText}).`;
        usedHint.add(hidx);
        // Si había compra residual para el mismo producto con cantidad igual o menor a lo donado,
        // no puede seguir como compra: la línea del prompt manda.
        matches.forEach(x => {
          if(x.idx !== target.idx && x.row.tipo === 'COMPRA' && Number(x.row.unidades || 0) <= Number(hint.unidades || 0) + 0.001){
            base[x.idx].include = false;
            base[x.idx].__ceSuppressedDonation = true;
            base[x.idx].reason = 'Compra anulada porque el producto está confirmado como donación/existencia en el prompt.';
          }
        });
      }
    });
    hints.forEach((hint, hidx) => {
      if(usedHint.has(hidx)) return;
      base.forEach(row => {
        if(row && row.tipo === 'COMPRA' && samePromptProductHf22(row, hint) && Number(row.unidades || 0) <= Number(hint.unidades || 0) + 0.001){
          row.include = false;
          row.__ceSuppressedDonation = true;
          row.reason = 'Compra anulada porque el producto está confirmado como donación/existencia en el prompt.';
        }
      });
      base.push({
        key:`prompt-hf22-forced:${hidx}:${hint.productKey}`,
        include:true,
        tipo:'DONACION',
        productId:hint.productId,
        productName:hint.productName,
        segmento:hint.segmento,
        destino:hint.destino,
        unidades:hint.unidades,
        precio:hint.precio,
        tiendaId:hint.tiendaId,
        responsableId:hint.responsableId,
        ticketDonacion:hint.ticketDonacion,
        donorRef:hint.donorRef,
        explicitPromptDonation:true,
        explicitConfirmedDonation:true,
        explicitPromptStrictHf12:true,
        reason:`Donación/existencia confirmada por prompt (${hint.donorLabelText}).`
      });
    });
    return base;
  }
  function applyPromptDonationTruthHf24(list){
    const base = forcePromptDonationsHf22(Array.isArray(list) ? list : []).map(r => ({...r}));
    const hints = promptDonationHintsHf22();
    if(!hints.length) return base;

    const keyOf = row => {
      const id = canonicalProposalProductId(row) || row.productId || '';
      if(id) return `id:${id}`;
      return `nm:${planGroupKey(row.productName || row.producto || '')}`;
    };
    const hintKey = h => h.productId ? `id:${h.productId}` : `nm:${planGroupKey(h.productName || '')}`;

    hints.forEach((hint, hidx) => {
      const hk = hintKey(hint);
      let donationIdx = base.findIndex(row => row && row.tipo === 'DONACION' && keyOf(row) === hk && normalizeDonorRef(row.donorRef || '') === normalizeDonorRef(hint.donorRef || '') && String(row.ticketDonacion || '').toUpperCase() === String(hint.ticketDonacion || '').toUpperCase());
      if(donationIdx < 0) donationIdx = base.findIndex(row => row && row.tipo === 'DONACION' && keyOf(row) === hk);
      const donationRow = {
        key:`prompt-hf24-truth:${hidx}:${hk}:${normalizeDonorRef(hint.donorRef || '')}`,
        include:true,
        tipo:'DONACION',
        productId:hint.productId || '',
        productName:hint.productName || 'Producto',
        segmento:hint.segmento || 'Sin segmento',
        destino:hint.destino || 'Sin destino',
        unidades:Number(hint.unidades || 0) || 1,
        precio:Number(hint.precio || 0),
        tiendaId:hint.tiendaId || document.getElementById('planTienda')?.value || '',
        responsableId:hint.responsableId || document.getElementById('planResponsable')?.value || '',
        ticketDonacion:hint.ticketDonacion || 'DONADO SOCIO',
        donorRef:hint.donorRef || '',
        explicitPromptDonation:true,
        explicitConfirmedDonation:true,
        explicitPromptStrictHf12:true,
        reason:`Donación/existencia confirmada por prompt (${hint.donorLabelText || donorLabel(hint.donorRef)}).`
      };
      if(donationIdx >= 0) base[donationIdx] = {...base[donationIdx], ...donationRow};
      else base.push(donationRow);

      base.forEach(row => {
        if(!row || row.tipo !== 'COMPRA' || keyOf(row) !== hk) return;
        const currentUnits = Number(row.unidades || 0);
        const donated = Number(hint.unidades || 0);
        if(currentUnits <= donated + 0.001){
          row.include = false;
          row.unidades = 0;
          row.__ceSuppressedDonation = true;
          row.reason = 'Compra anulada porque el prompt confirma el producto como donación/existencia.';
        }else{
          row.include = true;
          row.unidades = Math.max(0, Math.round((currentUnits - donated) * 100) / 100);
          row.precio = Number(row.precio || hint.precio || 0);
          row.tiendaId = row.tiendaId || document.getElementById('planTienda')?.value || '';
          row.responsableId = row.responsableId || document.getElementById('planResponsable')?.value || '';
          row.reason = 'Compra por déficit real tras restar donación/existencia explícita del prompt.';
        }
      });
    });
    return base;
  }

  let __ceHf24EnsuringPurchases = false;
  function ensurePurchaseRowsForVisibleDeficitsHf24(){
    if(__ceHf24EnsuringPurchases) return;
    __ceHf24EnsuringPurchases = true;
    try{
      const groups = planResourceRows(lastProposal);
      groups.forEach(group => {
        const buy = Math.max(0, Number(group.compra || 0));
        const manualSuppressed = (group.allIndices || []).some(idx => {
          const row = lastProposal[idx];
          return row && row.__ceHf40ManualNeedOverride === true && row.__ceSuppressedManualPurchase === true;
        });
        // Si el usuario ya ha bajado la necesidad y ha anulado la compra, no la volvemos a recrear.
        if(manualSuppressed) return;
        if(buy <= 0) return;
        const existingIdx = lastProposal.findIndex(row => row && row.tipo === 'COMPRA' && !row.__ceSuppressedDonation && !row.__ceSuppressedManualPurchase && (canonicalProposalProductId(row) || row.productId || '') === (group.productId || '') && Number(row.unidades || 0) > 0);
        const price = Number(group.precioCompra || group.precioDonado || resolveCatalogProductByName(group.producto)?.defaultPrecio || resolveCatalogProductByName(group.producto)?.precio || resolveCatalogProductByName(group.producto)?.precioReferencia || 0);
        const payload = {
          include:true,
          tipo:'COMPRA',
          productId:group.productId || '',
          productName:group.producto || 'Producto',
          segmento:group.segmento || '',
          destino:group.destino || '',
          unidades:buy,
          necesidadTotal: Math.max(0, Number(group.donado || 0)) + Math.max(0, Number(buy || 0)),
          precio:price || 0,
          tiendaId:group.tiendaId || document.getElementById('planTienda')?.value || '',
          responsableId:group.responsableId || document.getElementById('planResponsable')?.value || '',
          ticketDonacion:'',
          donorRef:'',
          __ceVisibleDeficitPurchaseHf31:true,
          reason:'Compra por déficit visible en PROPUESTA DETALLADA DEL EVENTO.'
        };
        if(existingIdx >= 0) lastProposal[existingIdx] = {...lastProposal[existingIdx], ...payload};
        else lastProposal.push({...payload, key:`prompt-hf24-deficit:${Date.now()}:${Math.random().toString(36).slice(2)}`});
      });
    }finally{
      __ceHf24EnsuringPurchases = false;
    }
  }

  function productAliasKeyHf25(value){
    const n = normalizeProductSearchKeyHf24(value || '');
    const s = simplifyProductSearchKeyHf24(value || '');
    const has = (...parts) => parts.every(part => n.includes(normalizeProductSearchKeyHf24(part)));
    const hasS = (...parts) => parts.every(part => s.includes(normalizeProductSearchKeyHf24(part)));
    const tok = t => new RegExp('(^|\\s)' + normalizeProductSearchKeyHf24(t) + '(\\s|$)').test(n);

    if(has('COCA','COLA','ZERO') && (has('ZERO ZERO') || /ZERO\s+ZERO/.test(n))) return 'alias:coca-cola-zero-zero';
    if(has('COCA','COLA','ZERO')) return 'alias:coca-cola-zero';
    if(has('COCA','COLA')) return 'alias:coca-cola';
    if(has('FANTA','NARANJA')) return 'alias:fanta-naranja';
    if(has('FANTA','LIMON')) return 'alias:fanta-limon';
    if(has('SPRITE')) return 'alias:sprite';
    if(has('CERVEZA','AMBAR') && hasS('BARRIL')) return 'alias:cerveza-ambar-barril';
    if(has('CERVEZA','SKOL')) return 'alias:cerveza-skol';
    if(has('TONICA','SCHWEPPES')) return 'alias:tonica-schweppes';
    if((has('BITTER') || has('BEETER')) && has('KAS')) return 'alias:bitter-kas';

    if(has('RON','BARCELO')) return 'alias:ron-barcelo';
    if(has('RON','BRUGAL')) return 'alias:ron-brugal';
    if((hasS('WHISKY') || hasS('WISKI')) && (tok('JB') || has('J B') || has('5 ANOS') || has('5 AÑOS'))) return 'alias:whisky-jb';
    if((hasS('WHISKY') || hasS('WISKI')) && hasS('DYC')) return 'alias:whisky-dyc';
    if((hasS('WHISKY') || hasS('WISKI')) && (hasS('JHONY') || hasS('JOHNY') || hasS('JONIE') || hasS('WALKER'))) return 'alias:whisky-walker';
    if((hasS('GINEBRA') || hasS('GIN')) && hasS('PUERTO','INDIAS')) return 'alias:ginebra-puerto-indias';
    if((hasS('GINEBRA') || hasS('GIN')) && hasS('LARIOS')) return 'alias:ginebra-larios';
    if((hasS('GINEBRA') || hasS('GIN')) && hasS('BEEFEATER')) return 'alias:ginebra-beefeater';

    if(hasS('ACEITE','AOVE') || hasS('AOVE')) return 'alias:aceite-aove';
    if(hasS('VINAGRE')) return 'alias:vinagre';
    if(hasS('AGUA') && (has('1L') || has('1 L') || hasS('CRISTAL'))) return 'alias:agua-1l-cristal';
    if(hasS('BAICON') || hasS('BACON')) return 'alias:baicon';
    if(hasS('CHULETA','CERDO')) return 'alias:chuleta-cerdo';
    if(hasS('FAIRY')) return 'alias:fairy';
    if(hasS('PAPEL','HIGIENICO')) return 'alias:papel-higienico';
    if(hasS('ROLLO','SECAMANOS') || hasS('PAPEL','SECAMANOS')) return 'alias:rollo-secamanos';
    if(hasS('BOLSAS','BASURA') || hasS('BOLSA','BASURA')) return 'alias:bolsas-basura';
    if(hasS('JABON','MANOS') || hasS('JABON','LAVAMANOS')) return 'alias:jabon-manos';
    if(hasS('AMBIENTADOR')) return 'alias:ambientador';

    if(hasS('CAFE','DESCAFEINADO')) return 'alias:cafe-descafeinado-gorritas';
    if(hasS('CAFE','NORMAL') || (hasS('CAFE') && hasS('GORRITAS') && !hasS('DESCAFEINADO'))) return 'alias:cafe-normal-gorritas';
    if(hasS('VINO','BLANCO')) return 'alias:vino-blanco';
    if(hasS('VINO','FRIZZANTE')) return 'alias:vino-frizzante';
    if(hasS('VINO','TINTO','RIOJA')) return 'alias:vino-tinto-rioja';
    if(hasS('VINO','TINTO')) return 'alias:vino-tinto';
    if(hasS('OREJA','SALSA')) return 'alias:oreja-salsa';
    if(hasS('MEJILLONES')) return 'alias:mejillones';
    return 'norm:' + simplifyProductSearchKeyHf24(value || '');
  }

  function catalogPriceHf25(prod){
    if(!prod) return 0;
    return Number(prod.defaultPrecio ?? prod.precio ?? prod.precioReferencia ?? prod.precio_ref ?? prod.pvp ?? prod.importe ?? prod.importeReferencia ?? 0) || 0;
  }


  function ceHf37StrictCatalogProductOverride(name){
    const raw = String(name || '');
    const n = normalizeProductSearchKeyHf24(raw);
    const s = simplifyProductSearchKeyHf24(raw);
    const products = rows('productos');
    const has = (...parts) => parts.every(part => n.includes(normalizeProductSearchKeyHf24(part)) || s.includes(normalizeProductSearchKeyHf24(part)));
    if(has('CERVEZA') && has('AMBAR') && (has('BARRIL') || n.includes('30') || s.includes('30'))){
      const candidates = products.filter(p => {
        const pn = normalizeProductSearchKeyHf24(p?.nombre || '');
        const ps = simplifyProductSearchKeyHf24(p?.nombre || '');
        return (pn.includes('CERVEZA') || ps.includes('CERVEZA')) &&
               (pn.includes('AMBAR') || ps.includes('AMBAR')) &&
               (pn.includes('BARRIL') || ps.includes('BARRIL') || pn.includes('30') || ps.includes('30'));
      });
      if(candidates.length){
        return candidates.sort((a,b) => {
          const an = normalizeProductSearchKeyHf24(a?.nombre || '');
          const bn = normalizeProductSearchKeyHf24(b?.nombre || '');
          const ascore = (an.includes('BARRIL') ? 100 : 0) + (an.includes('30') ? 30 : 0) - String(a.nombre||'').length/100;
          const bscore = (bn.includes('BARRIL') ? 100 : 0) + (bn.includes('30') ? 30 : 0) - String(b.nombre||'').length/100;
          return bscore - ascore;
        })[0];
      }
    }
    return null;
  }

  function resolveCatalogProductByNameHf25(name){
    const raw = String(name || '').trim();
    if(!raw) return null;
    const products = rows('productos');
    const strictHf37 = ceHf37StrictCatalogProductOverride(raw);
    if(strictHf37) return strictHf37;
    const direct = resolveCatalogProductByName(raw);
    if(direct) return direct;

    const target = normalizeProductSearchKeyHf24(raw);
    const simple = simplifyProductSearchKeyHf24(raw);
    const alias = productAliasKeyHf25(raw);

    const aliasMatches = products.filter(p => productAliasKeyHf25(p?.nombre || '') === alias);
    if(aliasMatches.length === 1) return aliasMatches[0];
    if(aliasMatches.length > 1){
      const exact = aliasMatches.find(p => normalizeProductSearchKeyHf24(p?.nombre || '') === target)
        || aliasMatches.find(p => simplifyProductSearchKeyHf24(p?.nombre || '') === simple)
        || aliasMatches.sort((a,b)=>String(a.nombre||'').length-String(b.nombre||'').length)[0];
      if(exact) return exact;
    }

    const nExact = products.find(p => normalizeProductSearchKeyHf24(p?.nombre || '') === target);
    if(nExact) return nExact;
    const sExact = products.find(p => simplifyProductSearchKeyHf24(p?.nombre || '') === simple);
    if(sExact) return sExact;

    // Búsqueda tipo "%cadena%" y luego recorte progresivo del final.
    const queries = [];
    if(simple) queries.push(simple);
    if(target && target !== simple) queries.push(target);
    const words = simple.split(' ').filter(w => w.length >= 3);
    for(let i=0;i<words.length;i++){
      const q = words.slice(i).join(' ');
      if(q.length >= 4) queries.push(q);
    }
    queries.forEach(q => {
      let cur = String(q || '').trim();
      while(cur.length >= 5){
        queries.push(cur);
        cur = cur.slice(0, -1).trim();
      }
    });

    const uniqueQueries = [...new Set(queries.filter(Boolean))];
    for(const q of uniqueQueries){
      const contains = products.filter(p => simplifyProductSearchKeyHf24(p?.nombre || '').includes(q));
      if(contains.length === 1) return contains[0];
      if(contains.length > 1){
        const sorted = contains.sort((a,b)=>String(a.nombre||'').length-String(b.nombre||'').length);
        return sorted[0];
      }
    }

    // Último intento: puntuación por tokens, castigando menos los nombres escritos "de andar por casa".
    const generic = new Set('DE DEL LA EL LOS LAS EN CON SIN TIPO PARA Y O A UN UNA UNO UD UDS UNIDAD UNIDADES BOTELLA BOTELLAS LATA LATAS BOTE BOTES BOLSA BOLSAS PACK PAQUETE PAQUETES CAJA PIEZA KG GR L CL ML LITRO LITROS NORMAL GRANDE MEDIANA PEQUENA PEQUEÑA ENTERO MEZCLA'.split(' '));
    const toks = value => simplifyProductSearchKeyHf24(value).split(' ').filter(t => t.length >= 2 && !generic.has(t));
    const wanted = toks(raw);
    let best = null, bestScore = -9999;
    products.forEach(p => {
      const pn = p?.nombre || '';
      const ps = simplifyProductSearchKeyHf24(pn);
      const pt = toks(pn);
      let score = 0, matched = 0;
      wanted.forEach(t => {
        if(pt.includes(t)){ score += 80 + t.length; matched++; }
        else if(ps.includes(t)){ score += 40 + t.length; matched++; }
        else score -= 18;
      });
      if(productAliasKeyHf25(pn) === alias) score += 400;
      if(!matched) score -= 300;
      score -= Math.abs(ps.length - simple.length) * 0.05;
      if(score > bestScore){ bestScore = score; best = p; }
    });
    return bestScore >= 80 ? best : null;
  }

  function cleanPromptProductNameHf25(raw){
    return String(raw || '')
      .replace(/^\s*[•\-\*]\s*/,'')
      .replace(/[()]/g,' ')
      .replace(/\b(?:bolsa|pack|packs|paquete|paquetes|caja|pieza)\s*(?:de|x)?\s*\d+(?:[,.]\d+)?\s*(?:ud\.?|uds\.?|unidades|latas|botellines|botellas|botes|kg)?\b/ig,' ')
      .replace(/\b\d+(?:[,.]\d+)?\s*(?:ud\.?|uds\.?|unidades)\b/ig,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function promptDonationTruthRowsHf25(){
    const info = fieldValue('planInfo');
    const lines = String(info || '').replace(/\r/g,'').split(/\n/);
    const out = [];
    let active = null;
    const stop = /^(OBJETIVO|DATOS\s+PARA|DESCRIPCI[ÓO]N|CRITERIOS?|DETALLES\s+PARA|COMIDAS\s+INCLUIDAS|PISTAS\s+DE\s+COMPRA|REGLAS\s+FINALES|COMPRA|COMPRAS|A\s+COMPRAR)\s*:/i;
    const start = /^(PRODUCTO\s+EN\s+LA\s+PE[NÑ]A|DONACIONES?\b|DONACI[ÓO]N\b|DONACION\b|EXISTENCIAS?\b|YA\s+TENEMOS\b)/i;
    const extract = (line, name) => {
      const m = String(line || '').match(new RegExp('\\[\\s*' + name + '\\s*[:=]\\s*([^\\]\\n]+)\\]', 'i'));
      return m ? String(m[1] || '').trim().replace(/[\]\)\.]+$/,'') : '';
    };
    const meta = (line, prev={}) => {
      const h = String(line || '');
      const m = {...prev};
      if(/DONADO\s+TIENDA|DONACI[ÓO]N\s+DE\s+TIENDA/i.test(h)) m.ticketDonacion = 'DONADO TIENDA';
      else if(/DONADO\s+OTROS|DONACI[ÓO]N\s+DE\s+OTROS/i.test(h)) m.ticketDonacion = 'DONADO OTROS';
      else if(/DONADO\s+SOCIO|DONACIONES?\s+DE\s+SOCIOS?|PRODUCTO\s+EN\s+LA\s+PE[NÑ]A/i.test(h)) m.ticketDonacion = 'DONADO SOCIO';
      if(!m.ticketDonacion) m.ticketDonacion = 'DONADO SOCIO';
      const d = extract(h, 'Donante'), r = extract(h, 'Responsable');
      if(d) m.donor = d;
      if(r) m.responsable = r;
      if(!m.donor && /PRODUCTO\s+EN\s+LA\s+PE[NÑ]A/i.test(h)) m.donor = 'Peña El Arrastre';
      if(!m.responsable && /PRODUCTO\s+EN\s+LA\s+PE[NÑ]A/i.test(h)) m.responsable = document.getElementById('planResponsable')?.selectedOptions?.[0]?.textContent || 'Colty';
      return m;
    };
    const qty = raw => {
      const s = String(raw || '').replace(/^\s*[•\-\*]\s*/,'');
      const tail = s.includes(':') ? s.slice(s.lastIndexOf(':') + 1) : s;
      let m = tail.match(/(\d+(?:[,.]\d+)?)\s*(?:pack|packs|paquete|paquetes)\s*(?:de|x)\s*(\d+(?:[,.]\d+)?)/i);
      if(m) return Math.max(0, Math.round(Number(String(m[1]).replace(',','.')) * Number(String(m[2]).replace(',','.')) * 100) / 100);
      m = tail.match(/(?:pack|packs|paquete|paquetes)\s*(?:de|x)\s*(\d+(?:[,.]\d+)?)/i);
      if(m) return Math.max(0, Number(String(m[1]).replace(',','.')));
      m = tail.match(/(\d+(?:[,.]\d+)?)/);
      return m ? Math.max(0, Number(String(m[1]).replace(',','.'))) : 1;
    };
    const donorRefFrom = (ticket, label) => {
      const txt = String(label || '').trim();
      if(ticket === 'DONADO TIENDA'){
        const store = tiendas().find(t => normalizeText(t.nombre || '') === normalizeText(txt) || normalizeText(t.nombre || '').includes(normalizeText(txt)) || normalizeText(txt).includes(normalizeText(t.nombre || '')));
        return store ? 'T:' + store.id : txt;
      }
      const person = socios().find(s => normalizeText(s.nombre || '') === normalizeText(txt) || normalizeText(s.nombre || '').includes(normalizeText(txt)) || normalizeText(txt).includes(normalizeText(s.nombre || '')));
      return person ? 'P:' + person.id : txt;
    };
    const personIdFrom = label => {
      const txt = String(label || '').trim();
      const person = socios().find(s => normalizeText(s.nombre || '') === normalizeText(txt) || normalizeText(s.nombre || '').includes(normalizeText(txt)) || normalizeText(txt).includes(normalizeText(s.nombre || '')));
      return person?.id || document.getElementById('planResponsable')?.value || '';
    };
    const storeIdFrom = label => {
      const txt = String(label || '').trim();
      const store = tiendas().find(t => normalizeText(t.nombre || '') === normalizeText(txt) || normalizeText(t.nombre || '').includes(normalizeText(txt)) || normalizeText(txt).includes(normalizeText(t.nombre || '')));
      return store?.id || document.getElementById('planTienda')?.value || '';
    };

    lines.forEach(rawLine => {
      const line = String(rawLine || '').trim();
      if(!line) return;
      if(stop.test(line)){ active = null; return; }
      if(start.test(line)){ active = meta(line, {}); return; }
      if(active && (/Tratar\s+como\s+DONADO/i.test(line) || /\[Donante:|\[Responsable:/i.test(line))){ active = meta(line, active); return; }
      if(active && /^PRODUCTOS?\s*:?\s*$/i.test(line)) return;
      if(!active || !/^\s*[•\-\*]\s*[^:\n]{2,260}:\s*(?:\d|un|una|uno|pack|paquete|;|$)/i.test(rawLine)) return;

      let productText = String(rawLine).replace(/^\s*[•\-\*]\s*/,'');
      productText = productText.includes(':') ? productText.slice(0, productText.lastIndexOf(':')) : productText;
      productText = cleanPromptProductNameHf25(productText);
      if(!productText) return;

      const prod = resolveCatalogProductByNameHf25(productText);
      const ticketDonacion = active.ticketDonacion || 'DONADO SOCIO';
      const donorLabelText = active.donor || 'Donante indicado';
      const respLabel = active.responsable || (ticketDonacion === 'DONADO TIENDA' ? document.getElementById('planResponsable')?.selectedOptions?.[0]?.textContent : donorLabelText) || '';
      const donorRef = donorRefFrom(ticketDonacion, donorLabelText);
      const productName = prod?.nombre || productText;
      out.push({
        key:`prompt-hf25-truth:${out.length}:${productAliasKeyHf25(productName)}:${normalizeDonorRef(donorRef)}`,
        include:true,
        tipo:'DONACION',
        productId:prod?.id || '',
        productName,
        segmento:prod?.segmento || 'Sin segmento',
        destino:prod?.destino || 'Sin destino',
        unidades:qty(rawLine),
        precio:catalogPriceHf25(prod),
        tiendaId:ticketDonacion === 'DONADO TIENDA' ? storeIdFrom(donorLabelText) : (document.getElementById('planTienda')?.value || ''),
        responsableId:personIdFrom(respLabel),
        ticketDonacion,
        donorRef,
        explicitPromptDonation:true,
        explicitConfirmedDonation:true,
        explicitPromptStrictHf12:true,
        __ceHf25PromptTruth:true,
        reason:`Donación/existencia confirmada por prompt (${donorLabelText}).`
      });
    });

    // Deduplicación de verdad: mismo producto + donante + tipo, acumulando si se repite.
    const map = new Map();
    out.forEach(row => {
      const k = `${row.productId ? 'id:'+row.productId : productAliasKeyHf25(row.productName)}|${normalizeDonorRef(row.donorRef||'')}|${String(row.ticketDonacion||'').toUpperCase()}`;
      if(!map.has(k)) map.set(k, row);
      else{
        const prev = map.get(k);
        prev.unidades = Math.round((Number(prev.unidades||0) + Number(row.unidades||0)) * 100) / 100;
      }
    });
    return [...map.values()];
  }

  function promptProductMatchKeyHf25(row){
    const id = canonicalProposalProductId(row) || row?.productId || '';
    if(id) return 'id:' + id;
    return productAliasKeyHf25(row?.productName || row?.producto || '');
  }

  function samePromptProductHf25(row, truth){
    if(!row || !truth) return false;
    const rid = canonicalProposalProductId(row) || row.productId || '';
    if(rid && truth.productId && String(rid) === String(truth.productId)) return true;
    const ra = productAliasKeyHf25(row.productName || row.producto || '');
    const ta = productAliasKeyHf25(truth.productName || '');
    if(ra && ta && ra === ta) return true;
    const r = simplifyProductSearchKeyHf24(row.productName || row.producto || '');
    const t = simplifyProductSearchKeyHf24(truth.productName || '');
    if(!r || !t) return false;
    if(r === t || r.includes(t) || t.includes(r)) return true;
    const toks = t.split(' ').filter(x => x.length >= 3);
    return toks.length >= 2 && toks.filter(x => r.includes(x)).length >= Math.min(3, toks.length);
  }

  function applyPromptDonationTruthHf25(list){
    const truth = promptDonationTruthRowsHf25();
    if(!truth.length) return Array.isArray(list) ? list : [];
    const base = (Array.isArray(list) ? list : []).map(r => ({...r})).filter(r => !r.__ceHf25PromptTruth && !String(r.key || '').startsWith('prompt-hf25-truth:'));
    const out = [];
    const purchaseAgg = new Map();

    base.forEach(row => {
      if(!row) return;
      const hit = truth.find(t => samePromptProductHf25(row, t));
      if(!hit){
        out.push(row);
        return;
      }
      if(row.tipo === 'COMPRA'){
        const k = hit.productId ? 'id:' + hit.productId : productAliasKeyHf25(hit.productName);
        const prev = purchaseAgg.get(k) || {units:0, row:null};
        prev.units += Math.max(0, Number(row.unidades || 0));
        prev.row = prev.row || row;
        purchaseAgg.set(k, prev);
        return;
      }
      // Se descartan donaciones antiguas del mismo producto: manda la tabla verdad del prompt.
    });

    truth.forEach(row => out.push({...row}));

    // Si Zuzu había calculado más compra que lo donado, se conserva solo el déficit real.
    const donatedByProduct = new Map();
    truth.forEach(t => {
      const k = t.productId ? 'id:' + t.productId : productAliasKeyHf25(t.productName);
      donatedByProduct.set(k, (donatedByProduct.get(k) || 0) + Number(t.unidades || 0));
    });
    purchaseAgg.forEach((agg, k) => {
      const deficit = Math.max(0, Math.round((Number(agg.units || 0) - Number(donatedByProduct.get(k) || 0)) * 100) / 100);
      if(deficit <= 0) return;
      const baseRow = agg.row || {};
      const truthRow = truth.find(t => (t.productId ? 'id:'+t.productId : productAliasKeyHf25(t.productName)) === k);
      const prod = truthRow?.productId ? byId('productos', truthRow.productId) : resolveCatalogProductByNameHf25(truthRow?.productName || baseRow.productName || '');
      out.push({
        ...baseRow,
        key:`prompt-hf25-deficit:${k}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
        include:true,
        tipo:'COMPRA',
        productId:truthRow?.productId || prod?.id || baseRow.productId || '',
        productName:truthRow?.productName || prod?.nombre || baseRow.productName || 'Producto',
        segmento:truthRow?.segmento || prod?.segmento || baseRow.segmento || '',
        destino:truthRow?.destino || prod?.destino || baseRow.destino || '',
        unidades:deficit,
        precio:Number(baseRow.precio || truthRow?.precio || catalogPriceHf25(prod) || 0),
        tiendaId:baseRow.tiendaId || document.getElementById('planTienda')?.value || '',
        responsableId:baseRow.responsableId || document.getElementById('planResponsable')?.value || '',
        ticketDonacion:'',
        donorRef:'',
        explicitPromptDonation:false,
        explicitConfirmedDonation:false,
        reason:'Compra por déficit real tras restar donación/existencia explícita del prompt.'
      });
    });
    return out;
  }


  // HOTFIX27: método nuevo, diagnóstico verificable del prompt antes de fiarse de Zuzu.
  function ceHf27ProductTokens(value){
    const generic = new Set('DE DEL LA EL LOS LAS EN CON SIN TIPO PARA Y O A UN UNA UNO UD UDS UNIDAD UNIDADES BOTELLA BOTELLAS LATA LATAS BOTE BOTES BOLSA BOLSAS PACK PAQUETE PAQUETES CAJA PIEZA KG GR L CL ML LITRO LITROS NORMAL GRANDE MEDIANA PEQUENA PEQUEÑA ENTERO MEZCLA DIA DIAS'.split(' '));
    return simplifyProductSearchKeyHf24(value || '').split(' ').filter(t => t.length >= 2 && !generic.has(t));
  }
  function ceHf27CatalogPrice(prod){
    return Number(prod?.defaultPrecio ?? prod?.precio ?? prod?.precioReferencia ?? prod?.precio_ref ?? prod?.pvp ?? prod?.importe ?? prod?.importeReferencia ?? prod?.precioCompra ?? 0) || 0;
  }

  function ceHf38BestCatalogCandidate(inputName, candidates){
    const arr = (Array.isArray(candidates) ? candidates : []).filter(Boolean);
    if(arr.length <= 1) return arr[0] || null;
    const raw = String(inputName || '');
    const n = normalizeProductSearchKeyHf24(raw);
    const s = simplifyProductSearchKeyHf24(raw);
    const wanted = ceHf27ProductTokens(raw);
    const alias = productAliasKeyHf25(raw);
    const has = (...parts) => parts.every(part => n.includes(normalizeProductSearchKeyHf24(part)) || s.includes(normalizeProductSearchKeyHf24(part)));
    const scoreOne = p => {
      const name = String(p?.nombre || '');
      const pn = normalizeProductSearchKeyHf24(name);
      const ps = simplifyProductSearchKeyHf24(name);
      const ptoks = ceHf27ProductTokens(name);
      let score = 0;
      wanted.forEach(t => {
        if(ptoks.includes(t)) score += 120 + Math.min(30, t.length * 2);
        else if(ps.includes(t)) score += 70 + Math.min(20, t.length);
        else score -= 55;
      });
      if(productAliasKeyHf25(name) === alias && !String(alias || '').startsWith('norm:')) score += 360;
      if(has('AMBAR') && (pn.includes('AMBAR') || ps.includes('AMBAR'))) score += 500;
      if(has('BARRIL') && (pn.includes('BARRIL') || ps.includes('BARRIL'))) score += 420;
      if((n.includes('30') || s.includes('30')) && (pn.includes('30') || ps.includes('30'))) score += 90;
      if(has('AMBAR') && !(pn.includes('AMBAR') || ps.includes('AMBAR'))) score -= 650;
      if(has('BARRIL') && !(pn.includes('BARRIL') || ps.includes('BARRIL'))) score -= 520;
      if(has('CERVEZA') && has('AMBAR') && has('BARRIL') && (pn.includes('0 0') || ps.includes('0 0') || pn.includes('00') || ps.includes('00'))) score -= 900;
      if(pn === n) score += 1000;
      if(ps === s) score += 650;
      score -= Math.abs(ps.length - s.length) * 0.35;
      return score;
    };
    return arr.slice().sort((a,b) => scoreOne(b) - scoreOne(a))[0] || arr[0] || null;
  }

  function ceHf27ResolveProductDiagnostic(name){
    const raw = String(name || '').trim();
    const products = rows('productos');
    const cleanName = cleanPromptProductNameHf25(raw);
    const norm = normalizeProductSearchKeyHf24(cleanName);
    const simp = simplifyProductSearchKeyHf24(cleanName);
    const alias = productAliasKeyHf25(cleanName);
    const pack = (product, method, score, review, candidates) => {
      const p = product || null;
      return {
        product:p,
        method,
        score:Number(score || 0),
        review:!!review,
        candidates:Array.isArray(candidates) ? candidates.slice(0, 5).map(x => x?.nombre || '').filter(Boolean) : [],
        productId:p?.id || '',
        productName:p?.nombre || cleanName,
        segmento:p?.segmento || '',
        destino:p?.destino || '',
        precio:ceHf27CatalogPrice(p)
      };
    };
    if(!cleanName) return pack(null, 'VACÍO', 0, true);
    const strictHf37 = ceHf37StrictCatalogProductOverride(cleanName);
    if(strictHf37) return pack(strictHf37, 'ESTRICTO HF38', 1200, false);

    const exactNorm = products.filter(p => normalizeProductSearchKeyHf24(p?.nombre || '') === norm);
    if(exactNorm.length === 1) return pack(exactNorm[0], 'EXACTO NORMALIZADO', 1000, false);
    if(exactNorm.length > 1) return pack(ceHf38BestCatalogCandidate(cleanName, exactNorm), 'EXACTO MÚLTIPLE', 990, true, exactNorm);

    const exactSimp = products.filter(p => simplifyProductSearchKeyHf24(p?.nombre || '') === simp);
    if(exactSimp.length === 1) return pack(exactSimp[0], 'EXACTO SIN ENVASES', 930, false);
    if(exactSimp.length > 1) return pack(ceHf38BestCatalogCandidate(cleanName, exactSimp), 'EXACTO SIN ENVASES MÚLTIPLE', 900, true, exactSimp);

    const aliasMatches = products.filter(p => productAliasKeyHf25(p?.nombre || '') === alias && !String(alias || '').startsWith('norm:'));
    if(aliasMatches.length === 1) return pack(aliasMatches[0], 'ALIAS CATÁLOGO', 850, false);
    if(aliasMatches.length > 1){
      const byBest = aliasMatches.slice().sort((a,b)=>String(a?.nombre||'').length-String(b?.nombre||'').length);
      return pack(ceHf38BestCatalogCandidate(cleanName, aliasMatches), 'ALIAS CATÁLOGO MÚLTIPLE', 820, true, byBest);
    }

    // %cadena% completo
    const containsFull = products.filter(p => simplifyProductSearchKeyHf24(p?.nombre || '').includes(simp) || simp.includes(simplifyProductSearchKeyHf24(p?.nombre || '')));
    if(containsFull.length === 1) return pack(containsFull[0], '%CADENA%', 760, false);
    if(containsFull.length > 1){
      const byBest = containsFull.slice().sort((a,b)=>String(a?.nombre||'').length-String(b?.nombre||'').length);
      return pack(ceHf38BestCatalogCandidate(cleanName, containsFull), '%CADENA% MÚLTIPLE', 720, true, byBest);
    }

    // Recorte progresivo por palabras y por caracteres, pero con mínimo para no capturar disparates.
    const queries = [];
    const words = simp.split(' ').filter(w => w.length >= 3);
    for(let i=0;i<words.length;i++){
      const q = words.slice(i).join(' ');
      if(q.length >= 5) queries.push(q);
    }
    for(const q0 of [...queries]){
      let q = q0;
      while(q.length >= 6){
        queries.push(q);
        q = q.slice(0, -1).trim();
      }
    }
    for(const q of [...new Set(queries)]){
      const hits = products.filter(p => simplifyProductSearchKeyHf24(p?.nombre || '').includes(q));
      if(hits.length === 1) return pack(hits[0], 'RECORTE PROGRESIVO: ' + q, 650, false);
      if(hits.length > 1){
        const byBest = hits.slice().sort((a,b)=>String(a?.nombre||'').length-String(b?.nombre||'').length);
        return pack(ceHf38BestCatalogCandidate(cleanName, hits), 'RECORTE MÚLTIPLE: ' + q, 620, true, byBest);
      }
    }

    const wanted = ceHf27ProductTokens(cleanName);
    let best = null, bestScore = -9999, second = -9999, bestMatched = 0;
    products.forEach(p => {
      const name = p?.nombre || '';
      const ps = simplifyProductSearchKeyHf24(name);
      const pt = ceHf27ProductTokens(name);
      let score = 0, matched = 0;
      wanted.forEach(t => {
        if(pt.includes(t)){ score += 90 + Math.min(14, t.length); matched++; }
        else if(ps.includes(t)){ score += 48 + Math.min(12, t.length); matched++; }
        else score -= 22;
      });
      if(productAliasKeyHf25(name) === alias && !String(alias||'').startsWith('norm:')) score += 420;
      if(!matched) score -= 450;
      score -= Math.abs(ps.length - simp.length) * 0.08;
      if(score > bestScore){ second = bestScore; bestScore = score; best = p; bestMatched = matched; }
      else if(score > second) second = score;
    });
    if(best && bestScore >= 110 && bestMatched >= Math.min(2, wanted.length) && bestScore - second >= 25) return pack(best, 'TOKEN SCORE', bestScore, false);
    if(best && bestScore >= 210 && bestMatched >= 1) return pack(best, 'TOKEN SCORE REVISAR', bestScore, true);
    return pack(null, 'NO ENCONTRADO', 0, true);
  }
  function ceHf27FindDonorRef(kind, label){
    const txt = normalizeText(label || '');
    if(!txt) return '';
    const opts = donorOptions();
    const exact = opts.find(o => normalizeText(o.label) === txt);
    if(exact) return exact.value;
    const candidates = opts
      .map(o => ({...o, n:normalizeText(o.label)}))
      .filter(o => o.n && (o.n.includes(txt) || txt.includes(o.n)))
      .sort((a,b) => b.n.length - a.n.length);
    if(kind === 'DONADO TIENDA'){
      const store = candidates.find(c => String(c.value || '').startsWith('T:'));
      if(store) return store.value;
    }else{
      const person = candidates.find(c => String(c.value || '').startsWith('P:'));
      if(person) return person.value;
    }
    return candidates[0]?.value || label || '';
  }
  function ceHf27PromptBlocks(){
    const info = String(fieldValue('planInfo') || '') + '\n' + String(fieldValue('planDescripcion') || '') + '\n' + String(fieldValue('planEventoTitulo') || '');
    const lines = String(info || '').replace(/\r/g,'').split(/\n/);
    const out = [];
    let active = null;
    const extract = (line, name) => {
      const m = String(line || '').match(new RegExp('\\[\\s*' + name + '\\s*[:=]\\s*([^\\]\\n]+)\\]', 'i'));
      return m ? String(m[1] || '').trim().replace(/[\]\)\.]+$/,'') : '';
    };
    const donationType = h => {
      const n = normalizeText(h || '');
      if(/DONADO TIENDA|DONACION DE TIENDA|DONACIÓN DE TIENDA|TIENDA/.test(n)) return 'DONADO TIENDA';
      if(/DONADO OTROS|DONACION DE OTROS|DONACIÓN DE OTROS|OTROS/.test(n)) return 'DONADO OTROS';
      return 'DONADO SOCIO';
    };
    const isHeader = line => /^\s*(?:[-*•]\s*)?(?:PRODUCTO\s+EN\s+LA\s+PE[NÑ]A|DONACIONES?\s+(?:Y\s+EXISTENCIAS\s+CONFIRMADAS|DE\s+SOCIOS?|DE\s+TIENDA|DE\s+OTROS)|DONACI[ÓO]N\s+DE\s+(?:SOCIOS?|TIENDA|OTROS)|DONACION\s+DE\s+(?:SOCIOS?|TIENDA|OTROS)|DONADO\s+(?:SOCIO|TIENDA|OTROS)\s*[-–:]|EXISTENCIAS?\b|YA\s+TENEMOS\b|PRODUCTOS?\s+DONADOS?|MATERIAL\s+DONADO)\b/i.test(String(line || ''));
    const stop = /^(OBJETIVO|DATOS\s+PARA|DESCRIPCI[ÓO]N\s+CONCEPTUAL|CRITERIOS?|DETALLES\s+PARA|COMIDAS\s+INCLUIDAS|PISTAS\s+DE\s+COMPRA|REGLAS\s+FINALES|COMPRA|COMPRAS|A\s+COMPRAR)\b/i;
    const meta = (line, prev={}) => {
      const h = String(line || '');
      const m = {...prev};
      if(/DONADO|DONACI[ÓO]N|PRODUCTO\s+EN\s+LA\s+PE[NÑ]A|EXISTENCIAS?|YA\s+TENEMOS/i.test(h)) m.ticketDonacion = donationType(h);
      if(!m.ticketDonacion) m.ticketDonacion = 'DONADO SOCIO';
      const d = extract(h, 'Donante'), r = extract(h, 'Responsable'), t = extract(h, 'Tienda');
      if(d) m.donorLabel = d;
      if(r) m.responsableLabel = r;
      if(t) m.tiendaLabel = t;
      let mm = h.match(/donado\s+(socio|tienda|otros)\s*[-–:]\s*([^\n\[]+)/i) || h.match(/donaci[óo]n\s+de\s+(socio|socios|tienda|otros)\s*[-–:]\s*([^\n\[]+)/i);
      if(mm){
        const kind = normalizeText(mm[1] || '');
        m.ticketDonacion = /TIENDA/.test(kind) ? 'DONADO TIENDA' : (/OTRO/.test(kind) ? 'DONADO OTROS' : 'DONADO SOCIO');
        const parts = String(mm[2] || '').split('/').map(x => x.trim()).filter(Boolean);
        if(!m.donorLabel && parts[0]) m.donorLabel = parts[0].replace(/responsable\s*[:=]?.*$/i,'').trim();
        const rp = parts.find(x => /responsable/i.test(x));
        if(!m.responsableLabel && rp) m.responsableLabel = rp.replace(/responsable\s*[:=]?/i,'').trim();
      }
      if(!m.donorLabel && /PRODUCTO\s+EN\s+LA\s+PE[NÑ]A/i.test(h)) m.donorLabel = 'Peña El Arrastre';
      if(!m.responsableLabel && /PRODUCTO\s+EN\s+LA\s+PE[NÑ]A/i.test(h)) m.responsableLabel = document.getElementById('planResponsable')?.selectedOptions?.[0]?.textContent || 'Colty';
      if(!m.donorLabel && /EXISTENCIAS?|YA\s+TENEMOS/i.test(h)) m.donorLabel = 'Existencias';
      return m;
    };
    const qtyFromLine = raw => {
      const s = String(raw || '').replace(/^\s*[•\-\*]\s*/,'');
      const tail = s.includes(':') ? s.slice(s.lastIndexOf(':') + 1) : s;
      let m = tail.match(/(\d+(?:[,.]\d+)?)\s*(?:pack|packs|paquete|paquetes|caja|cajas)\s*(?:de|x)\s*(\d+(?:[,.]\d+)?)/i);
      if(m) return Math.max(0, Math.round(Number(String(m[1]).replace(',','.')) * Number(String(m[2]).replace(',','.')) * 100) / 100);
      m = tail.match(/(\d+(?:[,.]\d+)?)/);
      return m ? Math.max(0, Number(String(m[1]).replace(',','.'))) : 1;
    };
    const isProductLine = raw => {
      const s = String(raw || '').trim();
      if(!s || /^PRODUCTOS?\s*:?$/i.test(s)) return false;
      if(/^(?:tratar\s+todo|donante|responsable|tienda)\b/i.test(s)) return false;
      return /^\s*[•\-\*]\s*[^:\n]{2,260}:\s*(?:\d|un|una|uno|pack|paquete|caja|barril)/i.test(raw || '')
        || /^[^:\n]{2,260}:\s*(?:\d|un|una|uno|pack|paquete|caja|barril)/i.test(s);
    };
    lines.forEach((rawLine, idx) => {
      const line = String(rawLine || '').trim();
      if(!line) return;
      if(stop.test(line)){ active = null; return; }
      if(isHeader(line)){ active = meta(line, active || {section:line}); active.section = active.section || line; return; }
      if(active && (/Tratar\s+todo\s+este\s+bloque\s+como\s+DONADO/i.test(line) || /Tratar\s+como\s+DONADO/i.test(line) || /\[Donante:|\[Responsable:|^responsable\s*[:=]|^donante\s*[:=]/i.test(line))){ active = meta(line, active); return; }
      if(!active || !isProductLine(rawLine)) return;
      let productText = String(rawLine).replace(/^\s*[•\-\*]\s*/,'');
      productText = productText.includes(':') ? productText.slice(0, productText.lastIndexOf(':')) : productText;
      productText = cleanPromptProductNameHf25(productText);
      const ticketDonacion = active.ticketDonacion || 'DONADO SOCIO';
      const donorRef = ceHf27FindDonorRef(ticketDonacion, active.donorLabel || 'Donante indicado');
      const respRef = ceHf27FindDonorRef('DONADO SOCIO', active.responsableLabel || active.donorLabel || document.getElementById('planResponsable')?.selectedOptions?.[0]?.textContent || '');
      const match = ceHf27ResolveProductDiagnostic(productText);
      out.push({
        line:idx+1,
        raw:String(rawLine || '').trim(),
        section:active.section || '',
        productText,
        unidades:qtyFromLine(rawLine),
        ticketDonacion,
        donorLabel:active.donorLabel || '',
        donorRef,
        responsableLabel:active.responsableLabel || '',
        responsableId:String(respRef || '').startsWith('P:') ? String(respRef).slice(2) : (document.getElementById('planResponsable')?.value || ''),
        match
      });
    });
    return out;
  }
  function ceHf27TruthRowsFromDiagnostics(){
    return ceHf27PromptBlocks().map((d, pos) => {
      const p = d.match.product || {};
      return {
        key:`diag-hf27-truth:${pos}:${d.match.productId || productAliasKeyHf25(d.productText)}:${normalizeDonorRef(d.donorRef || '')}`,
        include:true,
        tipo:'DONACION',
        productId:d.match.productId || '',
        productName:d.match.productName || d.productText,
        segmento:d.match.segmento || 'Sin segmento',
        destino:d.match.destino || 'Sin destino',
        unidades:Number(d.unidades || 0) || 1,
        necesidadTotal:Number(d.unidades || 0) || 1,
        necesidadCalculada:Number(d.unidades || 0) || 1,
        precio:Number(d.match.precio || 0),
        tiendaId:d.ticketDonacion === 'DONADO TIENDA' ? String(d.donorRef || '').replace(/^T:/,'') : (document.getElementById('planTienda')?.value || ''),
        responsableId:d.responsableId || document.getElementById('planResponsable')?.value || '',
        ticketDonacion:d.ticketDonacion,
        donorRef:d.donorRef,
        explicitPromptDonation:true,
        explicitConfirmedDonation:true,
        explicitPromptStrictHf12:true,
        __ceHf27DiagnosticTruth:true,
        __ceHf29DiagnosticTruth:true,
        __ceDiagnosticStatus: d.match.productId ? (d.match.review ? 'REVISAR' : 'OK') : 'NO ENCONTRADO',
        reason:`Diagnóstico HF30: ${d.match.productId ? 'producto localizado' : 'producto no localizado'} desde prompt. Método: ${d.match.method}. Donante: ${d.donorLabel || donorLabel(d.donorRef)}.`
      };
    });
  }
  function ceHf27ApplyDiagnosticTruth(list){
    const truth = ceHf27TruthRowsFromDiagnostics();
    if(!truth.length) return Array.isArray(list) ? list : [];
    const out = truth.slice();
    const seenPurchases = new Set();
    (Array.isArray(list) ? list : []).forEach(row => {
      if(!row || String(row.tipo || '').toUpperCase() !== 'COMPRA' || Number(row.unidades || 0) <= 0) return;
      // HOTFIX31: una fila COMPRA ya representa "A COMPRAR".
      // No se le vuelve a restar la donación, porque eso era lo que hacía desaparecer:
      // donado 1 + necesidad 2 => compra 1, y después se convertía erróneamente en 0.
      const rid = canonicalProposalProductId(row) || row.productId || '';
      const ralias = productAliasKeyHf25(row.productName || row.producto || '');
      const uniq = `${rid || ralias}|${Number(row.unidades || 0)}|${Number(row.precio || 0)}|${row.tiendaId || ''}|${row.responsableId || ''}|${row.key || ''}`;
      if(seenPurchases.has(uniq)) return;
      seenPurchases.add(uniq);
      out.push({
        ...row,
        include:true,
        tipo:'COMPRA',
        ticketDonacion:'',
        donorRef:'',
        __ceZuzuPurchaseNoPrompt: !(row.key || '').startsWith('plan-buy-extra:') && !(row.key || '').startsWith('prompt-hf24-deficit:'),
        reason: row.reason || 'Compra propuesta por Zuzu o creada por déficit real.'
      });
    });
    return out;
  }
  function cePlanFix31ExtractPromptBrief(){
    const raw = String(fieldValue('planEventoTitulo') || '') + '\n' + String(fieldValue('planDescripcion') || '') + '\n' + String(fieldValue('planInfo') || '');
    const norm = normalizeText(raw || '');
    const numFrom = (rx, fallback) => { const m = raw.match(rx); return m ? Number(String(m[1]).replace(',','.')) : (fallback || 0); };
    const days = Math.max(1, numFrom(/duraci[oó]n\s+del\s+evento\s*:\s*(\d+)/i, 0) || (raw.match(/(?:dia|día)\s*[_\- ]*(\d+)/gi) || []).map(x => Number((x.match(/\d+/)||[0])[0])).reduce((a,b)=>Math.max(a,b),0) || Number(fieldValue('planDias') || 1));
    const asistentes = numFrom(/personas\s+asistentes\s*:\s*(\d+)/i, Number(fieldValue('planPersonas') || 0));
    const cerveza = numFrom(/personas\s+que\s+beber[aá]n\s+cerveza\s*:\s*(\d+)/i, 0);
    const cubatas = numFrom(/personas\s+que\s+tomar[aá]n\s+cubatas\s*:\s*(\d+)/i, 0);
    const cubatasPorPersona = numFrom(/cubatas\s*[:=]\s*(\d+)\s*por\s+persona/i, 0) || numFrom(/(\d+)\s*cubatas\s+por\s+persona/i, 0);
    const cervezasMax = numFrom(/cerveza\s*[:=]\s*(?:m[aá]ximo\s*)?(\d+)\s*(?:latas|botellines)/i, 0) || numFrom(/(\d+)\s*(?:latas|botellines)\s+por\s+persona\s+consumidora/i, 0);
    const sinAlcohol = numFrom(/personas\s+sin\s+alcohol[^:\n]*:\s*(\d+)/i, 0);
    const cenaReal = numFrom(/personas\s+que\s+cenar[aá]n\s+realmente\s*:\s*(\d+)/i, 0) || numFrom(/para\s+unas\s+(\d+)\s+personas/i, 0);
    const presupuesto = numFrom(/presupuesto\s+objetivo\s*:\s*(\d+(?:[,.]\d+)?)/i, 0);
    const maximo = numFrom(/l[ií]mite\s+m[aá]ximo\s+de\s+coste\s*:\s*(\d+(?:[,.]\d+)?)/i, 0);
    const momentLines = [];
    const seenMom = new Set();
    const addMoment = (d, m, text) => { const key = `${d}|${normalizeText(m)}`; if(seenMom.has(key)) return; seenMom.add(key); momentLines.push(`dia_${d} (${m}): ${String(text || '').trim()}`); };
    raw.split(/\n/).forEach(line => {
      const mm = String(line || '').match(/^\s*(?:[-*•]\s*)?(?:dia|día|jornada)\s*[_\- ]*(\d{1,2})\b\s*(?:\(([^)]*)\))?\s*:??\s*([^\n]*)/i);
      if(!mm) return;
      const d = mm[1];
      const par = normalizeText(mm[2] || '');
      const txt = String(mm[3] || mm[2] || '').trim();
      const n = normalizeText(txt || '');
      const explicit = [];
      if(/APERITIVO|VERMUT|PICOTEO/.test(par)) explicit.push('aperitivo');
      if(/COMIDA|ALMUERZO/.test(par)) explicit.push('comida');
      if(/TARDEO|CUBATA.*TARDE|TARDE.*CUBATA/.test(par)) explicit.push('tardeo/cubatas');
      if(/CUBATA.*NOCHE|NOCHE.*CUBATA|COPA.*NOCHE/.test(par)) explicit.push('cubatas noche');
      if(/CENA/.test(par)) explicit.push('cena');
      if(explicit.length && !/VIERNES|SABADO|SÁBADO|DOMINGO|LUNES|MARTES|MIERCOLES|MIÉRCOLES|JUEVES|\d{1,2}\/\d{1,2}/.test(par)) { explicit.forEach(m => addMoment(d,m,txt || mm[2])); return; }
      if(/APERITIVO|VERMUT|PICOTEO/.test(n)) addMoment(d,'aperitivo',txt);
      if(/COMIDA|ALMUERZO|BUFFET|PAELLA|ASADO/.test(n)) addMoment(d,'comida',txt);
      if(/TARDEO|CUBATA.*TARDE|TARDE.*CUBATA/.test(n)) addMoment(d,'tardeo/cubatas',txt);
      if(/CENA|CENAR/.test(n)) addMoment(d,'cena',txt);
      if(/CUBATA|COPA/.test(n) && /NOCHE|NOCTURN/.test(n)) addMoment(d,'cubatas noche',txt);
    });
    return {raw, norm, days, asistentes, cerveza, cubatas, cubatasPorPersona, cervezasMax, sinAlcohol, cenaReal, presupuesto, maximo, momentLines};
  }
  function cePlanFix31BriefHtml(){
    const b = cePlanFix31ExtractPromptBrief();
    const donCount = ceHf27PromptBlocks().length;
    const moments = b.momentLines.length ? b.momentLines.map(x => `<li>${esc(x)}</li>`).join('') : '<li>No se han detectado momentos por día; Zuzu deberá proponerlos o pedir datos.</li>';
    return `<section class="ce-hf27-diagnostic ce-fix31-brief">
      <div class="ce-hf27-head"><div><h3>Brief estructurado que se enviará a Gemini</h3><p>ControlEvent extrae esto antes de generar compras: duración, asistentes, momentos, bebida, cena real, presupuesto y donaciones. El botón de abajo ya no usa compra local: llama a Gemini con este brief.</p></div>
      <div class="ce-hf27-kpis"><span>Días <b>${esc(b.days)}</b></span><span>Asistentes <b>${esc(b.asistentes || '—')}</b></span><span>Cerveza <b>${esc(b.cerveza || '—')}</b></span><span>Cubatas <b>${esc(b.cubatas || '—')}</b></span><span>Donaciones <b>${donCount}</b></span></div></div>
      <div style="padding:12px 16px;background:#fff;border-top:1px solid #e5e7eb">
        <p><b>Presupuesto:</b> objetivo ${esc(b.presupuesto || '—')} €/persona · máximo ${esc(b.maximo || '—')} €/persona · <b>sin alcohol/niños:</b> ${esc(b.sinAlcohol || '—')} · <b>cenan realmente:</b> ${esc(b.cenaReal || '—')}</p><p><b>Reglas bebida:</b> cerveza máx. ${esc(b.cervezasMax || '—')} ud/persona/día · cubatas ${esc(b.cubatasPorPersona || '—')} por persona consumidora.</p>
        <ul style="margin:8px 0 0 18px">${moments}</ul>
      </div>
    </section>`;
  }

  function ceHf27DiagnosticsHtml(){
    const rowsDiag = ceHf27PromptBlocks();
    const ok = rowsDiag.filter(x => x.match.productId && !x.match.review).length;
    const revisar = rowsDiag.filter(x => x.match.productId && x.match.review).length;
    const no = rowsDiag.filter(x => !x.match.productId).length;
    const valorDiagnostico = rowsDiag.reduce((sum, x) => sum + Number(x.unidades || 0) * Number(x.match?.precio || 0), 0);
    const body = rowsDiag.map((d, i) => {
      const status = d.match.productId ? (d.match.review ? 'REVISAR' : 'OK') : 'NO ENCONTRADO';
      const cls = status === 'OK' ? 'ok' : status === 'REVISAR' ? 'warn' : 'bad';
      return `<tr class="${cls}">
        <td>${i+1}</td>
        <td><b>${esc(d.productText)}</b><small>Línea ${d.line}: ${esc(d.raw)}</small></td>
        <td>${qty(d.unidades)}</td>
        <td>${esc(d.ticketDonacion)}<small>${esc(d.donorLabel || donorLabel(d.donorRef))} / ${esc(d.responsableLabel || personaOf(d.responsableId)?.nombre || '')}</small></td>
        <td><b>${esc(d.match.productName || '—')}</b><small>${esc(d.match.segmento || 'Sin segmento')} · ${esc(d.match.destino || 'Sin destino')}</small></td>
        <td>${money(d.match.precio || 0)}</td>
        <td><b>${money(Number(d.unidades || 0) * Number(d.match?.precio || 0))}</b></td>
        <td><span class="ce-hf27-status">${esc(status)}</span><small>${esc(d.match.method)}${d.match.candidates?.length ? ' · Candidatos: ' + esc(d.match.candidates.join(' | ')) : ''}</small></td>
      </tr>`;
    }).join('');
    return cePlanFix31BriefHtml() + `<section id="ceHf27DiagnosticoPrompt" class="ce-hf27-diagnostic">
      <div class="ce-hf27-head">
        <div><h3>Diagnóstico verificable del prompt</h3><p>Esto es la caja negra abierta: cada producto leído, cómo se ha buscado en PRODUCTOS y qué se va a crear como donación.</p></div>
        <div class="ce-hf27-kpis"><span>OK <b>${ok}</b></span><span>Revisar <b>${revisar}</b></span><span>No encontrados <b>${no}</b></span><span>Total <b>${rowsDiag.length}</b></span><span>Valor <b>${money(valorDiagnostico)}</b></span></div>
      </div>
      <div class="ce-hf27-actions"><button type="button" id="btnHf27AplicarDiagnostico">Usar diagnóstico como propuesta</button><button type="button" id="btnHf27CopiarDiagnostico">Copiar diagnóstico</button></div>
      <div class="ce-hf27-tablewrap"><table><thead><tr><th>#</th><th>Producto escrito</th><th>Uds</th><th>Donación</th><th>Producto encontrado</th><th>Precio</th><th>Importe est.</th><th>Diagnóstico</th></tr></thead><tbody>${body || '<tr><td colspan="8">No se han detectado bloques de donación/existencia en el prompt.</td></tr>'}</tbody></table></div>
    </section>`;
  }
  function ceHf27RenderDiagnosticsOnly(){
    const box = document.getElementById('planificacionResultado');
    if(!box) { try{ alert('No encuentro el contenedor planificacionResultado.'); }catch(_){} return; }
    try{
      box.classList.remove('hidden');
      box.innerHTML = ceHf27DiagnosticsHtml();
      ceHf27BindDiagnostics(box);
      try{ box.scrollIntoView({behavior:'smooth', block:'start'}); }catch(_){}
    }catch(error){
      console.error('[ControlEvent v17_prod] Diagnóstico HF28 falló', error);
      box.classList.remove('hidden');
      box.innerHTML = '<div class="planificacion-note compact-note warning"><strong>Diagnóstico no disponible:</strong> '+esc(error?.message || error)+'</div>';
      try{ box.scrollIntoView({behavior:'smooth', block:'start'}); }catch(_){}
    }
  }
  function ceHf27BindDiagnostics(root){
    const scope = root || document;
    const apply = scope.querySelector?.('#btnHf27AplicarDiagnostico');
    if(apply && !apply.__ceHf27Bound){
      apply.__ceHf27Bound = true;
      apply.addEventListener('click', () => {
        const box = document.getElementById('planificacionResultado');
        if(box){
          box.classList.remove('hidden');
          box.insertAdjacentHTML('afterbegin', '<div class="planificacion-note compact-note"><strong>Brief aceptado:</strong> se genera propuesta llamando al backend/Gemini con el prompt completo y el brief estructurado; no se usa compra local de diagnóstico.</div>');
        }
        try{ generateProposal(); }
        catch(error){ console.error('[ControlEvent FIX31] No se pudo lanzar Generar propuesta desde diagnóstico', error); }
      });
    }
    const copy = scope.querySelector?.('#btnHf27CopiarDiagnostico');
    if(copy && !copy.__ceHf27Bound){
      copy.__ceHf27Bound = true;
      copy.addEventListener('click', async () => {
        const lines = ceHf27PromptBlocks().map((d,i)=>[
          i+1, d.productText, d.unidades, d.ticketDonacion, d.donorLabel || donorLabel(d.donorRef),
          d.match.productName || '', d.match.segmento || '', d.match.destino || '', d.match.precio || 0, d.match.productId ? (d.match.review ? 'REVISAR' : 'OK') : 'NO ENCONTRADO', d.match.method
        ].join('\t')).join('\n');
        try{ await navigator.clipboard.writeText(lines); alert('Diagnóstico copiado al portapapeles.'); }catch(_){ alert(lines); }
      });
    }
  }


  function ceHf39DonationRows(list){
    return (Array.isArray(list) ? list : []).filter(r => r && String(r.tipo || '').toUpperCase() === 'DONACION' && r.include !== false);
  }
  function ceHf39PurchaseRows(list){
    return (Array.isArray(list) ? list : []).filter(r => r && String(r.tipo || '').toUpperCase() === 'COMPRA' && r.include !== false);
  }
  function ceHf39HasPurchaseAlias(list, alias){
    return ceHf39PurchaseRows(list).some(r => productAliasKeyHf25(r.productName || r.producto || '') === alias);
  }
  function ceHf39FindDonationByAlias(list, alias){
    return ceHf39DonationRows(list).find(r => productAliasKeyHf25(r.productName || r.producto || '') === alias) || null;
  }
  function ceHf39IsVasosCubata(row){
    const n = normalizeText(row?.productName || row?.producto || '');
    return n.includes('VASOS') && n.includes('CUBATA');
  }
  function ceHf39RemoveVasosCubata(list){
    return (Array.isArray(list) ? list : []).filter(r => !ceHf39IsVasosCubata(r));
  }
  function ceHf39DonationUnitsByFamily(list, family){
    return ceHf39DonationRows(list).reduce((sum, r) => {
      const prod = r.productId ? byId('productos', r.productId) : resolveCatalogProductByNameHf25(r.productName || r.producto || '');
      const fam = ceHf38InfrastructureFamilyKey(prod?.nombre || r.productName || r.producto || '');
      return fam === family ? sum + Math.max(0, Number(r.unidades || 0)) : sum;
    }, 0);
  }
  function ceHf39ForceInfrastructureMinimums(list){
    const rows = Array.isArray(list) ? list : [];
    const donations = ceHf39DonationRows(rows);
    const families = new Map();
    donations.forEach(r => {
      const prod = r.productId ? byId('productos', r.productId) : resolveCatalogProductByNameHf25(r.productName || r.producto || '');
      const seg = up(prod?.segmento || r.segmento || '');
      if(seg !== 'INFRAESTRUCTURA') return;
      const fam = ceHf38InfrastructureFamilyKey(prod?.nombre || r.productName || r.producto || '');
      if(!fam || fam.includes('otras-compras-imprevistas')) return;
      const current = families.get(fam) || {units:0, sample:r, prod:prod || null};
      current.units += Math.max(0, Number(r.unidades || 0));
      if(!current.prod && prod) current.prod = prod;
      families.set(fam, current);
    });
    families.forEach((info, fam) => {
      if(Math.max(0, Number(info.units || 0)) >= 2) return;
      const manualOverride = rows.some(r => r && r.__ceHf40ManualNeedOverride && ceHf38InfrastructureFamilyKey(r.productName || r.producto || '') === fam);
      if(manualOverride) return;
      const already = rows.some(r => String(r.tipo || '').toUpperCase() === 'COMPRA' && ceHf38InfrastructureFamilyKey(r.productName || r.producto || '') === fam);
      if(already) return;
      const prod = info.prod || resolveCatalogProductByNameHf25(info.sample?.productName || info.sample?.producto || '');
      const label = prod?.nombre || info.sample?.productName || info.sample?.producto || '';
      if(!label) return;
      ceHf32AddPurchase(rows, label, 1, `HF39 infraestructura: solo consta 1 unidad disponible de ${label}; se propone comprar 1 más.`, {noRound:true});
    });
    return rows;
  }
  function ceHf39RoundPackPurchases(list){
    const rows = Array.isArray(list) ? list : [];
    rows.forEach(r => {
      if(!r || String(r.tipo || '').toUpperCase() !== 'COMPRA') return;
      if(ceHf37IsReserveRow(r)) return;
      const name = r.productName || r.producto || '';
      if(!isPackRoundedProduct(name)) return;
      const before = Math.max(0, Number(r.unidades || 0));
      const after = roundPack24PurchaseHf30(before);
      if(after && Math.abs(after - before) > 0.0001){
        r.unidades = after;
        if(!r.__ceHf40ManualNeedOverride) r.necesidadTotal = after;
        r.reason = (r.reason || 'Compra propuesta.') + ` · HF39 pack 24: ${before} => ${after}.`;
      }
    });
    return rows;
  }
  function ceHf39UseSameTonicaAsDonation(list){
    const rows = Array.isArray(list) ? list : [];
    const donatedTonica = ceHf39DonationRows(rows).find(r => {
      const n = normalizeText(r.productName || r.producto || '');
      return n.includes('TONICA') || n.includes('SCHWEPPES');
    });
    if(!donatedTonica) return rows;
    const prod = donatedTonica.productId ? byId('productos', donatedTonica.productId) : resolveCatalogProductByNameHf25(donatedTonica.productName || donatedTonica.producto || '');
    const targetName = prod?.nombre || donatedTonica.productName || donatedTonica.producto || '';
    const targetAlias = productAliasKeyHf25(targetName);
    rows.forEach(r => {
      if(!r || String(r.tipo || '').toUpperCase() !== 'COMPRA') return;
      const n = normalizeText(r.productName || r.producto || '');
      if(!(n.includes('TONICA') || n.includes('SCHWEPPES'))) return;
      if(productAliasKeyHf25(r.productName || r.producto || '') === targetAlias) return;
      r.productId = prod?.id || r.productId || '';
      r.productName = targetName;
      r.segmento = prod?.segmento || r.segmento || '';
      r.destino = prod?.destino || r.destino || '';
      r.precio = ceHf27CatalogPrice(prod) || r.precio || 0;
      r.reason = (r.reason || 'Compra propuesta.') + ' · HF39: tónica comprada con la misma referencia detectada en donación.';
    });
    return rows;
  }
  function ceHf39SpiritAndAperitiveImagination(list){
    const rows = Array.isArray(list) ? list : [];
    if(planMode() !== 'ZUZU_TOTAL') return rows;
    const prompt = String(fieldValue('planInfo') || '') + '\n' + String(fieldValue('planDescripcion') || '');
    const desc = normalizeText(prompt);
    const personas = Math.max(1, Number(fieldValue('planPersonas') || 0) || ceHf32NumberFromPrompt(/Personas\s+Asistentes\s*:\s*(\d+(?:[,.]\d+)?)/i, 25) || 25);
    const cubataPeople = ceHf32NumberFromPrompt(/Personas\s+que\s+tomar[aá]n\s+cubatas\s*:\s*(\d+(?:[,.]\d+)?)/i, Math.round(personas * 0.50));
    const cubataFriends = ceHf32NumberFromPrompt(/(?:amigos|acompa[nñ]an|acompañan|acompanan).*?(\d+(?:[,.]\d+)?)/i, 7);
    const donations = ceHf32DonationEquivalents(rows);
    const cubataContext = /CUBATA|TARDEO|WHISKY|WISKI|RON|GINEBRA|GIN|COPA/.test(desc);
    if(cubataContext){
      const whiskyTarget = ceHf34BoostHot(Math.round((cubataPeople * 0.25 + cubataFriends * 0.45 + 2) * 4), desc);
      const whiskyDeficit = Math.max(0, whiskyTarget - donations.whiskyTotal);
      if(whiskyDeficit >= 6 || /WHISKY|WISKI/.test(desc)){
        const bottles = Math.max(1, Math.ceil(Math.max(whiskyDeficit, 14) / 14));
        const jb = Math.max(1, Math.ceil(bottles * 0.60));
        const dyc = bottles >= 3 ? Math.max(1, Math.round(bottles * 0.20)) : 0;
        const walker = bottles >= 4 ? Math.max(1, Math.round(bottles * 0.10)) : 0;
        ceHf33EnsurePurchaseMinimum(rows, 'Whisky 5 Años J.B Botella 0.7 L', jb, `HF39 whisky más realista: 60% JB. Objetivo ${whiskyTarget}, donado ${Math.round(donations.whiskyTotal)}.`, {noRound:true});
        if(dyc > 0) ceHf33EnsurePurchaseMinimum(rows, 'Whisky DYC 1L. 40°', dyc, 'HF39 whisky: 20% DYC.', {noRound:true});
        if(walker > 0) ceHf33EnsurePurchaseMinimum(rows, 'Whisky JHONY WALKER 0.7 L. 40°', walker, 'HF39 whisky: 10% JHONY WALKER/otras.', {noRound:true});
      }
      const ginTarget = ceHf34BoostHot(Math.round((personas / 5 + 4) * (/VERANO|CALOR|GIN\s*TONIC|TARDEO/.test(desc) ? 4 : 3)), desc);
      const ginDeficit = Math.max(0, ginTarget - donations.ginTotal);
      if(ginDeficit >= 4 || /GIN|GINEBRA|TARDEO|CUBATA/.test(desc)){
        ceHf33EnsurePurchaseMinimum(rows, 'Gin BEEFEATER 0.7 L. 43°', Math.max(1, Math.ceil(Math.max(ginDeficit, 14) / 14)), `HF39 ginebra algo más alegre para gin-tonic/tardeo. Objetivo ${ginTarget}, donado ${Math.round(donations.ginTotal)}.`, {noRound:true});
      }
    }
    if(/APERITIVO|JAMON|JAMÓN|QUESO|CHORIZO|SALCHICHON|SALCHICHÓN|EMBUTIDO/.test(desc)){
      if(!ceHf39HasPurchaseAlias(rows, productAliasKeyHf25('Chorizo iberico')) && !ceHf39FindDonationByAlias(rows, productAliasKeyHf25('Chorizo iberico'))){
        ceHf32AddPurchase(rows, 'Chorizo iberico', 1, 'HF39 imaginación aperitivo: algo de chorizo para completar mesa.', {noRound:true});
      }
      if(!ceHf39HasPurchaseAlias(rows, productAliasKeyHf25('Salchichon iberico')) && !ceHf39FindDonationByAlias(rows, productAliasKeyHf25('Salchichon iberico'))){
        ceHf32AddPurchase(rows, 'Salchichon iberico', 1, 'HF39 imaginación aperitivo: algo de salchichón para completar mesa.', {noRound:true});
      }
    }
    return rows;
  }
  function ceHf39FinalizeProposal(list){
    let rows = Array.isArray(list) ? list.slice() : [];
    rows = ceHf39RemoveVasosCubata(rows);
    ceHf39ForceInfrastructureMinimums(rows);
    ceHf39UseSameTonicaAsDonation(rows);
    ceHf39SpiritAndAperitiveImagination(rows);
    ceHf39RoundPackPurchases(rows);
    rows = ceHf37NormalizeReservePurchase(rows, normalizeText(String(fieldValue('planInfo') || '') + ' ' + String(fieldValue('planDescripcion') || '')));
    return rows;
  }

  function renderProposal(){
    const box = document.getElementById('planificacionResultado');
    if(!box) return;
    const wasOpen = !!box.querySelector('.plan-advanced-lines')?.open;
    const prevAdvancedSearch = box.querySelector('#planBuscarDetalleAvanzado')?.value || '';
    const prevResourceSearch = box.querySelector('#planBuscarRecurso')?.value || '';
    if(planMode() === 'ZUZU_TOTAL'){
      // FIX35_GEMINI_ULTRACORTO: en Encargo total no se reconstruye la compra con imaginación local.
      // El menú, duración y compras deben venir de Gemini/prompt; ControlEvent solo normaliza filas.
      lastProposal = normalizeProposalRowsForGroups(ceHf27ApplyDiagnosticTruth(lastProposal));
    }else{
      lastProposal = normalizeProposalRowsForGroups(ceHf39FinalizeProposal(ceHf36ForcePurchasesIfZero(ceHf32EnsureImaginedPurchases(ceHf27ApplyDiagnosticTruth(lastProposal)))));
      ensurePurchaseRowsForVisibleDeficitsHf24();
      // HOTFIX30: después de crear compras por déficit, no se vuelve a pasar por el filtro diagnóstico,
      // porque estaba eliminando las compras que sí aparecen arriba.
      lastProposal = normalizeProposalRowsForGroups(ceHf39FinalizeProposal(ceHf36ForcePurchasesIfZero(lastProposal)));
    }

    // HOTFIX53 / v16: los ingresos obligatorios deben existir ANTES de equilibrar el saldo.
    // En HF52 se calculaba el saldo con lastIncomeProposal vacío y por eso no añadía compra extra
    // aunque después se vieran 660/740 € de ingresos previstos.
    const totalComprasBaseSaldo = ceHf46IncludedPurchaseTotal(lastProposal);
    if(planContent() === 'INGRESOS_SOCIOS_OBLIGATORIOS' && !lastIncomeProposal.length){
      lastIncomeProposal = buildMandatorySocioIncomeProposal(totalComprasBaseSaldo);
    }
    lastProposal = ceHf46BalancePositiveSurplusOnce(lastProposal);

    const proposals = lastProposal;
    const source = lastSourceEvent;
    const visibleStats = planVisibleResourceStats();
    const compras = visibleStats.compras;
    const donaciones = visibleStats.donaciones;
    const totalCompras = visibleStats.totalCompras;
    const totalDonaciones = visibleStats.totalDonaciones;
    const ingresosInfo = incomeSummary(lastIncomeProposal);
    const cards = advancedDetailCardsHtml();
    box.classList.remove('hidden');
    box.innerHTML = `
      <div class="plan-summary-grid">
        <div class="plan-metric"><span>Evento modelo</span><strong>${esc(source?.titulo || (planMode()==='ZUZU_TOTAL' ? 'No procede: encargo total a Zuzu' : 'Sin evento'))}</strong><small>${esc(source?.fechaIni || '')}${source?.fechaFin ? ' · ' + esc(source.fechaFin) : ''}</small></div>
        <div class="plan-metric"><span>Compras propuestas</span><strong>${compras.length}</strong><small>${money(totalCompras)} previstos</small></div>
        <div class="plan-metric"><span>Donaciones propuestas</span><strong>${donaciones.length}</strong><small>${money(totalDonaciones)} valor estimado</small></div>
        <div class="plan-metric"><span>${planContent() === 'INGRESOS_SOCIOS_OBLIGATORIOS' ? 'Ingresos obligatorios' : 'Ingresos del modelo'}</span><strong>${qty(ingresosInfo.sociosPersonas)} SOCIOS · ${qty(ingresosInfo.noSociosPersonas)} NO SOCIOS</strong><small>${ingresosInfo.registros} registros · ${qty(ingresosInfo.totalPersonas)} personas</small></div>
      </div>
      ${renderPlanningNarrative(proposals, totalCompras, totalDonaciones)}
      ${renderHf46SaldoNote()}
      ${ceHf27DiagnosticsHtml()}
      ${renderPlanResourceVision(proposals)}
      ${renderIngresosReplica(lastIncomeProposal)}
      <div class="planificacion-note compact-note">
        <strong>Propuesta de planificación inicial:</strong> ajusta la tabla tipo Mapa de recursos y genera el evento real cuando esté revisada. Los ingresos se crearán en Pendiente, las existencias como donaciones y las compras como Pte.Compra u otros gastos.
      </div>
      <div class="plan-actions-line">
        <button type="button" class="outline" id="btnPlanSelectAll">Incluir todo</button>
        <button type="button" class="outline" id="btnPlanSelectNone">Quitar todo</button>
        <button type="button" class="secondary" id="btnPlanApplyReplica">Generar nuevo evento</button>
      </div>
      <details class="plan-advanced-lines"><summary>Detalle avanzado de líneas que se crearán · ${compras.length} compras · ${donaciones.length} donaciones</summary><div class="plan-advanced-toolbar"><input id="planBuscarDetalleAvanzado" type="search" placeholder="Buscar producto en detalle avanzado..." autocomplete="off"/><button type="button" class="outline" id="btnPlanBuscarDetalleAvanzado">Buscar</button></div><div class="plan-proposal-list" id="planProposalList">${cards}</div></details>
    `;
    bindProposalControls();
    if(wasOpen) box.querySelector('.plan-advanced-lines')?.setAttribute('open','');
    const adv = box.querySelector('#planBuscarDetalleAvanzado'); if(adv) adv.value = prevAdvancedSearch;
    const res = box.querySelector('#planBuscarRecurso'); if(res) res.value = prevResourceSearch;
  }
  function renderProposalRow(p, index){
    const tiendasOpts = tiendas().map(t => `<option value="${esc(t.id)}" ${String(t.id)===String(p.tiendaId)?'selected':''}>${esc(t.nombre || 'Tienda')}</option>`).join('');
    const sociosOpts = socios().map(s => `<option value="${esc(s.id)}" ${String(s.id)===String(p.responsableId)?'selected':''}>${esc(s.nombre || 'Socio')}</option>`).join('');
    const donorOpts = donorOptions().map(d => `<option value="${esc(d.value)}" ${String(d.value)===String(p.donorRef)?'selected':''}>${esc(d.label)}</option>`).join('');
    const ticketOpts = (p.tipo === 'DONACION' ? DONATION_TICKET_OPTIONS : PURCHASE_TICKET_OPTIONS).map(v => `<option value="${esc(v)}" ${String(v)===String(p.ticketDonacion)?'selected':''}>${esc(v || 'Pte.Compra u otros gastos')}</option>`).join('');
    const importe = Number(p.unidades || 0) * Number(p.precio || 0);
    return `
      <div class="plan-product-card ${p.include ? '' : 'excluded'} ${p.tipo === 'DONACION' ? 'plan-donation-card' : 'plan-purchase-card'}" data-plan-index="${index}" data-plan-product-name="${esc(normalizeText(p.productName))}">
        <div class="plan-product-head">
          <label class="plan-include"><input type="checkbox" data-plan-field="include" ${p.include ? 'checked' : ''}/> Incluir</label>
          <div class="plan-product-title"><strong>${esc(p.productName)}</strong><span>${esc(p.segmento)} · ${esc(p.destino)}</span></div>
          <span class="plan-confidence alta">${p.tipo === 'DONACION' ? 'Donación' : 'Compra'}</span>
        </div>
        <div class="plan-product-grid replica-grid">
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${esc(p.unidades)}" data-plan-field="unidades" /></div>
          <div class="field"><label>Precio</label><input type="number" min="0" step="0.01" value="${esc(p.precio)}" data-plan-field="precio" /></div>
          <div class="field"><label>Importe</label><input readonly class="soft-readonly" value="${esc(money(importe))}" data-plan-output="importe" /></div>
          <div class="field"><label>${p.tipo === 'DONACION' ? 'Tipo donación' : 'Ticket / estado'}</label><select data-plan-field="ticketDonacion">${ticketOpts}</select></div>
          ${p.tipo === 'DONACION'
            ? `<div class="field"><label>Donante</label><select data-plan-field="donorRef"><option value="" ${!p.donorRef?'selected':''}>-- sin donante --</option>${donorOpts}</select></div>`
            : `<div class="field"><label>Tienda</label><select data-plan-field="tiendaId">${tiendasOpts || '<option value="">Sin tiendas</option>'}</select></div>`}
          <div class="field"><label>Responsable</label><select data-plan-field="responsableId">${sociosOpts || '<option value="">Sin socios</option>'}</select></div>
        </div>
      </div>
    `;
  }
  function bindAdvancedProposalControls(root){
    const scope = root || document.getElementById('planProposalList') || document;
    scope.querySelectorAll('[data-plan-index]').forEach(card => {
      if(card.__cePlanAdvancedBound) return;
      card.__cePlanAdvancedBound = true;
      const idx = Number(card.dataset.planIndex);
      card.querySelectorAll('[data-plan-field]').forEach(input => {
        input.addEventListener('change', () => updateProposalFromCard(idx, card));
        input.addEventListener('input', () => {
          if(input.dataset.planField === 'unidades' || input.dataset.planField === 'precio') updateProposalFromCard(idx, card, true);
        });
      });
    });
  }
  function includedPlanDetailItems(){
    const groups = planResourceRows(lastProposal);
    const visibleIdx = new Set();
    groups.forEach(g => {
      (g.donationDetails || []).forEach(d => { if(Number(d.unidades || 0) > 0) visibleIdx.add(Number(d.idx)); });
      (g.purchaseDetails || []).forEach(d => { if(Number(d.unidades || 0) > 0) visibleIdx.add(Number(d.idx)); });
    });
    const raw = lastProposal.map((p, index) => ({p, index})).filter(({p,index}) =>
      p && visibleIdx.has(index) && p.include !== false && !isTinyGhostDonation(p) && !isSuppressedAutoDonation(p)
      && (p.tipo === 'DONACION' || (p.tipo === 'COMPRA' && Number(p.unidades || 0) > 0))
    );
    return sortPlanProposalDetailCards(raw);
  }
  function advancedDetailCardsHtml(){
    const detailCards = sortPlanProposalDetailCards(includedPlanDetailItems());
    return detailCards.length ? detailCards.map(({p, index}) => renderProposalRow(p, index)).join('') : '<div class="empty">No hay líneas de compras/donaciones incluidas en la propuesta generada.</div>';
  }
  function refreshAdvancedProposalDetails(){
    const list = document.getElementById('planProposalList');
    if(!list) return;
    list.innerHTML = advancedDetailCardsHtml();
    bindAdvancedProposalControls(list);
  }
  function productGroupFromKey(key){ return planResourceRows(lastProposal).find(r => String(r.key) === String(key)) || null; }
  function createPurchaseForGroup(group, units, price, tiendaId, responsableId){
    const baseIndex = group.allIndices[0];
    const base = lastProposal[baseIndex] || {};
    const row = {
      ...base,
      key:`plan-buy-extra:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      include: units > 0,
      tipo:'COMPRA',
      productId: group.productId || base.productId || '',
      productName: group.producto || base.productName || 'Producto',
      segmento: group.segmento || base.segmento || '',
      destino: group.destino || base.destino || '',
      unidades: Math.max(0, Number(units || 0)),
      necesidadTotal: Math.max(0, Number(group.donado || 0)) + Math.max(0, Number(units || 0)),
      precio: Math.max(0, Number(price || base.precio || 0)),
      tiendaId: tiendaId || document.getElementById('planTienda')?.value || '',
      responsableId: responsableId || document.getElementById('planResponsable')?.value || '',
      ticketDonacion:'',
      donorRef:'',
      __ceManualDeficitPurchaseHf31:true,
      reason:'Compra creada desde la visión global de planificación por déficit real.'
    };
    lastProposal.push(row);
    return lastProposal.length - 1;
  }
  function markPlanRowChanged(tr){
    if(!tr) return;
    tr.classList.add('plan-row-changed');
    clearTimeout(tr.__cePlanChangedTimer);
    tr.__cePlanChangedTimer = setTimeout(() => { try{ tr.classList.remove('plan-row-changed'); }catch(_){ } }, 6500);
  }
  function updateResourceEditorRow(key, tr, changedField){
    const group = productGroupFromKey(key);
    if(!group) return;
    const hadPurchaseRow = !!tr.querySelector('.plan-resource-purchase-subrow');
    let include = !!tr.querySelector('[data-plan-resource-field="include"]')?.checked;
    let need = Math.max(0, Number(tr.querySelector('[data-plan-resource-field="necesidad"]')?.value || group.necesidad || 0));
    const buyInput = tr.querySelector('[data-plan-resource-field="compra"]');
    let buy = Math.max(0, Number(buyInput?.value || group.compra || 0));
    const priceInput = tr.querySelector('[data-plan-resource-field="precio"]');
    let price = Math.max(0, Number(priceInput?.value || group.precioCompra || group.precioDonado || 0));
    const tiendaId = tr.querySelector('[data-plan-resource-field="tiendaId"]')?.value || group.tiendaId || document.getElementById('planTienda')?.value || '';
    const responsableId = tr.querySelector('[data-plan-resource-field="responsableId"]')?.value || group.responsableId || document.getElementById('planResponsable')?.value || '';
    const selectedProductId = tr.querySelector('[data-plan-resource-field="productId"]')?.value || '';
    const selectedProduct = selectedProductId ? byId('productos', selectedProductId) : null;
    if(changedField === 'productId' && selectedProduct){
      const catalogPrice = ceHf27CatalogPrice(selectedProduct);
      price = Math.max(0, Number(catalogPrice || 0));
      if(priceInput) priceInput.value = String(price);
    }

    if(changedField === 'necesidad'){
      const donatedBase = Math.max(0, Number(group.donado || 0));
      if(need < donatedBase){
        need = donatedBase;
        const needInput = tr.querySelector('[data-plan-resource-field="necesidad"]');
        if(needInput) needInput.value = String(need);
      }
      buy = planBuyAfterDonation(selectedProduct?.nombre || group.producto, need, donatedBase);
      if(buyInput) buyInput.value = String(buy);
      if(buy <= 0){
        group.purchaseIndices.forEach(idx => {
          const purchaseRow = lastProposal[idx];
          if(!purchaseRow) return;
          purchaseRow.include = false;
          purchaseRow.unidades = 0;
          purchaseRow.necesidadTotal = need || undefined;
          purchaseRow.__ceHf40ManualNeedOverride = true;
          purchaseRow.__ceSuppressedManualPurchase = true;
        });
      }
    }else if(changedField === 'compra'){
      // Prioridad absoluta al panel editable: si el usuario escribe A COMPRAR, se respeta.
      buy = Math.max(0, Number(buyInput?.value || 0));
      const donatedBase = Math.max(0, Number(group.donado || 0));
      const impliedNeed = donatedBase + buy;
      need = impliedNeed;
      const needInput = tr.querySelector('[data-plan-resource-field="necesidad"]');
      if(needInput) needInput.value = String(impliedNeed);
    }
    if(changedField !== 'include' && (buy > 0 || Number(group.donado || 0) > 0)){
      include = true;
      const chk = tr.querySelector('[data-plan-resource-field="include"]');
      if(chk) chk.checked = true;
    }

    const newName = selectedProduct?.nombre || group.producto || 'Producto';
    const newSegment = selectedProduct?.segmento || group.segmento || 'Sin segmento';
    const newDestino = selectedProduct?.destino || group.destino || 'Sin destino';
    if(changedField !== 'necesidad' && changedField !== 'compra' && buyInput){
      const roundedBuy = Number(group.donado || 0) > 0
        ? planBuyAfterDonation(newName, need || group.necesidad || buy, Number(group.donado || 0))
        : planDeficitUnits(newName, buy);
      if(Math.abs(roundedBuy - buy) > 0.0001){ buy = roundedBuy; buyInput.value = String(buy); }
    }
    const hasManualNeedBefore = group.allIndices.some(idx => lastProposal[idx]?.__ceHf40ManualNeedOverride === true);
    const preserveManualNeed = changedField === 'necesidad' || (changedField === '__sync' && hasManualNeedBefore);
    group.allIndices.forEach(idx => {
      if(lastProposal[idx]){
        lastProposal[idx].include = include;
        if(changedField === 'necesidad') lastProposal[idx].__ceHf40ManualNeedOverride = true;
        lastProposal[idx].necesidadTotal = need || undefined;
        if(selectedProductId){
          lastProposal[idx].productId = selectedProductId;
          lastProposal[idx].productName = newName;
          lastProposal[idx].segmento = newSegment;
          lastProposal[idx].destino = newDestino;
          lastProposal[idx].manualProduct = true;
        }
      }
    });
    let editedDonatedTotal = 0;
    group.donationIndices.forEach(idx => {
      const row = lastProposal[idx];
      if(!row) return;
      const donorInput = tr.querySelector(`[data-plan-proposal-index="${String(idx)}"][data-plan-resource-field="donorRef"]`);
      const respInput = tr.querySelector(`[data-plan-proposal-index="${String(idx)}"][data-plan-resource-field="donationResponsableId"]`);
      const donationUnitsInput = tr.querySelector(`[data-plan-proposal-index="${String(idx)}"][data-plan-resource-field="donationUnits"]`);
      const donationPriceInput = tr.querySelector(`[data-plan-proposal-index="${String(idx)}"][data-plan-resource-field="donationPrecio"]`);
      if(donationUnitsInput) row.unidades = Math.max(0, Number(donationUnitsInput.value || 0));
      editedDonatedTotal += Number(row.unidades || 0);
      if(donorInput) row.donorRef = normalizeDonorRef(donorInput.value);
      if(respInput) row.responsableId = respInput.value;
      if(donationPriceInput){
        if(changedField === 'productId' && selectedProduct){
          row.precio = price;
          donationPriceInput.value = String(price);
        }else{
          row.precio = Math.max(0, Number(String(donationPriceInput.value || 0).replace(',','.')));
        }
      }
      const out = tr.querySelector(`[data-plan-donation-total="${String(idx)}"]`);
      if(out) out.textContent = money(Number(row.unidades || 0) * Number(row.precio || 0));
      if(selectedProductId){
        row.productId = selectedProductId;
        row.productName = newName;
        row.segmento = newSegment;
        row.destino = newDestino;
        row.manualProduct = true;
      }
    });
    if((changedField === 'donationUnits' || changedField === 'necesidad' || changedField === '__sync') && buyInput){
      const donatedForBuy = Math.max(0, Number(editedDonatedTotal || group.donado || 0));
      const needForBuy = (changedField === 'necesidad' || changedField === '__sync')
        ? Math.max(0, Number(need || 0))
        : Math.max(0, Number(need || group.necesidad || 0));
      buy = planBuyAfterDonation(newName, needForBuy, donatedForBuy);
      buyInput.value = String(buy);
      if(buy <= 0){
        group.purchaseIndices.forEach(idx => {
          const purchaseRow = lastProposal[idx];
          if(!purchaseRow) return;
          purchaseRow.include = false;
          purchaseRow.unidades = 0;
          purchaseRow.necesidadTotal = need || undefined;
          purchaseRow.__ceHf40ManualNeedOverride = true;
          purchaseRow.__ceSuppressedManualPurchase = true;
        });
      }
    }
    let pidx = group.purchaseIndices[0];
    if((pidx === undefined || pidx < 0) && buy > 0) pidx = createPurchaseForGroup(group, buy, price, tiendaId, responsableId);
    const purchase = (pidx !== undefined && pidx !== null && pidx >= 0) ? lastProposal[pidx] : null;
    if(purchase){
      purchase.include = include && buy > 0;
      purchase.unidades = buy;
      purchase.__ceSuppressedManualPurchase = buy <= 0;
      if(buy <= 0){
        purchase.__ceHf40ManualNeedOverride = true;
        purchase.__ceManualDeficitPurchaseHf31 = true;
      }
      purchase.precio = price || purchase.precio || 0;
      purchase.tiendaId = tiendaId;
      purchase.responsableId = responsableId;
      purchase.necesidadTotal = need || undefined;
      if(selectedProductId){
        purchase.productId = selectedProductId;
        purchase.productName = newName;
        purchase.segmento = newSegment;
        purchase.destino = newDestino;
        purchase.manualProduct = true;
      }
      purchase.manualStore = changedField === 'tiendaId' || purchase.manualStore;
      const impliedNeedTotal = Math.max(0, Number(editedDonatedTotal || group.donado || 0)) + Math.max(0, Number(buy || 0));
      const finalNeedTotal = preserveManualNeed ? Math.max(0, Number(need || 0)) : impliedNeedTotal;
      purchase.necesidadTotal = finalNeedTotal || undefined;
      if(preserveManualNeed) purchase.__ceHf40ManualNeedOverride = true;
      purchase.__ceManualDeficitPurchaseHf31 = purchase.__ceManualDeficitPurchaseHf31 || changedField === 'necesidad' || changedField === 'compra';
      purchase.manualResponsible = changedField === 'responsableId' || purchase.manualResponsible;
    }
    const impliedNeedTotal = Math.max(0, Number(editedDonatedTotal || group.donado || 0)) + Math.max(0, Number(buy || 0));
    const finalNeedTotal = preserveManualNeed ? Math.max(0, Number(need || 0)) : impliedNeedTotal;
    group.allIndices.forEach(idx => {
      if(lastProposal[idx]){
        lastProposal[idx].necesidadTotal = finalNeedTotal || undefined;
        if(preserveManualNeed) lastProposal[idx].__ceHf40ManualNeedOverride = true;
      }
    });
    const purchaseTotal = tr.querySelector('[data-plan-purchase-total]');
    if(purchaseTotal) purchaseTotal.textContent = money(buy * (price || 0));
    const nowNeedsPurchaseRow = buy > 0;
    if(nowNeedsPurchaseRow !== hadPurchaseRow){
      const detailWasOpen = !!document.querySelector('.plan-advanced-lines')?.open;
      renderProposal();
      if(detailWasOpen) document.querySelector('.plan-advanced-lines')?.setAttribute('open','');
      return;
    }
    refreshAdvancedProposalDetails();
    tr.classList.toggle('excluded', !(include && (buy > 0 || Number(group.donado || 0) > 0)));
    tr.dataset.planProductName = normalizeText(newName);
    tr.dataset.planResourceKey = selectedProductId ? `id:${String(selectedProductId)}` : planGroupKey(newName);
    const meta = tr.querySelector('[data-plan-resource-meta]');
    if(meta) meta.textContent = `${newSegment || 'Sin segmento'} · ${newDestino || 'Sin destino'}`;
    const productSelect = tr.querySelector('[data-plan-resource-field="productId"]');
    if(productSelect && !selectedProductId){
      const opt = productSelect.options && productSelect.options[productSelect.selectedIndex];
      if(opt) opt.textContent = newName;
    }
    tr.classList.remove('plan-sd-comida-aperitivo','plan-sd-comida-comida','plan-sd-comida-cena','plan-sd-bebida-aperitivo','plan-sd-bebida-comida','plan-sd-bebida-cena','plan-sd-bebida-cubatas','plan-sd-infra-aperitivo','plan-sd-infra-comida','plan-sd-infra-cubatas','plan-sd-infra-cena','plan-sd-infra-infra','plan-sd-rara');
    const sdClass = planSegDestClass({segmento:newSegment,destino:newDestino});
    if(sdClass) tr.classList.add(sdClass);
    markPlanRowChanged(tr);
  }



  function selectedOptionText(select){
    try{ return select && select.options && select.selectedIndex >= 0 ? String(select.options[select.selectedIndex]?.textContent || '') : ''; }catch(_){ return ''; }
  }
  function textWithoutSelectOptions(card){
    try{
      const clone = card.cloneNode(true);
      clone.querySelectorAll('select,option,script,style,button').forEach(el => el.remove());
      clone.querySelectorAll('input,textarea').forEach(el => { if(el.value) el.setAttribute('data-current-value', el.value); });
      return clone.textContent || '';
    }catch(_){ return ''; }
  }
  function planSearchHaystack(card){
    if(!card) return '';
    const values = [
      card.dataset?.planProductName || '',
      card.dataset?.productText || '',
      card.querySelector('.plan-resource-product-label')?.textContent || '',
      selectedOptionText(card.querySelector('[data-plan-resource-field="productId"]')),
      card.querySelector('[data-plan-resource-meta]')?.textContent || '',
      card.querySelector('.plan-product-title strong')?.textContent || '',
      card.querySelector('.plan-product-title span')?.textContent || '',
      ...Array.from(card.querySelectorAll('select')).map(selectedOptionText),
      ...Array.from(card.querySelectorAll('input,textarea')).map(el => el.value || ''),
      textWithoutSelectOptions(card)
    ];
    return normalizeText(values.join(' '));
  }
  function planSearchScore(card, term, tokens){
    const hay = planSearchHaystack(card);
    if(!hay) return 0;
    let score = 0;
    const selected = normalizeText(selectedOptionText(card.querySelector('[data-plan-resource-field="productId"]')) || card.querySelector('.plan-product-title strong')?.textContent || '');
    if(selected === term) score += 1000;
    if(selected.startsWith(term)) score += 450;
    if(hay.includes(term)) score += 240;
    const ok = tokens.every(tok => hay.includes(tok));
    if(ok) score += 90 + tokens.length * 12;
    tokens.forEach(tok => { if(selected.includes(tok)) score += 35; });
    return ok || hay.includes(term) ? score : 0;
  }
  function searchPlanProductIn(inputId, selector, sectionLabel){
    const input = document.getElementById(inputId);
    const raw = String(input?.value || '').trim();
    const term = normalizeText(raw);
    if(!term){ input?.focus(); return; }
    const tokens = term.split(/\s+/).filter(Boolean);
    const cards = Array.from(new Set(Array.from(document.querySelectorAll(selector))));
    const matches = cards.map((card, pos) => ({card, pos, score:planSearchScore(card, term, tokens)})).filter(x => x.score > 0).sort((a,b)=>b.score-a.score || a.pos-b.pos);
    document.querySelectorAll('.plan-product-card.plan-found, .plan-resource-edit-row.plan-found').forEach(el => el.classList.remove('plan-found'));
    if(matches.length){
      const lastTerm = input?.dataset?.lastTerm || '';
      const lastIndex = Number(input?.dataset?.lastIndex || '-1');
      const nextIndex = lastTerm === term ? (lastIndex + 1) % matches.length : 0;
      if(input){ input.dataset.lastTerm = term; input.dataset.lastIndex = String(nextIndex); }
      const found = matches[nextIndex].card;
      found.classList.add('plan-found');
      found.scrollIntoView({behavior:'smooth', block:'center'});
      setTimeout(() => found.classList.remove('plan-found'), 2600);
      input?.focus();
    }else{
      try{ alert('No se ha encontrado en ' + (sectionLabel || 'este apartado') + ': ' + raw); }catch(_){ }
      input?.focus();
    }
  }
  function searchProposalResource(){ searchPlanProductIn('planBuscarRecurso', '#planResourceEditor .plan-resource-edit-row', 'PROPUESTA DETALLADA DEL EVENTO'); }
  function searchProposalAdvanced(){ searchPlanProductIn('planBuscarDetalleAvanzado', '#planProposalList .plan-product-card', 'Detalle avanzado de líneas'); }
  function showPlanFactoryIndicator(message){
    const msg = message || 'Creando el evento real y guardando compras, donaciones e ingresos.';
    const box = document.getElementById('planificacionResultado');
    if(box){
      let card = document.getElementById('planFactoryIndicator');
      if(!card){
        card = document.createElement('div');
        card.id = 'planFactoryIndicator';
        card.className = 'plan-factory-indicator';
        box.prepend(card);
      }
      card.innerHTML = `<span class="plan-factory-icon" aria-hidden="true">🎉</span><div><strong>Zuzu está fabricando la fiesta…</strong><small>${esc(msg)}</small></div><span class="plan-factory-dots" aria-hidden="true"><i></i><i></i><i></i></span>`;
    }
    let overlay = document.getElementById('planFactoryOverlay');
    if(!overlay){
      overlay = document.createElement('div');
      overlay.id = 'planFactoryOverlay';
      overlay.className = 'plan-factory-overlay';
      document.body?.appendChild(overlay);
    }
    overlay.innerHTML = `<div class="plan-factory-overlay-card" role="status" aria-live="polite"><span class="plan-factory-spinner" aria-hidden="true">⚙️</span><strong>Creando evento real</strong><small>${esc(msg)}<br>Compras, donaciones e ingresos se están guardando en base de datos.</small><span class="plan-factory-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>`;
  }
  function hidePlanFactoryIndicator(){
    try{ document.getElementById('planFactoryIndicator')?.remove(); }catch(_){ }
    try{ document.getElementById('planFactoryOverlay')?.remove(); }catch(_){ }
  }
  function activateCreatedEventAndOpenGraficas(newEventId){
    const id = String(newEventId || '').trim();
    if(!id) return;
    const s = state();
    try{ s.selectedEventId = id; }catch(_){ }
    try{ if(window.ControlEventApp?.state) window.ControlEventApp.state.selectedEventId = id; }catch(_){ }
    const sel = document.getElementById('selectedEvent');
    if(sel){
      const ev = rows('eventos').find(e => String(e.id || '') === id);
      if(ev && !Array.from(sel.options || []).some(o => String(o.value) === id)){
        const opt = document.createElement('option'); opt.value = id; opt.textContent = ev.titulo || 'Evento nuevo'; sel.appendChild(opt);
      }
      sel.value = id;
    }
    const setTab = () => {
      try{ currentMainTab = 'graficas'; }catch(_){ }
      try{ window.__ceCurrentMainTab = 'graficas'; }catch(_){ }
      try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = 'graficas'; }catch(_){ }
    };
    const open = () => {
      setTab();
      try{ if(window.ControlEventV447?.selectEvent){ window.ControlEventV447.selectEvent(id, {force:true, tab:'graficas', delay:80}); return; } }catch(_){ }
      try{ if(typeof window.changeSelectedEvent === 'function') window.changeSelectedEvent(id); }catch(_){ }
      try{ document.getElementById('tabGraficasBtn')?.click(); }catch(_){ }
      try{ if(typeof window.renderGraficas === 'function') window.renderGraficas({force:true, reason:'plan-created'}); }catch(_){ }
    };
    setTimeout(open, 60);
    setTimeout(() => { setTab(); try{ if(typeof window.renderGraficas === 'function') window.renderGraficas({force:true, reason:'plan-created-late'}); }catch(_){ } }, 900);
  }

  function bindIncomeProposalControls(box){
    if(!box) return;
    const refresh = () => { renderProposal(); };
    box.querySelectorAll('#planIncomeProposalList tr[data-plan-income-index]').forEach(tr => {
      const idx = Number(tr.dataset.planIncomeIndex);
      const item = lastIncomeProposal[idx];
      if(!item) return;
      tr.querySelectorAll('[data-plan-income-field]').forEach(input => {
        input.addEventListener('change', () => {
          const field = input.dataset.planIncomeField;
          if(field === 'include') item.include = !!input.checked;
          else if(field === 'numero'){
            item.numero = Math.max(0, Number(input.value || 0));
            if(planContent() === 'INGRESOS_SOCIOS_OBLIGATORIOS'){
              const includedPurchases = lastProposal.filter(p => p.include && p.tipo === 'COMPRA');
              const totalCompras = includedPurchases.reduce((sum,p)=>sum + Number(p.unidades || 0) * Number(p.precio || 0), 0);
              const price = planEstimatedEventPrice(totalCompras, Number(fieldValue('planPersonas') || 1));
              item.importeObligatorio = Math.round(Number(item.numero || 0) * price * 100) / 100;
            }
          }else if(field === 'importeVoluntario') item.importeVoluntario = Math.max(0, parseNum(input.value || 0));
          refresh();
        });
        if(input.matches('input[type=number]')) input.addEventListener('keydown', event => { if(event.key === 'Enter'){ event.preventDefault(); input.blur(); } });
      });
      tr.querySelector('[data-plan-income-delete]')?.addEventListener('click', event => {
        event.preventDefault();
        lastIncomeProposal.splice(idx, 1);
        refresh();
      });
    });
    box.querySelector('#btnPlanIncomeAll')?.addEventListener('click', () => { lastIncomeProposal = lastIncomeProposal.map(x => ({...x, include:true})); refresh(); });
    box.querySelector('#btnPlanIncomeNone')?.addEventListener('click', () => { lastIncomeProposal = lastIncomeProposal.map(x => ({...x, include:false})); refresh(); });
  }
  function bindProposalControls(){
    const box = document.getElementById('planificacionResultado');
    if(!box) return;
    bindAdvancedProposalControls(box);
    ceHf27BindDiagnostics(box);
    bindIncomeProposalControls(box);
    box.querySelectorAll('.plan-resource-edit-row').forEach(tr => {
      const key = tr.dataset.planResourceKey || '';
      tr.querySelectorAll('[data-plan-resource-field]').forEach(input => {
        const field = input.dataset.planResourceField;
        const handler = () => updateResourceEditorRow(tr.dataset.planResourceKey || key, tr, field);
        if(field === 'necesidad'){
          // No recalcular mientras se teclean cifras de varios dígitos: se aplica al salir del campo o pulsar Enter.
          input.addEventListener('keydown', event => { if(event.key === 'Enter'){ event.preventDefault(); handler(); } });
          input.addEventListener('blur', handler);
          return;
        }
        input.addEventListener('change', handler);
        if(input.matches('input[type=number]')){
          input.addEventListener('keydown', event => { if(event.key === 'Enter'){ event.preventDefault(); handler(); } });
          input.addEventListener('blur', handler);
        }
      });
    });
    const setIncluded = mode => { lastProposal = lastProposal.map(p => ({...p, include: mode === 'all'})); renderProposal(); };
    document.getElementById('btnPlanSelectAll')?.addEventListener('click', () => setIncluded('all'));
    document.getElementById('btnPlanSelectNone')?.addEventListener('click', () => setIncluded('none'));
    document.getElementById('btnPlanBuscarRecurso')?.addEventListener('click', searchProposalResource);
    document.getElementById('planBuscarRecurso')?.addEventListener('keydown', event => { if(event.key === 'Enter'){ event.preventDefault(); searchProposalResource(); } });
    document.getElementById('btnPlanBuscarDetalleAvanzado')?.addEventListener('click', searchProposalAdvanced);
    document.getElementById('planBuscarDetalleAvanzado')?.addEventListener('keydown', event => { if(event.key === 'Enter'){ event.preventDefault(); searchProposalAdvanced(); } });
    document.getElementById('btnPlanOrdenProducto')?.addEventListener('click', () => { planResourceOrderMode = 'PRODUCTO'; renderProposal(); });
    document.getElementById('btnPlanOrdenSegmentoDestino')?.addEventListener('click', () => { planResourceOrderMode = 'SEGMENTO_DESTINO'; renderProposal(); });
    document.getElementById('btnPlanOrdenTienda')?.addEventListener('click', () => { planResourceOrderMode = 'TIENDA'; renderProposal(); });
    document.getElementById('btnPlanApplyReplica')?.addEventListener('click', applyReplicaToRealEvent);
  }
  function updateProposalFromCard(idx, card, light){
    const p = lastProposal[idx];
    if(!p) return;
    card.querySelectorAll('[data-plan-field]').forEach(input => {
      const field = input.dataset.planField;
      if(field === 'include') p.include = !!input.checked;
      else if(field === 'unidades' || field === 'precio') p[field] = Math.max(0, Number(input.value || 0));
      else p[field] = input.value;
    });
    card.classList.toggle('excluded', !p.include);
    const out = card.querySelector('[data-plan-output="importe"]');
    if(out) out.value = money(Number(p.unidades || 0) * Number(p.precio || 0));
    if(String(p.tipo || '').toUpperCase() === 'COMPRA'){
      try{
        const pid = String(p.productId || '');
        const pname = normalizeText(p.productName || '');
        const donated = lastProposal.filter(x => x && x.include !== false && String(x.tipo || '').toUpperCase() === 'DONACION' && ((pid && String(x.productId || '') === pid) || (!pid && normalizeText(x.productName || '') === pname))).reduce((sum,x)=>sum+Number(x.unidades||0),0);
        p.necesidadTotal = Math.max(0, donated + Number(p.unidades || 0));
      }catch(_){}
    }
    if(!light){ const d=card.closest?.('.plan-advanced-lines'); setTimeout(()=>{ renderProposal(); try{ if(d) document.querySelector('.plan-advanced-lines')?.setAttribute('open',''); }catch(_){} }, 0); }
  }

  function makeId(){
    try{ if(typeof window.uid === 'function') return window.uid(); }catch(_){ }
    try{ if(typeof uid === 'function') return uid(); }catch(_){ }
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  function callSave(){
    try{ if(typeof window.saveState === 'function'){ window.saveState(); return; } }catch(_){ }
    try{ if(typeof saveState === 'function') saveState(); }catch(_){ }
  }
  function callRender(){
    try{ if(typeof window.render === 'function'){ window.render(); return; } }catch(_){ }
    try{ if(typeof render === 'function') render(); }catch(_){ }
    try{ if(typeof window.renderPlanificacionInicial === 'function') window.renderPlanificacionInicial(); }catch(_){ }
  }
  function fieldValue(id){ return String(document.getElementById(id)?.value || '').trim(); }
  function proposedEventTitle(){
    const brief = fieldValue('planDescripcion').replace(/\s+/g, ' ').trim();
    if(brief) return brief.slice(0, 140);
    const raw = fieldValue('planEventoTitulo').replace(/\s+/g, ' ').trim();
    if(raw) return raw.slice(0, 140);
    const base = lastSourceEvent?.titulo || sourceEvent()?.titulo || 'Evento replicado';
    return ('Copia de ' + base).slice(0, 140);
  }
  function eventPriceFromIncomeProposal(fallbackTotalCompras){
    const people = Math.max(1, Number(fieldValue('planPersonas') || 0));
    const fallback = planEstimatedEventPrice(fallbackTotalCompras, people);
    const list = (Array.isArray(lastIncomeProposal) ? lastIncomeProposal : []).filter(item => item && item.include !== false && String(item.rango || '').toUpperCase() === 'SOCIO' && Number(item.numero || 0) > 0);
    const prices = list.map(item => Number(item.importeObligatorio || 0) / Math.max(1, Number(item.numero || 0))).filter(v => Number.isFinite(v) && v > 0).sort((a,b)=>a-b);
    if(!prices.length) return fallback;
    const mid = Math.floor(prices.length / 2);
    const price = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
    return Math.max(0, Math.round(price * 100) / 100);
  }
  function confirmReplicaCreation(){
    const included = lastProposal.filter(p => p.include && Number(p.unidades || 0) > 0);
    const purchases = included.filter(p => p.tipo === 'COMPRA').length;
    const donations = included.filter(p => p.tipo === 'DONACION').length;
    const inc = incomeSummary(lastIncomeProposal);
    const title = proposedEventTitle();
    const msg = [
      'Se va a crear un EVENTO REAL a partir de la propuesta revisada.',
      '',
      'Evento nuevo: ' + title,
      'Ingresos a replicar: ' + inc.registros + ' registros (' + qty(inc.sociosPersonas) + ' SOCIOS · ' + qty(inc.noSociosPersonas) + ' NO SOCIOS)',
      'Compras a replicar: ' + purchases,
      'Donaciones de producto a replicar: ' + donations,
      '',
      'No se crearán ni eliminarán PERSONAS, TIENDAS ni PRODUCTOS generales.',
      'Después podrás revisar y adaptar el evento desde las pantallas normales.',
      '',
      '¿Quieres continuar?'
    ].join('\n');
    try{ return confirm(msg); }catch(_){ return false; }
  }
  async function crudUpsert(collection, payload){
    const res = await fetch('/api/crud/' + encodeURIComponent(collection), {
      method:'POST',
      headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':'row-crud-v8-5-fix28','X-ControlEvent-Row-Only':'1'},
      cache:'no-store',
      body: JSON.stringify({...payload, __crudRowOnly:true})
    });
    if(!res.ok){
      let msg = await res.text().catch(() => '');
      try{ const j = JSON.parse(msg); msg = j.error || j.message || msg; }catch(_){ }
      throw new Error(msg || `Error guardando ${collection}`);
    }
    return res.json();
  }
  function rebuildProposalFromResourceEditor(){
    const rowsDom = Array.from(document.querySelectorAll('#planResourceEditor .plan-resource-edit-row'));
    if(!rowsDom.length) return normalizeProposalRowsForGroups(lastProposal);
    const rebuilt = [];
    rowsDom.forEach((tr, pos) => {
      const key = tr.dataset?.planResourceKey || '';
      const group = productGroupFromKey(key);
      if(!group) return;
      const include = !!tr.querySelector('[data-plan-resource-field="include"]')?.checked;
      const selectedProductId = tr.querySelector('[data-plan-resource-field="productId"]')?.value || group.productId || '';
      const selectedProduct = selectedProductId ? byId('productos', selectedProductId) : null;
      const productName = selectedProduct?.nombre || group.producto || 'Producto';
      const segmento = selectedProduct?.segmento || group.segmento || '';
      const destino = selectedProduct?.destino || group.destino || '';
      let need = Math.max(0, Number(tr.querySelector('[data-plan-resource-field="necesidad"]')?.value || group.necesidad || 0));
      (group.donationDetails || []).forEach((detail, detailPos) => {
        const base = {...(lastProposal[detail.idx] || {})};
        const donorInput = tr.querySelector(`[data-plan-proposal-index="${String(detail.idx)}"][data-plan-resource-field="donorRef"]`);
        const respInput = tr.querySelector(`[data-plan-proposal-index="${String(detail.idx)}"][data-plan-resource-field="donationResponsableId"]`);
        const donationUnitsInput = tr.querySelector(`[data-plan-proposal-index="${String(detail.idx)}"][data-plan-resource-field="donationUnits"]`);
        const donationPriceInput = tr.querySelector(`[data-plan-proposal-index="${String(detail.idx)}"][data-plan-resource-field="donationPrecio"]`);
        const units = Math.max(0, Number(donationUnitsInput?.value || detail.unidades || 0));
        const price = Math.max(0, Number(donationPriceInput?.value || detail.precio || 0));
        rebuilt.push({
          ...base,
          key: base.key || `plan-donation:${pos}:${detailPos}`,
          include: include && units > 0 && !isTinyGhostDonation({tipo:'DONACION', unidades:units, explicitPromptDonation:base.explicitPromptDonation}),
          tipo:'DONACION',
          productId:selectedProductId,
          productName,
          segmento,
          destino,
          unidades:units,
          precio:price,
          ticketDonacion: base.ticketDonacion || detail.ticketDonacion || 'DONADO SOCIO',
          donorRef: normalizeDonorRef(donorInput?.value || detail.donorRef || base.donorRef || ''),
          responsableId: respInput?.value || detail.responsableId || base.responsableId || '',
          necesidadTotal: need || undefined,
          __ceHf40ManualNeedOverride: true
        });
      });
      const buyInput = tr.querySelector('[data-plan-resource-field="compra"]');
      if(buyInput){
        const units = Math.max(0, Number(buyInput.value || 0));
        const price = Math.max(0, Number(tr.querySelector('[data-plan-resource-field="precio"]')?.value || group.precioCompra || group.precioDonado || 0));
        const tiendaId = tr.querySelector('[data-plan-resource-field="tiendaId"]')?.value || group.tiendaId || document.getElementById('planTienda')?.value || '';
        const responsableId = tr.querySelector('[data-plan-resource-field="responsableId"]')?.value || group.responsableId || document.getElementById('planResponsable')?.value || '';
        const basePurchaseIndex = (group.purchaseDetails?.[0]?.idx ?? group.purchaseIndices?.[0]);
        const basePurchase = {...(lastProposal[basePurchaseIndex] || group.allIndices.map(i=>lastProposal[i]).find(r => r && String(r.tipo).toUpperCase()==='COMPRA') || {})};
        rebuilt.push({
          ...basePurchase,
          key: basePurchase.key || `plan-buy:${pos}`,
          include: include && units > 0,
          tipo:'COMPRA',
          productId:selectedProductId,
          productName,
          segmento,
          destino,
          unidades:units,
          precio:price,
          tiendaId,
          responsableId,
          ticketDonacion:'',
          donorRef:'',
          necesidadTotal: need || undefined,
          __ceHf40ManualNeedOverride: true
        });
      }
    });
    return normalizeProposalRowsForGroups(rebuilt);
  }
  function syncProposalFromResourceEditor(){
    const rows = Array.from(document.querySelectorAll('#planResourceEditor .plan-resource-edit-row'));
    rows.forEach(tr => {
      const key = tr.dataset?.planResourceKey || '';
      if(key) updateResourceEditorRow(key, tr, '__sync');
    });
    lastProposal = rebuildProposalFromResourceEditor();
    refreshAdvancedProposalDetails();
  }

  async function applyReplicaToRealEvent(){
    if(!isGD()) return;
    const source = lastSourceEvent || sourceEvent();
    const mode = planMode();
    if(!source && mode !== 'ZUZU_TOTAL'){ try{ alert('Primero debes generar una propuesta.'); }catch(_){} return; }
    if(source && up(source.situacion || '') !== 'FINALIZADO'){
      try{ alert('El evento modelo debe estar FINALIZADO.'); }catch(_){}
      return;
    }
    if(!lastProposal.length && !lastIncomeProposal.length){ try{ alert('No hay propuesta generada. Pulsa primero Generar propuesta.'); }catch(_){} return; }
    try{ syncProposalFromResourceEditor(); }catch(e){ console.warn('[Planificación] No se pudo sincronizar la propuesta editable antes de crear evento', e); }
    if(planContent() === 'INGRESOS_SOCIOS_OBLIGATORIOS' && !lastIncomeProposal.length){
      const includedNow = lastProposal.filter(p => p.include && Number(p.unidades || 0) > 0 && p.tipo === 'COMPRA');
      const totalComprasNow = includedNow.reduce((sum,p)=>sum + Number(p.unidades || 0) * Number(p.precio || 0), 0);
      lastIncomeProposal = buildMandatorySocioIncomeProposal(totalComprasNow);
    }
    lastProposal = ceHf46BalancePositiveSurplusOnce(lastProposal);
    const st = state();
    if(!st.eventos || !st.colaboradores || !st.compras){ try{ alert('No se ha podido acceder al estado de la app.'); }catch(_){} return; }
    const title = proposedEventTitle();
    if(!title){ try{ alert('Indica un nombre para el nuevo evento.'); }catch(_){} return; }
    const duplicate = st.eventos.some(e => normalizeText(e.titulo || '') === normalizeText(title));
    if(duplicate){ try{ alert('Ya existe un evento con ese nombre. Cambia el nombre antes de crear la réplica.'); }catch(_){} return; }
    if(!confirmReplicaCreation()) return;

    const btn = document.getElementById('btnPlanApplyReplica');
    const oldText = btn?.textContent || 'Generar nuevo evento';
    if(btn){ btn.disabled = true; btn.textContent = 'Generando evento...'; }
    try{
      showPlanFactoryIndicator('Zuzu está fabricando el evento y guardándolo en la base de datos.');
      await new Promise(resolve => setTimeout(resolve, 80));
      const newEventId = makeId();
      const fechaIni = fieldValue('planFechaIni') || source?.fechaIni || '';
      const fechaFin = fieldValue('planFechaFin') || fieldValue('planFechaIni') || source?.fechaFin || source?.fechaIni || '';
      const descUser = fieldValue('planDescripcion');
      const descripcion = descUser || '';
      const included = lastProposal.filter(p => p.include && Number(p.unidades || 0) > 0);
      const totalCompras = included.filter(p => p.tipo === 'COMPRA').reduce((sum,p)=>sum + Number(p.unidades || 0) * Number(p.precio || 0), 0);
      const eventPrice = planContent() === 'INGRESOS_SOCIOS_OBLIGATORIOS' ? eventPriceFromIncomeProposal(totalCompras) : parseNum(source?.precio || planEstimatedEventPrice(totalCompras, Number(fieldValue('planPersonas') || 1)) || 0);
      const newEvent = { id:newEventId, titulo:title, precio:eventPrice, fechaIni, fechaFin, situacion:'En curso', descripcion };

      await crudUpsert('eventos', newEvent);
      const savedCollabs = [];
      for(const item of lastIncomeProposal.filter(item => item && item.include !== false)){
        if(!item.personaId) continue;
        const row = { id: makeId(), eventId:newEventId, personaId:item.personaId, numero:Number(item.numero || 0), situacion:'Pendiente', importe:Number(item.importeVoluntario || 0) };
        await crudUpsert('colaboradores', row);
        savedCollabs.push(row);
      }
      const savedCompras = [];
      for(const p of included){
        if(!p.productId) continue;
        const isDon = p.tipo === 'DONACION';
        const row = {
          id: makeId(), eventId:newEventId, productoId:p.productId, unidades:Number(p.unidades || 0), precio:Number(p.precio || 0),
          tiendaId:String(p.tiendaId || p.sourceTiendaId || ''), ticketDonacion:isDon ? String(p.ticketDonacion || '') : '', donorRef:isDon ? String(p.donorRef || '') : '', responsableId:String(p.responsableId || '')
        };
        await crudUpsert('compras', row);
        savedCompras.push(row);
      }

      st.eventos.push(newEvent);
      savedCollabs.forEach(row => st.colaboradores.push(row));
      savedCompras.forEach(row => st.compras.push(row));
      st.selectedEventId = newEventId;
      lastCreatedEventId = newEventId;
      callRender();
      try{ if(typeof window.fetchState === 'function') setTimeout(() => window.fetchState().catch?.(()=>{}), 300); }catch(_){ }
      try{ alert('Evento creado correctamente y guardado en la base de datos. Revísalo y adapta lo necesario.'); }catch(_){}
      activateCreatedEventAndOpenGraficas(newEventId);
    }catch(error){
      console.error('[ControlEvent v17_prod] Error generando evento real desde planificación:', error);
      try{ alert('No se pudo generar el evento real: ' + (error?.message || error)); }catch(_){ }
    }finally{
      if(btn){ btn.disabled = false; btn.textContent = oldText; }
      hidePlanFactoryIndicator();
      unlockPlanControls();
    }
  }


  function ceHf31MaybeAddFallbackPurchases(rows){
    const list = Array.isArray(rows) ? rows.slice() : [];
    const hasPurchase = list.some(r => r && String(r.tipo || '').toUpperCase() === 'COMPRA' && Number(r.unidades || 0) > 0);
    if(hasPurchase || planMode() !== 'ZUZU_TOTAL') return list;
    const info = String(fieldValue('planInfo') || '');
    const desc = normalizeText(info + ' ' + fieldValue('planDescripcion'));
    if(!desc) return list;
    const personas = Math.max(1, Number(fieldValue('planPersonas') || 0) || 25);
    const defaultStoreId = document.getElementById('planTienda')?.value || '';
    const defaultRespId = document.getElementById('planResponsable')?.value || '';
    const truthAliases = new Set(ceHf27TruthRowsFromDiagnostics().map(r => productAliasKeyHf25(r.productName || '')));
    const add = (label, units, reason) => {
      const prod = resolveCatalogProductByNameHf25(label) || resolveCatalogProductByName(label);
      const name = prod?.nombre || label;
      const alias = productAliasKeyHf25(name);
      // Si el producto ya está donado, no se compra aquí; el déficit de esa misma ficha lo controla la necesidad calculada.
      if(truthAliases.has(alias)) return;
      const u = roundPurchaseUnits(name, units);
      if(u <= 0) return;
      list.push({
        key:`hf31-zuzu-fallback:${alias}:${Math.random().toString(36).slice(2)}`,
        include:true,
        tipo:'COMPRA',
        productId:prod?.id || '',
        productName:name,
        segmento:prod?.segmento || 'Sin segmento',
        destino:prod?.destino || 'Sin destino',
        unidades:u,
        necesidadTotal:u,
        precio:ceHf27CatalogPrice(prod),
        tiendaId:defaultStoreId,
        responsableId:defaultRespId,
        ticketDonacion:'',
        donorRef:'',
        __ceZuzuFallbackPurchaseHf31:true,
        reason:'Compra sugerida por planificación HF31 al no recibir compras de Zuzu: ' + reason
      });
    };
    if(/PAELLA|ARROZ|MARISCO|GAMB|ALMEJ/.test(desc)){
      add('Arroz', Math.max(2, Math.round(personas * 0.10 * 100) / 100), 'paella/comida para asistentes');
      add('Gambones', Math.max(1, Math.round(personas * 0.04 * 100) / 100), 'paella de marisco');
      add('Almejas', Math.max(1, Math.round(personas * 0.04 * 100) / 100), 'paella de marisco');
    }
    if(/BARBACOA|BBQ|PARRILLA|BRASA|ASADO|PLANCHA|LOMO|MORCILLA|PANCETA|CHORIZO/.test(desc)){
      add('Lomo fresco', Math.max(2, Math.round(personas * 0.06 * 100) / 100), 'cena/barbacoa');
      add('Chorizos', Math.max(1, Math.round(personas * 0.04 * 100) / 100), 'cena/barbacoa');
      add('Morcilla', Math.max(1, Math.round(personas * 0.03 * 100) / 100), 'cena/barbacoa');
      add('Panceta', Math.max(1, Math.round(personas * 0.04 * 100) / 100), 'cena/barbacoa');
      add('Pan', Math.max(4, Math.ceil(personas / 4)), 'acompañamiento de comida/cena');
    }
    if(/APERITIVO|PATATAS|ENCURTIDOS|TORTILLA/.test(desc)){
      add('Patatas fritas', Math.max(3, Math.ceil(personas / 8)), 'aperitivo');
      add('Encurtidos', Math.max(2, Math.ceil(personas / 12)), 'aperitivo');
    }
    if(/CUBATA|TARDEO|HIELO|REFRESCO|BEBIDA|CALOR/.test(desc)){
      add('HIELO', Math.max(8, Math.ceil(personas * 0.35)), 'bebida/tardeo/hielo');
      add('Vasos cubata', Math.max(24, Math.ceil(personas * 2)), 'menaje para cubatas');
    }
    if(/SERVILLETA|MENAJE|LIMPIEZA|HIGIENE|INFRAESTRUCTURA/.test(desc)){
      add('Servilletas', 1, 'menaje/limpieza');
    }
    return list;
  }


  function ceHf32NumberFromPrompt(pattern, fallback){
    try{
      const txt = String(fieldValue('planInfo') || '');
      const m = txt.match(pattern);
      if(m) return Math.max(0, Number(String(m[1] || '').replace(',','.')) || 0);
    }catch(_){}
    return fallback;
  }
  function ceHf32IsPurchaseRow(row){
    return row && String(row.tipo || '').toUpperCase() === 'COMPRA' && Number(row.unidades || 0) > 0 && row.include !== false;
  }
  function ceHf32DonationEquivalents(list){
    const out = { beer:0, beerSin:0, colaNormal:0, colaZero:0, colaZeroZero:0, fanta:0, tonica:0, wineLiters:0, residual:0, ronBarcelo:0, ronBrugal:0, ronTotal:0, whiskyJb:0, whiskyWalker:0, whiskyTotal:0, ginBeefeater:0, ginLarios:0, ginTotal:0 };
    (Array.isArray(list) ? list : []).forEach(row => {
      if(!row || String(row.tipo || '').toUpperCase() !== 'DONACION') return;
      const name = normalizeText(row.productName || row.producto || '');
      const units = Math.max(0, Number(row.unidades || 0));
      if(!units) return;
      const litersByName = () => {
        const m = String(row.productName || row.producto || '').match(/(\d+(?:[,.]\d+)?)\s*l\b/i);
        return m ? Number(String(m[1]).replace(',','.')) : 0;
      };
      if(name.includes('CERVEZA') || name.includes('BARRIL')){
        let equiv = units;
        if(name.includes('BARRIL')){
          const liters = litersByName() || 30;
          equiv = units * (liters / 0.33);
        }else if(name.includes('25') && (name.includes('CL') || name.includes('BOTELLIN'))){
          equiv = units * (0.25 / 0.33);
        }else if(name.includes('SIN')){
          equiv = units;
        }
        if(name.includes('SIN')) out.beerSin += equiv;
        else out.beer += equiv;
      }else if(name.includes('COCA') && name.includes('COLA')){
        if(name.includes('ZERO') && (name.includes('ZERO ZERO') || name.includes('-ZERO'))) out.colaZeroZero += units;
        else if(name.includes('ZERO')) out.colaZero += units;
        else out.colaNormal += units;
      }else if(name.includes('FANTA')){
        out.fanta += units;
      }else if(name.includes('TONICA') || name.includes('SCHWEPPES')){
        out.tonica += units;
      }else if(name.includes('VINO')){
        const liters = litersByName() || (name.includes('1,5') || name.includes('1.5') ? 1.5 : 0.7);
        out.wineLiters += units * liters;
      }else if(name.includes('RON')){
        const shots = ceHf33SpiritShotsFromDonation(row.productName || row.producto || '', units);
        if(name.includes('BARCELO')) out.ronBarcelo += shots;
        if(name.includes('BRUGAL')) out.ronBrugal += shots;
        out.ronTotal += shots;
      }else if(name.includes('WHISKY') || name.includes('WISKI') || name.includes('JB') || name.includes('JHONY') || name.includes('WALKER')){
        const shots = ceHf33SpiritShotsFromDonation(row.productName || row.producto || '', units);
        if(name.includes('JB') || name.includes('5 AÑOS') || name.includes('5 ANOS')) out.whiskyJb += shots;
        if(name.includes('JHONY') || name.includes('WALKER')) out.whiskyWalker += shots;
        out.whiskyTotal += shots;
      }else if(name.includes('GINEBRA') || name.includes('GIN')){
        const shots = ceHf33SpiritShotsFromDonation(row.productName || row.producto || '', units);
        if(name.includes('BEEFEATER')) out.ginBeefeater += shots;
        if(name.includes('LARIOS')) out.ginLarios += shots;
        out.ginTotal += shots;
      }else if(name.includes('SPRITE') || name.includes('AQUARIUS') || name.includes('BITTER') || name.includes('KAS')){
        out.residual += units;
      }
    });
    return out;
  }
  function ceHf32AddPurchase(list, label, units, reason, opts={}){
    const prod = resolveCatalogProductByNameHf25(label) || resolveCatalogProductByName(label);
    const name = prod?.nombre || label;
    const alias = productAliasKeyHf25(name);
    if(opts.skipAliases && opts.skipAliases.has(alias)) return;
    const u = opts.noRound ? Math.max(0, Number(units || 0)) : roundPurchaseUnits(name, units);
    if(u <= 0) return;
    const exists = list.some(r => r && String(r.tipo || '').toUpperCase() === 'COMPRA' && productAliasKeyHf25(r.productName || r.producto || '') === alias);
    if(exists) return;
    list.push({
      key:`hf32-imaginacion:${alias}:${Math.random().toString(36).slice(2)}`,
      include:true,
      tipo:'COMPRA',
      productId:prod?.id || '',
      productName:name,
      segmento:prod?.segmento || 'Sin segmento',
      destino:prod?.destino || 'Sin destino',
      unidades:u,
      necesidadTotal:u,
      precio:ceHf27CatalogPrice(prod),
      tiendaId:ceHf35DefaultStoreId(),
      responsableId:ceHf35DefaultResponsibleId(),
      ticketDonacion:'',
      donorRef:'',
      __ceZuzuFallbackPurchaseHf32:true,
      reason:'Compra inteligente HF32: ' + reason
    });
  }


  function ceHf35DefaultStoreId(){
    return document.getElementById('planTienda')?.value || document.getElementById('planDefaultStore')?.value || '';
  }
  function ceHf35DefaultResponsibleId(){
    return document.getElementById('planResponsable')?.value || '';
  }
  function ceHf35RoundIceUnits(value){
    const v = Math.max(0, Number(value || 0));
    if(!v) return 0;
    // Hielo: se compra por sacos/lotes de 5 bolsas, siempre al alza.
    return Math.ceil(v / 5) * 5;
  }
  function ceHf35PurchaseTotal(list){
    return (Array.isArray(list) ? list : []).reduce((sum, row) => {
      if(!row || String(row.tipo || '').toUpperCase() !== 'COMPRA' || row.include === false) return sum;
      return sum + Math.max(0, Number(row.unidades || 0)) * Math.max(0, Number(row.precio || 0));
    }, 0);
  }

  function ceHf46IncludedPurchaseTotal(list){
    return (Array.isArray(list) ? list : []).reduce((sum, row) => {
      if(!row || String(row.tipo || '').toUpperCase() !== 'COMPRA' || row.include === false) return sum;
      return sum + Math.max(0, Number(row.unidades || 0)) * Math.max(0, Number(row.precio || 0));
    }, 0);
  }
  function ceHf46EstimatedVisibleIncome(totalCompras){
    const income = incomeSummary(lastIncomeProposal || []).importe;
    if(Number(income || 0) > 0) return Number(income || 0);
    const people = Math.max(1, Number(fieldValue('planPersonas') || 0));
    return planEstimatedEventPrice(totalCompras, people) * people;
  }
  function ceHf46HasAliasInRows(list, label){
    const prod = resolveCatalogProductByNameHf25(label) || resolveCatalogProductByName(label);
    const alias = productAliasKeyHf25(prod?.nombre || label);
    return (Array.isArray(list) ? list : []).some(row => row && row.include !== false && productAliasKeyHf25(row.productName || row.producto || '') === alias);
  }

  function ceHf51SaldoTokens(label){
    const n = normalizeProductSearchKeyHf24(label || '');
    if(/RON/.test(n) && /BARCELO|BARCELO/.test(n)) return ['RON','BARCELO'];
    if(/WHISKY|WISKI/.test(n) && /JB|J B/.test(n)) return ['WHISKY','JB'];
    if(/COCA/.test(n) && /ZERO/.test(n) && /ZERO\s*ZERO|00|ZERO-ZERO/.test(n)) return ['COCA','ZERO'];
    if(/COCA/.test(n) && /ZERO/.test(n)) return ['COCA','ZERO'];
    if(/COCA/.test(n)) return ['COCA','COLA'];
    if(/BEEFEATER/.test(n)) return ['BEEFEATER'];
    if(/MAHOU|CERVEZA/.test(n)) return ['CERVEZA'];
    if(/HIELO/.test(n)) return ['HIELO'];
    return n.split(' ').filter(Boolean);
  }
  function ceHf51ResolveSaldoProduct(label){
    const direct = resolveCatalogProductByNameHf25(label) || resolveCatalogProductByName(label);
    if(direct && direct.id) return direct;
    const products = rows('productos');
    const wanted = ceHf51SaldoTokens(label);
    let best = null, bestScore = -9999;
    products.forEach(p => {
      const name = p?.nombre || '';
      const n = normalizeProductSearchKeyHf24(name);
      let score = 0;
      wanted.forEach(tok => { if(n.includes(tok)) score += tok.length >= 5 ? 80 : 55; else score -= 45; });
      // Evita elegir variantes erróneas cuando el nombre pedido distingue normal/zero/zero-zero.
      const req = normalizeProductSearchKeyHf24(label || '');
      if(/COCA/.test(req)){
        if(/ZERO/.test(req) && !/ZERO/.test(n)) score -= 220;
        if(!/ZERO/.test(req) && /ZERO/.test(n)) score -= 180;
      }
      if(/BEEFEATER/.test(req) && !/BEEFEATER/.test(n)) score -= 250;
      if(/BARCELO|BARCELO/.test(req) && !/BARCELO|BARCELO/.test(n)) score -= 250;
      if(/JB|J B/.test(req) && !/JB|J B|J\.B/.test(n)) score -= 200;
      if(/HIELO/.test(req) && !/HIELO/.test(n)) score -= 300;
      if(score > bestScore){ bestScore = score; best = p; }
    });
    return bestScore >= 50 ? best : null;
  }
  function ceHf46ProductPrice(label, fallback){
    const prod = ceHf51ResolveSaldoProduct(label);
    const price = ceHf27CatalogPrice(prod);
    return Math.max(0, Number(price || fallback || 0));
  }
  function ceHf46AddOrIncreasePurchase(list, label, units, reason, opts={}){
    const prod = opts.product || (typeof ceHf52ResolveSaldoProduct === 'function' ? ceHf52ResolveSaldoProduct(label) : null) || ceHf51ResolveSaldoProduct(label);
    if(!prod || !prod.id) return 0;
    const name = prod.nombre || label;
    const alias = productAliasKeyHf25(name);
    const u = opts.noRound ? Math.max(0, Number(units || 0)) : roundPurchaseUnits(name, units);
    if(u <= 0) return 0;
    const price = Math.max(0, Number(ceHf27CatalogPrice(prod) || opts.basePrice || opts.fallbackPrice || 0));
    if(price <= 0) return 0;
    // v16: un ajuste de saldo no debe modificar ni marcar una compra base, porque después
    // el recalculo elimina las filas __ceHf46SaldoBalancer y se perdería también la compra original.
    // Solo se acumula sobre filas creadas por el propio equilibrador; si no existen, crea otra línea.
    const existing = (Array.isArray(list) ? list : []).find(row => row && String(row.tipo || '').toUpperCase() === 'COMPRA' && row.__ceHf46SaldoBalancer === true && row.__ceSuppressedManualPurchase !== true && productAliasKeyHf25(row.productName || row.producto || '') === alias);
    if(existing){
      existing.include = true;
      existing.unidades = Math.max(0, Number(existing.unidades || 0)) + u;
      existing.precio = Math.max(0, Number(existing.precio || price || 0));
      existing.necesidadTotal = Math.max(0, Number(existing.necesidadTotal || 0)) + u;
      existing.reason = String(existing.reason || '') + (existing.reason ? ' · ' : '') + 'Ajuste saldo HF46: ' + reason;
      existing.__ceHf46SaldoBalancer = true;
      return u * price;
    }
    list.push({
      key:`hf46-saldo:${alias}:${Math.random().toString(36).slice(2)}`,
      include:true,
      tipo:'COMPRA',
      productId:prod.id || '',
      productName:name,
      segmento:prod.segmento || 'Sin segmento',
      destino:prod.destino || 'Sin destino',
      unidades:u,
      necesidadTotal:u,
      precio:price,
      tiendaId:ceHf35DefaultStoreId(),
      responsableId:ceHf35DefaultResponsibleId(),
      ticketDonacion:'',
      donorRef:'',
      __ceHf46SaldoBalancer:true,
      reason:'Ajuste saldo HF46: ' + reason
    });
    return u * price;
  }
  function ceHf52NormalizeSearch(value){
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/Ñ/g,'N').replace(/ñ/g,'n')
      .replace(/[^A-Za-z0-9]+/g,' ')
      .replace(/\bWISKI\b/gi,'WHISKY')
      .replace(/\bWHISKI\b/gi,'WHISKY')
      .replace(/\s+/g,' ')
      .trim().toUpperCase();
  }
  function ceHf52FamilyWanted(label){
    const n = ceHf52NormalizeSearch(label);
    if(n.includes('RON') && n.includes('BARCELO')) return 'ron-barcelo';
    if(n.includes('RON') && n.includes('BRUGAL')) return 'ron-brugal';
    if((n.includes('WHISKY') || n.includes('WISKI')) && (/\bJ\s*B\b/.test(n) || /\bJB\b/.test(n) || n.includes('5 ANOS'))) return 'whisky-jb';
    if(n.includes('COCA') && n.includes('ZERO') && (n.includes('ZERO ZERO') || n.includes('ZEROZERO') || /\b0\s*0\b/.test(n) || n.includes(' 00 '))) return 'coca-zero-zero';
    if(n.includes('COCA') && n.includes('ZERO')) return 'coca-zero';
    if(n.includes('COCA')) return 'coca-normal';
    if(n.includes('FANTA') && n.includes('NARANJA')) return 'fanta-naranja';
    if(n.includes('FANTA') && (n.includes('LIMON') || n.includes('LIMÓN'))) return 'fanta-limon';
    if(n.includes('FANTA')) return 'fanta';
    if(n.includes('TONICA') || n.includes('TÓNICA') || n.includes('SCHWEPPES')) return 'tonica';
    if(n.includes('GASEOSA')) return 'gaseosa';
    if(n.includes('BEEFEATER')) return 'beefeater';
    if(n.includes('SKOL')) return 'cerveza-skol';
    if(n.includes('CERVEZA') || n.includes('MAHOU')) return 'cerveza';
    if(n.includes('HIELO')) return 'hielo';
    return '';
  }
  function ceHf52ProductFamilyName(name){
    const n = ceHf52NormalizeSearch(name);
    if(n.includes('RON') && n.includes('BARCELO')) return 'ron-barcelo';
    if(n.includes('RON') && n.includes('BRUGAL')) return 'ron-brugal';
    if((n.includes('WHISKY') || n.includes('WISKI')) && (/\bJ\s*B\b/.test(n) || /\bJB\b/.test(n) || n.includes('5 ANOS'))) return 'whisky-jb';
    if(n.includes('COCA') && n.includes('ZERO') && (n.includes('ZERO ZERO') || n.includes('ZEROZERO') || /\b0\s*0\b/.test(n) || n.includes(' 00 '))) return 'coca-zero-zero';
    if(n.includes('COCA') && n.includes('ZERO')) return 'coca-zero';
    if(n.includes('COCA') && !n.includes('ZERO')) return 'coca-normal';
    if(n.includes('FANTA') && n.includes('NARANJA')) return 'fanta-naranja';
    if(n.includes('FANTA') && (n.includes('LIMON') || n.includes('LIMÓN'))) return 'fanta-limon';
    if(n.includes('FANTA')) return 'fanta';
    if(n.includes('TONICA') || n.includes('TÓNICA') || n.includes('SCHWEPPES')) return 'tonica';
    if(n.includes('GASEOSA')) return 'gaseosa';
    if(n.includes('BEEFEATER')) return 'beefeater';
    if(n.includes('SKOL')) return 'cerveza-skol';
    if(n.includes('CERVEZA') || n.includes('MAHOU')) return 'cerveza';
    if(n.includes('HIELO')) return 'hielo';
    return '';
  }
  function ceHf52ResolveSaldoProduct(label){
    const family = ceHf52FamilyWanted(label);
    const products = rows('productos');
    if(family){
      const exact = products.find(p => ceHf52ProductFamilyName(p?.nombre || '') === family);
      if(exact) return exact;
    }
    const direct = ceHf51ResolveSaldoProduct(label) || resolveCatalogProductByNameHf25(label) || resolveCatalogProductByName(label);
    if(direct && direct.id) return direct;
    const wanted = ceHf52NormalizeSearch(label).split(' ').filter(Boolean);
    let best=null, score=-9999;
    products.forEach(p=>{
      const name = ceHf52NormalizeSearch(p?.nombre || '');
      if(!name) return;
      let s=0;
      wanted.forEach(tok=>{ if(name.includes(tok)) s += tok.length >= 5 ? 60 : 35; else s -= 20; });
      if(s > score){ score=s; best=p; }
    });
    return score >= 35 ? best : null;
  }

  function ceHf53ResolveSaldoProductFromProposal(list, label){
    const family = ceHf52FamilyWanted(label);
    if(!family) return null;
    const rowsList = Array.isArray(list) ? list : [];
    const candidates = rowsList.filter(row => {
      if(!row || row.include === false) return false;
      const name = row.productName || row.producto || '';
      return ceHf52ProductFamilyName(name) === family;
    });
    if(!candidates.length) return null;
    // Preferimos una donación/existencia ya planificada, porque el usuario pidió reforzar compra
    // de productos que ya vengan a cuento en el evento.
    const chosen = candidates.find(r => String(r.tipo || '').toUpperCase() === 'DONACION') || candidates[0];
    const productId = chosen.productId || chosen.productoId || chosen.producto_id || '';
    const name = chosen.productName || chosen.producto || label;
    if(!productId && !name) return null;
    return {
      product: {
        id: productId,
        nombre: name,
        segmento: chosen.segmento || 'Sin segmento',
        destino: chosen.destino || 'Sin destino'
      },
      price: Number(chosen.precio || chosen.precioEstimado || chosen.valorUnitario || 0) || 0
    };
  }
  function ceHf53SaldoItemInfo(list, item){
    const fromProposal = ceHf53ResolveSaldoProductFromProposal(list, item.label);
    const prod = (fromProposal && fromProposal.product) || ceHf52ResolveSaldoProduct(item.label);
    if(!prod || !prod.id) return null;
    const price = Math.max(0, Number(ceHf27CatalogPrice(prod) || (fromProposal && fromProposal.price) || item.fallback || 0));
    if(price <= 0) return null;
    const units = Math.max(0, Number(item.step || 1));
    const cost = price * units;
    if(cost <= 0) return null;
    return { item, prod, price, units, cost };
  }

  function ceHf46BalancePositiveSurplusOnce(list){
    // v16 HOTFIX4: reparto equitativo del saldo, añadiendo cerveza SKOL en la prioridad.
    // Si el saldo sobre compras supera el 35%, añadimos de uno en uno siguiendo la prioridad indicada.
    // Se detiene cuando el saldo ya queda en zona correcta (<=35%) o cuando el siguiente añadido bajaría
    // el colchón por debajo del 20% de las compras finales.
    let baseRows = (Array.isArray(list) ? list : []).filter(row => row && row.__ceHf46SaldoBalancer !== true && row.__ceHf52SaldoBalancer !== true);
    let rows = baseRows.slice();
    const totalBefore = ceHf46IncludedPurchaseTotal(rows);
    const income = ceHf46EstimatedVisibleIncome(totalBefore);
    if(totalBefore <= 0 || income <= 0) return normalizeProposalRowsForGroups(rows);

    const initialSaldo = income - totalBefore;
    const initialRatio = initialSaldo / totalBefore;
    if(initialSaldo <= 0 || initialRatio <= 0.35) return normalizeProposalRowsForGroups(rows);

    const priority = [
      {label:'COCA COLA Bote 32 Cl', step:24, fallback:0.75},
      {label:'Ron BARCELO Añejo 0.7 L', step:1, fallback:14.35},
      {label:'Whisky 5 Años J.B Botella 0.7 L', step:1, fallback:11.69},
      {label:'Tónica lata', step:24, fallback:0.75},
      {label:'Gin BEEFEATER 0.7 L. 43°', step:1, fallback:13.29},
      {label:'CERVEZA SKOL Lata 33cl', step:24, fallback:0.45},
      {label:'COCA COLA ZERO -ZERO 33 cl', step:24, fallback:0.75},
      {label:'FANTA Naranja Bote 32 C.L', step:24, fallback:0.75},
      {label:'FANTA Limon Bote 32 CL', step:24, fallback:0.75},
      {label:'COCA COLA ZERO Bote 32 Cl', step:24, fallback:0.75},
      {label:'RON Brugal Añejo 0.7 L', step:1, fallback:11.95}
    ];

    const EPS = 0.005;
    let totalAdded = 0;
    let cursor = 0;
    let guard = 0;

    function currentTotal(){ return ceHf46IncludedPurchaseTotal(rows); }
    function currentRatio(){
      const t = currentTotal();
      return t > 0 ? (income - t) / t : 0;
    }
    function canAddCost(cost){
      const nextTotal = currentTotal() + Number(cost || 0);
      if(nextTotal <= 0) return false;
      const nextSaldo = income - nextTotal;
      const nextRatio = nextSaldo / nextTotal;
      return nextSaldo >= -EPS && nextRatio >= 0.20 - EPS;
    }
    function add(info, reason){
      if(!info || !canAddCost(info.cost)) return false;
      const beforeLen = rows.length;
      const added = ceHf46AddOrIncreasePurchase(rows, info.prod.nombre || info.item.label, info.units, reason, {noRound:true, fallbackPrice:info.price, basePrice:info.price, product:info.prod});
      if(added > 0){
        totalAdded += added;
        for(let i=beforeLen; i<rows.length; i++){
          if(rows[i]){
            rows[i].__ceHf46SaldoBalancer = true;
            rows[i].__ceHf52SaldoBalancer = true;
          }
        }
        rows.forEach(r=>{ if(r && (r.__ceHf46SaldoBalancer || r.__ceHf52SaldoBalancer)) { r.__ceHf46SaldoBalancer = true; r.__ceHf52SaldoBalancer = true; } });
        return true;
      }
      return false;
    }

    while(currentRatio() > 0.35 + EPS && guard < 120){
      guard += 1;
      let did = false;
      for(let offset=0; offset<priority.length; offset++){
        const idx = (cursor + offset) % priority.length;
        const info = ceHf53SaldoItemInfo(rows, priority[idx]);
        if(!info || !canAddCost(info.cost)) continue;
        if(add(info, `saldo positivo ${money(initialSaldo)} (${Math.round(initialRatio*100)}% sobre compras); ajuste por prioridad equilibrada, unidad a unidad, sin bajar del 20% de colchón final.`)){
          cursor = (idx + 1) % priority.length;
          did = true;
          break;
        }
      }
      if(!did) break;
    }

    if(totalAdded > 0){
      rows.forEach(r=>{ if(r && (r.__ceHf46SaldoBalancer || r.__ceHf52SaldoBalancer)) { r.__ceHf46SaldoBalancer = true; r.__ceHf52SaldoBalancer = true; } });
    }
    return normalizeProposalRowsForGroups(rows);
  }
  function renderHf46SaldoNote(){
    const rows = (Array.isArray(lastProposal) ? lastProposal : []).filter(row => row && (row.__ceHf46SaldoBalancer === true || row.__ceHf52SaldoBalancer === true) && row.include !== false && Number(row.unidades || 0) > 0);
    if(!rows.length) return '';
    const total = rows.reduce((sum,row)=>sum + Number(row.unidades || 0) * Number(row.precio || 0), 0);
    return `<div class="planificacion-note compact-note"><strong>Ajuste automático de saldo:</strong> se han añadido/reforzado ${rows.length} línea(s) por ${esc(money(total))}, siguiendo la prioridad equilibrada indicada y sin dejar el colchón por debajo del 20%.</div>`;
  }

  function ceHf33SpiritShotsFromDonation(name, units){
    const n = normalizeText(name || '');
    const u = Math.max(0, Number(units || 0));
    let liters = 0.7;
    const m = String(name || '').match(/(\d+(?:[,.]\d+)?)\s*l\b/i);
    if(m) liters = Number(String(m[1]).replace(',','.')) || 0.7;
    if(n.includes('1 L') || n.includes('1L')) liters = Math.max(liters, 1);
    return u * liters / 0.05; // cubatas aproximados con copa de 50 ml
  }
  function ceHf33FindPurchaseByAlias(list, label){
    const prod = resolveCatalogProductByNameHf25(label) || resolveCatalogProductByName(label);
    const alias = productAliasKeyHf25(prod?.nombre || label);
    return (Array.isArray(list) ? list : []).find(r => r && String(r.tipo || '').toUpperCase() === 'COMPRA' && productAliasKeyHf25(r.productName || r.producto || '') === alias);
  }
  function ceHf33EnsurePurchaseMinimum(list, label, minUnits, reason, opts={}){
    const prod = resolveCatalogProductByNameHf25(label) || resolveCatalogProductByName(label);
    const name = prod?.nombre || label;
    const alias = productAliasKeyHf25(name);
    const target = opts.noRound ? Math.max(0, Number(minUnits || 0)) : roundPurchaseUnits(name, minUnits);
    if(target <= 0) return;
    const row = (Array.isArray(list) ? list : []).find(r => r && String(r.tipo || '').toUpperCase() === 'COMPRA' && productAliasKeyHf25(r.productName || r.producto || '') === alias);
    if(row){
      if(Number(row.unidades || 0) < target){
        row.unidades = target;
        row.necesidadTotal = target;
        if(!Number(row.precio || 0)) row.precio = ceHf27CatalogPrice(prod);
        row.reason = (row.reason || 'Compra propuesta.') + ' · Ajuste HF35 mínimo: ' + reason;
      }
      if(row.__ceZuzuFallbackPurchaseHf32 || row.__ceZuzuFallbackPurchaseHf35){
        row.tiendaId = ceHf35DefaultStoreId() || row.tiendaId || '';
        row.responsableId = ceHf35DefaultResponsibleId() || row.responsableId || '';
      }
      return;
    }
    ceHf32AddPurchase(list, label, target, reason, {...opts, noRound:true});
  }


  function ceHf34IsHotContext(desc){
    return /CALOR|VERANO|TEMPERATURA\s+ALTA|MUCHO\s+CALOR|DIA\s+CALUROSO|DÍA\s+CALUROSO|JULIO|AGOSTO/.test(String(desc || ''));
  }
  function ceHf34BoostHot(value, desc){
    const v = Math.max(0, Number(value || 0));
    return ceHf34IsHotContext(desc) ? Math.ceil(v * 4 / 3) : v;
  }

  function ceHf37RoundUpTens(value){
    const v = Math.max(0, Number(value || 0));
    if(!v) return 0;
    return Math.ceil(v / 10) * 10;
  }
  function ceHf37IsReserveRow(row){
    return row && String(row.tipo || '').toUpperCase() === 'COMPRA' &&
      (String(row.__ceCreativeIdeaHf34 || '') === '1' ||
       productAliasKeyHf25(row.productName || row.producto || '') === 'alias:otras-compras-imprevistas' ||
       normalizeText(row.productName || row.producto || '').includes('OTRAS COMPRAS IMPREVISTAS'));
  }
  function ceHf37NormalizeReservePurchase(list, desc){
    if(planMode() !== 'ZUZU_TOTAL') return Array.isArray(list) ? list : [];
    const rowsIn = Array.isArray(list) ? list : [];
    const eventish = /TARDEO|MUSICA|MÚSICA|BARBACOA|PAELLA|APERITIVO|PEÑA|FIESTA|EVENTO|CUBATA|COMIDA|CENA|GUISO|ENSALADA/.test(String(desc || ''));
    if(!eventish) return rowsIn;
    const without = rowsIn.filter(r => !ceHf37IsReserveRow(r));
    const base = ceHf35PurchaseTotal(without);
    if(base <= 0) return without;
    const reserva = Math.max(10, ceHf37RoundUpTens(base * 0.10));
    without.push({
      key:`hf37-otras-compras-imprevistas:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      include:true,
      tipo:'COMPRA',
      productId:'',
      productName:'z_Otras compras imprevistas',
      segmento:'INFRAESTRUCTURA',
      destino:'INFRAESTRUCTURA',
      unidades:1,
      necesidadTotal:1,
      necesidadCalculada:1,
      precio:reserva,
      tiendaId:ceHf35DefaultStoreId(),
      responsableId:ceHf35DefaultResponsibleId(),
      ticketDonacion:'',
      donorRef:'',
      __ceZuzuFallbackPurchaseHf32:true,
      __ceCreativeIdeaHf34:'1',
      __ceReserveHf37:true,
      reason:`Reserva HF37: 10% de la compra prevista (${money(base)}), redondeado a decena superior.`
    });
    return without;
  }
  function ceHf37DonationUnitsByAlias(list, alias){
    return (Array.isArray(list) ? list : []).reduce((sum, r) => {
      if(!r || String(r.tipo || '').toUpperCase() !== 'DONACION' || r.include === false) return sum;
      return productAliasKeyHf25(r.productName || r.producto || '') === alias ? sum + Math.max(0, Number(r.unidades || 0)) : sum;
    }, 0);
  }
  function ceHf37PurchaseUnitsByAlias(list, alias){
    return (Array.isArray(list) ? list : []).reduce((sum, r) => {
      if(!r || String(r.tipo || '').toUpperCase() !== 'COMPRA' || r.include === false) return sum;
      return productAliasKeyHf25(r.productName || r.producto || '') === alias ? sum + Math.max(0, Number(r.unidades || 0)) : sum;
    }, 0);
  }

  function ceHf38InfrastructureFamilyKey(name){
    const s = simplifyProductSearchKeyHf24(name || '');
    const n = normalizeProductSearchKeyHf24(name || '');
    const excluded = /(CUCHARA|TENEDOR|CUCHILLO|PLATO|VASO|VASOS|SERVILLETA|SERVILLETAS|COPA|COPAS|PAJITA|PAJITAS|MENAJE)\b/.test(n);
    if(excluded) return '';
    if(n.includes('BUTANO')) return 'infra:butano';
    if(n.includes('BOMBONA')) return 'infra:butano';
    if(n.includes('PAPEL') && n.includes('HIGIENICO')) return 'infra:papel-higienico';
    if(n.includes('SECAMANOS')) return 'infra:secamanos';
    if(n.includes('BOLSA') && n.includes('BASURA')) return 'infra:bolsas-basura';
    if(n.includes('FAIRY') || n.includes('LAVAVAJILLAS')) return 'infra:lavavajillas';
    if(n.includes('JABON') && (n.includes('MANOS') || n.includes('LAVAMANOS'))) return 'infra:jabon-manos';
    if(n.includes('AMBIENTADOR')) return 'infra:ambientador';
    if(n.includes('ABRILLANTADOR')) return 'infra:abrillantador';
    if(n.includes('DETERGENTE')) return 'infra:detergente';
    if(n.includes('LEJIA')) return 'infra:lejia';
    if(n.includes('BOLITAS') && n.includes('WC')) return 'infra:bolitas-wc';
    if(n.includes('GAS')) return 'infra:gas';
    return 'infra:' + productAliasKeyHf25(name || s);
  }
  function ceHf38InfrastructureStockByFamily(list){
    const out = new Map();
    (Array.isArray(list) ? list : []).forEach(r => {
      if(!r || String(r.tipo || '').toUpperCase() !== 'DONACION' || r.include === false) return;
      const prod = r.productId ? byId('productos', r.productId) : resolveCatalogProductByNameHf25(r.productName || r.producto || '');
      const seg = up(prod?.segmento || r.segmento || '');
      if(seg !== 'INFRAESTRUCTURA') return;
      const fam = ceHf38InfrastructureFamilyKey(prod?.nombre || r.productName || r.producto || '');
      if(!fam) return;
      const current = out.get(fam) || {units:0, rows:[], product:prod || null, name:prod?.nombre || r.productName || r.producto || ''};
      current.units += Math.max(0, Number(r.unidades || 0));
      current.rows.push(r);
      if(!current.product && prod) current.product = prod;
      out.set(fam, current);
    });
    return out;
  }
  function ceHf38EnsureInfrastructureMinimums(list){
    const rows = Array.isArray(list) ? list : [];
    const fams = ceHf38InfrastructureStockByFamily(rows);
    fams.forEach((info, fam) => {
      if(!fam || Math.max(0, Number(info.units || 0)) >= 2) return;
      const manualOverride = rows.some(r => r && r.__ceHf40ManualNeedOverride && ceHf38InfrastructureFamilyKey(r.productName || r.producto || '') === fam);
      if(manualOverride) return;
      const sample = info.product || resolveCatalogProductByNameHf25(info.name || '');
      const productName = sample?.nombre || info.name || '';
      if(!productName) return;
      const alreadyBuy = rows.some(r => String(r.tipo || '').toUpperCase() === 'COMPRA' && ceHf38InfrastructureFamilyKey(r.productName || r.producto || '') === fam);
      if(alreadyBuy) return;
      ceHf32AddPurchase(rows, productName, 1, `HF38 infraestructura: solo consta 1 unidad disponible de ${productName}; se propone comprar 1 más para stock mínimo de peña.`, {noRound:true});
    });
    return rows;
  }

  function ceHf37EnsureStockMinimums(list, desc){
    const rows = Array.isArray(list) ? list : [];
    const d = String(desc || '');
    const dnAove = ceHf37DonationUnitsByAlias(rows, 'alias:aceite-aove');
    const dnVinagre = ceHf37DonationUnitsByAlias(rows, 'alias:vinagre');
    const needsKitchen = /PAELLA|ARROZ|ENSALADA|GUISO|APERITIVO|BARBACOA|BBQ|PARRILLA|BRASA|ALIÑO|ALINO|COCINA/.test(d);
    if(dnAove === 1 && ceHf37PurchaseUnitsByAlias(rows, 'alias:aceite-aove') <= 0){
      ceHf32AddPurchase(rows, 'Aceite AOVE (2l)', 1, 'HF37 stock mínimo: solo hay 1 AOVE disponible; se compra 1 de reserva.', {noRound:true});
    }else if(dnAove <= 0 && needsKitchen && /AOVE|ACEITE|PAELLA|ENSALADA|GUISO/.test(d) && ceHf37PurchaseUnitsByAlias(rows, 'alias:aceite-aove') <= 0){
      ceHf32AddPurchase(rows, 'Aceite AOVE (2l)', 1, 'HF37 cocina: no consta AOVE disponible y el evento lo puede necesitar.', {noRound:true});
    }
    if(dnVinagre === 1 && ceHf37PurchaseUnitsByAlias(rows, 'alias:vinagre') <= 0){
      ceHf32AddPurchase(rows, 'Vinagre', 1, 'HF37 stock mínimo: solo hay 1 vinagre disponible; se compra 1 de reserva.', {noRound:true});
    }else if(dnVinagre <= 0 && needsKitchen && /VINAGRE|ENSALADA|ALIÑO|ALINO|GUISO/.test(d) && ceHf37PurchaseUnitsByAlias(rows, 'alias:vinagre') <= 0){
      ceHf32AddPurchase(rows, 'Vinagre', 1, 'HF37 cocina: el prompt menciona vinagre/ensalada/aliño/guiso y no consta donado.', {noRound:true});
    }
    return rows;
  }

  function ceHf34AddCreativePurchase(list, desc){
    const normalized = ceHf37NormalizeReservePurchase(list, desc);
    if(Array.isArray(list)){
      list.splice(0, list.length, ...normalized);
      return;
    }
    return normalized;
  }

  function ceHf36HasMeaningfulPrompt(){
    const txt = String(fieldValue('planInfo') || '') + ' ' + String(fieldValue('planDescripcion') || '');
    return normalizeText(txt).length > 80 || ceHf27PromptBlocks().length > 0;
  }
  function ceHf36ForcePurchasesIfZero(list){
    const rows = Array.isArray(list) ? list.slice() : [];
    const compras = rows.filter(ceHf32IsPurchaseRow);
    if(compras.length > 0) return rows;
    if(!ceHf36HasMeaningfulPrompt()) return rows;

    const prompt = String(fieldValue('planInfo') || '') + '\n' + String(fieldValue('planDescripcion') || '');
    const desc = normalizeText(prompt);
    const personas = Math.max(1, Number(fieldValue('planPersonas') || 0) || ceHf32NumberFromPrompt(/Personas\s+Asistentes\s*:\s*(\d+(?:[,.]\d+)?)/i, 25) || 25);
    const cubataPeople = ceHf32NumberFromPrompt(/Personas\s+que\s+tomar[aá]n\s+cubatas\s*:\s*(\d+(?:[,.]\d+)?)/i, Math.round(personas * 0.50));
    const cubataFriends = ceHf32NumberFromPrompt(/(?:amigos|acompa[nñ]an|acompañan|acompanan).*?(\d+(?:[,.]\d+)?)/i, 7);
    const donations = ceHf32DonationEquivalents(rows);
    const hot = ceHf34IsHotContext(desc);

    // Bebidas por déficit real cuando proceda.
    const colaDonated = donations.colaNormal + donations.colaZero + donations.colaZeroZero;
    const colaTarget = ceHf34BoostHot(Math.max(96, Math.round(cubataPeople * 6)), desc);
    const colaDeficit = Math.max(0, colaTarget - colaDonated);
    if(colaDeficit >= 12){
      const packs = Math.max(4, Math.ceil(colaDeficit / 24));
      const normalPacks = Math.max(2, Math.ceil(packs * 0.50));
      const zeroPacks = Math.max(1, Math.floor(packs * 0.25));
      const zeroZeroPacks = Math.max(1, packs - normalPacks - zeroPacks);
      ceHf32AddPurchase(rows, 'COCA COLA Bote 32 Cl', normalPacks * 24, `HF36 compra de seguridad: reparto Coca-Cola normal. Donado ${Math.round(colaDonated)}, objetivo ${Math.round(colaTarget)}.`);
      ceHf32AddPurchase(rows, 'COCA COLA ZERO Bote 32 Cl', zeroPacks * 24, `HF36 compra de seguridad: reparto Coca-Cola Zero.`);
      ceHf32AddPurchase(rows, 'COCA COLA ZERO -ZERO 33 cl', zeroZeroPacks * 24, `HF36 compra de seguridad: reparto Coca-Cola Zero-Zero.`);
    }

    ceHf32AddPurchase(rows, 'FANTA Limon Bote 32 CL', 24, 'HF36 compra de seguridad: 1 pack Fanta limón.');
    ceHf32AddPurchase(rows, 'FANTA Naranja Bote 32 C.L', 24, 'HF36 compra de seguridad: 1 pack Fanta naranja.');

    const tonicaTarget = ceHf34BoostHot(Math.max(24, Math.round((personas / 5 + 4) * (hot ? 4 : 3))), desc);
    if(Math.max(0, tonicaTarget - donations.tonica) >= 8){
      ceHf32AddPurchase(rows, ceHf39FindDonationByAlias(rows, 'alias:tonica-schweppes') ? 'Tonica SCHWEPPES Zero Lata 25cl' : 'Tonica normal', 24, `HF36 compra de seguridad: tónica/gin tonic, objetivo ${tonicaTarget}, donado ${Math.round(donations.tonica)}.`);
    }

    // Comida y organización por concepto. Siempre algo de compra, aunque todo lo donado esté perfecto.
    if(/PAELLA|ARROZ|MARISCO|GAMB|ALMEJ/.test(desc)){
      ceHf32AddPurchase(rows, 'Arroz', Math.max(2, Math.round(personas * 0.10 * 100) / 100), 'HF36 compra de seguridad: base de paella/comida.', {noRound:true});
      ceHf32AddPurchase(rows, 'Gambon plancha (caja 2kg)', 1, 'HF36 compra de seguridad: paella, 1 caja/unidad de gambón 2 kg.', {noRound:true});
      ceHf32AddPurchase(rows, 'Almejas', 1, 'HF36 compra de seguridad: paella, 1 unidad/kg de almejas.', {noRound:true});
    }
    if(/BARBACOA|BBQ|PARRILLA|BRASA|ASADO|PLANCHA|LOMO|MORCILLA|PANCETA|CHORIZO/.test(desc)){
      ceHf32AddPurchase(rows, 'Lomo fresco', Math.max(2, Math.round(personas * 0.06 * 100) / 100), 'HF36 compra de seguridad: cena/barbacoa.', {noRound:true});
      ceHf32AddPurchase(rows, 'Morcilla', 1, 'HF36 compra de seguridad: cena/barbacoa.', {noRound:true});
      ceHf32AddPurchase(rows, 'Panceta', 1, 'HF36 compra de seguridad: cena/barbacoa.', {noRound:true});
      ceHf32AddPurchase(rows, 'Pan', Math.max(4, Math.ceil(personas / 4)), 'HF36 compra de seguridad: pan para comida/cena.', {noRound:true});
    }
    if(/APERITIVO|PATATAS|ENCURTIDOS|TORTILLA/.test(desc)){
      ceHf32AddPurchase(rows, 'patatas fritas (bolsa grande)', personas >= 25 ? 1 : 2, 'HF36 compra de seguridad: aperitivo, patatas moderadas.', {noRound:true});
      ceHf32AddPurchase(rows, 'berenjenas', 1, 'HF36 compra de seguridad: encurtido/aperitivo.', {noRound:true});
    }

    const cubataEffective = Math.max(0, cubataPeople + cubataFriends);
    const iceTarget = ceHf35RoundIceUnits(Math.ceil(ceHf34BoostHot(Math.max(20, Math.ceil(cubataEffective * 0.80)), desc) * 1.50));
    ceHf32AddPurchase(rows, 'HIELO', iceTarget, `HF36 compra de seguridad: hielo +50%, múltiplo de 5 => ${iceTarget}.`, {noRound:true});
    ceHf32AddPurchase(rows, 'Vasos cubata', Math.max(24, Math.ceil(cubataEffective * 2)), 'HF36 compra de seguridad: vasos cubata.', {noRound:false});

    // Ginebra adicional si hay tardeo/calor/gin tonic.
    if(/GIN|GINEBRA|TARDEO|CUBATA|CALOR|VERANO/.test(desc)){
      ceHf32AddPurchase(rows, 'Gin BEEFEATER 0.7 L. 43°', 1, 'HF36 compra de seguridad: ginebra Beefeater para gin tonic/tardeo.', {noRound:true});
    }

    // Stock mínimo y reserva al final: 10% del total de compras ya calculado.
    ceHf37EnsureStockMinimums(rows, desc);
    ceHf34AddCreativePurchase(rows, desc);

    rows.forEach(r => {
      if(r && String(r.tipo || '').toUpperCase() === 'COMPRA' && r.__ceZuzuFallbackPurchaseHf32){
        r.__ceHf36ForcedPurchase = true;
        r.include = true;
        r.tiendaId = ceHf35DefaultStoreId() || r.tiendaId || '';
        r.responsableId = ceHf35DefaultResponsibleId() || r.responsableId || '';
      }
    });
    ceHf38EnsureInfrastructureMinimums(rows);
    return rows;
  }

  function ceHf32EnsureImaginedPurchases(list){
    const rows = Array.isArray(list) ? list.slice() : [];
    if(planMode() !== 'ZUZU_TOTAL') return rows;
    const hadAnyPurchase = rows.some(ceHf32IsPurchaseRow);
    const prompt = String(fieldValue('planInfo') || '') + '\n' + String(fieldValue('planDescripcion') || '');
    const desc = normalizeText(prompt);
    const personas = Math.max(1, Number(fieldValue('planPersonas') || 0) || ceHf32NumberFromPrompt(/Personas\s+Asistentes\s*:\s*(\d+(?:[,.]\d+)?)/i, 25) || 25);
    const cervezaPeople = ceHf32NumberFromPrompt(/Personas\s+que\s+beber[aá]n\s+cerveza\s*:\s*(\d+(?:[,.]\d+)?)/i, Math.round(personas * 0.75));
    const cubataPeople = ceHf32NumberFromPrompt(/Personas\s+que\s+tomar[aá]n\s+cubatas\s*:\s*(\d+(?:[,.]\d+)?)/i, Math.round(personas * 0.50));
    const cubataFriends = ceHf32NumberFromPrompt(/(?:amigos|acompa[nñ]an|acompañan|acompanan).*?(\d+(?:[,.]\d+)?)/i, 7);
    const nonAlcohol = ceHf32NumberFromPrompt(/Personas\s+sin\s+alcohol\s*:\s*(\d+(?:[,.]\d+)?)/i, Math.round(personas * 0.25));
    const donations = ceHf32DonationEquivalents(rows);
    const donationAliases = new Set(rows.filter(r => String(r.tipo || '').toUpperCase() === 'DONACION').map(r => productAliasKeyHf25(r.productName || r.producto || '')));

    // Bebida: se calcula en equivalentes de lata 1/3, con máximos razonables.
    const beerTarget = ceHf34BoostHot(Math.min(cervezaPeople * 5, personas * 6), desc);
    const beerDeficit = Math.max(0, beerTarget - donations.beer);
    if(beerDeficit >= 12) ceHf32AddPurchase(rows, 'Cerveza MAHOU Lata 33 CL', beerDeficit, `cerveza: objetivo ${Math.round(beerTarget)} ud equivalentes 1/3, donado ${Math.round(donations.beer)}.`);

    const beerSinTarget = ceHf34BoostHot(Math.max(0, Math.round(nonAlcohol * 2)), desc);
    const beerSinDeficit = Math.max(0, beerSinTarget - donations.beerSin);
    if(beerSinDeficit >= 8) ceHf32AddPurchase(rows, 'Cerveza SIN tostada', beerSinDeficit, `cerveza sin alcohol: objetivo ${beerSinTarget}, donado ${Math.round(donations.beerSin)}.`);

    const colaDonated = donations.colaNormal + donations.colaZero + donations.colaZeroZero;
    const colaTarget = ceHf34BoostHot(Math.max(24, Math.round(cubataPeople * 6)), desc);
    const colaDeficit = Math.max(0, colaTarget - colaDonated);
    if(colaDeficit >= 12){
      const totalPacks = Math.max(1, Math.ceil(colaDeficit / 24));
      // HOTFIX35: reparto con sentido común. Si salen 3 packs, se sube a 4:
      // 2 normal, 1 zero, 1 zero-zero.
      const packs = totalPacks === 3 ? 4 : totalPacks;
      const normalPacks = Math.max(1, Math.ceil(packs * 0.50));
      const zeroPacks = packs >= 2 ? Math.max(1, Math.floor(packs * 0.25)) : 0;
      const zeroZeroPacks = Math.max(0, packs - normalPacks - zeroPacks);
      ceHf32AddPurchase(rows, 'COCA COLA Bote 32 Cl', normalPacks * 24, `coca cola normal: reparto proporcional. Objetivo ${colaTarget}, donado ${Math.round(colaDonated)}.`);
      if(zeroPacks > 0) ceHf32AddPurchase(rows, 'COCA COLA ZERO Bote 32 Cl', zeroPacks * 24, `coca cola zero: reparto proporcional de ${packs} packs.`);
      if(zeroZeroPacks > 0) ceHf32AddPurchase(rows, 'COCA COLA ZERO -ZERO 33 cl', zeroZeroPacks * 24, `coca cola zero-zero: reparto proporcional de ${packs} packs.`);
    }

    const fantaTarget = ceHf34BoostHot(Math.max(12, Math.round((personas / 4) * 4)), desc);
    const fantaDeficit = Math.max(0, fantaTarget - donations.fanta);
    // HOTFIX35: Fanta naranja y limón, algo más generosas: 1 pack de cada tipo si hay evento/tardeo.
    if(fantaDeficit >= 1 || /TARDEO|CUBATA|REFRESCO|BEBIDA|CALOR|VERANO/.test(desc)){
      ceHf32AddPurchase(rows, 'FANTA Limon Bote 32 CL', 24, `fanta limón: pack mínimo recomendado para refresco/cubatas. Objetivo ${Math.round(fantaTarget)}, donado ${Math.round(donations.fanta)}.`);
      ceHf32AddPurchase(rows, 'FANTA Naranja Bote 32 C.L', 24, `fanta naranja: pack mínimo recomendado para refresco/cubatas. Objetivo ${Math.round(fantaTarget)}, donado ${Math.round(donations.fanta)}.`);
    }

    const ginDrinkersHf33 = Math.max(0, Math.round(cubataPeople / 2.5 + 4));
    const ginTonicTargetHf33 = Math.round(ginDrinkersHf33 * (/VERANO|CALOR|GIN\s*TONIC|TARDEO/.test(desc) ? 4 : 3));
    const tonicaTarget = ceHf34BoostHot(Math.max(6, Math.round((personas / 6) * 3), ginTonicTargetHf33), desc);
    const tonicaDeficit = Math.max(0, tonicaTarget - donations.tonica);
    if(tonicaDeficit >= 8) ceHf32AddPurchase(rows, ceHf39FindDonationByAlias(rows, 'alias:tonica-schweppes') ? 'Tonica SCHWEPPES Zero Lata 25cl' : 'Tonica normal', tonicaDeficit, `tónicas/gin tonic: objetivo ${Math.round(tonicaTarget)}, donado ${Math.round(donations.tonica)}.`);

    const wineGlasses = donations.wineLiters / 0.2;
    const wineTarget = Math.round((personas / 5) * 3);
    if(wineTarget - wineGlasses >= 6) ceHf32AddPurchase(rows, 'Vino tinto', 2, `vino: objetivo ${wineTarget} copas, donadas ${Math.round(wineGlasses)} copas aprox.`, {noRound:true});

    // Comida e infraestructura: compras necesarias que no son "más de lo donado".
    if(/PAELLA|ARROZ|MARISCO|GAMB|ALMEJ/.test(desc)){
      ceHf32AddPurchase(rows, 'Arroz', Math.max(2, Math.round(personas * 0.10 * 100) / 100), 'base de paella/comida.');
      ceHf32AddPurchase(rows, 'Gambon plancha (caja 2kg)', 1, 'paella mixta: 1 caja/unidad de 2 kg como compra moderada, no 2 cajas.', {noRound:true});
      ceHf32AddPurchase(rows, 'Almejas', Math.max(1, Math.round(personas * 0.04 * 100) / 100), 'paella mixta, marisco moderado.');
      ceHf32AddPurchase(rows, 'Caldo paella', 2, 'base para paella.', {noRound:true});
    }
    if(/BARBACOA|BBQ|PARRILLA|BRASA|ASADO|PLANCHA|LOMO|MORCILLA|PANCETA|CHORIZO/.test(desc)){
      ceHf32AddPurchase(rows, 'Lomo fresco', Math.max(2, Math.round(personas * 0.06 * 100) / 100), 'cena/barbacoa para aproximadamente la mitad.');
      ceHf32AddPurchase(rows, 'Morcilla', Math.max(1, Math.round(personas * 0.03 * 100) / 100), 'cena/barbacoa.');
      ceHf32AddPurchase(rows, 'Panceta', Math.max(1, Math.round(personas * 0.04 * 100) / 100), 'cena/barbacoa.');
      ceHf32AddPurchase(rows, 'Pan', Math.max(4, Math.ceil(personas / 4)), 'acompañamiento de comida/cena.');
    }
    if(/APERITIVO|PATATAS|ENCURTIDOS|TORTILLA/.test(desc)){
      ceHf32AddPurchase(rows, 'patatas fritas (bolsa grande)', personas >= 25 ? 1 : 2, 'aperitivo: bolsa grande de 2 kg; con unas 30 personas normalmente basta 1. Si son menos, pueden ser 2 medianas/pequeñas.', {noRound:true});
      ceHf32AddPurchase(rows, 'Encurtidos', Math.max(2, Math.ceil(personas / 12)), 'aperitivo.');
    }
    if(/CUBATA|TARDEO|HIELO|REFRESCO|BEBIDA|CALOR|RON|WHISKY|GINEBRA|GIN/.test(desc)){
      const cubataEffective = Math.max(0, cubataPeople + cubataFriends);
      const iceBase = ceHf34BoostHot(Math.max(20, Math.ceil(cubataEffective * 0.80)), desc);
      const iceTarget = ceHf35RoundIceUnits(Math.ceil(iceBase * 1.50));
      ceHf33EnsurePurchaseMinimum(rows, 'HIELO', iceTarget, `hielo para cubatas/tardeo: ${cubataPeople} asistentes de cubata + ${cubataFriends} amigos aprox.; +50% y redondeo a múltiplos de 5 => ${iceTarget}.`, {noRound:true});
      // HF39: no se propone compra de vasos de cubata; normalmente se consiguen de regalo.
      const rumTarget = ceHf34BoostHot(Math.round((cubataPeople / 2 + cubataFriends) * 3.5), desc);
      const rumDeficit = Math.max(0, rumTarget - donations.ronTotal);
      if(rumDeficit >= 10) ceHf32AddPurchase(rows, 'Ron BARCELO Añejo 0.7 L', Math.ceil(rumDeficit / 14), `ron: Barceló se consume aprox. 3 veces más que Brugal. Objetivo ${rumTarget} cubatas, donados ${Math.round(donations.ronTotal)}.`, {noRound:true});
      const whiskyTarget = ceHf34BoostHot(Math.round((personas / 4 + 4) * 3), desc);
      const whiskyDeficit = Math.max(0, whiskyTarget - donations.whiskyTotal);
      if(whiskyDeficit >= 10) ceHf32AddPurchase(rows, 'Whisky 5 Años J.B Botella 0.7 L', Math.ceil(whiskyDeficit / 14), `whisky: sobre todo JB. Objetivo ${whiskyTarget} cubatas, donados ${Math.round(donations.whiskyTotal)}.`, {noRound:true});
      const ginTarget = ceHf34BoostHot(Math.round((personas / 5 + 4) * (/VERANO|CALOR|GIN\s*TONIC|TARDEO/.test(desc) ? 4 : 3)), desc);
      const ginDeficit = Math.max(0, ginTarget - donations.ginTotal);
      if(ginDeficit >= 6 || /VERANO|CALOR|GIN\s*TONIC|TARDEO/.test(desc)) ceHf32AddPurchase(rows, 'Gin BEEFEATER 0.7 L. 43°', Math.max(1, Math.ceil(ginDeficit / 14)), `ginebra/gin tonic: Beefeater preferente, previsión más alegre. Objetivo ${ginTarget}, donado ${Math.round(donations.ginTotal)}.`, {noRound:true});
    }
    if(/SERVILLETA|MENAJE|LIMPIEZA|HIGIENE|INFRAESTRUCTURA/.test(desc)){
      ceHf32AddPurchase(rows, 'Servilletas', 1, 'menaje básico.');
    }
    ceHf37EnsureStockMinimums(rows, desc);
    ceHf34AddCreativePurchase(rows, desc);
    return rows;
  }


  function cePlanFix29MenuIntent(){
    const raw = String(fieldValue('planInfo') || '') + '\n' + String(fieldValue('planDescripcion') || '');
    const n = normalizeText(raw || '');
    const negPaella = /\b(NO|SIN|NADA DE|EVITAR|EVITA|NO QUEREMOS|NO HACER|NO PREPARAR)\b.{0,50}\b(PAELLA|ARROZ|MARISCO|GAMBON|GAMBONES|ALMEJA|ALMEJAS)\b/.test(n);
    const negBbq = /\b(NO|SIN|NADA DE|EVITAR|EVITA|NO QUEREMOS|NO HACER|NO PREPARAR)\b.{0,50}\b(BARBACOA|BBQ|PARRILLA|BRASA|ASADO|LOMO|MORCILLA|PANCETA|CHORIZO)\b/.test(n);
    return {
      paella: !negPaella && /\b(PAELLA|ARROZ|FIDEUA|FIDEU[AÁ]|MARISCO|GAMBON|GAMBONES|GAMBA|GAMBAS|ALMEJA|ALMEJAS|CALDO PAELLA)\b/.test(n),
      bbq: !negBbq && /\b(BARBACOA|BBQ|PARRILLA|BRASA|ASADO|ASADA|PLANCHA|LOMO|MORCILLA|PANCETA|CHORIZO|MONTADO|MONTADOS)\b/.test(n)
    };
  }
  function cePlanFix29LegacyMenuFamily(name){
    const n = normalizeText(name || '');
    if(/\bARROZ\b|GAMBON|GAMBONES|GAMBA|GAMBAS|LANGOSTINO|LANGOSTINOS|ALMEJA|ALMEJAS|CALDO PAELLA|PREPARADO PAELLA/.test(n)) return 'paella';
    if(/\bLOMO\b|LOMO FRESCO|MORCILLA|PANCETA|CHORIZO|CHORIZOS/.test(n)) return 'bbq';
    return '';
  }
  function cePlanFix29FilterFixedMenuRows(rows){
    // FIX35_GEMINI_ULTRACORTO: no-op. Se conserva el nombre solo por compatibilidad defensiva.
    return Array.isArray(rows) ? rows : [];
  }


  function renderPlanDebugTrace(debug){
    if(!debug) return '';
    const ctx = debug.contextResumen || {};
    const attempts = Array.isArray(debug.attempts) ? debug.attempts : [];
    const final = debug.finalCounts || {};
    const rowsAttempts = attempts.map(a => `<tr><td>${esc(a.model || '')}</td><td>${a.ok ? 'OK' : 'ERROR'}</td><td>${esc(a.elapsedMs || 0)} ms</td><td>${esc(a.rowsGemini ?? '')}</td><td>${esc(a.comprasGemini ?? '')}</td><td>${esc(a.donacionesGemini ?? '')}</td><td>${esc(a.error || '')}</td></tr>`).join('');
    const traceShort = {
      version: debug.version,
      selectedModel: debug.selectedModel,
      elapsedMs: debug.elapsedMs,
      promptChars: debug.promptChars,
      contextResumen: debug.contextResumen,
      geminiParsedCounts: debug.geminiParsedCounts,
      matchCounts: debug.matchCounts,
      finalCounts: debug.finalCounts,
      providerFinal: debug.providerFinal,
      modelFinal: debug.modelFinal,
      attempts: debug.attempts,
      notesFinal: debug.notesFinal,
      briefEvento: debug.briefEvento,
      briefEventoTexto: debug.briefEventoTexto,
      geminiRequestPreview: debug.geminiRequestPreview,
      geminiRawTextPreview: debug.geminiRawTextPreview
    };
    return `<section class="ce-hf27-diagnostic ce-fix32-trace" style="border-color:#0f172a;background:#f8fafc">
      <div class="ce-hf27-head" style="background:#e0f2fe">
        <div><h3>Trazabilidad FIX35: Gemini ultracorto / Planificación</h3><p>Sirve para ver dónde se pierde la propuesta: extracción del prompt, JSON enviado, respuesta bruta de Gemini, filas interpretadas y filas finales.</p></div>
        <div class="ce-hf27-kpis"><span>Tiempo <b>${esc(debug.elapsedMs || '—')} ms</b></span><span>Días <b>${esc(ctx.diasOperativos || '—')}</b></span><span>Momentos <b>${esc(ctx.momentos || '—')}</b></span><span>Donaciones <b>${esc(ctx.donacionesDetectadas ?? '—')}</b></span><span>Compras finales <b>${esc(final.compras ?? '—')}</b></span></div>
      </div>
      <div class="ce-hf27-actions"><button type="button" id="btnCePlanCopyTrace">Copiar traza completa</button></div>
      <div class="ce-hf27-tablewrap"><table><thead><tr><th>Modelo</th><th>Estado</th><th>Tiempo</th><th>Filas Gemini</th><th>Compras</th><th>Donaciones</th><th>Error</th></tr></thead><tbody>${rowsAttempts || '<tr><td colspan="7">No hay intento Gemini registrado.</td></tr>'}</tbody></table></div>
      <details style="padding:12px 16px"><summary><b>Ver brief / request / respuesta bruta</b></summary><pre style="white-space:pre-wrap;max-height:460px;overflow:auto;background:#fff;border:1px solid #cbd5e1;border-radius:10px;padding:12px">${esc(JSON.stringify(traceShort, null, 2)).slice(0, 180000)}</pre></details>
    </section>`;
  }
  function bindPlanDebugTraceCopy(debug){
    const btn = document.getElementById('btnCePlanCopyTrace');
    if(!btn || btn.__ceTraceBound) return;
    btn.__ceTraceBound = true;
    btn.addEventListener('click', async () => {
      const txt = JSON.stringify(debug || window.__cePlanLastDebug || {}, null, 2);
      try{ await navigator.clipboard.writeText(txt); alert('Traza FIX35 copiada al portapapeles.'); }
      catch(_){ alert(txt.slice(0, 20000)); }
    });
  }

  function renderZuzuMenuSummary(menuResumen){
    const rows = Array.isArray(menuResumen) ? menuResumen.filter(x => x && (x.resumen || x.summary || x.descripcion)) : [];
    if(!rows.length) return '';
    const body = rows.map(item => {
      const dia = esc(item.dia || item.day || 'dia');
      const momento = esc(item.momento || item.slot || item.franja || 'momento');
      const resumen = esc(item.resumen || item.summary || item.descripcion || item.texto || '');
      return `<li><b>${dia} (${momento}):</b> ${resumen}</li>`;
    }).join('');
    return `<section class="planificacion-note compact-note ce-fix32-menu-summary"><strong>Resumen de menú propuesto por Zuzu:</strong><ul style="margin:8px 0 0 18px">${body}</ul></section>`;
  }

  async function generateProposal(){
    if(!isGD()) return;
    const mode = planMode();
    const modelId = document.getElementById('planEventoBase')?.value || '';
    if((mode === 'REPLICA' || mode === 'ZUZU_PARCIAL') && !modelId){
      try{ alert('Debes elegir un Evento modelo finalizado para este modo de planificación.'); }catch(_){ }
      return;
    }
    const btn = document.getElementById('btnGenerarPlanificacion');
    const oldText = btn?.textContent || '';
    const box = document.getElementById('planificacionResultado');
    try{
      if(btn){ btn.disabled = true; btn.textContent = 'Zuzu está pensando...'; }
      await ensureMasterRowsForMandatoryIncomes();
      if(box){
        box.classList.remove('hidden');
        box.innerHTML = planProgressHtml({ mode, content: planContent(), title: fieldValue('planEventoTitulo') });
      }
      const payload = {
        mode,
        modelEventId: modelId,
        content: planContent(),
        title: fieldValue('planEventoTitulo'),
        fechaIni: fieldValue('planFechaIni'),
        fechaFin: fieldValue('planFechaFin'),
        dias: Number(fieldValue('planDias') || 1),
        personas: Number(fieldValue('planPersonas') || 0),
        defaultResponsibleId: document.getElementById('planResponsable')?.value || '',
        defaultStoreId: document.getElementById('planTienda')?.value || '',
        descripcion: fieldValue('planDescripcion'),
        info: fieldValue('planInfo')
      };
      const res = await fetch('/api/event-ai/planificacion-propuesta', {
        method:'POST', headers:{'Content-Type':'application/json'}, cache:'no-store', body: JSON.stringify(payload)
      });
      if(!res.ok){
        let msg = 'No se pudo generar la propuesta (' + res.status + ')';
        try{ const err = await res.json(); if(err?.error) msg = err.error; else if(err?.message) msg = err.message; }catch(_){ }
        throw new Error(msg);
      }
      const data = await res.json();
      lastSourceEvent = data.event && data.event.id ? data.event : null;
      const rawPlanRows = Array.isArray(data.rows) ? data.rows : [];
      // FIX28 planificación: en Encargo total la compra debe venir de Gemini/prompt.
      // No se aplica el menú local de seguridad (paella/barbacoa) cuando Gemini solo trae donaciones
      // o no devuelve compras; así evitamos inventar siempre la misma compra.
      if(planMode() === 'ZUZU_TOTAL'){
        // FIX35_GEMINI_ULTRACORTO: no se filtra la propuesta de Gemini.
        // Si Gemini propone paella, barbacoa u otra idea razonada, se respeta y se muestra.
        lastProposal = ceHf27ApplyDiagnosticTruth(rawPlanRows);
      }else{
        lastProposal = ceHf36ForcePurchasesIfZero(ceHf32EnsureImaginedPurchases(ceHf27ApplyDiagnosticTruth(ceHf31MaybeAddFallbackPurchases(rawPlanRows))));
      }
      lastIncomeProposal = Array.isArray(data.incomes) ? data.incomes : [];
      if(planContent() === 'INGRESOS_SOCIOS_OBLIGATORIOS'){
        const baseCompra = lastProposal.filter(p => p.include && p.tipo === 'COMPRA').reduce((sum,p)=>sum + Number(p.unidades || 0) * Number(p.precio || 0), 0);
        lastIncomeProposal = buildMandatorySocioIncomeProposal(baseCompra);
      }
      lastProposal = ceHf46BalancePositiveSurplusOnce(lastProposal);
      renderProposal();
      const menuSummary = renderZuzuMenuSummary(data.menuResumen);
      const note = data.notes && data.notes.length ? '<div class="planificacion-note compact-note"><strong>Notas de Zuzu:</strong> '+data.notes.map(esc).join(' · ')+'</div>' : '';
      window.__cePlanLastDebug = data.debugPlanificacion || null;
      const tracePanel = renderPlanDebugTrace(data.debugPlanificacion);
      const topInfo = menuSummary + note + tracePanel;
      if(topInfo){ document.getElementById('planificacionResultado')?.insertAdjacentHTML('afterbegin', topInfo); }
      bindPlanDebugTraceCopy(data.debugPlanificacion);
      document.getElementById('planificacionResultado')?.scrollIntoView({behavior:'smooth', block:'start'});
    }catch(error){
      console.warn('[ControlEvent v17_prod] Propuesta Zuzu no disponible; se intenta réplica local.', error);
      await ensureMasterRowsForMandatoryIncomes();
      if(mode === 'REPLICA' || mode === 'ZUZU_PARCIAL'){
        try{
          const replica = buildReplicaProposal();
          lastSourceEvent = replica.event;
          lastProposal = ceHf27ApplyDiagnosticTruth(replica.rows);
          lastIncomeProposal = replica.incomes || [];
          if(planContent() === 'INGRESOS_SOCIOS_OBLIGATORIOS'){
            const baseCompra = lastProposal.filter(p => p.include && p.tipo === 'COMPRA').reduce((sum,p)=>sum + Number(p.unidades || 0) * Number(p.precio || 0), 0);
            lastIncomeProposal = buildMandatorySocioIncomeProposal(baseCompra);
          }
          lastProposal = ceHf46BalancePositiveSurplusOnce(lastProposal);
          renderProposal();
          document.getElementById('planificacionResultado')?.insertAdjacentHTML('afterbegin', '<div class="planificacion-note compact-note warning"><strong>Aviso:</strong> Zuzu no pudo consultar el backend/Gemini. Se muestra réplica local del evento modelo.</div>');
          document.getElementById('planificacionResultado')?.scrollIntoView({behavior:'smooth', block:'start'});
        }catch(_){ try{ alert(error?.message || error); }catch(__){} }
      }else{
        if(planContent() === 'INGRESOS_SOCIOS_OBLIGATORIOS'){
          lastSourceEvent = null;
          lastProposal = [];
          lastIncomeProposal = buildMandatorySocioIncomeProposal(0);
          renderProposal();
          document.getElementById('planificacionResultado')?.insertAdjacentHTML('afterbegin', '<div class="planificacion-note compact-note warning"><strong>Aviso:</strong> Zuzu no pudo consultar el backend/Gemini. Se presenta la propuesta local de ingresos obligatorios de socios.</div>');
          document.getElementById('planificacionResultado')?.scrollIntoView({behavior:'smooth', block:'start'});
        }else if(box){ box.classList.remove('hidden'); box.innerHTML = '<div class="planificacion-note compact-note warning"><strong>No se pudo generar la propuesta:</strong> '+esc(error?.message || error)+'</div>'; }
      }
    }finally{
      if(btn){ btn.disabled = false; btn.textContent = oldText || 'Generar propuesta'; }
      unlockPlanControls();
    }
  }

  function ensurePlanTopButton(){
    let btn = document.getElementById('cePlanTopFloat');
    if(!btn){
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'cePlanTopFloat';
      btn.className = 'ce-plan-top-float hidden';
      btn.textContent = '⌂';
      btn.setAttribute('aria-label', 'Volver al inicio de planificación');
      const goTop = event => {
        if(event){ event.preventDefault(); event.stopPropagation(); }
        const target = document.getElementById(PANEL_ID)?.querySelector?.('.planificacion-card') || document.getElementById(PANEL_ID);
        try{
          if(target){
            const top = Math.max(0, target.getBoundingClientRect().top + (window.scrollY || document.documentElement.scrollTop || 0) - 8);
            window.scrollTo({top, behavior:'smooth'});
            target.scrollIntoView({behavior:'smooth', block:'start'});
          }else{
            window.scrollTo({top:0, behavior:'smooth'});
          }
          ['.main','.app','body','html'].forEach(sel => {
            const el = document.querySelector(sel);
            if(el && el.scrollTop > 0) el.scrollTo({top:0, behavior:'smooth'});
          });
        }catch(_){ try{ window.scrollTo(0,0); }catch(__){} }
      };
      btn.addEventListener('click', goTop, true);
      btn.addEventListener('pointerup', goTop, true);
      btn.addEventListener('touchend', goTop, true);
      document.body.appendChild(btn);
    }
    return btn;
  }
  function syncPlanTopButton(){
    const btn = ensurePlanTopButton();
    const panel = document.getElementById(PANEL_ID);
    const visible = !!(panel && !panel.classList.contains('hidden') && isGD());
    btn.classList.toggle('hidden', !visible);
  }
  function setCurrentMainTabPlanificacion(){
    try{ currentMainTab = 'planificacion'; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = 'planificacion'; }catch(_){ }
  }
  function clearPlanificacionRuntimeFlag(){
    try{ if(window.__ceCurrentMainTab === 'planificacion') window.__ceCurrentMainTab = ''; }catch(_){ }
  }
  function showOnlyPlanificacionPanel(){
    const panel = document.getElementById(PANEL_ID);
    if(!panel) return false;
    KNOWN_PANELS.forEach(id => {
      const el = document.getElementById(id);
      if(!el) return;
      const isPlan = id === PANEL_ID;
      el.classList.toggle('hidden', !isPlan);
      if(isPlan){
        el.removeAttribute('aria-hidden');
        el.hidden = false;
        el.style.removeProperty('display');
        el.style.removeProperty('visibility');
        el.style.removeProperty('opacity');
        el.style.removeProperty('filter');
        el.style.pointerEvents = 'auto';
      }else{
        el.setAttribute('aria-hidden','true');
      }
    });
    const maint = document.getElementById('maintenanceWrapper');
    if(maint){ maint.classList.add('hidden'); maint.setAttribute('aria-hidden','true'); }
    KNOWN_BUTTONS.forEach(id => document.getElementById(id)?.classList.toggle('active', id === TAB_BUTTON_ID));
    document.querySelectorAll('.mobile-menu-action').forEach(el => el.classList.toggle('primary', el.dataset?.target === TAB_BUTTON_ID));
    syncPlanTopButton();
    return true;
  }

  function hidePlanificacion(){
    clearPlanificacionRuntimeFlag();
    const panel = document.getElementById(PANEL_ID);
    if(panel) panel.classList.add('hidden');
    const btn = document.getElementById(TAB_BUTTON_ID);
    if(btn) btn.classList.remove('active');
    document.querySelectorAll(`.mobile-menu-action[data-target="${TAB_BUTTON_ID}"]`).forEach(el => el.classList.remove('primary'));
    syncPlanTopButton();
  }
  function enforcePlanificacionIsolation(){
    const panel = document.getElementById(PANEL_ID);
    if(!panel || panel.classList.contains('hidden')) return;
    const activePlan = document.getElementById(TAB_BUTTON_ID)?.classList.contains('active');
    const otherActive = KNOWN_BUTTONS.filter(id => id !== TAB_BUTTON_ID).some(id => document.getElementById(id)?.classList.contains('active'));
    const otherVisible = KNOWN_PANELS.filter(id => id !== PANEL_ID).some(id => {
      const el = document.getElementById(id);
      return el && !el.classList.contains('hidden') && (el.offsetParent !== null || id === 'tabMapaProductos');
    });
    if(!activePlan || otherActive || otherVisible) hidePlanificacion();
  }
  function showPlanificacion(){
    if(!isGD()){
      try{ alert('Planificación inicial solo está disponible para usuarios GD.'); }catch(_){ }
      return false;
    }
    clearPlanificacionRuntimeFlag();
    setCurrentMainTabPlanificacion();
    ensureReady();
    showOnlyPlanificacionPanel();
    try{ initForm(); }catch(error){ console.warn('[ControlEvent v17_prod] No se pudo inicializar el formulario de planificación.', error); }
    unlockPlanControls();
    // Refuerzo mínimo para móviles: solo revalida esta ventana, sin envolver render() ni afectar a otras pestañas.
    [50, 180].forEach(ms => setTimeout(() => {
      try{
        if((typeof currentMainTab !== 'undefined' && currentMainTab === 'planificacion') || document.getElementById(TAB_BUTTON_ID)?.classList.contains('active')){
          showOnlyPlanificacionPanel();
          unlockPlanControls();
        }
      }catch(_){ }
    }, ms));
    return false;
  }
  function hideByRole(){
    const visible = isGD();
    const btn = document.getElementById(TAB_BUTTON_ID);
    if(btn){ btn.classList.toggle('hidden', !visible); btn.style.display = visible ? '' : 'none'; }
    document.querySelectorAll(`.mobile-menu-action[data-target="${TAB_BUTTON_ID}"]`).forEach(el => { el.classList.toggle('hidden', !visible); el.style.display = visible ? '' : 'none'; });
    const panel = document.getElementById(PANEL_ID);
    if(panel && !visible) panel.classList.add('hidden');
    syncPlanTopButton();
  }
  function ensureMobileButton(){
    const drawer = document.getElementById('ceMobileDrawer') || document.querySelector('.mobile-menu-drawer');
    const grid = drawer?.querySelector?.('.mobile-menu-grid') || document.querySelector('.mobile-menu-grid');
    if(!grid || grid.querySelector(`[data-target="${TAB_BUTTON_ID}"]`)) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mobile-menu-action';
    btn.dataset.target = TAB_BUTTON_ID;
    btn.innerHTML = '<span class="mi">🧠</span>Planificación inicial';
    const ref = grid.querySelector('[data-target="tabMapaBtn"]') || grid.querySelector('[data-target="tabResumenBtn"]');
    if(ref && ref.parentNode === grid) grid.insertBefore(btn, ref.nextSibling);
    else grid.appendChild(btn);
    btn.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); closeMobileMenu(); showPlanificacion(); }, true);
  }
  function closeMobileMenu(){
    try{
      document.body.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
      document.documentElement.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
      const drawer = document.getElementById('ceMobileDrawer');
      if(drawer){ drawer.setAttribute('aria-hidden','true'); drawer.style.removeProperty('display'); drawer.style.removeProperty('pointer-events'); }
      ['ceMobileDrawerBackdrop','ceMobileOverlay'].forEach(id => {
        const el = document.getElementById(id);
        if(el){ el.style.removeProperty('display'); el.style.removeProperty('pointer-events'); }
      });
      const menuBtn = document.getElementById('ceMobileMenuBtn');
      if(menuBtn){ menuBtn.disabled = false; menuBtn.removeAttribute('disabled'); menuBtn.removeAttribute('aria-disabled'); menuBtn.style.pointerEvents = 'auto'; }
    }catch(_){ }
  }
  function bindOnce(element, eventName, handler, options){
    if(!element) return;
    const key = `__cePlanV337_${eventName}`;
    if(element[key]) return;
    element[key] = true;
    element.addEventListener(eventName, handler, options);
  }
  function ensureHf27DiagnosticButton(){
    const gen = document.getElementById('btnGenerarPlanificacion');
    if(!gen) return;
    let btn = document.getElementById('btnHf27DiagnosticarPrompt');
    if(!btn){
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'btnHf27DiagnosticarPrompt';
      btn.className = 'secondary ce-hf27-diag-btn';
      btn.textContent = 'Diagnosticar prompt';
      btn.title = 'Lee las donaciones/existencias del prompt y muestra qué producto encuentra en PRODUCTOS antes de generar';
      gen.insertAdjacentElement('afterend', btn);
    }
    btn.disabled = false;
    btn.onclick = function(event){
      if(event){ event.preventDefault(); event.stopPropagation(); }
      try{ ceHf27RenderDiagnosticsOnly(); }
      catch(error){
        console.error('[ControlEvent v17_prod] Error abriendo diagnóstico HF27/HF28', error);
        const box = document.getElementById('planificacionResultado');
        if(box){
          box.classList.remove('hidden');
          box.innerHTML = '<div class="planificacion-note compact-note warning"><strong>No se pudo abrir el diagnóstico:</strong> '+esc(error?.message || error)+'</div>';
          try{ box.scrollIntoView({behavior:'smooth', block:'start'}); }catch(_){}
        }else{
          try{ alert('No se pudo abrir el diagnóstico: ' + (error?.message || error)); }catch(_){}
        }
      }
      return false;
    };
    if(!btn.__ceHf28DirectBound){
      btn.__ceHf28DirectBound = true;
      btn.addEventListener('click', btn.onclick, true);
      btn.addEventListener('pointerup', function(event){
        if(event && event.button !== undefined && event.button !== 0) return;
        btn.onclick(event);
      }, true);
    }
  }
  function bindEvents(){
    const btn = document.getElementById(TAB_BUTTON_ID);
    bindOnce(btn, 'click', event => { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); showPlanificacion(); }, true);
    KNOWN_BUTTONS.filter(id => id !== TAB_BUTTON_ID).forEach(id => bindOnce(document.getElementById(id), 'click', () => { clearPlanificacionRuntimeFlag(); setTimeout(hidePlanificacion, 0); }));
    document.querySelectorAll('.mobile-menu-action').forEach(el => {
      if(el.dataset?.target && el.dataset.target !== TAB_BUTTON_ID) bindOnce(el, 'click', () => { clearPlanificacionRuntimeFlag(); setTimeout(hidePlanificacion, 0); });
    });
    bindOnce(document.getElementById('btnGenerarPlanificacion'), 'click', generateProposal);
    if(!document.__ceHf28DiagnosticGlobalClick){
      document.__ceHf28DiagnosticGlobalClick = true;
      document.addEventListener('click', event => {
        const diag = event.target?.closest?.('#btnHf27DiagnosticarPrompt');
        if(!diag) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        try{ ceHf27RenderDiagnosticsOnly(); }
        catch(error){
          console.error('[ControlEvent v17_prod] Error diagnóstico HF28', error);
          const box = document.getElementById('planificacionResultado');
          if(box){
            box.classList.remove('hidden');
            box.innerHTML = '<div class="planificacion-note compact-note warning"><strong>No se pudo abrir el diagnóstico:</strong> '+esc(error?.message || error)+'</div>';
            try{ box.scrollIntoView({behavior:"smooth", block:"start"}); }catch(_){}
          }
        }
      }, true);
    }
    bindOnce(document.getElementById('planFuenteHistorica'), 'change', updatePlanModeUI);
    bindOnce(document.getElementById('planFechaIni'), 'change', updateDaysFromDates);
    bindOnce(document.getElementById('planFechaFin'), 'change', updateDaysFromDates);
    if(!document.__cePlanMobileClickV337){
      document.__cePlanMobileClickV337 = true;
      document.addEventListener('click', event => {
        const mobile = event.target?.closest?.(`.mobile-menu-action[data-target="${TAB_BUTTON_ID}"]`);
        if(mobile){ event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); closeMobileMenu(); showPlanificacion(); }
      }, true);
    }
    if(!document.__cePlanHideOtherTabsV337){
      document.__cePlanHideOtherTabsV337 = true;
      document.addEventListener('click', event => {
        const target = event.target?.closest?.('button[id], .mobile-menu-action[data-target]');
        if(!target) return;
        const id = target.id || target.dataset?.target || '';
        if(id && id !== TAB_BUTTON_ID && KNOWN_BUTTONS.includes(id)){ clearPlanificacionRuntimeFlag(); setTimeout(hidePlanificacion, 0); }
      }, true);
    }
  }
  function ensureReady(){
    if(!document.getElementById(PANEL_ID)) return;
    injectPlanHotfixStyle();
    bindEvents();
    ensureMobileButton();
    hideByRole();
    syncPlanTopButton();
    unlockPlanControls();
    ensureHf27DiagnosticButton();
  }
  function install(){
    if(initialized) return;
    initialized = true;
    ensureReady();
    window.showPlanificacionInicial = showPlanificacion;
    window.renderPlanificacionInicial = ensureReady;
    window.ControlEventPlanificacion = Object.assign(window.ControlEventPlanificacion || {}, {
      version: VERSION,
      show: showPlanificacion,
      hide: hidePlanificacion,
      ready: ensureReady
    });
    window.addEventListener('controlevent:app-ready', ensureReady);
    window.addEventListener('controlevent:runtime-ready', ensureReady);
    setInterval(() => { ensureReady(); enforcePlanificacionIsolation(); unlockPlanControls(); }, window.ControlEventLowResource?.interval?.(1800) || 1800);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();

/* ControlEvent v13.0_prod - Planificación inicial con Zuzu y réplica segura.
   La propuesta revisable puede nacer de un evento modelo o de una propuesta generada por Zuzu. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v13.0_prod';
  const TAB_BUTTON_ID = 'tabPlanificacionBtn';
  const PANEL_ID = 'tabPlanificacionInicial';
  const KNOWN_BUTTONS = ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn','tabMapaBtn','tabDocumentosBtn','tabPlanificacionBtn','tabResumenBtn','tabGraficasBtn'];
  const KNOWN_PANELS = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas','noEventMessage'];
  const DONATION_TYPES = ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'];
  const PURCHASE_TICKET_OPTIONS = ['', 'GASTOS CORRIENTES', ...Array.from({length:50}, (_,i)=>`TK${String(i+1).padStart(2,'0')}`)];
  const DONATION_TICKET_OPTIONS = ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'];
  const PLANNING_MODES = [
    {value:'BASE', label:'Replicar un evento Finalizado', needsModel:true, usesZuzu:false},
    {value:'ZUZU_TOTAL', label:'Encargo total a Zuzu', needsModel:false, usesZuzu:true},
    {value:'ZUZU_PARTIAL', label:'Encargo parcial a Zuzu', needsModel:true, usesZuzu:true}
  ];
  const CONTENT_OPTIONS = [
    {value:'ALL', label:'Todos los datos del evento modelo', modules:['INGRESOS','COMPRAS','DONACIONES']},
    {value:'INGRESOS', label:'Solo los datos de INGRESOS', modules:['INGRESOS']},
    {value:'COMPRAS', label:'Solo los datos de COMPRAS', modules:['COMPRAS']},
    {value:'DONACIONES', label:'Solo los datos de DONACIONES', modules:['DONACIONES']},
    {value:'INGRESOS_COMPRAS', label:'Usar INGRESOS + COMPRAS', modules:['INGRESOS','COMPRAS']},
    {value:'INGRESOS_DONACIONES', label:'Usar INGRESOS + DONACIONES', modules:['INGRESOS','DONACIONES']},
    {value:'COMPRAS_DONACIONES', label:'Usar COMPRAS + DONACIONES', modules:['COMPRAS','DONACIONES']}
  ];
  let initialized = false;
  let lastProposal = [];
  let lastIncomeProposal = [];
  let lastSourceEvent = null;
  let lastCreatedEventId = "";
  let lastPlanningMeta = {};
  let lastZuzuResult = null;

  function app(){ return window.ControlEventApp || window.ControlEventRuntime?.app || null; }
  function state(){ return app()?.state || window.state || {}; }
  function auth(){ return app()?.authUser || window.authUser || null; }
  function isGD(){ return String(auth()?.nivel || '').toUpperCase() === 'GD'; }
  function rows(name){ const value = state()[name]; return Array.isArray(value) ? value : []; }
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
  function rowEventId(row){ return String(row?.eventId || row?.event_id || ''); }
  function rowProductId(row){ return String(row?.productoId || row?.producto_id || ''); }
  function rowPersonId(row){ return String(row?.personaId || row?.persona_id || ''); }
  function rowTicket(row){ return String(row?.ticketDonacion || row?.ticket_donacion || row?.ticket || row?.ticketOtrosGastos || row?.ticket_otros_gastos || '').trim(); }
  function rowDonorRef(row){ return String(row?.donorRef || row?.donor_ref || ''); }
  function productOf(row){ return byId('productos', rowProductId(row)) || null; }
  function productName(row){ return productOf(row)?.nombre || row?.producto || 'Producto sin nombre'; }
  function segmentName(row){ return productOf(row)?.segmento || row?.segmento || 'Sin segmento'; }
  function destinoName(row){ return productOf(row)?.destino || row?.destino || 'Sin destino'; }
  function tiendaOf(id){ return byId('tiendas', id) || null; }
  function personaOf(id){ return byId('personas', id) || null; }
  function tiendaName(id){ return tiendaOf(id)?.nombre || 'Sin tienda'; }
  function personaName(id){ return personaOf(id)?.nombre || 'Sin responsable'; }
  function rowResponsible(row){ return String(row?.responsableId || row?.responsable_id || row?.responsable || row?.socioResponsableId || row?.socio_responsable_id || ''); }
  function rowTienda(row){ const p = productOf(row) || {}; return String(row?.tiendaId || row?.tienda_id || p.tiendaId || p.defaultTiendaId || p.tienda_id || p.default_tienda_id || ''); }
  function isDonation(row){ return DONATION_TYPES.includes(rowTicket(row)); }
  function ticketLabel(row){
    const raw = rowTicket(row);
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
      if(el.id === 'planEventoBase' && !modeNeedsModel()) return;
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
  function planningMode(){
    const value = document.getElementById('planFuenteHistorica')?.value || 'BASE';
    return PLANNING_MODES.find(item => item.value === value) || PLANNING_MODES[0];
  }
  function contentOption(){
    const value = document.getElementById('planNivelPropuesta')?.value || 'ALL';
    return CONTENT_OPTIONS.find(item => item.value === value) || CONTENT_OPTIONS[0];
  }
  function contentModules(){ return contentOption().modules.slice(); }
  function contentAllows(moduleName){ return contentModules().includes(moduleName); }
  function firstDefaultResponsable(){ return document.getElementById('planResponsable')?.value || socios()[0]?.id || ''; }
  function firstDefaultTienda(){ return document.getElementById('planTienda')?.value || tiendas()[0]?.id || ''; }
  function modeNeedsModel(){ return planningMode().needsModel; }
  function modeUsesZuzu(){ return planningMode().usesZuzu; }
  function syncPlanningModeFields(){
    const mode = planningMode();
    const base = document.getElementById('planEventoBase');
    if(base){
      base.disabled = !mode.needsModel;
      if(!mode.needsModel) base.value = '';
    }
  }
  function findByName(listName, name){
    const target = normalizeText(name);
    if(!target) return null;
    return rows(listName).find(item => normalizeText(item?.nombre || item?.titulo || '') === target)
      || rows(listName).find(item => {
        const current = normalizeText(item?.nombre || item?.titulo || '');
        return current && (current.includes(target) || target.includes(current));
      })
      || null;
  }
  function findProductByName(name){ return findByName('productos', name); }
  function findTiendaByName(name){ return findByName('tiendas', name); }
  function findPersonaByName(name){ return findByName('personas', name); }
  function normalizeDonationType(value){
    const clean = up(value);
    if(clean.includes('TIENDA')) return 'DONADO TIENDA';
    if(clean.includes('SOCIO')) return 'DONADO SOCIO';
    if(clean.includes('OTRO')) return 'DONADO OTROS';
    return 'DONADO OTROS';
  }
  function donorRefFromLabel(label, donationType){
    const raw = String(label || '').trim();
    if(!raw) return '';
    const person = findPersonaByName(raw);
    if(person) return `P:${person.id}`;
    const store = findTiendaByName(raw);
    if(store) return `T:${store.id}`;
    if(normalizeDonationType(donationType) === 'DONADO TIENDA'){
      const fallback = findTiendaByName(raw) || tiendaOf(firstDefaultTienda());
      return fallback?.id ? `T:${fallback.id}` : '';
    }
    return '';
  }
  function numberFromAi(value){
    const n = parseNum(value);
    return Number.isFinite(n) ? n : 0;
  }
  function columnIndex(columns, names){
    const normalized = columns.map(normalizeText);
    for(const name of names){
      const idx = normalized.findIndex(col => col === normalizeText(name) || col.includes(normalizeText(name)));
      if(idx >= 0) return idx;
    }
    return -1;
  }
  function buildZuzuPlanningPrompt(source){
    const mode = planningMode();
    const content = contentOption();
    const modules = content.modules.join(', ');
    const sourceLine = source
      ? `Evento modelo obligatorio: "${source.titulo || 'Sin título'}" (${source.fechaIni || ''} - ${source.fechaFin || ''}).`
      : 'Sin evento modelo: analiza todos los eventos finalizados disponibles como histórico y usa catálogo de productos, tiendas y personas cuando haga falta.';
    const lines = [
      'PLANIFICACION INICIAL CONTROL EVENT CON ZUZU.',
      'Objetivo: generar una propuesta editable para crear un evento NUEVO, no modificar eventos existentes.',
      `Modo de planificación: ${mode.label}.`,
      `Contenido solicitado: ${content.label}. Módulos que debe usar ControlEvent: ${modules}.`,
      sourceLine,
      `Nombre del evento nuevo: ${fieldValue('planEventoTitulo') || 'pendiente de nombre'}.`,
      `Fecha inicio organización/evento: ${fieldValue('planFechaIni') || 'sin indicar'}.`,
      `Fecha fin evento/contable: ${fieldValue('planFechaFin') || 'sin indicar'}.`,
      `Días de duración: ${fieldValue('planDias') || '1'}.`,
      `Número estimado de personas: ${fieldValue('planPersonas') || 'sin indicar'}.`,
      `Responsable por defecto: ${personaName(firstDefaultResponsable())}.`,
      `Tienda por defecto: ${tiendaName(firstDefaultTienda())}.`,
      `Descripción breve: ${fieldValue('planDescripcion') || 'sin descripción'}.`,
      `Información para la construcción: ${fieldValue('planInfo') || 'sin instrucciones adicionales'}.`,
      '',
      'Devuelve una respuesta breve y, si proceden COMPRAS o DONACIONES, una tabla titulada exactamente "Propuesta de compras y donaciones".',
      'Columnas obligatorias de esa tabla: Tipo, Producto, Unidades, Precio, Tienda, Responsable, Tipo de donación, Donante, Segmento, Destino, Motivo.',
      'Tipo debe ser COMPRA o DONACION. Precio en euros por unidad. No uses códigos internos.',
      'Si el modo es réplica parcial, parte del evento modelo pero ajusta cantidades/variedad según días, personas e instrucciones.',
      'Si el modo es encargo total, inventa solo lo razonable para el evento nuevo usando el histórico y el catálogo como referencia.'
    ];
    return lines.join('\n');
  }
  async function callZuzuPlanning(source){
    const prompt = buildZuzuPlanningPrompt(source);
    const selectedEventId = source?.id || '';
    const res = await fetch('/api/event-ai/analyze', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({prompt, selectedEventId})
    });
    const data = await res.json().catch(() => ({}));
    if(!res.ok || data.ok === false) throw new Error(data.error || data.message || `HTTP ${res.status}`);
    return data;
  }
  function zuzuProposalRows(data){
    const out = [];
    const tables = Array.isArray(data?.tables) ? data.tables : [];
    tables.forEach((table, tableIndex) => {
      const columns = Array.isArray(table?.columns) ? table.columns : [];
      const rowsData = Array.isArray(table?.rows) ? table.rows : [];
      const productIdx = columnIndex(columns, ['Producto','Artículo','Articulo','Nombre producto']);
      const unitsIdx = columnIndex(columns, ['Unidades','Cantidad']);
      if(productIdx < 0 || unitsIdx < 0) return;
      const typeIdx = columnIndex(columns, ['Tipo']);
      const priceIdx = columnIndex(columns, ['Precio','Precio unitario','Precio rfa']);
      const storeIdx = columnIndex(columns, ['Tienda','Proveedor']);
      const personIdx = columnIndex(columns, ['Responsable']);
      const donationIdx = columnIndex(columns, ['Tipo de donación','Tipo donación','Donación']);
      const donorIdx = columnIndex(columns, ['Donante']);
      const segmentIdx = columnIndex(columns, ['Segmento']);
      const destinoIdx = columnIndex(columns, ['Destino']);
      const reasonIdx = columnIndex(columns, ['Motivo','Razón','Razon','Justificación','Justificacion']);
      rowsData.forEach((row, rowIndex) => {
        const cells = Array.isArray(row) ? row : [];
        const rawProduct = String(cells[productIdx] || '').trim();
        if(!rawProduct) return;
        const rawType = up(cells[typeIdx] || '');
        const rawDonation = String(cells[donationIdx] || '').trim();
        const tipo = rawType.includes('DON') || rawDonation ? 'DONACION' : 'COMPRA';
        const product = findProductByName(rawProduct);
        const store = findTiendaByName(cells[storeIdx] || '');
        const person = findPersonaByName(cells[personIdx] || '');
        const donationType = tipo === 'DONACION' ? normalizeDonationType(rawDonation || cells[typeIdx] || '') : '';
        const price = numberFromAi(cells[priceIdx]);
        out.push({
          key: `zuzu:${tableIndex}:${rowIndex}:${normalizeText(rawProduct)}`,
          include: true,
          tipo,
          sourceId: '',
          productId: product?.id || '',
          productName: product?.nombre || rawProduct,
          segmento: product?.segmento || String(cells[segmentIdx] || '').trim() || 'SIN CLASIFICAR',
          destino: product?.destino || String(cells[destinoIdx] || '').trim() || 'SIN CLASIFICAR',
          unidades: Math.max(0, Math.round(numberFromAi(cells[unitsIdx]) * 100) / 100),
          precio: price > 0 ? price : Number(product?.defaultPrecio ?? product?.precio ?? 0) || 0,
          tiendaId: store?.id || firstDefaultTienda(),
          responsableId: person?.id || firstDefaultResponsable(),
          ticketDonacion: tipo === 'DONACION' ? donationType : '',
          donorRef: tipo === 'DONACION' ? donorRefFromLabel(cells[donorIdx], donationType) : '',
          sourceTiendaId: '',
          sourcePrecio: price,
          confidence: product ? 'Zuzu + catálogo' : 'Zuzu producto nuevo',
          reason: String(cells[reasonIdx] || '').trim() || 'Propuesto por Zuzu según histórico, datos del evento e instrucciones.',
          isNewProduct: !product
        });
      });
    });
    return out;
  }
  function renderZuzuInsight(){
    if(!lastZuzuResult && !lastPlanningMeta?.zuzuError) return '';
    const warnings = Array.isArray(lastZuzuResult?.warnings) ? lastZuzuResult.warnings : [];
    const answer = lastPlanningMeta?.zuzuError
      ? `Zuzu no pudo generar una propuesta nueva (${lastPlanningMeta.zuzuError}). Se mantiene el respaldo local.`
      : (lastZuzuResult?.answer || 'Zuzu ha generado una propuesta estructurada.');
    return `
      <div class="planificacion-note compact-note plan-zuzu-note">
        <strong>Zuzu:</strong> ${esc(answer)}
        ${warnings.length ? `<ul>${warnings.slice(0,4).map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
      </div>
    `;
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
  function donorLabel(ref){
    if(!ref) return 'Sin donante';
    const parts = String(ref).split(':');
    const kind = parts[0], id = parts.slice(1).join(':');
    if(kind === 'P') return personaOf(id)?.nombre || 'Persona sin nombre';
    if(kind === 'T') return tiendaOf(id)?.nombre || 'Tienda sin nombre';
    return ref;
  }
  function incomeRowsForEvent(eventId){
    const id = String(eventId || '');
    return rows('colaboradores').filter(c => rowEventId(c) === id).map((c, index) => {
      const personaId = rowPersonId(c);
      const persona = personaOf(personaId) || {};
      const rango = up(persona.rango || c.rango || '');
      const numero = Math.max(0, Number(c.numero || 0));
      const voluntario = parseNum(c.importe ?? c.importeVoluntario ?? 0);
      const precioEvento = parseNum(sourceEvent()?.precio ?? 0);
      const obligatorio = rango === 'SOCIO' ? numero * precioEvento : 0;
      return {
        key: `ingreso:${c.id || index}`,
        sourceId: c.id || '',
        personaId,
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
    const list = Array.isArray(incomes) ? incomes : [];
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
    const info = incomeSummary(incomes);
    if(!info.registros){
      return '<div class="planificacion-note compact-note"><strong>Ingresos del evento modelo:</strong> no hay ingresos registrados para replicar.</div>';
    }
    return `
      <div class="planificacion-note compact-note plan-income-replica">
        <strong>Ingresos a replicar tal cual:</strong>
        ${qty(info.sociosPersonas)} SOCIOS · ${qty(info.noSociosPersonas)} NO SOCIOS
        <span>(${info.registros} registros de ingresos · ${qty(info.totalPersonas)} personas representadas · ${money(info.importe)})</span>
      </div>
    `;
  }

  function sociosParaIngresosIniciales(){
    // Regla preparada para inserción futura: si hay registro conjunto numero=2, prima sobre los individuales numero=1.
    const list = socios();
    const selected = new Map();
    const coveredSingles = new Set();
    const couples = [];
    list.forEach(p => {
      const numero = Math.max(1, Number(p.numero || p.NUMERO || p.personas || p.n || 1));
      const name = normalizeText(p.nombre || '');
      if(!name) return;
      if(numero >= 2){
        couples.push({persona:p, numero, name});
        name.split(/\s+(?:Y|E|\+)\s+/).map(normalizeText).filter(Boolean).forEach(part => coveredSingles.add(part));
      }
    });
    couples.forEach(c => selected.set(String(c.persona.id), {...c.persona, numeroIngreso:c.numero}));
    list.forEach(p => {
      const id = String(p.id || '');
      const numero = Math.max(1, Number(p.numero || p.NUMERO || p.personas || p.n || 1));
      const name = normalizeText(p.nombre || '');
      if(!id || !name || numero >= 2) return;
      if(coveredSingles.has(name)) return;
      selected.set(id, {...p, numeroIngreso:1});
    });
    return [...selected.values()].sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
  }

  function initForm(){
    const events = finalizados();
    const mode = planningMode();
    const eventOptions = events.length ? events.map(e => ({value:e.id, label:`${e.fechaIni || '--/--/--'} · ${e.titulo || 'Evento sin título'} · FINALIZADO`})) : [{value:'', label:'No hay eventos finalizados disponibles'}];
    const baseOptions = mode.needsModel ? eventOptions : [{value:'', label:'No procede en encargo total a Zuzu'}].concat(eventOptions);
    setOptions(document.getElementById('planEventoBase'), baseOptions, mode.needsModel ? (events[0]?.id || '') : '');
    const fuente = document.getElementById('planFuenteHistorica');
    if(fuente){ setOptions(fuente, PLANNING_MODES.map(({value,label}) => ({value,label})), fuente.value || 'BASE'); fuente.disabled = false; }
    const nivel = document.getElementById('planNivelPropuesta');
    if(nivel){ setOptions(nivel, CONTENT_OPTIONS.map(({value,label}) => ({value,label})), nivel.value || 'ALL'); nivel.disabled = false; }
    syncPlanningModeFields();
    const socioOptions = socios().map(p => ({value:p.id, label:p.nombre || 'Socio sin nombre'}));
    setOptions(document.getElementById('planResponsable'), socioOptions.length ? socioOptions : [{value:'', label:'Sin socios disponibles'}]);
    const tiendaOptions = tiendas().map(t => ({value:t.id, label:t.nombre || 'Tienda sin nombre'}));
    setOptions(document.getElementById('planTienda'), tiendaOptions.length ? tiendaOptions : [{value:'', label:'Sin tiendas disponibles'}]);
    updateDaysFromDates();
    unlockPlanControls();
    syncPlanningModeFields();
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
    if(!modeNeedsModel()) return null;
    const id = document.getElementById('planEventoBase')?.value || '';
    return byId('eventos', id);
  }
  function buildReplicaProposal(){
    const ev = sourceEvent();
    if(!ev){ return {event:null, rows:[], incomes:[]}; }
    if(up(ev.situacion || '') !== 'FINALIZADO') return {event:ev, rows:[], incomes:[]};
    const modules = contentModules();
    const eventRows = rows('compras').filter(row => rowEventId(row) === String(ev.id || ''));
    const mapped = eventRows.map((row, index) => {
      const product = productOf(row) || {};
      const tipo = isDonation(row) ? 'DONACION' : 'COMPRA';
      return {
        key: `replica:${row.id || index}`,
        include: true,
        tipo,
        sourceId: row.id || '',
        productId: product.id || rowProductId(row),
        productName: product.nombre || productName(row),
        segmento: product.segmento || segmentName(row),
        destino: product.destino || destinoName(row),
        unidades: Math.max(0, Math.round(Number(row.unidades || 0) * 100) / 100),
        precio: unitPrice(row),
        tiendaId: rowTienda(row),
        responsableId: rowResponsible(row),
        ticketDonacion: rowTicket(row),
        donorRef: rowDonorRef(row),
        sourceTiendaId: rowTienda(row),
        sourcePrecio: unitPrice(row),
        confidence: 'Réplica exacta',
        reason: tipo === 'DONACION'
          ? 'Donación de producto replicada tal cual desde el evento finalizado.'
          : 'Compra replicada tal cual desde el evento finalizado.'
      };
    });
    const filtered = mapped.filter(item => (item.tipo === 'COMPRA' && modules.includes('COMPRAS')) || (item.tipo === 'DONACION' && modules.includes('DONACIONES')));
    filtered.sort((a,b) => {
      const ta = a.tipo.localeCompare(b.tipo, 'es');
      if(ta) return ta;
      return String(tiendaName(a.tiendaId)).localeCompare(String(tiendaName(b.tiendaId)),'es') || String(a.ticketDonacion || '').localeCompare(String(b.ticketDonacion || ''),'es') || a.productName.localeCompare(b.productName,'es');
    });
    return {event:ev, rows:filtered, incomes: modules.includes('INGRESOS') ? incomeRowsForEvent(ev.id) : []};
  }

  function renderProposal(){
    const box = document.getElementById('planificacionResultado');
    if(!box) return;
    const proposals = lastProposal;
    const source = lastSourceEvent;
    const compras = proposals.filter(p => p.tipo === 'COMPRA' && p.include);
    const donaciones = proposals.filter(p => p.tipo === 'DONACION' && p.include);
    const totalCompras = compras.reduce((sum,p)=>sum + Number(p.unidades || 0) * Number(p.precio || 0), 0);
    const totalDonaciones = donaciones.reduce((sum,p)=>sum + Number(p.unidades || 0) * Number(p.precio || 0), 0);
    const ingresosInfo = incomeSummary(lastIncomeProposal);
    const mode = lastPlanningMeta.mode || planningMode();
    const cards = proposals.length ? proposals.map((p, index) => renderProposalRow(p, index)).join('') : '<div class="empty">No hay compras ni donaciones de producto en la propuesta actual.</div>';
    const sourceTitle = source?.titulo || (mode.value === 'ZUZU_TOTAL' ? 'Sin evento modelo · encargo total a Zuzu' : 'Sin evento modelo');
    const sourceDates = source ? `${source.fechaIni || ''}${source?.fechaFin ? ' · ' + source.fechaFin : ''}` : (lastPlanningMeta.modules?.length ? `Módulos: ${lastPlanningMeta.modules.join(' + ')}` : '');
    box.classList.remove('hidden');
    box.innerHTML = `
      <div class="plan-summary-grid">
        <div class="plan-metric"><span>${mode.needsModel ? 'Evento modelo' : 'Histórico Zuzu'}</span><strong>${esc(sourceTitle)}</strong><small>${esc(sourceDates)}</small></div>
        <div class="plan-metric"><span>Compras propuestas</span><strong>${compras.length}</strong><small>${money(totalCompras)} previstos</small></div>
        <div class="plan-metric"><span>Donaciones propuestas</span><strong>${donaciones.length}</strong><small>${money(totalDonaciones)} valor estimado</small></div>
        <div class="plan-metric"><span>Ingresos previstos</span><strong>${qty(ingresosInfo.sociosPersonas)} SOCIOS · ${qty(ingresosInfo.noSociosPersonas)} NO SOCIOS</strong><small>${ingresosInfo.registros} registros · ${qty(ingresosInfo.totalPersonas)} personas</small></div>
      </div>
      ${renderIngresosReplica(lastIncomeProposal)}
      ${renderZuzuInsight()}
      <div class="planificacion-note compact-note">
        <strong>Propuesta inicial:</strong> revisa, incluye o quita líneas antes de crear el evento real. Ingresos en Pendiente, donaciones con su tipo y compras en Pte.Compra u otros gastos.
      </div>
      <div class="plan-search-line">
        <input id="planBuscarProducto" type="search" placeholder="Buscar producto en la propuesta..." autocomplete="off" />
        <button type="button" class="outline" id="btnPlanBuscarProducto">Buscar</button>
      </div>
      <div class="plan-actions-line">
        <button type="button" class="outline" id="btnPlanSelectAll">Incluir todo</button>
        <button type="button" class="outline" id="btnPlanSelectNone">Quitar todo</button>
        <button type="button" class="secondary" id="btnPlanApplyReplica">Generar nuevo evento</button>
      </div>
      <div class="plan-proposal-list" id="planProposalList">${cards}</div>
    `;
    bindProposalControls();
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
          <div class="plan-product-title"><strong>${esc(p.productName)}</strong><span>${esc(p.segmento)} · ${esc(p.destino)}${p.isNewProduct ? ' · producto nuevo' : ''}</span></div>
          <span class="plan-confidence alta">${p.tipo === 'DONACION' ? 'Donación' : 'Compra'}${p.isNewProduct ? ' nueva' : ''}</span>
        </div>
        <div class="plan-product-grid replica-grid">
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${esc(p.unidades)}" data-plan-field="unidades" /></div>
          <div class="field"><label>Precio</label><input type="number" min="0" step="0.01" value="${esc(p.precio)}" data-plan-field="precio" /></div>
          <div class="field"><label>Importe</label><input readonly class="soft-readonly" value="${esc(money(importe))}" data-plan-output="importe" /></div>
          <div class="field"><label>${p.tipo === 'DONACION' ? 'Tipo donación' : 'Ticket / estado'}</label><select data-plan-field="ticketDonacion">${ticketOpts}</select></div>
          <div class="field"><label>Tienda</label><select data-plan-field="tiendaId">${tiendasOpts || '<option value="">Sin tiendas</option>'}</select></div>
          <div class="field"><label>Responsable</label><select data-plan-field="responsableId">${sociosOpts || '<option value="">Sin socios</option>'}</select></div>
          ${p.tipo === 'DONACION' ? `<div class="field"><label>Donante</label><select data-plan-field="donorRef"><option value="" ${!p.donorRef?'selected':''}>-- sin donante --</option>${donorOpts}</select></div>` : ''}
        </div>
        <div class="plan-reason">${esc(p.reason)}${p.tipo === 'DONACION' ? ` Donante: ${esc(donorLabel(p.donorRef))}.` : ''}</div>
      </div>
    `;
  }
  function searchProposalProduct(){
    const input = document.getElementById('planBuscarProducto');
    const term = normalizeText(input?.value || '');
    if(!term){ input?.focus(); return; }
    const cards = Array.from(document.querySelectorAll('#planProposalList .plan-product-card'));
    const found = cards.find(card => String(card.dataset.planProductName || '').includes(term));
    document.querySelectorAll('#planProposalList .plan-product-card.plan-found').forEach(el => el.classList.remove('plan-found'));
    if(found){
      found.classList.add('plan-found');
      found.scrollIntoView({behavior:'smooth', block:'center'});
      setTimeout(() => found.classList.remove('plan-found'), 2600);
    }else{
      try{ alert('No se ha encontrado ningún producto que contenga: ' + (input?.value || '')); }catch(_){ }
    }
    if(input) input.value = '';
  }
  function bindProposalControls(){
    const box = document.getElementById('planificacionResultado');
    if(!box) return;
    box.querySelectorAll('[data-plan-index]').forEach(card => {
      const idx = Number(card.dataset.planIndex);
      card.querySelectorAll('[data-plan-field]').forEach(input => {
        input.addEventListener('change', () => updateProposalFromCard(idx, card));
        input.addEventListener('input', () => {
          if(input.dataset.planField === 'unidades' || input.dataset.planField === 'precio') updateProposalFromCard(idx, card, true);
        });
      });
    });
    const setIncluded = mode => { lastProposal = lastProposal.map(p => ({...p, include: mode === 'all'})); renderProposal(); };
    document.getElementById('btnPlanSelectAll')?.addEventListener('click', () => setIncluded('all'));
    document.getElementById('btnPlanSelectNone')?.addEventListener('click', () => setIncluded('none'));
    document.getElementById('btnPlanBuscarProducto')?.addEventListener('click', searchProposalProduct);
    document.getElementById('planBuscarProducto')?.addEventListener('keydown', event => { if(event.key === 'Enter'){ event.preventDefault(); searchProposalProduct(); } });
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
    if(!light) setTimeout(renderProposal, 0);
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
    const raw = fieldValue('planEventoTitulo');
    if(raw) return raw;
    if(!modeNeedsModel()) return 'Nuevo evento planificado';
    const base = lastSourceEvent?.titulo || sourceEvent()?.titulo || 'Evento replicado';
    return 'Copia de ' + base;
  }
  function ensureProductForProposal(p, st){
    if(p.productId) return p.productId;
    if(!st.productos) st.productos = [];
    const existing = findProductByName(p.productName);
    if(existing?.id){
      p.productId = existing.id;
      return existing.id;
    }
    const name = String(p.productName || '').trim();
    if(!name) return '';
    const id = makeId();
    st.productos.push({
      id,
      nombre: name,
      segmento: String(p.segmento || 'SIN CLASIFICAR').trim() || 'SIN CLASIFICAR',
      destino: String(p.destino || 'SIN CLASIFICAR').trim() || 'SIN CLASIFICAR',
      defaultPrecio: Number(p.precio || 0),
      precio: Number(p.precio || 0),
      defaultTiendaId: String(p.tiendaId || firstDefaultTienda() || '')
    });
    p.productId = id;
    p.isNewProduct = false;
    p.reason = `${p.reason || 'Producto propuesto por Zuzu.'} Se creó ficha mínima de producto al generar el evento.`;
    return id;
  }
  function confirmReplicaCreation(){
    const included = lastProposal.filter(p => p.include);
    const purchases = included.filter(p => p.tipo === 'COMPRA').length;
    const donations = included.filter(p => p.tipo === 'DONACION').length;
    const newProducts = included.filter(p => !p.productId).length;
    const inc = incomeSummary(lastIncomeProposal);
    const title = proposedEventTitle();
    const msg = [
      'Se va a crear un EVENTO REAL desde la propuesta inicial.',
      '',
      'Evento nuevo: ' + title,
      'Ingresos a replicar: ' + inc.registros + ' registros (' + qty(inc.sociosPersonas) + ' SOCIOS · ' + qty(inc.noSociosPersonas) + ' NO SOCIOS)',
      'Compras a replicar: ' + purchases,
      'Donaciones de producto a replicar: ' + donations,
      newProducts ? 'Productos nuevos a crear en catálogo: ' + newProducts : '',
      '',
      'No se crearán ni eliminarán PERSONAS ni TIENDAS generales.',
      'Solo se crearán PRODUCTOS nuevos si Zuzu los propuso y los has dejado incluidos.',
      'Después podrás revisar y adaptar el evento desde las pantallas normales.',
      '',
      '¿Quieres continuar?'
    ].filter(line => line !== '').join('\n');
    try{ return confirm(msg); }catch(_){ return false; }
  }
  function applyReplicaToRealEvent(){
    if(!isGD()) return;
    const source = lastSourceEvent || sourceEvent();
    const mode = lastPlanningMeta.mode || planningMode();
    if(mode.needsModel && !source){ try{ alert('Primero debes generar una propuesta desde un evento modelo.'); }catch(_){} return; }
    if(mode.needsModel && up(source.situacion || '') !== 'FINALIZADO'){
      try{ alert('Solo se puede crear desde un evento que esté FINALIZADO.'); }catch(_){}
      return;
    }
    if(!lastProposal.length && !lastIncomeProposal.length){ try{ alert('No hay propuesta generada. Pulsa primero Generar propuesta.'); }catch(_){} return; }
    const st = state();
    if(!st.eventos || !st.colaboradores || !st.compras){ try{ alert('No se ha podido acceder al estado de la app.'); }catch(_){} return; }
    const title = proposedEventTitle();
    if(!title){ try{ alert('Indica un nombre para el nuevo evento.'); }catch(_){} return; }
    const duplicate = st.eventos.some(e => normalizeText(e.titulo || '') === normalizeText(title));
    if(duplicate){ try{ alert('Ya existe un evento con ese nombre. Cambia el nombre antes de crear la réplica.'); }catch(_){} return; }
    if(!confirmReplicaCreation()) return;

    const newEventId = makeId();
    const fechaIni = fieldValue('planFechaIni') || source.fechaIni || '';
    const fechaFin = fieldValue('planFechaFin') || fieldValue('planFechaIni') || source.fechaFin || source.fechaIni || '';
    const descUser = fieldValue('planDescripcion');
    const infoUser = fieldValue('planInfo');
    const origen = source
      ? 'Propuesta inicial creada desde evento modelo finalizado: ' + (source.titulo || 'sin título') + '.'
      : 'Propuesta inicial creada por Zuzu sin evento modelo obligatorio.';
    const descripcion = [
      descUser || source?.descripcion || '',
      origen,
      lastPlanningMeta?.mode?.label ? 'Modo de planificación: ' + lastPlanningMeta.mode.label + '.' : '',
      lastPlanningMeta?.modules?.length ? 'Contenido usado: ' + lastPlanningMeta.modules.join(', ') + '.' : '',
      infoUser ? 'Información de planificación: ' + infoUser : ''
    ].filter(Boolean).join('\n');

    st.eventos.push({
      id: newEventId,
      titulo: title,
      precio: parseNum(source?.precio || 0),
      fechaIni,
      fechaFin,
      situacion: 'En curso',
      descripcion
    });

    lastIncomeProposal.forEach(item => {
      if(!item.personaId) return;
      st.colaboradores.push({
        id: makeId(),
        eventId: newEventId,
        personaId: item.personaId,
        numero: Number(item.numero || 0),
        situacion: 'Pendiente',
        importe: Number(item.importeVoluntario || 0)
      });
    });

    lastProposal.filter(p => p.include).forEach(p => {
      const productId = ensureProductForProposal(p, st);
      if(!productId) return;
      const isDon = p.tipo === 'DONACION';
      st.compras.push({
        id: makeId(),
        eventId: newEventId,
        productoId: productId,
        unidades: Number(p.unidades || 0),
        precio: Number(p.precio || 0),
        tiendaId: String(p.tiendaId || p.sourceTiendaId || ''),
        ticketDonacion: isDon ? String(p.ticketDonacion || '') : '',
        donorRef: isDon ? String(p.donorRef || '') : '',
        responsableId: String(p.responsableId || '')
      });
    });

    st.selectedEventId = newEventId;
    lastCreatedEventId = newEventId;
    callSave();
    callRender();
    try{ alert('Evento creado correctamente desde la réplica. Revísalo y adapta lo necesario.'); }catch(_){}
    try{ if(typeof window.renderMapaProductos === 'function') window.renderMapaProductos(); }catch(_){}
  }

  function showPlanningBusy(message){
    const box = document.getElementById('planificacionResultado');
    if(!box) return;
    box.classList.remove('hidden');
    box.innerHTML = `<div class="planificacion-note compact-note"><strong>${esc(message || 'Generando propuesta...')}</strong></div>`;
  }
  async function generateProposal(){
    if(!isGD()) return;
    const mode = planningMode();
    const modules = contentModules();
    const replica = buildReplicaProposal();
    lastSourceEvent = replica.event;
    lastZuzuResult = null;
    lastPlanningMeta = {mode, content: contentOption(), modules, zuzuError: ''};
    if(mode.needsModel && !replica.event){
      lastIncomeProposal = [];
      try{ alert('Debes elegir un evento modelo finalizado.'); }catch(_){ }
      return;
    }
    if(mode.needsModel && up(replica.event.situacion || '') !== 'FINALIZADO'){
      lastIncomeProposal = [];
      try{ alert('El evento modelo debe estar en situación FINALIZADO.'); }catch(_){ }
      return;
    }
    lastProposal = replica.rows || [];
    lastIncomeProposal = replica.incomes || [];
    if(mode.usesZuzu){
      showPlanningBusy('Zuzu está preparando la propuesta inicial...');
      try{
        const data = await callZuzuPlanning(replica.event);
        lastZuzuResult = data;
        const zuzuRows = zuzuProposalRows(data);
        if(zuzuRows.length){
          lastProposal = zuzuRows.filter(item => (item.tipo === 'COMPRA' && modules.includes('COMPRAS')) || (item.tipo === 'DONACION' && modules.includes('DONACIONES')));
        }else if(!lastProposal.length){
          lastPlanningMeta.zuzuError = 'no devolvió una tabla de propuesta con Producto y Unidades';
        }
      }catch(error){
        lastPlanningMeta.zuzuError = error?.message || String(error);
      }
    }
    renderProposal();
    document.getElementById('planificacionResultado')?.scrollIntoView({behavior:'smooth', block:'start'});
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
    try{ initForm(); }catch(error){ console.warn('[ControlEvent v13.0_prod] No se pudo inicializar el formulario de planificación.', error); }
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
  function bindEvents(){
    const btn = document.getElementById(TAB_BUTTON_ID);
    bindOnce(btn, 'click', event => { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); showPlanificacion(); }, true);
    KNOWN_BUTTONS.filter(id => id !== TAB_BUTTON_ID).forEach(id => bindOnce(document.getElementById(id), 'click', () => { clearPlanificacionRuntimeFlag(); setTimeout(hidePlanificacion, 0); }));
    document.querySelectorAll('.mobile-menu-action').forEach(el => {
      if(el.dataset?.target && el.dataset.target !== TAB_BUTTON_ID) bindOnce(el, 'click', () => { clearPlanificacionRuntimeFlag(); setTimeout(hidePlanificacion, 0); });
    });
    bindOnce(document.getElementById('btnGenerarPlanificacion'), 'click', generateProposal);
    bindOnce(document.getElementById('planFuenteHistorica'), 'change', () => { initForm(); syncPlanningModeFields(); });
    bindOnce(document.getElementById('planNivelPropuesta'), 'change', () => { lastProposal = []; lastIncomeProposal = []; lastZuzuResult = null; });
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
    bindEvents();
    ensureMobileButton();
    hideByRole();
    syncPlanTopButton();
    unlockPlanControls();
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

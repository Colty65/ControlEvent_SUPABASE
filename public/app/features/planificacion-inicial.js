/* ControlEvent v15_prod - Planificación inicial con Zuzu.
   Permite réplica exacta, encargo total o encargo parcial con módulos históricos y propuesta revisable. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v15_prod';
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
      if(p.tipo === 'DONACION'){
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
    if(/\b(?:LATA|LATAS|BOTELLIN|BOTELLINES|BOTE|BOTES)\b/.test(n) && /(CERVEZA|COCA|FANTA|SPRITE|TONICA|AQUARIUS|ACUARIUS|REFRESCO|BITTER)/.test(n)) return true;
    if(/\b(?:COCA\s*COLA|FANTA|SPRITE|TONICA|AQUARIUS|ACUARIUS|CERVEZA\s+SKOL)\b/.test(n) && !/BOTELLA\s*2/.test(n)) return true;
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
    if(isPackRoundedProduct(productName)) return Math.max(24, Math.ceil(u / 24) * 24);
    if(productAllowsDecimalUnits(productName)) return Math.ceil(u * 100) / 100;
    return Math.max(1, Math.ceil(u));
  }
  function planBuyAfterDonation(productName, totalNeed, donatedUnits){
    const need = Math.max(0, Number(totalNeed || 0));
    const donated = Math.max(0, Number(donatedUnits || 0));
    // HOTFIX18: A COMPRAR = NECESIDAD CALCULADA - total donado de ese producto.
    return Math.max(0, Math.round((need - donated) * 100) / 100);
  }
  function planDisplayNeedAfterRounding(productName, totalNeed){
    const need = Math.max(0, Number(totalNeed || 0));
    if(!need) return 0;
    return isPackRoundedProduct(productName) ? roundPurchaseUnits(productName, need) : Math.round(need * 100) / 100;
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
    const target = normalizeText(name || '');
    if(!target) return null;
    const products = rows('productos');
    const exact = products.filter(p => normalizeText(p?.nombre || '') === target);
    if(exact.length === 1) return exact[0];
    const close = products.filter(p => {
      const n = normalizeText(p?.nombre || '');
      if(!n) return false;
      return n === target || n.startsWith(target) || target.startsWith(n);
    });
    if(close.length === 1) return close[0];
    return null;
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
      let units = Number(p.unidades || 0);
      const quotaKey = `${key}|${String(p.donorRef || '')}|${String(p.ticketDonacion || '')}`;
      const quota = suppressedDonation ? null : promptDonationQuantity(p);
      if(String(p.tipo || '').toUpperCase() === 'DONACION' && quota !== null){
        const used = donationQuotaUsed.get(quotaKey) || 0;
        const available = Math.max(0, Number(quota || 0) - used);
        units = Math.min(Math.max(0, units), available);
        donationQuotaUsed.set(quotaKey, used + units);
        if(units <= 0){ p = {...p, include:false, __ceSuppressedDonation:true}; }
      }
      const importe = units * Number(p.precio || 0);
      const needHint = Number(p.necesidadTotal || p.necesidad || p.necesidadCalculada || 0);
      if(needHint > row.necesidad) row.necesidad = needHint;
      if(suppressedDonation || (p.tipo === 'DONACION' && units <= 0)){
        map.set(key, row);
        return;
      }
      if(p.tipo === 'DONACION'){
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
      const baseNeed = row.necesidad > 0 ? row.necesidad : (hasExplicitDonation ? Math.max(row.donado, row.compra) : row.donado + row.compra);
      const displayNeed = planDisplayNeedAfterRounding(row.producto, baseNeed);
      const nextCompra = (hasExplicitDonation && row.compra <= 0 && row.necesidad <= 0) ? 0 : planBuyAfterDonation(row.producto, displayNeed, row.donado);
      return {...row, necesidad: displayNeed, compra: nextCompra, include: row.include || nextCompra > 0 || row.donado > 0};
    });
    return sortPlanResourceRows(list);
  }
  function renderPlanResourceEditor(proposals){
    const rows = planResourceRows(proposals);
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
      .plan-product-card.plan-donation-card{background:#fbbf24!important;border-color:#d97706!important;color:#111827!important}.plan-product-card.plan-purchase-card{background:#fca5a5!important;border-color:#f87171!important;color:#111827!important}.plan-product-card.plan-donation-card strong,.plan-product-card.plan-donation-card span,.plan-product-card.plan-donation-card label,.plan-product-card.plan-donation-card .plan-reason{color:#111827!important}.plan-product-card.plan-purchase-card strong,.plan-product-card.plan-purchase-card span,.plan-product-card.plan-purchase-card label,.plan-product-card.plan-purchase-card .plan-reason{color:#111827!important}.plan-product-card.plan-donation-card input,.plan-product-card.plan-donation-card select,.plan-product-card.plan-purchase-card input,.plan-product-card.plan-purchase-card select{background:#fff!important;color:#111827!important}.plan-product-card.plan-donation-card .plan-confidence{background:rgba(255,255,255,.35)!important;color:#111827!important;border-color:rgba(17,24,39,.18)!important}.plan-product-card.plan-purchase-card .plan-confidence{background:rgba(255,255,255,.45)!important;color:#111827!important;border-color:rgba(17,24,39,.20)!important}
      .plan-resource-edit-table{border-collapse:separate!important;border-spacing:0 4px!important}.plan-resource-edit-row>td{border-top:2px solid rgba(17,24,39,.72)!important;border-bottom:2px solid rgba(17,24,39,.72)!important}.plan-resource-edit-row>td:first-child{border-left:2px solid rgba(17,24,39,.72)!important;border-radius:10px 0 0 10px}.plan-resource-edit-row>td:last-child{border-right:2px solid rgba(17,24,39,.72)!important;border-radius:0 10px 10px 0}.plan-resource-edit-row.plan-row-changed>td{border-color:#92400e!important}.plan-factory-indicator{display:flex!important;align-items:center!important;gap:12px!important;margin:10px 0 14px!important;padding:12px 14px!important;border-radius:18px!important;background:linear-gradient(135deg,#fff7ed,#fffbeb)!important;border:1px solid #fdba74!important;color:#7c2d12!important;box-shadow:0 10px 22px rgba(245,158,11,.15)!important}.plan-factory-indicator strong{display:block!important;font-size:15px!important}.plan-factory-indicator small{display:block!important;margin-top:2px!important;color:#9a3412!important;font-weight:700!important}.plan-factory-icon{font-size:28px!important;animation:cePlanPartyBounce 1.2s ease-in-out infinite}.plan-factory-dots{display:inline-flex!important;gap:6px!important;margin-left:auto!important;align-self:center!important}.plan-factory-dots i{display:block!important;width:9px!important;height:9px!important;border-radius:999px!important;background:#f59e0b!important;animation:cePlanPartyPulse 1s ease-in-out infinite}.plan-factory-dots i:nth-child(2){animation-delay:.18s}.plan-factory-dots i:nth-child(3){animation-delay:.36s}@keyframes cePlanPartyBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes cePlanPartyPulse{0%,100%{transform:scale(.7);opacity:.45}50%{transform:scale(1);opacity:1}}
      .plan-resource-purchase-subrow input[data-plan-resource-field="compra"]{font-size:15px!important;font-weight:850!important}.plan-advanced-toolbar{display:flex!important;gap:8px!important;flex-wrap:wrap!important;align-items:center!important;margin:10px 0!important;padding:8px!important;border-radius:14px!important;background:#f8fafc!important;border:1px solid #e2e8f0!important}.plan-advanced-toolbar input{min-width:220px!important;flex:1 1 260px!important;padding:8px 10px!important;border-radius:12px!important;border:1px solid #cbd5e1!important}.plan-advanced-toolbar button{white-space:nowrap!important}
      .plan-resource-edit-row.plan-sd-rara>td{background:#f8fafc!important;color:#111827!important}.plan-resource-edit-row.plan-sd-rara input,.plan-resource-edit-row.plan-sd-rara select{color:#111827!important}/*ce-hf18-no-black*/@media (max-width: 900px){.plan-resource-split-table{table-layout:auto!important}.plan-resource-split-table th:first-child,.plan-resource-split-table td:first-child,.plan-resource-split-table th:last-child,.plan-resource-split-table td:last-child{width:auto!important}.plan-resource-subrow{grid-template-columns:1fr 1fr!important}.plan-resource-general-top{grid-template-columns:auto 1fr!important}.plan-resource-split-table thead{display:none!important}.plan-resource-split-table tr,.plan-resource-split-table td{display:block!important;width:100%!important;border-radius:10px!important}}
      .plan-budget-warning{background:#fff7ed!important;border:1px solid #fdba74!important;color:#7c2d12!important}
      .plan-resource-edit-row.plan-sd-comida-aperitivo>td{background:#f5ead8!important}.plan-resource-edit-row.plan-sd-comida-comida>td{background:#e7d1b4!important}.plan-resource-edit-row.plan-sd-comida-cena>td{background:#c99a68!important}
      .plan-resource-edit-row.plan-sd-bebida-aperitivo>td{background:#ffedd5!important}.plan-resource-edit-row.plan-sd-bebida-comida>td{background:#fed7aa!important}.plan-resource-edit-row.plan-sd-bebida-cena>td{background:#fdba74!important}.plan-resource-edit-row.plan-sd-bebida-cubatas>td{background:#fecaca!important}
      .plan-resource-edit-row.plan-sd-infra-aperitivo>td{background:#dbeafe!important}.plan-resource-edit-row.plan-sd-infra-comida>td{background:#bfdbfe!important}.plan-resource-edit-row.plan-sd-infra-cubatas>td{background:#93c5fd!important}.plan-resource-edit-row.plan-sd-infra-cena>td{background:#60a5fa!important}.plan-resource-edit-row.plan-sd-infra-infra>td{background:#86efac!important}
      .plan-resource-edit-row.plan-sd-rara>td{background:#f8fafc!important;color:#111827!important}.plan-resource-edit-row.plan-sd-rara input,.plan-resource-edit-row.plan-sd-rara select{color:#111827!important}.plan-resource-edit-row.plan-sd-rara small,.plan-resource-edit-row.plan-sd-rara strong{color:inherit!important}
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
    let out = [...selected.values()].sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
    const totalPersonas = arr => arr.reduce((sum,p) => sum + Number(p.numeroIngreso || 1), 0);
    // En la operativa real de la peña, los socios se controlan por parejas/grupos
    // y unos pocos solteros. Si aparecen demasiados individuales por estar también
    // dados de alta como persona suelta, se conserva parejas/grupos y los solteros
    // conocidos, evitando que se duplique la asistencia inicial.
    if(totalPersonas(out) > 33){
      const solterosPreferentes = ['JAVIER','VICENTE','JOSE MANUEL','MIGUEL ANGEL','ERNESTO'];
      out = out.filter(p => Number(p.numeroIngreso || 1) >= 2 || solterosPreferentes.some(name => normalizeText(p.nombre || '') === name || normalizeText(p.nombre || '').startsWith(name + ' ')));
    }
    return out.sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
  }

  function buildMandatorySocioIncomeProposal(totalCompras){
    const estimatedPeople = Math.max(1, Number(fieldValue('planPersonas') || 0));
    const price = planEstimatedEventPrice(totalCompras || 0, estimatedPeople);
    const selected = sociosParaIngresosIniciales();
    return selected.map((p, index) => {
      const numero = Math.max(1, Number(p.numeroIngreso || p.numero || 1));
      return {
        key: `socio-obligatorio:${p.id || index}`,
        sourceId: '',
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
        precio: Number(prod?.defaultPrecio ?? prod?.precio ?? 0) || 0,
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
        // Si había otra compra idéntica residual para el mismo producto y cantidad, se desactiva.
        matches.forEach(x => {
          if(x.idx !== target.idx && x.row.tipo === 'COMPRA' && Math.abs(Number(x.row.unidades || 0) - Number(hint.unidades || 0)) < 0.001){
            base[x.idx].include = false;
            base[x.idx].__ceSuppressedDonation = true;
          }
        });
      }
    });
    hints.forEach((hint, hidx) => {
      if(usedHint.has(hidx)) return;
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
  function renderProposal(){
    const box = document.getElementById('planificacionResultado');
    if(!box) return;
    const wasOpen = !!box.querySelector('.plan-advanced-lines')?.open;
    const prevAdvancedSearch = box.querySelector('#planBuscarDetalleAvanzado')?.value || '';
    const prevResourceSearch = box.querySelector('#planBuscarRecurso')?.value || '';
    lastProposal = normalizeProposalRowsForGroups(forcePromptDonationsHf22(lastProposal));
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
        <div class="plan-metric"><span>Ingresos del modelo</span><strong>${qty(ingresosInfo.sociosPersonas)} SOCIOS · ${qty(ingresosInfo.noSociosPersonas)} NO SOCIOS</strong><small>${ingresosInfo.registros} registros · ${qty(ingresosInfo.totalPersonas)} personas</small></div>
      </div>
      ${renderPlanningNarrative(proposals, totalCompras, totalDonaciones)}
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
          <div class="field"><label>Tienda</label><select data-plan-field="tiendaId">${tiendasOpts || '<option value="">Sin tiendas</option>'}</select></div>
          <div class="field"><label>Responsable</label><select data-plan-field="responsableId">${sociosOpts || '<option value="">Sin socios</option>'}</select></div>
          ${p.tipo === 'DONACION' ? `<div class="field"><label>Donante</label><select data-plan-field="donorRef"><option value="" ${!p.donorRef?'selected':''}>-- sin donante --</option>${donorOpts}</select></div>` : ''}
        </div>
        <div class="plan-reason">${esc(p.reason)}${p.tipo === 'DONACION' ? ` Donante: ${esc(donorLabel(p.donorRef))}.` : ''}</div>
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
    const detailCards = includedPlanDetailItems();
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
      precio: Math.max(0, Number(price || base.precio || 0)),
      tiendaId: tiendaId || document.getElementById('planTienda')?.value || '',
      responsableId: responsableId || document.getElementById('planResponsable')?.value || '',
      ticketDonacion:'',
      donorRef:'',
      reason:'Compra creada desde la visión global de planificación.'
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
    const price = Math.max(0, Number(priceInput?.value || group.precioCompra || group.precioDonado || 0));
    const tiendaId = tr.querySelector('[data-plan-resource-field="tiendaId"]')?.value || group.tiendaId || document.getElementById('planTienda')?.value || '';
    const responsableId = tr.querySelector('[data-plan-resource-field="responsableId"]')?.value || group.responsableId || document.getElementById('planResponsable')?.value || '';
    const selectedProductId = tr.querySelector('[data-plan-resource-field="productId"]')?.value || '';
    const selectedProduct = selectedProductId ? byId('productos', selectedProductId) : null;

    if(changedField === 'necesidad'){
      buy = planBuyAfterDonation(selectedProduct?.nombre || group.producto, need, Number(group.donado || 0));
      if(buyInput) buyInput.value = String(buy);
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
    group.allIndices.forEach(idx => {
      if(lastProposal[idx]){
        lastProposal[idx].include = include;
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
        row.precio = Math.max(0, Number(donationPriceInput.value || 0));
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
      buy = planBuyAfterDonation(newName, need || group.necesidad || 0, editedDonatedTotal || Number(group.donado || 0));
      buyInput.value = String(buy);
    }
    let pidx = group.purchaseIndices[0];
    if((pidx === undefined || pidx < 0) && buy > 0) pidx = createPurchaseForGroup(group, buy, price, tiendaId, responsableId);
    const purchase = pidx !== undefined ? lastProposal[pidx] : null;
    if(purchase){
      purchase.include = include && buy > 0;
      purchase.unidades = buy;
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
      purchase.manualResponsible = changedField === 'responsableId' || purchase.manualResponsible;
    }
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
    const box = document.getElementById('planificacionResultado');
    if(!box) return;
    let card = document.getElementById('planFactoryIndicator');
    if(!card){
      card = document.createElement('div');
      card.id = 'planFactoryIndicator';
      card.className = 'plan-factory-indicator';
      box.prepend(card);
    }
    card.innerHTML = `<span class="plan-factory-icon" aria-hidden="true">🎉</span><div><strong>Zuzu está fabricando la fiesta…</strong><small>${esc(message || 'Creando el evento real y guardando compras, donaciones e ingresos.')}</small></div><span class="plan-factory-dots" aria-hidden="true"><i></i><i></i><i></i></span>`;
  }
  function hidePlanFactoryIndicator(){
    try{ document.getElementById('planFactoryIndicator')?.remove(); }catch(_){ }
  }

  function bindProposalControls(){
    const box = document.getElementById('planificacionResultado');
    if(!box) return;
    bindAdvancedProposalControls(box);
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
    const raw = fieldValue('planEventoTitulo');
    if(raw) return raw;
    const base = lastSourceEvent?.titulo || sourceEvent()?.titulo || 'Evento replicado';
    return 'Copia de ' + base;
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
          necesidadTotal: need || undefined
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
          necesidadTotal: need || undefined
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
      const newEventId = makeId();
      const fechaIni = fieldValue('planFechaIni') || source?.fechaIni || '';
      const fechaFin = fieldValue('planFechaFin') || fieldValue('planFechaIni') || source?.fechaFin || source?.fechaIni || '';
      const descUser = fieldValue('planDescripcion');
      const infoUser = fieldValue('planInfo');
      const descripcion = [
        descUser || source?.descripcion || '',
        (source ? 'Propuesta inicial creada desde evento modelo: ' + (source.titulo || 'sin título') + '.' : 'Propuesta inicial creada por Zuzu sin evento modelo.'),
        infoUser ? 'Información de planificación: ' + infoUser : ''
      ].filter(Boolean).join('\n');
      const included = lastProposal.filter(p => p.include && Number(p.unidades || 0) > 0);
      const totalCompras = included.filter(p => p.tipo === 'COMPRA').reduce((sum,p)=>sum + Number(p.unidades || 0) * Number(p.precio || 0), 0);
      const eventPrice = planContent() === 'INGRESOS_SOCIOS_OBLIGATORIOS' ? planEstimatedEventPrice(totalCompras, Number(fieldValue('planPersonas') || 1)) : parseNum(source?.precio || planEstimatedEventPrice(totalCompras, Number(fieldValue('planPersonas') || 1)) || 0);
      const newEvent = { id:newEventId, titulo:title, precio:eventPrice, fechaIni, fechaFin, situacion:'En curso', descripcion };

      await crudUpsert('eventos', newEvent);
      const savedCollabs = [];
      for(const item of lastIncomeProposal){
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
      try{ if(typeof window.renderMapaProductos === 'function') window.renderMapaProductos(); }catch(_){ }
    }catch(error){
      console.error('[ControlEvent v15_prod] Error generando evento real desde planificación:', error);
      try{ alert('No se pudo generar el evento real: ' + (error?.message || error)); }catch(_){ }
    }finally{
      if(btn){ btn.disabled = false; btn.textContent = oldText; }
      hidePlanFactoryIndicator();
      unlockPlanControls();
    }
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
      lastProposal = forcePromptDonationsHf22(Array.isArray(data.rows) ? data.rows : []);
      lastIncomeProposal = Array.isArray(data.incomes) ? data.incomes : [];
      if(planContent() === 'INGRESOS_SOCIOS_OBLIGATORIOS'){
        const baseCompra = lastProposal.filter(p => p.include && p.tipo === 'COMPRA').reduce((sum,p)=>sum + Number(p.unidades || 0) * Number(p.precio || 0), 0);
        lastIncomeProposal = buildMandatorySocioIncomeProposal(baseCompra);
      }
      renderProposal();
      const note = data.notes && data.notes.length ? '<div class="planificacion-note compact-note"><strong>Notas de Zuzu:</strong> '+data.notes.map(esc).join(' · ')+'</div>' : '';
      if(note){ document.getElementById('planificacionResultado')?.insertAdjacentHTML('afterbegin', note); }
      document.getElementById('planificacionResultado')?.scrollIntoView({behavior:'smooth', block:'start'});
    }catch(error){
      console.warn('[ControlEvent v15_prod] Propuesta Zuzu no disponible; se intenta réplica local.', error);
      if(mode === 'REPLICA' || mode === 'ZUZU_PARCIAL'){
        try{
          const replica = buildReplicaProposal();
          lastSourceEvent = replica.event;
          lastProposal = forcePromptDonationsHf22(replica.rows);
          lastIncomeProposal = replica.incomes || [];
          if(planContent() === 'INGRESOS_SOCIOS_OBLIGATORIOS'){
            const baseCompra = lastProposal.filter(p => p.include && p.tipo === 'COMPRA').reduce((sum,p)=>sum + Number(p.unidades || 0) * Number(p.precio || 0), 0);
            lastIncomeProposal = buildMandatorySocioIncomeProposal(baseCompra);
          }
          renderProposal();
          document.getElementById('planificacionResultado')?.insertAdjacentHTML('afterbegin', '<div class="planificacion-note compact-note warning"><strong>Aviso:</strong> Zuzu no pudo consultar el backend/Gemini. Se muestra réplica local del evento modelo.</div>');
          document.getElementById('planificacionResultado')?.scrollIntoView({behavior:'smooth', block:'start'});
        }catch(_){ try{ alert(error?.message || error); }catch(__){} }
      }else{
        if(box){ box.classList.remove('hidden'); box.innerHTML = '<div class="planificacion-note compact-note warning"><strong>No se pudo generar la propuesta:</strong> '+esc(error?.message || error)+'</div>'; }
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
    try{ initForm(); }catch(error){ console.warn('[ControlEvent v15_prod] No se pudo inicializar el formulario de planificación.', error); }
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

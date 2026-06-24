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
  function roundPurchaseUnits(productName, units){
    const u = Math.max(0, Number(units || 0));
    if(!u) return 0;
    if(isPackRoundedProduct(productName)) return Math.ceil(u / 24) * 24;
    return Math.ceil(u * 100) / 100;
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
  function planProductOptions(selected){
    const current = String(selected || '');
    const opts = rows('productos').slice().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es')).map(p => `<option value="${esc(p.id)}" ${String(p.id)===current?'selected':''}>${esc(p.nombre || 'Producto')}</option>`).join('');
    return `<option value="" ${!current?'selected':''}>-- producto sin catálogo --</option>${opts}`;
  }
  function sortPlanResourceRows(list){
    const mode = String(planResourceOrderMode || 'PRODUCTO').toUpperCase();
    const arrRows = Array.isArray(list) ? list.slice() : [];
    if(mode === 'SEGMENTO_DESTINO'){
      return arrRows.sort((a,b)=>String(a.segmento||'').localeCompare(String(b.segmento||''),'es') || String(a.destino||'').localeCompare(String(b.destino||''),'es') || String(a.producto||'').localeCompare(String(b.producto||''),'es'));
    }
    return arrRows.sort((a,b)=>String(a.producto||'').localeCompare(String(b.producto||''),'es') || String(a.segmento||'').localeCompare(String(b.segmento||''),'es') || String(a.destino||'').localeCompare(String(b.destino||''),'es'));
  }
  function sortPlanProposalDetailCards(list){
    const arrRows = Array.isArray(list) ? list.slice() : [];
    const mode = String(planResourceOrderMode || 'PRODUCTO').toUpperCase();
    return arrRows.sort((a,b) => {
      const pa = a?.p || {}, pb = b?.p || {};
      if(mode === 'SEGMENTO_DESTINO'){
        return String(pa.segmento||'').localeCompare(String(pb.segmento||''),'es') || String(pa.destino||'').localeCompare(String(pb.destino||''),'es') || String(pa.productName||'').localeCompare(String(pb.productName||''),'es') || String(pa.tipo||'').localeCompare(String(pb.tipo||''),'es');
      }
      return String(pa.productName||'').localeCompare(String(pb.productName||''),'es') || String(pa.segmento||'').localeCompare(String(pb.segmento||''),'es') || String(pa.destino||'').localeCompare(String(pb.destino||''),'es') || String(pa.tipo||'').localeCompare(String(pb.tipo||''),'es');
    });
  }
  function planDeficitUnits(productName, deficit){
    const d = Math.max(0, Number(deficit || 0));
    if(!d) return 0;
    const n = normalizeText(productName || '');
    // Productos por peso/litro pueden mantener dos decimales; el resto se compra por unidades enteras.
    if(/\b(KG|KILO|KILOS|LITRO|LITROS|GR|GRAMO|GRAMOS)\b/.test(n) && !/\b(BOTE|BOTES|LATA|LATAS|BOTELLA|BOTELLAS|SACO|SACOS|GARRAFA|GARRAFAS)\b/.test(n)){
      return Math.ceil(d * 100) / 100;
    }
    return Math.ceil(d);
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
  function planResourceRows(proposals){
    const map = new Map();
    (Array.isArray(proposals) ? proposals : []).forEach((p, idx) => {
      const key = planGroupKey(p.productName || p.productId || `producto-${idx}`);
      const row = map.get(key) || {
        key, producto: p.productName || 'Producto', productId:p.productId || '', segmento: p.segmento || '', destino: p.destino || '', necesidad:0,
        compra:0, donado:0, importeCompra:0, importeDonado:0, precioCompra:0, precioDonado:0,
        donantes:new Map(), compras:new Map(), purchaseIndices:[], donationIndices:[], allIndices:[], include:false,
        tiendaId:'', responsableId:'', donorRef:'', donationResponsableId:'', donationTicket:'', donationDetails:[], purchaseDetails:[]
      };
      // Si Zuzu o el catálogo traen el mismo artículo con nombres ligeramente distintos
      // (RON Barcelo / Ron BARCELÓ Añejo 0.7 L, WISKI JB / Whisky 5 Años J.B...),
      // se agrupa en una sola ficha y se conserva el nombre/código de catálogo más completo.
      const incomingName = String(p.productName || '').trim();
      if(incomingName && normalizeText(incomingName).length > normalizeText(row.producto).length){
        row.producto = incomingName;
        row.segmento = p.segmento || row.segmento;
        row.destino = p.destino || row.destino;
      }
      if(p.productId && (!row.productId || p.tipo === 'COMPRA')) row.productId = p.productId;
      row.allIndices.push(idx);
      if(p.include) row.include = true;
      const units = Number(p.unidades || 0);
      const importe = units * Number(p.precio || 0);
      const needHint = Number(p.necesidadTotal || p.necesidad || p.necesidadCalculada || 0);
      if(needHint > row.necesidad) row.necesidad = needHint;
      if(p.tipo === 'DONACION'){
        row.donado += units;
        row.importeDonado += importe;
        row.precioDonado = row.precioDonado || Number(p.precio || 0);
        row.donationIndices.push(idx);
        row.donorRef = row.donorRef || p.donorRef || '';
        row.donationResponsableId = row.donationResponsableId || p.responsableId || '';
        row.donationTicket = row.donationTicket || p.ticketDonacion || 'DONADO';
        const label = `${p.ticketDonacion || 'DONADO'} · ${donorLabel(p.donorRef)} · Resp. ${personaName(p.responsableId)}`;
        row.donantes.set(label, (row.donantes.get(label) || 0) + units);
        row.donationDetails.push({
          idx,
          unidades:units,
          precio:Number(p.precio || 0),
          importe,
          ticketDonacion:p.ticketDonacion || 'DONADO',
          donorRef:p.donorRef || '',
          responsableId:p.responsableId || '',
          donorLabel:donorLabel(p.donorRef),
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
      if(!row.productId && p.productId) row.productId = p.productId;
      map.set(key, row);
    });
    const list = [...map.values()].map(row => {
      const baseNeed = row.necesidad > 0 ? row.necesidad : row.donado + row.compra;
      const roundedDeficit = planDeficitUnits(row.producto, Math.max(0, baseNeed - row.donado));
      const nextCompra = roundedDeficit;
      return {...row, necesidad: baseNeed, compra: nextCompra, include: row.include || nextCompra > 0 || row.donado > 0};
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
        <span class="plan-resource-mini"><b>Unidades</b><strong>${qty(d.unidades)}</strong></span>
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
        <label>Tienda<select data-plan-resource-field="tiendaId">${tiendaOpts(r.tiendaId) || '<option value="">Sin tiendas</option>'}</select></label>
        <label>Responsable<select data-plan-resource-field="responsableId">${respOpts(r.responsableId) || '<option value="">Sin socios</option>'}</select></label>
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
          <strong class="plan-resource-product-label">${esc(r.producto)}</strong>
          <select class="plan-resource-product-select" data-plan-resource-field="productId">${planProductOptions(r.productId)}</select>
          <small class="plan-resource-meta"><b>SEGMENTO - DESTINO</b></small>
          <em class="plan-resource-excluded-label">${esc(badgeText)}</em>
        </td>
        <td class="plan-resource-flow">${donations}${purchase}${empty}</td>
      </tr>`;
    }).join('');
    return `<div class="plan-resource-editor-card">
      <div class="section-title tiny-title plan-resource-title"><div><h3>Propuesta editable tipo Mapa de recursos</h3><p>Revisa producto a producto: a la izquierda la necesidad y el producto; a la derecha, las donaciones exactas y la compra del déficit. Las unidades donadas son informativas y no se recalculan solas.</p></div><div class="plan-resource-order-actions"><button type="button" class="outline" id="btnPlanOrdenProducto">Orden producto</button><button type="button" class="outline" id="btnPlanOrdenSegmentoDestino">Orden segmento/destino</button></div></div>
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
      .plan-resource-product-select{margin-top:6px!important;width:100%!important;min-width:120px!important;max-width:100%!important}
      .plan-resource-excluded-label{display:inline-block;margin-top:5px;padding:3px 7px;border-radius:999px;background:#f3f4f6;color:#6b7280;font-style:normal;font-weight:800;font-size:11px}
      .plan-donation-line{display:block;line-height:1.25}.plan-muted{color:#64748b;font-weight:700}
      .plan-resource-title{gap:12px!important;align-items:flex-start!important}.plan-resource-order-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.plan-resource-order-actions button{white-space:nowrap}
      .plan-resource-split-table{table-layout:fixed!important;width:100%!important}.plan-resource-split-table th:first-child,.plan-resource-split-table td:first-child{width:34%!important}.plan-resource-split-table th:last-child,.plan-resource-split-table td:last-child{width:66%!important}
      .plan-resource-general{vertical-align:top!important;padding:10px!important}.plan-resource-general-top{display:grid!important;grid-template-columns:auto minmax(88px,120px)!important;gap:10px!important;align-items:center!important;margin-bottom:8px!important}.plan-include-icon{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:42px!important;height:42px!important;border-radius:14px!important;background:rgba(255,255,255,.84)!important;border:2px solid rgba(17,24,39,.25)!important}.plan-include-icon input{width:22px!important;height:22px!important}.plan-include-icon span{display:none!important}.plan-need-large{display:grid!important;gap:3px!important;font-size:11px!important;font-weight:950!important;text-transform:uppercase!important;color:#111827!important}.plan-need-large input{font-size:20px!important;font-weight:950!important;text-align:center!important;padding:7px 8px!important;border-radius:12px!important;max-width:120px!important}.plan-resource-product-label{display:block!important;font-size:16px!important;line-height:1.2!important;margin:7px 0 4px!important}.plan-resource-meta{display:grid!important;gap:2px!important;margin-top:6px!important;color:#334155!important}.plan-resource-meta b{font-size:10px!important;letter-spacing:.06em!important}.plan-resource-meta span{font-size:12px!important;font-weight:850!important}
      .plan-resource-flow{vertical-align:top!important;padding:8px!important}.plan-resource-subrow{display:grid!important;grid-template-columns:66px 78px 92px minmax(112px,140px) minmax(168px,1.4fr) minmax(168px,1.4fr)!important;gap:7px!important;align-items:end!important;margin:4px 0!important;padding:8px!important;border-radius:14px!important;border:1px solid rgba(17,24,39,.14)!important;background:rgba(255,255,255,.8)!important}.plan-resource-subrow label{display:grid!important;gap:3px!important;font-size:10px!important;font-weight:950!important;text-transform:uppercase!important;color:#334155!important}.plan-resource-subrow input,.plan-resource-subrow select{width:100%!important;min-width:0!important;padding:7px 8px!important;border-radius:10px!important}.plan-resource-mini{display:grid!important;gap:3px!important;font-size:10px!important;text-transform:uppercase!important;font-weight:950!important;color:#334155!important}.plan-resource-mini strong{font-size:13px!important;color:#111827!important}.plan-resource-donation-subrow{background:#fbbf24!important;border-color:#d97706!important;color:#111827!important}.plan-resource-purchase-subrow{background:#fca5a5!important;border-color:#f87171!important;color:#111827!important;grid-template-columns:90px 80px 100px minmax(180px,1.3fr) minmax(180px,1.3fr)!important}.plan-resource-donation-badge{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:35px!important;padding:5px 8px!important;border-radius:999px!important;background:#d97706!important;color:#fff!important;font-size:11px!important;font-weight:950!important;text-align:center!important}.plan-resource-empty-flow{font-weight:900;color:#64748b;padding:12px;border:1px dashed #cbd5e1;border-radius:12px;background:rgba(255,255,255,.65)}
      .plan-product-card.plan-donation-card{background:#fbbf24!important;border-color:#d97706!important;color:#111827!important}.plan-product-card.plan-purchase-card{background:#fca5a5!important;border-color:#f87171!important;color:#111827!important}.plan-product-card.plan-donation-card strong,.plan-product-card.plan-donation-card span,.plan-product-card.plan-donation-card label,.plan-product-card.plan-donation-card .plan-reason{color:#111827!important}.plan-product-card.plan-purchase-card strong,.plan-product-card.plan-purchase-card span,.plan-product-card.plan-purchase-card label,.plan-product-card.plan-purchase-card .plan-reason{color:#111827!important}.plan-product-card.plan-donation-card input,.plan-product-card.plan-donation-card select,.plan-product-card.plan-purchase-card input,.plan-product-card.plan-purchase-card select{background:#fff!important;color:#111827!important}.plan-product-card.plan-donation-card .plan-confidence{background:rgba(255,255,255,.35)!important;color:#111827!important;border-color:rgba(17,24,39,.18)!important}.plan-product-card.plan-purchase-card .plan-confidence{background:rgba(255,255,255,.45)!important;color:#111827!important;border-color:rgba(17,24,39,.20)!important}
      .plan-resource-edit-table{border-collapse:separate!important;border-spacing:0 4px!important}.plan-resource-edit-row>td{border-top:2px solid rgba(17,24,39,.72)!important;border-bottom:2px solid rgba(17,24,39,.72)!important}.plan-resource-edit-row>td:first-child{border-left:2px solid rgba(17,24,39,.72)!important;border-radius:10px 0 0 10px}.plan-resource-edit-row>td:last-child{border-right:2px solid rgba(17,24,39,.72)!important;border-radius:0 10px 10px 0}.plan-resource-edit-row.plan-row-changed>td{border-color:#92400e!important}.plan-factory-indicator{display:flex!important;align-items:center!important;gap:12px!important;margin:10px 0 14px!important;padding:12px 14px!important;border-radius:18px!important;background:linear-gradient(135deg,#fff7ed,#fffbeb)!important;border:1px solid #fdba74!important;color:#7c2d12!important;box-shadow:0 10px 22px rgba(245,158,11,.15)!important}.plan-factory-indicator strong{display:block!important;font-size:15px!important}.plan-factory-indicator small{display:block!important;margin-top:2px!important;color:#9a3412!important;font-weight:700!important}.plan-factory-icon{font-size:28px!important;animation:cePlanPartyBounce 1.2s ease-in-out infinite}.plan-factory-dots{display:inline-flex!important;gap:6px!important;margin-left:auto!important;align-self:center!important}.plan-factory-dots i{display:block!important;width:9px!important;height:9px!important;border-radius:999px!important;background:#f59e0b!important;animation:cePlanPartyPulse 1s ease-in-out infinite}.plan-factory-dots i:nth-child(2){animation-delay:.18s}.plan-factory-dots i:nth-child(3){animation-delay:.36s}@keyframes cePlanPartyBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes cePlanPartyPulse{0%,100%{transform:scale(.7);opacity:.45}50%{transform:scale(1);opacity:1}}
      @media (max-width: 900px){.plan-resource-split-table{table-layout:auto!important}.plan-resource-split-table th:first-child,.plan-resource-split-table td:first-child,.plan-resource-split-table th:last-child,.plan-resource-split-table td:last-child{width:auto!important}.plan-resource-subrow{grid-template-columns:1fr 1fr!important}.plan-resource-general-top{grid-template-columns:auto 1fr!important}.plan-resource-split-table thead{display:none!important}.plan-resource-split-table tr,.plan-resource-split-table td{display:block!important;width:100%!important;border-radius:10px!important}}
      .plan-budget-warning{background:#fff7ed!important;border:1px solid #fdba74!important;color:#7c2d12!important}
      .plan-resource-edit-row.plan-sd-comida-aperitivo>td{background:#f5ead8!important}.plan-resource-edit-row.plan-sd-comida-comida>td{background:#e7d1b4!important}.plan-resource-edit-row.plan-sd-comida-cena>td{background:#c99a68!important}
      .plan-resource-edit-row.plan-sd-bebida-aperitivo>td{background:#ffedd5!important}.plan-resource-edit-row.plan-sd-bebida-comida>td{background:#fed7aa!important}.plan-resource-edit-row.plan-sd-bebida-cena>td{background:#fdba74!important}.plan-resource-edit-row.plan-sd-bebida-cubatas>td{background:#fecaca!important}
      .plan-resource-edit-row.plan-sd-infra-aperitivo>td{background:#dbeafe!important}.plan-resource-edit-row.plan-sd-infra-comida>td{background:#bfdbfe!important}.plan-resource-edit-row.plan-sd-infra-cubatas>td{background:#93c5fd!important}.plan-resource-edit-row.plan-sd-infra-cena>td{background:#60a5fa!important}.plan-resource-edit-row.plan-sd-infra-infra>td{background:#86efac!important}
      .plan-resource-edit-row.plan-sd-rara>td{background:#111827!important;color:#fff!important}.plan-resource-edit-row.plan-sd-rara input,.plan-resource-edit-row.plan-sd-rara select{color:#111827!important}.plan-resource-edit-row.plan-sd-rara small,.plan-resource-edit-row.plan-sd-rara strong{color:inherit!important}
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
    const detailCards = sortPlanProposalDetailCards(proposals.map((p, index) => ({p, index})).filter(({p}) => p && p.include !== false && (p.tipo === 'DONACION' || (p.tipo === 'COMPRA' && Number(p.unidades || 0) > 0))));
    const cards = detailCards.length ? detailCards.map(({p, index}) => renderProposalRow(p, index)).join('') : '<div class="empty">No hay líneas de compras/donaciones incluidas en la propuesta generada.</div>';
    box.classList.remove('hidden');
    box.innerHTML = `
      <div class="plan-summary-grid">
        <div class="plan-metric"><span>Evento modelo</span><strong>${esc(source?.titulo || (planMode()==='ZUZU_TOTAL' ? 'No procede: encargo total a Zuzu' : 'Sin evento'))}</strong><small>${esc(source?.fechaIni || '')}${source?.fechaFin ? ' · ' + esc(source.fechaFin) : ''}</small></div>
        <div class="plan-metric"><span>Compras propuestas</span><strong>${compras.length}</strong><small>${money(totalCompras)} previstos</small></div>
        <div class="plan-metric"><span>Donaciones propuestas</span><strong>${donaciones.length}</strong><small>${money(totalDonaciones)} valor estimado</small></div>
        <div class="plan-metric"><span>Ingresos del modelo</span><strong>${qty(ingresosInfo.sociosPersonas)} SOCIOS · ${qty(ingresosInfo.noSociosPersonas)} NO SOCIOS</strong><small>${ingresosInfo.registros} registros · ${qty(ingresosInfo.totalPersonas)} personas</small></div>
      </div>
      ${renderPlanningNarrative(proposals, totalCompras, totalDonaciones)}
      <div class="plan-search-line">
        <input id="planBuscarProducto" type="search" placeholder="Buscar producto en Mapa de recursos y Detalle avanzado..." autocomplete="off" />
        <button type="button" class="outline" id="btnPlanBuscarProducto">Buscar</button>
      </div>
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
      <details class="plan-advanced-lines"><summary>Detalle avanzado de líneas que se crearán</summary><div class="plan-proposal-list" id="planProposalList">${cards}</div></details>
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
    const need = Math.max(0, Number(tr.querySelector('[data-plan-resource-field="necesidad"]')?.value || group.necesidad || 0));
    const buyInput = tr.querySelector('[data-plan-resource-field="compra"]');
    let buy = Math.max(0, Number(buyInput?.value || group.compra || 0));
    const priceInput = tr.querySelector('[data-plan-resource-field="precio"]');
    const price = Math.max(0, Number(priceInput?.value || group.precioCompra || group.precioDonado || 0));
    const tiendaId = tr.querySelector('[data-plan-resource-field="tiendaId"]')?.value || group.tiendaId || document.getElementById('planTienda')?.value || '';
    const responsableId = tr.querySelector('[data-plan-resource-field="responsableId"]')?.value || group.responsableId || document.getElementById('planResponsable')?.value || '';
    const selectedProductId = tr.querySelector('[data-plan-resource-field="productId"]')?.value || '';
    const selectedProduct = selectedProductId ? byId('productos', selectedProductId) : null;

    if(changedField === 'necesidad'){
      buy = planDeficitUnits(selectedProduct?.nombre || group.producto, Math.max(0, need - Number(group.donado || 0)));
      if(buyInput) buyInput.value = String(buy);
    }else if(changedField === 'compra'){
      buy = planDeficitUnits(selectedProduct?.nombre || group.producto, buy);
      if(buyInput) buyInput.value = String(buy);
    }
    if(changedField !== 'include' && (buy > 0 || Number(group.donado || 0) > 0)){
      include = true;
      const chk = tr.querySelector('[data-plan-resource-field="include"]');
      if(chk) chk.checked = true;
    }

    const newName = selectedProduct?.nombre || group.producto || 'Producto';
    const newSegment = selectedProduct?.segmento || group.segmento || 'Sin segmento';
    const newDestino = selectedProduct?.destino || group.destino || 'Sin destino';
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
    group.donationIndices.forEach(idx => {
      const row = lastProposal[idx];
      if(!row) return;
      const donorInput = tr.querySelector(`[data-plan-proposal-index="${String(idx)}"][data-plan-resource-field="donorRef"]`);
      const respInput = tr.querySelector(`[data-plan-proposal-index="${String(idx)}"][data-plan-resource-field="donationResponsableId"]`);
      const donationPriceInput = tr.querySelector(`[data-plan-proposal-index="${String(idx)}"][data-plan-resource-field="donationPrecio"]`);
      // Las unidades donadas no se tocan aquí: proceden del prompt/histórico y son invariables salvo edición manual directa en el detalle avanzado.
      if(donorInput) row.donorRef = donorInput.value;
      if(respInput) row.responsableId = respInput.value;
      if(donationPriceInput){
        row.precio = Math.max(0, Number(donationPriceInput.value || 0));
        const out = tr.querySelector(`[data-plan-donation-total="${String(idx)}"]`);
        if(out) out.textContent = money(Number(row.unidades || 0) * Number(row.precio || 0));
      }
      if(selectedProductId){
        row.productId = selectedProductId;
        row.productName = newName;
        row.segmento = newSegment;
        row.destino = newDestino;
        row.manualProduct = true;
      }
    });
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
      renderProposal();
      return;
    }
    tr.classList.toggle('excluded', !(include && (buy > 0 || Number(group.donado || 0) > 0)));
    tr.dataset.planProductName = normalizeText(newName);
    tr.dataset.planResourceKey = planGroupKey(newName);
    const label = tr.querySelector('.plan-resource-product-label');
    if(label) label.textContent = newName;
    const meta = tr.querySelector('.plan-resource-meta span');
    if(meta) meta.textContent = `${newSegment} - ${newDestino}`;
    const badge = tr.querySelector('.plan-resource-excluded-label');
    if(badge) badge.textContent = planResourceBadgeText({segmento:newSegment, destino:newDestino, necesidad:need, compra:buy});
    tr.classList.remove('plan-sd-comida-aperitivo','plan-sd-comida-comida','plan-sd-comida-cena','plan-sd-bebida-aperitivo','plan-sd-bebida-comida','plan-sd-bebida-cena','plan-sd-bebida-cubatas','plan-sd-infra-aperitivo','plan-sd-infra-comida','plan-sd-infra-cubatas','plan-sd-infra-cena','plan-sd-infra-infra','plan-sd-rara');
    const sdClass = planSegDestClass({segmento:newSegment,destino:newDestino});
    if(sdClass) tr.classList.add(sdClass);
    markPlanRowChanged(tr);
  }



  function searchProposalProduct(){
    const input = document.getElementById('planBuscarProducto');
    const term = normalizeText(input?.value || '');
    if(!term){ input?.focus(); return; }
    const cards = Array.from(document.querySelectorAll('.plan-product-card, .plan-resource-edit-row'));
    const found = cards.find(card => String(card.dataset.planProductName || card.querySelector('strong')?.textContent || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().includes(term));
    document.querySelectorAll('.plan-product-card.plan-found, .plan-resource-edit-row.plan-found').forEach(el => el.classList.remove('plan-found'));
    if(found){
      found.classList.add('plan-found');
      found.scrollIntoView({behavior:'smooth', block:'center'});
      setTimeout(() => found.classList.remove('plan-found'), 2600);
    }else{
      try{ alert('No se ha encontrado ningún producto que contenga: ' + (input?.value || '')); }catch(_){ }
    }
    if(input) input.value = '';
  }
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
    box.querySelectorAll('[data-plan-index]').forEach(card => {
      const idx = Number(card.dataset.planIndex);
      card.querySelectorAll('[data-plan-field]').forEach(input => {
        input.addEventListener('change', () => updateProposalFromCard(idx, card));
        input.addEventListener('input', () => {
          if(input.dataset.planField === 'unidades' || input.dataset.planField === 'precio') updateProposalFromCard(idx, card, true);
        });
      });
    });
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
    document.getElementById('btnPlanBuscarProducto')?.addEventListener('click', searchProposalProduct);
    document.getElementById('planBuscarProducto')?.addEventListener('keydown', event => { if(event.key === 'Enter'){ event.preventDefault(); searchProposalProduct(); } });
    document.getElementById('btnPlanOrdenProducto')?.addEventListener('click', () => { planResourceOrderMode = 'PRODUCTO'; renderProposal(); });
    document.getElementById('btnPlanOrdenSegmentoDestino')?.addEventListener('click', () => { planResourceOrderMode = 'SEGMENTO_DESTINO'; renderProposal(); });
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
      lastProposal = Array.isArray(data.rows) ? data.rows : [];
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
          lastProposal = replica.rows;
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

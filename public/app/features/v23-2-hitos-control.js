/* ControlEvent v23_prod_r2 · Control de Hitos y Líneas de Gestión */
(function(root){
  'use strict';
  if(root.ControlEventHitos) return;

  const VERSION = 'v23_prod_r2-hitos1';
  const $ = id => document.getElementById(id);
  const text = value => value == null ? '' : String(value).trim();
  const norm = value => {
    const s = text(value);
    return (s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s).toLowerCase().replace(/[^a-z0-9ñ]+/g, ' ').replace(/\s+/g, ' ').trim();
  };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const arr = value => Array.isArray(value) ? value : [];
  const app = () => root.ControlEventApp || root.ControlEventRuntime?.app || null;
  const state = () => app()?.state || root.state || {};
  const auth = () => app()?.authUser || root.authUser || root.__CONTROL_EVENT_USER__ || null;
  const eventId = () => text(state().selectedEventId || $('selectedEvent')?.value);
  const eventName = id => text(arr(state().eventos).find(row => text(row.id) === text(id))?.titulo || $('selectedEvent')?.selectedOptions?.[0]?.textContent || 'Evento');
  const canWrite = () => ['GD','RW'].includes(text(auth()?.nivel).toUpperCase());
  const excludedPerson = name => { const n = norm(name); return !n || /^grupo\b/.test(n) || /^pena\b/.test(n) || /^z\s*_?\s*dev/.test(n) || /^personas\b/.test(n); };
  const isPair = name => /\s+y\s+/i.test(text(name));
  const pairParts = name => text(name).split(/\s+y\s+/i).map(text).filter(Boolean);
  const today = () => { const d=new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; };
  const formatDate = value => { const s=text(value); if(!/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'Sin fecha'; const [y,m,d]=s.split('-'); return `${d}/${m}/${y}`; };

  const store = { eventId:'', hitos:[], lgs:[], loading:false, editing:null, lastError:'' };

  function canonicalIndividuals(){
    const people = arr(state().personas).filter(row => norm(row?.rango) === 'socio' && !excludedPerson(row?.nombre));
    const exact = new Map();
    people.filter(row => !isPair(row.nombre)).forEach(row => exact.set(norm(row.nombre), { id:text(row.id), nombre:text(row.nombre) }));
    const out = new Map();
    people.forEach(row => {
      const names = isPair(row.nombre) ? pairParts(row.nombre) : [text(row.nombre)];
      names.forEach(name => {
        const key = norm(name); if(!key || out.has(key)) return;
        const individual = exact.get(key);
        out.set(key, individual || { id:'', nombre:name });
      });
    });
    return [...out.values()].sort((a,b) => a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'}));
  }

  async function api(path, options = {}){
    const response = await fetch(path, {
      cache:'no-store',
      ...options,
      headers:{'Content-Type':'application/json','X-ControlEvent-Feature':'hitos-v23-r2', ...(options.headers || {})}
    });
    let payload = null;
    try{ payload = await response.json(); }catch(_){ payload = null; }
    if(!response.ok){
      const error = new Error(payload?.error || `Error ${response.status} en Control de Hitos`);
      error.status = response.status;
      error.code = payload?.code || '';
      throw error;
    }
    return payload || {};
  }

  function installDom(){
    if($('ceHitosOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'ceHitosOverlay';
    overlay.className = 'ce-hitos-overlay hidden';
    overlay.innerHTML = `
      <section class="ce-hitos-window" role="dialog" aria-modal="true" aria-labelledby="ceHitosTitle">
        <header class="ce-hitos-header">
          <img src="./hitos-evento.jpg" alt="Control de Hitos">
          <div class="ce-hitos-title-wrap"><h2 id="ceHitosTitle">Control de Hitos</h2><div id="ceHitosEvent" class="ce-hitos-event"></div></div>
          <button type="button" id="ceHitosClose" class="ce-hitos-close" title="Cerrar">×</button>
        </header>
        <div class="ce-hitos-toolbar">
          <button type="button" id="ceHitosAdd">＋ Nuevo Hito</button>
          <button type="button" id="ceHitosRefresh" class="outline">↻ Actualizar</button>
          <span class="ce-spacer"></span>
          <span id="ceHitosStatus" class="ce-hitos-status"></span>
          <span class="ce-hitos-toolbar-note">Fechas del Hito calculadas desde sus LG</span>
        </div>
        <main id="ceHitosBody" class="ce-hitos-body"></main>
        <div id="ceHitosFormOverlay" class="ce-hitos-form-overlay hidden"></div>
      </section>`;
    document.body.appendChild(overlay);
    $('ceHitosClose').addEventListener('click', closeWindow);
    $('ceHitosRefresh').addEventListener('click', () => load(true));
    $('ceHitosAdd').addEventListener('click', () => openHitoForm());
    overlay.addEventListener('click', event => { if(event.target === overlay) closeWindow(); });
    document.addEventListener('keydown', event => { if(event.key === 'Escape' && !overlay.classList.contains('hidden')){ if(!$('ceHitosFormOverlay').classList.contains('hidden')) closeForm(); else closeWindow(); } });
  }

  function setStatus(message, type=''){
    const node = $('ceHitosStatus'); if(!node) return;
    node.textContent = message || '';
    node.className = `ce-hitos-status${type ? ` ${type}` : ''}`;
  }

  async function openWindow(){
    installDom();
    const ev = eventId();
    if(!ev){ alert('Selecciona un evento antes de abrir el Control de Hitos.'); return; }
    store.eventId = ev;
    $('ceHitosEvent').textContent = eventName(ev);
    $('ceHitosOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    await load(false);
  }
  function closeWindow(){
    closeForm();
    $('ceHitosOverlay')?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  async function load(force){
    const ev = eventId();
    if(!ev){ renderError('Selecciona un evento.'); return; }
    store.eventId = ev;
    $('ceHitosEvent').textContent = eventName(ev);
    store.loading = true;
    setStatus('Cargando…');
    $('ceHitosBody').innerHTML = '<div class="ce-hitos-empty">Cargando Hitos y Líneas de Gestión…</div>';
    try{
      const data = await api(`/api/hitos?eventId=${encodeURIComponent(ev)}${force ? `&_=${Date.now()}` : ''}`);
      store.hitos = arr(data.hitos);
      store.lgs = arr(data.lgs);
      store.lastError = '';
      setStatus(`${store.hitos.length} hitos · ${store.lgs.length} LG`, 'ok');
      render();
    }catch(error){
      store.lastError = error.message || String(error);
      setStatus('No disponible', 'error');
      renderError(store.lastError);
    }finally{ store.loading = false; }
  }

  function renderError(message){ $('ceHitosBody').innerHTML = `<div class="ce-hitos-error">${esc(message)}</div>`; }
  function lgForHito(hitoId){ return store.lgs.filter(row => text(row.hitoId) === text(hitoId)).sort((a,b) => Number(a.orden||0)-Number(b.orden||0) || text(a.descripcion).localeCompare(text(b.descripcion),'es')); }
  function hitoById(id){ return store.hitos.find(row => text(row.id) === text(id)); }
  function lgById(id){ return store.lgs.find(row => text(row.id) === text(id)); }
  function hitoComplete(id){ const rows=lgForHito(id); return rows.length>0 && rows.every(row => row.cumplida); }
  function refLabel(ref){
    if(text(ref?.tipo).toUpperCase() === 'HITO') return `Hito: ${hitoById(ref.id)?.nombreHito || 'eliminado'}`;
    const row=lgById(ref?.id); return `LG: ${row?.descripcion || 'eliminada'}`;
  }
  function dependencySatisfied(ref){
    if(text(ref?.tipo).toUpperCase() === 'HITO') return hitoComplete(ref.id);
    return !!lgById(ref.id)?.cumplida;
  }
  function pendingDependencies(row){ return arr(row.dependenciasPrevias).filter(ref => !dependencySatisfied(ref)); }
  function outsideDateWindow(row){ const d=today(); return (row.fechaMinima && d < row.fechaMinima) || (row.fechaMaxima && d > row.fechaMaxima); }
  function lgClass(row){ if(row.cumplida) return 'ce-lg-done'; if(row.fechaMinima && today() < row.fechaMinima) return 'ce-lg-future'; return 'ce-lg-pending'; }
  function lgStateLabel(row){
    if(row.cumplida) return 'Cumplida';
    if(row.fechaMinima && today() < row.fechaMinima) return `Aún no corresponde · desde ${formatDate(row.fechaMinima)}`;
    if(row.fechaMaxima && today() > row.fechaMaxima) return 'Pendiente y fuera de plazo';
    return 'Pendiente';
  }

  function render(){
    const body=$('ceHitosBody');
    $('ceHitosAdd').disabled = !canWrite();
    if(!store.hitos.length){
      body.innerHTML = `<div class="ce-hitos-empty">Todavía no hay Hitos para este evento.${canWrite() ? '<br><br>Pulsa «Nuevo Hito» para crear el primero.' : ''}</div>`;
      return;
    }
    body.innerHTML = store.hitos.sort((a,b)=>Number(a.orden||0)-Number(b.orden||0)||text(a.nombreHito).localeCompare(text(b.nombreHito),'es')).map(hito => {
      const rows=lgForHito(hito.id), done=rows.filter(row=>row.cumplida).length, completed=rows.length>0&&done===rows.length;
      return `<article class="ce-hito-card" data-hito-id="${esc(hito.id)}">
        <div class="ce-hito-head">
          <div><div class="ce-hito-name">${esc(hito.nombreHito)}</div>${hito.descripcion ? `<div class="ce-hito-desc">${esc(hito.descripcion)}</div>` : ''}</div>
          <div class="ce-hito-meta">
            <span><strong>Plazo:</strong> ${esc(formatDate(hito.fechaMinima))} → ${esc(formatDate(hito.fechaMaxima))}</span>
            <span><strong>Responsable general:</strong> ${esc(hito.responsableNombre || 'Sin asignar')}</span>
            <span class="ce-hito-progress ${completed?'done':''}">${done}/${rows.length} LG cumplidas</span>
          </div>
          <div class="ce-hito-actions">
            <button type="button" class="outline ce-add-lg" ${canWrite()?'':'disabled'}>＋ LG</button>
            <button type="button" class="outline ce-edit-hito" ${canWrite()?'':'disabled'}>Editar</button>
            <button type="button" class="danger ce-delete-hito" ${canWrite()?'':'disabled'}>Eliminar</button>
          </div>
        </div>
        <div class="ce-lg-list">${rows.length ? rows.map(renderLg).join('') : '<div class="ce-hitos-empty">Este Hito todavía no tiene Líneas de Gestión.</div>'}</div>
      </article>`;
    }).join('');

    body.querySelectorAll('.ce-hito-card').forEach(card => {
      const id=card.dataset.hitoId;
      card.querySelector('.ce-add-lg')?.addEventListener('click',()=>openLgForm(null,id));
      card.querySelector('.ce-edit-hito')?.addEventListener('click',()=>openHitoForm(hitoById(id)));
      card.querySelector('.ce-delete-hito')?.addEventListener('click',()=>removeHito(id));
    });
    body.querySelectorAll('.ce-lg-row').forEach(rowNode => {
      const id=rowNode.dataset.lgId;
      rowNode.querySelector('.ce-lg-check')?.addEventListener('change', event => toggleCompleted(id,event.target.checked,event.target));
      rowNode.querySelector('.ce-edit-lg')?.addEventListener('click',()=>openLgForm(lgById(id),lgById(id)?.hitoId));
      rowNode.querySelector('.ce-delete-lg')?.addEventListener('click',()=>removeLg(id));
    });
  }

  function renderLg(row){
    const pending=pendingDependencies(row), blocked=pending.length>0;
    const pre=arr(row.dependenciasPrevias), post=arr(row.dependenciasPosteriores);
    const dateBlocked=!row.cumplida && outsideDateWindow(row);
    const checkTitle = blocked&&!row.cumplida ? 'No se puede cerrar: hay dependencias previas pendientes' : (dateBlocked ? (row.fechaMinima&&today()<row.fechaMinima ? `No se puede cerrar antes del ${formatDate(row.fechaMinima)}` : `Plazo vencido el ${formatDate(row.fechaMaxima)}; modifica la fecha máxima antes de cerrar`) : 'Marcar o desmarcar como cumplida');
    return `<div class="ce-lg-row ${lgClass(row)}" data-lg-id="${esc(row.id)}">
      <input class="ce-lg-check" type="checkbox" ${row.cumplida?'checked':''} ${(canWrite() && ((!blocked && !dateBlocked) || row.cumplida))?'':'disabled'} title="${esc(checkTitle)}">
      <div class="ce-lg-main"><div class="ce-lg-description">${esc(row.descripcion)}</div>${row.notas?`<div class="ce-lg-notes">${esc(row.notas)}</div>`:''}<div class="ce-lg-badges"><span class="ce-lg-badge">${esc(lgStateLabel(row))}</span>${blocked?`<span class="ce-lg-badge blocked">Bloqueada por ${pending.length} dependencia(s)</span>`:''}${row.fechaMaxima&&!row.cumplida&&today()>row.fechaMaxima?'<span class="ce-lg-badge overdue">Fuera de plazo</span>':''}${pre.slice(0,3).map(ref=>`<span class="ce-lg-badge">← ${esc(refLabel(ref))}</span>`).join('')}${post.slice(0,2).map(ref=>`<span class="ce-lg-badge">→ ${esc(refLabel(ref))}</span>`).join('')}</div></div>
      <div class="ce-lg-dates"><strong>Fechas</strong><span>${esc(formatDate(row.fechaMinima))} → ${esc(formatDate(row.fechaMaxima))}</span></div>
      <div class="ce-lg-responsible"><strong>Responsable</strong><span>${esc(row.responsableNombre || 'Sin asignar')}</span></div>
      <div class="ce-lg-actions"><button type="button" class="outline ce-edit-lg" ${canWrite()?'':'disabled'}>Editar</button><button type="button" class="danger ce-delete-lg" ${canWrite()?'':'disabled'}>Eliminar</button></div>
    </div>`;
  }

  function responsibleOptions(selectedName=''){
    return `<option value="">Sin asignar</option>` + canonicalIndividuals().map(person => {
      const value=encodeURIComponent(JSON.stringify(person));
      return `<option value="${esc(value)}" ${norm(person.nombre)===norm(selectedName)?'selected':''}>${esc(person.nombre)}</option>`;
    }).join('');
  }
  function readResponsible(select){
    const value=text(select?.value); if(!value) return {responsableId:'',responsableNombre:''};
    try{ const item=JSON.parse(decodeURIComponent(value)); return {responsableId:text(item.id),responsableNombre:text(item.nombre)}; }catch(_){ return {responsableId:'',responsableNombre:''}; }
  }

  function openHitoForm(item=null){
    if(!canWrite()) return;
    store.editing={type:'hito',id:item?.id||''};
    const overlay=$('ceHitosFormOverlay');
    overlay.innerHTML=`<form class="ce-hitos-form" id="ceHitoForm">
      <div class="ce-hitos-form-head"><h3>${item?'Modificar Hito':'Nuevo Hito'}</h3><button type="button" class="outline" id="ceFormClose">Cerrar</button></div>
      <div class="ce-hitos-form-body"><div class="ce-hitos-form-grid">
        <div class="wide"><label>NombreHito</label><input id="ceHitoName" type="text" maxlength="180" required value="${esc(item?.nombreHito||'')}"></div>
        <div class="wide"><label>Descripción</label><textarea id="ceHitoDescription" maxlength="4000">${esc(item?.descripcion||'')}</textarea></div>
        <div><label>Responsable general</label><select id="ceHitoResponsible">${responsibleOptions(item?.responsableNombre)}</select></div>
        <div><label>Orden</label><input id="ceHitoOrder" type="number" step="1" value="${Number(item?.orden||0)}"></div>
        <div class="wide ce-hitos-readonly-note">Fecha mínima y fecha máxima no se escriben a mano: se recalculan automáticamente con la menor fecha mínima y la mayor fecha máxima de las LG incluidas en el Hito.</div>
      </div></div>
      <div class="ce-hitos-form-actions"><button type="button" class="outline" id="ceFormCancel">Cancelar</button><button type="submit">Guardar Hito</button></div>
    </form>`;
    overlay.classList.remove('hidden');
    $('ceFormClose').onclick=closeForm; $('ceFormCancel').onclick=closeForm;
    $('ceHitoForm').addEventListener('submit',saveHitoForm);
    setTimeout(()=>$('ceHitoName')?.focus(),0);
  }

  function dependencyOptions(type, ownId, ownHitoId, selected){
    const selectedKeys=new Set(arr(selected).map(ref=>`${text(ref.tipo).toUpperCase()}:${text(ref.id)}`));
    if(type==='HITO'){
      return store.hitos.filter(row=>row.id!==ownHitoId).map(row=>`<label class="ce-dep-option"><input type="checkbox" data-ref-type="HITO" value="${esc(row.id)}" ${selectedKeys.has(`HITO:${row.id}`)?'checked':''}><span>${esc(row.nombreHito)}<em>Se cumple cuando todas sus LG estén cerradas</em></span></label>`).join('') || '<span>No hay otros Hitos disponibles.</span>';
    }
    return store.lgs.filter(row=>row.id!==ownId).map(row=>`<label class="ce-dep-option"><input type="checkbox" data-ref-type="LG" value="${esc(row.id)}" ${selectedKeys.has(`LG:${row.id}`)?'checked':''}><span>${esc(row.descripcion)}<em>${esc(hitoById(row.hitoId)?.nombreHito||'Sin Hito')}</em></span></label>`).join('') || '<span>No hay otras LG disponibles.</span>';
  }

  function openLgForm(item=null,hitoId=''){
    if(!canWrite()) return;
    const parentId=text(hitoId||item?.hitoId);
    store.editing={type:'lg',id:item?.id||'',hitoId:parentId};
    const mode=text(item?.dependenciaTipo).toUpperCase()==='HITO_COMPLETO'?'HITO_COMPLETO':'LG';
    const optionType=mode==='HITO_COMPLETO'?'HITO':'LG';
    const overlay=$('ceHitosFormOverlay');
    overlay.innerHTML=`<form class="ce-hitos-form" id="ceLgForm">
      <div class="ce-hitos-form-head"><h3>${item?'Modificar LG':'Nueva Línea de Gestión'}</h3><button type="button" class="outline" id="ceFormClose">Cerrar</button></div>
      <div class="ce-hitos-form-body"><div class="ce-hitos-form-grid">
        <div class="wide"><label>Hito</label><select id="ceLgHito">${store.hitos.map(h=>`<option value="${esc(h.id)}" ${h.id===parentId?'selected':''}>${esc(h.nombreHito)}</option>`).join('')}</select></div>
        <div class="wide"><label>Descripción LG</label><textarea id="ceLgDescription" required maxlength="4000">${esc(item?.descripcion||'')}</textarea></div>
        <div><label>Fecha mínima</label><input id="ceLgMin" type="date" value="${esc(item?.fechaMinima||'')}"></div>
        <div><label>Fecha máxima</label><input id="ceLgMax" type="date" value="${esc(item?.fechaMaxima||'')}"></div>
        <div class="wide"><label>Notas</label><textarea id="ceLgNotes" maxlength="12000">${esc(item?.notas||'')}</textarea></div>
        <div><label>Responsable</label><select id="ceLgResponsible">${responsibleOptions(item?.responsableNombre)}</select></div>
        <div><label>Orden dentro del Hito</label><input id="ceLgOrder" type="number" step="1" value="${Number(item?.orden||0)}"></div>
        <div class="wide"><label>Dependencia</label><select id="ceLgDependencyMode"><option value="LG" ${mode==='LG'?'selected':''}>LG — una o varias</option><option value="HITO_COMPLETO" ${mode==='HITO_COMPLETO'?'selected':''}>Hito completo</option></select></div>
        <div><label>Dependencias previas</label><details class="ce-dep-picker" open><summary>Seleccionar dependencias previas</summary><div id="cePrevOptions" class="ce-dep-options">${dependencyOptions(optionType,item?.id||'',parentId,item?.dependenciasPrevias)}</div></details></div>
        <div><label>Dependencias posteriores</label><details class="ce-dep-picker"><summary>Seleccionar dependencias posteriores</summary><div id="cePostOptions" class="ce-dep-options">${dependencyOptions(optionType,item?.id||'',parentId,item?.dependenciasPosteriores)}</div></details></div>
        <div class="wide ce-completion-box"><input id="ceLgCompleted" type="checkbox" ${item?.cumplida?'checked':''}><div><strong>LG cumplida</strong><div class="ce-completion-help">Al activarla se comprueba que todas las dependencias previas estén cumplidas. Al cerrarse, las LG posteriores se actualizan automáticamente.</div></div></div>
      </div></div>
      <div class="ce-hitos-form-actions"><button type="button" class="outline" id="ceFormCancel">Cancelar</button><button type="submit">Guardar LG</button></div>
    </form>`;
    overlay.classList.remove('hidden');
    $('ceFormClose').onclick=closeForm; $('ceFormCancel').onclick=closeForm;
    $('ceLgForm').addEventListener('submit',saveLgForm);
    $('ceLgDependencyMode').addEventListener('change',()=>refreshDependencyPickers(item));
    $('ceLgHito').addEventListener('change',()=>refreshDependencyPickers(item));
    setTimeout(()=>$('ceLgDescription')?.focus(),0);
  }

  function collectRefs(containerId){ return [...($(containerId)?.querySelectorAll('input[type=checkbox]:checked')||[])].map(input=>({tipo:input.dataset.refType,id:input.value})); }
  function refreshDependencyPickers(item){
    const mode=$('ceLgDependencyMode').value, type=mode==='HITO_COMPLETO'?'HITO':'LG', ownId=store.editing?.id||'', ownHitoId=$('ceLgHito').value;
    const prev=collectRefs('cePrevOptions'), post=collectRefs('cePostOptions');
    $('cePrevOptions').innerHTML=dependencyOptions(type,ownId,ownHitoId,prev.length?prev:item?.dependenciasPrevias);
    $('cePostOptions').innerHTML=dependencyOptions(type,ownId,ownHitoId,post.length?post:item?.dependenciasPosteriores);
  }

  function closeForm(){ const node=$('ceHitosFormOverlay'); if(node){node.classList.add('hidden');node.innerHTML='';} store.editing=null; }

  async function saveHitoForm(event){
    event.preventDefault();
    const edit=store.editing, responsible=readResponsible($('ceHitoResponsible'));
    const payload={eventId:store.eventId,nombreHito:$('ceHitoName').value,descripcion:$('ceHitoDescription').value,orden:Number($('ceHitoOrder').value||0),...responsible};
    await runSave(async()=>api(edit?.id?`/api/hitos/${encodeURIComponent(edit.id)}`:'/api/hitos',{method:edit?.id?'PUT':'POST',body:JSON.stringify(payload)}),'Hito guardado.');
  }
  async function saveLgForm(event){
    event.preventDefault();
    const edit=store.editing, responsible=readResponsible($('ceLgResponsible'));
    const payload={eventId:store.eventId,hitoId:$('ceLgHito').value,descripcion:$('ceLgDescription').value,fechaMinima:$('ceLgMin').value,fechaMaxima:$('ceLgMax').value,notas:$('ceLgNotes').value,dependenciaTipo:$('ceLgDependencyMode').value,dependenciasPrevias:collectRefs('cePrevOptions'),dependenciasPosteriores:collectRefs('cePostOptions'),cumplida:$('ceLgCompleted').checked,orden:Number($('ceLgOrder').value||0),...responsible};
    await runSave(async()=>api(edit?.id?`/api/lg/${encodeURIComponent(edit.id)}`:'/api/lg',{method:edit?.id?'PUT':'POST',body:JSON.stringify(payload)}),'LG guardada y dependencias sincronizadas.');
  }
  async function runSave(task,success){
    const buttons=$('ceHitosFormOverlay')?.querySelectorAll('button'); buttons?.forEach(btn=>btn.disabled=true);
    try{ await task(); closeForm(); setStatus(success,'ok'); await load(true); }
    catch(error){ alert(error.message||String(error)); setStatus('No se pudo guardar','error'); buttons?.forEach(btn=>btn.disabled=false); }
  }

  async function toggleCompleted(id,checked,input){
    input.disabled=true;
    try{ await api(`/api/lg/${encodeURIComponent(id)}/cumplida`,{method:'PATCH',body:JSON.stringify({cumplida:checked})}); setStatus(checked?'LG cumplida. Dependencias posteriores actualizadas.':'LG reabierta.','ok'); await load(true); }
    catch(error){ input.checked=!checked; input.disabled=false; alert(error.message||String(error)); setStatus('No se pudo cambiar el estado','error'); }
  }
  async function removeLg(id){
    const row=lgById(id); if(!row||!confirm(`¿Eliminar la LG «${row.descripcion}»? También se limpiarán sus dependencias cruzadas.`)) return;
    try{ await api(`/api/lg/${encodeURIComponent(id)}`,{method:'DELETE'}); setStatus('LG eliminada.','ok'); await load(true); }catch(error){alert(error.message||String(error));}
  }
  async function removeHito(id){
    const row=hitoById(id), count=lgForHito(id).length; if(!row||!confirm(`¿Eliminar el Hito «${row.nombreHito}» y sus ${count} LG? Esta acción no se puede deshacer.`)) return;
    try{ await api(`/api/hitos/${encodeURIComponent(id)}`,{method:'DELETE'}); setStatus('Hito eliminado.','ok'); await load(true); }catch(error){alert(error.message||String(error));}
  }

  function installButton(){
    const button=$('btnOpenHitos');
    if(button){ button.addEventListener('click',openWindow); button.disabled=false; }
  }
  function eventChanged(){
    if($('ceHitosOverlay') && !$('ceHitosOverlay').classList.contains('hidden')) load(true);
  }
  function install(){
    installDom(); installButton();
    $('selectedEvent')?.addEventListener('change',()=>setTimeout(eventChanged,120));
    root.addEventListener('controlevent:event-changed',eventChanged);
  }

  root.ControlEventHitos={version:VERSION,open:openWindow,close:closeWindow,refresh:()=>load(true),state:store,canonicalIndividuals};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})(window);

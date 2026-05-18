/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #10. */
/* ==== V15.1 AJUSTES ==== */
(function(){
  function allPersonasSorted(){
    return (typeof personasGenerales === 'function' ? personasGenerales() : (state.personas || []))
      .slice()
      .sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es'));
  }

  const prevRenderMainSelectors = typeof renderMainSelectors === 'function' ? renderMainSelectors : null;
  renderMainSelectors = function(){
    if(prevRenderMainSelectors) prevRenderMainSelectors();

    const personas = allPersonasSorted();

    const collabPersona = document.getElementById('collabPersona');
    if(collabPersona){
      collabPersona.innerHTML =
        '<option value="" selected>Busca colaborador/a.....</option>' +
        personas.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)} (${escapeHtml(p.rango)})</option>`).join('');
    }
  };

  renderColabs = function(){
    const wrap = document.getElementById('collabList');
    const rows = collabsForEvent();
    const personas = allPersonasSorted();

    if(!rows.length){
      wrap.innerHTML = '<div class="empty">Todavía no hay personas colaboradoras para este evento.</div>';
      return;
    }

    wrap.innerHTML = '';
    rows.forEach(r => {
      const row = document.createElement('div');
      row.className = 'itemcard';
      if(r.situacion === 'Pendiente') row.classList.add('red-row');
      row.innerHTML = `
        <div class="rowline collab">
          <div class="field">
            <label>Colaborador/a</label>
            <select data-action="edit-collab-persona" data-id="${r.id}">
              ${personas.map(p => `<option value="${p.id}" ${p.id===r.personaId?'selected':''}>${escapeHtml(p.nombre)} (${escapeHtml(p.rango)})</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Número</label>
            <input type="number" min="0" step="1" value="${Number(r.numero||0)}" data-action="edit-collab-numero" data-id="${r.id}" />
          </div>
          <div class="field">
            <label>Ingreso</label>
            <select data-action="edit-collab-situacion" data-id="${r.id}">
              ${PAYMENT_OPTIONS.map(v => `<option value="${v}" ${v===r.situacion?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Importe obligatorio</label>
            <input class="soft-readonly" readonly value="${money(r.base)}" />
          </div>
          <div class="field">
            <label>Importe voluntario</label>
            <input class="money-text" type="text" value="${euroInputValue(r.importe||0)}" data-action="edit-collab-importe" data-id="${r.id}" />
          </div>
          <div style="display:flex;gap:8px;align-items:end">
            <button type="button" class="modify small" data-action="save-collab" data-id="${r.id}">Modificar</button>
            <button type="button" class="danger small" data-action="delete-collab" data-id="${r.id}">Eliminar</button>
          </div>
        </div>
      `;
      wrap.appendChild(row);
    });
  };

  renderSummaryList = function(targetId, rows){
    const wrap = document.getElementById(targetId);
    wrap.innerHTML = '';

    if(targetId === 'summaryTiendaTicket'){
      const tools = document.createElement('div');
      tools.className = 'hint';
      tools.innerHTML = 'Ordenar por: <a href="#" onclick="state.summaryTiendaSort=\'tienda\'; renderBudget(); return false;">Tienda</a> · <a href="#" onclick="state.summaryTiendaSort=\'ticket\'; renderBudget(); return false;">Ticket</a>';
      wrap.appendChild(tools);
    }

    if(!rows.length){
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'Sin datos.';
      wrap.appendChild(empty);
      return;
    }

    let total = 0;
    rows.forEach((r, idx) => {
      total += Number(r.v || 0);
      const div = document.createElement('div');
      div.className = 'summary-item';
      if(r.pending) div.classList.add('red-row');

      const amountHtml = `<span class="pill"${r.pending ? ' style="background:#fef2f2;color:#b91c1c"' : (r.donated ? ' style="text-decoration:line-through"' : '')}>${money(r.v)}</span>`;
      const textLabel = r.label || r.k;

      if(targetId === 'summaryTiendaTicket' && !r.pending && r.attachable){
        const inputId = `ticketUpload_${idx}`;
        const encodedKey = encodeURIComponent(r.k);
        const preview = r.image ? `<img class="ticket-thumb" src="${r.image}" alt="ticket" />` : '';
        div.innerHTML = `<span>${escapeHtml(textLabel)}</span><span style="display:flex;align-items:center;gap:8px;">${amountHtml}<span class="ticket-actions"><button type="button" class="outline small" onclick="document.getElementById('${inputId}').click()">📎</button><input id="${inputId}" class="ticket-file-input" type="file" accept="image/*" onchange="uploadTicketImage(event, '${encodedKey}')">${preview}${r.image ? `<button type="button" class="outline small" onclick="removeTicketImage('${encodedKey}')">🗑️</button>` : ''}</span></span>`;
      } else {
        div.innerHTML = `<span>${escapeHtml(textLabel)}</span>${amountHtml}`;
      }
      wrap.appendChild(div);

      if((targetId === 'summarySegmento' || targetId === 'summaryDestino') && idx % 2 === 1 && idx < rows.length - 1){
        const sep = document.createElement('div');
        sep.className = 'separator';
        sep.style.margin = '8px 0';
        wrap.appendChild(sep);
      }
    });

    const totalDiv = document.createElement('div');
    totalDiv.className = 'summary-item';
    totalDiv.style.fontWeight = '800';
    totalDiv.innerHTML = `<span>TOTAL</span><span class="pill">${money(total)}</span>`;
    wrap.appendChild(totalDiv);
  };

  window.addEventListener('load', () => {
    try{ render(); }catch(_){}
  });
})();

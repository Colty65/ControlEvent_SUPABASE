// ControlEvent v21_prod · FIX2
// Solo desplegable de eventos: orden por fecha de inicio y color por estado.
// No toca logon, no hace fetch, no usa observers, no usa timers de arranque.
(function(){
  'use strict';
  if(window.__CE_V21_FIX2_EVENT_SELECT__) return;
  window.__CE_V21_FIX2_EVENT_SELECT__ = true;

  const SELECT_ID = 'selectedEvent';
  const PLACEHOLDER = 'Selecciona evento...';
  const $ = id => document.getElementById(id);
  const trim = value => String(value == null ? '' : value).trim();
  const arr = value => Array.isArray(value) ? value : [];
  const up = value => trim(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function appState(){
    try{
      if(window.state && Array.isArray(window.state.eventos)) return window.state;
      if(window.ControlEventApp && window.ControlEventApp.state && Array.isArray(window.ControlEventApp.state.eventos)) return window.ControlEventApp.state;
      if(window.AppState && Array.isArray(window.AppState.eventos)) return window.AppState;
    }catch(_){ }
    return window.state || {};
  }

  function eventId(ev){ return trim(ev && (ev.id || ev.ID || ev.eventId || ev.event_id)); }
  function eventTitle(ev){ return trim(ev && (ev.titulo || ev.Titulo || ev.nombre || ev.Nombre || ev.Evento || ev.title)) || eventId(ev) || 'Evento'; }
  function eventStatus(ev){ return up(ev && (ev.situacion || ev.Situacion || ev.estado || ev.Estado || ev.status)); }
  function isFinalizado(ev){ return eventStatus(ev).indexOf('FINAL') >= 0; }
  function isEnCurso(ev){
    const status = eventStatus(ev);
    if(status.indexOf('EN CURSO') >= 0 || status === 'CURSO') return true;
    if(isFinalizado(ev)) return false;
    return !status;
  }

  function parseDateKey(value){
    const raw = trim(value);
    if(!raw) return 99999999;
    let match = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if(match){
      let year = Number(match[3]);
      if(year < 100) year += (year >= 70 ? 1900 : 2000);
      return Number(String(year).padStart(4,'0') + String(Number(match[2])).padStart(2,'0') + String(Number(match[1])).padStart(2,'0')) || 99999999;
    }
    match = raw.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if(match) return Number(match[1] + String(Number(match[2])).padStart(2,'0') + String(Number(match[3])).padStart(2,'0')) || 99999999;
    const date = new Date(raw);
    if(!Number.isNaN(date.getTime())) return Number(String(date.getFullYear()) + String(date.getMonth()+1).padStart(2,'0') + String(date.getDate()).padStart(2,'0'));
    return 99999999;
  }

  function eventDateKey(ev){
    return parseDateKey(ev && (ev.fechaIni || ev.FechaIni || ev.fecha_ini || ev.fechaInicio || ev.FechaInicio || ev.startDate || ev.fecha || ev.Fecha));
  }

  function orderedEvents(){
    const st = appState();
    return arr(st.eventos).filter(ev => eventId(ev)).slice().sort((a,b) => {
      const da = eventDateKey(a);
      const db = eventDateKey(b);
      if(da !== db) return da - db;
      return eventTitle(a).localeCompare(eventTitle(b), 'es', {sensitivity:'base', numeric:true});
    });
  }

  function injectStyle(){
    if($('ce-v21-fix2-event-select-style')) return;
    const style = document.createElement('style');
    style.id = 'ce-v21-fix2-event-select-style';
    style.textContent = `
      #selectedEvent option.ce-v21-event-curso{color:#16a34a!important;font-weight:950!important;}
      #selectedEvent option.ce-v21-event-finalizado{color:#b91c1c!important;font-weight:950!important;}
    `;
    document.head.appendChild(style);
  }

  function normalizeEventSelect(){
    const sel = $(SELECT_ID);
    if(!sel) return;
    const events = orderedEvents();
    if(!events.length) return;
    const st = appState();
    const current = trim(sel.value || st.selectedEventId || '');
    const existingPlaceholder = Array.from(sel.options || []).find(option => !trim(option.value));
    const placeholderText = trim(existingPlaceholder && existingPlaceholder.textContent) || PLACEHOLDER;
    const signature = events.map(ev => [eventId(ev), eventDateKey(ev), eventStatus(ev), eventTitle(ev)].join('~')).join('|') + '|current=' + current;
    if(sel.dataset.ceV21Fix2Signature === signature) return;

    const html = [];
    html.push(`<option value="" ${current ? '' : 'selected'}>${esc(placeholderText)}</option>`);
    events.forEach(ev => {
      const id = eventId(ev);
      const finalizado = isFinalizado(ev);
      const curso = isEnCurso(ev);
      const cssClass = finalizado ? 'ce-v21-event-finalizado' : (curso ? 'ce-v21-event-curso' : '');
      const inline = finalizado ? 'color:#b91c1c;font-weight:950;' : (curso ? 'color:#16a34a;font-weight:950;' : '');
      html.push(`<option value="${esc(id)}" class="${cssClass}" style="${inline}" ${id === current ? 'selected' : ''}>${esc(eventTitle(ev))}</option>`);
    });
    sel.innerHTML = html.join('');
    if(current) sel.value = current;
    sel.dataset.ceV21Fix2Signature = signature;
  }

  function installEventHooks(){
    ['pointerdown','mousedown','focusin','click','keydown'].forEach(type => {
      document.addEventListener(type, event => {
        if(event && event.target && event.target.id === SELECT_ID) normalizeEventSelect();
      }, true);
    });
  }

  function wrapRenderHeader(){
    try{
      const previous = window.renderHeader;
      if(typeof previous === 'function' && !previous.__ceV21Fix2Wrapped){
        const wrapped = function(){
          const result = previous.apply(this, arguments);
          normalizeEventSelect();
          return result;
        };
        wrapped.__ceV21Fix2Wrapped = true;
        window.renderHeader = wrapped;
      }
    }catch(_){ }
  }

  function wrapChangeSelectedEvent(){
    try{
      const previous = window.changeSelectedEvent;
      if(typeof previous === 'function' && !previous.__ceV21Fix2Wrapped){
        const wrapped = function(){
          const result = previous.apply(this, arguments);
          normalizeEventSelect();
          try{
            if(result && typeof result.then === 'function') result.finally(normalizeEventSelect);
          }catch(_){ }
          return result;
        };
        wrapped.__ceV21Fix2Wrapped = true;
        window.changeSelectedEvent = wrapped;
      }
    }catch(_){ }
  }

  function install(){
    injectStyle();
    wrapRenderHeader();
    wrapChangeSelectedEvent();
    installEventHooks();
    normalizeEventSelect();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();

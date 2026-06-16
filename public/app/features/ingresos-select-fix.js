/* ControlEvent v9.5_prod - Refuerzo del desplegable Ingreso en alta de colaboradores.
   No intercepta login ni menús: solo garantiza opciones en #collabSituacion. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v9.5_prod';
  const OPTIONS = ['Banco','Bizum','Efectivo','Pendiente'];
  const SELECT_ID = 'collabSituacion';

  function isAuthVisible(){
    try{
      const auth = document.getElementById('authOverlay');
      if(!auth) return false;
      const cs = getComputedStyle(auth);
      return !auth.classList.contains('hidden') && cs.display !== 'none' && cs.visibility !== 'hidden';
    }catch(_){ return false; }
  }
  function ensureIngresoOptions(){
    const sel = document.getElementById(SELECT_ID);
    if(!sel) return false;
    const current = String(sel.value || '').trim();
    const values = Array.from(sel.options || []).map(opt => String(opt.value || '').trim());
    const mustRebuild = values.length !== OPTIONS.length || OPTIONS.some(v => !values.includes(v));
    if(mustRebuild){
      sel.innerHTML = OPTIONS.map(v => `<option value="${v}">${v}</option>`).join('');
    }
    if(current && OPTIONS.includes(current)) sel.value = current;
    else if(!OPTIONS.includes(sel.value)) sel.value = 'Pendiente';
    return true;
  }
  function schedule(){
    [0, 80, 250, 700].forEach(ms => setTimeout(() => { if(!isAuthVisible()) ensureIngresoOptions(); }, ms));
  }
  document.addEventListener('focusin', event => { if(event.target && event.target.id === SELECT_ID) ensureIngresoOptions(); }, false);
  document.addEventListener('pointerdown', event => {
    const target = event.target;
    if(!target) return;
    if(target.id === SELECT_ID || target.id === 'btnAddColab') ensureIngresoOptions();
  }, true);
  document.addEventListener('mousedown', event => {
    const target = event.target;
    if(!target) return;
    if(target.id === SELECT_ID || target.id === 'btnAddColab') ensureIngresoOptions();
  }, true);
  document.addEventListener('click', event => {
    const target = event.target;
    if(!target) return;
    if(target.id === SELECT_ID || target.id === 'btnAddColab') ensureIngresoOptions();
  }, true);
  document.addEventListener('change', event => { if(event.target && event.target.id === 'selectedEvent') schedule(); }, false);
  window.addEventListener('controlevent:app-ready', schedule);
  window.addEventListener('controlevent:runtime-ready', schedule);
  window.addEventListener('load', schedule);
  try{
    const old = window.addColab;
    if(typeof old === 'function' && !old.__ceIngresoSelectGuardV313){
      const wrapped = function(){ ensureIngresoOptions(); return old.apply(this, arguments); };
      wrapped.__ceIngresoSelectGuardV313 = true;
      window.addColab = wrapped;
    }
  }catch(_){ }
  schedule();
  window.ControlEventIngresoSelectGuard = {version: VERSION, ensure: ensureIngresoOptions};
})();

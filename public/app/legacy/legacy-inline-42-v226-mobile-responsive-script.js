/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #42. */
/* ==== v22.8: menú móvil y navegación responsive ==== */
(function(){
  const VERSION='ControlEvent v26.6';
  const VERSION_FILE='ControlEvent_v26_6';
  function $(id){return document.getElementById(id)}
  function clickId(id){const el=$(id); if(el){el.click(); closeDrawer();}}
  function ensureMobileMenu(){
    if($('ceMobileMenuBtn')) return;
    const btn=document.createElement('button');
    btn.type='button'; btn.id='ceMobileMenuBtn'; btn.className='mobile-menu-btn'; btn.innerHTML='<span>☰</span><span>Menú</span>';
    const backdrop=document.createElement('div'); backdrop.id='ceMobileDrawerBackdrop'; backdrop.className='mobile-drawer-backdrop';
    const drawer=document.createElement('aside'); drawer.id='ceMobileDrawer'; drawer.className='mobile-drawer'; drawer.setAttribute('aria-label','Menú móvil ControlEvent');
    drawer.innerHTML=`
      <div class="mobile-drawer-head"><div><div class="mobile-drawer-title">ControlEvent</div><div class="hint">Modo móvil</div></div><button type="button" class="mobile-drawer-close" id="ceMobileDrawerClose">Cerrar</button></div>
      <div class="mobile-menu-section"><h3>Evento</h3><div class="mobile-menu-grid">
        <button type="button" class="mobile-menu-action primary" data-target="tabIngresosBtn"><span class="mi">🤝</span>Ingresos</button>
        <button type="button" class="mobile-menu-action" data-target="tabDonacionesBtn"><span class="mi">🎁</span>Donaciones</button>
        <button type="button" class="mobile-menu-action" data-target="tabComprasBtn"><span class="mi">🛒</span>Compras y gastos</button>
        <button type="button" class="mobile-menu-action" data-target="tabResumenBtn"><span class="mi">🧾</span>Resumen</button>
        <button type="button" class="mobile-menu-action" data-target="tabGraficasBtn"><span class="mi">📊</span>Gráficas</button>
      </div></div>
      <div class="mobile-menu-section"><h3>Herramientas</h3><div class="mobile-menu-grid">
        <button type="button" class="mobile-menu-action" data-target="btnExportExcel"><span class="mi">📗</span>Excel INFOEVENTO</button>
        <button type="button" class="mobile-menu-action" data-target="btnToggleMaintenance"><span class="mi">🧩</span>Mantenimiento</button>
        <button type="button" class="mobile-menu-action" data-target="btnOpenImport"><span class="mi">📥</span>Carga inicial</button>
        <button type="button" class="mobile-menu-action" data-target="btnExportSeed"><span class="mi">💾</span>Backup / descarga</button>
      </div></div>
      <div class="mobile-menu-section"><h3>Vista</h3><div class="mobile-menu-grid">
        <button type="button" class="mobile-menu-action" data-target="toggleEventDesc"><span class="mi">ⓘ</span>Descripción del evento</button>
        <button type="button" class="mobile-menu-action" data-target="toggleIngresosSummary"><span class="mi">💰</span>Resumen de ingresos</button>
        <button type="button" class="mobile-menu-action" data-target="toggleComprasEvent"><span class="mi">🧰</span>Compras del evento</button>
        <button type="button" class="mobile-menu-action" data-target="toggleComprasSummary"><span class="mi">📈</span>Cálculos / resumen</button>
      </div></div>`;
    document.body.appendChild(btn); document.body.appendChild(backdrop); document.body.appendChild(drawer);
    btn.addEventListener('click',openDrawer);
    backdrop.addEventListener('click',closeDrawer);
    $('ceMobileDrawerClose')?.addEventListener('click',closeDrawer);
    drawer.addEventListener('click',function(ev){const b=ev.target.closest('[data-target]'); if(!b) return; ev.preventDefault(); clickId(b.getAttribute('data-target'));});
    document.addEventListener('keydown',function(ev){if(ev.key==='Escape') closeDrawer();});
  }
  function openDrawer(){document.body.classList.add('mobile-drawer-open')}
  function closeDrawer(){document.body.classList.remove('mobile-drawer-open')}
  function refreshVersion(){
    try{document.title=VERSION;}catch(_){ }
    try{document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent=VERSION;});}catch(_){ }
    try{const proto=HTMLAnchorElement.prototype; if(!proto.click.__v226Wrapped){const prev=proto.click; const w=function(){try{if(this.download)this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig,VERSION_FILE);}catch(_){ } return prev.apply(this,arguments);}; w.__v226Wrapped=true; proto.click=w;}}catch(_){ }
  }
  function applyMobileHelpers(){
    ensureMobileMenu(); refreshVersion();
    try{document.querySelectorAll('.itemcard').forEach(card=>{ if(!card.dataset.mobileCardReady) card.dataset.mobileCardReady='1'; });}catch(_){ }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',applyMobileHelpers); else applyMobileHelpers();
  const prevRender=typeof render==='function'?render:null;
  if(prevRender && !prevRender.__v226Wrapped){
    const wrapped=function(){const r=prevRender.apply(this,arguments); setTimeout(applyMobileHelpers,80); setTimeout(applyMobileHelpers,500); return r;};
    wrapped.__v226Wrapped=true; render=wrapped; window.render=render;
  }
  setTimeout(applyMobileHelpers,500); setTimeout(applyMobileHelpers,1600);
})();

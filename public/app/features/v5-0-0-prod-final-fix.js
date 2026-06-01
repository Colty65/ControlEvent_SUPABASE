/* ControlEvent v5.0.0_prod - cierre quirúrgico de versión, descargas y retorno a globo.
   No cambia datos ni render general: solo fuerza etiqueta/descarga y remata el retorno del visor al globo origen. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v5.0.0_prod';
  const VERSION_FILE = 'ControlEvent_v5_0_0_prod';
  const INSTALLED = '__ceV500ProdFinalFix';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const pad = v => String(v).padStart(2, '0');
  const clean = v => String(v || 'EVENTO').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._ -]+/g,'_').trim().replace(/\s+/g,'_').replace(/_+/g,'_').slice(0,90) || 'EVENTO';
  function ymd(d){ return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`; }
  function hms(d){ return `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; }

  function applyVersion(){
    safe(() => { document.title = VERSION; }, null);
    safe(() => { document.body.dataset.ceVersion = VERSION; }, null);
    safe(() => { window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; }, null);
    safe(() => {
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(el.textContent || '')) el.textContent = VERSION;
      });
    }, null);
  }

  function currentEventTitle(){
    const sel = $('selectedEvent');
    const text = sel?.selectedOptions?.[0]?.textContent || sel?.options?.[sel.selectedIndex]?.textContent || '';
    return clean(text.replace(/^\s*FINALIZADO\s*[-–:]?\s*/i,''));
  }
  function normalizeDownloadName(name){
    let n = String(name || '');
    if(!n) return n;
    const now = new Date();
    n = n.replace(/ControlEvent_v\d+(?:_\d+){1,3}(?:_prod)?/ig, VERSION_FILE);
    n = n.replace(/ControlEvent\s+v\d+(?:\.\d+){1,3}(?:_prod)?/ig, VERSION);
    if(/descarga_datos\.xlsx$/i.test(n)) n = `${VERSION_FILE}_BACKUP_TODOS_${ymd(now)}_${hms(now)}.xlsx`;
    if(/_BACKUP_/i.test(n)){
      n = n.replace(/^(?:.*?)(ControlEvent_v\d+(?:_\d+){1,3}(?:_prod)?)_BACKUP_/i, `${VERSION_FILE}_BACKUP_`);
      if(!/^ControlEvent_v5_0_0_prod_BACKUP_/i.test(n)){
        const tail = n.replace(/^.*?_BACKUP_/i, '');
        n = `${VERSION_FILE}_BACKUP_${tail}`;
      }
    }
    if(/INFOEVENTO/i.test(n)){
      const titleMatch = n.match(/INFOEVENTO[-_](.*?)(?:_\d{8})?\.xlsx$/i);
      const title = clean(titleMatch && titleMatch[1] ? titleMatch[1] : currentEventTitle());
      const dateMatch = n.match(/_(\d{8})\.xlsx$/);
      n = `${VERSION_FILE}_INFOEVENTO-${title}_${dateMatch ? dateMatch[1] : ymd(now)}.xlsx`;
    }
    n = n.replace(/[\\/:*?"<>|]+/g, '_').replace(/_+\.xlsx$/i, '.xlsx').replace(/__+/g,'_');
    return n;
  }

  function patchAnchorDownloads(){
    const proto = window.HTMLAnchorElement && HTMLAnchorElement.prototype;
    if(!proto || proto.__ceV500DownloadPatched) return;
    proto.__ceV500DownloadPatched = true;
    const desc = Object.getOwnPropertyDescriptor(proto, 'download');
    if(desc && desc.configurable && desc.get && desc.set){
      Object.defineProperty(proto, 'download', {
        configurable: true,
        enumerable: desc.enumerable,
        get: function(){ return desc.get.call(this); },
        set: function(value){ return desc.set.call(this, normalizeDownloadName(value)); }
      });
    }
    const oldSet = proto.setAttribute;
    proto.setAttribute = function(name, value){
      if(String(name || '').toLowerCase() === 'download') value = normalizeDownloadName(value);
      return oldSet.call(this, name, value);
    };
    const oldClick = proto.click;
    proto.click = function(){
      try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
      return oldClick.apply(this, arguments);
    };
  }
  function normalizeExistingAnchors(){ safe(() => document.querySelectorAll('a[download]').forEach(a => { a.download = normalizeDownloadName(a.download); }), null); }

  let lastTooltipSnapshot = null;
  function tooltipRoots(){
    const ids = ['ceBudgetLiteTooltipV307','ceTooltipV21','ceV462Tooltip','ceTooltipV190','ceTooltipV181'];
    const byId = ids.map($).filter(Boolean);
    const byClass = Array.from(document.querySelectorAll('.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip,.ce-tooltip-v181,.ce-tooltip-v190'));
    return byId.concat(byClass).filter((el, idx, arr) => el && arr.indexOf(el) === idx);
  }
  function visible(el){
    return safe(() => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) !== 0 && r.width > 0 && r.height > 0; }, false);
  }
  function rememberTooltip(source){
    const roots = tooltipRoots().filter(visible);
    if(!roots.length && source){
      const own = source.closest?.('#ceBudgetLiteTooltipV307,#ceTooltipV21,#ceV462Tooltip,#ceTooltipV190,#ceTooltipV181,.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip,.ce-tooltip-v181,.ce-tooltip-v190');
      if(own) roots.push(own);
    }
    if(!roots.length) return;
    lastTooltipSnapshot = roots.map(el => ({el, id:el.id || '', className:el.className || '', style:el.getAttribute('style') || '', html:el.innerHTML, scrollTop:el.scrollTop || 0, scrollLeft:el.scrollLeft || 0, rect:safe(() => el.getBoundingClientRect(), null)}));
  }
  function restoreTooltip(){
    const snap = lastTooltipSnapshot;
    if(!snap || !snap.length) return;
    snap.forEach(item => {
      let el = item.el && document.contains(item.el) ? item.el : (item.id ? $(item.id) : null);
      if(!el) return;
      safe(() => {
        if(!el.innerHTML && item.html) el.innerHTML = item.html;
        el.className = item.className || el.className;
        el.setAttribute('style', item.style || '');
        if(item.rect){ el.style.setProperty('position','fixed','important'); el.style.setProperty('left', Math.max(4, Math.round(item.rect.left)) + 'px','important'); el.style.setProperty('top', Math.max(4, Math.round(item.rect.top)) + 'px','important'); }
        el.style.setProperty('display','block','important'); el.style.setProperty('visibility','visible','important'); el.style.setProperty('opacity','1','important'); el.style.setProperty('pointer-events','auto','important');
        el.scrollTop = item.scrollTop || 0; el.scrollLeft = item.scrollLeft || 0;
      }, null);
    });
  }
  function restoreSoon(){ [40,120,260,520].forEach(ms => setTimeout(restoreTooltip, ms)); }
  function patchPhotoReturn(){
    document.addEventListener('pointerdown', ev => { const t = ev.target; if(t?.closest?.('#ceBudgetLiteTooltipV307 img,#ceTooltipV21 img,.ce-v21-tooltip img,.ce-budget-tooltip img,.ce-tooltip img,#ceBudgetLiteTooltipV307 button,#ceTooltipV21 button,.ce-v21-tooltip button,.ce-budget-tooltip button,.ce-tooltip button')) rememberTooltip(t); }, true);
    document.addEventListener('click', ev => { const t = ev.target; if(t?.closest?.('#ceBudgetLiteTooltipV307 img,#ceTooltipV21 img,.ce-v21-tooltip img,.ce-budget-tooltip img,.ce-tooltip img')) rememberTooltip(t); if(t?.closest?.('#ceV401PcPhotoModal [data-close],#ceV401PcPhotoModal .ce-v401-pc-modal-close,#ceV401PcPhotoModal,.ce-v401-pc-modal-close')) restoreSoon(); }, true);
    document.addEventListener('keydown', ev => { if(ev.key === 'Escape') restoreSoon(); }, true);
    safe(() => { const mo = new MutationObserver(muts => { muts.forEach(m => Array.from(m.removedNodes || []).forEach(node => { if(node?.nodeType === 1 && (node.id === 'ceV401PcPhotoModal' || node.querySelector?.('#ceV401PcPhotoModal'))) restoreSoon(); })); }); mo.observe(document.documentElement, {childList:true, subtree:true}); }, null);
  }

  function install(){ applyVersion(); patchAnchorDownloads(); normalizeExistingAnchors(); }
  patchPhotoReturn();
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted','controlevent:event-loaded'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  document.addEventListener('click', () => setTimeout(install, 20), true);
  document.addEventListener('change', () => setTimeout(install, 20), true);
  [0,80,250,700,1500,3000,6000].forEach(ms => setTimeout(install, ms));
  setInterval(install, 900);
  window.ControlEventV500ProdFinalFix = {version:VERSION, versionFile:VERSION_FILE, install, normalizeDownloadName, restoreTooltip};
})();

/* ControlEvent v19_prod - hardlock final de versión, trazabilidad y herramientas laterales. */
(function(){
  'use strict';
  if(window.__ceV181110FinalHardlock) return; window.__ceV181110FinalHardlock=true;
  var VERSION_LABEL='v19_prod';
  var VERSION_TEXT='ControlEvent v19_prod';
  var VERSION_FILE='ControlEvent_v19_prod';
  var BUILD_ID='20260708-200500';
  var ZIP_NAME='CE_v19_PROD_MAPA_GLOBAL_FIX3.zip';
  var oldRe=/(ControlEvent\s+)?v18(?:[._](?:9|10|11)(?:[._]\d+)?|(?:_9|_10|_11(?:_\d+)?))_prod/ig;
  function safe(fn){ try{return fn();}catch(_){ return null; } }
  function setText(el,txt){ if(el && el.textContent!==txt) el.textContent=txt; }
  function installStyle(){
    if(document.getElementById('ceV181110FinalHardlockStyle')) return;
    var st=document.createElement('style'); st.id='ceV181110FinalHardlockStyle';
    st.textContent = [
      '#ceVersionProof{display:none!important;visibility:hidden!important;pointer-events:none!important}',
      'body.ce-v181110-left-tools .footer{position:fixed!important;left:10px!important;top:156px!important;right:auto!important;bottom:auto!important;width:66px!important;height:auto!important;z-index:9990!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;margin:0!important;display:block!important;pointer-events:none!important;transform:none!important}',
      'body.ce-v181110-left-tools .footer-inner{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;gap:9px!important;width:64px!important;max-width:64px!important;margin:0!important;padding:8px 5px!important;background:rgba(255,255,255,.90)!important;border:1px solid rgba(148,163,184,.55)!important;border-radius:18px!important;box-shadow:0 14px 34px rgba(15,23,42,.16)!important;pointer-events:auto!important;backdrop-filter:blur(4px)!important}',
      'body.ce-v181110-left-tools #btnExportExcel,body.ce-v181110-left-tools #btnOpenImport,body.ce-v181110-left-tools #btnExportSeed,body.ce-v181110-left-tools #btnToggleMaintenance{width:52px!important;height:52px!important;min-width:52px!important;min-height:52px!important;border-radius:16px!important;padding:4px!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:center!important;pointer-events:auto!important;position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;top:auto!important;transform:none!important}',
      'body.ce-v181110-left-tools .footer-img,body.ce-v181110-left-tools .maint-footer-img{width:44px!important;height:44px!important;object-fit:contain!important;pointer-events:none!important}',
      'body.ce-v181110-left-tools .main{padding-left:86px!important}',
      '#ceGeminiLibreOverlay .ce-ai-version-badge{font-size:12px!important;font-weight:950!important;color:#075985!important;background:#e0f2fe!important;border:1px solid #7dd3fc!important;border-radius:999px!important;padding:3px 9px!important;white-space:nowrap!important}',
      '@media(max-width:760px){body.ce-v181110-left-tools .footer{left:6px!important;top:116px!important;width:54px!important}body.ce-v181110-left-tools .footer-inner{width:54px!important;max-width:54px!important;gap:7px!important;padding:6px 4px!important;border-radius:16px!important}body.ce-v181110-left-tools #btnExportExcel,body.ce-v181110-left-tools #btnOpenImport,body.ce-v181110-left-tools #btnExportSeed,body.ce-v181110-left-tools #btnToggleMaintenance{width:46px!important;height:46px!important;min-width:46px!important;min-height:46px!important}body.ce-v181110-left-tools .footer-img,body.ce-v181110-left-tools .maint-footer-img{width:38px!important;height:38px!important}body.ce-v181110-left-tools .main{padding-left:64px!important}}',
      '@media print{#ceVersionProof,.footer{display:none!important}}'
    ].join('\n');
    document.head.appendChild(st);
  }
  function removeVersionProof(){
    var badge=document.getElementById('ceVersionProof');
    if(badge) badge.remove();
  }
  function setGlobals(){
    safe(function(){
      window.__ceVersionLabel=VERSION_LABEL; window.__ceVersion=VERSION_TEXT; window.VERSION=VERSION_TEXT; window.VERSION_FILE=VERSION_FILE;
      window.ControlEventVersion={label:VERSION_LABEL,version:VERSION_TEXT,versionFile:VERSION_FILE,build:BUILD_ID,zip:ZIP_NAME,source:'v19-final-hardlock'};
      document.title=VERSION_TEXT;
      if(document.body){ document.body.dataset.ceVersion=VERSION_TEXT; document.body.dataset.ceBuild=BUILD_ID; document.body.dataset.ceZip=ZIP_NAME; }
    });
  }
  function cleanOldVisibleVersions(){
    safe(function(){
      document.querySelectorAll('.ce-v104-brand-mini span,.ce-v1045-brand-mini span,.ce-v1047-brand-mini span,.ce-version-label,[data-ce-version-label]').forEach(function(el){ setText(el, VERSION_LABEL); });
      document.querySelectorAll('body *').forEach(function(el){
        if(el.children && el.children.length) return;
        var t=el.textContent||'';
        if(/v18[._].*prod/i.test(t) && t.length<80){ el.textContent=t.replace(oldRe,function(m){return /^ControlEvent/i.test(m)?VERSION_TEXT:VERSION_LABEL;}); }
      });
    });
  }
  function moveTools(){
    safe(function(){
      if(document.body) document.body.classList.add('ce-v181110-left-tools');
      var footer=document.querySelector('.footer');
      var inner=document.querySelector('.footer-inner');
      if(footer){
        footer.style.setProperty('position','fixed','important'); footer.style.setProperty('left','10px','important'); footer.style.setProperty('top','156px','important'); footer.style.setProperty('bottom','auto','important'); footer.style.setProperty('right','auto','important'); footer.style.setProperty('width','66px','important'); footer.style.setProperty('display','block','important');
      }
      if(inner){ inner.style.setProperty('display','flex','important'); inner.style.setProperty('flex-direction','column','important'); inner.style.setProperty('gap','9px','important'); inner.style.setProperty('width','64px','important'); }
    });
  }
  function patchZuzuModal(){
    safe(function(){
      var head=document.querySelector('#ceGeminiLibreOverlay .ce-ai-head');
      if(head && !head.querySelector('.ce-ai-version-badge')){
        var span=document.createElement('span'); span.className='ce-ai-version-badge'; span.textContent=VERSION_LABEL; span.title=ZIP_NAME;
        var h2=head.querySelector('h2'); if(h2 && h2.nextSibling) head.insertBefore(span,h2.nextSibling); else head.appendChild(span);
      }
      // FIX10: se elimina la etiqueta técnica visible del informe Zuzu.
    });
  }
  function apply(){ installStyle(); setGlobals(); if(document.body){ removeVersionProof(); moveTools(); } cleanOldVisibleVersions(); patchZuzuModal(); }
  window.ControlEventVersionCheck=function(){
    var front={label:VERSION_LABEL,version:VERSION_TEXT,versionFile:VERSION_FILE,build:BUILD_ID,zip:ZIP_NAME,source:'v19-final-hardlock'};
    return fetch('/api/version',{cache:'no-store'}).then(function(r){return r.json();}).then(function(api){ var out={front:front,api:api,ok:!!(api&&api.version===VERSION_TEXT&&api.label===VERSION_LABEL)}; console.log('[ControlEvent version check]',out); return out; }).catch(function(error){ var out={front:front,api:null,ok:false,error:String(error&&error.message||error)}; console.warn('[ControlEvent version check]',out); return out; });
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true}); else apply();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:event-loaded','controlevent:module-mounted'].forEach(function(evt){ window.addEventListener(evt,function(){ setTimeout(apply,40); setTimeout(apply,350); }); });
  setInterval(apply,1500);
  try{ new MutationObserver(function(){ setTimeout(apply,20); }).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true}); }catch(_){ }
})();

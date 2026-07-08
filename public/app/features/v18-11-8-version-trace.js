/* ControlEvent v18.11.10_prod - saneamiento de versión visible y diagnóstico. */
(function(){
  'use strict';
  if(window.__ceV18114VersionTrace) return;
  window.__ceV18114VersionTrace = true;
  var VERSION_LABEL = 'v18.11.10_prod';
  var VERSION_TEXT = 'ControlEvent v18.11.10_prod';
  var VERSION_FILE = 'ControlEvent_v18_11_10_prod';
  var BUILD_ID = '20260708-143000';
  var ZIP_NAME = 'CE_v18_11_10_PROD_ZUZU_FLUJO_VERSION_LAYOUT.zip';
  var OLD_RE = /(ControlEvent\s+)?v18(?:[._](?:9|10|11)(?:[._]\d+)?|(?:_9|_10|_11(?:_\d+)?))_prod/ig;
  var OLD_FILE_RE = /ControlEvent_v18_(?:9|10|11(?:_\d+)?)_prod/ig;
  var applying = false;
  function setAttr(el, name, value){ try{ if(el && el.getAttribute(name)!==String(value)) el.setAttribute(name, String(value)); }catch(_){} }
  function setText(el, value){ try{ if(el && el.textContent!==String(value)) el.textContent=String(value); }catch(_){} }
  function setGlobals(){
    try{
      window.__ceVersionLabel = VERSION_LABEL;
      window.__ceVersion = VERSION_TEXT;
      window.VERSION = VERSION_TEXT;
      window.VERSION_FILE = VERSION_FILE;
      window.ControlEventVersion = {label:VERSION_LABEL, version:VERSION_TEXT, versionFile:VERSION_FILE, build:BUILD_ID, zip:ZIP_NAME, source:'v18-11-8-version-trace.js'};
      if(document.body){
        setAttr(document.body, 'data-ce-version', VERSION_TEXT);
        setAttr(document.body, 'data-ce-build', BUILD_ID);
        setAttr(document.body, 'data-ce-zip', ZIP_NAME);
      }
    }catch(_){}
  }
  function cleanText(s){
    if(!s) return s;
    return String(s).replace(OLD_FILE_RE, VERSION_FILE).replace(OLD_RE, function(m){ return /^ControlEvent/i.test(m) ? VERSION_TEXT : VERSION_LABEL; });
  }
  function apply(){
    if(applying) return;
    applying = true;
    try{
      setGlobals();
      try{ if(document.title!==VERSION_TEXT) document.title = VERSION_TEXT; }catch(_){}
      document.querySelectorAll('.ce-v104-brand-mini,.ce-v1045-brand-mini,.ce-v1047-brand-mini').forEach(function(el){
        var span = el.querySelector('span');
        if(span) setText(span, VERSION_LABEL);
        else setText(el, VERSION_LABEL);
      });
      document.querySelectorAll('[data-ce-version-label],.appname span,.appname-stack span,.ce-v17fix26-foot,.ce-version-label').forEach(function(el){
        var after=cleanText(el.textContent||'');
        if(after && after!==el.textContent) setText(el, after);
      });
      document.querySelectorAll('[title],[aria-label],[download]').forEach(function(el){
        ['title','aria-label','download'].forEach(function(a){ var v=el.getAttribute(a); var nv=cleanText(v); if(v&&nv!==v) setAttr(el,a,nv); });
      });
    }catch(_){}
    finally { applying = false; }
  }
  window.ControlEventVersionCheck = function(){
    var front={label:VERSION_LABEL, version:VERSION_TEXT, file:VERSION_FILE, build:BUILD_ID, zip:ZIP_NAME};
    return fetch('/api/version',{cache:'no-store'}).then(function(r){return r.json();}).then(function(api){
      var report={front:front, api:api, ok: !!(api && api.version===VERSION_TEXT)};
      console.log('[ControlEvent version check]', report);
      return report;
    }).catch(function(error){ var report={front:front, api:null, ok:false, error:String(error&&error.message||error)}; console.warn('[ControlEvent version check]', report); return report; });
  };
  apply();
  setTimeout(apply, 250); setTimeout(apply, 1000); setTimeout(apply, 3000);
  try{ new MutationObserver(function(){ if(!applying) apply(); }).observe(document.documentElement, {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['title','aria-label','download','data-ce-version']}); }catch(_){}
})();

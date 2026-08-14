/* ControlEvent v1.0_exp · hardlock final de versión visible, descargas e identidad cliente. */
(function(root){
  'use strict';
  const LABEL='v1.0_exp', TEXT='ControlEvent v1.0_exp', FILE='ControlEvent_v1.0_exp', BUILD='20260814-V1.0-EXP-PDFTRACE1', ZIP='ControlEvent_v1.0_exp.zip';
  const versionPrefix=/ControlEvent_v\d+(?:[._-]\d+)*(?:_(?:prod|exp)(?:_\d+)*)?/ig;
  const versionText=/ControlEvent\s+v\d+(?:[._-]\d+)*(?:_(?:prod|exp)(?:_\d+)*)?/ig;
  function normalizeName(name){const s=String(name||'');return s.replace(versionPrefix,FILE);}
  function publish(){
    try{root.__ceVersion=TEXT;root.__ceVersionLabel=LABEL;root.__ceBuildId=BUILD;root.VERSION=TEXT;root.VERSION_FILE=FILE;root.ControlEventVersion={label:LABEL,version:TEXT,versionFile:FILE,build:BUILD,zip:ZIP,source:'v1-0-exp-version-hardlock.js'};root.__ceVersionInfo={version:LABEL,label:LABEL,text:TEXT,file:FILE,buildId:BUILD,zipName:ZIP};}catch(_){}
    try{document.title=TEXT;document.body?.setAttribute('data-ce-version',TEXT);document.body?.setAttribute('data-ce-build',BUILD);document.body?.setAttribute('data-ce-zip',ZIP);}catch(_){}
  }
  function scrubVisible(){
    publish();
    try{
      // NUNCA tocar contenedores de cabecera con textContent: destruiría el icono, reloj y botones.
      // Solo se normalizan nodos hoja dedicados a la versión.
      document.querySelectorAll('[data-ce-version-label],#appVersion,.app-version,.version-badge,.ce-v104-brand-mini > span,.ce-v1045-brand-mini > span,.ce-v1047-brand-mini > span').forEach(el=>{
        const raw=String(el.textContent||'');
        if(!raw)return;
        if(/ControlEvent\s+v/i.test(raw))el.textContent=raw.replace(versionText,TEXT);
        else if(/\bv\d+(?:[._-]\d+)*(?:_(?:prod|exp)(?:_\d+)*)?\b/i.test(raw))el.textContent=LABEL;
      });
    }catch(_){}
  }
  function hardlockDownloads(){
    try{
      const proto=HTMLAnchorElement.prototype;if(proto.click.__ceV10ExpVersionHardlock)return;const prev=proto.click;
      const wrapped=function(){try{if(this.download)this.download=normalizeName(this.download);}catch(_){}return prev.apply(this,arguments);};
      wrapped.__ceV10ExpVersionHardlock=true;proto.click=wrapped;
    }catch(_){}
  }
  let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(scrubVisible,20);};
  publish();hardlockDownloads();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{scrubVisible();hardlockDownloads();});else scrubVisible();
  try{new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});}catch(_){}
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:module-mounted'].forEach(ev=>root.addEventListener(ev,()=>setTimeout(scrubVisible,30)));
  root.ControlEventV10ExpVersion={LABEL,TEXT,FILE,BUILD,ZIP,normalizeName,scrubVisible};
})(window);

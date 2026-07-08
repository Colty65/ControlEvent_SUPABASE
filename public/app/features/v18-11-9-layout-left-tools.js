/* ControlEvent v18.11.10_prod - herramientas inferiores movidas a lateral izquierdo. */
(function(){
  'use strict';
  if(window.__ceV18119LeftTools) return; window.__ceV18119LeftTools=true;
  function install(){
    document.body.classList.add('ce-v18119-left-tools');
    if(document.getElementById('ceV18119LeftToolsStyle')) return;
    var st=document.createElement('style');
    st.id='ceV18119LeftToolsStyle';
    st.textContent = `
      body.ce-v18119-left-tools .footer{
        position:fixed!important;
        left:10px!important;
        top:155px!important;
        right:auto!important;
        bottom:auto!important;
        width:64px!important;
        height:auto!important;
        z-index:9990!important;
        background:transparent!important;
        border:0!important;
        box-shadow:none!important;
        padding:0!important;
        margin:0!important;
        pointer-events:none!important;
      }
      body.ce-v18119-left-tools .footer-inner,
      body.ce-v18119-left-tools.ce-v502-ready .footer-inner{
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:flex-start!important;
        gap:9px!important;
        max-width:none!important;
        width:64px!important;
        margin:0!important;
        padding:8px 5px!important;
        background:rgba(255,255,255,.86)!important;
        border:1px solid rgba(148,163,184,.45)!important;
        border-radius:18px!important;
        box-shadow:0 14px 34px rgba(15,23,42,.16)!important;
        pointer-events:auto!important;
        backdrop-filter:blur(4px);
      }
      body.ce-v18119-left-tools .footer .iconbtn,
      body.ce-v18119-left-tools.ce-v502-ready .footer .iconbtn{
        width:52px!important;
        height:52px!important;
        min-width:52px!important;
        min-height:52px!important;
        border-radius:16px!important;
        padding:4px!important;
        margin:0!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        pointer-events:auto!important;
      }
      body.ce-v18119-left-tools .footer-img,
      body.ce-v18119-left-tools .maint-footer-img,
      body.ce-v18119-left-tools.ce-v502-ready .footer-img,
      body.ce-v18119-left-tools.ce-v502-ready .maint-footer-img{
        width:44px!important;
        height:44px!important;
        object-fit:contain!important;
        pointer-events:none!important;
      }
      body.ce-v18119-left-tools .main{padding-left:82px!important;}
      @media(max-width:760px){
        body.ce-v18119-left-tools .footer{left:6px!important;top:116px!important;width:54px!important;}
        body.ce-v18119-left-tools .footer-inner{width:54px!important;gap:7px!important;padding:6px 4px!important;border-radius:16px!important;}
        body.ce-v18119-left-tools .footer .iconbtn{width:46px!important;height:46px!important;min-width:46px!important;min-height:46px!important;}
        body.ce-v18119-left-tools .footer-img,body.ce-v18119-left-tools .maint-footer-img{width:38px!important;height:38px!important;}
        body.ce-v18119-left-tools .main{padding-left:62px!important;}
      }
      @media print{body.ce-v18119-left-tools .footer{display:none!important}}
    `;
    document.head.appendChild(st);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:event-loaded'].forEach(function(evt){ window.addEventListener(evt,function(){ setTimeout(install,60); }); });
})();

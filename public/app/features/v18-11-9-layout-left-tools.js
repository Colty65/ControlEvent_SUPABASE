/* ControlEvent v21_prod - herramientas laterales izquierdas sin ficha, pequeñas y repartidas. */
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
        left:18px!important;
        top:150px!important;
        right:auto!important;
        bottom:auto!important;
        width:46px!important;
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
        gap:20px!important;
        max-width:none!important;
        width:46px!important;
        margin:0!important;
        padding:0!important;
        background:transparent!important;
        border:0!important;
        border-radius:0!important;
        box-shadow:none!important;
        pointer-events:auto!important;
        backdrop-filter:none!important;
      }
      body.ce-v18119-left-tools .footer .iconbtn,
      body.ce-v18119-left-tools.ce-v502-ready .footer .iconbtn{
        width:42px!important;
        height:42px!important;
        min-width:42px!important;
        min-height:42px!important;
        border-radius:14px!important;
        padding:0!important;
        margin:0!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        pointer-events:auto!important;
        background:transparent!important;
        border:0!important;
        box-shadow:none!important;
        outline:0!important;
        overflow:visible!important;
      }
      body.ce-v18119-left-tools .footer .iconbtn:hover,
      body.ce-v18119-left-tools.ce-v502-ready .footer .iconbtn:hover{
        transform:translateY(-1px)!important;
        filter:brightness(1.04)!important;
      }
      body.ce-v18119-left-tools .footer-img,
      body.ce-v18119-left-tools .maint-footer-img,
      body.ce-v18119-left-tools.ce-v502-ready .footer-img,
      body.ce-v18119-left-tools.ce-v502-ready .maint-footer-img{
        width:31px!important;
        height:31px!important;
        object-fit:contain!important;
        pointer-events:none!important;
        filter:drop-shadow(0 10px 16px rgba(15,23,42,.24))!important;
        border-radius:8px!important;
      }
      body.ce-v18119-left-tools .footer #btnExportExcel .footer-img,
      body.ce-v18119-left-tools.ce-v502-ready .footer #btnExportExcel .footer-img{
        width:31px!important;
        height:31px!important;
      }
      body.ce-v18119-left-tools .main{padding-left:78px!important;}
      @media(max-width:760px){
        body.ce-v18119-left-tools .footer{left:10px!important;top:118px!important;width:40px!important;}
        body.ce-v18119-left-tools .footer-inner{width:40px!important;gap:15px!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;}
        body.ce-v18119-left-tools .footer .iconbtn{width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important;background:transparent!important;border:0!important;box-shadow:none!important;}
        body.ce-v18119-left-tools .footer-img,body.ce-v18119-left-tools .maint-footer-img{width:28px!important;height:28px!important;}
        body.ce-v18119-left-tools .main{padding-left:58px!important;}
      }
      @media print{body.ce-v18119-left-tools .footer{display:none!important}}
    `;
    document.head.appendChild(st);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:event-loaded'].forEach(function(evt){ window.addEventListener(evt,function(){ setTimeout(install,60); }); });
})();

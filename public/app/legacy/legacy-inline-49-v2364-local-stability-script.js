/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #49. */
/* ==== v23.6.4 local: no precargar state pesado, no localStorage pesado, fotos como archivos ==== */
(function(){
  'use strict';
  const VERSION='ControlEvent v26.6';
  const SESSION_KEY='ControlEvent_v26_6_session';
  const $=id=>document.getElementById(id);
  const stateRef=()=>{ try{return state;}catch(_){return window.state||{};} };
  const eventId=()=>String(stateRef().selectedEventId||'');
  const imgKey=(label)=>{ try{return ticketImageStateKey(String(label||''), eventId());}catch(_){return `${eventId()}|${String(label||'')}`;} };
  function setVersion(){
    try{ document.title=VERSION; }catch(_){ }
    document.querySelectorAll('.appname-stack span').forEach(el=>{ if(/ControlEvent/i.test(el.textContent||'')) el.textContent=VERSION; });
  }
  function sessionSave(user){ try{ localStorage.setItem(SESSION_KEY, JSON.stringify(user||null)); }catch(_){ } }
  function sessionLoad(){ try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch(_){return null;} }
  function sessionClear(){ try{localStorage.removeItem(SESSION_KEY);}catch(_){ } }

  // Evita que la app vuelva a guardar/cargar todo el estado en localStorage.
  let saveTimer=null, saveBusy=false, saveQueued=false;
  function shallowCloneForServer(){
    const src=stateRef();
    const out={...src};
    const imgs={};
    Object.entries(src.ticketImages||{}).forEach(([k,v])=>{
      if(!v) return;
      if(typeof v==='string' && /^data:image\//.test(v)) return; // nunca enviar base64 al estado general
      if(typeof v==='string') imgs[k]=v;
      else if(v && typeof v==='object') imgs[k]=v.pathname||v.url||'';
    });
    out.ticketImages=imgs;
    delete out.__photoCache; delete out.ticketImagesBackup; delete out.ticketImagesLocal;
    return out;
  }
  async function pushState(){
    if(saveBusy){ saveQueued=true; return; }
    saveBusy=true;
    try{
      const res=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(shallowCloneForServer())});
      if(!res.ok) throw new Error(await res.text());
    }catch(e){ console.error('[v23.6.4] Error guardando estado:',e); }
    finally{ saveBusy=false; if(saveQueued){ saveQueued=false; setTimeout(pushState,300); } }
  }
  try{
    saveState=function(){
      if(!authUser || !(typeof canWriteRole==='function' && canWriteRole())) return;
      clearTimeout(saveTimer); saveTimer=setTimeout(pushState,550);
    };
    window.saveState=saveState;
  }catch(_){ }

  async function loadFreshState(){
    const res=await fetch('/api/state',{cache:'no-store'});
    if(!res.ok) throw new Error('No se pudo cargar /api/state');
    const serverState=await res.json();
    const s=stateRef();
    Object.keys(s).forEach(k=>delete s[k]);
    if(typeof mergeLoadedState==='function' && typeof defaultState==='function') Object.assign(s, mergeLoadedState(serverState, defaultState()));
    else Object.assign(s, serverState||{});
  }

  // Login conservador: no reconstruye pantalla, solo garantiza que entra y carga estado después.
  const oldDoLogin=typeof doLogin==='function'?doLogin:null;
  async function loginV2363(){
    const ident=String($('loginIdentificacion')?.value||'').trim();
    const clave=String($('loginClave')?.value||'');
    const err=$('authError'); if(err) err.textContent='';
    if(!ident||!clave){ if(err) err.textContent='Introduce identificación y clave.'; return false; }
    try{
      const res=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identificacion:ident,clave})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data.ok||!data.user) throw new Error(data.error||'Acceso no válido');
      await loadFreshState();
      authUser=data.user; window.authUser=data.user; sessionSave(data.user);
      try{ if(String(authUser.nivel||'')==='GD' && typeof fetchAccessUsers==='function') await fetchAccessUsers(); }catch(e){console.warn(e);}
      const c=$('loginClave'); if(c) c.value='';
      render();
      return false;
    }catch(e){ console.error('[v23.6.4] login',e); if(err) err.textContent=e.message||String(e); return false; }
  }
  try{ doLogin=loginV2363; window.doLogin=loginV2363; }catch(_){ window.doLogin=loginV2363; }
  document.addEventListener('click',function(ev){
    const t=ev.target;
    if(t && t.id==='btnLogin'){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); loginV2363(); return false; }
  },true);
  ['loginIdentificacion','loginClave'].forEach(id=>setTimeout(()=>{const el=$(id); if(el&&!el.__v2363){el.__v2363=true; el.disabled=false; el.readOnly=false; el.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault(); loginV2363();}});}},300));

  // Logout limpia sesión local ligera.
  const oldLogout=typeof logout==='function'?logout:null;
  if(oldLogout){ try{ logout=function(){ sessionClear(); return oldLogout.apply(this,arguments); }; window.logout=logout; }catch(_){ } }

  function fileToCompressedDataUrl(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(reader.error||new Error('No se pudo leer la foto'));
      reader.onload=()=>{
        const img=new Image();
        img.onerror=()=>reject(new Error('Imagen no válida'));
        img.onload=()=>{
          const max=1100; let w=img.width,h=img.height; const r=Math.min(max/w,max/h,1); w=Math.round(w*r); h=Math.round(h*r);
          const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h);
          resolve(canvas.toDataURL('image/jpeg',0.78));
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  async function uploadPhoto(label,file){
    if(!file) return;
    const key=imgKey(label);
    const dataUrl=await fileToCompressedDataUrl(file);
    const res=await fetch('/api/ticket-images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:eventId(),key,dataUrl})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.ok||!data.image) throw new Error(data.error||'No se pudo guardar la foto en servidor');
    const s=stateRef(); if(!s.ticketImages) s.ticketImages={};
    s.ticketImages[key]=data.image.pathname||data.image.url;
    saveState(); render();
  }
  function pickPhotoFor(label){
    const input=document.createElement('input'); input.type='file'; input.accept='image/*';
    input.onchange=()=>uploadPhoto(label,input.files&&input.files[0]).catch(e=>{alert(e.message||String(e)); console.error(e);});
    input.click();
  }
  async function removePhoto(label){
    const key=imgKey(label);
    try{ await fetch(`/api/ticket-images?eventId=${encodeURIComponent(eventId())}&key=${encodeURIComponent(key)}`,{method:'DELETE'}); }catch(e){console.warn(e);}
    const s=stateRef(); if(s.ticketImages) delete s.ticketImages[key];
    saveState(); render();
  }
  try{
    uploadTicketImage=function(evOrEncoded, maybeEncoded){
      // Compatible con onclick="uploadTicketImage(event,'...')" y con uploadTicketImage('...')
      if(evOrEncoded && evOrEncoded.target && evOrEncoded.target.files){
        const enc=maybeEncoded||''; const label=decodeURIComponent(enc); return uploadPhoto(label, evOrEncoded.target.files[0]).catch(e=>alert(e.message||String(e)));
      }
      const label=decodeURIComponent(String(evOrEncoded||'')); pickPhotoFor(label); return false;
    };
    window.uploadTicketImage=uploadTicketImage;
    window.uploadTicketImageV202=function(encoded){ pickPhotoFor(decodeURIComponent(String(encoded||''))); return false; };
    removeTicketImage=function(encoded){ removePhoto(decodeURIComponent(String(encoded||''))); return false; };
    window.removeTicketImage=removeTicketImage; window.removeTicketImageV202=removeTicketImage;
  }catch(_){ }

  // Diagnóstico sencillo en consola.
  window.__ceLocalDiag=async function(){
    const s=stateRef();
    const local={eventos:s.eventos?.length||0, ingresos:s.colaboradores?.length||0, compras:s.compras?.length||0, fotos:Object.keys(s.ticketImages||{}).length};
    let server={}; try{ server=await (await fetch('/api/diagnostics',{cache:'no-store'})).json(); }catch(e){server.error=String(e);}
    console.table(local); console.log(server); return {local,server};
  };

  // Reanudar sesión solo con usuario ligero; el estado se carga después.
  async function tryResume(){
    if(authUser) return;
    const u=sessionLoad(); if(!u) return;
    try{ await loadFreshState(); authUser=u; window.authUser=u; render(); }catch(e){ console.warn('[v23.6.4] No se pudo reanudar sesión',e); }
  }
  ['DOMContentLoaded','load'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(()=>{setVersion(); tryResume();},250),false));
  setTimeout(()=>{setVersion();},300);
})();

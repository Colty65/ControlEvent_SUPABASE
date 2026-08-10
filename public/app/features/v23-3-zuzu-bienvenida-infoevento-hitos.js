/* ControlEvent v27_prod_1.0 · bienvenida personalizada de Zuzu.
   Presenta el texto inicial en modo no editable, permite escucharlo con [Leer]
   y libera el campo al terminar la locución o al pulsar la escobita. */
(function(root){
  'use strict';
  if(root.__ceV23R6ZuzuBienvenida) return;
  root.__ceV23R6ZuzuBienvenida=true;

  const $=id=>document.getElementById(id);
  const clean=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
  function user(){
    const u=root.authUser || root.__CONTROL_EVENT_USER__ || root.ControlEventApp?.authUser || {};
    const visible=clean($('brandCurrentUserName')?.textContent || $('currentUserName')?.textContent || '');
    const nombre=clean(u.identificacion || u.Identificacion || u.usuario || u.user || u.nombre || u.Nombre || u.name || visible || 'Amigo');
    return nombre && !/sin acceso/i.test(nombre) ? nombre : 'Amigo';
  }
  function welcomeText(){
    return `Hola ${user()}, soy Zuzu, a ver si un día voy a veros por la peña, bueno, a lo que vamos. Si has llegado hasta aquí es que sientes curiosidad por lo que yo te pueda contar sobre nuestros eventos. Y así es, sé todo lo que se cuece en la peña desde el punto de vista de gestión, ya sean fiestas al uso, o solidarias como la ELA e incluso también el control presupuestario de la propia peña. Como habrás podido ver ya en las diferentes ventanas de consulta, la app Control Event ya te ofrece suficientes funciones como para ver una radiografía de cualquier evento registrado; no obstante, yo, el tío Zuzu, te ofrezco la posibilidad de hacerme una pregunta que se te ocurra ahora, que la app no te haya respondido, y yo te la respondo. Por ejemplo: dame la lista de personas asistentes al evento y las enumeras una por una; dame un informe completo de este evento; o dime el tiempo que hará en este otro evento, etcétera. Siempre preguntas relacionadas con nuestros eventos. No busco novias ni productos en Amazon; me limito al aprendizaje de estar con vosotros en la peña. Así que limpia con el botón de la escobita, teclea o habla para hacer la pregunta y, cuando lo consideres, pulsa Zuzu. Me pondré a buscar las cosas por ahí, entre lo negro, y en unos segundos te daré la respuesta. Muy fácil.`;
  }
  function style(){
    if($('ceV23R6ZuzuWelcomeStyle')) return;
    const node=document.createElement('style');
    node.id='ceV23R6ZuzuWelcomeStyle';
    node.textContent=`#ceAiPrompt.ce-zuzu-welcome-locked{min-height:260px!important;background:#fffaf0!important;color:#334155!important;border:2px solid #f59e0b!important;cursor:default!important;resize:none!important;line-height:1.48!important}#ceAiPrompt.ce-zuzu-welcome-locked:focus{outline:none!important;box-shadow:0 0 0 4px rgba(245,158,11,.12)!important}#ceAiRun[disabled],#ceVoz3Mic[disabled]{opacity:.45!important;cursor:not-allowed!important}`;
    document.head.appendChild(node);
  }
  function setControlState(active){
    const run=$('ceAiRun'), mic=$('ceVoz3Mic');
    if(run) run.disabled=!!active;
    if(mic){
      const canRecognize=typeof root.ControlEventV22Voz3?.supportsRecognition==='function'
        ? !!root.ControlEventV22Voz3.supportsRecognition()
        : !/iphone|ipad|ipod/i.test(navigator.userAgent||'');
      mic.disabled=!!active || !canRecognize;
    }
  }
  function readyCard(){
    const result=$('ceAiResult');
    if(result) result.innerHTML='<div class="ce-ai-card"><h3>Zuzu está listo</h3><div class="ce-ai-answer">Escribe una pregunta sobre los eventos y pulsa Zuzu.</div></div>';
  }
  function finishWelcome(reason){
    const prompt=$('ceAiPrompt');
    if(!prompt || prompt.getAttribute('data-ce-zuzu-welcome')!=='1') return;
    prompt.value='';
    prompt.textContent='';
    prompt.readOnly=false;
    prompt.removeAttribute('readonly');
    prompt.removeAttribute('aria-readonly');
    prompt.removeAttribute('data-ce-zuzu-welcome');
    prompt.classList.remove('ce-zuzu-welcome-locked');
    setControlState(false);
    readyCard();
    const status=$('ceVoz3Status');
    if(status) status.textContent=reason==='speech'?'Presentación terminada. Ya puedes teclear o hablar.':'Campo limpio. Ya puedes teclear o hablar.';
    try{ prompt.focus(); }catch(_){ }
  }
  function personalizeVisibleAnswer(){
    const answer=document.querySelector('#ceAiResult .ce-ai-answer');
    if(!answer) return;
    let text=String(answer.textContent||'');
    if(!text || /escribe una pregunta|zuzu está pensando|no se pudo/i.test(text)) return;
    const closing=`${user()}, soy tu amigo Zuzu, pregúntame lo que quieras.`;
    if(/soy tu amigo Zuzu,\s*pregúntame lo que quieras\.?\s*$/i.test(text)) return;
    if(/Pregúntame lo que quieras\.?\s*$/i.test(text)){
      text=text.replace(/Pregúntame lo que quieras\.?\s*$/i,closing);
      answer.textContent=text;
      if(root.__ceLastZuzuResult && typeof root.__ceLastZuzuResult.answer==='string') root.__ceLastZuzuResult.answer=text;
    }
  }
  function initialize(overlay){
    if(!overlay || overlay.getAttribute('data-ce-r6-welcome-ready')==='1') return;
    const prompt=$('ceAiPrompt');
    if(!prompt) return;
    overlay.setAttribute('data-ce-r6-welcome-ready','1');
    style();
    prompt.value=welcomeText();
    prompt.readOnly=true;
    prompt.setAttribute('readonly','readonly');
    prompt.setAttribute('aria-readonly','true');
    prompt.setAttribute('data-ce-zuzu-welcome','1');
    prompt.classList.add('ce-zuzu-welcome-locked');
    setControlState(true);
    const result=$('ceAiResult');
    if(result) result.innerHTML='<div class="ce-ai-card"><h3>Presentación de Zuzu</h3><div class="ce-ai-answer">La presentación está escrita arriba y se leerá automáticamente. Puedes repetirla con [Leer] o pulsar la escobita para empezar.</div></div>';

    const clear=$('ceAiClear');
    if(clear && !clear.__ceR6WelcomeBound){
      clear.__ceR6WelcomeBound=true;
      ['pointerup','touchend','click'].forEach(type=>clear.addEventListener(type,()=>setTimeout(()=>finishWelcome('clear'),0),{capture:true,passive:true}));
    }
    const status=$('ceVoz3Status');
    if(status && root.MutationObserver){
      const statusObserver=new MutationObserver(()=>{
        if(/lectura terminada/i.test(clean(status.textContent))) finishWelcome('speech');
      });
      statusObserver.observe(status,{childList:true,subtree:true,characterData:true});
      overlay.__ceR6StatusObserver=statusObserver;
    }
    const resultObserver=root.MutationObserver?new MutationObserver(personalizeVisibleAnswer):null;
    if(resultObserver && result){ resultObserver.observe(result,{childList:true,subtree:true,characterData:true}); overlay.__ceR6ResultObserver=resultObserver; }

    let attempts=0;
    const autoRead=()=>{
      attempts++;
      const read=$('ceVoz3Read');
      if(read){ read.click(); return; }
      if(attempts<12) setTimeout(autoRead,150);
    };
    setTimeout(autoRead,260);
  }
  function scan(){
    const overlay=$('ceGeminiLibreOverlay');
    if(overlay) initialize(overlay);
  }
  const observer=root.MutationObserver?new MutationObserver(scan):null;
  if(observer) observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',scan,{once:true});
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('#ceAiClear')) setTimeout(()=>finishWelcome('clear'),0);
    setTimeout(personalizeVisibleAnswer,50);
  },true);
  root.ControlEventV23R6ZuzuBienvenida={welcomeText,finishWelcome,scan};
})(window);

/* ControlEvent v30_prod · Zuzu sin mensaje de bienvenida.
   Módulo de compatibilidad: se conserva el nombre público por si algún código antiguo
   lo consulta, pero ya NO bloquea el textarea, NO reproduce locución y NO fuerza la escobita.
   La escobita queda reservada exclusivamente para iniciar una conversación nueva. */
(function(root){
  'use strict';
  if(root.__ceV23R6ZuzuBienvenida) return;
  root.__ceV23R6ZuzuBienvenida=true;
  function welcomeText(){ return ''; }
  function finishWelcome(){ /* compatibilidad intencionada: no hay bienvenida que finalizar */ }
  function scan(){ /* compatibilidad intencionada: la pantalla principal gestiona el estado */ }
  root.ControlEventV23R6ZuzuBienvenida={welcomeText:welcomeText,finishWelcome:finishWelcome,scan:scan,disabled:true};
})(window);

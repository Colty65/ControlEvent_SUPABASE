/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #35. */
/* ==== V21.3.2: helper global para comentarios Excel INFOEVENTO completo ==== */
var addCellNote = window.addCellNote || function(cell, text){
  if(!cell || !text) return;
  var noteText = String(text).replace(/\s*\n\s*/g, '\n');
  try{
    cell.note = {
      texts: [{ text: noteText }],
      margins: { insetmode: 'custom', inset: [0.20, 0.20, 0.60, 0.60] },
      protection: { locked: true, lockText: true },
      editAs: 'twoCells',
      width: 520,
      height: 220
    };
  }catch(_){
    try{ cell.note = noteText; }catch(__){}
  }
};
window.addCellNote = addCellNote;
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  function refreshVersionV2132(){
    try{ document.title = VERSION; }catch(_){ }
    try{
      document.querySelectorAll('.appname span,.appname-stack span').forEach(function(el){
        if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
      });
    }catch(_){ }
  }
  function normalizeDownloadNamesV2132(){
    try{
      const proto = HTMLAnchorElement.prototype;
      if(proto.click.__v2132Wrapped) return;
      const prev = proto.click;
      const wrapped = function(){
        try{
          if(this.download){
            this.download = String(this.download)
              .replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE)
              .replace(/[\\/:*?"<>|]+/g, '_')
              .replace(/_+\.xlsx$/i, '.xlsx');
          }
        }catch(_){ }
        return prev.apply(this, arguments);
      };
      wrapped.__v2132Wrapped = true;
      proto.click = wrapped;
    }catch(_){ }
  }
  function applyV2132(){ refreshVersionV2132(); normalizeDownloadNamesV2132(); }
  ['DOMContentLoaded','load'].forEach(function(evt){ window.addEventListener(evt, function(){ setTimeout(applyV2132, 100); setTimeout(applyV2132, 900); }); });
  applyV2132();
})();

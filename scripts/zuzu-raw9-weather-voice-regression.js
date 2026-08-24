import fs from 'node:fs';
const s=fs.readFileSync(new URL('../services/event-ai.service.js',import.meta.url),'utf8');
const tests=[
 ['weather scope admite rango ISO',/start_date:\{type:'string'[\s\S]*end_date:\{type:'string'/.test(s)],
 ['normalizador conserva rango',/out\.start_date=startDate[\s\S]*out\.end_date=endDate/.test(s)],
 ['weather tool usa rango solicitado',/requestedStart=parseCeDateToIso\(tool\?\.start_date[\s\S]*effectiveStart=requestedStart/.test(s)],
 ['ejecutor pasa fechas a Open-Meteo',/tool==='event_weather'[\s\S]*args\.start_date/.test(s)],
 ['suplemento pasa fechas',/start_date:trim\(frame\?\.scope\?\.start_date\)[\s\S]*end_date:trim\(frame\?\.scope\?\.end_date\)/.test(s)],
 ['Gemini debe emitir fechas explícitas',/Fecha\/rango explícito[\s\S]*start_date\/end_date ISO/.test(s)],
 ['weather base no duplica supplement',/if\(arr\(out\.query\.targets\)\.some\(t=>t\.domain==='weather'\)\)supplements=\[\]/.test(s)],
 ['voz monetaria trunca sin redondear',/SOLO la parte entera truncada hacia cero[\s\S]*PROHIBIDO redondear[\s\S]*PROHIBIDO leer céntimos/.test(s)],
 ['pantalla conserva decimales',/written_answer conserva siempre el importe exacto con sus decimales/.test(s)]
];
let bad=0;for(const [n,ok] of tests){console.log((ok?'OK':'KO')+' - '+n);if(!ok)bad++;}
if(bad)process.exit(1);console.log('ZUZU RAW9 WEATHER+VOICE: OK');

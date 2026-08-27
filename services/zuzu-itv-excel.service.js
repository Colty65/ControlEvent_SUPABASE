/* ControlEvent v4_0_exp · Importador XLSX de baterías ITV Zuzu.
   Lectura server-side para no cargar ExcelJS en navegadores modestos y para aceptar
   XLSX OOXML válidos aunque usen prefijos de namespace (p. ej. x:worksheet). */
import { inflateRawSync } from 'node:zlib';

const text=v=>v==null?'':String(v);
const trim=v=>text(v).trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0;};
const excelHeader=v=>trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'');
const xmlDecode=(v='')=>text(v).replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16))).replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(parseInt(d,10))).replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
function xmlAttr(attrs,name){const m=text(attrs).match(new RegExp(`(?:^|\\s)(?:[A-Za-z0-9_.-]+:)?${name}\\s*=\\s*["']([^"']*)["']`,'i'));return m?xmlDecode(m[1]):'';}
function xlsxColIndex(ref=''){const letters=(trim(ref).match(/^[A-Za-z]+/)||[])[0]||'';let n=0;for(const ch of letters.toUpperCase())n=n*26+(ch.charCodeAt(0)-64);return n;}
function xmlTagText(xml,tag){const hit=text(xml).match(new RegExp(`<(?:[A-Za-z0-9_.-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_.-]+:)?${tag}>`,'i'));return hit?xmlDecode(hit[1].replace(/<[^>]+>/g,'')):'';}
function sharedStringsFromXml(xml=''){
  const out=[],re=/<(?:[A-Za-z0-9_.-]+:)?si\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_.-]+:)?si>/gi;let m;
  while((m=re.exec(text(xml)))){const parts=[],tr=/<(?:[A-Za-z0-9_.-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_.-]+:)?t>/gi;let t;while((t=tr.exec(m[1])))parts.push(xmlDecode(t[1]));out.push(parts.join(''));}
  return out;
}
function worksheetRowsFromXml(xml='',shared=[]){
  const rows=[],rr=/<(?:[A-Za-z0-9_.-]+:)?row\b([^>]*)>([\s\S]*?)<\/(?:[A-Za-z0-9_.-]+:)?row>/gi;let rm;
  while((rm=rr.exec(text(xml)))){
    const rowNo=num(xmlAttr(rm[1],'r'))||rows.length+1,row={},cr=/<(?:[A-Za-z0-9_.-]+:)?c\b([^>]*)>([\s\S]*?)<\/(?:[A-Za-z0-9_.-]+:)?c>/gi;let cm;
    while((cm=cr.exec(rm[2]))){
      const ref=xmlAttr(cm[1],'r'),col=xlsxColIndex(ref);if(!col)continue;const type=xmlAttr(cm[1],'t').toLowerCase();let raw=type==='inlinestr'?xmlTagText(cm[2],'t'):xmlTagText(cm[2],'v'),value=raw;
      if(type==='s')value=shared[num(raw)]??'';else if(type==='b')value=raw==='1'?'TRUE':'FALSE';row[col]=trim(value);
    }
    rows.push({rowNo,cells:row});
  }
  return rows;
}
function normalizeWorksheetTarget(target=''){let t=trim(target).replace(/\\/g,'/');if(t.startsWith('/'))t=t.slice(1);if(t.startsWith('xl/'))return t;if(t.startsWith('worksheets/'))return `xl/${t}`;return t.includes('/')?`xl/${t.replace(/^\.\//,'')}`:`xl/worksheets/${t}`;}
function findEocd(buffer){for(let i=buffer.length-22;i>=Math.max(0,buffer.length-0x10016);i--)if(buffer.readUInt32LE(i)===0x06054b50)return i;return-1;}
function zipDirectory(buffer){
  const eocd=findEocd(buffer);if(eocd<0)throw new Error('No se encontró el directorio ZIP del XLSX.');
  const total=buffer.readUInt16LE(eocd+10),offset=buffer.readUInt32LE(eocd+16),entries=new Map();let p=offset;
  for(let i=0;i<total;i++){
    if(p+46>buffer.length||buffer.readUInt32LE(p)!==0x02014b50)throw new Error('Directorio ZIP XLSX dañado.');
    const method=buffer.readUInt16LE(p+10),compressedSize=buffer.readUInt32LE(p+20),uncompressedSize=buffer.readUInt32LE(p+24),nameLen=buffer.readUInt16LE(p+28),extraLen=buffer.readUInt16LE(p+30),commentLen=buffer.readUInt16LE(p+32),localOffset=buffer.readUInt32LE(p+42),name=buffer.subarray(p+46,p+46+nameLen).toString('utf8').replace(/^\//,'');
    entries.set(name,{method,compressedSize,uncompressedSize,localOffset});p+=46+nameLen+extraLen+commentLen;
  }
  return entries;
}
function zipRead(buffer,entries,name){
  const e=entries.get(name.replace(/^\//,''));if(!e)return null;const p=e.localOffset;if(p+30>buffer.length||buffer.readUInt32LE(p)!==0x04034b50)throw new Error(`Entrada ZIP inválida: ${name}`);
  const nameLen=buffer.readUInt16LE(p+26),extraLen=buffer.readUInt16LE(p+28),start=p+30+nameLen+extraLen,end=start+e.compressedSize;if(end>buffer.length)throw new Error(`Entrada ZIP truncada: ${name}`);const data=buffer.subarray(start,end);
  if(e.method===0)return Buffer.from(data);if(e.method===8)return inflateRawSync(data);throw new Error(`Método de compresión ZIP no soportado (${e.method}) en ${name}.`);
}
function zipText(buffer,entries,name){const b=zipRead(buffer,entries,name);return b?b.toString('utf8').replace(/^\uFEFF/,''):'';}

export async function parseZuzuBatteryExcel({dataBase64='',fileName=''}={}){
  const b64=trim(dataBase64);if(!b64){const e=new Error('El Excel está vacío.');e.status=422;throw e;}
  let buffer;try{buffer=Buffer.from(b64,'base64');}catch(_){const e=new Error('No se pudo decodificar el Excel.');e.status=422;throw e;}
  if(!buffer.length){const e=new Error('El Excel está vacío.');e.status=422;throw e;}if(buffer.length>8*1024*1024){const e=new Error('El Excel supera el máximo de 8 MB permitido para una batería ITV.');e.status=413;throw e;}
  let entries;try{entries=zipDirectory(buffer);}catch(error){const e=new Error(`No se ha podido abrir el Excel${fileName?` ${fileName}`:''}: ${error?.message||String(error)}`);e.status=422;throw e;}
  const workbookXml=zipText(buffer,entries,'xl/workbook.xml');if(!workbookXml){const e=new Error('El archivo no contiene un libro Excel válido.');e.status=422;throw e;}
  const relsXml=zipText(buffer,entries,'xl/_rels/workbook.xml.rels'),rels={};const relRe=/<(?:[A-Za-z0-9_.-]+:)?Relationship\b([^>]*?)\/?\s*>/gi;let rel;
  while((rel=relRe.exec(relsXml))){const id=xmlAttr(rel[1],'Id'),target=xmlAttr(rel[1],'Target');if(id&&target)rels[id]=normalizeWorksheetTarget(target);}
  const sheets=[],shRe=/<(?:[A-Za-z0-9_.-]+:)?sheet\b([^>]*?)\/?\s*>/gi;let sh;
  while((sh=shRe.exec(workbookXml))){const name=xmlAttr(sh[1],'name'),rid=xmlAttr(sh[1],'id');if(name)sheets.push({name,rid,target:rels[rid]||''});}
  let chosen=sheets.find(x=>excelHeader(x.name)==='PREGUNTAS')||sheets[0];if(!chosen)chosen={name:'PREGUNTAS',target:'xl/worksheets/sheet1.xml'};
  const sheetPath=chosen.target||'xl/worksheets/sheet1.xml',sheetXml=zipText(buffer,entries,sheetPath);if(!sheetXml){const e=new Error(`No se pudo localizar la hoja ${chosen.name||'PREGUNTAS'} en el Excel.`);e.status=422;throw e;}
  const shared=sharedStringsFromXml(zipText(buffer,entries,'xl/sharedStrings.xml')),rows=worksheetRowsFromXml(sheetXml,shared),headerRow=rows.find(x=>x.rowNo===1)||rows[0];if(!headerRow){const e=new Error('La hoja de preguntas está vacía.');e.status=422;throw e;}
  const headers={};for(const [col,val] of Object.entries(headerRow.cells)){const h=excelHeader(val);if(h)headers[h]=num(col);}const qCol=headers.PREGUNTA||headers.PROMPT||headers.PREGUNTAS;if(!qCol){const e=new Error('La primera fila debe contener una columna PREGUNTA.');e.status=422;throw e;}
  const seqCol=headers.SECUENCIA||headers.SEQ,groupCol=headers.GRUPO,labelCol=headers.ETIQUETA||headers.LABEL,expCol=headers.ESPERADO||headers.EXPECTED,scenarioCol=headers.ESCENARIO||headers.SCENARIO,questions=[];
  const col=(...names)=>{for(const n of names){const k=headers[excelHeader(n)];if(k)return k;}return 0;};
  const oracleCols={
    action:col('EXPECTED_ACTION','ACCION_ESPERADA'),domain:col('EXPECTED_DOMAIN','DOMINIO_ESPERADO'),ref:col('EXPECTED_REF','REFERENCIA_ESPERADA'),
    scopeKind:col('EXPECTED_SCOPE_KIND','SCOPE_ESPERADO','AMBITO_ESPERADO'),event:col('EXPECTED_EVENT','EVENTO_ESPERADO'),entity:col('EXPECTED_ENTITY','ENTIDAD_ESPERADA'),
    forbiddenEntity:col('FORBIDDEN_ENTITY','ENTIDAD_PROHIBIDA'),rows:col('EXPECTED_ROWS','FILAS_ESPERADAS'),minRows:col('MIN_ROWS','FILAS_MIN'),maxRows:col('MAX_ROWS','FILAS_MAX'),
    fields:col('EXPECTED_FIELDS','CAMPOS_ESPERADOS'),absentFields:col('ABSENT_FIELDS','CAMPOS_AUSENTES'),operations:col('EXPECTED_OPERATION','EXPECTED_OPERATIONS','OPERACION_ESPERADA'),
    responseKind:col('EXPECTED_RESPONSE_KIND','RESPUESTA_ESPERADA'),expectedStatus:col('EXPECTED_STATUS','ESTADO_ESPERADO'),chart:col('EXPECTED_CHART','GRAFICA_ESPERADA')
  };
  const jsonCol=col('ORACLE_JSON','ORACULO_JSON');
  for(const r of rows){
    if(r.rowNo===headerRow.rowNo)continue;const prompt=trim(r.cells[qCol]);if(!prompt)continue;
    let oracle=null;
    if(jsonCol&&trim(r.cells[jsonCol])){try{const parsed=JSON.parse(trim(r.cells[jsonCol]));if(parsed&&typeof parsed==='object')oracle=parsed;}catch(_){/* El validador de la batería mostrará que no hay oráculo estructural. */}}
    if(!oracle){const o={kind:'ledger-structural'};let has=false;for(const [k,c] of Object.entries(oracleCols)){if(!c)continue;let v=trim(r.cells[c]);if(!v)continue;has=true;if(['rows','minRows','maxRows'].includes(k))o[k]=Number(v);else if(k==='chart')o[k]=/^(?:1|true|si|sí|yes)$/i.test(v);else if(['fields','absentFields','operations','forbiddenEntity'].includes(k))o[k]=v.split(/\s*\|\s*/).filter(Boolean);else o[k]=v;}if(has)oracle=o;}
    const q={seq:seqCol?(num(r.cells[seqCol])||r.rowNo-1):r.rowNo-1,prompt,group:groupCol?trim(r.cells[groupCol]):'EXCEL',label:labelCol?trim(r.cells[labelCol]):'',expected:expCol?trim(r.cells[expCol]):'',scenario:scenarioCol?trim(r.cells[scenarioCol]):''};if(oracle)q.oracle=oracle;questions.push(q);
  }
  questions.sort((a,b)=>num(a.seq)-num(b.seq));if(!questions.length){const e=new Error('No se han encontrado preguntas debajo de la cabecera PREGUNTA.');e.status=422;throw e;}
  return {ok:true,fileName:trim(fileName),sheetName:trim(chosen.name||'PREGUNTAS'),questions};
}

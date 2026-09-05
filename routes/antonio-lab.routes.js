import express from 'express';
import {asyncHandler} from './_async.js';
import {antonioLabConfig,transcribeAntonioLab,createAntonioDiagnosticPdf,streamZuzuTts,createAntonioLiveToken} from '../services/antonio-lab.service.js';
const router=express.Router();
router.get('/antonio-lab/config',asyncHandler(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json(antonioLabConfig())}));
router.post('/antonio-lab/transcribe',asyncHandler(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json(await transcribeAntonioLab(req.body||{}))}));
router.post('/antonio-lab/live-token',asyncHandler(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json(await createAntonioLiveToken(req.body||{}))}));
router.post('/antonio-lab/tts-stream',asyncHandler(async(req,res)=>{
  const text=String(req.body?.text||'').trim();
  if(!text){res.status(400).json({ok:false,error:'Falta texto para la voz de Zuzu.'});return}
  res.status(200);
  res.setHeader('Content-Type','application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control','no-store, no-transform');
  res.setHeader('X-Accel-Buffering','no');
  res.flushHeaders?.();
  let closed=false;const upstream=new AbortController();
  const clientGone=()=>{if(res.writableEnded)return;closed=true;try{upstream.abort(new Error('cliente desconectado'))}catch{}};
  res.on('close',clientGone);
  try{
    if(!closed&&!res.destroyed)res.write(JSON.stringify({type:'start',transport:'interactions',model:'gemini-3.1-flash-tts-preview'})+'\n');
    const meta=await streamZuzuTts(text,chunk=>{if(closed||res.destroyed)return false;res.write(JSON.stringify({type:'audio',...chunk,rate:24000,channels:1,format:'s16le'})+'\n');return true},{signal:upstream.signal});
    if(!closed&&!res.destroyed)res.write(JSON.stringify({type:'done',...meta,rate:24000,channels:1,format:'s16le'})+'\n');
  }catch(error){if(!closed&&!res.destroyed)res.write(JSON.stringify({type:'error',error:String(error?.message||error)})+'\n')}
  if(!closed&&!res.destroyed&&!res.writableEnded)res.end();
}));
router.post('/antonio-lab/diagnostic-pdf',asyncHandler(async(req,res)=>{const pdf=createAntonioDiagnosticPdf(req.body||{}),stamp=new Date().toISOString().replace(/[:.]/g,'-');res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="Zuzu-LAB-V3-${stamp}.pdf"`);res.setHeader('Cache-Control','no-store');res.send(pdf)}));
export default router;

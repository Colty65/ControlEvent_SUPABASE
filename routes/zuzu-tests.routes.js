import express from 'express';
import { asyncHandler } from './_async.js';
import { assertGdActor, previewZuzuBattery, runZuzuTestCase, runSavedZuzuTestCase, runZuzuTestStream } from '../services/zuzu-test-lab.service.js';
import { saveZuzuTestRun, listZuzuTestRuns, getZuzuTestRun } from '../services/zuzu-test-history.service.js';

const router = express.Router();
function actorFromRequest(req){
  const raw=String(req.get('X-ControlEvent-Actor')||'').trim();
  if(!raw)return{};
  try{return JSON.parse(decodeURIComponent(raw));}catch(_){return{};}
}


router.get('/zuzu-tests/history', asyncHandler(async (req,res)=>{
  await assertGdActor(actorFromRequest(req));
  res.json(await listZuzuTestRuns(req.query?.limit));
}));

router.get('/zuzu-tests/history/:runKey', asyncHandler(async (req,res)=>{
  await assertGdActor(actorFromRequest(req));
  res.json(await getZuzuTestRun(req.params.runKey));
}));

router.post('/zuzu-tests/history', asyncHandler(async (req,res)=>{
  const actor=await assertGdActor(actorFromRequest(req));
  res.json(await saveZuzuTestRun(req.body||{},actor));
}));

router.post('/zuzu-tests/history/:runKey/run-case', async (req,res,next)=>{
  try{
    await assertGdActor(actorFromRequest(req));
    const hist=await getZuzuTestRun(req.params.runKey),run=hist?.run||{},mode=String(req.body?.mode||'').toUpperCase();
    const cases=run?.generatedBattery?.cases?.[mode];
    const savedCase=Array.isArray(cases)?cases.find(c=>String(c?.id||'')===String(req.body?.caseId||'')):null;
    if(!savedCase){const e=new Error('La pregunta histórica no está disponible en esta batería.');e.status=404;throw e;}
    const controller=new AbortController();req.on('aborted',()=>controller.abort());res.on('close',()=>{if(!res.writableEnded)controller.abort();});
    const result=await runSavedZuzuTestCase({mode,savedCase,conversationState:req.body?.conversationState||{},signal:controller.signal});
    if(!res.writableEnded)res.json(result);
  }catch(error){if(error?.name==='AbortError'&&res.headersSent)return;next(error);}
});

router.get('/zuzu-tests/preview', asyncHandler(async (req,res)=>{
  await assertGdActor(actorFromRequest(req));
  res.json(await previewZuzuBattery({seed:req.query?.seed}));
}));

router.post('/zuzu-tests/run-case', async (req,res,next)=>{
  try{
    await assertGdActor(actorFromRequest(req));
    const controller=new AbortController();
    req.on('aborted',()=>controller.abort());
    res.on('close',()=>{if(!res.writableEnded)controller.abort();});
    const result=await runZuzuTestCase({mode:req.body?.mode,caseId:req.body?.caseId,conversationState:req.body?.conversationState||{},seed:req.body?.seed,signal:controller.signal});
    if(!res.writableEnded)res.json(result);
  }catch(error){if(error?.name==='AbortError'&&res.headersSent)return;next(error);}
});

router.post('/zuzu-tests/run-stream', async (req,res,next)=>{
  try{
    await assertGdActor(actorFromRequest(req));
    res.status(200);
    res.setHeader('Content-Type','application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');
    res.setHeader('X-Accel-Buffering','no');
    res.flushHeaders?.();
    const controller=new AbortController();
    res.on('close',()=>{ if(!res.writableEnded) controller.abort(); });
    const send=payload=>{ if(!res.writableEnded){res.write(`${JSON.stringify(payload)}\n`);res.flush?.();} };
    const keepAlive=setInterval(()=>send({type:'keepalive',at:new Date().toISOString()}),10000);
    try{
      await runZuzuTestStream({
        mode:req.body?.mode||'FAST',
        maxCostEur:req.body?.maxCostEur,
        maxCases:req.body?.maxCases,
        caseIds:req.body?.caseIds,
        seed:req.body?.seed,
        send,
        signal:controller.signal
      });
    }finally{clearInterval(keepAlive);}
    if(!res.writableEnded)res.end();
  }catch(error){
    if(res.headersSent){try{res.write(`${JSON.stringify({type:'error',error:error?.message||String(error)})}\n`);res.end();}catch(_){ }return;}
    next(error);
  }
});

export default router;

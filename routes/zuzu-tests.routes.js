import express from 'express';
import { asyncHandler } from './_async.js';
import { assertGdActor, previewZuzuBattery, runZuzuTestCase, runZuzuTestStream } from '../services/zuzu-test-lab.service.js';

const router = express.Router();
function actorFromRequest(req){
  const raw=String(req.get('X-ControlEvent-Actor')||'').trim();
  if(!raw)return{};
  try{return JSON.parse(decodeURIComponent(raw));}catch(_){return{};}
}

router.get('/zuzu-tests/preview', asyncHandler(async (req,res)=>{
  await assertGdActor(actorFromRequest(req));
  res.json(await previewZuzuBattery());
}));

router.post('/zuzu-tests/run-case', async (req,res,next)=>{
  try{
    await assertGdActor(actorFromRequest(req));
    const controller=new AbortController();
    req.on('aborted',()=>controller.abort());
    res.on('close',()=>{if(!res.writableEnded)controller.abort();});
    const result=await runZuzuTestCase({mode:req.body?.mode,caseId:req.body?.caseId,conversationState:req.body?.conversationState||{},signal:controller.signal});
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

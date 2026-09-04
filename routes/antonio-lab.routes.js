import express from 'express';
import {asyncHandler} from './_async.js';
import {antonioLabConfig,antonioAgentHealth,createAntonioConversationToken,createAntonioDiagnosticPdf} from '../services/antonio-lab.service.js';
const router=express.Router();
router.get('/antonio-lab/config',asyncHandler(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json(antonioLabConfig());}));
router.get('/antonio-lab/health',asyncHandler(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json(await antonioAgentHealth());}));
router.post('/antonio-lab/conversation-token',asyncHandler(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json(await createAntonioConversationToken());}));
router.post('/antonio-lab/diagnostic-pdf',asyncHandler(async(req,res)=>{
  const pdf=createAntonioDiagnosticPdf(req.body||{});
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition',`attachment; filename="Antonio-LAB-diagnostico-${stamp}.pdf"`);
  res.setHeader('Cache-Control','no-store');
  res.send(pdf);
}));
export default router;

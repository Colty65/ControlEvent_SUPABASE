import express from 'express';
import {asyncHandler} from './_async.js';
import {antonioLabConfig,transcribeAntonioLab,createAntonioDiagnosticPdf} from '../services/antonio-lab.service.js';
const router=express.Router();
router.get('/antonio-lab/config',asyncHandler(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json(antonioLabConfig())}));
router.post('/antonio-lab/transcribe',asyncHandler(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json(await transcribeAntonioLab(req.body||{}))}));
router.post('/antonio-lab/diagnostic-pdf',asyncHandler(async(req,res)=>{const pdf=createAntonioDiagnosticPdf(req.body||{}),stamp=new Date().toISOString().replace(/[:.]/g,'-');res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="Antonio-LAB-V3-${stamp}.pdf"`);res.setHeader('Cache-Control','no-store');res.send(pdf)}));
export default router;

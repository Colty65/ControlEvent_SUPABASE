import express from 'express';
import {asyncHandler} from './_async.js';
import {antonioLabConfig,createAntonioLabSpeakToken,createAntonioLabTranscribeToken} from '../services/antonio-lab.service.js';
const router=express.Router();
router.get('/antonio-lab/config',asyncHandler(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json(antonioLabConfig());}));
router.post('/antonio-lab/ear-token',asyncHandler(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json(await createAntonioLabTranscribeToken());}));
router.post('/antonio-lab/mouth-token',asyncHandler(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json(await createAntonioLabSpeakToken());}));
export default router;

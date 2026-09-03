import express from 'express';
import { asyncHandler } from './_async.js';
import {
  closePurchaseSettlement,
  createPurchaseCashMovement,
  deletePurchaseCashMovement,
  listPurchaseSettlements,
  reopenPurchaseSettlement,
  updatePurchaseCashMovement
} from '../services/purchase-settlements.service.js';

const router=express.Router();
function actorFrom(req){
  const raw=String(req.get('X-ControlEvent-Actor')||'').trim();
  if(!raw)return {};
  try{return JSON.parse(decodeURIComponent(raw));}catch(_){try{return JSON.parse(raw);}catch(__){return {};}}
}
router.get('/purchase-settlements',asyncHandler(async(req,res)=>res.json(await listPurchaseSettlements(req.query.eventId||req.query.event_id,actorFrom(req)))));
router.post('/purchase-settlements/movements',asyncHandler(async(req,res)=>res.json(await createPurchaseCashMovement(req.body||{},actorFrom(req)))));
router.put('/purchase-settlements/movements/:id',asyncHandler(async(req,res)=>res.json(await updatePurchaseCashMovement(req.params.id,req.body||{},actorFrom(req)))));
router.delete('/purchase-settlements/movements/:id',asyncHandler(async(req,res)=>res.json(await deletePurchaseCashMovement(req.params.id,req.query.eventId||req.body?.eventId,actorFrom(req)))));
router.post('/purchase-settlements/close',asyncHandler(async(req,res)=>res.json(await closePurchaseSettlement(req.body||{},actorFrom(req)))));
router.patch('/purchase-settlements/:id/reopen',asyncHandler(async(req,res)=>res.json(await reopenPurchaseSettlement(req.params.id,req.body?.eventId||req.query.eventId,actorFrom(req)))));
export default router;

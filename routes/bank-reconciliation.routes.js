import express from 'express';
import { asyncHandler } from './_async.js';
import {
  addTicketLink,
  deleteTicketLink,
  exportBankData,
  importBankCsv,
  listBankReconciliation,
  listPaidTickets,
  setMovementIncluded
} from '../services/bank-reconciliation.service.js';

const router = express.Router();

function actorFrom(req){
  const raw = String(req.get('X-ControlEvent-Actor') || '');
  if(!raw) return {};
  try{ return JSON.parse(decodeURIComponent(raw)); }catch(_){
    try{ return JSON.parse(raw); }catch(__){ return {}; }
  }
}
function requireGd(req){
  const actor = actorFrom(req);
  if(String(actor.nivel || actor.Nivel || '').toUpperCase() !== 'GD'){
    const err = new Error('Cuadre Banco es una opción exclusiva para usuarios GD.');
    err.status = 403;
    err.code = 'BANK_GD_ONLY';
    throw err;
  }
  return actor;
}

router.get('/bank-reconciliation', asyncHandler(async (req,res) => {
  requireGd(req);
  res.json(await listBankReconciliation({accountId:req.query.accountId}));
}));
router.get('/bank-reconciliation/paid-tickets', asyncHandler(async (req,res) => {
  requireGd(req);
  res.json(await listPaidTickets({movementId:req.query.movementId,q:req.query.q}));
}));
router.get('/bank-reconciliation/export', asyncHandler(async (req,res) => {
  requireGd(req);
  res.json(await exportBankData({accountId:req.query.accountId,eventId:req.query.eventId}));
}));
router.post('/bank-reconciliation/import', asyncHandler(async (req,res) => {
  const actor = requireGd(req);
  res.json(await importBankCsv(req.body || {}, actor));
}));
router.patch('/bank-reconciliation/movements/:id', asyncHandler(async (req,res) => {
  requireGd(req);
  res.json(await setMovementIncluded(req.params.id, req.body?.included));
}));
router.post('/bank-reconciliation/movements/:id/tickets', asyncHandler(async (req,res) => {
  const actor = requireGd(req);
  res.json(await addTicketLink(req.params.id, req.body || {}, actor));
}));
router.delete('/bank-reconciliation/ticket-links/:id', asyncHandler(async (req,res) => {
  requireGd(req);
  res.json(await deleteTicketLink(req.params.id));
}));

export default router;

import express from 'express';
import { asyncHandler } from './_async.js';
import {
  addTicketLink,
  assertBankEventWritable,
  deleteTicketLink,
  exportBankData,
  importBankCsv,
  listBankReconciliation,
  listPaidTickets,
  setMovementForced,
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
function requireBankRole(req){
  const actor = actorFrom(req);
  const role = String(actor.nivel || actor.Nivel || '').toUpperCase();
  if(!['GD','RW'].includes(role)){
    const err = new Error('Cuadre Banco está disponible para usuarios GD y RW.');
    err.status = 403;
    err.code = 'BANK_ROLE_FORBIDDEN';
    throw err;
  }
  return actor;
}
function eventIdFrom(req){
  return String(req.query.eventId || req.body?.eventId || '').trim();
}

router.get('/bank-reconciliation', asyncHandler(async (req,res) => {
  requireBankRole(req);
  res.json(await listBankReconciliation({accountId:req.query.accountId,eventId:req.query.eventId}));
}));
router.get('/bank-reconciliation/paid-tickets', asyncHandler(async (req,res) => {
  requireBankRole(req);
  res.json(await listPaidTickets({movementId:req.query.movementId,eventId:req.query.eventId,q:req.query.q}));
}));
router.get('/bank-reconciliation/export', asyncHandler(async (req,res) => {
  requireBankRole(req);
  res.json(await exportBankData({accountId:req.query.accountId,eventId:req.query.eventId}));
}));
router.post('/bank-reconciliation/import', asyncHandler(async (req,res) => {
  const actor = requireBankRole(req);
  await assertBankEventWritable(eventIdFrom(req));
  res.json(await importBankCsv(req.body || {}, actor));
}));
router.patch('/bank-reconciliation/movements/:id', asyncHandler(async (req,res) => {
  requireBankRole(req);
  await assertBankEventWritable(eventIdFrom(req));
  res.json(await setMovementIncluded(req.params.id, req.body?.included));
}));
router.patch('/bank-reconciliation/movements/:id/forced', asyncHandler(async (req,res) => {
  requireBankRole(req);
  const eventId = eventIdFrom(req);
  await assertBankEventWritable(eventId);
  res.json(await setMovementForced(req.params.id,eventId,req.body?.forced === true));
}));
router.post('/bank-reconciliation/movements/:id/tickets', asyncHandler(async (req,res) => {
  const actor = requireBankRole(req);
  await assertBankEventWritable(eventIdFrom(req));
  res.json(await addTicketLink(req.params.id, req.body || {}, actor));
}));
router.delete('/bank-reconciliation/ticket-links/:id', asyncHandler(async (req,res) => {
  requireBankRole(req);
  const eventId = eventIdFrom(req);
  await assertBankEventWritable(eventId);
  res.json(await deleteTicketLink(req.params.id,eventId));
}));

export default router;

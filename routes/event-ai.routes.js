import express from 'express';
import { asyncHandler } from './_async.js';
import { runZuzuUserTurn, planificacionInicialZuzu, readZuzuLedgerTurnPresentation } from '../services/event-ai.service.js';
import { classifyZuzuShadow } from '../services/zuzu-router-shadow.service.js';
import { readZuzuConversation, listZuzuConversations } from '../services/zuzu-conversation-ledger.service.js';

const router = express.Router();

router.post('/event-ai/analyze', asyncHandler(async (req, res) => {
  res.json(await runZuzuUserTurn(req.body || {}));
}));


router.post('/event-ai/conversations/read', asyncHandler(async (req,res)=>{
  const body=req.body||{};res.json({ok:true,data:await readZuzuConversation({conversationId:body.conversationId,actor:body.usuarioLogado||body.user||body.authUser||body.ce_acceso||{},limit:body.limit||100})});
}));
router.post('/event-ai/conversations/list', asyncHandler(async (req,res)=>{
  const body=req.body||{};res.json({ok:true,conversations:await listZuzuConversations({actor:body.usuarioLogado||body.user||body.authUser||body.ce_acceso||{},limit:body.limit||40})});
}));
router.post('/event-ai/conversations/turn', asyncHandler(async (req,res)=>{
  const body=req.body||{};const data=await readZuzuLedgerTurnPresentation({turnId:body.turnId,actor:body.usuarioLogado||body.user||body.authUser||body.ce_acceso||{}});if(!data)return res.status(404).json({ok:false,error:'Turno Zuzu no encontrado.'});res.json({ok:true,data});
}));

// v3_0_exp · nueva arquitectura en SOMBRA: clasifica la misma pregunta, pero NO interviene
// en la respuesta actual ni consulta/modifica datos de ControlEvent. La UI la ejecuta después
// de recibir la respuesta principal para no añadir latencia ni riesgo al Zuzu vigente.
router.post('/event-ai/router-shadow', asyncHandler(async (req, res) => {
  res.json(await classifyZuzuShadow(req.body || {}));
}));

router.post('/event-ai/planificacion-propuesta', asyncHandler(async (req, res) => {
  res.json(await planificacionInicialZuzu(req.body || {}));
}));

export default router;

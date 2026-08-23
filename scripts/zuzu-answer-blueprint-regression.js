import assert from 'node:assert/strict';
import { __zuzuStructuralTesting as Z } from '../services/event-ai.service.js';

const {
  v73NormalizePlan,
  v73NormalizeAnswerBlueprint,
  v73BuildAnswerPayload,
  v73RenderAnswerBlueprint,
  v73ComposeAnswer,
  v73StripRecallPreamble
}=Z;

const rows=[{Evento:'SySA 2026',Producto:'PAN (Barra)',Responsable:'Vicente',Importe:100}];
const dataset={
  domain:'purchases',scope:{kind:'named_event',event:'SySA 2026'},columns:Object.keys(rows[0]),rows,
  provenance:{source_args:{frame:{domain:'purchases',scope:{kind:'named_event',event:'SySA 2026'},filters:{responsible:'Vicente',product_text:'PAN'}}}}
};
const ws={row_count:1,aggregate:{total_amount:100},row_cache:{rows,columns:Object.keys(rows[0])}};
const view={visibleFields:['Evento','Producto','Responsable','Importe']};

const plan=v73NormalizePlan({
  action:'query',response_kind:'amount',
  answer_blueprint:{template:'En total, nos hemos gastado {amount} en {product} para {event}.'},
  query:{domain:'purchases',scope:{kind:'named_event',event:'SySA 2026'},product:{text:'PAN',match:'family'}}
});
assert.equal(plan.answer_blueprint.template,'En total, nos hemos gastado {amount} en {product} para {event}.');

assert.equal(v73NormalizeAnswerBlueprint({template:'Ya son 100 €.'},'amount'),undefined,'un molde con cifras/hechos debe rechazarse');
assert.equal(v73NormalizeAnswerBlueprint({template:'Sobre {person}, te cuento algo.'},'amount'),undefined,'amount debe contener {amount}');
assert.equal(v73NormalizeAnswerBlueprint({template:'Resultado {unknown}.'},'summary'),undefined,'placeholder desconocido debe rechazarse');

const payload=v73BuildAnswerPayload('amount','He preparado 1 registro.',ws,dataset,view,plan);
assert.equal(payload.kind,'amount');
assert.equal(payload.amount,'100,00 €');
assert.equal(payload.product,'PAN');
assert.equal(payload.event,'SySA 2026');
const rendered=v73RenderAnswerBlueprint(plan.answer_blueprint,payload,'FALLBACK');
assert.equal(rendered,'En total, nos hemos gastado 100,00 € en PAN para SySA 2026.');

const whetherPlan=v73NormalizePlan({action:'query',response_kind:'whether',answer_blueprint:{yes_template:'Sí, {person} aparece en los datos.',no_template:'No, {person} no aparece en los datos.'},query:{domain:'purchases',scope:{kind:'all_events'},responsible:'Vicente'}});
const yesPayload=v73BuildAnswerPayload('whether','canon',ws,dataset,view,whetherPlan);
assert.equal(yesPayload.value,true);
assert.equal(v73RenderAnswerBlueprint(whetherPlan.answer_blueprint,yesPayload,'fallback'),'Sí, Vicente aparece en los datos.');
const noPlan={...whetherPlan,query:{...whetherPlan.query,responsible:'Pocholo'}};
const noPayload=v73BuildAnswerPayload('whether','canon',ws,dataset,view,noPlan);
assert.equal(noPayload.value,false,'whether debe comprobar el sujeto real, no solo row_count>0');
assert.equal(v73RenderAnswerBlueprint(whetherPlan.answer_blueprint,noPayload,'fallback'),'No, Pocholo no aparece en los datos.');

const composed=v73ComposeAnswer(plan,'He preparado 1 registro.',ws,dataset,view,{preamble:'Ahora recuerdo **Colty**, el pasado domingo, conversamos sobre compras.'});
assert.equal(composed.used_blueprint,true);
assert.match(composed.text,/100,00 €/);
assert.match(composed.text,/Ahora recuerdo/);

const duplicated='Ahora recuerdo **Colty**, el pasado domingo veintitrés de agosto de dos mil veintiséis, conversamos sobre Dossier personal · Pocholo. Ahora recuerdo **Colty**, el pasado domingo veintitrés de agosto de dos mil veintiséis, conversamos sobre Dossier personal · Pocholo. He preparado el dossier.';
const stripped=v73StripRecallPreamble(duplicated);
assert.equal(stripped,'He preparado el dossier.');

console.log('ZUZU ANSWER BLUEPRINT / PAYLOAD: OK');

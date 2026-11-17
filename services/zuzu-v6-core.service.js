/* Generic cognitive core for Zuzu v6.
   IMPORTANT: this module must remain domain-agnostic and language-pattern free.
   Domain identifiers are DATA supplied in domain_manifest; they are never encoded
   into the Gemini response schema. */

const arr=v=>Array.isArray(v)?v:[];
const text=v=>v==null?'':String(v);
const trim=v=>text(v).trim();

export const V6_CORE_VERSION='6.1-universal-contract-1';
export const V6_CORE_PRIMITIVES=['FETCH','FILTER','SORT_LIMIT','VISUALIZE'];
export const V6_CORE_KNOWN_OPERATIONS=['NONE','FETCH','FILTER','SORT_LIMIT','VISUALIZE','JOIN','AGGREGATE','DERIVE'];

function unique(xs=[]){return [...new Set(arr(xs).map(trim).filter(Boolean))];}

export function validateV6DomainManifest(manifest={}){
  if(!manifest || typeof manifest!=='object') throw new Error('Domain manifest missing.');
  if(!trim(manifest.id)) throw new Error('Domain manifest id missing.');
  const entities=manifest.entities||{};
  if(!Object.keys(entities).length) throw new Error('Domain manifest has no entities.');
  for(const [name,def] of Object.entries(entities)){
    if(!trim(name)) throw new Error('Domain entity name missing.');
    if(!arr(def?.fields).length) throw new Error(`Domain entity ${name} has no fields.`);
  }
  return manifest;
}

export function buildV6GenericSystemPrompt(manifest={}){
  validateV6DomainManifest(manifest);
  const supported=unique(manifest?.capabilities?.supported||V6_CORE_PRIMITIVES);
  const unavailable=unique(manifest?.capabilities?.unavailable||V6_CORE_KNOWN_OPERATIONS.filter(x=>x!=='NONE'&&!supported.includes(x)));
  const assistant=trim(manifest?.assistant?.name)||'Assistant';
  const product=trim(manifest?.assistant?.product)||trim(manifest?.label)||trim(manifest?.id);
  const generalKnowledge=manifest?.policies?.allow_general_knowledge!==false;
  return `# GENERIC COGNITIVE CORE ${V6_CORE_VERSION}\n\nROLE\n- You are ${assistant}, the conversational intelligence of ${product}.\n- You are the only component that interprets natural language.\n- The host application validates structure, executes declared capabilities mechanically, and returns certified evidence.\n- The generic core never classifies user text with local linguistic rules.\n\nDOMAIN MANIFEST\n- domain_manifest is runtime DATA describing entities, fields, relationships, capabilities and limits for this deployment.\n- Domain identifiers are opaque IDs. Read them from domain_manifest; never invent them.\n- The response contract is universal and does not enumerate domain IDs.\n\nGROUNDING\n- Domain facts may only come from certified context: meta, actor, threads_graph, evidence_ledger.key_facts, recent_dialogue and resolved_materials.\n- semantic_summary is navigational metadata only; it does not authorize factual detail.\n- A factual domain reply must cite its evidence IDs in assistant_response.provenance_evidence_ids.\n- If certified material is insufficient, say so naturally or request an allowed capability.\n${generalKnowledge?'- Questions that do not depend on private/domain data may be answered from general model knowledge. Do not fabricate domain facts.\n- A non-domain question must remain a valid conversational turn and must not be forced into a domain execution.\n':'- General knowledge outside the declared domain is disabled; explain that limitation naturally.\n'}\nCONVERSATION\n- Use threads_graph and recent_dialogue to preserve referents, corrections, topic switches and returns.\n- Thread actions are structural: MAINTAIN, SWITCH, OPEN_NEW, CLOSE.\n- Do not ask the user to repeat information already present in certified context.\n\nEXECUTION STATES\n- NO_ACTION_REQUIRED: answer can be completed without a new domain execution.\n- EXECUTE_DATA: new certified domain data is required. reply must be null.\n- EXECUTE_UI: only an existing certified dataset/view is transformed.\n- NEED_MATERIALS: a listed evidence exists but full certified rows are required.\n\nCAPABILITIES\n- Supported in this deployment: ${supported.join(', ')||'none'}.\n- Declared unavailable in this deployment: ${unavailable.join(', ')||'none'}.\n- capability_assessment.required_operation expresses the highest-level operation required by the goal.\n- capability_assessment.supported reflects domain_manifest.capabilities.\n- If that operation is unavailable, return NO_ACTION_REQUIRED with a natural explanation. Do not emulate it by dumping raw rows and computing in the model.\n\nPIPELINE INVARIANTS\n- EXECUTE_DATA begins with FETCH.\n- Use entity_name and field IDs exactly as declared in domain_manifest.\n- The host validates every returned ID against the manifest before execution.\n- The host executes deterministic transformations.\n- In SYNTHESIS phase, resolved_materials is authoritative. Close with NO_ACTION_REQUIRED.\n- Certified row order and scalar values are immutable during synthesis.\n\nOUTPUT\n- Return only JSON conforming to the native universal response schema.\n- No markdown wrapper, no function calling, no text outside JSON.`;
}

// IMPORTANT: this schema is intentionally independent of the number/names of
// domain entities and fields. Domain validity is checked mechanically after
// Gemini returns the universal AST.
function universalThreadSchema({synthesis=false}={}){
  return {type:'object',required:['action'],additionalProperties:false,properties:{
    action:{type:'string',enum:synthesis?['MAINTAIN']:['MAINTAIN','SWITCH','OPEN_NEW','CLOSE']},
    target_thread_id:{type:['string','null']},updated_goal:{type:'string'},
    focus_entities:{type:'array',maxItems:8,items:{type:'object',required:['id','type'],additionalProperties:false,properties:{id:{type:'string'},type:{type:'string'}}}}
  }};
}
function universalConditionSchema(){return {type:'object',required:['field','operator','value'],additionalProperties:false,properties:{field:{type:'string'},operator:{type:'string',enum:['EQUALS','NOT_EQUALS','GT','GTE','LT','LTE','IN','CONTAINS','IS_NULL','IS_NOT_NULL']},value:{anyOf:[{type:'string'},{type:'number'},{type:'boolean'},{type:'null'},{type:'array',maxItems:20,items:{anyOf:[{type:'string'},{type:'number'},{type:'boolean'},{type:'null'}]}}]}}};}
function universalPipelineNodeSchema(){return {type:'object',required:['primitive','params'],additionalProperties:false,properties:{
  primitive:{type:'string',enum:['FETCH','FILTER','SORT_LIMIT','VISUALIZE']},
  params:{type:'object',additionalProperties:false,properties:{
    entity_name:{type:'string'},projections:{type:'array',maxItems:24,items:{type:'string'}},
    logical_operator:{type:'string',enum:['AND','OR']},conditions:{type:'array',maxItems:12,items:universalConditionSchema()},
    sort_by:{type:'array',maxItems:8,items:{type:'object',required:['field','direction'],additionalProperties:false,properties:{field:{type:'string'},direction:{type:'string',enum:['ASC','DESC']}}}},
    limit:{type:'integer'},offset:{type:'integer'},
    view_type:{type:'string',enum:['table','bar_chart','pie_chart','line_chart','kpi_card','timeline','kanban']},title:{type:'string'},
    mappings:{type:'object',additionalProperties:false,properties:{dimension_x:{type:'string'},dimension_y:{type:'string'},series:{type:'string'},status_field:{type:'string'}}}
  }}
}};}
function universalContractSchema({synthesis=false}={}){
  return {type:'object',required:['thread_mutation','capability_assessment','execution_intent','assistant_response'],additionalProperties:false,properties:{
    thread_mutation:universalThreadSchema({synthesis}),
    capability_assessment:{type:'object',required:['required_operation','supported'],additionalProperties:false,properties:{required_operation:{type:'string',enum:V6_CORE_KNOWN_OPERATIONS},supported:{type:'boolean'}}},
    execution_intent:{type:'object',required:['status','pipeline','required_materials','source_evidence_id'],additionalProperties:false,properties:{
      status:{type:'string',enum:synthesis?['NO_ACTION_REQUIRED']:['NO_ACTION_REQUIRED','EXECUTE_DATA','EXECUTE_UI','NEED_MATERIALS']},
      pipeline:{type:'array',maxItems:synthesis?0:8,items:universalPipelineNodeSchema()},
      required_materials:{type:'array',maxItems:synthesis?0:8,items:{type:'string'}},
      source_evidence_id:{type:['string','null']}
    }},
    assistant_response:{type:'object',required:['should_render_now','provenance_evidence_ids','reply'],additionalProperties:false,properties:{
      should_render_now:{type:'boolean'},provenance_evidence_ids:{type:'array',maxItems:12,items:{type:'string'}},reply:{type:['string','null']}
    }}
  }};
}

export function buildV6DecisionSchema(manifest={}){validateV6DomainManifest(manifest);return universalContractSchema({synthesis:false});}
export function buildV6SynthesisSchema(manifest={}){validateV6DomainManifest(manifest);return universalContractSchema({synthesis:true});}

export function coreCapabilitySupport(manifest={},operation='NONE'){
  const supported=new Set(['NONE',...arr(manifest?.capabilities?.supported)]);
  return supported.has(trim(operation));
}

export function buildV6PhaseInstruction({phase='DECISION'}={}){
  if(String(phase).toUpperCase()==='SYNTHESIS') return `\n\nSYNTHESIS PHASE\n- resolved_materials contains certified output already executed by the host.\n- Close with NO_ACTION_REQUIRED.\n- Do not request new execution, materials or UI changes for the same goal.\n- Do not emulate unavailable operations during synthesis.\n- CERTIFIED_DATASET rows are immutable: preserve row sequence and scalar values exactly.\n- DATA_VOLUME_EXCEEDED is a structural condition; explain it naturally without inventing results.\n- Cite used evidence IDs in provenance_evidence_ids.`;
  return `\n\nDECISION PHASE\n- Read domain identifiers from domain_manifest.\n- Complete capability_assessment before planning.\n- Derive supported from domain_manifest.capabilities.\n- If the required operation is unavailable, close with NO_ACTION_REQUIRED and no substitute pipeline.\n- Use authoritative meta fields directly when they already answer the request.\n- EXECUTE_UI changes representation of existing certified evidence.`;
}

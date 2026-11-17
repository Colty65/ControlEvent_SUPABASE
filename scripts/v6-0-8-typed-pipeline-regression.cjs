const fs=require('fs');
const s=fs.readFileSync('services/event-ai.service.js','utf8');
let ok=0,total=0;function t(n,c){total++;if(c){ok++;console.log('OK ',n)}else{console.error('KO ',n);process.exitCode=1}}
t('version v6.0.8',s.includes("version:'v6_1-exp'"));
t('FILTER schema typed',s.includes("required:['logical_operator','conditions']")&&s.includes("enum:['AND','OR']"));
t('condition operator typed',s.includes("enum:['EQUALS','NOT_EQUALS','GT','GTE','LT','LTE','IN','CONTAINS','IS_NULL','IS_NOT_NULL']"));
t('JOIN typed',s.includes("function v6JoinToolSchema()")&&s.includes("required:['relationship_id']"));
t('AGGREGATE typed',s.includes("function v6AggregateToolSchema()")&&s.includes("required:['group_by','metrics']"));
t('DERIVE typed',s.includes("function v6DeriveToolSchema()")&&s.includes("required:['alias','algebraic_operator','arguments']"));
t('SORT_LIMIT typed',s.includes("function v6SortLimitToolSchema()")&&s.includes("required:['sort_by','limit','offset']"));
t('VISUALIZE typed',s.includes("function v6VisualizeToolSchema()")&&s.includes("required:['view_type','title','mappings']"));
t('no generic steps schema',!s.includes("steps={type:'array',items:v6PipelineNodeSchema()}")&&!s.includes("...arr(a.steps)"));
t('data canonical composition',s.includes("if(a.filter)pipeline.push({primitive:'FILTER'")&&s.includes("if(a.aggregate)pipeline.push({primitive:'AGGREGATE'"));
t('UI typed no free pipeline',s.includes("sort_limit:v6SortLimitToolSchema(),visualize:v6VisualizeToolSchema()"));
t('no semantic fallback',s.includes('V6 · FALLO SIN FALLBACK'));
console.log(`${ok}/${total}`);if(ok!==total)process.exit(1);

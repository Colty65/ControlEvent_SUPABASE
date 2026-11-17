/* ControlEvent domain adapter for the generic Zuzu v6 core.
   This file is declarative: it contains domain structure, not user-language rules. */

export const CONTROL_EVENT_V6_DOMAIN_MANIFEST={
  id:'controlevent',
  label:'ControlEvent',
  ontology_version:'CE-ONTOLOGY-6_1-exp',
  assistant:{name:'Zuzu',product:'ControlEvent'},
  policies:{allow_general_knowledge:true},
  capabilities:{
    supported:['FETCH','FILTER','SORT_LIMIT','VISUALIZE'],
    unavailable:['JOIN','AGGREGATE','DERIVE']
  },
  limits:{max_sort_limit:500,max_direct_rows:50},
  semantics:{event_scope:'When a current_screen_event exists, event_id entities default to its ID unless an explicit event_id FILTER is present.',purchase_statuses:{PENDING:'planned purchase',REALIZED:'completed purchase'},empty_results:'Zero rows is a valid, certified empty result, not a volume error.'},
  presentation:{view_types:['table','bar_chart','pie_chart','line_chart','kpi_card']},
  entities:{
    events:{fields:['id','name','description','status','start_date','end_date','price','canonical_attendance_count','operating_balance','event_valuation','has_reconciliation','bank_movement_count','bank_income_movement_count','bank_income_movement_total_amount','bank_income_associated_movement_count','bank_income_associated_movement_amount','bank_income_reconciled_movement_count','bank_income_reconciled_movement_amount','income_document_count','income_document_reconciled_count','income_document_pending_count','bank_reconciliation_status']},
    people:{fields:['id','name','rank']},
    purchases:{fields:['id','event_id','product_id','store_id','responsible_id','ticket','units','unit_price','amount','status']},
    incomes:{fields:['id','event_id','person_id','amount','status','concept']},
    donations:{fields:['id','event_id','product_id','donor_id','units','unit_price','estimated_value']},
    stores:{fields:['id','name']},
    products:{fields:['id','name','segment','destination','default_price']},
    documents:{fields:['id','event_id','date','text','type']},
    bank_movements:{fields:['id','event_id','date','concept','amount','status','included','income_associated','income_reconciled']},
    milestones:{fields:['id','event_id','title','description','responsible_id','responsible_name','start_date','end_date','status']},
    tasks:{fields:['id','event_id','milestone_id','description','responsible_id','responsible_name','start_date','end_date','status','notes']},
    attendance:{fields:['event_id','canonical_attendance_count','member_attendance_count','nonmember_attendance_count']}
  },
  relationships:[
    {relationship_id:'event_purchases',from:'events',to:'purchases'},
    {relationship_id:'event_incomes',from:'events',to:'incomes'},
    {relationship_id:'purchase_buyer',from:'purchases',to:'people'},
    {relationship_id:'purchase_store',from:'purchases',to:'stores'},
    {relationship_id:'purchase_product',from:'purchases',to:'products'},
    {relationship_id:'income_payer',from:'incomes',to:'people'},
    {relationship_id:'event_milestones',from:'events',to:'milestones'},
    {relationship_id:'milestone_tasks',from:'milestones',to:'tasks'},
    {relationship_id:'event_attendance',from:'events',to:'attendance'}
  ],
  canonical_metrics:[
    {metric_id:'canonical_attendance_count',entity:'events',calculation:'CE_INTERNAL'},
    {metric_id:'operating_balance',entity:'events',calculation:'CE_INTERNAL'},
    {metric_id:'event_valuation',entity:'events',calculation:'CE_INTERNAL'},
    {metric_id:'bank_income_associated_movement_amount',entity:'events',calculation:'BANK_RECONCILIATION_READ_MODEL'},
    {metric_id:'bank_income_reconciled_movement_amount',entity:'events',calculation:'BANK_RECONCILIATION_READ_MODEL'},
    {metric_id:'income_document_reconciled_count',entity:'events',calculation:'BANK_RECONCILIATION_READ_MODEL'}
  ]
};

// Run from the repository root: node scripts/sync-museum-highlights.mjs
// Applies explicit editorial approval while preserving original records and review evidence.
import fs from 'node:fs';
const dir = 'research/highlights-20260905';
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const pack = read(`${dir}/editorial-package.json`);
const drafts = pack.museums.flatMap(museum => museum.items.map(item => ({...item, museum_id: museum.museum_id})));
const files = ['beilin-audit.json','baoji-xian-audit.json','history-shangqiu-audit.json','qinhan-archaeology-audit.json'];
const reviews = files.flatMap(file => fs.existsSync(`${dir}/${file}`) ? read(`${dir}/${file}`).items : []);
const reviewed = new Map(reviews.map(row => [row.editorial_id, row]));
const publication = new Map(read(`${dir}/publication-approval.json`).items.map(row => [row.editorial_id,row]));
const detailResearch = new Map(fs.readdirSync(dir).filter(name => name.endsWith('-detail-research.json')).flatMap(name => {const data=read(`${dir}/${name}`);return Array.isArray(data)?data:data.items;}).map(item => [item.record_id,item]));
const indexPath = 'modules/museum-atlas/search-index.json';
const index = read(indexPath);
index.records = index.records.filter(record => record.record_kind !== 'editorial_only');
const records = new Map(index.records.map(record => [`${record.museum_id}:${record.id}`, record]));
// Retain original reader fields when a later review withdraws approval.
const originals = new Map(read(`${dir}/index-original-records.json`).map(record => [`${record.museum_id}:${record.id}`,record]));
const ownedFields = ['title','period','aliases','card_tagline','is_highlight','curatorial_rank','content_review','record_binding','object_identity','photo_match','object_identity_id','publication_approval'];
for (const [key, original] of originals) {
  const record = records.get(key);
  if (!record?.is_highlight) continue;
  if (!drafts.some(draft => draft.museum_id === record.museum_id && draft.canonical_title === record.title)) throw new Error(`Refusing to overwrite changed title: ${key}`);
  for (const field of ownedFields) {
    if (Object.hasOwn(original,field)) record[field] = original[field];
    else delete record[field];
  }
}
const approved = [], mapping = [];
for (const draft of drafts) {
  const audit = reviewed.get(draft.editorial_id);
  const permission = publication.get(draft.editorial_id);
  if (permission?.publication_approval === 'user_removed') continue;
  const textOnly = permission?.mode === 'text_only';
  const recordId = textOnly ? draft.editorial_id : (permission?.record_id || audit?.record_id || null);
  const key = `${draft.museum_id}:${permission?.index_record_id || recordId}`;
  const record = records.get(key);
  const blockers = [...(audit?.blockers || (audit ? [] : ['审计尚未完成']))];
  if (audit?.status === 'pass' && (audit.content_review !== 'passed' || ['record_binding','object_identity','photo_match'].some(field => audit[field] !== 'verified'))) blockers.push('四项审核状态未全部明确通过；说明文字不能代替审核状态。');
  if (audit?.status === 'pass' && !record) blockers.push('当前跨馆索引尚未找到对应联合键；未自动添加或借用其他记录。');
  if (audit?.status === 'pass' && (!audit.collection_owner || /^(not_stated|not_verified|unknown)$/i.test(audit.collection_owner) || !audit.verified_photo_paths?.length)) blockers.push('缺少收藏单位或实际查看的照片证据。');
  const passed = audit?.status === 'pass' && blockers.length === 0;
  const accepted = permission?.publication_approval === 'user_approved' && (textOnly || Boolean(record));
  const row = {...audit, editorial_id:draft.editorial_id, museum_id:draft.museum_id, curatorial_rank:draft.curatorial_rank, canonical_title:draft.canonical_title, original_record_id:audit?.record_id || null, record_id:recordId, new_record_id:textOnly?recordId:null, status:passed?'pass':accepted?'editorial_accepted':'pending', publication_mode:textOnly?(permission?.supplement_image?'supplied_image':'text_only'):'existing_record', blockers};
  mapping.push(row);
  if (!passed && !accepted) continue;
  const publicRow = {
    museum_id:draft.museum_id, record_id:recordId, canonical_title:draft.canonical_title,
    period:draft.period, card_tagline:draft.card_tagline, intro:audit.approved_intro || draft.intro,
    aliases:audit.aliases || [], sources:[...new Map([...draft.sources, ...(audit.evidence || []).map(e => ({title:e.title || e.publisher || '资料出处', url:e.url || e.source}))].filter(s => /^https?:\/\//.test(s.url || '') && !/github\.com|候选|本站/.test((s.url || '') + (s.title || ''))).map(({title,url}) => [url,{title,url}])).values()],
    curatorial_rank:draft.curatorial_rank, is_highlight:true,
    content_review:passed?'passed':'editorial_accepted',record_binding:passed?'verified':audit?.record_binding || 'pending',object_identity:passed?'verified':audit?.object_identity || 'pending',photo_match:passed?'verified':audit?.photo_match || 'pending',
    publication_approval:accepted?'user_approved':null, record_kind:textOnly?'editorial_only':'existing_record',
    supplement_image:permission?.supplement_image || null,
    detail_supplement:detailResearch.get(recordId) || detailResearch.get(draft.editorial_id) || null,
    collection_owner:passed?audit.collection_owner:null, official_treasure:null,current_display_status:'not_verified',
    object_identity_id:audit.object_identity_id || `${draft.museum_id}:${recordId}`,
  };
  approved.push(publicRow);
  const target = record || {museum_id:draft.museum_id,museum_name:index.records.find(r=>r.museum_id===draft.museum_id)?.museum_name || draft.museum_id,id:recordId,title:draft.canonical_title,period:draft.period,type:'文物介绍',material:'',origin:'',keywords:[],site_path:`${index.records.find(r=>r.museum_id===draft.museum_id)?.site_path.split('?')[0]}`,image_path:'',record_kind:'editorial_only'};
  Object.assign(target, {
    title:publicRow.canonical_title,period:publicRow.period,aliases:publicRow.aliases,
    card_tagline:publicRow.card_tagline,is_highlight:true,curatorial_rank:publicRow.curatorial_rank,
    content_review:publicRow.content_review,record_binding:publicRow.record_binding,object_identity:publicRow.object_identity,photo_match:publicRow.photo_match,publication_approval:publicRow.publication_approval,
    object_identity_id:publicRow.object_identity_id,
  });
  if (!record) index.records.push(target);
  if (textOnly && permission?.supplement_image) target.image_path = permission.supplement_image.path;
}
fs.writeFileSync('shared/js/museum-highlights-data.js', '// Generated by scripts/sync-museum-highlights.mjs; user-approved editorial copy; verification status is preserved.\nwindow.MUSEUM_HIGHLIGHTS = '+JSON.stringify(approved,null,2)+';\n');
fs.writeFileSync(indexPath, JSON.stringify(index,null,2)+'\n');
fs.writeFileSync(`${dir}/matching-results-105.json`, JSON.stringify({total:105,published:approved.length,verified:mapping.filter(r=>r.status==='pass').length,user_accepted:mapping.filter(r=>r.status==='editorial_accepted').length,text_only:mapping.filter(r=>r.publication_mode==='text_only').length,removed_by_user:105-mapping.length,pending:mapping.length-approved.length,items:mapping},null,2)+'\n');
const table = ['# 七馆105项采用结果','', '按用户最新指令采用全部编辑稿，不继续逐件核验。原审计记录保留；用户批准采用不等于原件身份已核。缺图和冲突匹配改用无照片文字条目，不改名或替换原有组合记录。候选ID未使用。', '', '| 馆 | 顺序 | 文物 | 实际记录ID | 采用方式 | 原核验缺口 |','|---|---:|---|---|---|---|', ...mapping.map(row => `| ${row.museum_id} | ${row.curatorial_rank} | ${row.canonical_title} | ${row.record_id || '未匹配'} | ${row.publication_mode === 'supplied_image'?'用户补图':row.publication_mode === 'text_only'?'文字条目':row.status==='pass'?'原记录·已核':'原记录·用户批准'} | ${row.blockers.join('；').replaceAll('|','／')} |`)];
fs.writeFileSync(`${dir}/matching-results-105.md`,table.join('\n')+'\n');
console.log(JSON.stringify({reviewed:reviews.length,adopted:approved.length,verified:mapping.filter(row=>row.status==='pass').length,textOnly:mapping.filter(row=>row.publication_mode==='text_only').length,byMuseum:Object.fromEntries(pack.museums.map(museum=>[museum.museum_id,approved.filter(row=>row.museum_id===museum.museum_id).length]))}));

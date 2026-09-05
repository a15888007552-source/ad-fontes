/* Reviewed editorial overlays. Native records, photo order and media resolvers remain authoritative. */
(() => {
  'use strict';
  const norm = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[\s《》〈〉（）()·，。:：;；“”‘’'"\-—_/]/g, '');
  const eligible = entry => !!entry && entry.is_highlight === true && ((entry.content_review === 'passed'
    && entry.record_binding === 'verified' && entry.object_identity === 'verified' && entry.photo_match === 'verified')
    || (entry.publication_approval === 'user_approved' && entry.content_review === 'editorial_accepted'));
  const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rank = entry => eligible(entry) ? entry.curatorial_rank : Infinity;
  const relevance = (item, query) => {
    const q = norm(query), title = norm(item.title || item.name);
    if (!q) return 0;
    if (title === q) return 1000;
    if ((item.aliases || []).some(alias => norm(alias) === q)) return 900;
    return title.includes(q) ? 600 : 100;
  };
  function create(museumId) {
    const rows = (window.MUSEUM_HIGHLIGHTS || []).filter(row => row.museum_id === museumId && eligible(row));
    const byId = new Map(rows.map(row => [String(row.record_id), row]));
    // Legacy editorial links now open the museum's own detail view.
    const legacyUrl = new URL(location.href);
    if (legacyUrl.searchParams.has('editorial')) {
      legacyUrl.searchParams.set('item', legacyUrl.searchParams.get('editorial'));
      legacyUrl.searchParams.delete('editorial');
      history.replaceState(null, '', legacyUrl);
    }
    const beilinRelated = {'beilin-highlight-01':'artifact-132','beilin-highlight-02':'artifact-074','beilin-highlight-14':'artifact-171'};
    const absoluteMedia = path => new URL(/^(?:https?:)?\/\//i.test(path) ? path : '../../' + path, document.baseURI).href;
    const sectionsFor = research => [['历史背景',research.history],['形制与工艺',research.form_and_craft],['历史意义',research.contribution],['观看提示',research.viewing_guide]].filter(([,text])=>text).map(([heading,text])=>({heading,text}));
    function nativeRecord(row, records) {
      const relatedId = row.supplement_image?.related_record_id || beilinRelated[row.record_id];
      const related = records.find(item=>item.id===relatedId);
      // Qinhan's older records often describe a mixed display case. A named
      // object may reuse selected photos, never that case's identity or gallery.
      const base = related && museumId !== 'qinhan' ? structuredClone(related) : {};
      const asset = row.supplement_image;
      const url = absoluteMedia(asset.path);
      const photo = {sequence:1,number:1,filename:asset.original_filename || asset.path.split('/').pop(),role: museumId==='shaanxi-archaeology'?'整体':'front',role_label:asset.caption,caption:asset.caption,isLabel:false,thumb:url,web:url,preview:url,src:url,focus:url,original:url,width:asset.width || '',height:asset.height || '',display_width:asset.width || '',display_height:asset.height || '',sourceSize:[]};
      const item = {...base,id:row.record_id,name:row.canonical_title,title:row.canonical_title,
        period:row.period,period_label:row.period,era:row.period,summary:row.card_tagline,
        category:asset.category || base.category || (museumId==='beilin'?'古董/文物':'其他器物'),
        categoryLabel:base.categoryLabel || '文物',tags:base.tags || [],aliases:row.aliases || [],
        _highlightApplied:false,_editorialOnly:false,_nativeHighlight:true,
        sequence:base.sequence ?? row.curatorial_rank,index:base.index ?? row.curatorial_rank,
        research:base.research || {},photos:base.photos?.length ? base.photos : [photo]};
      if (!related) {item._supplementCaption=asset.caption;item.status='文物资料';item.sequenceLabel='配图';}
      if (museumId==='beilin') {
        item.main_photo=base.main_photo || photo;item.subitems=base.subitems || [];item.form_labels=base.form_labels || [];
        item.photo_count=item.photos.length;item.display_photo_count=item.photos.filter(p=>!['label','title'].includes(p.role)).length;
        item.sequence_start=base.sequence_start ?? row.curatorial_rank;item.sequence_end=base.sequence_end ?? row.curatorial_rank;
        if (!related) {item.image_source='supplement';item.image_source_label=asset.caption;}
      }
      if (museumId==='baoji') {item.featured=base.featured || photo;item.hasObjectPhoto=true;delete item.treasureId;}
      if (museumId==='qinhan') {
        const sourcePhotos = new Map(records.filter(r=>!r._nativeHighlight).flatMap(r=>r.gallery || []).map(p=>[p.filename,p]));
        const selected = (asset.gallery_filenames || []).map(name=>sourcePhotos.get(name)).filter(Boolean);
        item.gallery = selected.length ? selected.map(p=>({...p,role:p.filename===asset.main_filename?'front':'detail',role_label:asset.photo_labels?.[p.filename] || (p.filename===asset.main_filename?'整体':'局部')})) : [photo];
        const main = item.gallery.find(p=>p.filename===asset.main_filename) || item.gallery[0];
        item.main_image=main.web;item.full_image=main.web;item.card_image=main.thumb;
        item.main_sequence=main.sequence;item.photos=item.gallery;item.processing={};item.sources=[];
        item.photo_count=item.gallery.length;item.object_photo_count=item.gallery.length;item.label_photo_count=0;
        item.label_text=asset.label_text || '';item.material=asset.material || '';
        item.tags=row.aliases || [];
      }
      if (museumId==='xian-museum') item.cover=base.cover || url;
      if (museumId==='shaanxi-history') item.localMedia=url;
      if (museumId==='shangqiu-museum') {item.site=base.site || '';item.paragraphs=base.paragraphs || [];item._supplementPhotos=related ? null : [photo];}
      item._detailSupplement=row.detail_supplement || null;
      return item;
    }
    const get = item => byId.get(String(item.id));
    function apply(records) {
      rows.filter(row=>row.record_kind==='editorial_only' && !records.some(item=>item.id===row.record_id)).forEach(row=>records.push(nativeRecord(row,records)));
      records.forEach(item => {
        const row = get(item);
        if (!row || item._highlightApplied) return;
        item._highlightApplied = true;
        item.aliases = [...new Set([...(item.aliases || []), ...(row.aliases || [])])];
        const sources = row.sources.map(s => ({label: s.title, url: s.url}));
        if (museumId === 'beilin') {
          item.name = row.canonical_title; item.period_label = row.period; item.card_excerpt = row.card_tagline;
          item.research = {...item.research, history: item.research?.history || row.intro, sources: [...(item.research?.sources || []), ...sources.map(s => ({...s, layer: 'museum_official_collection_page'}))]};
        } else {
          item.title = row.canonical_title;
          item.summary = row.card_tagline;
          if (['baoji', 'qinhan', 'shangqiu-museum'].includes(museumId)) item.era = row.period;
          else item.period = row.period;
          if (museumId === 'baoji') { item.research = {...item.research, history: item.research?.history || row.intro}; item.highlightSources = sources.map(s => [s.label, s.url]); }
          if (museumId === 'qinhan') { item.interpretation ||= row.intro; item.sources = [...new Set([...(item.sources || []), ...sources.map(s => s.url)])]; }
          if (museumId === 'shaanxi-history') { item.cardLead = row.card_tagline; item.essay = item.essay?.length ? item.essay : [{heading: '文物介绍', text: row.intro}]; item.sources = [...(item.sources || []), ...sources]; }
          if (museumId === 'xian-museum') { item.sections = item.sections?.length ? item.sections : [{heading: '文物介绍', text: row.intro}]; item.sources = [...(item.sources || []), ...sources]; }
          if (museumId === 'shangqiu-museum') { item.paragraphs = item.paragraphs?.length ? item.paragraphs : [row.intro]; item.sources = [item.sources, ...sources.map(s => `${s.label}：${s.url}`)].filter(Boolean).join('\n'); }
          if (museumId === 'shaanxi-archaeology') { item.description ||= row.intro; item.highlightSources = sources; }
        }
      });
      records.forEach(item => {
        const row=get(item); if (!row) return;
        const detail=row.detail_supplement;
        if (!detail) return;
        const sources=(detail.sources || []).map(source=>({...source,label:source.label || source.title}));
        item.research={...item.research,...detail.research,sources:[...(item.research?.sources || []),...sources]};
        if (detail.inscription) item.inscription=detail.inscription;
        const parts=sectionsFor(detail.research || {});
        if (detail.inscription?.excerpt) parts.push({heading:'铭文节选与释读',text:[detail.inscription.excerpt_note,detail.inscription.excerpt,detail.inscription.translation].filter(Boolean).join('\n\n')});
        if (museumId==='baoji') {Object.assign(item.research,{form:detail.research.form_and_craft,significance:detail.research.contribution,viewing:detail.research.viewing_guide});item.highlightSources=[...(item.highlightSources || []),...sources.map(s=>[s.label,s.url])];}
        if (museumId==='qinhan') {item.interpretation=parts.map(p=>p.heading+'\n'+p.text).join('\n\n');item.sources=[...new Set([...(item.sources || []),...sources.map(s=>s.url)])];}
        if (museumId==='xian-museum' || museumId==='shaanxi-history') {const key=museumId==='xian-museum'?'sections':'essay';item[key]=parts.concat((item[key] || []).filter(p=>!['文物介绍',...parts.map(p=>p.heading)].includes(p.heading)));item.sources=[...(item.sources || []),...sources];}
        if (museumId==='shangqiu-museum') {item.paragraphs=parts.map(p=>p.text);item.sources=[item.sources,...sources.map(s=>s.label+'：'+s.url)].filter(Boolean).join('\n');}
        if (museumId==='shaanxi-archaeology') {item.description=detail.research.history;item.significance=detail.research.contribution;item.viewing_notes=detail.research.viewing_guide;item.form_and_craft=detail.research.form_and_craft;item.highlightSources=[...(item.highlightSources || []),...sources];}
      });
      return records;
    }
    function select(records, {query = '', filtered = false, manualSort = false} = {}) {
      let output = [...records];

      if (query.trim()) output.sort((a, b) => relevance(b, query) - relevance(a, query) || rank(get(a)) - rank(get(b)));
      else if (!manualSort) output.sort((a, b) => rank(get(a)) - rank(get(b)));
      return output;
    }
    return {apply, select, get, total: count => count, aliases: item => (item.aliases || []).join(' '), badge: item => get(item) ? '<span class="museum-highlight-badge">重点文物</span>' : ''};
  }
  window.MuseumHighlights = {create, eligible, relevance, norm};
})();

/* Complete source records plus reference-only calendar/byline indices.
 * Loading this file alone does not fetch data or alter the legacy application.
 */
(function (root) {
  'use strict';
  const FILES = ['conference', 'presentations', 'posters', 'sessions', 'speakers', 'media'];
  function requireValue(condition, message) { if (!condition) throw new Error(message); }
  function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
    return value;
  }
  const equal = (left, right) => JSON.stringify(stable(left)) === JSON.stringify(stable(right));

  function createReferenceIndices(talks) {
    const groups = [];
    function add(members) { groups.push({id: 'session-' + members[0].id, recordIds: members.map(talk => talk.id)}); }
    // Reproduce the original calendar's day order and insertion-order groups.
    // These are display references, not a new scholarly session classification.
    for (const day of ['06-26', '06-27']) {
      const dayTalks = talks.filter(talk => talk.day === day);
      const keynotes = dayTalks.filter(talk => talk.session_type === 'keynote');
      if (keynotes.length) add(keynotes);
      for (const period of new Set(dayTalks.map(talk => talk.period).filter(Boolean))) {
        const periodTalks = dayTalks.filter(talk => talk.period === period && talk.session_type !== 'keynote');
        for (const room of new Set(periodTalks.map(talk => talk.room).filter(Boolean))) add(periodTalks.filter(talk => talk.room === room));
      }
    }
    return {
      sessions: {kind: 'calendar-display-groups', label: '日程分组', items: groups},
      speakers: {kind: 'source-byline-records', label: '原署名记录', items: talks.map(talk => ({id: 'speaker-' + talk.id, recordIds: [talk.id]}))},
    };
  }

  function assemble(bundle) {
    const {conference, presentations, posters, sessions, speakers, media} = bundle;
    requireValue(conference?.schemaVersion === 1 && Array.isArray(conference.recordOrder) && Array.isArray(conference.fieldOrder), 'Unsupported proceedings data schema');
    requireValue(Array.isArray(presentations) && Array.isArray(posters), 'Missing original presentation/poster records');
    requireValue(presentations.every(record => ['keynote', 'formal'].includes(record.session_type)), 'Presentation partition contains a non-presentation record');
    requireValue(posters.every(record => record.session_type === 'poster'), 'Poster partition contains a non-poster record');
    const all = [...presentations, ...posters], records = new Map();
    for (const record of all) {
      requireValue(typeof record.id === 'string' && record.id && !records.has(record.id), 'Missing or duplicate original record ID');
      records.set(record.id, record);
    }
    requireValue(new Set(conference.recordOrder).size === all.length && conference.recordOrder.length === all.length, 'Original record order is incomplete or duplicated');
    const talks = conference.recordOrder.map(id => {requireValue(records.has(id), 'Unknown original record ID: ' + id); return records.get(id);});
    requireValue(media && Array.isArray(media.photo_stream) && media.images && typeof media.images === 'object' && !Array.isArray(media.images), 'Missing photo stream or image mapping');
    requireValue(new Set(conference.fieldOrder).size === conference.fieldOrder.length, 'Duplicate original top-level field');
    requireValue(equal(conference.fieldOrder.filter(key => !['talks', 'photo_stream'].includes(key)).sort(), Object.keys(conference.metadata || {}).sort()) && conference.fieldOrder.includes('talks') && conference.fieldOrder.includes('photo_stream'), 'Original top-level fields are incomplete');
    const data = Object.fromEntries(conference.fieldOrder.map(key => [key, key === 'talks' ? talks : key === 'photo_stream' ? media.photo_stream : conference.metadata[key]]));
    const expected = createReferenceIndices(talks);
    requireValue(equal(sessions, expected.sessions), 'Calendar display references differ from the original grouping');
    requireValue(equal(speakers, expected.speakers), 'Source byline references differ from the original records');
    return {data, images: media.images, sessions, speakers};
  }

  async function load(baseUrl, fetcher) {
    fetcher = fetcher || root.fetch.bind(root);
    const values = await Promise.all(FILES.map(async name => {
      const response = await fetcher(new URL(name + '.json', baseUrl));
      if (!response.ok) throw new Error('无法读取年会数据：' + name + '.json');
      return response.json();
    }));
    return assemble(Object.fromEntries(FILES.map((name, index) => [name, values[index]])));
  }
  const api = {FILES, assemble, createReferenceIndices, load};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ProceedingsData = api;
})(typeof globalThis === 'object' ? globalThis : this);

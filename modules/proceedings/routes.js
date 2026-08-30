/* Stable proceedings fragments. Parsing checks syntax, never corpus membership. */
(function (root) {
  'use strict';
  const VIEW_IDS = Object.freeze(['overview', 'keynote', 'all', 'schedule', 'photos', 'themes']);
  const RECORD_ID = /^t\d{3}$/;
  const SESSION_ID = /^session-t\d{3}$/;
  const SPEAKER_ID = /^speaker-t\d{3}$/;

  function validRoute(kind, id) {
    if (typeof id !== 'string') return false;
    switch (kind) {
      case 'view': return VIEW_IDS.includes(id);
      case 'presentation':
      case 'poster': return RECORD_ID.test(id);
      case 'session': return SESSION_ID.test(id);
      case 'speaker': return SPEAKER_ID.test(id);
      default: return false;
    }
  }

  function parseHash(hash = '') {
    if (hash === '' || hash === '#') return {kind: 'view', id: 'overview'};
    const invalid = () => ({kind: 'invalid', hash});
    if (typeof hash !== 'string') return invalid();
    const match = /^#(view|presentation|poster|session|speaker)=([^&]*)$/.exec(hash);
    if (!match) return invalid();
    let id;
    try { id = decodeURIComponent(match[2]); } catch (_) { return invalid(); }
    return validRoute(match[1], id) ? {kind: match[1], id} : invalid();
  }

  function serializeRoute(route) {
    if (!route || typeof route !== 'object' || Array.isArray(route)
      || !Object.prototype.hasOwnProperty.call(route, 'kind')
      || !Object.prototype.hasOwnProperty.call(route, 'id')
      || !validRoute(route.kind, route.id)) {
      throw new TypeError('Invalid proceedings route');
    }
    return '#' + route.kind + '=' + encodeURIComponent(route.id);
  }

  const api = Object.freeze({VIEW_IDS, parseHash, serializeRoute});
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ProceedingsRoutes = api;
})(typeof globalThis === 'object' ? globalThis : this);

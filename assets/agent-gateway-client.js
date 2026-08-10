(function () {
  "use strict";

  const configured = window.EUROPA_AGENT_CONFIG?.endpoint;
  const isHttpPage = typeof location !== "undefined" && /^https?:$/.test(location.protocol);
  const sameOriginGateway = isHttpPage && (location.port === "8787" || (location.protocol === "https:" && !location.port));
  const endpoint = configured || (sameOriginGateway ? "/api/agent-answer" : null);

  async function answer(personId, query) {
    if (!endpoint || !personId || !query) return null;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ personId, query })
      });
      const payload = await response.json().catch(() => null);
      if (["ok", "unconfigured", "citation_required", "not_answerable"].includes(payload?.status)) return payload;
      return null;
    } catch {
      return null;
    }
  }

  window.MUSICIAN_AGENT_GATEWAY = Object.freeze({ enabled: Boolean(endpoint), endpoint, answer });
})();

const COVERED_HOSTS = new Set(["newcger.com", "www.newcger.com"]);
const FORBIDDEN_MEDIA_FIELDS = Object.freeze([
  "assetUrl",
  "downloadUrl",
  "rawFile",
  "trainingSource",
  "modelInput",
  "localFile",
  "sha256"
]);
const REFERENCE_ACTIONS = new Set(["reference", "policy-reference"]);
const FORBIDDEN_ACTIONS = new Set(["host", "serve", "download", "mirror", "ai-context", "training", "model-training"]);

function text(value) {
  return String(value ?? "").trim();
}

function hostname(value) {
  try {
    return new URL(text(value)).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isCoveredNewCger(record) {
  const site = text(record?.site).toLowerCase();
  const assetId = text(record?.assetId).toLowerCase();
  const sourceUrls = Array.isArray(record?.sourceUrls) ? record.sourceUrls : [];
  return site.includes("newcger") || site.includes("新cg") || assetId.startsWith("newcger-") || sourceUrls.some((url) => COVERED_HOSTS.has(hostname(url)));
}

function presentForbiddenFields(record) {
  return FORBIDDEN_MEDIA_FIELDS.filter((field) => {
    if (!Object.prototype.hasOwnProperty.call(record || {}, field)) return false;
    const value = record[field];
    return value !== null && value !== undefined && text(value) !== "";
  });
}

function officialPolicyUrls(record) {
  const sourceUrls = Array.isArray(record?.sourceUrls) ? record.sourceUrls : [];
  return sourceUrls.length > 0 && sourceUrls.every((url) => COVERED_HOSTS.has(hostname(url)) && text(url).startsWith("https://"));
}

function evaluateMediaAsset(record, action = "reference") {
  if (!isCoveredNewCger(record)) {
    return Object.freeze({ allowed: true, status: "UNSCOPED", action, reason: "No NewCGer restriction matched; apply the ordinary item-level rights gate." });
  }

  const leakedFields = presentForbiddenFields(record);
  if (leakedFields.length) {
    return Object.freeze({
      allowed: false,
      status: "BLOCKED",
      action,
      code: "RAW_MEDIA_FIELD_FORBIDDEN",
      leakedFields,
      reason: "NewCGer policy evidence may not carry a hosted file, download URL, asset URL, training input, local file or claimed file hash."
    });
  }
  if (!officialPolicyUrls(record)) {
    return Object.freeze({
      allowed: false,
      status: "BLOCKED",
      action,
      code: "OFFICIAL_POLICY_URL_REQUIRED",
      reason: "NewCGer reference evidence must point only to HTTPS policy pages on www.newcger.com or newcger.com."
    });
  }
  if (REFERENCE_ACTIONS.has(action)) {
    return Object.freeze({ allowed: true, status: "REFERENCE_ONLY", action, reason: "Policy pages may be cited as a lead; no media asset is exposed." });
  }
  if (FORBIDDEN_ACTIONS.has(action) || action) {
    return Object.freeze({
      allowed: false,
      status: "REFERENCE_ONLY",
      action,
      code: "NEWCGER_REFERENCE_ONLY",
      reason: "NewCGer is reference-only: do not host, serve, download, mirror, send to an AI context or use for model training."
    });
  }
  return Object.freeze({ allowed: false, status: "BLOCKED", action, code: "UNKNOWN_MEDIA_ACTION", reason: "Unknown media actions default to blocked." });
}

function assertMediaAssetAllowed(record, action = "reference") {
  const result = evaluateMediaAsset(record, action);
  if (!result.allowed) {
    const error = new Error(result.code || "MEDIA_POLICY_BLOCKED");
    error.mediaPolicy = result;
    throw error;
  }
  return result;
}

const api = Object.freeze({
  coveredHosts: Object.freeze([...COVERED_HOSTS]),
  forbiddenFields: FORBIDDEN_MEDIA_FIELDS,
  evaluateMediaAsset,
  assertMediaAssetAllowed,
  isCoveredNewCger
});

if (typeof window !== "undefined") window.MEDIA_POLICY = api;

export { assertMediaAssetAllowed, evaluateMediaAsset, isCoveredNewCger };

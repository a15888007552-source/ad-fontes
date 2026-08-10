(function (root) {
  "use strict";

  const ALLOWED_TYPES = new Set(["score", "recording", "writing"]);
  const ALLOWED_STATUSES = new Set(["review", "link", "permission", "open"]);
  const FINAL_STATUSES = new Set(["link", "permission", "open"]);
  const RIGHTS_LAYER_KEYS = ["composition", "edition", "performance", "recording", "territory"];
  const RIGHTS_LAYER_STATUSES = new Set(["review", "not-applicable", "permission", "restricted", "cleared"]);
  const NON_HOSTED_ACCESS = new Set(["仅目录", "仅书目", "不播放", "书目摘要", "仅外链"]);
  const HOSTED_ACCESS_PATTERN = /^可(?:站内)?(?:预览|播放|下载)/;
  const HOSTED_ACCESS_ALT_PATTERN = /^(?:提供|支持)(?:在线)?(?:预览|播放|下载)/;

  function hasText(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function hasHttpUrl(value) {
    return hasText(value) && /^https?:\/\//i.test(value.trim());
  }

  function hasSha256(value) {
    return /^[A-Fa-f0-9]{64}$/.test(String(value || "").trim());
  }

  function hasRealFileSignature(value) {
    const signature = String(value || "").trim();
    if (!signature || /^(?:unknown|null|none|n\/a|pending|placeholder)$/i.test(signature)) return false;
    return /^(?:%PDF-\d\.\d|25\s+50\s+44\s+46(?:\s|$)|<TEI\b|ID3\b|RIFF.{4}WAVE|fLaC\b|OggS\b|PK(?:\s|$))/i.test(signature)
      || /^(?:[A-Fa-f0-9]{2}\s+){3,}[A-Fa-f0-9]{2}$/.test(signature);
  }

  function hasSafeEvidencePath(value) {
    const relativePath = String(value || "").trim();
    return /^evidence\/[A-Za-z0-9][A-Za-z0-9._/+-]*$/.test(relativePath)
      && !relativePath.includes("..")
      && !relativePath.includes("\\")
      && !relativePath.includes("//");
  }

  function hasControlledAssetUrl(value) {
    if (!hasText(value)) return false;
    const normalized = value.trim().replace(/^\.\//, "");
    return /^\/?media\/[A-Za-z0-9][A-Za-z0-9._/+\-]*$/.test(normalized)
      && !normalized.includes("..")
      && !normalized.includes("\\")
      && !normalized.includes("//");
  }

  function hasAuditLogRef(value) {
    const reference = String(value || "").trim();
    return /^review\/[A-Za-z0-9._/-]+(?:#[A-Za-z0-9._:-]+)?$/.test(reference) && !reference.includes("..");
  }

  function hasHumanReviewerId(value) {
    const reviewerId = String(value || "").trim();
    return /^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$/.test(reviewerId)
      && !/(?:codex|chatgpt|openai|deepseek|luna|cursor|ai|bot|agent|script|automat|fixture|test)/i.test(reviewerId);
  }

  function hasHumanReviewSignature(item, today) {
    const review = item?.humanReview;
    return Boolean(review && review.status === "signed"
      && review.reviewerType === "human"
      && hasHumanReviewerId(review.reviewerId)
      && hasReviewDate(review.signedAt, today)
      && hasAuditLogRef(review.auditLogRef)
      && item.humanReviewed === true
      && item.reviewedAt === review.signedAt
      && item.reviewedBy === review.reviewerId);
  }

  function hasSignedOffReviewQueue(item) {
    const queue = item?.reviewQueue;
    return Boolean(queue
      && queue.status === "SIGNED_OFF"
      && Array.isArray(queue.missing)
      && queue.missing.length === 0
      && Array.isArray(queue.blockers)
      && queue.blockers.length === 0);
  }

  function hasVerifiedFileEvidence(item, today = localToday()) {
    const file = item?.fileEvidence || {};
    const fileHash = String(item?.fileHash || "").trim().toUpperCase();
    const sourceHash = String(file.sha256 || "").trim().toUpperCase();
    return file.status === "verified"
      && file.verified === true
      && hasSafeEvidencePath(file.localPath)
      && Number.isInteger(file.bytes)
      && file.bytes > 0
      && hasRealFileSignature(file.signature)
      && hasSha256(sourceHash)
      && fileHash === sourceHash
      && hasHttpUrl(file.sourceFileUrl)
      && hasReviewDate(file.verifiedAt, today)
      && hasText(file.verification)
      && hasControlledAssetUrl(item?.assetUrl)
      && hasControlledAssetUrl(file.assetUrl)
      && file.assetUrl === item.assetUrl;
  }

  function hasTerritories(value) {
    return Array.isArray(value) && value.length > 0 && value.every(hasText);
  }

  function hasRightsLayers(value) {
    return value && typeof value === "object" && RIGHTS_LAYER_KEYS.every((key) => {
      const layer = value[key];
      return layer && typeof layer === "object" && RIGHTS_LAYER_STATUSES.has(layer.status) && hasText(layer.label);
    });
  }

  function rightsLayersCleared(value) {
    return hasRightsLayers(value) && RIGHTS_LAYER_KEYS.every((key) => ["cleared", "not-applicable"].includes(value[key].status));
  }

  function hasReviewDate(value, today) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    const normalized = Number.isNaN(parsed.valueOf()) ? "" : parsed.toISOString().slice(0, 10);
    return normalized === value && value <= today;
  }

  function localToday() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function isHostedAccess(value) {
    return hasText(value) && (HOSTED_ACCESS_PATTERN.test(value) || HOSTED_ACCESS_ALT_PATTERN.test(value));
  }

  function isKnownAccess(value) {
    return isHostedAccess(value) || NON_HOSTED_ACCESS.has(value);
  }

  function check(id, label, passed, detail) {
    return { id, label, passed: Boolean(passed), detail };
  }

  function summarize(checks) {
    const blockers = checks.filter((item) => !item.passed);
    return {
      allowed: blockers.length === 0,
      checks,
      blockers
    };
  }

  function evaluate(resource, options = {}) {
    const item = resource && typeof resource === "object" ? resource : {};
    const today = options.today || localToday();

    const admissionChecks = [
      check("identity", "资源 ID", hasText(item.id), "每条记录必须有稳定 ID"),
      check("type", "资源类型", ALLOWED_TYPES.has(item.type), "仅接受乐谱、录音或著作"),
      check("title", "题名", hasText(item.title) && hasText(item.subtitle), "主标题与原题/副标题均须登记"),
      check("version", "具体版本", hasText(item.edition), "以具体版本或载体为最小单位"),
      check("jurisdiction", "法域字段", hasText(item.jurisdiction), "必须声明目标法域或待核验状态"),
      check("rights-status", "权利状态", hasText(item.status) && ALLOWED_STATUSES.has(item.status), "无权利状态不得进入目录"),
      check("rights-layers", "五层权利状态", hasRightsLayers(item.rightsLayers), "作品、版本、表演、录音和地域必须逐层登记"),
      check("status-label", "状态说明", hasText(item.statusLabel), "状态需要可读说明"),
      check("access", "访问方式", isKnownAccess(item.access), "访问方式必须来自受控词表"),
      check("source-url", "来源记录", hasHttpUrl(item.sourceUrl), "没有可回链的来源记录不得进入生产目录"),
      check("rights-evidence-url", "权利证据", hasHttpUrl(item.rightsEvidenceUrl), "没有权利证据 URL 不得进入生产目录"),
      check("access-consistency", "状态与访问一致", (!isHostedAccess(item.access) || item.status === "open") && (item.status !== "open" || isHostedAccess(item.access)), "站内访问与 open 状态必须双向一致"),
      check(
        "evidence-gap",
        "证据缺口",
        item.status === "open" ? !hasText(item.evidenceGap) : hasText(item.evidenceGap),
        item.status === "open" ? "open 记录不得保留未解决的证据缺口" : "未清权记录必须明确缺失证据"
      ),
      check("description", "目录说明", hasText(item.description), "资源需要研究性说明"),
      check("keywords", "检索关键词", Array.isArray(item.keywords) && item.keywords.length > 0 && item.keywords.every(hasText), "至少一个可检索关键词")
    ];

    const decisionChecks = [
      check("source-url", "来源记录", hasHttpUrl(item.sourceUrl), "登记来源机构的 HTTP(S) 页面"),
      check("rights-evidence-url", "权利证据", hasHttpUrl(item.rightsEvidenceUrl), "登记许可、权利声明或使用条款"),
      check("reviewed-at", "复核日期", hasReviewDate(item.reviewedAt, today), "使用不晚于今天的 YYYY-MM-DD 日期"),
      check("reviewed-by", "复核责任人", hasText(item.reviewedBy), "记录人工复核责任人"),
      check("territories", "适用地域", hasTerritories(item.territories), "至少登记一个适用地域"),
      check("final-status", "证据支持的判定", FINAL_STATUSES.has(item.status), "判定须为仅外链、需授权或可开放")
    ];

    const openChecks = [
      ...decisionChecks,
      check("open-status", "开放判定", item.status === "open", "只有 open 状态可以站内开放"),
      check("hosted-access", "站内访问模式", isHostedAccess(item.access), "声明可预览、播放或下载"),
      check("rights-layers-cleared", "适用权利层已清权", rightsLayersCleared(item.rightsLayers), "所有适用权利层须为 cleared，不适用层须明确标记"),
      check("evidence-gap-cleared", "开放无未决证据缺口", !hasText(item.evidenceGap), "开放资源不得保留任何未解决证据缺口"),
      check("asset-url", "受控文件地址", hasControlledAssetUrl(item.assetUrl), "只接受 media/ 下不含跳级、协议或查询参数的同源路径"),
      check("file-evidence-verified", "真实文件证据已核验", item.fileEvidence?.status === "verified" && item.fileEvidence?.verified === true, "必须由同源文件核验记录明确标记 verified=true"),
      check("file-signature", "真实文件签名", hasRealFileSignature(item.fileEvidence?.signature), "必须登记可识别的真实文件签名，不能用占位文本"),
      check("file-source-url", "同源文件 URL", hasHttpUrl(item.fileEvidence?.sourceFileUrl), "开放文件必须能回链到实际同源文件 URL"),
      check("file-verified-at", "文件核验日期", hasReviewDate(item.fileEvidence?.verifiedAt, today), "真实文件核验日期必须存在且不得晚于今天"),
      check("file-verification-log", "文件核验记录", hasText(item.fileEvidence?.verification), "必须保留真实文件签名、字节数和哈希的核验说明"),
      check("file-hash", "文件 SHA-256", hasSha256(item.fileHash) && hasSha256(item.fileEvidence?.sha256) && String(item.fileHash).toUpperCase() === String(item.fileEvidence?.sha256).toUpperCase(), "assetUrl 对应的文件哈希必须与同源核验文件 SHA-256 完全一致"),
      check("asset-file-binding", "托管地址与核验文件绑定", hasControlledAssetUrl(item.assetUrl) && hasControlledAssetUrl(item.fileEvidence?.assetUrl) && item.assetUrl === item.fileEvidence?.assetUrl, "assetUrl 必须与 fileEvidence.assetUrl 指向同一个已核验文件"),
      check("file-evidence-binding", "开放联合文件证据闭合", hasVerifiedFileEvidence(item, today), "verified、签名、字节数、同源 URL、核验日期、核验记录、托管地址和双重 SHA-256 必须同时闭合"),
      check("human-reviewed-flag", "真人复核标记", item.humanReviewed === true, "humanReviewed 必须显式为 true，不能用 reviewedBy 字符串替代"),
      check("human-review-signature", "结构化真人签字", hasHumanReviewSignature(item, today), "必须有 reviewerType=human、责任人 ID、签字日期、审阅日志和 humanReviewed=true；AI/自动化标签不得通过"),
      check("review-queue-signed-off", "人工队列已签字清空", hasSignedOffReviewQueue(item), "必须明确为 SIGNED_OFF 且 missing/blockers 均为空；缺失队列也不得开放")
    ];

    const admission = summarize(admissionChecks);
    const decision = summarize(decisionChecks);
    const open = summarize(openChecks);
    const external = summarize([
      ...decisionChecks,
      check("link-status", "外链判定", item.status === "link", "只有 link 状态可以作为合法来源外链"),
      check("link-access", "外链访问模式", item.access === "仅外链", "合法来源入口必须明确声明为仅外链")
    ]);

    return {
      admission,
      decision,
      open: { ...open, allowed: admission.allowed && open.allowed },
      external: { ...external, allowed: admission.allowed && external.allowed },
      hostedAccess: isHostedAccess(item.access),
      knownAccess: isKnownAccess(item.access)
    };
  }

  root.RIGHTS_GATE = Object.freeze({
    evaluate,
    hasHttpUrl,
    hasReviewDate,
    hasTerritories,
    hasRightsLayers,
    rightsLayersCleared,
    hasSha256,
    hasRealFileSignature,
    hasHumanReviewSignature,
    hasSignedOffReviewQueue,
    hasVerifiedFileEvidence,
    hasSafeEvidencePath,
    hasAuditLogRef,
    hasHumanReviewerId,
    hasControlledAssetUrl,
    isHostedAccess,
    allowedStatuses: Object.freeze(Array.from(ALLOWED_STATUSES)),
    allowedTypes: Object.freeze(Array.from(ALLOWED_TYPES))
  });
})(typeof window !== "undefined" ? window : globalThis);

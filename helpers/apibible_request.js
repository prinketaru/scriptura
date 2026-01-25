const API_BIBLE_BASE_URL = "https://rest.api.bible/v1";
const DEFAULT_SORT = "relevance";
const REQUEST_TIMEOUT_MS = 10000;
const API_BIBLE_KEY = process.env.API_BIBLE_KEY || null;

/**
 * Lightweight client helpers for api.bible search and passage retrieval.
 * These utilities keep network concerns, formatting, and query resolution in one place.
 */

/**
 * Normalizes error output so callers can handle failures consistently.
 */
function buildError(message, { status, raw } = {}) {
  return {
    error: true,
    message,
    status,
    raw: raw ?? null,
  };
}

/**
 * Internal fetch wrapper with timeout + error handling.
 */
async function apiBibleFetch(
  path,
  { queryParams = {}, signal, timeoutMs = REQUEST_TIMEOUT_MS } = {},
) {
  if (!API_BIBLE_KEY) {
    return buildError("Missing API_BIBLE_KEY env var.");
  }

  const url = new URL(`${API_BIBLE_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(queryParams)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) controller.abort();
    else
      signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
  }

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "api-key": API_BIBLE_KEY,
        accept: "application/json",
      },
      signal: controller.signal,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const apiMessage = json && (json.message || json.error);
      return buildError(
        apiMessage || `api.bible request failed (${res.status})`,
        {
          status: res.status,
          raw: json ?? null,
        },
      );
    }

    return { error: false, data: json };
  } catch (err) {
    if (err?.name === "AbortError") {
      return buildError(`api.bible request timed out after ${timeoutMs}ms`);
    }
    return buildError(err?.message || "Network error while calling api.bible");
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Searches within a bible for a verse reference or phrase.
 */
async function apiBibleSearch(
  bibleId,
  query,
  { sort = DEFAULT_SORT, limit, offset, signal, timeoutMs } = {},
) {
  if (!bibleId) return buildError("Missing bibleId.");
  if (!query) return buildError("Missing query.");

  return apiBibleFetch(`/bibles/${encodeURIComponent(bibleId)}/search`, {
    queryParams: { query, sort, limit, offset },
    signal,
    timeoutMs,
  });
}

/**
 * Fetches a passage by ID, returning structured JSON content.
 */
async function apiBibleGetPassage(
  bibleId,
  passageId,
  {
    contentType = "json",
    includeNotes = false,
    includeTitles = true,
    includeChapterNumbers = false,
    includeVerseNumbers = true,
    includeVerseSpans = false,
    useOrgId = false,
    signal,
    timeoutMs,
  } = {},
) {
  if (!bibleId) return buildError("Missing bibleId.");
  if (!passageId) return buildError("Missing passageId.");

  return apiBibleFetch(
    `/bibles/${encodeURIComponent(bibleId)}/passages/${encodeURIComponent(passageId)}`,
    {
      queryParams: {
        "content-type": contentType,
        "include-notes": includeNotes,
        "include-titles": includeTitles,
        "include-chapter-numbers": includeChapterNumbers,
        "include-verse-numbers": includeVerseNumbers,
        "include-verse-spans": includeVerseSpans,
        "use-org-id": useOrgId,
      },
      signal,
      timeoutMs,
    },
  );
}

/**
 * Flattens api.bible JSON content into a displayable string.
 * When `lineByLine` is true (Psalms), verses render on separate lines.
 */
function passageContentToText(content, { lineByLine = false } = {}) {
  if (!content) return "";
  const chunks = [];
  let stripLeadingVerseNumber = false;

  const ensureSpaceBeforeNextChunk = () => {
    if (chunks.length === 0) return;
    const last = chunks[chunks.length - 1];
    if (last && !/\s$/.test(last)) {
      chunks[chunks.length - 1] = `${last} `;
    }
  };

  const ensureNewlineBeforeNextChunk = () => {
    if (chunks.length === 0) return;
    const last = chunks[chunks.length - 1];
    if (last && !/\n$/.test(last)) {
      chunks[chunks.length - 1] = `${last}\n`;
    }
  };

  const pushText = (t) => {
    if (!t) return;
    let cleaned = String(t).replace(/^\s*¶\s*/, "");
    if (stripLeadingVerseNumber) {
      cleaned = cleaned.replace(/^\s*\d+\s*/, "");
      stripLeadingVerseNumber = false;
    }
    if (cleaned) chunks.push(cleaned);
  };

  const walk = (node) => {
    if (!node) return;

    if (Array.isArray(node)) {
      for (const n of node) walk(n);
      return;
    }

    if (node.type === "text") {
      pushText(node.text);
      return;
    }

    if (node.type === "tag") {
      if (lineByLine && node.name === "para" && node.attrs?.vid) {
        ensureSpaceBeforeNextChunk();
      }
      if (node.name === "verse" && node.attrs?.number) {
        if (lineByLine) {
          ensureNewlineBeforeNextChunk();
        } else {
          ensureSpaceBeforeNextChunk();
        }
        pushText(`[${node.attrs.number}] `);
        stripLeadingVerseNumber = true;
      }

      if (Array.isArray(node.items)) {
        for (const child of node.items) walk(child);
      }
    }
  };

  walk(content);

  let text = chunks
    .join("")
    .replace(/[ \t]{2,}/g, " ")
    .replace(lineByLine ? /\s*\n\s*/g : /$^/, lineByLine ? "\n" : "")
    .trim();

  if (lineByLine && text) {
    text = text.replace(/\n/g, " \n");
  }

  return text ? `${text} ` : "";
}

/**
 * Resolves a user query to either a passage or a search result set.
 * The helper returns a typed object describing the outcome.
 */
async function apiBibleResolveQuery(
  bibleId,
  query,
  { includeRaw = false, signal, timeoutMs, sort = DEFAULT_SORT } = {},
) {
  const searchRes = await apiBibleSearch(bibleId, query, {
    sort,
    signal,
    timeoutMs,
  });
  if (searchRes.error) return searchRes;

  const payload = searchRes.data;
  const data = payload?.data;

  if (Array.isArray(data?.passages) && data.passages.length > 0) {
    const passageHit = data.passages[0];
    const passageId = passageHit?.id;
    if (!passageId) {
      return buildError("Search returned a passage without an id.");
    }

    const passageRes = await apiBibleGetPassage(bibleId, passageId, {
      contentType: "json",
      includeNotes: false,
      includeTitles: true,
      includeChapterNumbers: false,
      includeVerseNumbers: true,
      includeVerseSpans: false,
      useOrgId: false,
      signal,
      timeoutMs,
    });

    if (passageRes.error) return passageRes;

    const passageData = passageRes.data?.data;
    const referenceCandidate =
      passageData?.reference ?? passageHit?.reference ?? query;
    const lineByLine = /^psalms?\b/i.test(referenceCandidate ?? "");
    const text = passageContentToText(passageData?.content, { lineByLine });

    const result = {
      error: false,
      kind: "passage",
      query,
      id: passageData?.id ?? passageId,
      reference: referenceCandidate,
      verseCount: passageData?.verseCount ?? passageHit?.verseCount ?? null,
      text,
      copyright: passageData?.copyright ?? passageHit?.copyright ?? null,
    };
    if (includeRaw) result.raw = passageRes.data;
    return result;
  }

  if (Array.isArray(data?.verses) && data.verses.length > 0) {
    const result = {
      error: false,
      kind: "search",
      query: data?.query ?? query,
      total: data?.total ?? null,
      limit: data?.limit ?? null,
      offset: data?.offset ?? null,
      verses: data.verses.map((v) => ({
        id: v.id,
        reference: v.reference,
        text: v.text,
      })),
    };
    if (includeRaw) result.raw = searchRes.data;
    return result;
  }

  const result = {
    error: false,
    kind: "empty",
    query,
  };
  if (includeRaw) result.raw = searchRes.data;
  return result;
}

module.exports = {
  apiBibleSearch,
  apiBibleGetPassage,
  apiBibleResolveQuery,
  passageContentToText,
};

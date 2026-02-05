/**
 * api.bible Client
 * 
 * Provides helper functions for interacting with the api.bible service,
 * which offers access to 23+ Bible translations in multiple languages.
 * 
 * This module handles:
 * - Bible search (phrase and reference)
 * - Passage retrieval with structured JSON content
 * - Query resolution (automatically determining passage vs search)
 * - Content formatting and text extraction
 * 
 * API Documentation: https://docs.api.bible/
 * 
 * Required Environment Variables:
 * - API_BIBLE_KEY: Authentication key from scripture.api.bible
 * 
 * @module helpers/apibible_request
 */

/** @constant {string} Base URL for api.bible REST API */
const API_BIBLE_BASE_URL = 'https://rest.api.bible/v1';

/** @constant {string} Default sort order for search results */
const DEFAULT_SORT = 'relevance';

/** @constant {number} Request timeout in milliseconds (10 seconds) */
const REQUEST_TIMEOUT_MS = 10000;

/** @constant {string|null} api.bible authentication key from environment */
const API_BIBLE_KEY = process.env.API_BIBLE_KEY || null;

/**
 * Creates a standardized error object for API failures.
 * 
 * Normalizes error responses so callers can handle failures consistently
 * without checking multiple error formats.
 * 
 * @private
 * @param {string} message - Human-readable error description
 * @param {Object} [options={}] - Additional error context
 * @param {number} [options.status] - HTTP status code
 * @param {*} [options.raw] - Raw API response data
 * @returns {Object} Normalized error object with { error: true, message, status, raw }
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
 * Internal HTTP client for api.bible with timeout and error handling.
 * 
 * Features:
 * - Automatic timeout after REQUEST_TIMEOUT_MS
 * - Query parameter serialization
 * - Authentication header injection
 * - Graceful error handling with normalized responses
 * - Support for external AbortSignal
 * 
 * @private
 * @param {string} path - API endpoint path (e.g., '/bibles/{bibleId}/search')
 * @param {Object} [options={}] - Request options
 * @param {Object} [options.queryParams={}] - Query string parameters
 * @param {AbortSignal} [options.signal] - External abort signal
 * @param {number} [options.timeoutMs=REQUEST_TIMEOUT_MS] - Request timeout
 * @returns {Promise<{error: false, data: Object}|{error: true, message: string}>}
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
 * Searches within a Bible for verses matching a query.
 * 
 * Can be used for both:
 * - Direct verse references (e.g., "John 3:16")
 * - Phrase searches (e.g., "love your neighbor")
 * 
 * The API returns either passages (direct references) or verses (search results).
 * 
 * @param {string} bibleId - api.bible Bible ID (e.g., 'de4e12af7f28f599-01' for KJV)
 * @param {string} query - Search query or verse reference
 * @param {Object} [options={}] - Search options
 * @param {string} [options.sort='relevance'] - Sort order: 'relevance' or 'canonical'
 * @param {number} [options.limit] - Maximum results per page
 * @param {number} [options.offset] - Result offset for pagination
 * @param {AbortSignal} [options.signal] - Abort signal for cancellation
 * @param {number} [options.timeoutMs] - Custom timeout
 * @returns {Promise<Object>} API response with search results
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
 * Fetches a specific Bible passage by its api.bible ID.
 * 
 * Returns structured JSON content that can be formatted into text.
 * Content includes verse numbers, paragraphs, and formatting tags.
 * 
 * @param {string} bibleId - api.bible Bible ID
 * @param {string} passageId - Passage ID from search results
 * @param {Object} [options={}] - Passage formatting options
 * @param {string} [options.contentType='json'] - Response format: 'json', 'text', or 'html'
 * @param {boolean} [options.includeNotes=false] - Include footnotes and study notes
 * @param {boolean} [options.includeTitles=true] - Include section headings
 * @param {boolean} [options.includeChapterNumbers=false] - Show chapter numbers
 * @param {boolean} [options.includeVerseNumbers=true] - Show verse numbers
 * @param {boolean} [options.includeVerseSpans=false] - Include verse span info
 * @param {boolean} [options.useOrgId=false] - Use organizational IDs
 * @param {AbortSignal} [options.signal] - Abort signal
 * @param {number} [options.timeoutMs] - Custom timeout
 * @returns {Promise<Object>} API response with passage content
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
 * Converts api.bible JSON content structure to readable plain text.
 * 
 * Processes the structured JSON content returned by api.bible and flattens
 * it into a human-readable string. Handles:
 * - Verse numbers (formatted as [1], [2], etc.)
 * - Paragraph breaks
 * - Poetry/Psalm formatting (line-by-line when enabled)
 * - Nested tag structures
 * - Whitespace normalization
 * 
 * @param {Object|Array} content - api.bible JSON content tree
 * @param {Object} [options={}] - Formatting options
 * @param {boolean} [options.lineByLine=false] - Format verses on separate lines (for Psalms)
 * @returns {string} Formatted passage text with verse numbers
 * 
 * @example
 * // Standard passage
 * const text = passageContentToText(jsonContent);
 * // Output: "[1] In the beginning... [2] And the earth..."
 * 
 * @example
 * // Psalm (line-by-line)
 * const text = passageContentToText(jsonContent, { lineByLine: true });
 * // Output: "[1] The Lord is my shepherd\n[2] He makes me lie down..."
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
 * Intelligently resolves a user query to passage or search results.
 * 
 * This is the primary entry point for Bible lookups. It:
 * 1. Searches the Bible using the query
 * 2. If passages found: Fetches the first passage content
 * 3. If verses found: Returns search results for pagination
 * 4. If nothing found: Returns empty result
 * 
 * Return types:
 * - { kind: 'passage', text, reference, ... } - Direct verse reference
 * - { kind: 'search', verses, total, ... } - Multiple search results
 * - { kind: 'empty', query } - No results found
 * - { error: true, message, ... } - API failure
 * 
 * @param {string} bibleId - api.bible Bible ID
 * @param {string} query - User's search query or verse reference
 * @param {Object} [options={}] - Resolution options
 * @param {boolean} [options.includeRaw=false] - Include raw API response
 * @param {AbortSignal} [options.signal] - Abort signal
 * @param {number} [options.timeoutMs] - Custom timeout
 * @param {string} [options.sort='relevance'] - Search sort order
 * @param {boolean} [options.includeNotes=false] - Include footnotes and study notes
 * @param {boolean} [options.includeTitles=true] - Include section headings
 * @param {boolean} [options.includeVerseNumbers=true] - Include verse numbers
 * @param {'auto'|'on'|'off'} [options.lineByLine='auto'] - Line-by-line formatting for Psalms or poetry
 * @returns {Promise<Object>} Typed result object
 * 
 * @example
 * const result = await apiBibleResolveQuery(bibleId, 'John 3:16');
 * if (result.kind === 'passage') {
 *   console.log(result.text); // "For God so loved the world..."
 * }
 */
async function apiBibleResolveQuery(
  bibleId,
  query,
  {
    includeRaw = false,
    signal,
    timeoutMs,
    sort = DEFAULT_SORT,
    includeNotes = false,
    includeTitles = true,
    includeVerseNumbers = true,
    lineByLine = 'auto',
  } = {},
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
      includeNotes,
      includeTitles,
      includeChapterNumbers: false,
      includeVerseNumbers,
      includeVerseSpans: false,
      useOrgId: false,
      signal,
      timeoutMs,
    });

    if (passageRes.error) return passageRes;

    const passageData = passageRes.data?.data;
    const referenceCandidate =
      passageData?.reference ?? passageHit?.reference ?? query;
    const isPsalm = /^psalms?\b/i.test(referenceCandidate ?? "");
    const useLineByLine =
      lineByLine === 'auto'
        ? isPsalm
        : lineByLine === 'on'
          ? true
          : false;
    const text = passageContentToText(passageData?.content, { lineByLine: useLineByLine });

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

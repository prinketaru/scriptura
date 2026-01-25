const ESV_PASSAGE_URL = "https://api.esv.org/v3/passage/text/";
const ESV_SEARCH_URL = "https://api.esv.org/v3/passage/search/";
const ESV_API_KEY = process.env.ESV_API_KEY;
const REQUEST_TIMEOUT_MS = 10000;

/**
 * ESV API helpers with a shared request layer and timeout handling.
 */

const fetchFn = (() => {
  if (typeof fetch === "function") {
    return fetch;
  }
  let cachedFetch;
  return async (...args) => {
    if (!cachedFetch) {
      ({ default: cachedFetch } = await import("node-fetch"));
    }
    return cachedFetch(...args);
  };
})();

if (!ESV_API_KEY) {
  throw new Error("ESV_API_KEY is not defined in the environment variables.");
}

const ESV_HEADERS = {
  Authorization: `Token ${ESV_API_KEY}`,
};

/**
 * Executes a request against the ESV API and returns parsed JSON.
 */
async function esvRequest(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchFn(url, {
      method: "GET",
      headers: ESV_HEADERS,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(
        "ESV API error:",
        response.status,
        response.statusText,
        errorBody,
      );
      throw new Error(`ESV API request failed with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        `ESV API request timed out after ${REQUEST_TIMEOUT_MS}ms`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches a formatted passage for a verse reference.
 */
async function esvPassageRequest(verse) {
  const query = new URLSearchParams({
    "include-footnote-body": "false",
    "include-footnotes": "false",
    "include-passage-references": "false",
    "include-short-copyright": "false",
    "include-headings": "false",
    q: verse,
  });

  const url = `${ESV_PASSAGE_URL}?${query.toString()}`;
  return esvRequest(url);
}

/**
 * Searches the ESV API for a phrase or reference.
 */
async function esvSearchRequest(text, { page, pageSize } = {}) {
  const query = new URLSearchParams({
    q: text,
  });

  if (typeof page === "number") query.set("page", String(page));
  if (typeof pageSize === "number") query.set("page-size", String(pageSize));

  const url = `${ESV_SEARCH_URL}?${query.toString()}`;
  return esvRequest(url);
}

module.exports = {
  esvPassageRequest,
  esvSearchRequest,
};

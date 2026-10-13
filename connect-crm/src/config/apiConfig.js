/**
 * Connect CRM — API base URL
 *
 * Production (single-folder build): always from /crmappointza-urls.json next to crmappointza.exe
 *   - frontendApiBaseUrl: public API origin the browser calls
 *   - empty frontendApiBaseUrl: same origin as the page
 *   - 0.0.0.0 / :: is rewritten to localhost (bind address is not a browser URL)
 *
 * Local dev: connect-crm/.env → VITE_API_BASE_URL (not used in the Kestrel build)
 */

/** Change once for local dev when you do not use .env */
export const DEFAULT_DEV_API_BASE = "http://localhost:5050";

export const CRM_APPOINTZA_URLS_PATH = "/crmappointza-urls.json";

const envRaw = import.meta.env.VITE_API_BASE_URL;
const legacyRaw = import.meta.env.VITE_API_URL;

/** @type {string | null} */
let runtimeApiBase = null;
/** @type {Promise<void> | null} */
let urlsLoadPromise = null;

function trimBase(value) {
  return String(value ?? "").trim().replace(/\/$/, "");
}

/** Bind addresses (0.0.0.0) cannot be fetched from the browser. */
function toBrowserOrigin(url) {
  const value = trimBase(url);
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (parsed.hostname === "0.0.0.0" || parsed.hostname === "::" || parsed.hostname === "[::]") {
      parsed.hostname = "localhost";
    }
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return trimBase(parsed.toString());
  } catch {
    return value.replace(/:\/\/0\.0\.0\.0/gi, "://localhost");
  }
}

function applyEnvBase() {
  if (!import.meta.env.DEV) {
    if (typeof window !== "undefined" && window.location?.origin) {
      runtimeApiBase = trimBase(window.location.origin);
      return;
    }
    runtimeApiBase = "";
    return;
  }

  const chosen =
    envRaw !== undefined
      ? envRaw
      : legacyRaw !== undefined
        ? legacyRaw
        : DEFAULT_DEV_API_BASE;

  if (chosen === "") {
    runtimeApiBase = "";
    return;
  }

  const trimmed = chosen != null && String(chosen).trim() !== "" ? trimBase(chosen) : "";
  runtimeApiBase = trimmed || DEFAULT_DEV_API_BASE;
}

/**
 * Load /crmappointza-urls.json before API calls in production builds.
 * @returns {Promise<void>}
 */
export function ensureCrmAppointzaUrlsLoaded() {
  if (urlsLoadPromise) return urlsLoadPromise;
  if (typeof window === "undefined") {
    applyEnvBase();
    return Promise.resolve();
  }

  urlsLoadPromise = (async () => {
    if (import.meta.env.DEV) {
      applyEnvBase();
      return;
    }
    try {
      const res = await fetch(CRM_APPOINTZA_URLS_PATH, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const fromFile = toBrowserOrigin(data.frontendApiBaseUrl);
        if (fromFile) {
          runtimeApiBase = fromFile;
          return;
        }
      }
    } catch {
      /* fall through to same-origin */
    }
    applyEnvBase();
  })();

  return urlsLoadPromise;
}

/** @returns {string} base URL or "" for mock mode */
export function getApiBaseUrl() {
  if (runtimeApiBase === null) applyEnvBase();
  return runtimeApiBase ?? "";
}

export function isApiEnabled() {
  return !!getApiBaseUrl();
}

/** Full URL: API base + path (path should start with `/`). */
export function apiUrl(path) {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error(
      "API base URL is not set. In the build, set frontendApiBaseUrl in crmappointza-urls.json " +
        `(next to crmappointza.exe). Local dev: VITE_API_BASE_URL in connect-crm/.env (e.g. ${DEFAULT_DEV_API_BASE}).`,
    );
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** e.g. http://localhost:5053/webhooks/whatsapp */
export function apiWebhookUrl(channel) {
  const ch = String(channel || "whatsapp").replace(/^\/+|\/+$/g, "");
  return apiUrl(`/webhooks/${ch}`);
}

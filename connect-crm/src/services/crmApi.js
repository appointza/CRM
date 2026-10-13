import { apiUrl, getApiBaseUrl, isApiEnabled, ensureCrmAppointzaUrlsLoaded } from "@/config/apiConfig";
import { CRM_SESSION_STORAGE_KEY } from "@/constants/session";

let sessionGetter = () => ({ token: null, orgHeader: null });

function readSessionFromStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return { token: null, orgHeader: null };
  }
  try {
    const raw = window.localStorage.getItem(CRM_SESSION_STORAGE_KEY);
    if (!raw) return { token: null, orgHeader: null };
    const s = JSON.parse(raw);
    const user = s.user ?? null;
    const org = s.organization ?? null;
    const token = s.accessToken ?? null;
    const orgHeader =
      user?.role === "super_admin" ? org?.id ?? null : user?.organization_id ?? null;
    return { token, orgHeader };
  } catch {
    return { token: null, orgHeader: null };
  }
}

export function isApiMode() {
  return isApiEnabled();
}

export function configureCrmSession(getter) {
  sessionGetter = getter;
}

/**
 * Normalize Nest, ASP.NET (AppException), and ProblemDetails error bodies.
 */
export function formatApiErrorBody(text, status, statusText) {
  if (!text || !String(text).trim()) {
    return statusText || `Request failed (${status})`;
  }
  const raw = String(text).trim();
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j.message)) return j.message.filter(Boolean).join(", ");
    if (typeof j.message === "string" && j.message.trim()) return j.message.trim();
    if (typeof j.Message === "string" && j.Message.trim()) return j.Message.trim();
    if (typeof j.detail === "string" && j.detail.trim()) return j.detail.trim();
    if (typeof j.title === "string" && j.title.trim() && !j.detail) return j.title.trim();
    if (j.errors && typeof j.errors === "object") {
      const parts = [];
      for (const [field, val] of Object.entries(j.errors)) {
        if (Array.isArray(val)) parts.push(`${field}: ${val.join(", ")}`);
        else if (val) parts.push(String(val));
      }
      if (parts.length) return parts.join("; ");
    }
    if (typeof j.key === "string" && j.key.trim()) {
      return j.key.replace(/([a-z])([A-Z])/g, "$1 $2");
    }
  } catch {
    /* plain text or HTML */
  }
  if (raw.startsWith("<") && raw.length > 120) {
    return statusText || `Request failed (${status})`;
  }
  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}

async function parseError(res) {
  const text = await res.text();
  return formatApiErrorBody(text, res.status, res.statusText);
}

function ensureBase() {
  if (!getApiBaseUrl()) {
    throw new Error(
      "API base URL is not set — set VITE_API_BASE_URL in connect-crm/.env (see src/config/apiConfig.js)",
    );
  }
}

/**
 * Single path for all API HTTP calls: always `fetch(apiUrl(path), ...)`.
 */
async function apiRequest(path, options = {}, { withAuth }) {
  await ensureCrmAppointzaUrlsLoaded();
  ensureBase();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (withAuth) {
    const fromGetter = sessionGetter();
    const fromStorage = readSessionFromStorage();
    const token = fromGetter.token || fromStorage.token;
    const orgHeader = fromGetter.orgHeader ?? fromStorage.orgHeader;
    if (!token) {
      throw new Error(
        "Not signed in (no JWT). Open the app, sign in through the UI, then try again. " +
          "If you are calling the API manually, send header: Authorization: Bearer <token> from POST /auth/login.",
      );
    }
    headers.Authorization = `Bearer ${token}`;
    if (orgHeader) headers["X-Organization-Id"] = orgHeader;
  }
  let res;
  try {
    res = await fetch(apiUrl(path), { ...options, headers });
  } catch (networkErr) {
    const message =
      networkErr?.message ||
      "Network error — could not reach the API. Check VITE_API_BASE_URL and that the server is running.";
    throw new Error(message);
  }

  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Login, register, etc. — no JWT. Still uses API_BASE_URL. */
export function apiFetchPublic(path, options = {}) {
  return apiRequest(path, options, { withAuth: false });
}

/** Authenticated routes — API_BASE_URL + Bearer + X-Organization-Id. */
export function apiFetch(path, options = {}) {
  return apiRequest(path, options, { withAuth: true });
}

/** Use in UI: `toast.error(getApiErrorMessage(err))` */
export function getApiErrorMessage(err) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong";
}

export { apiUrl, getApiBaseUrl, isApiEnabled };

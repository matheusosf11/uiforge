// Cheap filter against other sites and naive scripts spending the model quota
// through this app's API. It is not authentication: a determined client can
// forge these headers, which is why the per-IP limits still apply.

/**
 * True when the browser says the request comes from another site, or when it
 * sends an Origin whose host differs from the one being called. Requests with
 * neither header (curl, server to server) pass and meet the rate limits.
 */
export function isForeignOrigin(req: Request): boolean {
  if (req.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return true;
  }
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host") ||
    new URL(req.url).host;
  return originHost !== host;
}

/** JSON-only endpoints: form posts from other pages are refused. */
export function isJsonRequest(req: Request): boolean {
  const type = req.headers.get("content-type") ?? "";
  return type.toLowerCase().startsWith("application/json");
}

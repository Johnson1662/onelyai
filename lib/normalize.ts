const TRACKING_PARAMS = new Set(["fbclid", "gclid", "ref", "si"]);

export function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export function canonicalizeUrl(value: string) {
  const input = cleanText(value);
  if (!input) return "";

  const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.hash = "";
  url.searchParams.forEach((_, key) => {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  });
  url.search = [...url.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${encodeURIComponent(key)}=${encodeURIComponent(entry)}`)
    .join("&");
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString().replace(/\/$/, "");
}

export function normalizeIdentity(value: string) {
  return cleanText(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function extractEmails(value: string) {
  return [...new Set(cleanText(value).toLowerCase().match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) ?? [])];
}

export function getDomain(value: string) {
  try {
    return new URL(canonicalizeUrl(value)).hostname;
  } catch {
    return "";
  }
}

export function hasPublicEmail(value: string) {
  return extractEmails(value).length > 0;
}

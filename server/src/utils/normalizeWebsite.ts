export function normalizeWebsite(url: string): string {
  let normalized = url.trim().toLowerCase();
  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  try {
    const parsed = new URL(normalized);
    // Remove www.
    let host = parsed.hostname;
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }
    // Strip trailing slash from pathname
    let pathname = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${host}${pathname}`;
  } catch {
    // If URL parsing fails, do basic normalization
    normalized = normalized.replace(/^https?:\/\/www\./, 'https://');
    normalized = normalized.replace(/\/+$/, '');
    return normalized;
  }
}

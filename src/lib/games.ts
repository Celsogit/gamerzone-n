import type { Game } from "./airtable.functions";

/**
 * Las vistas ahora son globales (compartidas entre todos los usuarios y
 * dispositivos) y se guardan con Netlify Blobs. Ver `src/lib/views.functions.ts`.
 */

export function youtubeSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${name} official trailer`,
  )}`;
}

export function recentlyAdded(games: Game[], limit = 18): Game[] {
  return [...games]
    .sort(
      (a, b) => b.createdTime.localeCompare(a.createdTime) || a.name.localeCompare(b.name, "es"),
    )
    .slice(0, limit);
}

export function youtubeIdFromUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

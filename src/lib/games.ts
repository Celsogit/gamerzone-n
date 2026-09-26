import type { Game } from "./games-data";

/**
 * Las vistas son globales (compartidas entre todos los usuarios y dispositivos)
 * y se guardan en la tabla `views` de Supabase. Ver `src/lib/games-data.ts`.
 */

export function formatTrailerSearchQuery(name: string, platform?: string | null): string {
  const cleanName = name.trim();
  const cleanPlatform = platform?.trim();
  if (cleanPlatform) {
    return `trailer oficial de ${cleanName} de ${cleanPlatform}`;
  }
  return `trailer oficial de ${cleanName}`;
}

export function youtubeSearchUrl(name: string, platform?: string | null): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    formatTrailerSearchQuery(name, platform),
  )}`;
}

export function recentlyAdded(games: Game[], limit = 18): Game[] {
  return [...games]
    .sort(
      (a, b) => b.createdTime.localeCompare(a.createdTime) || a.name.localeCompare(b.name, "es"),
    )
    .slice(0, limit);
}

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

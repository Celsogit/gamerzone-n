import type { Game } from "./airtable.functions";

const VIEWS_KEY = "game-views-v1";


export function youtubeSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${name} official trailer`,
  )}`;
}

export function readViews(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(VIEWS_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function trackView(id: string): Record<string, number> {
  const views = readViews();
  views[id] = (views[id] ?? 0) + 1;
  try {
    window.localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
  } catch {
    /* ignore quota errors */
  }
  return views;
}

export function mostViewed(games: Game[], views: Record<string, number>, limit = 15): Game[] {
  return [...games]
    .sort((a, b) => {
      const diff = (views[b.id] ?? 0) - (views[a.id] ?? 0);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name, "es");
    })
    .slice(0, limit);
}

export function recentlyAdded(games: Game[], limit = 18): Game[] {
  return [...games]
    .sort((a, b) => b.createdTime.localeCompare(a.createdTime) || a.name.localeCompare(b.name, "es"))
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

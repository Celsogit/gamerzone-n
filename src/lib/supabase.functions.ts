import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { lookupTrailer, lookupWikipedia } from "./game-lookup.server";

export type Game = {
  id: string;
  name: string;
  platform: string;
  cover: string | null;
  banner: string | null;
  heading: string | null;
  description: string | null;
  trailer: string | null;
  createdTime: string;
};

export type Catalog = {
  platforms: string[];
  games: Game[];
};

type SupabaseGameRecord = {
  id: string;
  created_at: string;
  Nombre: string | null;
  url: string | null;
  Descripción: string | null;
  Tráiler: string | null;
};

type SupabaseNewsRecord = {
  id: string;
  created_at: string;
  "Texto 1": string | null;
  "texto 2": string | null;
  "texto 3": string | null;
  url: string | null;
};

const SUPABASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.["VITE_SUPABASE_URL"]) ||
  "https://ulnomncbhccqrynzlqqf.supabase.co";

const SUPABASE_ANON_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.["VITE_SUPABASE_ANON_KEY"]) ||
  "sb_publishable_USfwfy2ONPItJiHlwecXZw_EF9x49Rp";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLES: Array<{ platform: string; table: string }> = [
  { platform: "3DS", table: "3DS" },
  { platform: "WII", table: "WII" },
  { platform: "WIIU", table: "WIIU" },
  { platform: "SWITCH", table: "SWITCH" },
  { platform: "PS1", table: "PS1" },
  { platform: "PS2", table: "PS2" },
  { platform: "PSP", table: "PSP" },
  { platform: "PS3", table: "PS3" },
  { platform: "PSVITA", table: "PSVITA" },
  { platform: "PS4", table: "PS4" },
  { platform: "PS5", table: "PS5" },
  { platform: "XBOX", table: "XBOX" },
  { platform: "XBOX360", table: "XBOX360" },
  { platform: "PC", table: "PC" },
  { platform: "NOTICIAS", table: "BANNER" },
];

const CATALOG_TTL_MS = 5 * 60_000;
let catalogCache: { data: Catalog; expiresAt: number } | null = null;
let catalogInFlight: Promise<Catalog> | null = null;

export const listCatalog = createServerFn({ method: "GET" }).handler(async (): Promise<Catalog> => {
  const now = Date.now();
  if (catalogCache && catalogCache.expiresAt > now) {
    console.log("listCatalog: returning cached data");
    return catalogCache.data;
  }
  if (catalogInFlight) {
    console.log("listCatalog: returning in-flight promise");
    return catalogInFlight;
  }

  console.log("listCatalog: fetching fresh data");
  catalogInFlight = loadCatalog()
    .then((catalog) => {
      catalogCache = { data: catalog, expiresAt: Date.now() + CATALOG_TTL_MS };
      console.log("listCatalog: cached fresh data");
      return catalog;
    })
    .catch((error) => {
      console.error("loadCatalog falló:", error);
      if (catalogCache) {
        console.warn("Usando caché previo como fallback");
        return catalogCache.data;
      }
      throw error;
    })
    .finally(() => {
      catalogInFlight = null;
    });

  return catalogInFlight;
});

async function loadCatalog(): Promise<Catalog> {
  if (!SUPABASE_ANON_KEY) {
    throw new Error("Supabase anon key is not configured");
  }

  const platforms: string[] = [];
  for (const source of TABLES) {
    if (source.platform === "NOTICIAS") continue;
    if (!platforms.includes(source.platform)) platforms.push(source.platform);
  }

  const results: Game[][] = [];
  for (const source of TABLES) {
    const { platform, table } = source;
    const isNews = table === "BANNER";

    console.log(`loadCatalog: querying table ${table} (platform: ${platform}, isNews: ${isNews})`);

    let query = supabase.from(table).select(isNews ? 'id, "Texto 1", "Texto 2", "Texto 3", url' : "id, Nombre, url, Descripción, Tráiler");

    const { data, error } = await query;

    if (error) {
      console.error(`Supabase request failed [${table}]:`, error.message);
      throw new Error(`Supabase request failed: ${error.message}`);
    }

    // DEBUG: log columnas reales de BANNER
    if (isNews && data && data.length > 0) {
      console.log("BANNER columns:", Object.keys(data[0]));
      console.log("BANNER sample row:", data[0]);
    } else if (isNews) {
      console.log("BANNER: no data returned");
    }

    const games: Game[] = [];
    const records = (data as unknown as Record<string, unknown>[]) || [];
    for (const record of records) {
      const name = isNews ? (record["Texto 2"] as string | null) : (record["Nombre"] as string | null);
      if (!name?.trim()) continue;

      if (isNews) {
        games.push({
          id: record["id"] as string,
          name: (record["Texto 2"] as string | null)?.trim() ?? "",
          platform,
          cover: null,
          banner: (record["url"] as string | null) ?? null,
          heading: (record["Texto 1"] as string | null)?.trim() ?? null,
          description: (record["Texto 3"] as string | null)?.trim() ?? null,
          trailer: null,
          createdTime: new Date().toISOString(),
        });
      } else {
        games.push({
          id: record["id"] as string,
          name: (record["Nombre"] as string | null)?.trim() ?? "",
          platform,
          cover: (record["url"] as string | null) ?? null,
          banner: null,
          description: (record["Descripción"] as string | null)?.trim() ?? null,
          heading: null,
          trailer: (record["Tráiler"] as string | null)?.trim() ?? null,
          createdTime: new Date().toISOString(),
        });
      }
    }
    results.push(games);
  }

  const games = results
    .flat()
    .sort(
      (a, b) =>
        platforms.indexOf(a.platform) - platforms.indexOf(b.platform) ||
        a.name.localeCompare(b.name, "es"),
    );

  return { platforms, games };
}

export const getGameDetails = createServerFn({ method: "GET" })
  .inputValidator((data: { name: string; platform?: string | undefined }) => {
    const name = String(data?.name ?? "")
      .trim()
      .slice(0, 200);
    const platform = data?.platform ? String(data.platform).trim().slice(0, 50) : undefined;
    if (!name) throw new Error("Nombre requerido");
    return { name, platform };
  })
  .handler(
    async ({
      data,
    }): Promise<{
      extract: string | null;
      wikipediaUrl: string | null;
      videoId: string | null;
    }> => {
      const [wiki, videoId] = await Promise.all([
        lookupWikipedia(data.name),
        lookupTrailer(data.name, data.platform),
      ]);
      return { extract: wiki.extract, wikipediaUrl: wiki.url, videoId };
    },
  );
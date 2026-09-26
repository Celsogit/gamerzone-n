import { createClient } from "@supabase/supabase-js";

import { lookupWikipedia } from "./game-lookup.server";
import { youtubeIdFromUrl } from "./games";

/**
 * Capa de datos 100% cliente.
 *
 * Antes esto vivía en `createServerFn` (server functions de TanStack Start), lo
 * que obligaba a tener un servidor Node. GitHub Pages solo sirve archivos
 * estáticos, así que aquí se consulta Supabase directamente desde el navegador
 * con la clave publicable (que es pública por diseño) y la sinopsis se pide a la
 * API de Wikipedia, que expone CORS abierto.
 */

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

export type GameDetails = {
  extract: string | null;
  wikipediaUrl: string | null;
  videoId: string | null;
};

const SUPABASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.["VITE_SUPABASE_URL"]) ||
  "https://ulnomncbhccqrynzlqqf.supabase.co";

const SUPABASE_ANON_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.["VITE_SUPABASE_ANON_KEY"]) ||
  "sb_publishable_USfwfy2ONPItJiHlwecXZw_EF9x49Rp";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

/** Catálogo completo: plataformas + juegos (con caché en memoria). */
export async function getCatalog(): Promise<Catalog> {
  const now = Date.now();
  if (catalogCache && catalogCache.expiresAt > now) return catalogCache.data;
  if (catalogInFlight) return catalogInFlight;

  catalogInFlight = loadCatalog()
    .then((catalog) => {
      catalogCache = { data: catalog, expiresAt: Date.now() + CATALOG_TTL_MS };
      return catalog;
    })
    .catch((error) => {
      console.error("No se pudo cargar el catálogo:", error);
      if (catalogCache) return catalogCache.data;
      throw error;
    })
    .finally(() => {
      catalogInFlight = null;
    });

  return catalogInFlight;
}

async function loadCatalog(): Promise<Catalog> {
  const platforms: string[] = [];
  for (const source of TABLES) {
    if (source.platform === "NOTICIAS") continue;
    if (!platforms.includes(source.platform)) platforms.push(source.platform);
  }

  const rows = await Promise.all(
    TABLES.map(async ({ table }) => {
      const isNews = table === "BANNER";
      const { data, error } = await supabase
        .from(table)
        .select(
          isNews
            ? 'id, "Texto 1", "Texto 2", "Texto 3", url'
            : "id, Nombre, url, Descripción, Tráiler",
        );

      if (error) {
        console.error(`Supabase request failed [${table}]: ${error.message}`);
        throw new Error(`No se pudo leer la tabla ${table}: ${error.message}`);
      }

      return { table, isNews, records: (data as unknown as Record<string, unknown>[]) ?? [] };
    }),
  );

  const games: Game[] = [];

  for (const { table, isNews, records } of rows) {
    const platform = TABLES.find((source) => source.table === table)?.platform ?? table;

    for (const record of records) {
      const name = isNews
        ? (record["Texto 2"] as string | null)
        : (record["Nombre"] as string | null);
      if (!name?.trim()) continue;

      const createdTime = (record["created_at"] as string | null) ?? new Date().toISOString();
      const trailerUrl = (record["Tráiler"] as string | null)?.trim() ?? null;

      games.push({
        id: String(record["id"]),
        name: name.trim(),
        platform,
        cover: isNews ? null : ((record["url"] as string | null) ?? null),
        banner: isNews ? ((record["url"] as string | null) ?? null) : null,
        heading: isNews ? ((record["Texto 1"] as string | null)?.trim() ?? null) : null,
        description: isNews
          ? ((record["Texto 3"] as string | null)?.trim() ?? null)
          : ((record["Descripción"] as string | null)?.trim() ?? null),
        // En la columna "Tráiler" se puede pegar la URL de YouTube o el ID suelto.
        trailer: youtubeIdFromUrl(trailerUrl ?? "") ?? trailerUrl,
        createdTime,
      });
    }
  }

  games.sort(
    (a, b) =>
      platforms.indexOf(a.platform) - platforms.indexOf(b.platform) ||
      a.name.localeCompare(b.name, "es"),
  );

  return { platforms, games };
}

/** Sinopsis desde la API abierta de Wikipedia (CORS permitido). */
export async function getGameDetails(name: string): Promise<GameDetails> {
  const cleanName = String(name ?? "")
    .trim()
    .slice(0, 200);
  if (!cleanName) return { extract: null, wikipediaUrl: null, videoId: null };

  try {
    const wiki = await lookupWikipedia(cleanName);
    return { extract: wiki.extract, wikipediaUrl: wiki.url, videoId: null };
  } catch (error) {
    console.error("Wikipedia lookup failed", error);
    return { extract: null, wikipediaUrl: null, videoId: null };
  }
}

/** Ranking global de vistas: { gameId: count }. */
export async function getGlobalViews(): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase.from("views").select("game_id, count");
    if (error) {
      console.warn("[views] No se pudieron leer las vistas:", error.message);
      return {};
    }
    const views: Record<string, number> = {};
    for (const row of data ?? []) {
      views[String(row.game_id)] = Number(row.count) || 0;
    }
    return views;
  } catch (error) {
    console.warn("[views] Supabase no disponible:", error);
    return {};
  }
}

/** Registra una vista. Necesita permiso de INSERT en la tabla `views`. */
export async function trackGlobalView(gameId: string): Promise<void> {
  const id = String(gameId ?? "")
    .trim()
    .slice(0, 300);
  if (!id) return;

  try {
    // Función RPC atómica (evita perder incrementos cuando hay varios usuarios
    // a la vez). Si todavía no existe en Supabase, caemos al upsert.
    const { error } = await supabase.rpc("increment_view", { p_game_id: id });
    if (!error) return;

    const { error: upsertError } = await supabase
      .from("views")
      .upsert({ game_id: id, count: 1, updated_at: new Date().toISOString() });
    if (upsertError) console.warn("[views] No se pudo guardar la vista:", upsertError.message);
  } catch (error) {
    console.warn("[views] No se pudo registrar la vista:", error);
  }
}

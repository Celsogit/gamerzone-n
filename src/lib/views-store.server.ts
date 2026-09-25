import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.["VITE_SUPABASE_URL"]) ||
  "https://ulnomncbhccqrynzlqqf.supabase.co";

const SUPABASE_ANON_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.["VITE_SUPABASE_ANON_KEY"]) ||
  "sb_publishable_USfwfy2ONPItJiHlwecXZw_EF9x49Rp";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Caché en memoria para respuestas rápidas
let memoryViews: Record<string, number> | null = null;

function getMemory(): Record<string, number> {
  if (!memoryViews) {
    memoryViews = {};
  }
  return memoryViews;
}

/** Lee el mapa de vistas: { gameId: count }. */
export async function readGlobalViews(): Promise<Record<string, number>> {
  if (!SUPABASE_ANON_KEY) {
    return { ...getMemory() };
  }

  try {
    const { data, error } = await supabase.from("views").select("game_id, count");

    if (error) {
      console.warn("[views-store] Error leyendo Supabase, usando memoria:", error.message);
      return { ...getMemory() };
    }

    const views: Record<string, number> = { ...getMemory() };
    for (const row of data ?? []) {
      views[row.game_id] = Number(row.count) || 0;
    }

    memoryViews = views;
    return views;
  } catch (error) {
    console.warn("[views-store] Supabase no disponible, usando memoria:", error);
    return { ...getMemory() };
  }
}

/** Incrementa en 1 el contador de vistas de un juego. */
export async function incrementGlobalView(gameId: string): Promise<number> {
  const mem = getMemory();
  const currentCount = mem[gameId] ?? 0;
  const newCount = currentCount + 1;
  mem[gameId] = newCount;

  if (SUPABASE_ANON_KEY) {
    try {
      const { error } = await supabase.rpc("increment_view", { p_game_id: gameId });

      if (error) {
        // Fallback: upsert directo si la RPC no existe
        const { error: upsertError } = await supabase
          .from("views")
          .upsert({ game_id: gameId, count: newCount, updated_at: new Date().toISOString() });

        if (upsertError) {
          console.warn("[views-store] Error guardando vista en Supabase:", upsertError.message);
        }
      }
    } catch {
      // Sin Supabase, queda guardado en memoria
    }
  }

  return newCount;
}

import fs from "node:fs";
import path from "node:path";
import { getStore } from "@netlify/blobs";

/**
 * Almacén global de vistas:
 * - En producción (Netlify): usa Netlify Blobs para persistencia entre usuarios.
 * - En local / desarrollo: guarda automáticamente en un archivo local `.data/views.json`
 *   y memoria, para que funcione entre la PC y el móvil conectados en red local.
 */

const STORE_NAME = "game-views";
const KEY_PREFIX = "view:";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "views.json");

// Caché en memoria para respuestas ultra-rápidas (0ms)
let memoryViews: Record<string, number> | null = null;

function loadLocalFile(): Record<string, number> {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      const data = JSON.parse(content);
      if (data && typeof data === "object") {
        return data as Record<string, number>;
      }
    }
  } catch {
    // Si no se puede leer o no existe, retornamos vacío
  }
  return {};
}

function saveLocalFile(views: Record<string, number>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(views, null, 2), "utf-8");
  } catch {
    // En entornos de solo lectura no rompe la ejecución
  }
}

function getMemory(): Record<string, number> {
  if (!memoryViews) {
    memoryViews = loadLocalFile();
  }
  return memoryViews;
}

type Store = ReturnType<typeof getStore>;
let cachedStore: Store | null = null;
let blobsDisabled = false;

function getBlobsStore(): Store | null {
  if (blobsDisabled) return null;
  if (cachedStore) return cachedStore;

  try {
    cachedStore = getStore({ name: STORE_NAME, consistency: "strong" });
    return cachedStore;
  } catch {
    // Fuera de Netlify (por ejemplo en vite dev local), getStore lanza error
    blobsDisabled = true;
    return null;
  }
}

function keyFor(gameId: string): string {
  return `${KEY_PREFIX}${gameId}`;
}

/** Lee el mapa de vistas: { gameId: count }. */
export async function readGlobalViews(): Promise<Record<string, number>> {
  const local = getMemory();
  const store = getBlobsStore();

  if (!store) {
    // Modo local / sin Netlify Blobs: devolvemos los datos locales
    return { ...local };
  }

  try {
    const result = await store.list({ prefix: KEY_PREFIX });
    const views: Record<string, number> = { ...local };

    await Promise.all(
      result.blobs.map(async (blob) => {
        const value = await store.get(blob.key, { type: "text" });
        const count = Number(value);
        if (Number.isFinite(count) && count > 0) {
          views[blob.key.slice(KEY_PREFIX.length)] = count;
        }
      }),
    );

    // Mantenemos sincronizado el caché en memoria
    memoryViews = views;
    return views;
  } catch (error) {
    console.warn("[views-store] Blobs no disponible, usando respaldo local:", error);
    blobsDisabled = true;
    return { ...local };
  }
}

/**
 * Incrementa en 1 el contador de vistas de un juego.
 * Funciona tanto localmente (archivo JSON + memoria) como en la nube (Netlify Blobs).
 */
export async function incrementGlobalView(gameId: string): Promise<number> {
  // 1. Siempre incrementamos en memoria y en disco local de inmediato
  const mem = getMemory();
  const currentCount = mem[gameId] ?? 0;
  const newCount = currentCount + 1;
  mem[gameId] = newCount;
  saveLocalFile(mem);

  // 2. Si Netlify Blobs está disponible, persistimos en la nube
  const store = getBlobsStore();
  if (store) {
    try {
      const key = keyFor(gameId);
      for (let attempt = 0; attempt < 3; attempt++) {
        const existing = await store.getWithMetadata(key, { type: "text" });
        const remoteCount = Number(existing?.data) || currentCount;
        const next = String(Math.max(remoteCount + 1, newCount));

        const options = existing?.etag ? { onlyIfMatch: existing.etag } : { onlyIfNew: true };
        const { modified } = await store.set(key, next, options);
        if (modified) break;
      }
    } catch {
      // Si falla Netlify Blobs, ya quedó guardado en el archivo local / memoria
    }
  }

  return newCount;
}


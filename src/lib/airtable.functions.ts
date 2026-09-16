import { createServerFn } from "@tanstack/react-start";

import { toText } from "./airtable-fields";
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

type AirtableRecord = {
  id: string;
  createdTime: string;
  fields: {
    Name?: string;
    Encabezado?: unknown;
    Descripción?: unknown;
    Tráiler?: unknown;
    "Subir Portada"?: Array<{
      url?: string;
      thumbnails?: { large?: { url?: string }; full?: { url?: string } };
    }>;
    "Subir Banner"?: Array<{
      url?: string;
      thumbnails?: { large?: { url?: string }; full?: { url?: string } };
    }>;
  };
};

const SOURCES: Array<{ platform: string; baseId: string; table: string }> = [
  { platform: "3DS", baseId: "appDyC2z6EDXkua73", table: "3DS" },
  { platform: "Wii", baseId: "appDyC2z6EDXkua73", table: "Wii" },
  { platform: "WiiU", baseId: "appDyC2z6EDXkua73", table: "WiiU" },
  { platform: "SWITCH", baseId: "appTWYx8k0AocMZ5p", table: "SWITCH" },
  { platform: "PS1", baseId: "appTWYx8k0AocMZ5p", table: "PS1" },
  { platform: "PS2", baseId: "appTWYx8k0AocMZ5p", table: "PS2_Parte1" },
  { platform: "PS2", baseId: "app83OMftPEbLERAQ", table: "PS2_Parte2" },
  { platform: "PSP", baseId: "appJfJ38EFFll2pll", table: "PSP" },
  { platform: "PS3", baseId: "appodREe6abwpkaAM", table: "PS3" },
  { platform: "PSVita", baseId: "appodREe6abwpkaAM", table: "PSVita" },
  { platform: "PS4", baseId: "appMLK7pyTz6oXWHt", table: "PS4" },
  { platform: "PS5", baseId: "appK6pyoLMuu4YFpF", table: "PS5" },
  { platform: "XBOX", baseId: "appK6pyoLMuu4YFpF", table: "XBOX" },
  { platform: "XBOX 360", baseId: "appmLhHGmSUC71PPz", table: "XBOX 360" },
  { platform: "PC", baseId: "app4T8855KJAdBYHE", table: "PC" },
  { platform: "NOTICIAS", baseId: "app1ox9TWrWF6RZd1", table: "Noticias" },
];

const AIRTABLE_TOKEN =
  (typeof process !== "undefined" && process.env?.["AIRTABLE_PERSONAL_ACCESS_TOKEN"]) ||
  "patSPbilgD53Vc77E.4fb84a22afd742fafed12c95151680e65694f939645d5582b505d81c870a6811";

// Caché en memoria del catálogo: evita golpear Airtable con ~16 peticiones en
// cada carga. Se reutiliza durante CATALOG_TTL_MS y luego se refresca solo.
const CATALOG_TTL_MS = 60_000;
let catalogCache: { data: Catalog; expiresAt: number } | null = null;
let catalogInFlight: Promise<Catalog> | null = null;

export const listCatalog = createServerFn({ method: "GET" }).handler(async (): Promise<Catalog> => {
  const now = Date.now();
  if (catalogCache && catalogCache.expiresAt > now) {
    return catalogCache.data;
  }
  // Si ya hay una carga en curso, esperamos a esa en lugar de disparar otra.
  if (catalogInFlight) {
    return catalogInFlight;
  }

  catalogInFlight = loadCatalog()
    .then((catalog) => {
      catalogCache = { data: catalog, expiresAt: Date.now() + CATALOG_TTL_MS };
      return catalog;
    })
    .finally(() => {
      catalogInFlight = null;
    });

  return catalogInFlight;
});

async function loadCatalog(): Promise<Catalog> {
  const token = AIRTABLE_TOKEN;
  if (!token) {
    throw new Error("Airtable token is not configured");
  }

  const headers = { Authorization: `Bearer ${token}` };

  const platforms: string[] = [];
  for (const source of SOURCES) {
    if (source.platform === "NOTICIAS") continue;
    if (!platforms.includes(source.platform)) platforms.push(source.platform);
  }

  const results = await Promise.all(
    SOURCES.map(async ({ platform, baseId, table }) => {
      const games: Game[] = [];
      let offset: string | undefined;
      do {
        const params = new URLSearchParams();
        const fields =
          table === "Noticias"
            ? ["Name", "Encabezado", "Descripción", "Subir Banner"]
            : ["Name", "Descripción", "Subir Portada", "Tráiler"];
        for (const field of fields) params.append("fields[]", field);
        params.set("pageSize", "100");
        if (offset) params.set("offset", offset);

        const res = await fetch(
          `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${params.toString()}`,
          {
            headers,
            // 🔥 El único cambio quirúrgico y seguro: indicarle a Cloudflare que guarde el caché de red por 5 minutos
            cf: { cacheEverything: true, cacheTtl: 60 },
          } as any,
        );
        if (!res.ok) {
          const body = await res.text();
          console.error(`Airtable request failed [${res.status}]: ${body}`);
          throw new Error(`Airtable request failed [${res.status}]`);
        }
        const json = (await res.json()) as { offset?: string; records: AirtableRecord[] };

        for (const record of json.records) {
          const attachments = table === "Noticias" ? undefined : record.fields["Subir Portada"];
          const attachment = Array.isArray(attachments) ? attachments[0] : undefined;
          const cover =
            attachment?.thumbnails?.large?.url ??
            attachment?.thumbnails?.full?.url ??
            attachment?.url ??
            null;
          const bannerAttachments = record.fields["Subir Banner"];
          const bannerAttachment = Array.isArray(bannerAttachments)
            ? bannerAttachments[0]
            : undefined;
          const banner =
            bannerAttachment?.thumbnails?.large?.url ??
            bannerAttachment?.thumbnails?.full?.url ??
            bannerAttachment?.url ??
            null;
          const name = (record.fields.Name ?? "").trim();
          if (!name) continue;
          games.push({
            id: `${platform}:${baseId}:${record.id}`,
            name,
            platform,
            cover,
            banner,
            description: toText(record.fields["Descripción"]),
            heading: table === "Noticias" ? toText(record.fields.Encabezado) : null,
            trailer: toText(record.fields["Tráiler"]),
            createdTime: record.createdTime,
          });
        }
        offset = json.offset;
      } while (offset);
      return games;
    }),
  );

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
  .inputValidator((data: { name: string }) => {
    const name = String(data?.name ?? "")
      .trim()
      .slice(0, 200);
    if (!name) throw new Error("Nombre requerido");
    return { name };
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
        lookupTrailer(data.name),
      ]);
      return { extract: wiki.extract, wikipediaUrl: wiki.url, videoId };
    },
  );

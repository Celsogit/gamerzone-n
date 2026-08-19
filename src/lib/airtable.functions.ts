import { createServerFn } from "@tanstack/react-start";

import { toText } from "./airtable-fields";
import { lookupTrailer, lookupWikipedia } from "./game-lookup.server";

export type Game = {
  id: string;
  name: string;
  platform: string;
  cover: string | null;
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
    "Descripción"?: unknown;
    "Tráiler"?: unknown;
    "Subir Portada"?: Array<{
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
];

export const listCatalog = createServerFn({ method: "GET" }).handler(async (): Promise<Catalog> => {
  const token = process.env["AIRTABLE_PERSONAL_ACCESS_TOKEN"];
  if (!token) {
    throw new Error("Airtable token is not configured");
  }

  const headers = { Authorization: `Bearer ${token}` };

  const platforms: string[] = [];
  for (const source of SOURCES) {
    if (!platforms.includes(source.platform)) platforms.push(source.platform);
  }

  const results = await Promise.all(
    SOURCES.map(async ({ platform, baseId, table }) => {
      const games: Game[] = [];
      let offset: string | undefined;
      do {
        const params = new URLSearchParams();
        params.append("fields[]", "Name");
        params.append("fields[]", "Subir Portada");
        params.append("fields[]", "Descripción");
        params.append("fields[]", "Tráiler");
        params.set("pageSize", "100");
        if (offset) params.set("offset", offset);

        const res = await fetch(
          `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${params.toString()}`,
          { headers },
        );
        if (!res.ok) {
          const body = await res.text();
          console.error(`Airtable request failed [${res.status}]: ${body}`);
          throw new Error(`Airtable request failed [${res.status}]`);
        }
        const json = (await res.json()) as { offset?: string; records: AirtableRecord[] };

        for (const record of json.records) {
          const attachment = record.fields["Subir Portada"]?.[0];
          const cover =
            attachment?.thumbnails?.large?.url ??
            attachment?.thumbnails?.full?.url ??
            attachment?.url ??
            null;
          const name = (record.fields.Name ?? "").trim();
          if (!name) continue;
          games.push({
            id: `${platform}:${baseId}:${record.id}`,
            name,
            platform,
            cover,
            description: toText(record.fields["Descripción"]),
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
});


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

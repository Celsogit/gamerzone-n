function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function lookupWikipedia(
  name: string,
): Promise<{ extract: string | null; url: string | null }> {
  const target = normalize(name);

  const search = async (query: string, requireMatch: boolean) => {
    const url =
      "https://es.wikipedia.org/w/api.php?" +
      new URLSearchParams({
        action: "query",
        format: "json",
        generator: "search",
        gsrsearch: query,
        gsrlimit: "5",
        prop: "extracts",
        exintro: "1",
        explaintext: "1",
        redirects: "1",
      }).toString();

    const res = await fetch(url, {
      headers: { "User-Agent": "CatalogoCaratulas/1.0 (catalogo de videojuegos)" },
    });
    if (!res.ok) {
      console.error(`Wikipedia request failed [${res.status}]`);
      return null;
    }
    const json = (await res.json()) as {
      query?: { pages?: Record<string, { title?: string; extract?: string; index?: number }> };
    };
    const pages = Object.values(json.query?.pages ?? {})
      .filter((page) => Boolean(page.extract?.trim()))
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    const pick = requireMatch
      ? pages.find((page) => {
          const title = normalize(page.title ?? "");
          return title === target || title.includes(target) || target.includes(title);
        })
      : pages[0];

    if (!pick?.extract) return null;
    return {
      extract: pick.extract.trim(),
      url: pick.title
        ? `https://es.wikipedia.org/wiki/${encodeURIComponent(pick.title.replace(/ /g, "_"))}`
        : null,
    };
  };

  try {
    const hit =
      (await search(`intitle:"${name}"`, true)) ?? (await search(`${name} videojuego`, true));
    return hit ?? { extract: null, url: null };
  } catch (error) {
    console.error("Wikipedia lookup failed", error);
    return { extract: null, url: null };
  }
}

interface VideoCandidate {
  id: string;
  title: string;
  snippet?: string;
}

const PLATFORM_KEYWORDS: Record<string, { aliases: string[]; forbidden: string[] }> = {
  PS1: {
    aliases: ["ps1", "psone", "ps one", "psx", "playstation 1", "playstation one", "playstation"],
    forbidden: ["ps2", "ps3", "ps4", "ps5", "psp", "vita", "xbox", "switch", "wii", "remake"],
  },
  PS2: {
    aliases: ["ps2", "playstation 2", "ps 2"],
    forbidden: [
      "ps3",
      "ps4",
      "ps5",
      "psp",
      "vita",
      "ps1",
      "psx",
      "xbox",
      "switch",
      "wii",
      "remake",
    ],
  },
  PS3: {
    aliases: ["ps3", "playstation 3", "ps 3"],
    forbidden: ["ps4", "ps5", "ps2", "ps1", "psp", "vita", "xbox one", "series x", "switch"],
  },
  PS4: {
    aliases: ["ps4", "playstation 4", "ps 4"],
    forbidden: ["ps5", "ps3", "ps2", "ps1", "xbox 360", "wii"],
  },
  PS5: {
    aliases: ["ps5", "playstation 5", "ps 5"],
    forbidden: ["ps4", "ps3", "ps2", "ps1", "xbox 360"],
  },
  PSP: {
    aliases: ["psp", "playstation portable"],
    forbidden: ["ps vita", "psvita", "vita", "ps2", "ps3", "ps4", "ps5", "switch", "wii"],
  },
  PSVITA: {
    aliases: ["ps vita", "psvita", "playstation vita", "vita"],
    forbidden: ["psp", "ps2", "ps3", "ps4", "ps5", "xbox", "switch"],
  },
  "3DS": {
    aliases: ["3ds", "nintendo 3ds", "2ds"],
    forbidden: ["switch", "wii u", "wii", "playstation", "xbox"],
  },
  WII: {
    aliases: ["wii", "nintendo wii"],
    forbidden: ["wii u", "wiiu", "switch", "ps3", "xbox 360"],
  },
  WIIU: {
    aliases: ["wii u", "wiiu", "nintendo wii u"],
    forbidden: ["switch", "ps4", "xbox one"],
  },
  SWITCH: {
    aliases: ["switch", "nintendo switch"],
    forbidden: ["wii u", "wii", "3ds", "ps3", "ps2", "xbox 360"],
  },
  XBOX: {
    aliases: ["xbox", "original xbox", "xbox original", "xbox 2001"],
    forbidden: [
      "xbox 360",
      "xbox one",
      "series x",
      "series s",
      "ps2",
      "ps3",
      "ps4",
      "ps5",
      "switch",
    ],
  },
  XBOX360: {
    aliases: ["xbox 360", "x360", "360"],
    forbidden: ["xbox one", "series x", "series s", "original xbox", "ps4", "ps5"],
  },
  PC: {
    aliases: ["pc", "steam", "windows"],
    forbidden: ["ps5", "ps4", "ps3", "ps2", "switch", "wii u", "wii", "xbox 360", "ios", "android"],
  },
};

function extractVideosFromHtml(html: string): VideoCandidate[] {
  const videos: VideoCandidate[] = [];
  try {
    const match =
      html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
      html.match(/ytInitialData\s*=\s*({.+?});/);
    if (match?.[1]) {
      const data = JSON.parse(match[1]);
      const walk = (obj: unknown) => {
        if (!obj || typeof obj !== "object") return;
        const record = obj as Record<string, unknown>;
        const vr = record["videoRenderer"];
        if (vr && typeof vr === "object") {
          const vrObj = vr as Record<string, unknown>;
          const rawId = vrObj["videoId"];
          const id = typeof rawId === "string" ? rawId : null;
          const rawTitle = vrObj["title"] as
            { runs?: Array<{ text?: string }>; simpleText?: string } | undefined;
          const title =
            rawTitle?.runs?.map((r) => r.text ?? "").join("") || rawTitle?.simpleText || "";
          if (id && title) {
            videos.push({ id, title });
          }
        }
        for (const key of Object.keys(record)) {
          walk(record[key]);
        }
      };
      walk(data);
    }
  } catch {
    // Si falla el parseo de ytInitialData, continuamos
  }

  // Fallback con regex en caso de que ytInitialData venga fragmentado
  if (videos.length === 0) {
    const regex = /"videoId":"([A-Za-z0-9_-]{11})","title":{"runs":\[{"text":"(.*?)"}\]/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html)) !== null) {
      const vid = m[1];
      const vtitle = m[2];
      if (vid && vtitle) {
        videos.push({ id: vid, title: vtitle });
      }
      if (videos.length >= 10) break;
    }
  }

  return videos;
}

export async function lookupTrailer(
  name: string,
  platform?: string | null,
): Promise<string | null> {
  const cleanPlatform = platform?.trim() || "";
  const query = cleanPlatform
    ? `trailer oficial de ${name.trim()} de ${cleanPlatform}`
    : `trailer oficial de ${name.trim()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(
      `https://www.youtube.com/results?${new URLSearchParams({
        search_query: query,
      }).toString()}`,
      {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        },
      },
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`YouTube search failed [${res.status}]`);
      return null;
    }

    const html = await res.text();
    const candidates = extractVideosFromHtml(html);
    if (candidates.length === 0) {
      const match = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
      return match?.[1] ?? null;
    }

    const normName = normalize(name);
    const nameTokens = normName.split(" ").filter((t) => t.length > 2);
    const platformRule = cleanPlatform ? PLATFORM_KEYWORDS[cleanPlatform] : null;

    // Evaluamos los candidatos de forma estricta
    let bestVideoId: string | null = null;
    let bestScore = -999;

    for (const item of candidates.slice(0, 10)) {
      const titleNorm = normalize(item.title);
      let score = 0;

      // 1. Debe contener palabras clave del nombre del juego
      const matchedTokens = nameTokens.filter((t) => titleNorm.includes(t));
      if (nameTokens.length > 0 && matchedTokens.length === 0) {
        continue; // Descartar: no coincide con el título del juego
      }
      score += (matchedTokens.length / (nameTokens.length || 1)) * 30;

      // 2. Coincidencia estricta con la plataforma
      if (platformRule) {
        const hasAlias = platformRule.aliases.some((a) => titleNorm.includes(a));
        const hasForbidden = platformRule.forbidden.some((f) => titleNorm.includes(f));

        if (hasForbidden) {
          // Penalizar fuertemente si pertenece a otra plataforma (ej. PS5 en juego de PS2)
          score -= 100;
        }
        if (hasAlias) {
          score += 50; // Gran bonificación si menciona explícitamente la consola correcta
        } else {
          // Si no menciona la consola y el usuario pidió ser estricto, penalizar
          score -= 20;
        }
      }

      // 3. Bonificación por ser tráiler o teaser
      if (
        titleNorm.includes("trailer") ||
        titleNorm.includes("traile") ||
        titleNorm.includes("teaser") ||
        titleNorm.includes("intro")
      ) {
        score += 20;
      }

      // 4. Penalización por contenidos no oficiales / partidas completas
      if (
        titleNorm.includes("gameplay walkthrough") ||
        titleNorm.includes("longplay") ||
        titleNorm.includes("full game") ||
        titleNorm.includes("soundtrack") ||
        titleNorm.includes("ost")
      ) {
        score -= 40;
      }

      if (score > bestScore) {
        bestScore = score;
        bestVideoId = item.id;
      }
    }

    // Si encontramos un candidato con puntaje positivo que respete la plataforma
    if (bestVideoId && bestScore > 0) {
      return bestVideoId;
    }

    // Fallback al primer candidato si no hay conflicto severo
    return candidates[0]?.id ?? null;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("YouTube lookup failed (offline or timeout)", error);
    return null;
  }
}

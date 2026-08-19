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

export async function lookupTrailer(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/results?${new URLSearchParams({
        search_query: `${name} official trailer`,
      }).toString()}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        },
      },
    );
    if (!res.ok) {
      console.error(`YouTube search failed [${res.status}]`);
      return null;
    }
    const html = await res.text();
    const match = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
    return match?.[1] ?? null;
  } catch (error) {
    console.error("YouTube lookup failed", error);
    return null;
  }
}

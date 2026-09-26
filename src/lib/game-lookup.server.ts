/**
 * Búsqueda de sinopsis en la API abierta de Wikipedia en español.
 *
 * Antes este archivo también raspaba la búsqueda de YouTube para adivinar el
 * tráiler, pero eso requería un servidor (el navegador no puede leer youtube.com
 * por CORS). Ahora el tráiler se toma directamente de la columna "Tráiler" de
 * Supabase y, si está vacía, el modal abre la búsqueda de YouTube en una pestaña
 * nueva.
 *
 * El endpoint de Wikipedia sí envía cabeceras CORS abiertas, por lo que puede
 * llamarse directamente desde el navegador.
 */

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
        origin: "*",
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

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Gamepad2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CoverLightbox } from "@/components/CoverLightbox";
import { GameCarousel } from "@/components/GameCarousel";
import { GameDetailsModal } from "@/components/GameDetailsModal";
import { GameGrid } from "@/components/GameGrid";
import { PlatformCard } from "@/components/PlatformCard";
import { type Game } from "@/lib/airtable.functions";
import { toText } from "@/lib/airtable-fields";
import { catalogQueryOptions } from "@/lib/games-query";
import { mostViewed, readViews, recentlyAdded, trackView } from "@/lib/games";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(catalogQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Catálogo de Carátulas de Videojuegos | Retro y Actual" },
      {
        name: "description",
        content:
          "Explora carátulas de videojuegos de 3DS, Wii, WiiU, Switch, PlayStation, Xbox y PC con sinopsis y tráilers.",
      },
      { property: "og:title", content: "Catálogo de Carátulas de Videojuegos" },
      {
        property: "og:description",
        content:
          "Carrusel de recién añadidos, más vistos y plataformas con sinopsis y tráilers al instante.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <h1 className="text-xl font-bold">No pudimos cargar el catálogo</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">Catálogo no disponible.</div>,
  component: CatalogPage,
});

function CatalogPage() {
  // =========================================================================
  // INTEGRACIÓN PORTAL CAUTIVO (Autenticación Automática en un Milisegundo)
  // =========================================================================
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tok = urlParams.get("tok");
      const gatewayAddress = urlParams.get("gatewayaddress");
      const gatewayPort = urlParams.get("gatewayport");

      if (tok && gatewayAddress && gatewayPort) {
        const authUrl = `http://${gatewayAddress}:${gatewayPort}/opennds_auth/?tok=${tok}`;

        // Petición invisible al router para autorizar el internet tras bastidores
        fetch(authUrl, { mode: "no-cors" })
          .then(() => {
            // Limpia las variables feas (?tok=...) de la barra del navegador
            window.history.replaceState({}, document.title, window.location.pathname);
          })
          .catch((error) => console.error("Error portal cautivo:", error));
      }
    }
  }, []);
  // =========================================================================

  const { data: catalog } = useSuspenseQuery(catalogQueryOptions);
  const games = catalog.games;
  const [selected, setSelected] = useState<Game | null>(null);
  const [lightboxGame, setLightboxGame] = useState<Game | null>(null);
  const [views, setViews] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    setViews(readViews());
  }, []);

  const openDetail = (game: Game) => {
    setSelected(game);
    setViews(trackView(game.id));
  };

  const openCover = (game: Game) => {
    setLightboxGame(game);
  };

  const catalogGames = useMemo(
    () => games.filter((game) => game.platform !== "NOTICIAS"),
    [games],
  );
  const recent = useMemo(() => recentlyAdded(catalogGames), [catalogGames]);
  const popular = useMemo(() => mostViewed(catalogGames, views, 10), [catalogGames, views]);

  const newsGames = useMemo(() => {
    return games
      .filter((game) => game.platform === "NOTICIAS")
      .sort((a, b) => a.createdTime.localeCompare(b.createdTime));
  }, [games]);

  const term = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!term) return [];
    return games
      .filter((game) => game.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [games, term]);

  return (
    <main className="min-h-screen pb-20">
      {!term && (
        <header className="bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-5 sm:px-6">
            <a href="/" className="flex min-w-0 items-center gap-3" aria-label="Gamer Zone Caibarién">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#15345b] text-white shadow-sm">
                <Gamepad2 className="h-5 w-5" />
              </span>
              <span className="truncate font-display text-lg font-bold tracking-tight sm:text-xl">
                Gamer Zone Caibarién
              </span>
            </a>
          </div>
        </header>
      )}

      {!term && <NewsBanner newsGames={newsGames} />}
      {term && (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <button
            type="button"
            onClick={() => setQuery("")}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver atrás
          </button>
        </div>
      )}
      <SearchBar query={query} totalGames={games.length} onQueryChange={setQuery} />

      {term ? (
        <>
          <Section title={`Resultados para “${query.trim()}”`}>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay resultados para esta búsqueda.</p>
            ) : (
              <GameGrid games={results} onOpenDetail={openDetail} onOpenCover={openCover} />
            )}
          </Section>
        </>
      ) : (
        <>
          <Section title="Recién añadidos">
            <GameCarousel games={recent} onOpenDetail={openDetail} onOpenCover={openCover} />
          </Section>

          <Section title="Más vistos">
            <GameCarousel games={popular} onOpenDetail={openDetail} onOpenCover={openCover} />
          </Section>

          <Section title="Plataformas">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
              {catalog.platforms.map((item) => (
                <PlatformCard key={item} platform={item} />
              ))}
            </div>
          </Section>
        </>
      )}

      <GameDetailsModal game={selected} onClose={() => setSelected(null)} onOpenCover={openCover} />
      <CoverLightbox game={lightboxGame} onClose={() => setLightboxGame(null)} />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <h2 className="mb-4 text-lg font-bold sm:text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function SearchBar({
  query,
  totalGames,
  onQueryChange,
}: {
  query: string;
  totalGames: number;
  onQueryChange: (query: string) => void;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-5 pt-7 sm:px-6 sm:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <label className="relative w-full sm:w-64">
          <span className="sr-only">Buscar un juego</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar"
            className="h-10 w-full border border-border bg-white pl-3 pr-11 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:glow-ring"
          />
          <Search className="pointer-events-none absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
        </label>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{totalGames} títulos sincronizados en tiempo real.</p>
    </section>
  );
}

function NewsBanner({ newsGames }: { newsGames: Game[] }) {
  const [activeNewsIndex, setActiveNewsIndex] = useState(0);

  useEffect(() => {
    setActiveNewsIndex(0);
    const interval = window.setInterval(() => {
      setActiveNewsIndex((currentIndex) => (currentIndex + 1) % newsGames.length);
    }, 14_000);

    return () => window.clearInterval(interval);
  }, [newsGames.length]);

  if (newsGames.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-3 sm:px-6">
      <div className="relative aspect-[5/3] overflow-hidden rounded-xl bg-[#050811] shadow-lg sm:aspect-[3/1]">
        {newsGames.map((news, index) => {
          const description = typeof news.description === "string" ? news.description : toText(news.description);
          return (
            <div
              key={news.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === activeNewsIndex ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              {/* Aquí asumo que continúa la lógica de renderizado de tus noticias tal cual lo tenías */}
              <div className="p-6 text-white">{description}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

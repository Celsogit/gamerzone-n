import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { CoverLightbox } from "@/components/CoverLightbox";
import { GameCarousel } from "@/components/GameCarousel";
import { GameDetailsModal } from "@/components/GameDetailsModal";
import { GameGrid } from "@/components/GameGrid";
import { PlatformCard } from "@/components/PlatformCard";
import { type Game } from "@/lib/airtable.functions";
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

  const recent = useMemo(() => recentlyAdded(games), [games]);
  const popular = useMemo(() => mostViewed(games, views, 10), [games, views]);

  const term = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!term) return [];
    return games
      .filter((game) => game.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [games, term]);

  return (
    <main className="min-h-screen pb-20">
      <header className="hero-glow border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Catálogo en vivo
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">
            Carátulas de videojuegos
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            {games.length} títulos sincronizados en tiempo real desde Airtable.
          </p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar un juego…"
            aria-label="Buscar un juego"
            className="mt-6 w-full max-w-md border border-border bg-card px-4 py-2.5 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:glow-ring"
          />
        </div>
      </header>

      {term ? (
        <Section title={`Resultados para “${query.trim()}”`}>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay resultados para esta búsqueda.</p>
          ) : (
            <GameGrid games={results} onOpenDetail={openDetail} onOpenCover={openCover} />
          )}
        </Section>
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

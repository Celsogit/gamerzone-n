import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { getGameDetails, type Game } from "@/lib/supabase.functions";
import { youtubeIdFromUrl, youtubeSearchUrl } from "@/lib/games";

type Props = {
  game: Game | null;
  onClose: () => void;
  onOpenCover?: (game: Game) => void;
};

export function GameDetailsModal({ game, onClose, onOpenCover }: Props) {
  const fetchDetails = useServerFn(getGameDetails);

  const airtableDescription = game?.description ?? null;
  const airtableVideoId = game?.trailer ? youtubeIdFromUrl(game.trailer) : null;
  const needsLookup = Boolean(game?.name) && (!airtableDescription || !airtableVideoId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["game-details", game?.name, game?.platform],
    queryFn: () =>
      fetchDetails({
        data: {
          name: game!.name,
          platform: game?.platform,
        },
      }),
    enabled: needsLookup,
    staleTime: 1000 * 60 * 60,
  });

  const description = airtableDescription ?? data?.extract ?? null;
  const videoId = airtableVideoId ?? data?.videoId ?? null;
  const loading = needsLookup && isLoading;

  useEffect(() => {
    if (!game) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [game, onClose]);

  if (!game) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-background/85 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={game.name}
      onClick={onClose}
    >
      <div className="flex min-h-full items-start justify-center">
        <div
          className="relative my-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-4 sm:p-6"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground transition-colors hover:bg-muted"
            aria-label="Cerrar"
          >
            ✕
          </button>

          <div className="flex flex-col gap-4 sm:flex-row">
            {game.cover ? (
              <button
                type="button"
                onClick={() => onOpenCover?.(game)}
                className="mx-auto w-32 shrink-0 cursor-zoom-in sm:mx-0 sm:w-40"
                aria-label={`Ampliar carátula de ${game.name}`}
              >
                <img
                  src={game.cover}
                  alt={`Carátula de ${game.name}`}
                  className="cover-shadow w-full"
                />
              </button>
            ) : null}
            <div className="min-w-0 flex-1 pt-6 sm:pt-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {game.platform}
              </p>
              <h2 className="mt-1 text-xl font-bold sm:text-2xl">{game.name}</h2>
              <div className="mt-3 max-h-40 overflow-y-auto text-sm leading-relaxed text-muted-foreground">
                {description ? (
                  <p>{description}</p>
                ) : loading ? (
                  <p>Buscando sinopsis…</p>
                ) : isError ? (
                  <p>No se pudo consultar la sinopsis en este momento.</p>
                ) : (
                  <p>No encontramos una sinopsis para este título.</p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {data?.wikipediaUrl ? (
                  <a
                    href={data.wikipediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-border px-3 py-1.5 font-medium transition-colors hover:bg-secondary"
                  >
                    Ver en Wikipedia
                  </a>
                ) : null}
                <a
                  href={youtubeSearchUrl(game.name, game.platform)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Ver más tráilers
                </a>
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-border bg-background">
            <div className="flex aspect-video w-full items-center justify-center">
              {videoId ? (
                <iframe
                  key={videoId}
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
                  title={`Tráiler de ${game.name}`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : loading ? (
                <p className="text-sm text-muted-foreground">Buscando tráiler…</p>
              ) : (
                <p className="px-4 text-center text-sm text-muted-foreground">
                  No encontramos un tráiler para este título.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

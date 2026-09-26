import { useEffect } from "react";

import type { Game } from "@/lib/games-data";

type Props = {
  game: Game | null;
  onClose: () => void;
};

export function CoverLightbox({ game, onClose }: Props) {
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

  if (!game || !game.cover) return null;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-background/85 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Carátula de ${game.name}`}
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          className="relative my-auto flex h-[calc(100vh-1.5rem)] w-full max-w-[95vw] flex-col items-center justify-center sm:h-[calc(100vh-3rem)] sm:max-w-3xl"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground transition-colors hover:bg-muted"
            aria-label="Cerrar"
          >
            ✕
          </button>

          <img
            src={game.cover}
            alt={`Carátula ampliada de ${game.name}`}
            className="h-full w-full object-contain shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}

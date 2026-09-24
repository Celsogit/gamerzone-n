import { useCoverAspect } from "@/hooks/use-cover-aspect";
import type { Game } from "@/lib/supabase.functions";

import { GameCard } from "./GameCard";

export function GameGrid({
  games,
  onOpenDetail,
  onOpenCover,
}: {
  games: Game[];
  onOpenDetail: (game: Game) => void;
  onOpenCover: (game: Game) => void;
}) {
  const aspect = useCoverAspect(games.find((game) => game.cover)?.cover);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {games.map((game, index) => (
        <GameCard
          key={game.id}
          game={game}
          onOpenDetail={onOpenDetail}
          onOpenCover={onOpenCover}
          aspect={aspect}
          index={index}
          priorityCount={10}
        />
      ))}
    </div>
  );
}

import { Link } from "@tanstack/react-router";

import { PLATFORM_ART, PLATFORM_LABEL } from "@/lib/platform-art";

export function PlatformCard({ platform }: { platform: string }) {
  const art = PLATFORM_ART[platform];
  const label = PLATFORM_LABEL[platform] ?? platform;

  return (
    <Link
      to="/plataforma/$platform"
      params={{ platform }}
      aria-label={`Ver juegos de ${label}`}
      className="group flex items-center justify-center border border-border bg-white p-2 transition-all hover:-translate-y-1 hover:border-primary/50 sm:p-3"
    >
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-white">
        {art ? (
          <img
            src={art}
            alt={label}
            loading="lazy"
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>
    </Link>
  );
}

import { useEffect, useState } from "react";

const DEFAULT_ASPECT = 2 / 3;

/**
 * Mide la primera carátula de una plataforma y devuelve su proporción
 * (ancho/alto) para usarla como molde de todas las demás.
 */
export function useCoverAspect(firstCoverUrl?: string | null) {
  const [aspect, setAspect] = useState<number>(DEFAULT_ASPECT);

  useEffect(() => {
    if (!firstCoverUrl) {
      setAspect(DEFAULT_ASPECT);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setAspect(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = firstCoverUrl;
    return () => {
      cancelled = true;
    };
  }, [firstCoverUrl]);

  return aspect;
}

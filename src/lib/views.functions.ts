import { createServerFn } from "@tanstack/react-start";

import { incrementGlobalView, readGlobalViews } from "./views-store.server";

/** Devuelve el ranking global de vistas: { gameId: count }. */
export const getGlobalViews = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record<string, number>> => {
    return readGlobalViews();
  },
);

/** Registra una vista global para un juego. */
export const trackGlobalView = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    const id = String(data?.id ?? "")
      .trim()
      .slice(0, 300);
    if (!id) throw new Error("ID requerido");
    return { id };
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await incrementGlobalView(data.id);
    return { ok: true };
  });

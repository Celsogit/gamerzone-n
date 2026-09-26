import { QueryClient } from "@tanstack/react-query";
import { createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

import { normalizeHashUrl } from "./lib/normalize-hash";

// Se ejecuta al importar este módulo, antes de que se cree el historial hash.
// Es importante que sea aquí y no antes de hydrateRoot: cuando el historial se
// construye ya lee `location.hash`, así que la URL debe estar saneada primero.
// (El plugin de TanStack inyecta `basepath` al hidratar y duplica el prefijo
// del proyecto dentro del hash.)
normalizeHashUrl();

export const getRouter = () => {
  const queryClient = new QueryClient();

  // GitHub Pages es hosting estático: no puede reescribir rutas, así que las
  // URLs de la app viajan en el hash (#/plataforma/PS2) y nunca dan 404 al
  // recargar. En el servidor (prerender en el build) no existe window, y el
  // router ya usa el historial por defecto.
  const history = typeof window === "undefined" ? undefined : createHashHistory();

  const router = createRouter({
    routeTree,
    ...(history ? { history } : {}),
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // OJO: no definir `basepath` aquí. El plugin de TanStack lo deriva del
    // `base` de Vite (/gamerzone-n/) porque el prerender del SPA shell lo
    // necesita, y al hidratar lo vuelve a inyectar
    // (start-client-core → hydrateStart.js).
    // Con historial hash ese valor se antepone también al hash, así que el
    // prefijo se corrige en normalizeHashUrl(), llamado arriba.
  });

  return router;
};

import { QueryClient } from "@tanstack/react-query";
import { createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

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
    // La app se publica en un subdirectorio de GitHub Pages
    // (https://<usuario>.github.io/gamerzone-n/), por eso todas las rutas
    // deben resolverse respetando esa base.
    basepath: import.meta.env.BASE_URL,
  });

  return router;
};

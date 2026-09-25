import { QueryClient } from "@tanstack/react-query";
import { createHashHistory, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const hashHistory =
    typeof window !== "undefined"
      ? createHashHistory()
      : createMemoryHistory({ initialEntries: ["/"] });

  const router = createRouter({
    routeTree,
    history: hashHistory,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

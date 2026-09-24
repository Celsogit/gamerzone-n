import { queryOptions } from "@tanstack/react-query";

import { listCatalog } from "./supabase.functions";

export const catalogQueryOptions = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => listCatalog(),
  staleTime: 1000 * 60 * 5,
  refetchInterval: 1000 * 60 * 5,
});

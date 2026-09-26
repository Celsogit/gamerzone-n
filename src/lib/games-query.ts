import { queryOptions } from "@tanstack/react-query";

import { getCatalog } from "./games-data";

export const catalogQueryOptions = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
  staleTime: 1000 * 60 * 5,
  refetchInterval: 1000 * 60 * 5,
});

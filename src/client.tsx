import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

import { normalizeHashUrl } from "./lib/normalize-hash";

// Punto de entrada del cliente (`src/client.tsx`).
//
// GitHub Pages sirve la app desde un subdirectorio, y el plugin de TanStack
// inyecta `basepath: "gamerzone-n"` en el router al hidratar. Con historial
// hash ese basepath se antepone también al hash y la URL salía duplicada:
//
//   https://celsogit.github.io/gamerzone-n/#/gamerzone-n/plataforma/PS2
//
// Se sanea ANTES de montar la app para que el router arranque ya con la ruta
// limpia: /gamerzone-n/#/plataforma/PS2
normalizeHashUrl();

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
);

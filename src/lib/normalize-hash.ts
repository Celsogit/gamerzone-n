/**
 * GitHub Pages sirve la app desde un subdirectorio (/gamerzone-n/), y el plugin
 * de TanStack inyecta `basepath: "gamerzone-n"` en el router al hidratar
 * (start-client-core → hydrateStart.js). Con historial hash ese basepath se
 * antepone también al hash, y la URL queda duplicada:
 *
 *   https://celsogit.github.io/gamerzone-n/#/gamerzone-n/plataforma/PS2
 *
 * Como el historial hash solo lee lo que va después del `#`, el prefijo del
 * proyecto no hace falta ahí. Esta función lo corrige y se llama desde
 * src/client.tsx, antes de montar la app, para que el router arranque con la
 * ruta ya limpia:
 *
 *   https://celsogit.github.io/gamerzone-n/#/plataforma/PS2
 */

const PUBLIC_BASE_SEGMENT = "gamerzone-n";

export function normalizeHashUrl(): void {
  if (typeof window === "undefined") return;

  const { location, history } = window;

  // Solo aplica cuando la app cuelga de un subdirectorio.
  if (!location.pathname.includes(PUBLIC_BASE_SEGMENT)) return;

  const rawHash = location.hash;
  if (rawHash.length < 2) return;

  // Solo tocamos los hashes que empiezan por barra de ruta ("#/...").
  const hashPath = rawHash.slice(1);
  if (!hashPath.startsWith("/")) return;

  const duplicated = `/${PUBLIC_BASE_SEGMENT}`;
  if (!hashPath.startsWith(duplicated)) return;

  const rest = hashPath.slice(duplicated.length);
  const cleaned = rest.startsWith("/") ? rest : `/${rest}`;

  // replaceState no recarga la página ni deja una entrada extra en el historial.
  history.replaceState(history.state, "", `${location.pathname}${location.search}#${cleaned}`);
}

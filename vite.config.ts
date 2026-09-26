import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

/**
 * Limpia el prefijo del subdirectorio dentro del hash de la URL.
 *
 * Contexto: el proyecto se publica en GitHub Pages dentro de un subdirectorio
 * (/gamerzone-n/), y el plugin de TanStack inyecta ese prefijo como `basepath`
 * del router. El router lo usa para reescribir la URL y, con historial hash, el
 * resultado queda duplicado:
 *
 *   https://celsogit.github.io/gamerzone-n/#/gamerzone-n/plataforma/PS2
 *                                                   ^^^^^^^^^^^^^
 *
 * Ese prefijo no aporta nada ahí: el historial hash solo lee lo que va después
 * del `#`. Quitar `basepath` de la config no es una opción porque el prerender
 * del SPA shell lo necesita para encontrar la ruta, y el router lo vuelve a
 * inyectar al hidratar (start-client-core → hydrateStart.js).
 *
 * Por eso se corrige el único sitio donde queda grabado: el valor que el bundle
 * escribe en `basepath` al actualizar el router.
 */
function stripDuplicatedHashBasepath(): Plugin {
  const rules: Array<{ from: RegExp; to: string }> = [
    // e.update({basepath:`gamerzone-n`,serializationAdapters:t})
    { from: /basepath:`gamerzone-n`/g, to: "basepath:``" },
    // { basepath: "gamerzone-n" }
    { from: /basepath:"gamerzone-n"/g, to: 'basepath:""' },
    // { basepath: 'gamerzone-n' }
    { from: /basepath:'gamerzone-n'/g, to: "basepath:''" },
    // El objeto de entorno que lee hydrateStart.js al hidratar:
    // process.env.TSS_ROUTER_BASEPATH / import.meta.env.TSS_ROUTER_BASEPATH
    { from: /TSS_ROUTER_BASEPATH:`gamerzone-n`/g, to: "TSS_ROUTER_BASEPATH:``" },
    { from: /TSS_ROUTER_BASEPATH:"gamerzone-n"/g, to: 'TSS_ROUTER_BASEPATH:""' },
    { from: /TSS_ROUTER_BASEPATH:'gamerzone-n'/g, to: "TSS_ROUTER_BASEPATH:''" },
  ];

  return {
    name: "gamerzone:strip-duplicated-hash-basepath",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue;

        let code = chunk.code;
        let touched = false;

        for (const rule of rules) {
          if (rule.from.test(code)) {
            code = code.replace(rule.from, rule.to);
            touched = true;
          }
          rule.from.lastIndex = 0;
        }

        if (touched) chunk.code = code;
      }
    },
  };
}

export default defineConfig({
  tanstackStart: {
    spa: {
      enabled: true,
      maskPath: "/",
    },
    // OJO con `router.basepath`: el plugin lo deriva del `base` de Vite
    // (/gamerzone-n/) y ese valor es el correcto para que el prerender del SPA
    // shell encuentre la ruta. Fijarlo en "/" rompe el build (el handler
    // responde 404 en /). El prefijo duplicado del hash se limpia con el plugin
    // de abajo.
  },
  nitro: false,
  vite: {
    base: "/gamerzone-n/",
    plugins: [stripDuplicatedHashBasepath()],
  },
});

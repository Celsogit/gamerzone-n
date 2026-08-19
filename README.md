# Game Shelf Online

Crea un catálogo de carátulas de videojuegos conectado a mi Airtable en tiempo real. 

REQUISITOS DE DISEÑO:

1. Sin marcas de agua. Estilo oscuro moderno (gaming/Netflix style).

2. En móviles, las carátulas DEBEN mostrarse estrictamente en una cuadrícula de 2 columnas. En computadoras, en 4 o 5 columnas.

3. La página principal tendrá tres secciones: un carrusel de "Recién añadidos", una cuadrícula de "Más vistos" y botones de "Plataformas" (3DS, Wii, SWITCH, etc.) que sirvan para filtrar los juegos.

LÓGICA DE DATOS DESDE AIRTABLE:

La aplicación leerá únicamente los campos "Name" y "Subir Portada" de mi Airtable.

CÓMO BUSCAR LAS DESCRIPCIONES Y ENLACES (AL VUELO SIN IA):

Cuando un usuario haga clic en el botón "Más detalles" de cualquier videojuego, NO utilices Inteligencia Artificial interna (para no consumir mis créditos del plan gratuito). En su lugar, programa una función en código puro de JavaScript/TypeScript que intercepte el campo "Name" y haga una consulta HTTP rápida a la API abierta de Wikipedia en español (https://wikipedia.org) para extraer la sinopsis oficial de forma ilimitada y gratuita. 

Para el reproductor de tráiler, haz que el código genere automáticamente una dirección de inserción (embed) de YouTube que busque los términos: [Name] + "official trailer" y la muestre dentro del cuadro modal de detalles.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gamerzonec.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/82b15d92-1835-4f50-aba0-178b2a249d5d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

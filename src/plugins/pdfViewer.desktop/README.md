# PdfViewer

Preview PDF attachments inline without having to download them first.

## How it works

PDFs are fetched through a small desktop-native helper (CORS would otherwise block the renderer when downloading from `cdn.discordapp.com`) and rendered with [PDF.js](https://mozilla.github.io/pdf.js/), loaded lazily from `cdnjs.cloudflare.com`. The viewer supports zoom, fit-to-width and lazy per-page rasterisation, so even large documents stay responsive.

## Settings

- **Largest PDF that can be previewed inline** — above this size the inline preview is disabled. The file remains downloadable from Discord's normal attachment UI.
- **Number of recently opened PDFs to keep in memory** — LRU cache size for the fetched bytes. `0` disables caching.

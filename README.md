# iett-pwa

Progressive Web App for real-time Istanbul IETT bus tracking.

## Stack

- React 18 + Vite 5 + TypeScript
- Tailwind CSS (dark transit theme)
- Leaflet + react-leaflet (CartoDB Dark tiles)
- vite-plugin-pwa (Service Worker, offline cache, installable)
- iett-middle REST API for all data

## Screens

| Route | Description |
|---|---|
| `/` | Home — search bar, quick links |
| `/stops/:dcode` | Stop arrivals board (auto-refresh 20 s), **via-stop filter** |
| `/routes/:hatKodu` | Route page — live bus map, schedule, alerts, stops list |
| `/map` | Full-screen fleet map with route filter |
| `/settings` | API base URL, refresh interval |

## Development

```bash
cp .env.example .env
npm install
npm run dev
```

Requires a running `iett-middle` instance (default: `http://localhost:8000`). 
The Vite dev server proxies `/v1/*` to the iett-middle URL automatically.

## Build

```bash
npm run build
npm run preview
```

## Icons

Place `192×192` and `512×512` PNG icons at:

```
public/icons/icon-192.png
public/icons/icon-512.png
```

Quick generation with ImageMagick:
```bash
convert -size 192x192 xc:#2563eb -fill white \
        -font Inter -pointsize 60 -gravity center -annotate 0 "İ" \
        public/icons/icon-192.png
convert -size 512x512 xc:#2563eb -fill white \
        -font Inter -pointsize 180 -gravity center -annotate 0 "İ" \
        public/icons/icon-512.png
```

Or any 192 and 512 px square PNG will work as placeholder.

## Docker

No separate Dockerfile — serve built assets from iett-middle's `static/` or any static host  
(nginx, Cloudflare Pages, Vercel, etc.).

```bash
# Build and copy to iett-middle static dir
npm run build
cp -r dist/* ../iett-middle/static/
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `''` (same origin) | iett-middle base URL |

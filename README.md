# iett-pwa

[![Tests](https://img.shields.io/badge/tests-30%20passed-brightgreen)](#development)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)
[![Version](https://img.shields.io/badge/version-0.3.17-orange)](https://github.com/pcislocked/iett-pwa/releases/tag/v0.3.17)

[🇹🇷 Türkçe (Turkish)](#türkçe) | [🇬🇧 English](#english)

---

## 🇹🇷 Türkçe

Gerçek zamanlı İstanbul İETT otobüs takibi için Progresif Web Uygulaması (PWA).
Android ve masaüstü cihazlara kurulabilir. Çevrimdışı çalışabilir (en son çekilen verilerle). Koyu toplu taşıma teması içerir.

Çalışır durumda bir [**iett-middle**](https://github.com/pcislocked/iett-middle) API sunucusu gerektirir.

Üç depoluk bir projenin parçasıdır:
[iett-middle](https://github.com/pcislocked/iett-middle) (API proxy) ·
[iett-hacs](https://github.com/pcislocked/iett-hacs) (Home Assistant entegrasyonu) ·
[**iett-pwa**](https://github.com/pcislocked/iett-pwa) (bu depo)

### Teknoloji Yığını (Stack)

- React 18 + Vite 5 + TypeScript
- Tailwind CSS (koyu toplu taşıma teması)
- Leaflet + react-leaflet (CartoDB Dark haritaları)
- vite-plugin-pwa (Service Worker, çevrimdışı önbellek, kurulabilirlik)
- Tüm veriler için iett-middle REST API'si

### Ekranlar

| Rota | Açıklama |
|---|---|
| `/` | Ana sayfa — arama çubuğu, hızlı bağlantılar |
| `/stops/:dcode` | Durak varış panosu (20s otomatik yenileme), **üzerinden geçme (via) filtresi** |
| `/routes/:hatKodu` | Hat sayfası — canlı otobüs haritası, saatler, uyarılar, durak listesi |
| `/map` | Hat filtreli tam ekran filo haritası |
| `/settings` | API temel URL'si, yenileme aralığı ayarları |

### Geliştirme (Development)

```bash
cp .env.example .env
npm install
npm run dev
```

Çalışan bir `iett-middle` sunucusu gerektirir (varsayılan: `http://localhost:8000`). 
Vite geliştirme sunucusu, `/v1/*` isteklerini otomatik olarak iett-middle URL'sine yönlendirir.

### Derleme (Build)

```bash
npm run build
npm run preview
```

### İkonlar

`192×192` ve `512×512` PNG ikonlarını şu konumlara yerleştirin:

```
public/icons/icon-192.png
public/icons/icon-512.png
```

Veya herhangi bir kare PNG (192 ve 512 px) yer tutucu olarak çalışacaktır.

### Docker

Statik dosyaları derlemek ve nginx ile sunmak için çok aşamalı (multi-stage) Dockerfile kullanın.

```bash
docker build -t iett-pwa:0.3.17 --build-arg VITE_API_BASE_URL=https://sizin-middle-sunucunuz .
docker run --rm -p 8080:80 iett-pwa:0.3.17
```

Optimizasyon notları:
- Rota düzeyinde tembel yükleme (lazy loading) ilk paketi küçük tutar (ana sayfa dışındaki sayfalar isteğe bağlı yüklenir).
- Vite Rollup parçalama ayarları, vendor kodları için uzun vadeli tarayıcı önbellek isabet (cache hit) oranlarını artırır.

### Ortam Değişkenleri

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `VITE_API_BASE_URL` | `''` (aynı origin) | iett-middle temel URL'si |

### Lisans & Hukuki

Bu proje İstanbul Büyükşehir Belediyesi'nden (İBB) alınan verileri kullanmaktadır.
[İBB Açık Veri Lisansı](https://data.ibb.gov.tr/license) uyarınca aşağıdaki atıf yapılmaktadır:
> **Atıf 4.0 Uluslararası (CC BY 4.0) kapsamında lisanslanan kamu sektörü bilgilerini içerir.**

İBB'nin son dönemde uygulamaya koyduğu kamu verisi karartmasını aşmak ve kamuya ait bu verileri halka sunabilmek için erişilebilir her türlü yöntemle veri çekmeye devam edeceğiz.

---

## 🇬🇧 English

Progressive Web App for real-time Istanbul IETT bus tracking.
Installable on Android and desktop. Works offline (last-fetched data). Dark transit theme.

Requires a running [**iett-middle**](https://github.com/pcislocked/iett-middle) API instance.

Part of a three-repo stack:
[iett-middle](https://github.com/pcislocked/iett-middle) (API proxy) ·
[iett-hacs](https://github.com/pcislocked/iett-hacs) (Home Assistant integration) ·
[**iett-pwa**](https://github.com/pcislocked/iett-pwa) (this repo)

### Stack

- React 18 + Vite 5 + TypeScript
- Tailwind CSS (dark transit theme)
- Leaflet + react-leaflet (CartoDB Dark tiles)
- vite-plugin-pwa (Service Worker, offline cache, installable)
- iett-middle REST API for all data

### Screens

| Route | Description |
|---|---|
| `/` | Home — search bar, quick links |
| `/stops/:dcode` | Stop arrivals board (auto-refresh 20 s), **via-stop filter** |
| `/routes/:hatKodu` | Route page — live bus map, schedule, alerts, stops list |
| `/map` | Full-screen fleet map with route filter |
| `/settings` | API base URL, refresh interval |

### Development

```bash
cp .env.example .env
npm install
npm run dev
```

Requires a running `iett-middle` instance (default: `http://localhost:8000`). 
The Vite dev server proxies `/v1/*` to the iett-middle URL automatically.

### Build

```bash
npm run build
npm run preview
```

### Icons

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

### Docker

Use the multi-stage Dockerfile to build static assets and serve with nginx.

```bash
docker build -t iett-pwa:0.3.17 --build-arg VITE_API_BASE_URL=https://your-middle-host .
docker run --rm -p 8080:80 iett-pwa:0.3.17
```

Optimization notes:
- Route-level lazy loading keeps the initial bundle smaller (non-home pages load on demand).
- Stable manual Rollup chunking improves long-term browser cache hit rates for vendor code.
- Docker build stage uses `npm ci --include=optional` to ensure Rollup native binaries are available for `vite build`.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `''` (same origin) | iett-middle base URL |

### License & Legal

This project uses data sourced from the Istanbul Metropolitan Municipality (IBB). 
In compliance with the [IBB Open Data License](https://data.ibb.gov.tr/license), the following attribution is made:
> **Atıf 4.0 Uluslararası (CC BY 4.0) kapsamında lisanslanan kamu sektörü bilgilerini içerir.**

We will continue to pull as much data as possible through any accessible means to bypass the recent public data blackout.

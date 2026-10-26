# iett-pwa

[![Tests](https://img.shields.io/badge/tests-290%20passed-brightgreen)](#geliştirme-development)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)
[![Version](https://img.shields.io/badge/version-0.4.11-orange)](https://github.com/pcislocked/iett-pwa/releases)
[![License](https://img.shields.io/badge/license-CC%20BY%204.0-blue)](https://data.ibb.gov.tr/license)

[🇹🇷 Türkçe (Turkish)](#türkçe) | [🇬🇧 English](#english)

---

## 🇹🇷 Türkçe

`iett-pwa`, İETT'nin emektar Mobiett uygulamasını yayından kaldırmasının ardından üçüncü parti bir ajansa yaptırdığı *"Otobüsüm Nerede"* fiyaskosunu protesto amacıyla, tamamen yapay zeka kodlama araçları ve kişisel çaba ile tek başıma geliştirdiğim bağımsız ve açık kaynaklı bir otobüs takip uygulamasıdır.

Uygulama; durak/hat bazlı canlı araç takibi, bütün filoyu haritada görebilme, bir otobüse atanan geçmiş/gelecek seferleri görebilme, depar güzergahlarını inceleyebilme, ana ekrana durak sabitleyip sık kullandığınız durakları ve yakın duraklar ile o duraklara gelecek araçları uygulama açılır açmaz (ışık hızında) anında görme gibi özelliklerin yanı sıra genel olarak **performans ve günlük kullanımda hız odaklı** bir projedir.

Bir otobüs önünüze gelirken durağı açıp *"Buna binmeli miyim, yoksa beklemeli miyim?"* sorusunu birkaç saniye içinde cevaplayabilmek için tasarlandı. Üstelik bu hızı size uygulama mağazalarından yüklediğiniz hantal bir uygulama ile değil, **Progressive Web App (PWA)** teknolojisi ile sunuyoruz. "Uygulama" tamamen bir illüzyon; en başından beri kendini uygulama gibi gösteren bir web sitesi kullanıyorsunuz. PWA adı da oradan geliyor. Düzgün yapıldığı zaman mağaza uygulaması olmadan da hem ışık hızında hem de telefonda neredeyse hiç yer kaplamayan bir deneyim elde edilebiliyor.

Çalışır durumda bir [**iett-middle**](https://github.com/pcislocked/iett-middle) API sunucusu gerektirir.

Üç depoluk projenin ön yüz bileşenidir:
[**iett-pwa**](https://github.com/pcislocked/iett-pwa) (bu depo) ·
[iett-middle](https://github.com/pcislocked/iett-middle) (API proxy) ·
[iett-hacs](https://github.com/pcislocked/iett-hacs) (Home Assistant entegrasyonu)

---

### 🌟 Öne Çıkan Tüm Özellikler

- **📱 Yüklenebilir PWA & Web Share Target:** Sıfır mağaza yükü, anında açılma, 30 günlük harita karo önbelleklemesi, mobil/masaüstü ana ekrana eklenebilirlik ve işletim sistemi paylaşım menüsünden (`iett.istanbul` linklerini) doğrudan uygulama içinde açabilme (`/share-target`).
- **🚌 Araç Kapasite & Donanım İkonları:** Araç detayında ve geliş listelerinde klima (❄️), yolcu kapasitesi (👥) ve engelli erişilebilirliği (♿) donanımlarını anlık görme.
- **📌 Sabitlenmiş Duraklar:** Sık kullandığınız durakları ana sayfaya sabitleme (📌) ve tek dokunuşla canlı geliş sürelerini inceleme.
- **❤️ Favori Durak ve Hatlar:** Favori durak ve hatlarınızı favorilere ekleme (❤️) ve hızlı erişim panosu.
- **🔍 Tek Karakter Hat Arama & Akıllı Debounce:** 1 karakterli hat kodlarını (`1`, `2`, `E`) dahil tüm hatları, durak adlarını, 4+ haneli durak numaralarını veya yapıştırılan `iett.istanbul` bağlantılarını adaptif gecikme (`700ms`/`300ms`/`150ms`) ve anında `Enter` desteğiyle arama.
- **🔄 Ring Hat & Varyant Algılama:** Başlangıç ve bitiş durağı aynı olan dairesel (ring) hatları otomatik tespit ederek tepe durağıyla birlikte `🔄 Başlangıç > Tepe Noktası Ring` formatında anlaşılır gösterme.
- **📢 Resmi İETT Duyuruları & Ücret Tarifesi:** İETT'nin kurumsal duyurularını, hat bazlı sefer uyarılarını ve güncel toplu ulaşım ücret tarifesini uygulama içinden (`/announcements`) inceleme.
- **🗺️ Canlı Filo Haritası & Standart Plaka Arama:** Tüm İstanbul otobüs filosunu veya belirli bir hattın araçlarını harita katmanlarında canlı izleme; kapı kodu veya standart TR plaka (`34 HO 1900`) formatıyla boşluk/tire bağımsız araç bulma.
- **📍 Haritada Bölgesel Durak Arama:** Harita ekranında (`/map`) yakınlaşınca beliren yüzen butonla ekrandaki tüm durakları tek tıkla arayıp kırmızı pinlerle haritada gösterme.
- **🎯 Tek Seferlik Mock Konum Seçici:** Yakın Duraklar ekranında (`/nearby`) GPS izni beklenmeden haritaya dokunarak tek seferlik özel konum seçebilme ve tek tıkla GPS'e sıfırlayabilme.
- **🖥️ Akıllı Durak Kiosk Modu (`?kiosk=1`):** `?kiosk=1` veya `?embed=1` parametresiyle durak ekranını alt barlar, butonlar ve tıklanabilir linklerden arındırılmış, ekran uykusunu engelleyen tam ekran bir kamu bilgilendirme panosuna dönüştürme.
- **🖱️ Masaüstü Fareyle Tut-Sürükle & Tekerlek Kaydırması:** PC tarayıcılarında hat filtreleme şeritlerini ve zaman çubuklarını fareyle tut-sürükle ile kaydırabilme ve dikey tekerlek hareketini yatay kaydırmaya çevirme.
- **⚙️ Özelleştirilebilir Ayarlar & Tam Yedekleme (Schema v2):** Tema (AMOLED/Koyu/Açık), dil (TR/EN), ekranı açık tutma (Screen Wake Lock - 30 dk güvenlik zaman aşımı), dokunsal geri bildirim (Haptik) ve tüm uygulama verilerini (`BackupDataV2`) tek dosyada dışa/içe aktarma.
- **⏱️ Durak & ARAÇ Canlı Zaman Çubuğu (`StopTimebar`):** 20s otomatik yenilemeli canlı geliş panosu, hem durak hem de ARAÇ detay sayfasında (`DD-MM-YYYY` destekli) canlı saniye sayacı ve 3 kademeli zaman damgası bilgi penceresi (`TimestampInfoModal`).
- **🔒 Araç Detay & Oturum Altyapısı (`arac.iett.gov.tr`):** Kapı kodu ile araca özel oturum oluşturma, otomatik OCR captcha çözümü / manuel captcha modalı, araç teknik profili (marka, model yılı, kapasite, garaj kodu, yazılım sürümü), geçmiş ve gelecek görev/sefer zaman çizelgesi.

---

### 🛠️ Teknoloji Yığını (Stack)

- **Core:** React 18 + Vite + TypeScript
- **Styling:** Vanilla CSS + Tailwind CSS (özel tema token'ları)
- **Maps:** Leaflet + react-leaflet + CartoDB / Esri Basemaps
- **PWA:** `vite-plugin-pwa` (Service Worker, Web App Manifest, Web Share Target, Workbox Tile Cache)
- **Animations:** Framer Motion (Modal & Backdrop transition)
- **API Client:** `iett-middle` REST API (Fetch + AbortController stabilization)

---

### 📱 Ekranlar & Sayfalar

| Rota | Açıklama |
|---|---|
| `/` | **Ana Sayfa** — Hızlı arama, sabitlenmiş duraklar, yakın duraklar, hızlı erişim ve son aramalar |
| `/stops/:dcode` | **Durak Panosu** — Canlı tahmini gelişler, alt hat filtre ribbon'ı, Screen Wake Lock, max GPS zaman damgası ve duyuru barı |
| `/routes/:hatKodu` | **Hat Sayfası** — Canlı otobüs konumu haritası, ring/varyant seçimi, sefer saatleri, aksama duyuruları ve sıralı duraklar |
| `/nearby` | **Yakın Duraklar** — Koordinata en yakın durakları harita ve mesafe rozetleriyle listeleme, tek seferlik konum seçici |
| `/favorites` | **Favoriler** — Hızlı erişim için kaydedilmiş favori durak ve hat listesi |
| `/pinned` | **Sabitlenmiş Duraklar** — Ana ekranda canlı kart olarak gösterilecek durakları yönetme |
| `/arac-sorgu` | **Araç Sorgulama** — Kapı kodu veya plaka ile araç arama ve filo filtreleme |
| `/arac/bus/:kapino` | **Araç Detay Paneli** — Otobüsün teknik donanımları, güncel canlı konumu ve geçmiş/gelecek sefer çizelgesi |
| `/announcements` | **Duyurular & Uyarılar** — Resmi `iett.istanbul` duyuruları, genel sefer uyarıları ve güncel ücret tarifesi |
| `/share-target` | **Web Share Target** — Paylaşılan İETT bağlantılarını otomatik olarak ilgili hat veya durak sayfasına yönlendirir |
| `/map` | **Filo Haritası** — Hat/plaka filtreli tam ekran canlı otobüs takibi ve bölgesel durak arama kapsülü |
| `/tile-demo` | **Harita Karoları Laboratuvarı** — Farklı karo sağlayıcılarını ve canlı veri (KB) tüketimini test etme ekranı |
| `/settings` | **Ayarlar** — Tema, dil, zaman barı formatı, ekranı açık tutma, haptik geri bildirim, GPS/sahte konum ve v2 tam yedekleme |
| `?kiosk=1` | **Akıllı Durak Kiosk Modu** — Herhangi bir durak sayfasını tam ekran, dokunulmaz bilgilendirme ekranına dönüştürür |

---

### 🚀 Geliştirme (Development)

```bash
cp .env.example .env
npm install
npm run dev
```

Çalışan bir `iett-middle` sunucusu gerektirir (varsayılan: `http://localhost:8000`).  
Vite geliştirme sunucusu, `/v1/*` isteklerini otomatik olarak iett-middle URL'sine yönlendirir.

```bash
npm run typecheck    # TypeScript tip kontrolü
npm run lint         # ESLint kontrolü (--max-warnings 0)
npm test             # Vitest birim testleri (290/290 green)
```

---

### 📦 Derleme & Docker Deployment

#### Statik Derleme (Build):
```bash
npm run build
npm run preview
```

#### Docker:
Statik dosyaları derlemek ve Nginx ile sunmak için çok aşamalı (multi-stage) Dockerfile kullanır:

```bash
docker build -t iett-pwa:latest --build-arg VITE_API_BASE_URL=https://iettapi.pcislocked.net .
docker run --rm -p 8080:80 iett-pwa:latest
```

---

### ⚖️ Lisans & Gizlilik (KVKK)

- **Veri Kaynağı Atfı:** Bu proje İstanbul Büyükşehir Belediyesi (İBB) açık verilerini kullanmaktadır.  
  [İBB Açık Veri Lisansı](https://data.ibb.gov.tr/license) uyarınca:  
  > **Atıf 4.0 Uluslararası (CC BY 4.0) kapsamında lisanslanan kamu sektörü bilgilerini içerir.**
- **Gizlilik Politikası & KVKK:** Üyelik ve veritabanı bulunmamaktadır. Detaylı KVKK ve veri işleme politikası için:  
  [https://pcislocked.net/kvkk/#iett-pwa](https://pcislocked.net/kvkk/#iett-pwa)

---

## 🇬🇧 English

`iett-pwa` is an open-source, lightning-fast bus tracking web application built out of pure frustration when Istanbul's municipal transit authority (IETT) shut down its battle-tested legacy app (*Mobiett*) and replaced it with a third-party agency bloatware disaster called *"Otobüsüm Nerede"*. Built entirely solo using modern AI coding tools and sheer willpower, it is designed for maximum performance, minimal footprint, and zero store bloat.

The app features stop & route live bus tracking, full fleet map view, past/upcoming bus mission timelines, depar route inspects, pinned stops on the home screen, and instant arrival ETAs the split second you open the app.

It is engineered to answer one critical real-world question in a few seconds as a bus approaches your stop: **"Should I hop on this bus right now, or wait for the next one?"**

Instead of forcing users to download heavy, bloated native apps from app stores, `iett-pwa` delivers this speed using **Progressive Web App (PWA)** technology. The "app" is actually a clever illusion — you've been using a website disguised as a native app all along! That's where the name PWA comes from. When built properly, it delivers a blazingly fast experience while taking up virtually **zero storage space** on your phone.

Requires a running [**iett-middle**](https://github.com/pcislocked/iett-middle) API backend server.

Frontend component of a three-repository stack:
[**iett-pwa**](https://github.com/pcislocked/iett-pwa) (this repo) ·
[iett-middle](https://github.com/pcislocked/iett-middle) (API proxy) ·
[iett-hacs](https://github.com/pcislocked/iett-hacs) (Home Assistant integration)

---

### 🌟 Full Feature List
- **📱 Installable PWA Experience & Web Share Target:** Mobile/desktop home-screen installation, 30-day offline map tile caching, zero store overhead, and OS-level link sharing support (`/share-target`).
- **🚌 Vehicle Amenities & Capacity:** Live indicators for AC (❄️), passenger capacity (👥), and disability accessibility (♿) on vehicle detail sheets and arrival lists.
- **📌 Pinned Stops:** Pin your daily stops for one-tap live arrival access right on the home page.
- **❤️ Favorites:** Pin & manage your favorite routes and stops for fast access.
- **🔍 Recent Searches & Smart Search:** Search by route code (e.g. `14M`), stop name, or 4+ digit stop code; automatically stores recent searches.
- **🔄 Ring Route & Variant Detection:** Automatically identifies circular routes and formats them intuitively as `🔄 Start > Peak Turnaround Ring`.
- **📢 Official Announcements & Fare Table:** Access municipal announcements, line disruptions, and official transit fares inside the app (`/announcements`).
- **🗺️ Live Fleet Map & Regional Stop Search:** Track the fleet live or search stops in the current viewport with a floating pill button (`/map`).
- **🎯 One-Time Location Picker:** Select custom coordinates on the map in Nearby Stops (`/nearby`) without waiting for GPS permissions.
- **🖥️ Smart Display Kiosk Mode (`?kiosk=1`):** Convert any stop into a non-interactive, wake-locked municipal transit display board.
- **🖱️ Desktop Mouse Drag & Wheel Horizontal Scroll:** Fluid click-and-drag and vertical wheel translation for ribbons and timebars on desktop browsers.
- **⚙️ Fully Customizable Settings & Schema v2 Backup:** Easily adjust themes (AMOLED/Dark/Light), languages (TR/EN), refresh intervals, wake lock, haptics, and export/import all local settings via `BackupDataV2`.
- **⏱️ Arrivals Board & Max GPS Timestamp:** Live arrivals with max valid GPS timestamp detection (`maxGpsTime`), stale data warnings (>5 min), and 4 dynamic announcement banner states.
- **🔒 Vehicle Profile & Captcha Engine (`arac.iett.gov.tr`):** Per-vehicle session creation, automated OCR captcha solving / manual captcha fallback, vehicle specs, and past/upcoming mission timelines.
- **📍 Location Privacy & Mock Location:** Optional GPS integration with built-in fallback to mock location or manual map pin placement if location access is denied.

---

### 🚀 Development & Build

```bash
npm install
npm run dev
```

Requires a running `iett-middle` backend instance (default: `http://localhost:8000`).

```bash
npm run typecheck    # TypeScript type checks
npm run lint         # ESLint checks
npm test             # Vitest unit test suite (290/290 green)
```

### 📦 Docker Deployment

```bash
docker build -t iett-pwa:latest --build-arg VITE_API_BASE_URL=https://iettapi.pcislocked.net .
docker run --rm -p 8080:80 iett-pwa:latest
```

---

### ⚖️ License & Legal

- **Data Source Attribution:** Sourced from Istanbul Metropolitan Municipality (IBB) Open Data.  
  Under the [IBB Open Data License](https://data.ibb.gov.tr/license):  
  > **Contains public sector information licensed under CC BY 4.0.**
- **Privacy Policy & KVKK:** Zero accounts, zero user database. Full data & privacy policy:  
  [https://pcislocked.net/kvkk/#iett-pwa](https://pcislocked.net/kvkk/#iett-pwa)

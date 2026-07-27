# iett-pwa

[![Tests](https://img.shields.io/badge/tests-146%20passed-brightgreen)](#geliştirme-development)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)
[![Version](https://img.shields.io/badge/version-0.4.1-orange)](https://github.com/pcislocked/iett-pwa/releases/tag/v0.4.1)
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

- **📱 Yüklenebilir PWA Deneyimi:** Sıfır mağaza yükü, anında açılma, çevrimdışı önbellekleme ve mobil/masaüstü ana ekrana eklenebilirlik (Standalone PWA).
- **🚌 Araç Donanım & Özellik İkonları:** Araç detayında ve geliş listelerinde klima (❄️), USB şarj (🔌), Wi-Fi (🛜), bisiklet taşıma aparatı (🚲) ve engelli erişilebilirliği (♿) donanımlarını anlık görme.
- **📌 Sabitlenmiş Duraklar:** Sık kullandığınız durakları ana sayfaya sabitleme (📌) ve tek dokunuşla canlı geliş sürelerini inceleme.
- **❤️ Favori Durak ve Hatlar:** Favori durak ve hatlarınızı favorilere ekleme (❤️) ve hızlı erişim panosu.
- **🔍 Son Aramalar & Akıllı Arama:** Hat kodu (ör: `14M`), durak adı veya 4+ haneli durak numarası ile hızlı arama; son aramaları ana sayfada saklama.
- **🗺️ Canlı Filo Haritası & Araç Arama:** Tüm İstanbul otobüs filosunu veya belirli bir hattın araçlarını CartoDB Dark/Light harita katmanlarında canlı izleme; kapı kodu/plaka ile haritada araç bulma.
- **⚙️ Genel Olarak Özelleştirilebilir Ayarlar:** Ayarlar sayfasından tema (AMOLED/Koyu/Açık), dil (TR/EN), API sunucu adresi, otomatik yenileme aralığı, Yakın Durak yarıçapı/limiti, konum izni ve sahte konum (mock location) tercihlerini dilediğiniz gibi özelleştirebilme.
- **⏱️ Durak Geliş Panosu & Max GPS Zaman Damgası:** 20s otomatik yenilemeli canlı geliş panosu, durağa yaklaşan otobüslerin en güncel GPS saatini (`maxGpsTime`) tespit etme, 5 dakikadan eski veriler için bayrak uyarısı (`⚠️`) ve 4 farklı dinamik duyuru barı (Yükleniyor, Hata, Duyuru Yok, Aktif Duyurular).
- **🛤️ Via (Üzerinden Geçme) Filtresi:** Bir duraktan geçen otobüsleri, gitmek istediğiniz ikinci bir durağa (`via`) göre anında filtreleme.
- **🔒 Araç Detay & Oturum Altyapısı (`arac.iett.gov.tr`):** Kapı kodu ile araca özel oturum oluşturma, otomatik OCR captcha çözümü / manuel captcha modalı, araç teknik profili (marka, model yılı, kapasite, garaj kodu, yazılım sürümü), geçmiş ve gelecek görev/sefer zaman çizelgesi, depar güzergahları.
- **📍 Konum Gizliliği & Sahte Konum (Mock Location):** İsteğe bağlı GPS ile yakın durakları bulma; GPS izni verilmezse yerleşik sahte konum (mock location) veya haritaya dokunarak pin bırakarak konum belirleme.
- **🎨 Çoklu Tema Desteği:** AMOLED Siyah, Koyu (Dark) ve Açık (Light) tema seçenekleri; tema değişimine duyarlı CartoDB Dark Matter / Positron harita karoları.
- **🌐 Çoklu Dil (i18n):** Türkçe (`tr`) ve İngilizce (`en`) yerelleştirme.
- **📱 Mobil Alt Gezinti Çubuğu (Bottom Navigation):** Mobil cihazlarda başparmakla kolay kullanıma uygun alt gezinti çubuğu (Harita, Duraklar, Hatlar, Ana Sayfa, Ayarlar).

---

### 🛠️ Teknoloji Yığını (Stack)

- **Core:** React 18 + Vite 5 + TypeScript
- **Styling:** Vanilla CSS + Tailwind CSS (özel tema token'ları)
- **Maps:** Leaflet + react-leaflet + CartoDB Basemaps (Dark Matter / Positron)
- **PWA:** `vite-plugin-pwa` (Service Worker, Web App Manifest)
- **Animations:** Framer Motion (Modal & Backdrop transition)
- **API Client:** `iett-middle` REST API (Fetch + AbortController stabilization)

---

### 📱 Ekranlar & Sayfalar

| Rota | Açıklama |
|---|---|
| `/` | **Ana Sayfa** — Hızlı arama, sabitlenmiş duraklar, yakın duraklar, hızlı erişim ve son aramalar |
| `/stops/:dcode` | **Durak Panosu** — Canlı tahmini gelişler, via (üzerinden geçen) filtresi, max GPS zaman damgası ve 4 durumlu duyuru barı |
| `/routes/:hatKodu` | **Hat Sayfası** — Canlı otobüs konumu haritası, varyant seçimi, sefer saatleri, aksama duyuruları ve sıralı duraklar |
| `/map` | **Filo Haritası** — Hat filtreli tam ekran canlı otobüs takibi ve harita karo görünümü |
| `/settings` | **Ayarlar** — Tema seçimi, dil seçimi, API base URL'si, yenileme aralığı, GPS ve sahte konum yönetimi, yakın durak yarıçap/limit ayarları, veri yedekleme/içe aktarma |

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
npm test             # Vitest birim testleri (146/146 green)
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
docker build -t iett-pwa:0.4.1 --build-arg VITE_API_BASE_URL=https://iettapi.pcislocked.net .
docker run --rm -p 8080:80 iett-pwa:0.4.1
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

`iett-pwa` is an open-source, high-performance Progressive Web App (PWA) designed for real-time Istanbul IETT bus tracking. It was created as an independent alternative to official municipal apps, focusing heavily on speed, low footprint, and instant real-world usability.

### Highlights & Full Feature List
- **Installable PWA Experience:** Mobile/Desktop home-screen installation, offline shell caching, zero store overhead.
- **Vehicle Amenities:** View AC (❄️), USB charging (🔌), Wi-Fi (🛜), bicycle rack (🚲), and accessibility (♿) indicators.
- **Pinned Stops & Favorites:** Pin your daily stops for one-tap live arrival access right on the home page; manage favorite routes and stops.
- **Recent Searches & Smart Search:** Search by route code (e.g. `14M`), stop name, or 4+ digit stop code.
- **Live Fleet Map & Search:** Track the entire fleet or specific routes on CartoDB maps; search buses by door code or license plate.
- **Fully Customizable Settings:** Easily adjust themes, languages, API base URL, refresh intervals, nearby stop radius/limits, auto-location preferences, and mock location coordinates in Settings.
- **Arrivals Board & Max GPS Timestamp:** Live arrivals with max valid GPS timestamp detection, stale data warnings (>5 min), and 4 dynamic announcement states.
- **Via Filter:** Filter arriving buses by a second destination stop.
- **Vehicle Profile Overlay (`arac.iett.gov.tr`):** Solves vehicle captchas (automated OCR / manual modal), displays full specs (brand, model year, capacity, software version), and past/upcoming mission timelines.
- **Location Privacy & Mock Location:** Optional GPS integration with built-in fallback to mock location or manual map pin picker.
- **Multi-Theme:** AMOLED Black, Dark, and Light custom CSS themes matching CartoDB Dark Matter / Positron map tiles.
- **Multi-Language (i18n):** Turkish (`tr`) and English (`en`) localization.
- **Mobile Bottom Navigation:** Thumb-friendly bottom navigation bar for mobile screens.

### Quick Start
```bash
npm install
npm run dev
```

Requires a running `iett-middle` instance.

### License & Legal
In compliance with the [IBB Open Data License](https://data.ibb.gov.tr/license):
> **Contains public sector information licensed under CC BY 4.0.**  
Privacy & Data Policy: [https://pcislocked.net/kvkk/#iett-pwa](https://pcislocked.net/kvkk/#iett-pwa)

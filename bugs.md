# v0.3.x - v0.4.0 Bug Takipleri ve Düzeltmeler

Bu doküman, IETT uygulamasındaki karşılaşılan mantıksal, UI ve veri hatalarını ve bunların nasıl çözüldüğünü kayıt altında tutmak için oluşturulmuştur.

## 1. Route Sayfası Çökmesi (hatKodu is not defined)
- **Sorun:** Route sayfasında sekmeler arası gezinirken `TimetableView` bileşenine `hatKodu` prop'u aktarılmadığı için, bileşen içindeki scope dışında kalan bir kullanımdan dolayı uygulama crash veriyordu.
- **Çözüm:** `RoutePage.tsx` dosyasında `TimetableView` çağrılırken `hatKodu={hatKodu}` prop olarak eklendi ve bileşen imzasında (signature) karşılanarak kullanıldı.

## 2. usePolling Bağımlılık (Stale State) Sorunu
- **Sorun:** Durak sayfasından başka bir durağa geçildiğinde, 5 dakikalık (300sn) polling mekanizması bitene kadar eski durağın verileri ekranda kalıyor ve donuyordu. `setInterval` arka planda çalışsa da React state güncellenmiyordu.
- **Çözüm:** `usePolling` hook'una benzersiz bir `key` (örn. `dcode` veya `hatKodu`) parametresi eklendi. Anahtar değiştiğinde `useEffect` eski interval'i iptal edip state'i anında temizliyor ve yeni anahtar için anında bir ağ isteği tetikliyor.

## 3. Varyant İsimlerinin Aşırı Çoğullanması (Deduplication) ve Kaybolan Veriler
- **Sorun:** Kullanıcılar aynı isimdeki ama farklı duraklara sahip yan rotalardaki araçları (Örn: Hekimbaşı > Tokatköy) listede tek bir satırda görüyor ve seçemiyordu, veriler kayboluyordu.
- **Çözüm:** Deduplication mantığı kaldırılarak, backend'in sunduğu varyant suffix'leri (Örn: `D2107`) rota isimlerine eklendi. Böylece her rota seçilebilir ve ayırt edilebilir hale geldi.

## 4. İETT Yönlendirme Linki (404 Hatası)
- **Sorun:** Route sayfasındaki resmi İETT sayfasına yönlendiren dinamik link `?rcode=` şeklinde query parametresi yolladığı için 404 hatası döndürüyordu.
- **Çözüm:** Parametre `?hkod=` olarak güncellenerek link tamir edildi.

## 5. Başlıklarda Tekrarlayan Sayılar
- **Sorun:** Varyant isimlerinin (Örn: `D2107`) başlıklarına, İETT'nin tam isimden çektiği numaralar `2107` eklenerek `2107 TOKATKÖY (D2107)` şeklinde çirkin bir tekrara neden oluyordu.
- **Çözüm:** Eklenen prefix ile suffix numarası uyuşuyorsa akıllı bir yöntemle prefix label'dan kırpıldı.

## 6. StopPage Footer Tasarım Karmaşası
- **Sorun:** Durak sayfasındaki saat damgaları iki satıra yayılarak ekran alanını daraltıyordu. "Kayıt Saati" ibareleri eski sürümden kalmış ve yanlıştı.
- **Çözüm:** Tüm saatler (Örn: `güncellendi: 13:23:57, İETT: 13:23:55 (i)`) yan yana, aynı font stiliyle tek bir satıra hizalandı. Yanlış bilgi içeren "Kayıt Saati" ibareleri duyuru kartlarından tamamen silindi.

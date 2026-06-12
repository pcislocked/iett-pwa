import os
import re

file_path = r'c:\Users\amdin\Desktop\iett-project\iett-pwa\src\pages\StopPage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import and hook
if 'import { useTranslation }' not in content:
    content = content.replace("import { PINNED_STOPS_MAX, useUserPrefs } from '@/hooks/useUserPrefs'",
                              "import { PINNED_STOPS_MAX, useUserPrefs } from '@/hooks/useUserPrefs'\nimport { useTranslation } from 'react-i18next'")
    content = content.replace('export default function StopPage() {',
                              'export default function StopPage() {\n  const { t } = useTranslation()')

# 2. Amenity Icons
content = content.replace("label: 'USB'", "label: 'USB'") # USB is USB
content = content.replace("label: 'Wi-Fi'", "label: 'Wi-Fi'")
content = content.replace("label: 'Klima'", "label: 'Klima'") # will fix below
content = content.replace("label: 'Engelli'", "label: 'Engelli'") # will fix below

def replace_amenities(m):
    return """const items: { label: string; icon: string; value: boolean | null | undefined }[] = [
    { label: t('amenities.usb'), icon: '🔌', value: amenities.usb },
    { label: t('amenities.wifi'), icon: '📶', value: amenities.wifi },
    { label: t('amenities.ac'), icon: '❄️', value: amenities.ac },
    { label: t('amenities.accessible'), icon: '♿', value: amenities.accessible },
  ]"""

content = re.sub(r'const items: \{ label: string; icon: string; value: boolean \| null \| undefined \}\[\] = \[\s*\{ label: \'USB\'.*?\s*\]', replace_amenities, content, flags=re.DOTALL)

# Need to inject `const { t } = useTranslation()` into AmenityIcons
if 'function AmenityIcons({ amenities }: { amenities: Amenities | null }) {\n  const { t }' not in content:
    content = content.replace('function AmenityIcons({ amenities }: { amenities: Amenities | null }) {',
                              'function AmenityIcons({ amenities }: { amenities: Amenities | null }) {\n  const { t } = useTranslation()')

# Need to inject `const { t } = useTranslation()` into BusDetailSheet
if 'function BusDetailSheet({' in content and 'const { t } = useTranslation()' not in content.split('function BusDetailSheet({')[1].split('return')[0]:
    content = content.replace('const navigate = useNavigate()', 'const navigate = useNavigate()\n  const { t } = useTranslation()')

content = content.replace('Araç konumu henüz mevcut değil', "{t('stops.noPosition')}")
content = content.replace('<p className="text-[10px] text-slate-500 uppercase tracking-wider">ETA</p>', '<p className="text-[10px] text-slate-500 uppercase tracking-wider">{t(\'stops.eta\')}</p>')
content = content.replace('<p className="text-[10px] text-slate-500 uppercase tracking-wider">Mesafe</p>', '<p className="text-[10px] text-slate-500 uppercase tracking-wider">{t(\'stops.distance\')}</p>')
content = content.replace('<p className="text-[10px] text-slate-500 uppercase tracking-wider">Hız</p>', '<p className="text-[10px] text-slate-500 uppercase tracking-wider">{t(\'stops.speed\')}</p>')
content = content.replace('<p className="text-[10px] text-slate-500 uppercase tracking-wider">Plaka</p>', '<p className="text-[10px] text-slate-500 uppercase tracking-wider">{t(\'stops.plate\')}</p>')

content = content.replace('Hattı Aç →', "{t('stops.openRoute')}")
content = content.replace('Daha Fazla Detay', "{t('stops.moreDetail')}")
content = content.replace('Bu kayitta kapi kodu yok, Arac detayi acilamiyor.', "{t('stops.noKapinoWarning')}")

# Bottom bar tabs
content = content.replace("label: 'Geliş'", "label: t('stops.arrivals')")
content = content.replace("label: 'Hatlar'", "label: t('stops.routes')")
content = content.replace("label: 'Bilgi'", "label: t('stops.info')")

# Stop title
content = content.replace("const stopName = stopDetail?.name ?? `Durak ${dcode}`", "const stopName = stopDetail?.name ?? `${t('stops.title')} ${dcode}`")

# Header
content = content.replace("YÖNÜ", "{t('stops.directionLabel', { direction: stopDetail.direction }).replace('{{direction}}', '')}") # Actually JSON has {{direction}} YÖNÜ
content = content.replace("{stopDetail.direction} YÖNÜ", "{t('stops.directionLabel', { direction: stopDetail.direction })}")

content = content.replace("⚠ Son güncelleme başarısız", "{t('stops.staleWarning')}")

content = content.replace("En fazla ${PINNED_STOPS_MAX} durak sabitlenebilir", "${t('stops.pinAtLimit', { max: PINNED_STOPS_MAX })}")
content = content.replace("Sabitlemeyi kaldır", "${t('stops.unpinStop')}")
content = content.replace("Ana sayfaya sabitle", "${t('stops.pinStop')}")
content = content.replace("En fazla ${PINNED_STOPS_MAX} durak ana sayfaya sabitlenebilir", "${t('stops.pinLimit', { max: PINNED_STOPS_MAX })}")

content = content.replace("Yükleniyor...", "{t('common.loading')}")
content = content.replace("Bu durakta kayıtlı hat bulunamadı.", "{t('common.noData')}")
content = content.replace("Hat detayı", "{t('routes.info')}")

# Bilgi tab
content = content.replace("Durak Kodu", "Durak Kodu") # Keep as is, not in JSON
content = content.replace("Ad</span>", "Ad</span>")
content = content.replace("Yön</span>", "Yön</span>")

# Gelis tab
content = content.replace("Konum yükleniyor...", "{t('common.loading')}")
content = content.replace("Konum verisi yok", "{t('common.noData')}")

content = content.replace("Şu an sefer bilgisi yok", "{t('stops.noArrivals')}")
content = content.replace("hattı için veri bulunamadı", "hattı için {t('common.noData')}")

content = content.replace("güncellendi:", "güncellendi:")
content = content.replace("yükleniyor...'", "yükleniyor...'")
content = content.replace("Yenile", "{t('common.refresh')}")
content = content.replace(">Tümü<", ">{t('common.unknown')}<")

# aria-labels
content = content.replace("aria-label=\"Harita yüksekliğini ayarla\"", "")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")

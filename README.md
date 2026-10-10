# Keşif Yörüngesi

BİLSEM (Bilim ve Sanat Merkezi) öğrencileri için **3B, dokunmatik ve fareyle** çalışan etkileşimli Güneş Sistemi laboratuvarı. Güneş, 8 gezegen ve cüce gezegen Plüton; Saturn halkaları; başlıca uydular; hangardan fırlatıcı seçimi; öğrenci pilotu veya otomatik uçuş; **mekik ekranı** (görev bilgisayarı); görsel / gerçekçi ölçek ve yıldızlararası mod.

Tüm arayüz metinleri **Türkçe**dir. Kod, öğretmenin ve öğrencilerin okuyup genişletebilmesi için yorumlanmıştır.

**Canlı site:** [https://space-ege.netlify.app](https://space-ege.netlify.app)

Sınıf kopyası için **`gunes-sistemi.zip`** paketini kullanın: kaynak kod + hazır `dist/` derlemesi (Node kurulumu olmadan da `dist` bir yerel sunucuyla açılır).

## Yerelde çalıştırma

Node.js 18+ yeterlidir.

```bash
npm install
npm run dev
```

Tarayıcıda `http://127.0.0.1:47241` açılır (Vite, `vite.config.js` içindeki porta bağlanır).

Üretim derlemesi (klasör: `dist/`):

```bash
npm run build
npm run preview
```

`dist/` içeriği herhangi bir statik sunucuya (GitHub Pages, Netlify, okul sunucusu) kopyalanabilir. Yollar görelidir (`base: './'`).

**`index.html` veya `dist/index.html` dosyasını çift tıklamayın.** Bu bir ES modül uygulamasıdır; `file://` ile açılırsa tarayıcı sahnedeki script’leri yüklemez. Aşağıdaki gibi küçük bir HTTP sunucusu kullanın.

### Windows (hazır `dist/` klasörü)

Zip paketinde `dist/` zaten derlenmiş gelir. Node veya Python yeterlidir — `npm install` gerekmez.

PowerShell veya Komut İstemi:

```bat
cd dist
npx --yes serve -p 47241
```

Python yüklüyse (Microsoft Store / python.org):

```bat
cd dist
python -m http.server 47241
```

Tarayıcıda **http://127.0.0.1:47241** adresini açın. Durdurmak için pencerede `Ctrl+C`.

Kaynak kodu düzenlemek için Node.js 18+ ile `npm install` ve `npm run dev` kullanın (adres yine `http://127.0.0.1:47241`).

## GitHub Pages’e yayınlama

Üretimdeki canlı adres **[https://space-ege.netlify.app](https://space-ege.netlify.app)** (Netlify). GitHub Pages isteğe bağlı bir yedektir.

1. Bu projeyi bir GitHub deposuna itin.
2. `npm run build` ile `dist/` üretin.
3. Depo **Settings → Pages**:
   - **Source:** GitHub Actions, **veya**
   - `dist` klasörünü `gh-pages` dalına kopyalayın.
4. Proje sayfası (ör. `https://KULLANICI.github.io/REPO/`) için ek ayar gerekmez; `base: './'` alt klasörde de çalışır.

Hazır iş akışı: [`.github/workflows/pages.yml`](.github/workflows/pages.yml). Actions’ı açıp ilk `main` itişinden sonra Pages adresi oluşur.

`public/.nojekyll` dosyası, GitHub’un alt çizgili klasörleri yutmasını engeller.

## Sınıfta kullanım

### Hangar ve fırlatma

Karşılama ekranı hangara açılır. V-2, Saturn V, Uzay Mekiği, Soyuz-2, Falcon 9, Starship ve Türkiye’nin geliştirme halindeki DeltaV UFS kartlarından birini seçin. Boy, itki, yük ve ilk uçuş **yayımlanmış** ajans sayılarındandır; DeltaV’de boş kalanlar “henüz yayımlanmadı”dır. **Rampaya çık** 3-2-1-ATEŞ geri sayımını başlatır.

**Otomatik uçuş** (hangar ayarı): eski sinema uçuşu — gezegene dokunun, keşif aracı Bezier yolla gider, sağdaki bilgi paneli açılır.

**Yakıt meydan okuması** isteğe bağlıdır. Açıkken itki yakıt yer; bitince görev düşer. İpucu: Hohmann aktarımı (iki yörüngeye teğet elips) ve kütleçekim sapanı gerçek görevlerde yakıtı azaltır. Bu simülasyon bağışlayıcı bir oyundur, gerçek yörünge mekaniği değildir.

### Pilot ve mekik ekranı

Varsayılan: öğrencinin kendisi uçar. Kamera aracı izler.

- `W` itki, `S` / `Boşluk` fren, `A`/`D` sapma, oklar yunuslama, `Q`/`E` itki seviyesi, `V` kokpit kamerası, `Shift` takviye, `F` oto-pilot, `C` seyir
- Tablette sol yön kolu + sağ düğmeler; **Hangar** tuşu rampaya döner
- Hedefi alt şeritten veya 3B sahneden seçin

Hedefe **yavaş** yaklaşın (Fren + düşük itki seviyesi). Kayaç dünyalarda yüzey inişi, gaz/buz devlerinde yörüngeye oturma canlanır; ardından görev başarılı kartı ve tam gezegen dosyası açılır. Güneş, yanlış cisim veya çok hızlı çarpışma **Görev Başarısız** ekranını getirir.

**Mekik ekranı (MK-12):** kokpite gömülü görev bilgisayarı. Yaklaştıkça kilitler açılır:

1. tarama (henüz kilitli)
2. çap, kütle, Güneş’e uzaklık
3. yerçekimi, sıcaklık, yörünge, uydu sayısı
4. bileşim / yapı, yolculuk süresi
5. **varışta tam dosya** — uydular, görevler, “biliyor muydun?”

Telefon ve tablette panel kaydırılır; **Ekran** düğmesi onu büyütür.

### Keşif araçları

- **Gerçekçi ölçek:** çaplar ve uzaklıklar orantılıdır. Uzayın asıl dersi boşluktur; gezegenler nokta kadar kalır.
- **Yıldızlararası:** Proxima, Alpha Centauri A/B, Barnard, Sirius, TRAPPIST-1… Işık yılı halkaları logaritmiktir.
- **Zaman Hızı:** yörünge, dönüş ve uydular aynı saate bağlıdır. Varsayılan `1 saniye = 0,2 gün`. Mekik / roket uçuşu bu kaydırıcıdan bağımsızdır.
- **Görevler:** Mars, Ay, Galilei uyduları, Satürn halkası, Plüton, Proxima, iç gezegen turu. Rozetler `localStorage` içinde tutulur.

Klavye (keşif modu): `1`–`9` gezegenler, `0` Güneş, `P` Plüton, `Y` yıldızlararası, `S` ölçek, `Boşluk` duraklat, `H` yardım.

Dokunma: tek parmak bakış, iki parmak yakınlaştırma. Akıllı tahta için şerit düğmeleri 48 px yüksekliktedir.

## Proje yapısı

```
src/data/bodies.js        ← gezegen verisi (NASA sayıları, Türkçe açıklamalar)
src/data/stars.js         ← yakın yıldızlar ve hız karşılaştırmaları
src/data/rockets.js       ← fırlatıcı kartları (yayımlanmış sayılar + oyun hissi)
src/data/missions.js      ← görev kartları / rozetler
src/scene/kepler.js       ← Kepler denklemi (elips yörünge)
src/scene/textures.js     ← yordamsal dokular
src/scene/solarSystem.js
src/scene/spaceship.js    ← otomatik uçuş mekiği
src/scene/rocketModels.js ← stilize 3B fırlatıcılar
src/scene/hangarPreview.js
src/scene/interstellar.js
src/game/pilot.js         ← bağışlayıcı uçuş fiziği
src/game/progress.js      ← localStorage rozetleri
src/ui/hud.js             ← Türkçe keşif paneli
src/ui/cockpit.js         ← mekik ekranı (yaklaşma taraması)
src/ui/gameUi.js          ← hangar, HUD, dokunmatik kol
src/main.js               ← hangar → fırlatma → pilot / otomatik uçuş
```

Yeni bir gök cismi eklemek: `bodies.js` dizisine bir nesne yazın; sahne ve şerit otomatik dolar.

## Veri ve lisanslar

- Gezegen sayıları: [NASA Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/) ve NASA Solar System Exploration (2024–2025). Uydu sayıları keşiflerle değişir; bu, öğrencilere söylenmesi gereken bir noktadır.
- Yolculuk süreleri: **düz çizgi, sabit 16 km/s** (New Horizons mertebesi). Gerçek görevler kütleçekim sapanı kullanır; panelde Voyager, Cassini, New Horizons süreleri ayrıca yazılıdır.
- **Dokular:** üçüncü taraf görüntü yoktur. Tüm gezegen kaplamaları `src/scene/textures.js` içinde, tohumlu gürültüyle üretilir. Bu proje metni MIT lisansı altındadır; dokular da aynı kodun parçasıdır (ayrı bir NASA doku lisansı gerekmez).
- Yazı tipleri: Google Fonts üzerinden Sora ve IBM Plex Mono (çevrimdışı sınıfta sistem yazı tipi yedeklenir).

## Teknik notlar (üstün yetenekli öğrenciler için)

Yörünge konumu Kepler denklemiyle bulunur: \(M = E - e\sin E\). Newton yinelemesi `kepler.js` içindedir. Merkür (\(e \approx 0{,}21\)) ve Plüton (\(e \approx 0{,}25\)) elipsleri görünür biçimde basıktır.

Üçüncü Kepler yasası (\(T^2 \propto a^3\)) gerçek dönemlerle uygulanır; dış gezegenler içtekilerden yavaş döner. Görsel ölçekte yarıçaplar sıkıştırılmıştır; gerçekçi ölçekte 1 AB = 48 sahne birimidir.

Konsoldan deneme: `window.__kesif.flyToPlanet('jupiter')` (otomatik uçuş) veya `window.__kesif.demoPilot({ to: 'mars', approach: 0.6 })`.

Fırlatıcı `game.*` alanları eğitsel “his”tir (ivme, dönüş, yakıt); Tsiolkovsky denklemi veya Hohmann Δv hesaplanmaz. Sınıfta “neden oyun ile görev farklı?” sorusu için uygundur.

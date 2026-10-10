/**
 * Görev kartları. Koşullar src/game/progress.js içinde kontrol edilir.
 * Rozetler hangarda ve uçuş HUD’unda görünür.
 */

export const missions = [
  {
    id: 'mars',
    title: 'Mars’a git',
    blurb: 'Kızıl Gezegen’e kendi fırlatıcınla var. Perseverance ~7 ayda gitti; sen görsel ölçekte dakikalar içinde denersin.',
    badge: 'Kızıl Yol',
    icon: '♂',
    hint: 'Hohmann aktarımı: Dünya’dan Mars’a en ucuz yol, iki yörüngeye teğet bir elipstir. Yakıt modunda itkiyi sürekli basmak yerine hedefe hizalanınca kısa yakımlar dene.',
  },
  {
    id: 'moon',
    title: 'Ay’ı ziyaret et',
    blurb: 'Dünya’nın tek doğal uydusuna yaklaş. Apollo 11 üç günde vardı.',
    badge: 'Denizcilik',
    icon: '☾',
    hint: 'Ay, Dünya’nın yanında döner. Zaman Hızı yavaşken uydunun yerini kaçırmamak için oto-pilot yardımcı olur.',
  },
  {
    id: 'jupiter-moons',
    title: 'Jüpiter’in uydularını ziyaret et',
    blurb: 'Galilei uydularından en az ikisine (İo, Europa, Ganimed, Callisto) yaklaş.',
    badge: 'Galilei',
    icon: '♃',
    hint: 'Dört büyük uydu rezonanstadır. Yaklaşınca etiketler açılır; iki farklı uydu yeter.',
  },
  {
    id: 'saturn-rings',
    title: 'Satürn halkalarından geç',
    blurb: 'Halka düzleminden geç. Cassini bunu yıllarca yaptı; sen bir kez dene.',
    badge: 'Halka Kâşifi',
    icon: '♄',
    hint: 'Halkalar çok incedir. Satürn’e yandan değil, halka düzlemine yakın bir açı ile gel.',
  },
  {
    id: 'pluto',
    title: 'Plüton uçuşu',
    blurb: 'New Horizons gibi Kuiper kuşağına uzan. 9,5 yıllık yolculuğu seyir sıkıştırması ile kısalt.',
    badge: 'Ufuk',
    icon: '♇',
    hint: 'Plüton yörüngesi basıktır. Seyir (C) tuşu hedefe hizalıyken yolu kısaltır.',
  },
  {
    id: 'proxima',
    title: 'Proxima b',
    blurb: 'Yıldızlararası modda Proxima Centauri sistemine ulaş. Voyager hızıyla 75.000 yıl sürer.',
    badge: 'En Yakın Komşu',
    icon: '✦',
    hint: 'Önce Yıldızlararası düğmesine bas. Işık yılı halkaları logaritmiktir.',
  },
  {
    id: 'inner-tour',
    title: 'İç gezegen turu',
    blurb: 'Merkür, Venüs ve Mars’ın üçüne de ayrı görevlerde var.',
    badge: 'İç Güneş Sistemi',
    icon: '◎',
    hint: 'İç gezegenler Güneş’e yakın ve hızlıdır. Merkür’ün dışmerkezliği elipsi görünür kılar.',
  },
]

export const missionById = Object.fromEntries(missions.map((m) => [m.id, m]))

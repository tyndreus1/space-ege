/**
 * Sayı ve birim biçimleme — akıllı tahta ve telefonlarda okunaklı Türkçe çıktı.
 */

const TR = 'tr-TR'

export const AU_KM = 149_597_870.7
export const LY_KM = 9_460_730_472_580.8
export const C_KM_S = 299_792.458

/** New Horizons'un Güneş Sistemi'nden çıkış hızına yakın eğitimsel mekik hızı. */
export const SHUTTLE_KM_S = 16

export function formatNumber(n, digits = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString(TR, { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

export function formatScientific(n, digits = 2) {
  if (!n) return '0'
  const exp = n.toExponential(digits).replace('e+', '×10^').replace('e-', '×10^−')
  return exp.replace('×10^', ' × 10<sup>') + '</sup>'
}

export function formatKm(km) {
  if (km >= 1_000_000_000) {
    return `${formatNumber(km / 1_000_000_000, 2)} milyar km`
  }
  if (km >= 1_000_000) {
    return `${formatNumber(km / 1_000_000, 1)} milyon km`
  }
  return `${formatNumber(km, 0)} km`
}

export function formatAu(au) {
  return `${formatNumber(au, au >= 10 ? 1 : 3)} AB`
}

/**
 * Saniye cinsinden süreyi insan diline çevirir.
 * Öğrencilerin "kaç yıl sürer?" sorusuna sınıf içi cevap üretir.
 */
export function formatDuration(seconds) {
  if (seconds < 1) return `${formatNumber(seconds * 1000, 0)} milisaniye`
  if (seconds < 60) return `${formatNumber(seconds, 1)} saniye`
  const minutes = seconds / 60
  if (minutes < 60) return `${formatNumber(minutes, 1)} dakika`
  const hours = minutes / 60
  if (hours < 48) return `${formatNumber(hours, 1)} saat`
  const days = hours / 24
  if (days < 60) return `${formatNumber(days, 1)} gün`
  const years = days / 365.25
  if (years < 1.5) return `${formatNumber(days / 30.44, 1)} ay`
  if (years < 1000) return `${formatNumber(years, 1)} yıl`
  if (years < 1_000_000) return `${formatNumber(years, 0)} yıl`
  return `${formatNumber(years / 1_000_000, 2)} milyon yıl`
}

export function lightTravel(distanceKm) {
  return formatDuration(distanceKm / C_KM_S)
}

export function shuttleTravel(distanceKm) {
  return formatDuration(distanceKm / SHUTTLE_KM_S)
}

export function voyagerTravelLy(ly) {
  const voyagerKmS = 17
  return formatDuration((ly * LY_KM) / voyagerKmS)
}

export function lightTravelLy(ly) {
  return formatDuration((ly * LY_KM) / C_KM_S)
}

export function html(strings, ...values) {
  return strings.reduce((acc, chunk, i) => acc + chunk + (values[i] ?? ''), '')
}

/** Simülasyon zamanı: kaydırıcı 0 = duraklat, 1–100 logaritmik gün/saniye. */
export const TIME_MIN_DAYS = 0.05
export const TIME_MAX_DAYS = 48
export const TIME_DEFAULT_DAYS = 0.2

export function sliderToDays(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  const t = Math.min(1, Math.max(0, (n - 1) / 99))
  return TIME_MIN_DAYS * (TIME_MAX_DAYS / TIME_MIN_DAYS) ** t
}

export function daysToSlider(days) {
  if (days <= 0) return 0
  const t = Math.log(days / TIME_MIN_DAYS) / Math.log(TIME_MAX_DAYS / TIME_MIN_DAYS)
  return Math.round(1 + Math.min(1, Math.max(0, t)) * 99)
}

/** “1 saniye = X gün” — sınıf tahtasında okunur. */
export function formatSimRate(daysPerSecond, { paused = false } = {}) {
  if (paused || daysPerSecond <= 0) return 'Duraklatıldı'
  const days = daysPerSecond
  const hours = days * 24
  if (days < 1) {
    const decimals = days < 0.1 ? 2 : 1
    return `1 saniye = ${formatNumber(days, decimals)} gün  ·  ≈ ${formatNumber(hours, 0)} saat`
  }
  if (days < 10) {
    return `1 saniye = ${formatNumber(days, 1)} gün`
  }
  return `1 saniye = ${formatNumber(days, 0)} gün`
}

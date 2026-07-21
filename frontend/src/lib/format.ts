const MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
]
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

export function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  if (isNaN(d.getTime())) return iso
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${WEEKDAYS[d.getDay()]}`
}

export function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h} ч${m ? ` ${m} мин` : ''}`
}

export function fmtPrice(v: number, currency = 'RUB'): string {
  const s = new Intl.NumberFormat('ru-RU').format(Math.round(v))
  const sign = currency === 'RUB' ? '₽' : currency
  return `${s} ${sign}`
}

export function fmtPax(n: number): string {
  const forms = ['пассажир', 'пассажира', 'пассажиров']
  const m10 = n % 10
  const m100 = n % 100
  let form = forms[2]
  if (m10 === 1 && m100 !== 11) form = forms[0]
  else if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) form = forms[1]
  return `${n} ${form}`
}

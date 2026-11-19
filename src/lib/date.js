export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function localDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
export function weekDays(value = dateKey()) {
  const start = localDate(value);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => { const date = new Date(start); date.setDate(start.getDate() + i); return dateKey(date); });
}
export function shiftDay(value, offset) {
  const date = localDate(value); date.setDate(date.getDate() + offset); return dateKey(date);
}
export function prettyDate(value, options = { day: 'numeric', month: 'long' }) {
  return localDate(value).toLocaleDateString('es-ES', options);
}
export function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(localDate(value)) === value;
}

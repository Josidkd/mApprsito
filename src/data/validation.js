import { validDate } from '../lib/date.js';
export function text(value, max, label = 'El campo') {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`${label} es obligatorio y debe tener como máximo ${max} caracteres.`);
  return value.trim();
}
export function url(value = '') {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Revisa la URL.');
  if (!value.trim()) return '';
  try { const parsed = new URL(value.trim()); if (['http:', 'https:'].includes(parsed.protocol)) return parsed.href; } catch { /* invalid */ }
  throw new Error('Usa una URL completa HTTP o HTTPS.');
}
export function civilDate(value) { if (typeof value !== 'string' || !validDate(value)) throw new Error('Revisa la fecha.'); return value; }
export function eventData(payload) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.time)) throw new Error('Revisa la hora.');
  return { title: text(payload.title, 120, 'El título'), description: text(payload.description, 5000, 'La descripción'), date: civilDate(payload.date), time: payload.time, image: url(payload.image), info: url(payload.info), attendance: {} };
}
export function taskData(payload) { return { title: text(payload.title, 150, 'El título'), description: text(payload.description, 3000, 'La tarea'), done: false }; }

import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Fechas ──────────────────────────────────────────────────

/**
 * "Hoy 14:32" / "Ayer 09:10" / "12 mar 08:45"
 */
export function formatFechaHora(dateStr) {
  if (!dateStr) { return '—'; }
  const d = new Date(dateStr);
  if (isToday(d))     { return `Hoy ${format(d, 'HH:mm')}`; }
  if (isYesterday(d)) { return `Ayer ${format(d, 'HH:mm')}`; }
  return format(d, "d MMM HH:mm", { locale: es });
}

/**
 * "hace 3 minutos" / "hace 2 horas"
 */
export function formatHace(dateStr) {
  if (!dateStr) { return '—'; }
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es });
}

/**
 * "1h 23m" desde minutos
 */
export function formatDuracion(minutos) {
  if (minutos == null) { return '—'; }
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) { return `${m}m`; }
  if (m === 0) { return `${h}h`; }
  return `${h}h ${m}m`;
}

// ── Moneda ──────────────────────────────────────────────────

/**
 * 85000 → "$85.000"
 */
export function formatPeso(amount) {
  if (amount == null) { return '—'; }
  return `$${Number(amount).toLocaleString('es-CL')}`;
}

// ── RUT chileno ─────────────────────────────────────────────

/**
 * Valida y formatea RUT: "123456789" → "12.345.678-9"
 */
export function formatRut(rut) {
  if (!rut) { return ''; }
  const clean = String(rut).replace(/[^0-9kK]/g, '');
  if (clean.length < 2) { return rut; }
  const body = clean.slice(0, -1);
  const dv   = clean.slice(-1).toUpperCase();
  const fmt  = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${fmt}-${dv}`;
}

/**
 * Valida dígito verificador del RUT chileno
 * @returns {boolean}
 */
export function validarRut(rut) {
  if (!rut) { return false; }
  const clean = String(rut).replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) { return false; }
  const body = clean.slice(0, -1);
  const dv   = clean.slice(-1);
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const expected = 11 - (sum % 11);
  const dvCalc   = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);
  return dv === dvCalc;
}

// ── Texto ───────────────────────────────────────────────────

/**
 * Capitaliza primera letra: "pedro" → "Pedro"
 */
export function capitalize(str) {
  if (!str) { return ''; }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Iniciales de un nombre: "Ana María Rodríguez" → "AM"
 */
export function initials(name) {
  if (!name) { return '?'; }
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/**
 * Trunca texto largo: "Este texto es muy lar..." 
 */
export function truncate(str, maxLen = 40) {
  if (!str || str.length <= maxLen) { return str || ''; }
  return str.slice(0, maxLen - 3) + '...';
}

// ── Clases CSS ──────────────────────────────────────────────

/**
 * Color de avatar según nombre (determinístico)
 */
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
];

export function avatarColor(name = '') {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');

/**
 * Extrae parámetros de paginación de la query string
 */
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page  || '1',  10));
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(query.limit || String(DEFAULT_PAGE_SIZE), 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Construye la respuesta paginada estándar
 */
function paginatedResponse(rows, total, { page, limit }) {
  return {
    data:       rows,
    pagination: {
      page,
      limit,
      total:      Number(total),
      totalPages: Math.ceil(Number(total) / limit),
      hasNext:    page * limit < Number(total),
      hasPrev:    page > 1,
    },
  };
}

/**
 * Formatea un RUT chileno: 12345678 → 12.345.678
 */
function formatRut(rut) {
  if (!rut) { return ''; }
  const clean = String(rut).replace(/[^0-9kK]/g, '');
  const body  = clean.slice(0, -1);
  const dv    = clean.slice(-1).toUpperCase();
  const fmt   = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${fmt}-${dv}`;
}

/**
 * Genera un PIN numérico de N dígitos
 */
function generatePin(digits = 4) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

/**
 * Calcula minutos entre dos fechas
 */
function minutesBetween(dateA, dateB) {
  return Math.round(Math.abs(new Date(dateB) - new Date(dateA)) / 60000);
}

module.exports = { parsePagination, paginatedResponse, formatRut, generatePin, minutesBetween };

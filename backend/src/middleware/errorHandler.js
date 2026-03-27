function errorHandler(err, req, res, _next) {
  console.error(`[${new Date().toISOString()}] ERROR:`, err);

  // Errores de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message, details: err.details });
  }

  // Errores de PostgreSQL
  if (err.code) {
    const pgErrors = {
      '23505': 'Registro duplicado — ya existe un valor único igual.',
      '23503': 'Referencia inválida — el registro relacionado no existe.',
      '23502': 'Campo obligatorio nulo — complete todos los campos requeridos.',
      '42P01': 'Error de base de datos — tabla no encontrada.',
    };
    if (pgErrors[err.code]) {
      return res.status(409).json({ error: pgErrors[err.code], pg_code: err.code });
    }
  }

  // Error genérico
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message
  });
}

module.exports = { errorHandler };

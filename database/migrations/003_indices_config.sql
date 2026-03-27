-- ============================================================
-- MIGRACIÓN 003 — Índices adicionales, políticas RLS (Supabase)
-- y tabla de configuración por condominio
-- ============================================================

-- ── Índices compuestos para reportes frecuentes ───────────────

-- Tickets por condominio + estado + prioridad
CREATE INDEX IF NOT EXISTS idx_tickets_cond_estado_prio
  ON tickets(condominio_id, estado, prioridad);

-- Gastos comunes por año/mes (reportes financieros)
CREATE INDEX IF NOT EXISTS idx_gastos_anio_mes
  ON gastos_comunes(condominio_id, anio DESC, mes DESC);

-- Reservas futuras por área
CREATE INDEX IF NOT EXISTS idx_reservas_futuras
  ON reservas(area_comun_id, inicio_at)
  WHERE estado = 'confirmada' AND inicio_at > NOW();

-- Encomiendas sin retirar por condominio
CREATE INDEX IF NOT EXISTS idx_encomiendas_pendientes
  ON encomiendas(condominio_id, recibido_at DESC)
  WHERE estado = 'en_conserjeria';

-- ── Tabla de configuración por condominio ─────────────────────

CREATE TABLE IF NOT EXISTS configuracion (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id         UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE UNIQUE,

  -- Estacionamientos
  parking_max_horas     INT     DEFAULT 3,
  parking_alerta_mins   INT     DEFAULT 30,

  -- Gastos comunes
  gasto_dia_vencimiento INT     DEFAULT 10,   -- día del mes
  gasto_monto_base      INT     DEFAULT 85000, -- monto base CLP

  -- Notificaciones
  notif_visita_email    BOOLEAN DEFAULT TRUE,
  notif_visita_push     BOOLEAN DEFAULT TRUE,
  notif_encomienda_email BOOLEAN DEFAULT TRUE,
  notif_encomienda_push  BOOLEAN DEFAULT TRUE,
  notif_gasto_reminder  BOOLEAN DEFAULT TRUE,
  gasto_reminder_dias   INT     DEFAULT 3,    -- días antes del vencimiento

  -- Branding
  color_primario        VARCHAR(7)  DEFAULT '#4c6ef5',
  horario_inicio        TIME        DEFAULT '08:00',
  horario_fin           TIME        DEFAULT '22:00',

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at para configuracion
CREATE TRIGGER set_updated_at_configuracion
  BEFORE UPDATE ON configuracion
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Insertar configuración default para condominios existentes
INSERT INTO configuracion (condominio_id)
SELECT id FROM condominios
ON CONFLICT (condominio_id) DO NOTHING;

-- ── Vista resumen completo por condominio (para admin) ─────────

CREATE OR REPLACE VIEW v_resumen_condominio AS
SELECT
  c.id             AS condominio_id,
  c.nombre,
  c.plan_saas,
  COUNT(DISTINCT u.id)                                           AS total_unidades,
  COUNT(DISTINCT usr.id)  FILTER (WHERE usr.rol = 'residente')  AS total_residentes,
  COUNT(DISTINCT v.id)    FILTER (WHERE DATE(v.created_at) = CURRENT_DATE) AS visitas_hoy,
  COUNT(DISTINCT v.id)    FILTER (WHERE v.estado = 'dentro')    AS visitas_dentro,
  COUNT(DISTINCT enc.id)  FILTER (WHERE enc.estado = 'en_conserjeria') AS paquetes_pendientes,
  COUNT(DISTINCT t.id)    FILTER (WHERE t.estado = 'pendiente') AS tickets_pendientes,
  COUNT(DISTINCT gc.id)   FILTER (WHERE gc.estado_pago = 'moroso') AS unidades_morosas
FROM condominios c
LEFT JOIN unidades u      ON u.condominio_id   = c.id AND u.activa = TRUE
LEFT JOIN usuarios usr    ON usr.condominio_id = c.id AND usr.activo = TRUE
LEFT JOIN visitas v       ON v.condominio_id   = c.id
LEFT JOIN encomiendas enc ON enc.condominio_id = c.id
LEFT JOIN tickets t       ON t.condominio_id   = c.id
LEFT JOIN gastos_comunes gc ON gc.condominio_id = c.id
  AND gc.mes  = EXTRACT(MONTH FROM NOW())
  AND gc.anio = EXTRACT(YEAR  FROM NOW())
GROUP BY c.id, c.nombre, c.plan_saas;

-- ── Función: generar gastos comunes del mes ───────────────────

CREATE OR REPLACE FUNCTION generar_gastos_mes(
  p_condominio_id UUID,
  p_mes           INT,
  p_anio          INT
) RETURNS INT AS $$
DECLARE
  v_monto_base INT;
  v_dia_venc   INT;
  v_count      INT := 0;
BEGIN
  -- Obtener config del condominio
  SELECT gasto_monto_base, gasto_dia_vencimiento
  INTO v_monto_base, v_dia_venc
  FROM configuracion
  WHERE condominio_id = p_condominio_id;

  -- Usar defaults si no hay config
  v_monto_base := COALESCE(v_monto_base, 85000);
  v_dia_venc   := COALESCE(v_dia_venc, 10);

  -- Insertar para cada unidad activa
  INSERT INTO gastos_comunes (
    condominio_id, unidad_id, mes, anio, monto_base,
    estado_pago, fecha_vencimiento
  )
  SELECT
    p_condominio_id,
    u.id,
    p_mes,
    p_anio,
    v_monto_base,
    'pendiente',
    MAKE_DATE(p_anio, p_mes, v_dia_venc)
  FROM unidades u
  WHERE u.condominio_id = p_condominio_id
    AND u.activa = TRUE
  ON CONFLICT (unidad_id, mes, anio) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ── Función: marcar morosos (ejecutar mensualmente) ───────────

CREATE OR REPLACE FUNCTION marcar_morosos(p_condominio_id UUID)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE gastos_comunes
  SET estado_pago = 'moroso'
  WHERE condominio_id  = p_condominio_id
    AND estado_pago    = 'pendiente'
    AND fecha_vencimiento < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

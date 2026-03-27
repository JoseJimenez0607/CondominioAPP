-- ============================================================
-- LÓGICA DE NEGOCIO — VISITAS Y ESTACIONAMIENTOS
-- Stored procedures, vistas y triggers
-- ============================================================

-- ============================================================
-- FUNCIÓN: Registrar entrada de visita
-- ============================================================
CREATE OR REPLACE FUNCTION registrar_entrada_visita(
    p_condominio_id     UUID,
    p_unidad_destino_id UUID,
    p_nombre_visita     VARCHAR,
    p_rut_dni           VARCHAR,
    p_patente           VARCHAR DEFAULT NULL,
    p_codigo_qr         VARCHAR DEFAULT NULL,
    p_registrada_por_id UUID DEFAULT NULL,
    p_calzo_id          UUID DEFAULT NULL          -- estacionamiento a asignar
) RETURNS JSON AS $$
DECLARE
    v_visita_id     UUID;
    v_qr_valido     BOOLEAN := FALSE;
    v_aprobador_id  UUID;
    v_result        JSON;
BEGIN
    -- Validar QR si viene (visita pre-aprobada)
    IF p_codigo_qr IS NOT NULL THEN
        SELECT id, aprobada_por_id INTO v_visita_id, v_aprobador_id
        FROM visitas
        WHERE codigo_qr = p_codigo_qr
          AND condominio_id = p_condominio_id
          AND estado = 'esperando'
          AND (qr_expira_at IS NULL OR qr_expira_at > NOW());

        IF v_visita_id IS NOT NULL THEN
            v_qr_valido := TRUE;
            -- Actualizar visita existente pre-aprobada
            UPDATE visitas SET
                estado      = 'dentro',
                entrada_at  = NOW(),
                rut_dni     = p_rut_dni,
                patente     = p_patente,
                registrada_por_id = p_registrada_por_id
            WHERE id = v_visita_id;
        END IF;
    END IF;

    -- Si no hay QR válido, crear nueva visita
    IF NOT v_qr_valido THEN
        INSERT INTO visitas (
            condominio_id, unidad_destino_id, nombre_visita,
            rut_dni, patente, estado, entrada_at, registrada_por_id
        ) VALUES (
            p_condominio_id, p_unidad_destino_id, p_nombre_visita,
            p_rut_dni, p_patente, 'dentro', NOW(), p_registrada_por_id
        ) RETURNING id INTO v_visita_id;
    END IF;

    -- Asignar estacionamiento si se indicó
    IF p_calzo_id IS NOT NULL THEN
        -- Verificar que el calzo esté libre
        IF EXISTS (
            SELECT 1 FROM estacionamientos
            WHERE id = p_calzo_id AND estado = 'libre' AND condominio_id = p_condominio_id
        ) THEN
            INSERT INTO estacionamientos_visita (
                condominio_id, estacionamiento_id, visita_id, asignado_por_id
            ) VALUES (
                p_condominio_id, p_calzo_id, v_visita_id, p_registrada_por_id
            );

            UPDATE estacionamientos
            SET estado = 'ocupado'
            WHERE id = p_calzo_id;
        ELSE
            RAISE WARNING 'Calzo % no disponible', p_calzo_id;
        END IF;
    END IF;

    -- Log de auditoría
    INSERT INTO audit_log (condominio_id, usuario_id, accion, tabla, registro_id)
    VALUES (p_condominio_id, p_registrada_por_id, 'REGISTRO_ENTRADA', 'visitas', v_visita_id);

    SELECT json_build_object(
        'success',      TRUE,
        'visita_id',    v_visita_id,
        'qr_validado',  v_qr_valido,
        'entrada_at',   NOW()
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- FUNCIÓN: Registrar salida de visita
-- ============================================================
CREATE OR REPLACE FUNCTION registrar_salida_visita(
    p_visita_id         UUID,
    p_registrada_por_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_condominio_id UUID;
    v_calzo_id      UUID;
    v_duracion_mins INT;
    v_result        JSON;
BEGIN
    -- Obtener datos de la visita
    SELECT condominio_id INTO v_condominio_id
    FROM visitas WHERE id = p_visita_id AND estado = 'dentro';

    IF NOT FOUND THEN
        RETURN json_build_object('success', FALSE, 'error', 'Visita no encontrada o ya salió');
    END IF;

    -- Registrar salida
    UPDATE visitas SET
        estado      = 'salio',
        salida_at   = NOW()
    WHERE id = p_visita_id;

    -- Liberar estacionamiento asociado (si existe)
    SELECT ev.estacionamiento_id INTO v_calzo_id
    FROM estacionamientos_visita ev
    WHERE ev.visita_id = p_visita_id AND ev.salida_at IS NULL;

    IF v_calzo_id IS NOT NULL THEN
        UPDATE estacionamientos_visita
        SET salida_at = NOW()
        WHERE visita_id = p_visita_id AND salida_at IS NULL;

        UPDATE estacionamientos
        SET estado = 'libre'
        WHERE id = v_calzo_id;
    END IF;

    -- Calcular duración
    SELECT EXTRACT(EPOCH FROM (NOW() - entrada_at))/60
    INTO v_duracion_mins
    FROM visitas WHERE id = p_visita_id;

    -- Log
    INSERT INTO audit_log (condominio_id, usuario_id, accion, tabla, registro_id)
    VALUES (v_condominio_id, p_registrada_por_id, 'REGISTRO_SALIDA', 'visitas', p_visita_id);

    RETURN json_build_object(
        'success',          TRUE,
        'visita_id',        p_visita_id,
        'salida_at',        NOW(),
        'duracion_minutos', ROUND(v_duracion_mins),
        'calzo_liberado',   v_calzo_id IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- FUNCIÓN: Generar QR pre-aprobado (llamado desde app residente)
-- ============================================================
CREATE OR REPLACE FUNCTION generar_qr_visita(
    p_condominio_id     UUID,
    p_unidad_id         UUID,
    p_aprobador_id      UUID,
    p_nombre_visita     VARCHAR,
    p_rut_dni           VARCHAR,
    p_horas_valido      INT DEFAULT 24
) RETURNS JSON AS $$
DECLARE
    v_token     TEXT;
    v_visita_id UUID;
BEGIN
    -- Generar token único
    v_token := encode(gen_random_bytes(16), 'hex');

    INSERT INTO visitas (
        condominio_id, unidad_destino_id, aprobada_por_id,
        nombre_visita, rut_dni, estado,
        codigo_qr, qr_expira_at
    ) VALUES (
        p_condominio_id, p_unidad_id, p_aprobador_id,
        p_nombre_visita, p_rut_dni, 'esperando',
        v_token, NOW() + (p_horas_valido || ' hours')::INTERVAL
    ) RETURNING id INTO v_visita_id;

    RETURN json_build_object(
        'visita_id',    v_visita_id,
        'qr_token',     v_token,
        'expira_at',    NOW() + (p_horas_valido || ' hours')::INTERVAL,
        'qr_url',       'https://condominioapp.cl/qr/' || v_token
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- FUNCIÓN: Verificar y alertar estacionamientos próximos a vencer
-- (ejecutar cada 15 min via pg_cron o cron externo)
-- ============================================================
CREATE OR REPLACE FUNCTION check_alertas_parking()
RETURNS TABLE(
    condominio_id   UUID,
    visita_id       UUID,
    nombre_visita   VARCHAR,
    calzo_codigo    VARCHAR,
    minutos_exceso  INT,
    unidad_destino  VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.condominio_id,
        v.id AS visita_id,
        v.nombre_visita,
        e.codigo AS calzo_codigo,
        CAST(EXTRACT(EPOCH FROM (NOW() - ev.entrada_at))/60 - (ev.max_horas * 60) AS INT) AS minutos_exceso,
        u.numero AS unidad_destino
    FROM estacionamientos_visita ev
    JOIN visitas v ON v.id = ev.visita_id
    JOIN estacionamientos e ON e.id = ev.estacionamiento_id
    JOIN unidades u ON u.id = v.unidad_destino_id
    WHERE ev.salida_at IS NULL
      AND (EXTRACT(EPOCH FROM (NOW() - ev.entrada_at))/60) >= ((ev.max_horas * 60) - 30)
      AND ev.alerta_enviada = FALSE
    ORDER BY minutos_exceso DESC;
END;
$$ LANGUAGE plpgsql;

-- Marcar alerta como enviada
CREATE OR REPLACE FUNCTION marcar_alerta_enviada(p_estacionamiento_visita_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE estacionamientos_visita
    SET alerta_enviada = TRUE
    WHERE id = p_estacionamiento_visita_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- VISTAS ÚTILES PARA EL PANEL DEL CONSERJE
-- ============================================================

-- Vista: Visitas activas (dentro del condominio ahora)
CREATE OR REPLACE VIEW v_visitas_activas AS
SELECT
    v.id,
    v.condominio_id,
    v.nombre_visita,
    v.rut_dni,
    v.patente,
    u.numero AS unidad_destino,
    v.entrada_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - v.entrada_at))/60) AS minutos_dentro,
    e.codigo AS calzo_asignado,
    ev.max_horas AS horas_max_parking,
    CASE
        WHEN ev.id IS NOT NULL AND
             EXTRACT(EPOCH FROM (NOW() - ev.entrada_at))/60 > (ev.max_horas * 60 - 30)
        THEN TRUE ELSE FALSE
    END AS alerta_parking
FROM visitas v
JOIN unidades u ON u.id = v.unidad_destino_id
LEFT JOIN estacionamientos_visita ev ON ev.visita_id = v.id AND ev.salida_at IS NULL
LEFT JOIN estacionamientos e ON e.id = ev.estacionamiento_id
WHERE v.estado = 'dentro';

-- Vista: Disponibilidad de estacionamientos de visitas
CREATE OR REPLACE VIEW v_parking_disponibilidad AS
SELECT
    e.condominio_id,
    COUNT(*) FILTER (WHERE e.estado = 'libre') AS libres,
    COUNT(*) FILTER (WHERE e.estado = 'ocupado') AS ocupados,
    COUNT(*) AS total,
    ROUND(
        COUNT(*) FILTER (WHERE e.estado = 'libre') * 100.0 / NULLIF(COUNT(*), 0), 1
    ) AS pct_disponible
FROM estacionamientos e
WHERE e.tipo = 'visita' AND e.activo = TRUE
GROUP BY e.condominio_id;

-- Vista: Resumen de morosidad por condominio
CREATE OR REPLACE VIEW v_morosidad AS
SELECT
    gc.condominio_id,
    u.numero AS unidad,
    SUM(gc.monto_total) AS deuda_total,
    COUNT(*) AS meses_morosos,
    MAX(gc.anio * 100 + gc.mes) AS ultimo_mes_moroso
FROM gastos_comunes gc
JOIN unidades u ON u.id = gc.unidad_id
WHERE gc.estado_pago = 'moroso'
GROUP BY gc.condominio_id, u.numero
ORDER BY deuda_total DESC;

-- Vista: Dashboard diario del conserje
CREATE OR REPLACE VIEW v_dashboard_conserje AS
SELECT
    v.condominio_id,
    COUNT(*) FILTER (WHERE v.estado = 'dentro') AS visitas_dentro,
    COUNT(*) FILTER (WHERE DATE(v.created_at) = CURRENT_DATE) AS visitas_hoy,
    COUNT(*) FILTER (WHERE v.entrada_at >= NOW() - INTERVAL '1 hour') AS ingresos_ultima_hora,
    (SELECT COUNT(*) FROM encomiendas e2
     WHERE e2.condominio_id = v.condominio_id AND e2.estado = 'en_conserjeria') AS paquetes_pendientes,
    (SELECT COUNT(*) FROM tickets t2
     WHERE t2.condominio_id = v.condominio_id AND t2.estado = 'pendiente') AS tickets_pendientes
FROM visitas v
GROUP BY v.condominio_id;

-- ============================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_usuarios
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_condominios
    BEFORE UPDATE ON condominios
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_tickets
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TRIGGER: Auditoría automática en tabla de visitas
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_audit_visitas()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        condominio_id, accion, tabla, registro_id, datos_antes, datos_despues
    ) VALUES (
        COALESCE(NEW.condominio_id, OLD.condominio_id),
        TG_OP,
        'visitas',
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_visitas
    AFTER INSERT OR UPDATE OR DELETE ON visitas
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_visitas();

-- ============================================================
-- DATOS INICIALES: Condominio de prueba
-- ============================================================
INSERT INTO condominios (nombre, direccion, plan_saas, email_admin)
VALUES ('Edificio Aurora', 'Av. Providencia 1234, Santiago', 'pro', 'admin@edificioaurora.cl');

-- Obtener id del condominio para insertar datos de prueba
DO $$
DECLARE
    v_cond_id   UUID;
    v_u101_id   UUID;
    v_u102_id   UUID;
    v_u201_id   UUID;
    v_admin_id  UUID;
BEGIN
    SELECT id INTO v_cond_id FROM condominios WHERE nombre = 'Edificio Aurora';

    -- Unidades
    INSERT INTO unidades (condominio_id, numero, tipo, piso)
    VALUES
        (v_cond_id, '101', 'departamento', 1),
        (v_cond_id, '102', 'departamento', 1),
        (v_cond_id, '201', 'departamento', 2),
        (v_cond_id, '202', 'departamento', 2),
        (v_cond_id, '301', 'departamento', 3),
        (v_cond_id, '302', 'departamento', 3)
    RETURNING id INTO v_u101_id;

    SELECT id INTO v_u101_id FROM unidades WHERE condominio_id = v_cond_id AND numero = '101';
    SELECT id INTO v_u102_id FROM unidades WHERE condominio_id = v_cond_id AND numero = '102';
    SELECT id INTO v_u201_id FROM unidades WHERE condominio_id = v_cond_id AND numero = '201';

    -- Usuarios: admin, conserje, residentes
    INSERT INTO usuarios (condominio_id, unidad_id, nombre, email, rol)
    VALUES
        (v_cond_id, NULL, 'Administrador Aurora', 'admin@edificioaurora.cl', 'admin'),
        (v_cond_id, NULL, 'Carlos García', 'conserje@edificioaurora.cl', 'conserje'),
        (v_cond_id, v_u101_id, 'Ana Rodríguez', 'ana.rodriguez@gmail.com', 'residente'),
        (v_cond_id, v_u102_id, 'Pedro Soto', 'pedro.soto@gmail.com', 'residente'),
        (v_cond_id, v_u201_id, 'Carmen Jiménez', 'carmen.jimenez@gmail.com', 'residente');

    -- Estacionamientos de visitas
    INSERT INTO estacionamientos (condominio_id, codigo, tipo, estado)
    VALUES
        (v_cond_id, 'V1', 'visita', 'ocupado'),
        (v_cond_id, 'V2', 'visita', 'libre'),
        (v_cond_id, 'V3', 'visita', 'ocupado'),
        (v_cond_id, 'V4', 'visita', 'libre'),
        (v_cond_id, 'V5', 'visita', 'ocupado');

    -- Áreas comunes
    INSERT INTO areas_comunes (condominio_id, nombre, aforo_max, costo_reserva, duracion_bloque)
    VALUES
        (v_cond_id, 'Piscina', 30, 0, 120),
        (v_cond_id, 'Quincho 1', 40, 15000, 240),
        (v_cond_id, 'Sala de eventos', 80, 30000, 480),
        (v_cond_id, 'Cancha de tenis', 4, 5000, 60);
END;
$$;

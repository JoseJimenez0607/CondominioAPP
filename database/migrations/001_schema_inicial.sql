-- ============================================================
-- SISTEMA DE GESTIÓN DE CONDOMINIOS — SAAS
-- Esquema PostgreSQL v1.0
-- Módulos: Acceso, Estacionamientos, Reservas, Encomiendas,
--          Tickets, Finanzas, Roles
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE rol_usuario AS ENUM ('admin', 'conserje', 'residente', 'guardia');
CREATE TYPE estado_visita AS ENUM ('esperando', 'dentro', 'salio', 'rechazada');
CREATE TYPE estado_ticket AS ENUM ('pendiente', 'en_revision', 'resuelto', 'cerrado');
CREATE TYPE categoria_ticket AS ENUM ('luminaria', 'ascensor', 'agua', 'gas', 'seguridad', 'limpieza', 'otro');
CREATE TYPE estado_reserva AS ENUM ('confirmada', 'cancelada', 'completada', 'no_asistio');
CREATE TYPE estado_pago AS ENUM ('pendiente', 'pagado', 'moroso', 'exento');
CREATE TYPE estado_encomienda AS ENUM ('en_conserjeria', 'retirado', 'devuelto');
CREATE TYPE estado_estacionamiento AS ENUM ('libre', 'ocupado', 'reservado', 'bloqueado');

-- ============================================================
-- TABLA: CONDOMINIOS (entidad raíz del SaaS multi-tenant)
-- ============================================================
CREATE TABLE condominios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(150) NOT NULL,
    direccion       TEXT NOT NULL,
    rut_empresa     VARCHAR(20),
    plan_saas       VARCHAR(30) DEFAULT 'basic' CHECK (plan_saas IN ('basic','pro','enterprise')),
    logo_url        TEXT,
    telefono        VARCHAR(20),
    email_admin     VARCHAR(150),
    max_unidades    INT DEFAULT 100,
    timezone        VARCHAR(50) DEFAULT 'America/Santiago',
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: UNIDADES (deptos / casas dentro del condominio)
-- ============================================================
CREATE TABLE unidades (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominio_id   UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    numero          VARCHAR(20) NOT NULL,          -- ej: "101", "Casa 5"
    tipo            VARCHAR(20) DEFAULT 'departamento' CHECK (tipo IN ('departamento','casa','oficina','local')),
    piso            INT,
    torre           VARCHAR(10),
    superficie_m2   NUMERIC(7,2),
    activa          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (condominio_id, numero)
);

-- ============================================================
-- TABLA: USUARIOS (residentes, conserjes, admins)
-- ============================================================
CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominio_id   UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_id       UUID REFERENCES unidades(id) ON DELETE SET NULL,
    nombre          VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL,
    telefono        VARCHAR(20),
    rut_dni         VARCHAR(20),
    rol             rol_usuario NOT NULL DEFAULT 'residente',
    password_hash   TEXT,                           -- manejado por Supabase Auth en producción
    activo          BOOLEAN DEFAULT TRUE,
    push_token      TEXT,                           -- para notificaciones móviles
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (condominio_id, email)
);

-- ============================================================
-- TABLA: VISITAS (registro principal de control de acceso)
-- ============================================================
CREATE TABLE visitas (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominio_id       UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_destino_id   UUID NOT NULL REFERENCES unidades(id),
    aprobada_por_id     UUID REFERENCES usuarios(id),       -- residente que pre-aprobó
    registrada_por_id   UUID REFERENCES usuarios(id),       -- conserje que registró
    nombre_visita       VARCHAR(150) NOT NULL,
    rut_dni             VARCHAR(20) NOT NULL,
    patente             VARCHAR(20),
    empresa_origen      VARCHAR(100),
    motivo              VARCHAR(200),
    codigo_qr           TEXT UNIQUE,                        -- token pre-aprobado temporal
    qr_expira_at        TIMESTAMPTZ,
    estado              estado_visita DEFAULT 'esperando',
    entrada_at          TIMESTAMPTZ,
    salida_at           TIMESTAMPTZ,
    notas_conserje      TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visitas_condominio_fecha ON visitas(condominio_id, created_at DESC);
CREATE INDEX idx_visitas_unidad ON visitas(unidad_destino_id);
CREATE INDEX idx_visitas_estado ON visitas(estado);
CREATE INDEX idx_visitas_qr ON visitas(codigo_qr) WHERE codigo_qr IS NOT NULL;

-- ============================================================
-- TABLA: ESTACIONAMIENTOS (catálogo de todos los calzos)
-- ============================================================
CREATE TABLE estacionamientos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominio_id   UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    codigo          VARCHAR(20) NOT NULL,           -- ej: "V1", "R-5", "B2-12"
    tipo            VARCHAR(20) DEFAULT 'visita' CHECK (tipo IN ('visita','residente','bicicleta','moto')),
    unidad_id       UUID REFERENCES unidades(id),   -- NULL si es de visitas
    estado          estado_estacionamiento DEFAULT 'libre',
    nivel           VARCHAR(10),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (condominio_id, codigo)
);

-- ============================================================
-- TABLA: ESTACIONAMIENTOS_VISITA (asignación calzo <-> visita)
-- ============================================================
CREATE TABLE estacionamientos_visita (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominio_id       UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    estacionamiento_id  UUID NOT NULL REFERENCES estacionamientos(id),
    visita_id           UUID NOT NULL REFERENCES visitas(id),
    asignado_por_id     UUID REFERENCES usuarios(id),
    entrada_at          TIMESTAMPTZ DEFAULT NOW(),
    salida_at           TIMESTAMPTZ,
    max_horas           INT DEFAULT 3,
    alerta_enviada      BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ev_estacionamiento ON estacionamientos_visita(estacionamiento_id) WHERE salida_at IS NULL;
CREATE INDEX idx_ev_visita ON estacionamientos_visita(visita_id);

-- ============================================================
-- TABLA: AREAS_COMUNES (piscina, quincho, sala, cancha, etc.)
-- ============================================================
CREATE TABLE areas_comunes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominio_id   UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    nombre          VARCHAR(100) NOT NULL,
    descripcion     TEXT,
    aforo_max       INT DEFAULT 20,
    costo_reserva   INT DEFAULT 0,                  -- en pesos CLP
    duracion_bloque INT DEFAULT 120,                -- minutos por bloque
    reglas_horario  JSONB DEFAULT '{"inicio":"08:00","fin":"22:00","dias":[1,2,3,4,5,6,7]}'::jsonb,
    penalizacion    INT DEFAULT 0,                  -- monto por no asistir
    max_por_semana  INT DEFAULT 1,                  -- reservas por unidad por semana
    activa          BOOLEAN DEFAULT TRUE,
    imagen_url      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: RESERVAS (bookings de áreas comunes)
-- ============================================================
CREATE TABLE reservas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominio_id   UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_id       UUID NOT NULL REFERENCES unidades(id),
    area_comun_id   UUID NOT NULL REFERENCES areas_comunes(id),
    reservada_por_id UUID REFERENCES usuarios(id),
    inicio_at       TIMESTAMPTZ NOT NULL,
    fin_at          TIMESTAMPTZ NOT NULL,
    num_personas    INT DEFAULT 1,
    estado          estado_reserva DEFAULT 'confirmada',
    costo_cobrado   INT DEFAULT 0,
    notas           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    CHECK (fin_at > inicio_at)
);

CREATE INDEX idx_reservas_area_fecha ON reservas(area_comun_id, inicio_at);
CREATE INDEX idx_reservas_unidad ON reservas(unidad_id);

-- ============================================================
-- TABLA: ENCOMIENDAS (paquetería en conserjería)
-- ============================================================
CREATE TABLE encomiendas (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominio_id       UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_id           UUID NOT NULL REFERENCES unidades(id),
    recibida_por_id     UUID REFERENCES usuarios(id),      -- conserje receptor
    entregada_por_id    UUID REFERENCES usuarios(id),      -- conserje que entregó
    remitente           VARCHAR(150),
    codigo_barras       VARCHAR(100),
    foto_url            TEXT,
    descripcion         TEXT,
    estado              estado_encomienda DEFAULT 'en_conserjeria',
    notificacion_enviada BOOLEAN DEFAULT FALSE,
    firma_retiro_url    TEXT,
    pin_retiro          VARCHAR(10),                       -- hasheado
    recibido_at         TIMESTAMPTZ DEFAULT NOW(),
    retirado_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_encomiendas_unidad ON encomiendas(unidad_id) WHERE estado = 'en_conserjeria';

-- ============================================================
-- TABLA: TICKETS (reportes de incidencias / mantención)
-- ============================================================
CREATE TABLE tickets (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominio_id       UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    usuario_id          UUID NOT NULL REFERENCES usuarios(id),
    unidad_id           UUID REFERENCES unidades(id),
    titulo              VARCHAR(200) NOT NULL,
    descripcion         TEXT,
    categoria           categoria_ticket DEFAULT 'otro',
    estado              estado_ticket DEFAULT 'pendiente',
    prioridad           INT DEFAULT 2 CHECK (prioridad BETWEEN 1 AND 3), -- 1=alta,2=media,3=baja
    asignado_a_id       UUID REFERENCES usuarios(id),
    foto_url            TEXT,
    respuesta_admin     TEXT,
    resuelto_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_condominio_estado ON tickets(condominio_id, estado);

-- ============================================================
-- TABLA: GASTOS_COMUNES (finanzas por unidad)
-- ============================================================
CREATE TABLE gastos_comunes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominio_id   UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_id       UUID NOT NULL REFERENCES unidades(id),
    mes             INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
    anio            INT NOT NULL,
    monto_base      INT NOT NULL,
    monto_extra     INT DEFAULT 0,
    monto_total     INT GENERATED ALWAYS AS (monto_base + monto_extra) STORED,
    estado_pago     estado_pago DEFAULT 'pendiente',
    fecha_vencimiento DATE,
    pagado_at       TIMESTAMPTZ,
    comprobante_url TEXT,
    notas           TEXT,
    recordatorio_enviado BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (unidad_id, mes, anio)
);

-- ============================================================
-- TABLA: AUDIT_LOG (trazabilidad de todas las acciones)
-- ============================================================
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    condominio_id   UUID REFERENCES condominios(id),
    usuario_id      UUID REFERENCES usuarios(id),
    accion          VARCHAR(100) NOT NULL,
    tabla           VARCHAR(50),
    registro_id     UUID,
    datos_antes     JSONB,
    datos_despues   JSONB,
    ip_address      INET,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_condominio ON audit_log(condominio_id, created_at DESC);
